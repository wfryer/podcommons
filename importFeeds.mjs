// One-time import from Wes's real podcast recommendation feeds
// Run with: node importFeeds.mjs

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

const PINBOARD_RSS = "https://feeds.pinboard.in/rss/u:wfryer/t:podcastrecc/";
const MASTODON_RSS = "https://triangletoot.party/@wesfryer/tagged/podcastrecc.rss";

function stripHtml(html) {
  return (html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePinboardRSS(xml) {
  // Pinboard uses RSS 1.0 / RDF format
  // <item rdf:about="URL"> ... <title>...</title> <link>URL</link> <description>...</description>
  const items = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];

    // Extract title
    const titleM = block.match(/<title>([\s\S]*?)<\/title>/);
    const title = titleM ? stripHtml(titleM[1]) : "";

    // Extract link — Pinboard puts the URL directly in <link>
    const linkM = block.match(/<link>([\s\S]*?)<\/link>/);
    const link = linkM ? linkM[1].trim() : "";

    // Extract description
    const descM = block.match(/<description>([\s\S]*?)<\/description>/);
    const description = descM ? stripHtml(descM[1]) : "";

    // Extract date
    const dateM = block.match(/<dc:date>([\s\S]*?)<\/dc:date>/);
    const pubDate = dateM ? dateM[1].trim() : "";

    if (link) {
      items.push({ title, link, description, pubDate });
    }
  }
  return items;
}

function parseMastodonRSS(xml) {
  // Standard RSS 2.0
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(new RegExp(
        `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`
      ));
      return m ? (m[1] || m[2] || "").trim() : "";
    };
    // For Mastodon, extract external URLs from content
    const content = get("description") || get("content:encoded") || "";
    const urlMatches = content.match(/https?:\/\/[^\s"<>]+/g) || [];
    const externalUrl = urlMatches.find(u =>
      !u.includes("triangletoot.party") && !u.includes("mastodon")
    );
    items.push({
      title: stripHtml(content).slice(0, 120),
      link: externalUrl || get("link"),
      description: stripHtml(content),
      pubDate: get("pubDate"),
    });
  }
  return items.filter(i => i.link);
}

async function episodeExists(url) {
  if (!url) return true;
  const q = query(collection(db, "episodes"), where("episodeUrl", "==", url));
  const snap = await getDocs(q);
  return !snap.empty;
}

function extractTopics(text) {
  const keywords = [
    "media literacy", "education", "AI", "technology", "democracy",
    "journalism", "teaching", "learning", "edtech", "critical thinking",
    "RSS", "social media", "misinformation", "civic", "community",
    "podcast", "news", "history", "science", "faith", "politics",
    "storytelling", "writing", "creativity", "health"
  ];
  const lower = (text || "").toLowerCase();
  return keywords.filter(k => lower.includes(k.toLowerCase())).slice(0, 5);
}

function extractShowName(title) {
  if (!title) return "Podcast";
  const dashParts = title.split(/\s[-–—]\s/);
  if (dashParts.length > 1) return dashParts[dashParts.length - 1].trim().slice(0, 80);
  const colonParts = title.split(/:\s/);
  if (colonParts.length > 1) return colonParts[0].trim().slice(0, 80);
  return "Podcast";
}

async function importFromFeed(feedUrl, source, parser) {
  console.log(`\n=== Importing from ${source} ===`);
  console.log(`Fetching: ${feedUrl}`);

  let xml;
  try {
    const res = await fetch(feedUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    xml = await res.text();
    console.log(`Fetched ${xml.length} bytes`);
  } catch (err) {
    console.error(`✗ Could not fetch: ${err.message}`);
    return 0;
  }

  const items = parser(xml);
  console.log(`Parsed ${items.length} items`);

  let added = 0;
  let skipped = 0;

  for (const item of items) {
    if (!item.link) { skipped++; continue; }

    if (await episodeExists(item.link)) {
      console.log(`  ↷ Duplicate: ${item.title?.slice(0, 60)}`);
      skipped++;
      continue;
    }

    const pubDate = item.pubDate ? new Date(item.pubDate) : new Date();

    await addDoc(collection(db, "episodes"), {
      title: (item.title || item.link).slice(0, 200),
      podcastTitle: extractShowName(item.title),
      description: (item.description || "").slice(0, 500),
      episodeUrl: item.link,
      audioUrl: "",
      imageUrl: "",
      publishedAt: Timestamp.fromDate(isNaN(pubDate) ? new Date() : pubDate),
      duration: 0,
      topics: extractTopics(item.title + " " + item.description),
      likeCount: 0,
      favoriteCount: 0,
      commentCount: 0,
      visibility: "visible",
      isFirstParty: false,
      featuredByAdmin: false,
      algorithmScore: source === "pinboard" ? 0.75 : 0.65,
      source,
      importedAt: Timestamp.fromDate(new Date()),
    });

    console.log(`  ✓ ${item.title?.slice(0, 70)}`);
    added++;
  }

  console.log(`→ ${added} added, ${skipped} skipped`);
  return added;
}

async function main() {
  const pinCount = await importFromFeed(PINBOARD_RSS, "pinboard", parsePinboardRSS);
  const mastCount = await importFromFeed(MASTODON_RSS, "mastodon", parseMastodonRSS);
  console.log(`\n✅ Total imported: ${pinCount + mastCount} episodes`);
  process.exit(0);
}

main().catch(console.error);
