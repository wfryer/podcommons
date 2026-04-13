import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, Timestamp } from "firebase/firestore";

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

async function main() {
  // Add Resist & Heal podcast
  const podRef = await addDoc(collection(db, "podcasts"), {
    title: "Resist and Heal",
    feedUrl: "https://api.substack.com/feed/podcast/2986841/private/07af6bfa-69b5-4035-aac5-201d2ad57d1b.rss",
    websiteUrl: "https://resistandheal.com",
    artworkUrl: "/images/resist-and-heal.jpg",
    description: "Building community, sharing trusted voices, and encouraging each other to take specific actions to heal personally and resist cooperatively.",
    categories: ["Society & Culture", "Politics"],
    isFirstParty: true,
    firstPartySlug: "resist-and-heal",
    source: "manual",
    visibility: "visible",
    hiddenReason: null,
    hiddenAt: null,
    hiddenBy: null,
    addedAt: Timestamp.fromDate(new Date()),
    lastPolledAt: Timestamp.fromDate(new Date()),
  });
  console.log(`✓ Added Resist and Heal podcast (${podRef.id})`);

  // Fetch and add episodes from the RSS feed
  console.log("Fetching episodes from RSS...");
  try {
    const res = await fetch(
      "https://api.substack.com/feed/podcast/2986841/private/07af6bfa-69b5-4035-aac5-201d2ad57d1b.rss",
      { headers: { "User-Agent": "PodCommons/1.0" }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();

    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    let count = 0;

    while ((match = itemRegex.exec(xml)) !== null && count < 10) {
      const block = match[1];
      const get = (tag) => {
        const m = block.match(new RegExp(
          `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([^<]*)<\\/${tag}>`
        ));
        return m ? (m[1] || m[2] || "").trim() : "";
      };
      const enclosure = block.match(/<enclosure[^>]+url="([^"]+)"/i);
      const duration = block.match(/<itunes:duration>([^<]+)<\/itunes:duration>/i);
      const pubDate = get("pubDate");
      const title = get("title");
      const link = get("link") || get("guid");

      if (!title) continue;

      await addDoc(collection(db, "episodes"), {
        podcastId: podRef.id,
        podcastTitle: "Resist and Heal",
        title,
        description: get("description").replace(/<[^>]*>/g, "").slice(0, 500),
        episodeUrl: link,
        audioUrl: enclosure?.[1] || "",
        imageUrl: "/images/resist-and-heal.jpg",
        publishedAt: Timestamp.fromDate(pubDate ? new Date(pubDate) : new Date()),
        duration: parseDuration(duration?.[1] || ""),
        topics: ["democracy", "civic engagement", "healing", "resistance"],
        likeCount: 0, favoriteCount: 0, commentCount: 0,
        visibility: "visible",
        isFirstParty: true,
        firstPartySlug: "resist-and-heal",
        featuredByAdmin: false,
        algorithmScore: 0.85,
        source: "opml",
        importedAt: Timestamp.fromDate(new Date()),
      });
      console.log(`  ✓ Episode: ${title}`);
      count++;
    }
    console.log(`Added ${count} episodes`);
  } catch (err) {
    console.log(`  Could not fetch RSS: ${err.message}`);
    console.log("  You can add episodes manually later via the admin dashboard.");
  }

  console.log("\n✅ Resist and Heal added!");
  process.exit(0);
}

function parseDuration(str) {
  if (!str) return 0;
  const parts = str.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parseInt(str) || 0;
}

main().catch(console.error);
