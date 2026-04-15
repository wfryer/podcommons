import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, updateDoc, increment, collection, addDoc, query, where, getDocs, orderBy, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth.jsx";
import WhyThisModal from "../components/WhyThisModal";
import { decodeEntities, stripHtml } from "../utils/textUtils";
import AudioPlayer from "../components/AudioPlayer";
import ShareSheet from "../components/ShareSheet";

function formatDuration(seconds) {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDate(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

// stripHtml imported from textUtils

export default function Episode() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [episode, setEpisode] = useState(null);
  const [comments, setComments] = useState([]);
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
  const [queued, setQueued] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEpisode();
    fetchComments();
  }, [id]);

  const fetchEpisode = async () => {
    const snap = await getDoc(doc(db, "episodes", id));
    if (snap.exists()) {
      const data = snap.data();
      setEpisode({ id: snap.id, ...data });
      setLikeCount(data.likeCount || 0);
      setFavoriteCount(data.favoriteCount || 0);
      setFeatured(data.featuredByAdmin || false);
    }
    // Check existing interactions
    if (user) {
      try {
        const [qSnap] = await Promise.all([
          getDocs(query(collection(db, "interactions"),
            where("userId", "==", user.uid), where("episodeId", "==", id), where("type", "==", "queue")))
        ]);
        setQueued(!qSnap.empty);
      } catch (err) {}
    }
    setLoading(false);
  };

  const fetchComments = async () => {
    try {
      const q = query(
        collection(db, "interactions"),
        where("episodeId", "==", id),
        where("type", "==", "comment"),
        where("status", "==", "approved"),
        orderBy("createdAt", "desc")
      );
      const snap = await getDocs(q);
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("Comments fetch error:", err);
    }
  };

  const handleLike = async () => {
    if (!user) return;
    const q = query(collection(db, "interactions"),
      where("userId", "==", user.uid), where("episodeId", "==", id), where("type", "==", "like"));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await deleteDoc(doc(db, "interactions", snap.docs[0].id));
      await updateDoc(doc(db, "episodes", id), { likeCount: increment(-1) });
      setLiked(false);
      setLikeCount(c => Math.max(0, c - 1));
    } else {
      await addDoc(collection(db, "interactions"), {
        userId: user.uid, episodeId: id, type: "like",
        status: profile?.role === "new" ? "pending" : "approved", createdAt: new Date(),
      });
      await updateDoc(doc(db, "episodes", id), { likeCount: increment(1) });
      setLiked(true);
      setLikeCount(c => c + 1);
    }
  };

  const handleFavorite = async () => {
    if (!user) return;
    const q = query(collection(db, "interactions"),
      where("userId", "==", user.uid), where("episodeId", "==", id), where("type", "==", "favorite"));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await deleteDoc(doc(db, "interactions", snap.docs[0].id));
      await updateDoc(doc(db, "episodes", id), { favoriteCount: increment(-1) });
      setFavorited(false);
      setFavoriteCount(c => Math.max(0, c - 1));
    } else {
      await addDoc(collection(db, "interactions"), {
        userId: user.uid, episodeId: id, type: "favorite",
        status: "approved", createdAt: new Date(),
      });
      await updateDoc(doc(db, "episodes", id), { favoriteCount: increment(1) });
      setFavorited(true);
      setFavoriteCount(c => c + 1);
    }
  };

  const handleFeature = async () => {
    if (!user) return;
    const newVal = !featured;
    setFeatured(newVal);
    await updateDoc(doc(db, "episodes", id), { featuredByAdmin: newVal });
  };

  const handleQueue = async () => {
    if (!user) return;
    const q = query(collection(db, "interactions"),
      where("userId", "==", user.uid), where("episodeId", "==", id), where("type", "==", "queue"));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await deleteDoc(doc(db, "interactions", snap.docs[0].id));
      setQueued(false);
    } else {
      await addDoc(collection(db, "interactions"), {
        userId: user.uid, episodeId: id, type: "queue",
        status: "approved", createdAt: new Date(),
      });
      setQueued(true);
    }
  };

  const handleFlag = async () => {
    if (!user) return;
    const reason = window.prompt("Why are you flagging this?\n• Inappropriate\n• Spam\n• Misinformation\n• Broken link\n• Other");
    if (!reason) return;
    await addDoc(collection(db, "flags"), {
      reportedBy: user.uid, targetType: "episode", targetId: id,
      reason, status: "pending", createdAt: new Date(),
    });
    alert("Thanks for your report. An admin will review this episode.");
  };

  const handleComment = async () => {
    if (!user || !commentText.trim()) return;
    setSubmitting(true);
    const interaction = {
      userId: user.uid,
      username: profile?.username || "anonymous",
      episodeId: id,
      type: "comment",
      content: commentText.trim(),
      status: profile?.role === "trusted" || profile?.role === "admin" ? "approved" : "pending",
      createdAt: new Date(),
    };
    await addDoc(collection(db, "interactions"), interaction);
    if (profile?.role === "new") {
      await addDoc(collection(db, "moderationQueue"), { ...interaction, type: "comment" });
    }
    await updateDoc(doc(db, "episodes", id), { commentCount: increment(1) });
    setCommentText("");
    setSubmitting(false);
    if (interaction.status === "approved") {
      setComments(prev => [{ ...interaction, id: Date.now() }, ...prev]);
    } else {
      alert("Your comment has been submitted for review and will appear once approved.");
    }
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-text-muted)" }}>
      Loading episode...
    </div>
  );

  if (!episode) return (
    <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-text-muted)" }}>
      Episode not found. <Link to="/" style={{ color: "var(--color-accent)" }}>← Back to feed</Link>
    </div>
  );

  const cleanDescription = stripHtml(episode.description);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      <Link to="/" style={{ color: "var(--color-text-muted)", fontSize: "0.85rem",
        display: "inline-flex", alignItems: "center", gap: "0.3rem", marginBottom: "1.5rem" }}>
        ← Back to feed
      </Link>

      {/* Episode header */}
      <div style={{ display: "flex", gap: "1.25rem", marginBottom: "1.5rem" }}>
        {episode.imageUrl ? (
          <img src={episode.imageUrl} alt={decodeEntities(episode.title)}
            style={{ width: 100, height: 100, borderRadius: "12px", objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{
            width: 100, height: 100, borderRadius: "12px", flexShrink: 0,
            background: "var(--color-border)", display: "flex",
            alignItems: "center", justifyContent: "center", fontSize: "2rem"
          }}>🎙️</div>
        )}
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", lineHeight: 1.3, marginBottom: "0.4rem" }}>
            {decodeEntities(episode.title)}
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
            {decodeEntities(episode.podcastTitle)}
            {episode.duration ? ` · ${formatDuration(episode.duration)}` : ""}
            {episode.publishedAt ? ` · ${formatDate(episode.publishedAt)}` : ""}
          </p>
          {episode.isFirstParty && (
            <span style={{
              display: "inline-block", marginTop: "0.4rem",
              fontSize: "0.72rem", padding: "0.2rem 0.5rem", borderRadius: "4px",
              background: "rgba(245,158,11,0.15)", color: "var(--color-accent)",
              border: "1px solid rgba(245,158,11,0.3)"
            }}>🎙️ Host</span>
          )}
        </div>
      </div>

      {/* Audio Player */}
      {(episode.audioUrl || episode.episodeUrl) && (
        <AudioPlayer
          audioUrl={episode.audioUrl}
          episodeUrl={episode.episodeUrl}
          title={decodeEntities(episode.title)}
        />
      )}

      {/* Description — HTML stripped */}
      {cleanDescription && (
        <div style={{
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: "12px", padding: "1.25rem", marginBottom: "1.5rem",
          fontSize: "0.9rem", lineHeight: 1.7, color: "var(--color-text-muted)"
        }}>
          {cleanDescription}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <button onClick={handleLike} disabled={!user}
          style={{
            display: "flex", alignItems: "center", gap: "0.4rem",
            padding: "0.5rem 1rem", borderRadius: "8px",
            background: liked ? "rgba(245,158,11,0.15)" : "var(--color-surface)",
            border: `1px solid ${liked ? "var(--color-accent)" : "var(--color-border)"}`,
            color: liked ? "var(--color-accent)" : "var(--color-text-muted)",
            cursor: user ? "pointer" : "default", fontSize: "0.875rem"
          }}>
          {liked ? "♥" : "♡"} {likeCount} {liked ? "Liked!" : "Like"}
        </button>

        <button onClick={handleFavorite} disabled={!user}
          style={{
            display: "flex", alignItems: "center", gap: "0.4rem",
            padding: "0.5rem 1rem", borderRadius: "8px",
            background: favorited ? "rgba(245,158,11,0.15)" : "var(--color-surface)",
            border: `1px solid ${favorited ? "var(--color-accent)" : "var(--color-border)"}`,
            color: favorited ? "var(--color-accent)" : "var(--color-text-muted)",
            cursor: user ? "pointer" : "default", fontSize: "0.875rem"
          }}>
          {favorited ? "★" : "☆"} {favoriteCount} {favorited ? "Saved!" : "Favorite"}
        </button>

        <button onClick={() => setShowShare(true)}
          style={{
            display: "flex", alignItems: "center", gap: "0.4rem",
            padding: "0.5rem 1rem", borderRadius: "8px",
            background: "var(--color-surface)", border: "1px solid var(--color-border)",
            color: "var(--color-text-muted)", cursor: "pointer", fontSize: "0.875rem"
          }}>
          Share ↗
        </button>

        <button onClick={() => setShowWhy(true)} className="why-chip" style={{ alignSelf: "center" }}>
          🧠 Why recommended?
        </button>

        {user && (
          <button onClick={handleQueue}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              padding: "0.5rem 1rem", borderRadius: "8px",
              background: queued ? "rgba(245,158,11,0.15)" : "var(--color-surface)",
              border: `1px solid ${queued ? "var(--color-accent)" : "var(--color-border)"}`,
              color: queued ? "var(--color-accent)" : "var(--color-text-muted)",
              cursor: "pointer", fontSize: "0.875rem"
            }}>
            🎧 {queued ? "In Queue ✓" : "Add to Queue"}
          </button>
        )}

        {user && (
          <button onClick={handleFlag}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              padding: "0.5rem 1rem", borderRadius: "8px",
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
              cursor: "pointer", fontSize: "0.875rem"
            }}>
            🚩 Flag
          </button>
        )}

        {profile?.role === "admin" && (
          <button onClick={handleFeature}
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              padding: "0.5rem 1rem", borderRadius: "8px",
              background: featured ? "rgba(245,158,11,0.15)" : "var(--color-surface)",
              border: `1px solid ${featured ? "var(--color-accent)" : "var(--color-border)"}`,
              color: featured ? "var(--color-accent)" : "var(--color-text-muted)",
              cursor: "pointer", fontSize: "0.875rem"
            }}>
            {featured ? "⭐ Admin Pick ✓" : "☆ Feature as Admin Pick"}
          </button>
        )}
      </div>

      {/* Topics */}
      {episode.topics?.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.4rem" }}>Topics:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {episode.topics.map(t => (
              <span key={t} style={{
                fontSize: "0.75rem", padding: "0.25rem 0.6rem", borderRadius: "999px",
                background: "rgba(245,158,11,0.08)", color: "var(--color-accent)",
                border: "1px solid rgba(245,158,11,0.2)"
              }}>{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* Comments */}
      <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1.5rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", marginBottom: "1rem" }}>
          💬 Comments ({episode.commentCount || 0})
        </h2>

        {user ? (
          <div style={{ marginBottom: "1.25rem" }}>
            <textarea
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Share your thoughts about this episode..."
              rows={3}
              style={{ marginBottom: "0.5rem" }}
            />
            <button onClick={handleComment} disabled={submitting || !commentText.trim()}
              className="btn-primary"
              style={{ opacity: (!commentText.trim() || submitting) ? 0.5 : 1 }}>
              {submitting ? "Posting..." : "Post comment"}
            </button>
            {profile?.role === "new" && (
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.4rem" }}>
                Your comment will be reviewed before appearing publicly.
              </p>
            )}
          </div>
        ) : (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "1rem" }}>
            <Link to="/login" style={{ color: "var(--color-accent)" }}>Sign in</Link> to leave a comment.
          </p>
        )}

        {comments.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
            No comments yet. Be the first!
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {comments.map(c => (
              <div key={c.id} style={{
                background: "var(--color-surface)", border: "1px solid var(--color-border)",
                borderRadius: "10px", padding: "0.875rem"
              }}>
                <p style={{ fontSize: "0.8rem", color: "var(--color-accent)", marginBottom: "0.3rem", fontWeight: 600 }}>
                  @{c.username}
                </p>
                <p style={{ fontSize: "0.875rem", lineHeight: 1.5 }}>{c.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showWhy && <WhyThisModal episode={episode} onClose={() => setShowWhy(false)} />}
      {showShare && <ShareSheet episode={episode} onClose={() => setShowShare(false)} />}
    </div>
  );
}
