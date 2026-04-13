// Run this once with: node seedEpisodes.mjs
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

const testEpisodes = [
  {
    title: "AI in Education: What Teachers Actually Need to Know",
    podcastTitle: "EdTech Situation Room",
    description: "Wes and Jason discuss practical applications of AI tools in K-12 classrooms, including media literacy implications and how to help students think critically about AI-generated content.",
    audioUrl: "https://example.com/audio1.mp3",
    episodeUrl: "https://edtechsr.com/episode1",
    imageUrl: "https://picsum.photos/seed/edtech/200",
    publishedAt: Timestamp.fromDate(new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)),
    duration: 3240,
    topics: ["educational technology", "AI", "media literacy", "K-12"],
    likeCount: 8, favoriteCount: 3, commentCount: 2,
    visibility: "visible", isFirstParty: true,
    firstPartySlug: "edtech-situation-room",
    featuredByAdmin: true, algorithmScore: 0.92, source: "opml",
  },
  {
    title: "The State of RSS in 2026: Still Alive and Thriving",
    podcastTitle: "Hard Fork",
    description: "A deep dive into the resurgence of RSS as a tool for reclaiming your information diet from algorithmic feeds.",
    audioUrl: "https://example.com/audio2.mp3",
    episodeUrl: "https://nytimes.com/hardfork",
    imageUrl: "https://picsum.photos/seed/hardfork/200",
    publishedAt: Timestamp.fromDate(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)),
    duration: 2880,
    topics: ["RSS", "open web", "social media", "technology"],
    likeCount: 14, favoriteCount: 6, commentCount: 4,
    visibility: "visible", isFirstParty: false,
    featuredByAdmin: false, algorithmScore: 0.85, source: "opml",
  },
  {
    title: "Media Literacy in the Age of Deepfakes",
    podcastTitle: "Note to Self",
    description: "How do we teach students to evaluate authenticity in a world where AI can generate convincing video, audio, and text?",
    audioUrl: "https://example.com/audio3.mp3",
    episodeUrl: "https://wnyc.org/notetoself",
    imageUrl: "https://picsum.photos/seed/noteself/200",
    publishedAt: Timestamp.fromDate(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)),
    duration: 1980,
    topics: ["media literacy", "deepfakes", "education", "critical thinking"],
    likeCount: 22, favoriteCount: 11, commentCount: 7,
    visibility: "visible", isFirstParty: false,
    featuredByAdmin: false, algorithmScore: 0.88, source: "mastodon",
  },
  {
    title: "Democratic Norms and Local News Deserts",
    podcastTitle: "Heal Our Culture",
    description: "Wes explores the connection between the collapse of local journalism and the erosion of civic engagement.",
    audioUrl: "https://example.com/audio4.mp3",
    episodeUrl: "https://healourculture.org/episode",
    imageUrl: "https://picsum.photos/seed/healculture/200",
    publishedAt: Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)),
    duration: 2100,
    topics: ["democracy", "local news", "civic engagement", "media literacy"],
    likeCount: 5, favoriteCount: 2, commentCount: 1,
    visibility: "visible", isFirstParty: true,
    firstPartySlug: "heal-our-culture",
    featuredByAdmin: false, algorithmScore: 0.79, source: "opml",
  },
  {
    title: "Teaching SIFT: Helping Students Stop and Verify",
    podcastTitle: "Future of Education",
    description: "A conversation about the SIFT method for media literacy — Stop, Investigate the source, Find better coverage, Trace claims.",
    audioUrl: "https://example.com/audio5.mp3",
    episodeUrl: "https://futureofeducation.com/sift",
    imageUrl: "https://picsum.photos/seed/futureedu/200",
    publishedAt: Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
    duration: 2640,
    topics: ["SIFT", "media literacy", "education", "verification"],
    likeCount: 18, favoriteCount: 9, commentCount: 5,
    visibility: "visible", isFirstParty: false,
    featuredByAdmin: false, algorithmScore: 0.91, source: "pinboard",
  },
];

async function seed() {
  console.log("Seeding episodes...");
  for (const ep of testEpisodes) {
    const ref = await addDoc(collection(db, "episodes"), ep);
    console.log(`✓ Added: ${ep.title} (${ref.id})`);
  }
  console.log("\nDone! 5 episodes added to Firestore.");
  process.exit(0);
}

seed().catch(console.error);
