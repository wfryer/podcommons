import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function find() {
  const snap = await getDocs(collection(db, "podcasts"));
  console.log("Searching for resist/heal/wes podcasts...\n");
  snap.docs.forEach(d => {
    const t = (d.data().title || "").toLowerCase();
    if (t.includes("resist") || t.includes("heal") || t.includes("wes") || t.includes("shelly")) {
      console.log(`"${d.data().title}" (isFirstParty: ${d.data().isFirstParty}, slug: ${d.data().firstPartySlug})`);
    }
  });
  process.exit(0);
}
find().catch(console.error);
