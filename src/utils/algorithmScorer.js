// PodCommons Algorithm Scorer v3
// Uses AI tasteScore + recency + community + mode presets

import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

let cachedTasteProfile = null;

// ─── Mode Presets ─────────────────────────────────────────────────────────────
export const DISCOVER_MODES = [
  {
    id: "curators_taste",
    label: "Curator's Taste",
    icon: "🎯",
    desc: "Ranked by the curator's AI taste profile — the episodes most likely to resonate",
    sliders: { discoveryVsFamiliar: 60, recentVsTimeless: 55, myTasteVsCommunity: 90 },
  },
  {
    id: "surprise_me",
    label: "Surprise Me",
    icon: "🎲",
    desc: "Maximum discovery — unfamiliar shows, unexpected topics, outside your usual bubble",
    sliders: { discoveryVsFamiliar: 95, recentVsTimeless: 50, myTasteVsCommunity: 30 },
  },
  {
    id: "community_pulse",
    label: "Community Pulse",
    icon: "🔥",
    desc: "What the PodCommons community is liking and talking about most",
    sliders: { discoveryVsFamiliar: 50, recentVsTimeless: 70, myTasteVsCommunity: 5 },
  },
  {
    id: "latest",
    label: "Latest",
    icon: "🕐",
    desc: "Pure chronological — newest episodes first, no algorithm",
    sliders: { discoveryVsFamiliar: 50, recentVsTimeless: 100, myTasteVsCommunity: 50 },
  },
];

export const DEFAULT_MODE = "curators_taste";

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
  const rawTaste = episode.tasteScore ?? 0.5;
  const aiTasteScore = Math.min(1, Math.max(0, (rawTaste - 0.3) / 0.5));

  // 2. Listening history show match
  const podTitle = (episode.podcastTitle || "").toLowerCase();
  const showMatchScore = tasteProfile.showScores[podTitle] || 0;

  // 3. Personal signal — blend AI taste + history
  const personalSignal =
    discoveryWeight * aiTasteScore +
    (1 - discoveryWeight) * Math.max(aiTasteScore * 0.5, showMatchScore);

  // 4. Recency
  let recencyScore = 0;
  if (episode.publishedAt) {
    const date = episode.publishedAt.toDate
      ? episode.publishedAt.toDate()
      : new Date(episode.publishedAt);
    const daysOld = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    const recentDecay = Math.max(0, 1 - (daysOld / 14));
    const timelessDecay = Math.max(0, 1 - (daysOld / 180));
    recencyScore = recencyWeight * recentDecay + (1 - recencyWeight) * timelessDecay;
  }

  // 5. Community engagement
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

  // Final score
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
