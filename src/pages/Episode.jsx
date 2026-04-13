import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { doc, getDoc, updateDoc, increment, collection, addDoc, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth.jsx";
import WhyThisModal from "../components/WhyThisModal";
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

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function Episode() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const [episode, setEpisode] = useState(null);
  const [comments, setComments] = useState([]);
  const [liked, setLiked] = useState(false);
  const [favorited, setFavorited] = useState(false);
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
    if (snap.exists()) setEpisode({ id: snap.id, ...snap.data() });
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
    if (!user || liked) return;
    setLiked(true);
    await updateDoc(doc(db, "episodes", id), { likeCount: increment(1) });
    if (profile?.role === "new") {
      await addDoc(collection(db, "moderationQueue"), {
        userId: user.uid, episodeId: id, type: "like",
        status: "pending", createdAt: new Date(),
      });
    }
    setEpisode(prev => ({ ...prev, likeCount: (prev.likeCount || 0) + 1 }));
  };

  const handleFavorite = async () => {
    if (!user || favorited) return;
    setFavorited(true);
    await updateDoc(doc(db, "episodes", id), { favoriteCount: increment(1) });
    setEpisode(prev => ({ ...prev, favoriteCount: (prev.favoriteCount || 0) + 1 }));
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
          <img src={episode.imageUrl} alt={episode.title}
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
            {episode.title}
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
            {episode.podcastTitle}
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

      {/* Listen button */}
      {episode.episodeUrl && (
        <a href={episode.episodeUrl} target="_blank" rel="noopener noreferrer"
          className="btn-primary"
          style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem",
            marginBottom: "1.5rem", textDecoration: "none" }}>
          ▶ Listen to this episode ↗
        </a>
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
          ♥ {episode.likeCount || 0} {liked ? "Liked!" : "Like"}
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
          ★ {episode.favoriteCount || 0} {favorited ? "Saved!" : "Favorite"}
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
