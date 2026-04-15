import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { doc, updateDoc, increment, collection, addDoc, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth.jsx";
import WhyThisModal from "./WhyThisModal";
import { decodeEntities, stripHtml } from "../utils/textUtils";
import ShareSheet from "./ShareSheet";

function formatDuration(seconds) {
  if (!seconds) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(ts) {
  if (!ts) return null;
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getWhyChip(episode) {
  if (episode.featuredByAdmin) return { icon: "⭐", label: "Admin Pick" };
  if (episode.isFirstParty) return { icon: "🎙️", label: "Host" };
  if (episode.source === "pinboard") return { icon: "📌", label: "From Pinboard" };
  if (episode.source === "mastodon") return { icon: "🐘", label: "From Mastodon" };
  if (episode.likeCount > 5) return { icon: "🔥", label: "Popular" };
  return { icon: "🧠", label: "Recommended" };
}

function colorFromString(str) {
  const colors = ["#92400e", "#065f46", "#1e3a5f", "#4c1d95", "#7f1d1d", "#064e3b"];
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function EpisodeCard({ episode }) {
  const { user, profile } = useAuth();
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [likeCount, setLikeCount] = useState(episode.likeCount || 0);
  const [favoriteCount, setFavoriteCount] = useState(episode.favoriteCount || 0);
  const [imgError, setImgError] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  const chip = getWhyChip(episode);
  const duration = formatDuration(episode.duration);
  const date = formatDate(episode.publishedAt);
  const initials = (episode.podcastTitle || "?").slice(0, 2).toUpperCase();
  const placeholderBg = colorFromString(episode.podcastTitle);
  const hasAudio = !!episode.audioUrl;

  useEffect(() => {
    if (!user) return;
    checkExistingInteractions();
  }, [user, episode.id]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const checkExistingInteractions = async () => {
    try {
      const [likesSnap, favsSnap] = await Promise.all([
        getDocs(query(collection(db, "interactions"),
          where("userId", "==", user.uid), where("episodeId", "==", episode.id), where("type", "==", "like"))),
        getDocs(query(collection(db, "interactions"),
          where("userId", "==", user.uid), where("episodeId", "==", episode.id), where("type", "==", "favorite")))
      ]);
      setLiked(!likesSnap.empty);
      setFavorited(!favsSnap.empty);
    } catch (err) {}
  };

  const handlePlay = (e) => {
    e.preventDefault();
    if (!hasAudio) {
      // No audio URL — open external link
      window.open(episode.episodeUrl, "_blank");
      return;
    }
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(episode.audioUrl);
        audioRef.current.onended = () => setPlaying(false);
        audioRef.current.onerror = () => {
          // Audio failed to load — fall back to external link
          setPlaying(false);
          window.open(episode.episodeUrl || episode.audioUrl, "_blank");
        };
      }
      audioRef.current.play().catch(() => {
        window.open(episode.episodeUrl || episode.audioUrl, "_blank");
      });
      setPlaying(true);
    }
  };

  const handleLike = async (e) => {
    e.preventDefault();
    if (!user) return;
    const snap = await getDocs(query(collection(db, "interactions"),
      where("userId", "==", user.uid), where("episodeId", "==", episode.id), where("type", "==", "like")));
    if (!snap.empty) {
      await deleteDoc(doc(db, "interactions", snap.docs[0].id));
      await updateDoc(doc(db, "episodes", episode.id), { likeCount: increment(-1) });
      setLiked(false); setLikeCount(c => Math.max(0, c - 1));
    } else {
      await addDoc(collection(db, "interactions"), {
        userId: user.uid, episodeId: episode.id, type: "like",
        status: profile?.role === "new" ? "pending" : "approved", createdAt: new Date(),
      });
      await updateDoc(doc(db, "episodes", episode.id), { likeCount: increment(1) });
      setLiked(true); setLikeCount(c => c + 1);
    }
  };

  const handleFavorite = async (e) => {
    e.preventDefault();
    if (!user) return;
    const snap = await getDocs(query(collection(db, "interactions"),
      where("userId", "==", user.uid), where("episodeId", "==", episode.id), where("type", "==", "favorite")));
    if (!snap.empty) {
      await deleteDoc(doc(db, "interactions", snap.docs[0].id));
      await updateDoc(doc(db, "episodes", episode.id), { favoriteCount: increment(-1) });
      setFavorited(false); setFavoriteCount(c => Math.max(0, c - 1));
    } else {
      await addDoc(collection(db, "interactions"), {
        userId: user.uid, episodeId: episode.id, type: "favorite",
        status: "approved", createdAt: new Date(),
      });
      await updateDoc(doc(db, "episodes", episode.id), { favoriteCount: increment(1) });
      setFavorited(true); setFavoriteCount(c => c + 1);
    }
  };

  const handleQueue = async (e) => {
    e.preventDefault();
    if (!user) return;
    // Check if already queued
    const snap = await getDocs(query(collection(db, "interactions"),
      where("userId", "==", user.uid), where("episodeId", "==", episode.id), where("type", "==", "queue")));
    if (!snap.empty) {
      await deleteDoc(doc(db, "interactions", snap.docs[0].id));
    } else {
      await addDoc(collection(db, "interactions"), {
        userId: user.uid, episodeId: episode.id, type: "queue",
        status: "approved", createdAt: new Date(),
      });
    }
  };

  const handleFlag = async (e) => {
    e.preventDefault();
    if (!user) return;
    const reason = window.prompt("Why are you flagging this?\n• Inappropriate\n• Spam\n• Misinformation\n• Broken link\n• Other");
    if (!reason) return;
    await addDoc(collection(db, "flags"), {
      reportedBy: user.uid, targetType: "episode", targetId: episode.id,
      reason, status: "pending", createdAt: new Date(),
    });
    alert("Thanks for your report. An admin will review this episode.");
  };

  return (
    <>
      <Link to={`/episode/${episode.id}`} style={{ textDecoration: "none" }}>
        <div className="podcast-card" style={{ padding: "1rem", display: "flex", gap: "1rem" }}>

          {/* Artwork with play button overlay */}
          <div style={{ flexShrink: 0, position: "relative" }}>
            {episode.imageUrl && !imgError ? (
              <img src={episode.imageUrl} alt={episode.podcastTitle}
                onError={() => setImgError(true)}
                style={{ width: 80, height: 80, borderRadius: "10px", objectFit: "cover", display: "block" }} />
            ) : (
              <div style={{
                width: 80, height: 80, borderRadius: "10px", background: placeholderBg,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "1.2rem", fontWeight: 700,
                color: "rgba(255,255,255,0.85)", fontFamily: "var(--font-display)"
              }}>{initials}</div>
            )}
            {/* Play button overlay */}
            <button
              onClick={handlePlay}
              title={playing ? "Pause" : hasAudio ? "Play" : "Listen externally"}
              style={{
                position: "absolute", inset: 0, borderRadius: "10px",
                background: "rgba(0,0,0,0.25)",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s",
                opacity: 1,
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = "1"}
              onMouseLeave={e => { if (!playing) e.currentTarget.style.opacity = "0"; }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(245,158,11,0.9)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.9rem", color: "#000"
              }}>
                {playing ? "⏸" : "▶"}
              </div>
            </button>
          </div>

          {/* Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.15rem" }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--color-accent)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                {decodeEntities(episode.podcastTitle) || "Podcast"}
              </p>
              <button onClick={e => { e.preventDefault(); setShowWhy(true); }}
                className="why-chip" style={{ flexShrink: 0, fontSize: "0.68rem" }}>
                {chip.icon} {chip.label}
              </button>
            </div>

            <p style={{ fontWeight: 600, fontSize: "0.92rem", lineHeight: 1.35, color: "var(--color-text)", marginBottom: "0.25rem" }}>
              {decodeEntities(episode.title)}
            </p>

            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.4rem" }}>
              {[date, duration].filter(Boolean).join(" · ")}
            </p>

            {episode.description && (
              <p style={{
                fontSize: "0.8rem", color: "var(--color-text-muted)", lineHeight: 1.45,
                marginBottom: "0.5rem", display: "-webkit-box", WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical", overflow: "hidden"
              }}>
                {stripHtml(episode.description)}
              </p>
            )}

            {/* Actions */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
              <button onClick={handleLike} disabled={!user}
                title={liked ? "Unlike" : "Like"}
                style={{
                  background: "none", border: "none", cursor: user ? "pointer" : "default",
                  fontSize: "0.78rem", color: liked ? "var(--color-accent)" : "var(--color-text-muted)",
                  display: "flex", alignItems: "center", gap: "0.2rem", padding: 0
                }}>
                {liked ? "♥" : "♡"} {likeCount}
              </button>
              <button onClick={handleFavorite} disabled={!user}
                title={favorited ? "Unfavorite" : "Favorite"}
                style={{
                  background: "none", border: "none", cursor: user ? "pointer" : "default",
                  fontSize: "0.78rem", color: favorited ? "var(--color-accent)" : "var(--color-text-muted)",
                  display: "flex", alignItems: "center", gap: "0.2rem", padding: 0
                }}>
                {favorited ? "★" : "☆"} {favoriteCount}
              </button>
              <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
                💬 {episode.commentCount || 0}
              </span>

              {/* Play/Listen button */}
              <button onClick={handlePlay}
                style={{
                  background: "none", border: "1px solid var(--color-border)",
                  borderRadius: "6px", padding: "0.18rem 0.55rem",
                  fontSize: "0.72rem",
                  color: playing ? "var(--color-accent)" : "var(--color-text-muted)",
                  cursor: "pointer",
                }}>
                {playing ? "⏸ Pause" : hasAudio ? "▶ Play" : "↗ Listen"}
              </button>

              <button onClick={e => { e.preventDefault(); setShowShare(true); }}
                style={{
                  background: "none", border: "1px solid var(--color-border)",
                  borderRadius: "6px", padding: "0.18rem 0.55rem",
                  fontSize: "0.72rem", color: "var(--color-text-muted)",
                  cursor: "pointer", marginLeft: "auto"
                }}>
                Share ↗
              </button>

              {user && (
                <button onClick={handleQueue}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "var(--color-text-muted)", padding: 0 }}
                  title="Add to listening queue">🎧</button>
              )}
              {user && (
                <button onClick={handleFlag}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.75rem", color: "var(--color-text-muted)", padding: 0 }}
                  title="Flag this episode">🚩</button>
              )}
            </div>
          </div>
        </div>
      </Link>

      {showWhy && <WhyThisModal episode={episode} onClose={() => setShowWhy(false)} />}
      {showShare && <ShareSheet episode={episode} onClose={() => setShowShare(false)} />}
    </>
  );
}
