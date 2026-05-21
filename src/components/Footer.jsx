import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer style={{
      borderTop: "1px solid var(--color-border)",
      marginTop: "4rem", padding: "2rem 1rem",
      textAlign: "center",
    }}>
      <div style={{ display: "flex", gap: "1.5rem", justifyContent: "center",
        flexWrap: "wrap", marginBottom: "1rem" }}>
        <Link to="/about" style={{ color: "var(--color-text-muted)", fontSize: "0.82rem", textDecoration: "none" }}>
          About
        </Link>
        <Link to="/search" style={{ color: "var(--color-text-muted)", fontSize: "0.82rem", textDecoration: "none" }}>
          🔍 Search
        </Link>
        <Link to="/suggest" style={{ color: "var(--color-text-muted)", fontSize: "0.82rem", textDecoration: "none" }}>
          💡 Suggest
        </Link>
        <a href="https://github.com/wfryer/podcommons" target="_blank" rel="noopener noreferrer"
          style={{ color: "var(--color-text-muted)", fontSize: "0.82rem", textDecoration: "none" }}>
          💻 GitHub
        </a>
        <a href="https://triangletoot.party/@wesfryer" target="_blank" rel="noopener noreferrer"
          style={{ color: "var(--color-text-muted)", fontSize: "0.82rem", textDecoration: "none" }}>
          🐘 Mastodon
        </a>
        <a href="https://bsky.app/profile/wesfryer.com" target="_blank" rel="noopener noreferrer"
          style={{ color: "var(--color-text-muted)", fontSize: "0.82rem", textDecoration: "none" }}>
          🦋 Bluesky
        </a>
        <a href="https://edtechsr.com" target="_blank" rel="noopener noreferrer"
          style={{ color: "var(--color-text-muted)", fontSize: "0.82rem", textDecoration: "none" }}>
          🎙️ EdTechSR
        </a>
      </div>
      <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
        PodCommons · Open source · MIT License ·{" "}
        <strong style={{ color: "var(--color-accent)" }}>#podcommons</strong>
      </p>
    </footer>
  );
}
