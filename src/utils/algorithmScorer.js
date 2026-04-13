// PodCommons Algorithm Scorer
// Computes a personalized score for each episode based on:
// 1. Listening history taste profile (shows/topics you've listened to)
// 2. Community engagement (likes, favorites, comments)
// 3. Recency (how recently published)
// 4. First-party boost (Wes's own shows)
// 5. User slider preferences

import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

// Cache taste profile in memory for the session
let cachedTasteProfile = null;

export async function buildTasteProfile(userId = "admin") {
  if (cachedTasteProfile) return cachedTasteProfile;

  try {
    const q = query(collection(db, "listeningHistory"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const history = snap.docs.map(d => d.data());

    // Count listens per show
    const showCounts = {};
    history.forEach(h => {
      const show = h.podcastTitle || "";
      showCounts[show] = (showCounts[show] || 0) + 1;
    });

    // Normalize to 0-1
    const maxCount = Math.max(...Object.values(showCounts), 1);
    const showScores = {};
    Object.entries(showCounts).forEach(([show, count]) => {
      showScores[show.toLowerCase()] = count / maxCount;
    });

    const topicSignals = buildTopicSignals(showCounts);
    cachedTasteProfile = { showScores, topicSignals, totalListens: history.length };
    return cachedTasteProfile;
  } catch (err) {
    console.error("Could not build taste profile:", err);
    return { showScores: {}, topicSignals: {}, totalListens: 0 };
  }
}

function buildTopicSignals(showCounts) {
  const SHOW_TOPICS = {
    "hard fork": ["AI", "technology", "social media"],
    "edtech situation room by jason neiffer and wes fryer": ["educational technology", "AI", "media literacy"],
    "angry planet": ["democracy", "civic", "politics"],
    "the teacher's forum": ["education", "teaching", "civic"],
    "letters from an american": ["democracy", "history", "politics"],
    "on the media": ["media literacy", "journalism", "misinformation"],
    "straight white american jesus": ["faith", "politics", "religion"],
    "indivisible clt podcast": ["civic", "democracy", "local"],
    "the daily": ["news", "politics", "journalism"],
    "bibleproject": ["faith", "theology"],
    "the tech policy press podcast": ["technology", "policy", "media literacy"],
    "your undivided attention": ["technology", "social media", "psychology"],
    "the history hour": ["history"],
    "american history tellers": ["history"],
    "science friday": ["science"],
    "today, explained": ["news", "politics"],
    "heal our culture": ["democracy", "civic", "faith"],
    "resist and heal": ["democracy", "civic", "resistance"],
    "1a": ["news", "journalism", "civic"],
    "tea for teaching": ["education", "teaching"],
    "how we teach this": ["education", "teaching"],
  };

  const topicWeights = {};
  Object.entries(showCounts).forEach(([show, count]) => {
    const topics = SHOW_TOPICS[show.toLowerCase()] || [];
    topics.forEach(topic => {
      topicWeights[topic] = (topicWeights[topic] || 0) + count;
    });
  });

  const maxWeight = Math.max(...Object.values(topicWeights), 1);
  const normalized = {};
  Object.entries(topicWeights).forEach(([topic, weight]) => {
    normalized[topic.toLowerCase()] = weight / maxWeight;
  });
  return normalized;
}

export function scoreEpisode(episode, tasteProfile, sliders) {
  const {
    discoveryVsFamiliar = 70,
    recentVsTimeless = 60,
    myTasteVsCommunity = 50,
  } = sliders || {};

  const discoveryWeight = discoveryVsFamiliar / 100;
  const recencyWeight = recentVsTimeless / 100;
  const myTasteWeight = myTasteVsCommunity / 100;

  // 1. Recency score — decay over 60 days
  let recencyScore = 0;
  if (episode.publishedAt) {
    const date = episode.publishedAt.toDate
      ? episode.publishedAt.toDate()
      : new Date(episode.publishedAt);
    const daysOld = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    recencyScore = Math.max(0, 1 - (daysOld / 60));
  }

  // 2. Show match from listening history
  const podTitle = (episode.podcastTitle || "").toLowerCase();
  const showMatchScore = tasteProfile.showScores[podTitle] || 0;

  // 3. Topic match from episode topics vs taste profile
  let topicMatchScore = 0;
  if (episode.topics?.length > 0) {
    const scores = episode.topics.map(t => tasteProfile.topicSignals[t.toLowerCase()] || 0);
    topicMatchScore = scores.reduce((a, b) => a + b, 0) / Math.max(scores.length, 1);
  }

  // 4. Community engagement
  const likes = episode.likeCount || 0;
  const favs = episode.favoriteCount || 0;
  const comments = episode.commentCount || 0;
  const communityScore = Math.min(1, (likes * 2 + favs * 3 + comments * 4) / 50);

  // 5. Boosts
  const firstPartyBoost = episode.isFirstParty ? 0.25 : 0;
  const featuredBoost = episode.featuredByAdmin ? 0.4 : 0;

  // Combine signals with slider weights
  const familiarScore = showMatchScore;
  const discoveryScore = topicMatchScore * (1 - familiarScore * 0.5);
  const tasteSignal = discoveryWeight * discoveryScore + (1 - discoveryWeight) * familiarScore;
  const timeSignal = recencyWeight * recencyScore + (1 - recencyWeight) * Math.min(1, (likes + favs) / 10);
  const feedSignal = myTasteWeight * tasteSignal + (1 - myTasteWeight) * communityScore;

  const finalScore = Math.min(1,
    feedSignal * 0.45 +
    timeSignal * 0.30 +
    firstPartyBoost * 0.15 +
    featuredBoost * 0.10
  );

  return {
    score: finalScore,
    signals: {
      topicMatch: Math.round(topicMatchScore * 100),
      communityScore: Math.round(communityScore * 100),
      recencyScore: Math.round(recencyScore * 100),
      historyMatch: Math.round(showMatchScore * 100),
      adminFeatured: episode.featuredByAdmin ? 100 : 0,
    }
  };
}

export async function rankEpisodes(episodes, sliders, userId = "admin") {
  const tasteProfile = await buildTasteProfile(userId);
  return episodes
    .map(ep => {
      const { score, signals } = scoreEpisode(ep, tasteProfile, sliders);
      return { ...ep, _computedScore: score, recommendationSignals: signals };
    })
    .sort((a, b) => b._computedScore - a._computedScore);
}
