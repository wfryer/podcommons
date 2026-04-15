import { useAuth } from "../hooks/useAuth.jsx";
import { decodeEntities } from "../utils/textUtils";

export default function ShareSheet({ episode, onClose }) {
  const { profile } = useAuth();
  const title = decodeEntities(episode?.title || "");
  const url = `https://podcasts.wesfryer.com/episode/${episode?.id}`;
  const text = `🎙️ "${title}" — ${url} #podcommons`;

  // Use user's Mastodon server if set, otherwise prompt them to set it
  const mastodonServer = profile?.mastodonServer;
  const mastodonHandle = profile?.mastodonHandle;

  const shareToBluesky = () => {
    window.open(`https://bsky.app/intent/compose?text=${encodeURIComponent(text)}`, "_blank");
    onClose();
  };

  const shareToMastodon = () => {
    if (mastodonServer) {
      window.open(`https://${mastodonServer}/share?text=${encodeURIComponent(text)}`, "_blank");
    } else {
      // Prompt for server if not set
      const server = window.prompt(
        "Enter your Mastodon server (e.g. mastodon.social, triangletoot.party):\n\nTip: Save your server in your profile settings to skip this step next time!"
      );
      if (server) {
        window.open(`https://${server.trim()}/share?text=${encodeURIComponent(text)}`, "_blank");
      }
    }
    onClose();
  };

  const copyLink = () => {
    navigator.clipboard.writeText(url);
    onClose();
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      zIndex: 1000, padding: "1rem"
    }} onClick={onClose}>
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: "16px", padding: "1.5rem", width: "100%", maxWidth: 480,
      }} onClick={e => e.stopPropagation()}>

        <p style={{ fontWeight: 600, fontFamily: "var(--font-display)", marginBottom: "0.25rem" }}>
          Share this episode
        </p>
        <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", marginBottom: "1.25rem",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {title}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <button onClick={shareToBluesky}
            style={{ display: "flex", alignItems: "center", gap: "0.75rem",
              padding: "0.75rem 1rem", borderRadius: "10px",
              background: "rgba(0,133,255,0.1)", border: "1px solid rgba(0,133,255,0.3)",
              color: "#0085ff", cursor: "pointer", fontSize: "0.9rem", fontWeight: 500 }}>
            🦋 Share on Bluesky
          </button>

          <button onClick={shareToMastodon}
            style={{ display: "flex", alignItems: "center", gap: "0.75rem",
              padding: "0.75rem 1rem", borderRadius: "10px",
              background: "rgba(99,100,255,0.1)", border: "1px solid rgba(99,100,255,0.3)",
              color: "#6364ff", cursor: "pointer", fontSize: "0.9rem", fontWeight: 500 }}>
            🐘 Share on Mastodon
            {mastodonServer && (
              <span style={{ fontSize: "0.72rem", opacity: 0.7, marginLeft: "auto" }}>
                via {mastodonServer}
              </span>
            )}
          </button>

          <button onClick={copyLink}
            style={{ display: "flex", alignItems: "center", gap: "0.75rem",
              padding: "0.75rem 1rem", borderRadius: "10px",
              background: "var(--color-bg)", border: "1px solid var(--color-border)",
              color: "var(--color-text-muted)", cursor: "pointer", fontSize: "0.9rem" }}>
            🔗 Copy link
          </button>
        </div>

        {!mastodonServer && profile && (
          <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "0.75rem", textAlign: "center" }}>
            💡 <a href="/settings" style={{ color: "var(--color-accent)" }}>Set your Mastodon server</a> in profile settings to skip the prompt
          </p>
        )}

        <button onClick={onClose}
          style={{ width: "100%", marginTop: "0.75rem", padding: "0.6rem",
            background: "none", border: "1px solid var(--color-border)",
            borderRadius: "10px", color: "var(--color-text-muted)",
            cursor: "pointer", fontSize: "0.85rem" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}
