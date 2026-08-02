const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");

// Lazy initialization - don't init at module load time
let _db = null;
let _FieldValue = null;
let _admin = null;

function getAdmin() {
  if (!_admin) {
    _admin = require("firebase-admin");
    if (!_admin.apps.length) _admin.initializeApp();
  }
  return _admin;
}

function getDb() {
  const admin = getAdmin();
  if (!_db) {
    _db = admin.firestore();
    _FieldValue = admin.firestore.FieldValue;
  }
  return { db: _db, FieldValue: _FieldValue };
}

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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 400,
          // gemini-2.5-flash is a thinking model — without this, reasoning
          // tokens consume the whole budget and the JSON comes back empty.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
      signal: AbortSignal.timeout(12000),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // Empty response means the model returned nothing usable — surface it as an
  // error instead of silently saving an episode with no topics.
  if (!text.trim()) {
    throw new Error(
      `Empty Gemini response (finishReason=${data.candidates?.[0]?.finishReason || "?"}, ` +
      `thinkingTokens=${data.usageMetadata?.thoughtsTokenCount ?? 0})`
    );
  }
  
  // Robust JSON extraction - handle truncated/malformed responses
  let parsed = {};
  try {
    const clean = text.replace(/```json|```/g, "").trim();
    parsed = JSON.parse(clean);
  } catch (e) {
    // Try to extract fields manually with regex if JSON parse fails
    const topicsMatch = text.match(/"topics"\s*:\s*\[([^\]]*)\]/);
    const scoreMatch = text.match(/"tasteScore"\s*:\s*([\d.]+)/);
    const reasonMatch = text.match(/"tasteReason"\s*:\s*"([^"]+)"/);
    
    if (topicsMatch) {
      const topicStr = topicsMatch[1];
      const topics = topicStr.match(/"([^"]+)"/g)?.map(t => t.replace(/"/g, "")) || [];
      parsed.topics = topics;
    }
    if (scoreMatch) parsed.tasteScore = parseFloat(scoreMatch[1]);
    if (reasonMatch) parsed.tasteReason = reasonMatch[1];
  }

  return {
    topics: (Array.isArray(parsed.topics) ? parsed.topics : [])
      .filter((t) => TOPICS.includes(t))
      .slice(0, 3),
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
  try {
    const clean = String(str).trim();
    const parts = clean.split(":").map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    const val = parseInt(clean);
    return isNaN(val) ? 0 : val;
  } catch { return 0; }
}

function getChannelArtwork(xml) {
  const itunes = xml.match(/<itunes:image[^>]+href="([^"]+)"/i);
  const img = xml.match(/<image>[\s\S]*?<url>([^<]+)<\/url>/i);
  return itunes?.[1] || img?.[1] || "";
}

async function pollFeeds(limitCount = 0, geminiKey = null) {
  const { db, FieldValue } = getDb();
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
            await new Promise(r => setTimeout(r, 5000)); // 5s delay = max 12/min, under free tier limit of 15/min
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

  // Cache site stats after each poll
  try {
    const [epSnap, podSnap, userSnap] = await Promise.all([
      db.collection("episodes").count().get(),
      db.collection("podcasts").where("visibility", "==", "visible").count().get(),
      db.collection("users").count().get(),
    ]);
    await db.collection("siteSettings").doc("stats").set({
      episodeCount: epSnap.data().count,
      podcastCount: podSnap.data().count,
      userCount: userSnap.data().count,
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`Stats cached: ${epSnap.data().count} episodes, ${podSnap.data().count} podcasts, ${userSnap.data().count} users`);
  } catch (err) {
    console.error("Stats caching error:", err.message);
  }

  console.log(`Poll complete: ${processed} feeds, ${added} new, ${analyzed} AI-analyzed, ${errors} errors, ${duration}s`);
  return { processed, added, errors, analyzed, duration, errorLog };
}

// Scheduled every 4 hours
exports.scheduledRSSPoll = onSchedule({
  schedule: "every 4 hours",
  timeoutSeconds: 540,
  memory: "512MiB",
  secrets: ["GEMINI_API_KEY"],
}, async () => {
  const key = process.env.GEMINI_API_KEY;
  console.log(`Gemini key: ${key ? key.slice(0, 8) + "..." : "NOT FOUND"}`);
  await pollFeeds(0, key);
});

// Manual trigger
exports.manualRSSPoll = onRequest({
  timeoutSeconds: 540,
  memory: "512MiB",
  secrets: ["GEMINI_API_KEY"],
  cors: true,
}, async (req, res) => {
  // Verify Firebase Auth ID token and check admin role
  const authHeader = req.headers["authorization"] || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!idToken) {
    res.status(403).json({ error: "Unauthorized: no token" });
    return;
  }

  try {
    const admin = getAdmin();
    const decoded = await admin.auth().verifyIdToken(idToken);
    const userDoc = await admin.firestore()
      .collection("users").doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data().role !== "admin") {
      res.status(403).json({ error: "Unauthorized: not admin" });
      return;
    }
  } catch (err) {
    res.status(403).json({ error: "Unauthorized: invalid token" });
    return;
  }

  try {
    const limit = parseInt(req.query.limit) || 0;
    const useAI = req.query.ai !== "false";
    const key = useAI ? process.env.GEMINI_API_KEY : null;
    console.log(`Manual poll: Gemini=${key ? key.slice(0, 8) + "..." : "disabled"}`);
    const result = await pollFeeds(limit, key);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Manual poll error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Episode Pruning ────────────────────────────────────────────────────────
// Protects: first-party shows, episodes with any interaction (like/favorite/
// queue/comment via the "interactions" collection), episodes with
// likeCount/favoriteCount/commentCount > 0, admin picks, and anything
// published within the cutoff window (default 60 days).
async function pruneEpisodes(dryRun = true, cutoffDays = 60) {
  const { db, FieldValue } = getDb();
  const cutoffDate = new Date(Date.now() - cutoffDays * 24 * 60 * 60 * 1000);

  const [episodesSnap, interactionsSnap] = await Promise.all([
    db.collection("episodes").get(),
    db.collection("interactions").get(),
  ]);
  const interactedEpisodeIds = new Set(interactionsSnap.docs.map(d => d.data().episodeId));

  let keptFirstParty = 0, keptInteracted = 0, keptEngagement = 0, keptFeatured = 0, keptRecent = 0;
  const toDelete = [];
  const feedBreakdown = {};

  for (const docSnap of episodesSnap.docs) {
    const ep = docSnap.data();
    const publishedAt = ep.publishedAt?.toDate ? ep.publishedAt.toDate() : new Date(ep.publishedAt);

    if (ep.isFirstParty === true) { keptFirstParty++; continue; }
    if (interactedEpisodeIds.has(docSnap.id)) { keptInteracted++; continue; }
    if ((ep.likeCount || 0) > 0 || (ep.favoriteCount || 0) > 0 || (ep.commentCount || 0) > 0) { keptEngagement++; continue; }
    if (ep.featuredByAdmin === true) { keptFeatured++; continue; }
    if (publishedAt >= cutoffDate) { keptRecent++; continue; }

    toDelete.push({ id: docSnap.id, publishedAt });
    const feedName = ep.podcastTitle || "Unknown";
    feedBreakdown[feedName] = (feedBreakdown[feedName] || 0) + 1;
  }

  const topAffectedFeeds = Object.entries(feedBreakdown)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([title, count]) => ({ title, count }));

  const sortedByDate = [...toDelete].sort((a, b) => a.publishedAt - b.publishedAt);
  const oldestToDelete = sortedByDate[0]?.publishedAt || null;
  const newestToDelete = sortedByDate[sortedByDate.length - 1]?.publishedAt || null;

  let deletedCount = 0;
  if (!dryRun && toDelete.length > 0) {
    for (let i = 0; i < toDelete.length; i += 500) {
      const batch = db.batch();
      toDelete.slice(i, i + 500).forEach(item => batch.delete(db.collection("episodes").doc(item.id)));
      await batch.commit();
      deletedCount += Math.min(500, toDelete.length - i);
    }
    try {
      await db.collection("siteSettings").doc("stats").set(
        { episodeCount: episodesSnap.size - deletedCount, updatedAt: FieldValue.serverTimestamp() },
        { merge: true }
      );
    } catch (err) {
      console.error("Stats cache update after prune failed:", err.message);
    }
  }

  return {
    dryRun,
    totalEpisodes: episodesSnap.size,
    wouldDelete: toDelete.length,
    deleted: dryRun ? 0 : deletedCount,
    protected: {
      firstParty: keptFirstParty,
      interacted: keptInteracted,
      hasEngagement: keptEngagement,
      featuredByAdmin: keptFeatured,
      recentWithin60Days: keptRecent,
    },
    oldestToDelete,
    newestToDelete,
    topAffectedFeeds,
    cutoffDate,
  };
}

// Manual trigger — Admin dashboard Preview/Delete buttons call this.
// GET ?dryRun=true (default, safe preview) or ?dryRun=false (live delete)
// Optional ?days=NN to override the 60-day cutoff.
exports.runPrune = onRequest({
  timeoutSeconds: 300,
  memory: "512MiB",
  cors: true,
}, async (req, res) => {
  // Verify Firebase Auth ID token and check admin role (same pattern as manualRSSPoll)
  const authHeader = req.headers["authorization"] || "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!idToken) {
    res.status(403).json({ error: "Unauthorized: no token" });
    return;
  }

  try {
    const admin = getAdmin();
    const decoded = await admin.auth().verifyIdToken(idToken);
    const userDoc = await admin.firestore()
      .collection("users").doc(decoded.uid).get();
    if (!userDoc.exists || userDoc.data().role !== "admin") {
      res.status(403).json({ error: "Unauthorized: not admin" });
      return;
    }
  } catch (err) {
    console.error("runPrune auth error:", err.message);
    res.status(403).json({ error: `Unauthorized: ${err.message}` });
    return;
  }

  try {
    const dryRun = req.query.dryRun !== "false"; // must explicitly pass dryRun=false to delete
    const cutoffDays = parseInt(req.query.days) || 60;
    const result = await pruneEpisodes(dryRun, cutoffDays);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Prune error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Automatic weekly prune — Sundays 3am Eastern. Always a live delete, but the
// same protections apply, so nothing interacted-with/first-party/recent/
// featured is ever touched.
exports.scheduledPrune = onSchedule({
  schedule: "every sunday 03:00",
  timeZone: "America/New_York",
  timeoutSeconds: 300,
  memory: "512MiB",
}, async () => {
  const { db, FieldValue } = getDb();
  const result = await pruneEpisodes(false, 60);
  console.log(`Scheduled prune: deleted ${result.deleted} of ${result.totalEpisodes} episodes`);
  await db.collection("siteSettings").doc("pruneStatus").set({
    lastPruneAt: FieldValue.serverTimestamp(),
    lastPruneDeleted: result.deleted,
    lastPruneTotal: result.totalEpisodes,
    lastPruneProtected: result.protected,
    mode: "scheduled",
  });
});
