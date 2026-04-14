import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import EpisodeCard from "../components/EpisodeCard";

const FIRST_PARTY_META = {
  "edtech-situation-room": {
    title: "EdTech Situation Room",
    podcastTitle: "EdTech Situation Room by Jason Neiffer and Wes Fryer",
    description: "Where technology news meets educational analysis. Dr. Jason Neiffer and Dr. Wes Fryer discuss the week's technology news through an educational lens, focusing on AI and media literacy.",
    artwork: "/images/edtechsr-1500.jpg",
    website: "https://edtechsr.com",
    rssUrl: "https://edtechsr.com/feed/mp3/",
    hosts: "Dr. Jason Neiffer & Dr. Wes Fryer",
  },
  "wes-and-shelly-share": {
    title: "Wes & Shelly Share",
    podcastTitle: "Wes and Shelly Share",
    description: "Wes and Shelly Fryer share about outdoor adventures, healthy life habits, parenting and marriage, navigating the opportunities and challenges of the empty nest.",
    artwork: "/images/wsshare-showart.jpg",
    website: "https://www.shellyfryer.com/podcast/",
    rssUrl: "https://anchor.fm/s/da045d3c/podcast/rss",
    hosts: "Wes & Shelly Fryer",
  },
  "speed-of-creativity": {
    title: "Moving at the Speed of Creativity",
    podcastTitle: "Moving at the Speed of Creativity Podcasts",
    description: "Podcasts focusing on digital creativity, media literacy, digital citizenship, instructional technology integration and engaged learning both inside and outside the classroom.",
    artwork: "https://d3dthqtvwic6y7.cloudfront.net/podcast-covers/000/035/555/medium/moving-at-the-speed-of-creativity-podcasts.jpg",
    website: "https://www.speedofcreativity.org",
    rssUrl: "https://anchor.fm/s/speedofcreativity/podcast/rss",
    hosts: "Dr. Wes Fryer",
  },
  "heal-our-culture": {
    title: "Heal Our Culture",
    podcastTitle: "Heal Our Culture",
    description: "Culture healers, not culture warriors. Wes Fryer seeks to amplify and share the voices of culture healers in our communities, nations and world.",
    artwork: "https://substackcdn.com/image/fetch/w_300,h_300,c_fill,f_auto,q_auto:best/https%3A%2F%2Fsubstack-post-media.s3.amazonaws.com%2Fpublic%2Fimages%2F777ba2db-5eaa-4e01-bfb4-0d58c47d3f4a_1280x1280.png",
    website: "https://healourculture.org",
    rssUrl: "https://healourculture.substack.com/podcast",
    hosts: "Dr. Wes Fryer",
  },
  "resist-and-heal": {
    title: "Resist & Heal",
    podcastTitle: "Resist and Heal",
    description: "Building community, sharing trusted voices, and encouraging each other to take specific actions to heal personally and resist cooperatively.",
    artwork: "/images/resist-and-heal.jpg",
    website: "https://resistandheal.com",
    rssUrl: "https://resistandheal.substack.com/podcast",
    hosts: "Dr. Wes Fryer",
  },
};

export default function Show() {
  const { slug } = useParams();
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const meta = FIRST_PARTY_META[slug];

  useEffect(() => {
    fetchEpisodes();
  }, [slug]);

  const fetchEpisodes = async () => {
    setLoading(true);
    try {
      // Query by firstPartySlug — no composite index needed
      const q = query(
        collection(db, "episodes"),
        where("firstPartySlug", "==", slug),
        limit(500)
      );
      const snap = await getDocs(q);
      const eps = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Sort client-side by publishedAt descending
      eps.sort((a, b) => {
        const dateA = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(a.publishedAt || 0);
        const dateB = b.publishedAt?.toDate ? b.publishedAt.toDate() : new Date(b.publishedAt || 0);
        return dateB - dateA;
      });

      setEpisodes(eps.filter(e => e.visibility !== "hidden" && e.visibility !== "removed"));
    } catch (err) {
      console.error("Show fetch error:", err);
      setEpisodes([]);
    }
    setLoading(false);
  };

  const showMeta = meta || {
    title: slug,
    description: "",
    artwork: null,
    website: null,
    hosts: "Wes Fryer",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      <Link to="/" style={{
        color: "var(--color-text-muted)", fontSize: "0.85rem",
        display: "inline-flex", alignItems: "center", gap: "0.3rem", marginBottom: "1.5rem"
      }}>
        ← Back to feed
      </Link>

      {/* Show header */}
      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "2rem", alignItems: "flex-start" }}>
        {showMeta.artwork ? (
          <img src={showMeta.artwork} alt={showMeta.title}
            style={{ width: 120, height: 120, borderRadius: "12px", objectFit: "cover",
              flexShrink: 0, border: "2px solid var(--color-border)" }} />
        ) : (
          <div style={{
            width: 120, height: 120, borderRadius: "12px", flexShrink: 0,
            background: "var(--color-border)", display: "flex",
            alignItems: "center", justifyContent: "center", fontSize: "2.5rem"
          }}>🎙️</div>
        )}

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", lineHeight: 1.2 }}>
              {showMeta.title}
            </h1>
            <span style={{
              fontSize: "0.72rem", padding: "0.2rem 0.5rem", borderRadius: "4px",
              background: "rgba(245,158,11,0.15)", color: "var(--color-accent)",
              border: "1px solid rgba(245,158,11,0.3)", flexShrink: 0
            }}>🎙️ Host</span>
          </div>

          <p style={{ fontSize: "0.85rem", color: "var(--color-accent)", marginBottom: "0.5rem", fontWeight: 500 }}>
            {showMeta.hosts}
          </p>

          <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", lineHeight: 1.6, marginBottom: "1rem" }}>
            {showMeta.description}
          </p>

          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            {showMeta.website && (
              <a href={showMeta.website} target="_blank" rel="noopener noreferrer"
                className="btn-ghost" style={{ fontSize: "0.8rem", padding: "0.35rem 0.85rem", textDecoration: "none" }}>
                🌐 Website
              </a>
            )}
            {showMeta.rssUrl && (
              <a href={showMeta.rssUrl} target="_blank" rel="noopener noreferrer"
                className="btn-ghost" style={{ fontSize: "0.8rem", padding: "0.35rem 0.85rem", textDecoration: "none" }}>
                📡 RSS Feed
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Episode list */}
      <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "1.5rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", marginBottom: "1rem" }}>
          Episodes {!loading && `(${episodes.length})`}
        </h2>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
            Loading episodes...
          </div>
        ) : episodes.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "3rem", color: "var(--color-text-muted)",
            border: "1px dashed var(--color-border)", borderRadius: "12px"
          }}>
            <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🎙️</p>
            <p style={{ fontWeight: 600, marginBottom: "0.4rem" }}>No episodes imported yet</p>
            <p style={{ fontSize: "0.85rem" }}>Episodes will appear here once the RSS feed is polled.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {episodes.map(ep => (
              <EpisodeCard key={ep.id} episode={ep} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
