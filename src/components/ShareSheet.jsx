export default function ShareSheet({ episode, onClose }) {
  const episodeUrl = `${window.location.origin}/episode/${episode.id}`;
  const shareText = `🎙️ ${episode.title}\n${episode.podcastTitle}\n\n${episodeUrl}\n\n#podcommons #podcasts`;
  const blueskyText = encodeURIComponent(shareText.slice(0, 300));
  const mastodonText = encodeURIComponent(shareText.slice(0, 300));

  const copyLink = () => {
    navigator.clipboard.writeText(episodeUrl);
    alert("Link copied!");
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      zIndex: 1000, padding: "1rem"
    }} onClick={onClose}>
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: "16px", padding: "1.5rem", maxWidth: 480, width: "100%"
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1rem" }}>Share this episode</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer" }}>✕</button>
        </div>

        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
          {episode.title}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <a href={`https://bsky.app/intent/compose?text=${blueskyText}`} target="_blank" rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: "0.75rem",
              padding: "0.75rem 1rem", borderRadius: "10px",
              background: "rgba(0,133,255,0.1)", border: "1px solid rgba(0,133,255,0.2)",
              color: "var(--color-text)", textDecoration: "none", fontSize: "0.875rem", fontWeight: 500
            }}>
            <span style={{ fontSize: "1.2rem" }}>🦋</span> Share on Bluesky
          </a>

          <a href={`https://mastodon.social/share?text=${mastodonText}`} target="_blank" rel="noopener noreferrer"
            style={{
              display: "flex", alignItems: "center", gap: "0.75rem",
              padding: "0.75rem 1rem", borderRadius: "10px",
              background: "rgba(99,100,255,0.1)", border: "1px solid rgba(99,100,255,0.2)",
              color: "var(--color-text)", textDecoration: "none", fontSize: "0.875rem", fontWeight: 500
            }}>
            <span style={{ fontSize: "1.2rem" }}>🐘</span> Share on Mastodon
          </a>

          <button onClick={copyLink}
            style={{
              display: "flex", alignItems: "center", gap: "0.75rem",
              padding: "0.75rem 1rem", borderRadius: "10px",
              background: "var(--color-border)", border: "1px solid var(--color-border)",
              color: "var(--color-text)", cursor: "pointer", fontSize: "0.875rem", fontWeight: 500,
              width: "100%"
            }}>
            <span style={{ fontSize: "1.2rem" }}>🔗</span> Copy link
          </button>
        </div>

        <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginTop: "0.75rem", textAlign: "center" }}>
          All shares include <strong>#podcommons</strong>
        </p>
      </div>
    </div>
  );
}
