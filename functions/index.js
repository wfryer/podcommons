const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

// Explicitly define the secret
const ADMIN_TOKEN = defineSecret("ADMIN_TOKEN");

function parseRSSItems(xml, limit = 5) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  let count = 0;
  while ((match = itemRegex.exec(xml)) !== null && count < limit) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(new RegExp(
        `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`
      ));
      return m ? (m[1] || m[2] || "").trim() : "";
    };
    const enclosure = block.match(/<enclosure[^>]+url="([^"]+)"/i);
    const duration = block.match(/<itunes:duration>([^<]+)<\/itunes:duration>/i);
    const itunesImg = block.match(/<itunes:image[^>]+href="([^"]+)"/i);
    const title = get("title");
    const link = get("link") || get("guid");
    if (!title || !link) { count++; continue; }
    items.push({
      title: title.slice(0, 200),
      description: get("description").replace(/<[^>]*>/g, "").slice(0, 500),
      episodeUrl: link,
      audioUrl: enclosure?.[1] || "",
      imageUrl: itunesImg?.[1] || "",
      pubDate: get("pubDate"),
      duration: parseDuration(duration?.[1] || ""),
    });
    count++;
  }
  return items;
}

function parseDuration(str) {
  if (!str) return 0;
  const parts = str.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseInt(str) || 0;
}

function getChannelArtwork(xml) {
  const itunes = xml.match(/<itunes:image[^>]+href="([^"]+)"/i);
  const img = xml.match(/<image>[\s\S]*?<url>([^<]+)<\/url>/i);
  return itunes?.[1] || img?.[1] || "";
}

async function pollFeeds(limitCount = 0) {
  const startTime = Date.now();
  let processed = 0, added = 0, errors = 0;

  let podQuery = db.collection("podcasts").where("visibility", "==", "visible");
  if (limitCount > 0) podQuery = podQuery.limit(limitCount);
  const podSnap = await podQuery.get();
  const podcasts = podSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`Polling ${podcasts.length} feeds...`);

  const blockedSnap = await db.collection("blockedFeeds").get();
  const blockedUrls = new Set(blockedSnap.docs.map(d => d.data().feedUrl));

  for (const podcast of podcasts) {
    if (blockedUrls.has(podcast.feedUrl)) continue;
    try {
      const res = await fetch(podcast.feedUrl, {
        headers: { "User-Agent": "PodCommons/1.0 RSS Reader" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) { errors++; continue; }
      const xml = await res.text();
      const artworkUrl = podcast.artworkUrl || getChannelArtwork(xml);

      await db.collection("podcasts").doc(podcast.id).update({
        lastPolledAt: FieldValue.serverTimestamp(),
        artworkUrl: artworkUrl || podcast.artworkUrl || "",
      });

      const items = parseRSSItems(xml, 5);
      for (const item of items) {
        const existing = await db.collection("episodes")
          .where("episodeUrl", "==", item.episodeUrl).limit(1).get();
        if (!existing.empty) continue;
        await db.collection("episodes").add({
          podcastId: podcast.id,
          podcastTitle: podcast.title,
          title: item.title,
          description: item.description,
          episodeUrl: item.episodeUrl,
          audioUrl: item.audioUrl,
          imageUrl: item.imageUrl || artworkUrl || "",
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          duration: item.duration,
          topics: [],
          likeCount: 0, favoriteCount: 0, commentCount: 0,
          visibility: "visible",
          isFirstParty: podcast.isFirstParty || false,
          firstPartySlug: podcast.firstPartySlug || null,
          featuredByAdmin: false,
          algorithmScore: podcast.isFirstParty ? 0.85 : 0.70,
          source: "opml",
          importedAt: FieldValue.serverTimestamp(),
        });
        added++;
      }
      processed++;
    } catch (err) {
      console.error(`Error polling ${podcast.feedUrl}:`, err.message);
      errors++;
    }
    await new Promise(r => setTimeout(r, 100));
  }

  const duration = Math.round((Date.now() - startTime) / 1000);
  await db.collection("siteSettings").doc("pollStatus").set({
    lastPollAt: FieldValue.serverTimestamp(),
    lastPollDuration: duration,
    lastPollAdded: added,
    lastPollProcessed: processed,
    lastPollErrors: errors,
    nextPollAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
  });

  console.log(`Poll complete: ${processed} feeds, ${added} new episodes, ${errors} errors, ${duration}s`);
  return { processed, added, errors, duration };
}

// Scheduled every 4 hours
exports.scheduledRSSPoll = onSchedule({
  schedule: "every 4 hours",
  timeoutSeconds: 540,
  memory: "512MiB",
  secrets: [ADMIN_TOKEN],
}, async () => {
  await pollFeeds();
});

// Manual trigger — explicitly binds secret
exports.manualRSSPoll = onRequest({
  timeoutSeconds: 540,
  memory: "512MiB",
  secrets: [ADMIN_TOKEN],
  cors: true,
}, async (req, res) => {
  const token = req.query.token || req.headers["x-admin-token"];
  const secret = ADMIN_TOKEN.value();
  
  console.log(`Token received: ${token ? token.slice(0,4) + "..." : "none"}`);
  console.log(`Secret loaded: ${secret ? secret.slice(0,4) + "..." : "NOT LOADED"}`);

  if (!token || token !== secret) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  try {
    const limit = parseInt(req.query.limit) || 0;
    const result = await pollFeeds(limit);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Manual poll error:", err);
    res.status(500).json({ error: err.message });
  }
});
