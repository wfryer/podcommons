import { initializeApp } from "firebase/app";
import { getFirestore, collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";

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

async function check() {
  // Get all first-party episodes and show their actual titles
  const q = query(
    collection(db, "episodes"),
    where("isFirstParty", "==", true),
    limit(50)
  );
  const snap = await getDocs(q);
  
  const titleCounts = {};
  const slugCounts = {};
  
  snap.docs.forEach(d => {
    const data = d.data();
    titleCounts[data.podcastTitle] = (titleCounts[data.podcastTitle] || 0) + 1;
    slugCounts[data.firstPartySlug] = (slugCounts[data.firstPartySlug] || 0) + 1;
  });

  console.log("\n📺 First-party episode counts by podcastTitle:");
  Object.entries(titleCounts).sort((a,b) => b[1]-a[1]).forEach(([t,c]) => 
    console.log(`  ${c}x "${t}"`)
  );

  console.log("\n🔑 First-party episode counts by firstPartySlug:");
  Object.entries(slugCounts).sort((a,b) => b[1]-a[1]).forEach(([s,c]) => 
    console.log(`  ${c}x "${s}"`)
  );

  process.exit(0);
}

check().catch(console.error);
