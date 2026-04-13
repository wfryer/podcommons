import { useState } from "react";
import { Link } from "react-router-dom";

const FIRST_PARTY_SHOWS = [
  {
    slug: "edtech-situation-room",
    title: "EdTech Situation Room",
    artworkUrl: "https://wsrv.nl/?url=https://edtechsr.com/wp-content/uploads/2015/01/edtechSR-artwork-2021-512.jpg&w=120&h=120&fit=cover",
    fallbacks: [
      "https://d3dthqtvwic6y7.cloudfront.net/podcast-covers/000/035/555/medium/moving-at-the-speed-of-creativity-podcasts.jpg",
    ],
    emoji: "🎓",
    rssUrl: "https://edtechsr.com/feed/mp3/",
  },
  {
    slug: "wes-and-shelly-share",
    title: "Wes & Shelly Share",
    artworkUrl: null,
    fallbacks: [],
    emoji: "💛",
    rssUrl: null,
  },
  {
    slug: "speed-of-creativity",
    title: "Speed of Creativity",
    artworkUrl: "https://d3dthqtvwic6y7.cloudfront.net/podcast-covers/000/035/555/medium/moving-at-the-speed-of-creativity-podcasts.jpg",
    fallbacks: [],
    emoji: "⚡",
    rssUrl: "https://anchor.fm/s/speedofcreativity/podcast/rss",
  },
  {
    slug: "heal-our-culture",
    title: "Heal Our Culture",
    artworkUrl: "https://substackcdn.com/image/fetch/w_120,h_120,c_fill,f_auto,q_auto:best/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F777ba2db-5eaa-4e01-bfb4-0d58c47d3f4a_1280x1280.png",
    fallbacks: [],
    emoji: "🌱",
    rssUrl: "https://api.substack.com/feed/podcast/2316077/private/f13d348b-326e-481d-b47a-0e8fd910c4e5.rss",
  },
  {
    slug: "resist-and-heal",
    title: "Resist & Heal",
    artworkUrl: null,
    fallbacks: [],
    emoji: "✊",
    rssUrl: "https://api.substack.com/feed/podcast/2986841/private/07af6bfa-69b5-4035-aac5-201d2ad57d1b.rss",
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
          padding: "0.5rem", textAlign: "center", transition: "border-color 0.2s, transform 0.2s",
          cursor: "pointer",
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
          <img
            src={currentUrl}
            alt={show.title}
            onError={() => setImgIndex(i => i + 1)}
            style={{ width: 60, height: 60, borderRadius: "8px", objectFit: "cover", margin: "0 auto", display: "block" }}
          />
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

export default function WesShowsShelf() {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <p style={{
        fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.1em",
        color: "var(--color-text-muted)", textTransform: "uppercase", marginBottom: "0.6rem"
      }}>
        Wes' Podcasts
      </p>
      <div style={{ display: "flex", gap: "0.6rem", overflowX: "auto", paddingBottom: "0.5rem" }}>
        {FIRST_PARTY_SHOWS.map(show => (
          <ShowCard key={show.slug} show={show} />
        ))}
      </div>
      <div style={{ height: "1px", background: "var(--color-border)", marginTop: "1rem" }} />
    </div>
  );
}
