// Import podcast subscriptions from Pocket Casts OPML file
// Usage: node importOPML.mjs path/to/your-subscriptions.opml
// Example: node importOPML.mjs ~/Downloads/pocket_casts_subscriptions.opml

import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, where, getDocs, Timestamp } from "firebase/firestore";
import { readFileSync } from "fs";

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

// First-party show slugs — these get special treatment
const FIRST_PARTY_SLUGS = {
  "edtechsr.com/feed": "edtech-situation-room",
  "edtechsr.substack.com": "edtech-situation-room",
  "healourculture.substack.com": "heal-our-culture",
  "2316077": "heal-our-culture",
  "2986841": "resist-and-heal",
  "speedofcreativity": "speed-of-creativity",
  "wesfryer": "wes-and-shelly-share",
};

function parseOPML(xml) {
  const feeds = [];
  // Match all outline elements with xmlUrl attribute
  const outlineRegex = /<outline[^>]+xmlUrl="([^"]+)"[^>]*(?:title|text)="([^"]*)"[^>]*(?:title|text)="([^"]*)"[^>]*\/?>/gi;
  const simpleRegex = /<outline[^>]+xmlUrl="([^"]+)"[^>]*(?:title|text)="([^"]*)"[^>]*\/?>/gi;

  // Try to extract all outlines with xmlUrl
  const allOutlines = xml.match(/<outline[^>]+xmlUrl="[^"]+"[^>]*\/?>/gi) || [];

  for (const outline of allOutlines) {
    const urlMatch = outline.match(/xmlUrl="([^"]+)"/i);
    const titleMatch = outline.match(/title="([^"]+)"/i) || outline.match(/text="([^"]+)"/i);

    if (urlMatch) {
      feeds.push({
        feedUrl: urlMatch[1].trim(),
        title: titleMatch ? titleMatch[1].trim() : "Unknown Podcast",
      });
    }
  }

  return feeds;
}

function isFirstParty(feedUrl) {
  for (const key of Object.keys(FIRST_PARTY_SLUGS)) {
    if (feedUrl.includes(key)) return FIRST_PARTY_SLUGS[key];
  }
  return null;
}

async function feedExists(feedUrl) {
  const q = query(collection(db, "podcasts"), where("feedUrl", "==", feedUrl));
  const snap = await getDocs(q);
  return !snap.empty;
}

// Fetch RSS feed and extract show metadata + recent episodes
async function fetchFeedMetadata(feedUrl) {
  try {
    const res = await fetch(feedUrl, {
      headers: { "User-Agent": "PodCommons/1.0 RSS Reader" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const xml = await res.text();

    // Extract channel-level metadata
    const getChannel = (tag) => {
      const m = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}>([^<]*)<\\/${tag}>`));
      return m ? (m[1] || m[2] || "").trim() : "";
    };

    // Get artwork - try itunes:image first, then image/url
    const itunesImg = xml.match(/<itunes:image[^>]+href="([^"]+)"/i);
    const imgUrl = xml.match(/<image>[\s\S]*?<url>([^<]+)<\/url>/i);
    const artworkUrl = itunesImg?.[1] || imgUrl?.[1] || "";

    // Get recent episodes (first 5)
    const episodes = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    let count = 0;
    while ((match = itemRegex.exec(xml)) !== null && count < 5) {
      const block = match[1];
      const get = (tag) => {
        const m = block.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`));
        return m ? (m[1] || m[2] || "").trim() : "";
      };
      const enclosureUrl = block.match(/<enclosure[^>]+url="([^"]+)"/i);
      const duration = block.match(/<itunes:duration>([^<]+)<\/itunes:duration>/i);
      const pubDate = get("pubDate");

      const title = get("title");
      const link = get("link") || get("guid");
      if (title && link) {
        episodes.push({
          title,
          description: get("description").slice(0, 500),
          episodeUrl: link,
          audioUrl: enclosureUrl?.[1] || "",
          duration: parseDuration(duration?.[1] || ""),
          publishedAt: pubDate ? new Date(pubDate) : new Date(),
          imageUrl: artworkUrl,
        });
        count++;
      }
    }

    return {
      description: getChannel("description") || getChannel("itunes:summary"),
      artworkUrl,
      websiteUrl: getChannel("link"),
      episodes,
    };
  } catch (err) {
    return null;
  }
}

function parseDuration(str) {
  if (!str) return 0;
  const parts = str.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseInt(str) || 0;
}

async function episodeExists(episodeUrl) {
  if (!episodeUrl) return true;
  const q = query(collection(db, "episodes"), where("episodeUrl", "==", episodeUrl));
  const snap = await getDocs(q);
  return !snap.empty;
}

async function main() {
  const opmlPath = process.argv[2];
  if (!opmlPath) {
    console.error("Usage: node importOPML.mjs path/to/subscriptions.opml");
    process.exit(1);
  }

  let xml;
  try {
    xml = readFileSync(opmlPath, "utf-8");
    console.log(`Read OPML file: ${opmlPath} (${xml.length} bytes)`);
  } catch (err) {
    console.error(`Could not read file: ${err.message}`);
    process.exit(1);
  }

  const feeds = parseOPML(xml);
  console.log(`\nFound ${feeds.length} podcast feeds in OPML\n`);

  let podcastsAdded = 0;
  let podcastsSkipped = 0;
  let episodesAdded = 0;

  for (let i = 0; i < feeds.length; i++) {
    const feed = feeds[i];
    console.log(`[${i + 1}/${feeds.length}] ${feed.title}`);

    if (await feedExists(feed.feedUrl)) {
      console.log(`  ↷ Podcast already exists, skipping`);
      podcastsSkipped++;
      continue;
    }

    const firstPartySlug = isFirstParty(feed.feedUrl);
    console.log(`  Fetching feed metadata...`);
    const meta = await fetchFeedMetadata(feed.feedUrl);

    // Write podcast document
    const podcastRef = await addDoc(collection(db, "podcasts"), {
      title: feed.title,
      feedUrl: feed.feedUrl,
      websiteUrl: meta?.websiteUrl || "",
      artworkUrl: meta?.artworkUrl || "",
      description: meta?.description || "",
      categories: [],
      isFirstParty: !!firstPartySlug,
      firstPartySlug: firstPartySlug || null,
      source: "opml",
      visibility: "visible",
      hiddenReason: null,
      hiddenAt: null,
      hiddenBy: null,
      addedAt: Timestamp.fromDate(new Date()),
      lastPolledAt: Timestamp.fromDate(new Date()),
    });

    console.log(`  ✓ Podcast added (${podcastRef.id})`);
    podcastsAdded++;

    // Write recent episodes
    if (meta?.episodes?.length > 0) {
      for (const ep of meta.episodes) {
        if (await episodeExists(ep.episodeUrl)) continue;

        await addDoc(collection(db, "episodes"), {
          podcastId: podcastRef.id,
          podcastTitle: feed.title,
          title: ep.title,
          description: ep.description,
          episodeUrl: ep.episodeUrl,
          audioUrl: ep.audioUrl,
          imageUrl: ep.imageUrl || meta.artworkUrl || "",
          publishedAt: Timestamp.fromDate(isNaN(ep.publishedAt) ? new Date() : ep.publishedAt),
          duration: ep.duration,
          topics: [],
          likeCount: 0,
          favoriteCount: 0,
          commentCount: 0,
          visibility: "visible",
          isFirstParty: !!firstPartySlug,
          firstPartySlug: firstPartySlug || null,
          featuredByAdmin: false,
          algorithmScore: firstPartySlug ? 0.85 : 0.70,
          source: "opml",
          importedAt: Timestamp.fromDate(new Date()),
        });
        episodesAdded++;
      }
      console.log(`  ✓ ${meta.episodes.length} recent episodes added`);
    }

    // Small delay to be polite to RSS servers
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   Podcasts: ${podcastsAdded} added, ${podcastsSkipped} already existed`);
  console.log(`   Episodes: ${episodesAdded} added`);
  process.exit(0);
}

main().catch(console.error);
