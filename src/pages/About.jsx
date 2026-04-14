import { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { Link } from "react-router-dom";

function StatCard({ icon, value, label }) {
  return (
    <div style={{
      background: "var(--color-surface)", border: "1px solid var(--color-border)",
      borderRadius: "12px", padding: "1.25rem", textAlign: "center", flex: 1, minWidth: 120
    }}>
      <div style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>{icon}</div>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", color: "var(--color-accent)", fontWeight: 700 }}>
        {value === null ? "..." : value.toLocaleString()}
      </div>
      <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>{label}</div>
    </div>
  );
}

export default function About() {
  const [stats, setStats] = useState({
    podcasts: null, episodes: null, users: null,
    likes: null, comments: null, pinboard: null, mastodon: null,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [podSnap, epSnap, userSnap, interSnap, pinSnap, mastSnap] = await Promise.all([
        getDocs(collection(db, "podcasts")),
        getDocs(collection(db, "episodes")),
        getDocs(collection(db, "users")),
        getDocs(query(collection(db, "interactions"), where("type", "==", "like"))),
        getDocs(query(collection(db, "episodes"), where("source", "==", "pinboard"))),
        getDocs(query(collection(db, "episodes"), where("source", "==", "mastodon"))),
      ]);

      setStats({
        podcasts: podSnap.size,
        episodes: epSnap.size,
        users: userSnap.size,
        likes: interSnap.size,
        pinboard: pinSnap.size,
        mastodon: mastSnap.size,
      });
    } catch (err) {
      console.error("Stats fetch error:", err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", color: "var(--color-accent)", marginBottom: "0.5rem" }}>
          🎙️ PodCommons
        </h1>
        <p style={{ fontSize: "1.1rem", color: "var(--color-text-muted)", fontStyle: "italic" }}>
          Listen together. Understand the algorithm. Amplify what matters.
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "3rem", justifyContent: "center" }}>
        <StatCard icon="🎙️" value={stats.podcasts} label="Podcasts" />
        <StatCard icon="📻" value={stats.episodes} label="Episodes" />
        <StatCard icon="👥" value={stats.users} label="Members" />
        <StatCard icon="♥" value={stats.likes} label="Likes" />
        <StatCard icon="📌" value={stats.pinboard} label="Pinboard picks" />
        <StatCard icon="🐘" value={stats.mastodon} label="Mastodon picks" />
      </div>

      {/* About */}
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: "16px", padding: "2rem", marginBottom: "2rem"
      }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", marginBottom: "1rem" }}>
          What is PodCommons?
        </h2>
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8, marginBottom: "1rem" }}>
          PodCommons is a community podcast discovery engine built around a radical idea:
          you should be able to <strong style={{ color: "var(--color-text)" }}>see and adjust the algorithm</strong> that
          shapes your feed. Most podcast apps hide their recommendation logic. PodCommons does the opposite.
        </p>
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8, marginBottom: "1rem" }}>
          Every recommended episode shows exactly which signals surfaced it — your listening history,
          topic matches, community engagement, and recency — with a visual breakdown you can tap to explore.
          Three sliders let you tune the algorithm in real time: Discovery vs. Familiar,
          Recent vs. Timeless, and My Taste vs. Community.
        </p>
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8 }}>
          This is both a functional podcast platform and a <strong style={{ color: "var(--color-text)" }}>living media literacy artifact</strong> —
          designed to model what it looks like to have genuine agency over algorithmic systems.
        </p>
      </div>

      {/* Video placeholder */}
      <div style={{
        background: "var(--color-surface)", border: "2px dashed var(--color-border)",
        borderRadius: "16px", padding: "3rem 2rem", marginBottom: "2rem", textAlign: "center"
      }}>
        <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎬</p>
        <p style={{ fontWeight: 600, marginBottom: "0.4rem" }}>Video introduction coming soon</p>
        <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
          Wes will record a short overview of PodCommons and embed it here.
        </p>
      </div>

      {/* Open Web Values */}
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: "16px", padding: "2rem", marginBottom: "2rem"
      }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", marginBottom: "1rem" }}>
          Open Web Values
        </h2>
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8, marginBottom: "1rem" }}>
          PodCommons is built on and celebrates open standards — RSS, OPML, Mastodon, Bluesky, and Pinboard.
          It both consumes and produces RSS feeds, so your curation is never locked inside a platform.
          Your recommendations travel with you into any feed reader, aggregator, or automation tool
          that speaks RSS.
        </p>
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8 }}>
          This is a direct expression of the <strong style={{ color: "var(--color-text)" }}>#OwnYourFeed</strong> philosophy.
          Subscribe to PodCommons via RSS:
        </p>
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap" }}>
          <a href="/feed.xml" style={{ fontSize: "0.8rem", color: "var(--color-accent)", textDecoration: "none",
            border: "1px solid rgba(245,158,11,0.3)", padding: "0.3rem 0.75rem", borderRadius: "6px" }}>
            📡 Discovery Feed
          </a>
          <a href="/feed/wes-picks.xml" style={{ fontSize: "0.8rem", color: "var(--color-accent)", textDecoration: "none",
            border: "1px solid rgba(245,158,11,0.3)", padding: "0.3rem 0.75rem", borderRadius: "6px" }}>
            📡 Admin Picks Feed
          </a>
          <a href="/feed/community.xml" style={{ fontSize: "0.8rem", color: "var(--color-accent)", textDecoration: "none",
            border: "1px solid rgba(245,158,11,0.3)", padding: "0.3rem 0.75rem", borderRadius: "6px" }}>
            📡 Community Feed
          </a>
        </div>
      </div>

      {/* Built by */}
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: "16px", padding: "2rem", marginBottom: "2rem"
      }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", marginBottom: "1rem" }}>
          Built by Wes Fryer
        </h2>
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8, marginBottom: "1rem" }}>
          PodCommons was created by <a href="https://wesfryer.com" target="_blank" rel="noopener noreferrer"
            style={{ color: "var(--color-accent)" }}>Dr. Wesley Fryer</a>, a middle school STEM and media literacy
          teacher at Providence Day School in Charlotte, NC. Wes is an affiliated faculty member with the
          Media Education Lab and hosts five podcasts including the
          <a href="https://edtechsr.com" target="_blank" rel="noopener noreferrer"
            style={{ color: "var(--color-accent)" }}> EdTech Situation Room</a>.
        </p>
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8, marginBottom: "1rem" }}>
          PodCommons was built in April 2026 through a collaborative vibe-coding session with Claude AI.
          It is open source under the MIT License.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <a href="https://wesfryer.com" target="_blank" rel="noopener noreferrer"
            className="btn-ghost" style={{ fontSize: "0.85rem", padding: "0.4rem 1rem", textDecoration: "none" }}>
            🌐 wesfryer.com
          </a>
          <a href="https://ai.wesfryer.com" target="_blank" rel="noopener noreferrer"
            className="btn-ghost" style={{ fontSize: "0.85rem", padding: "0.4rem 1rem", textDecoration: "none" }}>
            🤖 ai.wesfryer.com
          </a>
          <a href="https://github.com/wfryer/podcommons" target="_blank" rel="noopener noreferrer"
            className="btn-ghost" style={{ fontSize: "0.85rem", padding: "0.4rem 1rem", textDecoration: "none" }}>
            💻 GitHub
          </a>
          <a href="https://triangletoot.party/@wesfryer" target="_blank" rel="noopener noreferrer"
            className="btn-ghost" style={{ fontSize: "0.85rem", padding: "0.4rem 1rem", textDecoration: "none" }}>
            🐘 Mastodon
          </a>
        </div>
      </div>

      {/* Algorithm section */}
      <div id="algorithm" style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: "16px", padding: "2rem", marginBottom: "2rem"
      }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", marginBottom: "1rem" }}>
          How the Algorithm Works
        </h2>
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8, marginBottom: "1rem" }}>
          The Discover feed ranks episodes using five weighted signals:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {[
            { icon: "🧠", label: "Listening history match", desc: "How closely the show matches Wes's Pocket Casts listening history" },
            { icon: "🏷️", label: "Topic match", desc: "How well the episode's topics align with known taste clusters (AI, education, democracy, media literacy, faith, history)" },
            { icon: "🕐", label: "Recency", desc: "How recently the episode was published — decays over 60 days" },
            { icon: "🔥", label: "Community engagement", desc: "Normalized likes, favorites, and comments from community members" },
            { icon: "🎙️", label: "First-party boost", desc: "Episodes from Wes's own five shows get a relevance boost" },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
              <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{s.icon}</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.1rem" }}>{s.label}</p>
                <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8, marginTop: "1rem", fontSize: "0.875rem" }}>
          You can adjust the weights of these signals using the Feed Settings sliders on the home page.
          Click the <strong style={{ color: "var(--color-accent)" }}>🧠 chip</strong> on any episode card
          to see exactly which signals surfaced that specific episode.
        </p>
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <p style={{ color: "var(--color-text-muted)", marginBottom: "1rem" }}>
          Share PodCommons with the hashtag <strong style={{ color: "var(--color-accent)" }}>#podcommons</strong>
        </p>
        <Link to="/" className="btn-primary" style={{ textDecoration: "none", padding: "0.75rem 2rem", fontSize: "1rem" }}>
          ← Back to the feed
        </Link>
      </div>
    </div>
  );
}
