import { useState } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth.jsx";
import { Link } from "react-router-dom";

export default function Suggest() {
  const { user, profile } = useAuth();
  const [type, setType] = useState("podcast");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) { setError("Please include a URL."); return; }
    setSubmitting(true);
    setError("");
    try {
      await addDoc(collection(db, "podcastSuggestions"), {
        type,
        title: title.trim() || url.trim(),
        url: url.trim(),
        reason: reason.trim(),
        suggestedBy: user?.uid || "anonymous",
        suggestedByUsername: profile?.username || "anonymous",
        status: "pending",
        createdAt: Timestamp.now(),
      });
      setSubmitted(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16" style={{ textAlign: "center" }}>
        <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎉</p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem",
          color: "var(--color-accent)", marginBottom: "0.75rem" }}>
          Thanks for the suggestion!
        </h1>
        <p style={{ color: "var(--color-text-muted)", marginBottom: "2rem", lineHeight: 1.7 }}>
          Your suggestion has been submitted for review. If approved, the podcast will be
          added to PodCommons and the episode will be featured in the Community feed.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <button onClick={() => { setSubmitted(false); setUrl(""); setTitle(""); setReason(""); }}
            className="btn-ghost" style={{ padding: "0.6rem 1.5rem" }}>
            Suggest another
          </button>
          <Link to="/" className="btn-primary" style={{ textDecoration: "none", padding: "0.6rem 1.5rem" }}>
            Back to feed
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link to="/" style={{ color: "var(--color-text-muted)", fontSize: "0.85rem",
        display: "inline-flex", alignItems: "center", gap: "0.3rem", marginBottom: "1.5rem" }}>
        ← Back to feed
      </Link>

      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2rem",
        color: "var(--color-accent)", marginBottom: "0.5rem" }}>
        💡 Suggest a Podcast
      </h1>
      <p style={{ color: "var(--color-text-muted)", lineHeight: 1.7, marginBottom: "2rem" }}>
        Know a podcast or episode that belongs in PodCommons? Share it here and
        Wes will review it. Approved suggestions get added to the catalog and
        featured in the Community feed!
      </p>

      {!user && (
        <div style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
          borderRadius: "10px", padding: "1rem", marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--color-accent)" }}>
            You can suggest without signing in, but{" "}
            <Link to="/login" style={{ color: "var(--color-accent)", fontWeight: 600 }}>
              signing in
            </Link>
            {" "}lets Wes follow up with you if needed.
          </p>
        </div>
      )}

      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: "16px", padding: "2rem" }}>

        {/* Type toggle */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginBottom: "0.5rem", fontWeight: 600 }}>
            What are you suggesting?
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            {[
              { id: "podcast", label: "🎙️ A podcast to add" },
              { id: "episode", label: "📻 A specific episode" },
            ].map(t => (
              <button key={t.id} onClick={() => setType(t.id)}
                style={{
                  padding: "0.5rem 1rem", borderRadius: "8px", cursor: "pointer",
                  border: `1px solid ${type === t.id ? "var(--color-accent)" : "var(--color-border)"}`,
                  background: type === t.id ? "rgba(245,158,11,0.1)" : "none",
                  color: type === t.id ? "var(--color-accent)" : "var(--color-text-muted)",
                  fontSize: "0.85rem", fontWeight: type === t.id ? 600 : 400,
                }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* URL */}
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600,
              marginBottom: "0.4rem", color: "var(--color-text-muted)" }}>
              {type === "podcast" ? "RSS Feed or Podcast Website URL *" : "Episode URL *"}
            </label>
            <input value={url} onChange={e => setUrl(e.target.value)}
              placeholder={type === "podcast"
                ? "https://example.com/feed.xml or https://podcasts.apple.com/..."
                : "https://example.com/episodes/episode-name"}
              required style={{ width: "100%", fontSize: "0.9rem" }} />
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.3rem" }}>
              {type === "podcast"
                ? "RSS feed URL preferred, but any podcast page link works"
                : "Link to the specific episode page or audio file"}
            </p>
          </div>

          {/* Title */}
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600,
              marginBottom: "0.4rem", color: "var(--color-text-muted)" }}>
              {type === "podcast" ? "Podcast Name" : "Episode Title"}{" "}
              <span style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder={type === "podcast" ? "e.g. On the Media" : "e.g. How AI is changing journalism"}
              style={{ width: "100%", fontSize: "0.9rem" }} />
          </div>

          {/* Reason */}
          <div>
            <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600,
              marginBottom: "0.4rem", color: "var(--color-text-muted)" }}>
              Why should this be in PodCommons?{" "}
              <span style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea value={reason} onChange={e => setReason(e.target.value)}
              placeholder="What makes this podcast or episode worth adding?"
              rows={3} style={{ width: "100%", fontSize: "0.9rem" }} />
          </div>

          {error && (
            <p style={{ fontSize: "0.85rem", color: "#f87171" }}>{error}</p>
          )}

          <button type="submit" className="btn-primary" disabled={submitting || !url.trim()}
            style={{ opacity: submitting || !url.trim() ? 0.6 : 1, padding: "0.75rem" }}>
            {submitting ? "Submitting..." : "Submit Suggestion →"}
          </button>
        </form>
      </div>

      <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", textAlign: "center", marginTop: "1.5rem" }}>
        All suggestions are reviewed by Wes before being added to PodCommons.
      </p>
    </div>
  );
}
