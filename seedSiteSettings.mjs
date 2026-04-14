import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

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

await setDoc(doc(db, "siteSettings", "general"), {
  title: "PodCommons",
  byline: "Wes Fryer",
  description: "A community podcast discovery engine with transparent algorithms.",
  adminEmail: "wes@wesfryer.com",
});

await setDoc(doc(db, "siteSettings", "registration"), {
  mode: "open",
  closedMessage: "Registration is currently by invitation only. Contact Wes at podcasts.wesfryer.com/about to request access.",
});

console.log("✅ Site settings seeded!");
process.exit(0);
