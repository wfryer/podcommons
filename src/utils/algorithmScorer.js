// PodCommons Algorithm Scorer v2
// Uses AI tasteScore + recency + community + sliders

import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

let cachedTasteProfile = null;

export async function buildTasteProfile(userId = "admin") {
  if (cachedTasteProfile) return cachedTasteProfile;
  try {
    const q = query(collection(db, "listeningHistory"), where("userId", "==", userId));
    const snap = await getDocs(q);
    const history = snap.docs.map(d => d.data());

    const showCounts = {};
    history.forEach(h => {
      const show = h.podcastTitle || "";
      showCounts[show] = (showCounts[show] || 0) + 1;
    });

    const maxCount = Math.max(...Object.values(showCounts), 1);
    const showScores = {};
    Object.entries(showCounts).forEach(([show, count]) => {
      showScores[show.toLowerCase()] = count / maxCount;
    });

    cachedTasteProfile = { showScores, totalListens: history.length };
    return cachedTasteProfile;
  } catch (err) {
    console.error("Could not build taste profile:", err);
    return { showScores: {}, totalListens: 0 };
  }
}

export function scoreEpisode(episode, tasteProfile, sliders) {
  const {
    discoveryVsFamiliar = 70,
    recentVsTimeless = 60,
    myTasteVsCommunity = 50,
  } = sliders || {};

  // Normalize sliders 0-1
  const discoveryWeight = discoveryVsFamiliar / 100;
  const recencyWeight = recentVsTimeless / 100;
  const myTasteWeight = myTasteVsCommunity / 100;

  // 1. AI taste score — stretch to full 0-1 range
  // Raw Gemini scores cluster around 0.4-0.7, so we stretch them
  const rawTaste = episode.tasteScore ?? 0.5;
  const aiTasteScore = Math.min(1, Math.max(0, (rawTaste - 0.3) / 0.5));

  // 2. Listening history show match
  const podTitle = (episode.podcastTitle || "").toLowerCase();
  const showMatchScore = tasteProfile.showScores[podTitle] || 0;

  // 3. Personal signal — blend AI taste + history
  // Discovery mode: AI taste dominates (finds new relevant shows)
  // Familiar mode: history match dominates (known shows)
  const personalSignal =
    discoveryWeight * aiTasteScore +
    (1 - discoveryWeight) * Math.max(aiTasteScore * 0.5, showMatchScore);

  // 4. Recency — faster decay for more dramatic slider effect
  // Recent slider: 14-day half-life
  // Timeless slider: 180-day half-life
  let recencyScore = 0;
  if (episode.publishedAt) {
    const date = episode.publishedAt.toDate
      ? episode.publishedAt.toDate()
      : new Date(episode.publishedAt);
    const daysOld = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    const recentDecay = Math.max(0, 1 - (daysOld / 14));   // aggressive
    const timelessDecay = Math.max(0, 1 - (daysOld / 180)); // gentle
    recencyScore = recencyWeight * recentDecay + (1 - recencyWeight) * timelessDecay;
  }

  // 5. Community engagement — more sensitive scaling
  const likes = episode.likeCount || 0;
  const favs = episode.favoriteCount || 0;
  const comments = episode.commentCount || 0;
  const communityScore = Math.min(1, (likes * 3 + favs * 4 + comments * 5) / 15);

  // 6. My taste vs community slider
  const feedSignal =
    myTasteWeight * personalSignal +
    (1 - myTasteWeight) * communityScore;

  // 7. Boosts
  const firstPartyBoost = episode.isFirstParty ? 0.15 : 0;
  const featuredBoost = episode.featuredByAdmin ? 0.30 : 0;

  // Final score — weighted combination
  const finalScore = Math.min(1,
    feedSignal * 0.55 +
    recencyScore * 0.30 +
    firstPartyBoost +
    featuredBoost
  );

  return {
    score: finalScore,
    signals: {
      aiTasteScore: Math.round(aiTasteScore * 100),
      historyMatch: Math.round(showMatchScore * 100),
      communityScore: Math.round(communityScore * 100),
      recencyScore: Math.round(recencyScore * 100),
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
