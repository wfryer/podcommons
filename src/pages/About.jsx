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
    likes: null, pinboard: null, mastodon: null,
  });

  useEffect(() => { fetchStats(); }, []);

  const fetchStats = async () => {
    try {
      const [podSnap, epSnap, userSnap, likeSnap, pinSnap, mastSnap] = await Promise.all([
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
        likes: likeSnap.size,
        pinboard: pinSnap.size,
        mastodon: mastSnap.size,
      });
    } catch (err) { console.error("Stats fetch error:", err); }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem",
          color: "var(--color-accent)", marginBottom: "0.5rem" }}>
          🎙️ PodCommons
        </h1>
        <p style={{ fontSize: "1.1rem", color: "var(--color-text-muted)", fontStyle: "italic" }}>
          Listen together. Understand the algorithm. Amplify what matters.
        </p>
      </div>

      {/* Live Stats */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap",
        marginBottom: "3rem", justifyContent: "center" }}>
        <StatCard icon="🎙️" value={stats.podcasts} label="Podcasts" />
        <StatCard icon="📻" value={stats.episodes} label="Episodes" />
        <StatCard icon="👥" value={stats.users} label="Members" />
        <StatCard icon="♥" value={stats.likes} label="Likes" />
        <StatCard icon="📌" value={stats.pinboard} label="Pinboard picks" />
        <StatCard icon="🐘" value={stats.mastodon} label="Mastodon picks" />
      </div>

      {/* What is PodCommons */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: "16px", padding: "2rem", marginBottom: "2rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", marginBottom: "1rem" }}>
          What is PodCommons?
        </h2>
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8, marginBottom: "1rem" }}>
          PodCommons is a community podcast discovery engine built around a radical idea:
          you should be able to <strong style={{ color: "var(--color-text)" }}>see and adjust the algorithm</strong> that
          shapes your feed. Most podcast apps hide their recommendation logic. PodCommons does the opposite.
        </p>
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8, marginBottom: "1rem" }}>
          Every episode is analyzed by AI (Google Gemini Flash) at import time — assigned topic tags
          and a relevance score against the curator's taste profile. The Discover feed uses these signals
          alongside your listening history, community engagement, and recency. Three sliders let you
          tune the algorithm in real time. Every recommended episode shows a <strong style={{ color: "var(--color-text)" }}>"Why this?"</strong> chip
          with a visual breakdown of exactly which signals surfaced it.
        </p>
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8 }}>
          This is both a functional podcast platform and a <strong style={{ color: "var(--color-text)" }}>living media literacy artifact</strong> —
          designed to model what it looks like to have genuine agency over algorithmic systems.
        </p>
      </div>

      {/* Video placeholder */}
      <div style={{ background: "var(--color-surface)", border: "2px dashed var(--color-border)",
        borderRadius: "16px", padding: "3rem 2rem", marginBottom: "2rem", textAlign: "center" }}>
        <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🎬</p>
        <p style={{ fontWeight: 600, marginBottom: "0.4rem" }}>Video introduction coming soon</p>
        <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
          Wes will record a short overview of PodCommons and embed it here.
        </p>
      </div>

      {/* Features */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: "16px", padding: "2rem", marginBottom: "2rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", marginBottom: "1.25rem" }}>
          What PodCommons Can Do
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
          {[
            { icon: "🧠", title: "AI-Powered Discovery", desc: "Every episode analyzed by Gemini Flash — topic tags, taste scores, and relevance reasons assigned at import time" },
            { icon: "⚙️", title: "Tunable Algorithm", desc: "Three sliders adjust Discovery vs. Familiar, Recent vs. Timeless, and My Taste vs. Community in real time" },
            { icon: "🔍", title: "Why This?", desc: "Every episode card shows exactly which signals surfaced it — history match, topic match, community score, recency" },
            { icon: "📡", title: "RSS + OPML Import", desc: "Import your entire podcast subscription list via OPML. Automatic RSS polling every 4 hours keeps episodes fresh" },
            { icon: "🎧", title: "Listening Queue", desc: "Add episodes to your personal queue from any card or detail page. Access your queue from your profile" },
            { icon: "🏷️", title: "Topic Filtering", desc: "Filter the feed by topic — AI & Technology, Democracy & Civic, Education, Faith, History, and more" },
            { icon: "👥", title: "Community Features", desc: "Like, favorite, comment, and queue episodes. Community engagement feeds back into the algorithm" },
            { icon: "🐘", title: "Open Web", desc: "Share to Mastodon (your server) and Bluesky. Import from Pinboard and Mastodon. Built on RSS and open standards" },
            { icon: "🎙️", title: "Host Showcase", desc: "First-party shows get their own pages with full episode archives, artwork, and RSS/website links" },
            { icon: "🛡️", title: "Moderation", desc: "Three-tier trust system. Flagging queue. Admin dashboard with feed management, user roles, and error logs" },
            { icon: "👤", title: "Member Profiles", desc: "Public profiles with activity feeds, favorites, listening queues, and podcast suggestion forms" },
            { icon: "🔒", title: "Privacy Controls", desc: "Set your profile to Public, Members Only, or Private. Your data is yours" },
          ].map(f => (
            <div key={f.title}>
              <p style={{ fontSize: "1.25rem", marginBottom: "0.3rem" }}>{f.icon}</p>
              <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.25rem" }}>{f.title}</p>
              <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Algorithm */}
      <div id="algorithm" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: "16px", padding: "2rem", marginBottom: "2rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", marginBottom: "1rem" }}>
          How the Algorithm Works
        </h2>
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8, marginBottom: "1rem" }}>
          The Discover feed ranks episodes using five weighted signals, all adjustable via the Feed Settings sliders:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
          {[
            { icon: "🤖", label: "AI Taste Score", desc: "Gemini Flash analyzes each episode's title and description against the curator's taste profile. Scored 0–1 at import time." },
            { icon: "📚", label: "Listening History Match", desc: "How closely the show matches the curator's Pocket Casts listening history across 90+ entries." },
            { icon: "🕐", label: "Recency", desc: "Configurable decay — 14-day aggressive (Recent slider) to 180-day gentle (Timeless slider)." },
            { icon: "🔥", label: "Community Engagement", desc: "Normalized likes, favorites, and comments from community members." },
            { icon: "🎙️", label: "First-Party & Featured Boost", desc: "Episodes from the host's own shows get a relevance boost. Admin-featured episodes get an additional bump." },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", gap: "0.75rem" }}>
              <span style={{ fontSize: "1.2rem", flexShrink: 0 }}>{s.icon}</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.1rem" }}>{s.label}</p>
                <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", lineHeight: 1.7 }}>
          Click the <strong style={{ color: "var(--color-accent)" }}>🧠 chip</strong> on any episode card
          to see the exact breakdown for that episode. Use <strong style={{ color: "var(--color-accent)" }}>Feed Settings</strong> to
          adjust the weights — settings are saved to your profile.
        </p>
      </div>

      {/* Coming Soon */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: "16px", padding: "2rem", marginBottom: "2rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", marginBottom: "1rem" }}>
          Coming Soon
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
          {[
            "PodCommons RSS output feeds",
            "Per-user personalized taste profiles",
            "Data export (OPML, activity, LLM-ready)",
            "Podcast + episode search",
            "Mobile app (iOS + Android)",
            "Email digest",
            "Embeddable episode widget",
            "Native Bluesky AT Protocol posting",
            "Listening progress tracking",
            "Community group sub-feeds",
          ].map(item => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ color: "var(--color-accent)", fontSize: "0.8rem" }}>◦</span>
              <span style={{ fontSize: "0.82rem", color: "var(--color-text-muted)" }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Open Web */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: "16px", padding: "2rem", marginBottom: "2rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", marginBottom: "1rem" }}>
          Open Web Values
        </h2>
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8, marginBottom: "1rem" }}>
          PodCommons is built on and celebrates open standards — RSS, OPML, Mastodon, Bluesky, and Pinboard.
          It both consumes and produces RSS feeds, so your curation is never locked inside a platform.
          This is a direct expression of the <strong style={{ color: "var(--color-text)" }}>#OwnYourFeed</strong> philosophy.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {["/feed.xml", "/feed/admin-picks.xml", "/feed/community.xml"].map(f => (
            <a key={f} href={f} style={{ fontSize: "0.8rem", color: "var(--color-accent)",
              textDecoration: "none", border: "1px solid rgba(245,158,11,0.3)",
              padding: "0.3rem 0.75rem", borderRadius: "6px" }}>
              📡 {f}
            </a>
          ))}
        </div>
      </div>

      {/* Built by */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: "16px", padding: "2rem", marginBottom: "2rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", marginBottom: "1rem" }}>
          Built by Wes Fryer
        </h2>
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8, marginBottom: "1rem" }}>
          PodCommons was created by{" "}
          <a href="https://wesfryer.com" target="_blank" rel="noopener noreferrer"
            style={{ color: "var(--color-accent)" }}>Dr. Wesley Fryer</a>,
          a middle school STEM and media literacy teacher at Providence Day School in Charlotte, NC.
          Wes is affiliated faculty with the Media Education Lab, hosts five podcasts including the{" "}
          <a href="https://edtechsr.com" target="_blank" rel="noopener noreferrer"
            style={{ color: "var(--color-accent)" }}>EdTech Situation Room</a>,
          and facilitates monthly national webinars on AI literacy.
        </p>
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8, marginBottom: "1rem" }}>
          PodCommons was built in April 2026 through collaborative vibe-coding sessions with Claude AI.
          It is open source under the MIT License.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          {[
            { label: "🌐 wesfryer.com", href: "https://wesfryer.com" },
            { label: "🤖 ai.wesfryer.com", href: "https://ai.wesfryer.com" },
            { label: "💻 GitHub", href: "https://github.com/wfryer/podcommons" },
            { label: "🐘 Mastodon", href: "https://triangletoot.party/@wesfryer" },
          ].map(l => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer"
              className="btn-ghost" style={{ fontSize: "0.85rem", padding: "0.4rem 1rem", textDecoration: "none" }}>
              {l.label}
            </a>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <p style={{ color: "var(--color-text-muted)", marginBottom: "1rem" }}>
          Share PodCommons with <strong style={{ color: "var(--color-accent)" }}>#podcommons</strong>
        </p>
        <Link to="/" className="btn-primary"
          style={{ textDecoration: "none", padding: "0.75rem 2rem", fontSize: "1rem" }}>
          ← Back to the feed
        </Link>
      </div>
    </div>
  );
}
