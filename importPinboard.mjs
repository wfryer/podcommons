// One-time import from Wes's Pinboard podcastrecc tag
// Run with: node importPinboard.mjs

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, where, getDocs, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAIugDQF-5in9mwo8DL5IajZMYaLyfhUl0",
  authDomain: "podcommons-41064.firebaseapp.com",
  projectId: "podcommons-41064",
  storageBucket: "podcommons-41064.firebasestorage.app",
  messagingSenderId: "798625937353",
  appId: "1:798625937353:web:b0577810228b6baf46da18"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Fetch and parse Pinboard RSS
async function fetchPinboardRSS() {
  const url = "https://feeds.pinboard.in/rss/u:wfryer/t:podcastrecc/";
  console.log(`Fetching Pinboard RSS: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  return parseRSS(xml);
}

// Fetch Mastodon tagged posts
async function fetchMastodonPosts() {
  const url = "https://triangletoot.party/api/v1/accounts/lookup?acct=wesfryer";
  console.log("Looking up Mastodon account...");
  const res = await fetch(url);
  const account = await res.json();
  const accountId = account.id;
  console.log(`Found account ID: ${accountId}`);

  const statusUrl = `https://triangletoot.party/api/v1/accounts/${accountId}/statuses?limit=40`;
  const statusRes = await fetch(statusUrl);
  const statuses = await statusRes.json();

  // Filter posts that contain #podcastrecc
  return statuses.filter(s =>
    s.tags?.some(t => t.name === "podcastrecc") ||
    s.content?.toLowerCase().includes("podcastrecc")
  );
}

function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const get = (tag) => {
      const m = item.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\/${tag}>|<${tag}[^>]*>([^<]*)<\/${tag}>`));
      return m ? (m[1] || m[2] || "").trim() : "";
    };
    items.push({
      title: get("title"),
      link: get("link"),
      description: get("description"),
      pubDate: get("pubDate"),
    });
  }
  return items;
}

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, "").trim();
}

// Check if episode URL already exists
async function episodeExists(url) {
  const q = query(collection(db, "episodes"), where("episodeUrl", "==", url));
  const snap = await getDocs(q);
  return !snap.empty;
}

async function importPinboard() {
  console.log("\n=== Importing from Pinboard ===");
  let items;
  try {
    items = await fetchPinboardRSS();
    console.log(`Found ${items.length} items in Pinboard feed`);
  } catch (err) {
    console.error("Could not fetch Pinboard RSS:", err.message);
    return 0;
  }

  let added = 0;
  let skipped = 0;

  for (const item of items) {
    if (!item.link) { skipped++; continue; }

    // Deduplicate
    if (await episodeExists(item.link)) {
      console.log(`  ↷ Skipping duplicate: ${item.title}`);
      skipped++;
      continue;
    }

    const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

    await addDoc(collection(db, "episodes"), {
      title: item.title || "Untitled",
      podcastTitle: extractShowName(item.title, item.description),
      description: stripHtml(item.description || ""),
      episodeUrl: item.link,
      audioUrl: "",
      imageUrl: "",
      publishedAt: Timestamp.fromDate(pubDate),
      duration: 0,
      topics: extractTopics(item.title + " " + item.description),
      likeCount: 0,
      favoriteCount: 0,
      commentCount: 0,
      visibility: "visible",
      isFirstParty: false,
      featuredByAdmin: false,
      algorithmScore: 0.7,
      source: "pinboard",
      importedAt: Timestamp.fromDate(new Date()),
    });

    console.log(`  ✓ Added: ${item.title}`);
    added++;
  }

  console.log(`Pinboard: ${added} added, ${skipped} skipped`);
  return added;
}

async function importMastodon() {
  console.log("\n=== Importing from Mastodon ===");
  let posts;
  try {
    posts = await fetchMastodonPosts();
    console.log(`Found ${posts.length} #podcastrecc posts`);
  } catch (err) {
    console.error("Could not fetch Mastodon posts:", err.message);
    return 0;
  }

  let added = 0;
  let skipped = 0;

  for (const post of posts) {
    // Extract URLs from post content
    const urlMatches = post.content.match(/https?:\/\/[^\s"<>]+/g) || [];
    const episodeUrls = urlMatches.filter(u =>
      !u.includes("triangletoot.party") && !u.includes("mastodon")
    );

    if (episodeUrls.length === 0) { skipped++; continue; }

    const episodeUrl = episodeUrls[0];

    if (await episodeExists(episodeUrl)) {
      console.log(`  ↷ Skipping duplicate: ${episodeUrl}`);
      skipped++;
      continue;
    }

    const plainText = stripHtml(post.content);
    const pubDate = new Date(post.created_at);

    await addDoc(collection(db, "episodes"), {
      title: plainText.slice(0, 100) || "Shared episode",
      podcastTitle: "Via Mastodon",
      description: plainText,
      episodeUrl,
      audioUrl: "",
      imageUrl: post.media_attachments?.[0]?.url || "",
      publishedAt: Timestamp.fromDate(pubDate),
      duration: 0,
      topics: extractTopics(plainText),
      likeCount: post.favourites_count || 0,
      favoriteCount: 0,
      commentCount: post.replies_count || 0,
      visibility: "visible",
      isFirstParty: false,
      featuredByAdmin: false,
      algorithmScore: 0.65,
      source: "mastodon",
      mastodonPostId: post.id,
      importedAt: Timestamp.fromDate(new Date()),
    });

    console.log(`  ✓ Added from Mastodon: ${episodeUrl}`);
    added++;
  }

  console.log(`Mastodon: ${added} added, ${skipped} skipped`);
  return added;
}

// Simple topic extraction from text
function extractTopics(text) {
  const keywords = [
    "media literacy", "education", "AI", "technology", "democracy",
    "podcast", "news", "journalism", "teaching", "learning",
    "edtech", "classroom", "students", "critical thinking", "RSS",
    "social media", "misinformation", "civic", "community", "faith"
  ];
  const lower = text.toLowerCase();
  return keywords.filter(k => lower.includes(k.toLowerCase())).slice(0, 5);
}

// Try to extract show name from title like "Episode Title - Show Name"
function extractShowName(title, description) {
  if (!title) return "Podcast";
  const parts = title.split(/\s[-–—|]\s/);
  if (parts.length > 1) return parts[parts.length - 1].trim();
  return "Podcast";
}

async function main() {
  const pinboardCount = await importPinboard();
  const mastodonCount = await importMastodon();
  console.log(`\n✅ Total imported: ${pinboardCount + mastodonCount} episodes`);
  process.exit(0);
}

main().catch(console.error);
