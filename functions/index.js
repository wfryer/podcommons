const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const { setGlobalOptions } = require("firebase-functions/v2");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

// Use process.env for secrets in v2 (auto-populated from Firebase secrets)
const getAdminToken = () => process.env.ADMIN_TOKEN;
const getGeminiKey = () => process.env.GEMINI_API_KEY;

const WES_TASTE_PROFILE = `
Wes Fryer is a middle school STEM and media literacy teacher in Charlotte, NC.
Strongest interests: AI & educational technology, media literacy, misinformation,
democracy & civic engagement, progressive Christian faith, local Charlotte/NC news,
American history, education policy, science & technology policy, podcasting & open web.
Less interested in: sports, entertainment/celebrity, true crime, finance/investing, cooking.
`;

const TOPICS = [
  "AI & Technology", "Education & Teaching", "Media Literacy",
  "Democracy & Civic", "Faith & Spirituality", "History",
  "Science", "Politics & Policy", "Local Charlotte/NC",
  "Health & Wellness", "Culture & Society", "Podcasting & Audio",
  "Environment", "Race & Justice", "International News",
  "Business & Economy", "Arts & Literature", "True Crime",
  "Sports", "Entertainment & Celebrity"
];

async function analyzeEpisode(title, description, apiKey) {
  const prompt = `Classify this podcast episode. Return ONLY a JSON object, no markdown.

Title: "${title}"
Description: "${(description || "").slice(0, 400)}"

Available topics: ${TOPICS.join(", ")}

Listener profile: ${WES_TASTE_PROFILE}

Return exactly:
{"topics":["topic1","topic2"],"tasteScore":0.0,"tasteReason":"one sentence"}

Rules:
- topics: 1-3 from the available list only
- tasteScore: 0.0-1.0 (0=no interest, 1=perfect match)
- Return ONLY the JSON object`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 150 },
      }),
      signal: AbortSignal.timeout(12000),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 100)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);

  return {
    topics: Array.isArray(parsed.topics) ? parsed.topics : [],
    tasteScore: Math.min(1, Math.max(0, Number(parsed.tasteScore) || 0.5)),
    tasteReason: parsed.tasteReason || "",
  };
}

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

async function pollFeeds(limitCount = 0, geminiKey = null) {
  const startTime = Date.now();
  let processed = 0, added = 0, errors = 0, analyzed = 0;
  const errorLog = [];

  let podQuery = db.collection("podcasts").where("visibility", "==", "visible");
  if (limitCount > 0) podQuery = podQuery.limit(limitCount);
  const podSnap = await podQuery.get();
  const podcasts = podSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  console.log(`Polling ${podcasts.length} feeds, Gemini: ${geminiKey ? "enabled" : "disabled"}`);

  const blockedSnap = await db.collection("blockedFeeds").get();
  const blockedUrls = new Set(blockedSnap.docs.map(d => d.data().feedUrl));

  for (const podcast of podcasts) {
    if (blockedUrls.has(podcast.feedUrl)) continue;
    try {
      const res = await fetch(podcast.feedUrl, {
        headers: { "User-Agent": "PodCommons/1.0 RSS Reader" },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        errors++;
        errorLog.push({ feed: podcast.title, error: `HTTP ${res.status}`, at: new Date().toISOString() });
        continue;
      }
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

        let topics = [];
        let tasteScore = podcast.isFirstParty ? 0.85 : 0.5;
        let tasteReason = "";

        if (geminiKey) {
          try {
            const analysis = await analyzeEpisode(item.title, item.description, geminiKey);
            topics = analysis.topics;
            tasteScore = podcast.isFirstParty
              ? Math.max(0.85, analysis.tasteScore)
              : analysis.tasteScore;
            tasteReason = analysis.tasteReason;
            analyzed++;
            await new Promise(r => setTimeout(r, 300));
          } catch (aiErr) {
            console.error(`Gemini error: ${aiErr.message}`);
            errorLog.push({ feed: podcast.title, error: `Gemini: ${aiErr.message}`, at: new Date().toISOString() });
          }
        }

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
          topics,
          tasteScore,
          tasteReason,
          likeCount: 0, favoriteCount: 0, commentCount: 0,
          visibility: "visible",
          isFirstParty: podcast.isFirstParty || false,
          firstPartySlug: podcast.firstPartySlug || null,
          featuredByAdmin: false,
          algorithmScore: tasteScore,
          source: "opml",
          importedAt: FieldValue.serverTimestamp(),
        });
        added++;
      }
      processed++;
    } catch (err) {
      console.error(`Error polling ${podcast.feedUrl}: ${err.message}`);
      errors++;
      errorLog.push({ feed: podcast.title, error: err.message, at: new Date().toISOString() });
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
    lastPollAnalyzed: analyzed,
    nextPollAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
    lastErrorLog: errorLog.slice(0, 50),
  });

  console.log(`Poll complete: ${processed} feeds, ${added} new, ${analyzed} AI-analyzed, ${errors} errors, ${duration}s`);
  return { processed, added, errors, analyzed, duration, errorLog };
}

// Scheduled every 4 hours
exports.scheduledRSSPoll = onSchedule({
  schedule: "every 4 hours",
  timeoutSeconds: 540,
  memory: "512MiB",
  secrets: ["ADMIN_TOKEN", "GEMINI_API_KEY"],
}, async () => {
  const key = process.env.GEMINI_API_KEY;
  console.log(`Gemini key: ${key ? key.slice(0,8) + "..." : "NOT FOUND"}`);
  await pollFeeds(0, key);
});

// Manual trigger
exports.manualRSSPoll = onRequest({
  timeoutSeconds: 540,
  memory: "512MiB",
  secrets: ["ADMIN_TOKEN", "GEMINI_API_KEY"],
  cors: true,
}, async (req, res) => {
  const token = req.query.token || req.headers["x-admin-token"];
  const secret = process.env.ADMIN_TOKEN;

  if (!token || token !== secret) {
    res.status(403).json({ error: "Unauthorized" });
    return;
  }

  try {
    const limit = parseInt(req.query.limit) || 0;
    const useAI = req.query.ai !== "false";
    const key = useAI ? process.env.GEMINI_API_KEY : null;
    console.log(`Manual poll: Gemini=${key ? key.slice(0,8) + "..." : "disabled"}`);
    const result = await pollFeeds(limit, key);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Manual poll error:", err);
    res.status(500).json({ error: err.message });
  }
});
