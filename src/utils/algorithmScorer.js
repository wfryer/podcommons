// PodCommons Algorithm Scorer v3
// Mode-driven discovery with dramatic preset differences

import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

let cachedTasteProfile = null;

// ─── Discovery Modes ──────────────────────────────────────────────────────────
export const DISCOVER_MODES = [
  {
    id: "fresh",
    label: "Fresh",
    icon: "🕐",
    desc: "Newest episodes first — no algorithm, just what just dropped",
    showSliders: false,
  },
  {
    id: "recommended",
    label: "Recommended",
    icon: "🎯",
    desc: "Ranked by the curator's taste profile and AI signals — the episodes most likely to resonate",
    showSliders: true,
    sliders: { discoveryVsFamiliar: 60, recentVsTimeless: 55, myTasteVsCommunity: 92 },
  },
  {
    id: "buzzing",
    label: "Buzzing",
    icon: "🔥",
    desc: "What the PodCommons community is liking and talking about most right now",
    showSliders: false,
    sliders: { discoveryVsFamiliar: 50, recentVsTimeless: 70, myTasteVsCommunity: 4 },
  },
  {
    id: "wander",
    label: "Wander",
    icon: "🧭",
    desc: "Off the beaten path — unfamiliar shows, unexpected topics, outside your usual bubble",
    showSliders: false,
    sliders: { discoveryVsFamiliar: 98, recentVsTimeless: 50, myTasteVsCommunity: 8 },
  },
  {
    id: "picks",
    label: "Picks",
    icon: "⭐",
    desc: "Hand-picked episodes featured by the curator",
    showSliders: false,
  },
  {
    id: "talking",
    label: "Talking",
    icon: "💬",
    desc: "Episodes with active community comments — join the conversation",
    showSliders: false,
  },
];

export const DEFAULT_MODE = "fresh";

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
    return { showScores: {}, totalListens: 0 };
  }
}

export function scoreEpisode(episode, tasteProfile, sliders, modeId) {
  const {
    discoveryVsFamiliar = 60,
    recentVsTimeless = 55,
    myTasteVsCommunity = 92,
  } = sliders || {};

  const discoveryWeight = discoveryVsFamiliar / 100;
  const recencyWeight = recentVsTimeless / 100;
  const myTasteWeight = myTasteVsCommunity / 100;

  // 1. AI taste score — stretch to full 0-1 range
  const rawTaste = episode.tasteScore ?? 0.5;
  const aiTasteScore = Math.min(1, Math.max(0, (rawTaste - 0.3) / 0.5));

  // 2. For Wander mode — INVERT the taste score to surface unexpected content
  const effectiveTasteScore = modeId === "wander"
    ? 1 - aiTasteScore
    : aiTasteScore;

  // 3. Listening history show match
  const podTitle = (episode.podcastTitle || "").toLowerCase();
  const showMatchScore = tasteProfile.showScores[podTitle] || 0;

  // 4. For Wander — penalize familiar shows heavily
  const effectiveShowMatch = modeId === "wander"
    ? Math.max(0, 0.2 - showMatchScore)
    : showMatchScore;

  // 5. Personal signal
  const personalSignal =
    discoveryWeight * effectiveTasteScore +
    (1 - discoveryWeight) * Math.max(effectiveTasteScore * 0.5, effectiveShowMatch);

  // 6. Recency
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

  // 7. Community engagement
  const likes = episode.likeCount || 0;
  const favs = episode.favoriteCount || 0;
  const comments = episode.commentCount || 0;
  const communityScore = Math.min(1, (likes * 3 + favs * 4 + comments * 5) / 15);

  // 8. Blend personal vs community
  const feedSignal =
    myTasteWeight * personalSignal +
    (1 - myTasteWeight) * communityScore;

  // 9. Boosts
  const firstPartyBoost = episode.isFirstParty ? 0.15 : 0;
  const featuredBoost = episode.featuredByAdmin ? 0.30 : 0;

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

export async function rankEpisodes(episodes, sliders, userId = "admin", modeId = "recommended") {
  const tasteProfile = await buildTasteProfile(userId);
  return episodes
    .map(ep => {
      const { score, signals } = scoreEpisode(ep, tasteProfile, sliders, modeId);
      return { ...ep, _computedScore: score, recommendationSignals: signals };
    })
    .sort((a, b) => b._computedScore - a._computedScore);
}
