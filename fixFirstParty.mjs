// Fix first-party flags for all 5 shows in Firestore
// Run with: node fixFirstParty.mjs

import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, writeBatch } from "firebase/firestore";

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

// Map of title keywords → slug
const FIRST_PARTY_SHOWS = [
  {
    slug: "edtech-situation-room",
    titleKeywords: ["edtech situation room", "edtechsr", "edtech sr"],
  },
  {
    slug: "wes-and-shelly-share",
    titleKeywords: ["wes and shelly", "wes & shelly"],
  },
  {
    slug: "speed-of-creativity",
    titleKeywords: ["speed of creativity"],
  },
  {
    slug: "heal-our-culture",
    titleKeywords: ["heal our culture"],
  },
  {
    slug: "resist-and-heal",
    titleKeywords: ["resist and heal", "resist & heal"],
  },
];

async function fixPodcasts() {
  console.log("Fixing podcasts collection...");
  const snap = await getDocs(collection(db, "podcasts"));
  let fixed = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const titleLower = (data.title || "").toLowerCase();

    for (const show of FIRST_PARTY_SHOWS) {
      if (show.titleKeywords.some(k => titleLower.includes(k))) {
        await updateDoc(doc(db, "podcasts", docSnap.id), {
          isFirstParty: true,
          firstPartySlug: show.slug,
        });
        console.log(`  ✓ Podcast: "${data.title}" → ${show.slug}`);
        fixed++;
        break;
      }
    }
  }
  console.log(`Fixed ${fixed} podcast documents`);
}

async function fixEpisodes() {
  console.log("\nFixing episodes collection...");
  const snap = await getDocs(collection(db, "episodes"));
  let fixed = 0;
  let batch = writeBatch(db);
  let batchCount = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const titleLower = (data.podcastTitle || "").toLowerCase();

    for (const show of FIRST_PARTY_SHOWS) {
      if (show.titleKeywords.some(k => titleLower.includes(k))) {
        batch.update(doc(db, "episodes", docSnap.id), {
          isFirstParty: true,
          firstPartySlug: show.slug,
          algorithmScore: 0.85,
        });
        batchCount++;
        fixed++;

        // Firestore batch limit is 500
        if (batchCount >= 499) {
          await batch.commit();
          batch = writeBatch(db);
          batchCount = 0;
          console.log(`  Committed batch...`);
        }
        break;
      }
    }
  }

  if (batchCount > 0) await batch.commit();
  console.log(`Fixed ${fixed} episode documents`);
}

async function main() {
  await fixPodcasts();
  await fixEpisodes();
  console.log("\n✅ All first-party shows fixed!");
  process.exit(0);
}

main().catch(console.error);
