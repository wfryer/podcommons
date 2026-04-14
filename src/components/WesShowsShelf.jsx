import { useState } from "react";
import { Link } from "react-router-dom";

const FIRST_PARTY_SHOWS = [
  {
    slug: "edtech-situation-room",
    title: "EdTech Situation Room",
    artworkUrl: "/images/edtechsr-1500.jpg",
    fallbacks: [],
    emoji: "🎓",
  },
  {
    slug: "wes-and-shelly-share",
    title: "Wes & Shelly Share",
    artworkUrl: "/images/wsshare-showart.jpg",
    fallbacks: [],
    emoji: "💛",
  },
  {
    slug: "speed-of-creativity",
    title: "Speed of Creativity",
    artworkUrl: "https://d3dthqtvwic6y7.cloudfront.net/podcast-covers/000/035/555/medium/moving-at-the-speed-of-creativity-podcasts.jpg",
    fallbacks: [],
    emoji: "⚡",
  },
  {
    slug: "heal-our-culture",
    title: "Heal Our Culture",
    artworkUrl: "https://substackcdn.com/image/fetch/w_120,h_120,c_fill,f_auto,q_auto:best/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F777ba2db-5eaa-4e01-bfb4-0d58c47d3f4a_1280x1280.png",
    fallbacks: [],
    emoji: "🌱",
  },
  {
    slug: "resist-and-heal",
    title: "Resist & Heal",
    artworkUrl: "/images/resist-and-heal.jpg",
    fallbacks: [],
    emoji: "✊",
  },
];

function colorFromString(str) {
  const colors = ["#92400e", "#065f46", "#1e3a5f", "#4c1d95", "#7f1d1d", "#064e3b"];
  let hash = 0;
  for (let i = 0; i < (str || "").length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function ShowCard({ show }) {
  const [imgIndex, setImgIndex] = useState(0);
  const allUrls = [show.artworkUrl, ...show.fallbacks].filter(Boolean);
  const currentUrl = allUrls[imgIndex];
  const showPlaceholder = !currentUrl || imgIndex >= allUrls.length;

  return (
    <Link to={`/show/${show.slug}`} style={{ flexShrink: 0, textDecoration: "none" }}>
      <div
        style={{
          width: 90, background: "var(--color-surface)",
          border: "1px solid var(--color-border)", borderRadius: "10px",
          padding: "0.5rem", textAlign: "center",
          transition: "border-color 0.2s, transform 0.2s", cursor: "pointer",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = "var(--color-accent)";
          e.currentTarget.style.transform = "translateY(-2px)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = "var(--color-border)";
          e.currentTarget.style.transform = "translateY(0)";
        }}>
        {!showPlaceholder ? (
          <img src={currentUrl} alt={show.title}
            onError={() => setImgIndex(i => i + 1)}
            style={{ width: 60, height: 60, borderRadius: "8px", objectFit: "cover", margin: "0 auto", display: "block" }} />
        ) : (
          <div style={{
            width: 60, height: 60, borderRadius: "8px",
            background: colorFromString(show.title),
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.6rem", margin: "0 auto"
          }}>{show.emoji}</div>
        )}
        <p style={{
          fontSize: "0.62rem", color: "var(--color-text-muted)",
          marginTop: "0.4rem", lineHeight: 1.2,
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden"
        }}>{show.title}</p>
      </div>
    </Link>
  );
}

export default function WesShowsShelf({ visible, onToggle }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      {/* Header with toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
        <p style={{
          fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em",
          color: "var(--color-text-muted)", textTransform: "uppercase", margin: 0
        }}>
          Wes' Podcasts
        </p>
        <button onClick={onToggle} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: "0.7rem", color: "var(--color-text-muted)",
          padding: "0.1rem 0.4rem"
        }}>
          {visible ? "▲ hide" : "▼ show"}
        </button>
      </div>

      {/* Collapsible shelf */}
      {visible && (
        <div style={{ display: "flex", gap: "0.6rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
          {FIRST_PARTY_SHOWS.map(show => (
            <ShowCard key={show.slug} show={show} />
          ))}
        </div>
      )}

      <div style={{ height: "1px", background: "var(--color-border)", marginTop: visible ? "1rem" : "0.5rem" }} />
    </div>
  );
}