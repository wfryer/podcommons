// pruneEpisodes.mjs — local episode pruning for PodCommons
//
// USAGE (run from inside the functions/ folder):
//   node pruneEpisodes.mjs          → PREVIEW only, deletes nothing
//   node pruneEpisodes.mjs --live   → actually deletes
//
// Protects: your own shows, anything with likes/favorites/comments/queue saves,
// admin picks, and anything published in the last 60 days.

import { readFileSync, existsSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const LIVE = process.argv.includes("--live");
const CUTOFF_DAYS = 60;

// ─── Find the service account key ───────────────────────────────────────────
const candidates = [
  "./serviceAccount.json",
  "../serviceAccount.json",
  "./serviceAccountKey.json",
  "../serviceAccountKey.json",
];
const keyPath = candidates.find((p) => existsSync(p));

if (!keyPath) {
  console.error("\n❌ Could not find serviceAccount.json\n");
  console.error("Looked in:");
  candidates.forEach((p) => console.error("   " + p));
  console.error("\nTo get one: Firebase Console → Project Settings → Service Accounts");
  console.error("→ Generate new private key → save it as serviceAccount.json\n");
  process.exit(1);
}

console.log(`Using credentials: ${keyPath}`);
initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, "utf8"))) });
const db = getFirestore();

// ─── Load data ──────────────────────────────────────────────────────────────
console.log("Loading episodes and interactions...\n");
const [episodesSnap, interactionsSnap] = await Promise.all([
  db.collection("episodes").get(),
  db.collection("interactions").get(),
]);

const interacted = new Set(interactionsSnap.docs.map((d) => d.data().episodeId));
const cutoffDate = new Date(Date.now() - CUTOFF_DAYS * 24 * 60 * 60 * 1000);

// ─── Decide what to keep ────────────────────────────────────────────────────
let firstParty = 0, hasInteraction = 0, hasEngagement = 0, featured = 0, recent = 0;
const toDelete = [];
const byFeed = {};

for (const docSnap of episodesSnap.docs) {
  const ep = docSnap.data();
  const published = ep.publishedAt?.toDate
    ? ep.publishedAt.toDate()
    : new Date(ep.publishedAt);

  if (ep.isFirstParty === true) { firstParty++; continue; }
  if (interacted.has(docSnap.id)) { hasInteraction++; continue; }
  if ((ep.likeCount || 0) > 0 || (ep.favoriteCount || 0) > 0 || (ep.commentCount || 0) > 0) {
    hasEngagement++; continue;
  }
  if (ep.featuredByAdmin === true) { featured++; continue; }
  if (published >= cutoffDate) { recent++; continue; }

  toDelete.push(docSnap.id);
  const feed = ep.podcastTitle || "Unknown";
  byFeed[feed] = (byFeed[feed] || 0) + 1;
}

// ─── Report ─────────────────────────────────────────────────────────────────
console.log("─".repeat(50));
console.log(`Total episodes:      ${episodesSnap.size}`);
console.log("─".repeat(50));
console.log("PROTECTED (will be kept):");
console.log(`  Your own shows:      ${firstParty}`);
console.log(`  Liked/saved/queued:  ${hasInteraction}`);
console.log(`  Has engagement:      ${hasEngagement}`);
console.log(`  Admin picks:         ${featured}`);
console.log(`  Last ${CUTOFF_DAYS} days:       ${recent}`);
console.log("─".repeat(50));
console.log(`TO DELETE:             ${toDelete.length}`);
console.log(`REMAINING AFTER:       ${episodesSnap.size - toDelete.length}`);
console.log("─".repeat(50));

const topFeeds = Object.entries(byFeed).sort((a, b) => b[1] - a[1]).slice(0, 10);
if (topFeeds.length) {
  console.log("\nMost affected feeds:");
  topFeeds.forEach(([title, n]) => console.log(`  ${n.toString().padStart(5)}  ${title}`));
}

// ─── Delete (only with --live) ──────────────────────────────────────────────
if (!LIVE) {
  console.log("\n👀 PREVIEW ONLY — nothing was deleted.");
  console.log("   To actually delete, run:  node pruneEpisodes.mjs --live\n");
  process.exit(0);
}

if (toDelete.length === 0) {
  console.log("\n✅ Nothing to delete.\n");
  process.exit(0);
}

console.log(`\n🗑️  Deleting ${toDelete.length} episodes...`);
let done = 0;
for (let i = 0; i < toDelete.length; i += 400) {
  const batch = db.batch();
  toDelete.slice(i, i + 400).forEach((id) => batch.delete(db.collection("episodes").doc(id)));
  await batch.commit();
  done += Math.min(400, toDelete.length - i);
  console.log(`   ${done} / ${toDelete.length}`);
}

// Keep the cached episode count on the site in sync
try {
  await db.collection("siteSettings").doc("stats").set(
    { episodeCount: episodesSnap.size - done },
    { merge: true }
  );
} catch (err) {
  console.warn("   (couldn't update cached stats: " + err.message + ")");
}

console.log(`\n✅ Done. Deleted ${done}. ${episodesSnap.size - done} episodes remain.\n`);
process.exit(0);
