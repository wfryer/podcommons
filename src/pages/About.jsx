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
        {value === null ? "..." : value === 0 ? "0" : value.toLocaleString()}
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
    const safe = async (fn) => { try { return await fn(); } catch { return null; } };
    const [podSnap, epSnap, userSnap, likeSnap, pinSnap, mastSnap] = await Promise.all([
      safe(() => getDocs(collection(db, "podcasts"))),
      safe(() => getDocs(collection(db, "episodes"))),
      safe(() => getDocs(collection(db, "users"))),
      safe(() => getDocs(query(collection(db, "interactions"), where("type", "==", "like")))),
      safe(() => getDocs(query(collection(db, "episodes"), where("source", "==", "pinboard")))),
      safe(() => getDocs(query(collection(db, "episodes"), where("source", "==", "mastodon")))),
    ]);
    setStats({
      podcasts: podSnap?.size ?? 0,
      episodes: epSnap?.size ?? 0,
      users: userSnap?.size ?? 0,
      likes: likeSnap?.size ?? 0,
      pinboard: pinSnap?.size ?? 0,
      mastodon: mastSnap?.size ?? 0,
    });
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
          PodCommons is a community podcast discovery engine with three interlocking purposes:
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem", marginBottom: "1.25rem" }}>
          {[
            { icon: "🎧", title: "Personal discovery", desc: "Help Wes (and eventually every member) better discover podcasts of genuine interest — with direct, transparent control over the algorithm rather than surrendering to a black box." },
            { icon: "📡", title: "Curated sharing", desc: "Share the podcasts Wes listens to and enjoys, serving as a trusted human filter for others. Building on the Discovering Good Ideas project (wfryer.me/ideas) and Reclaiming Our News Feeds (wiki.wesfryer.com) — but for podcast feeds!" },
            { icon: "🌐", title: "Open web advocacy", desc: "Model what it looks like to reclaim your media diet from algorithmic platforms. PodCommons is built on RSS, OPML, Mastodon, Bluesky, and Pinboard — the open, federated, interoperable web." },
          ].map(p => (
            <div key={p.title} style={{ display: "flex", gap: "0.875rem",
              background: "var(--color-bg)", borderRadius: "10px", padding: "0.875rem" }}>
              <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>{p.icon}</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.25rem" }}>{p.title}</p>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", lineHeight: 1.6 }}>{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8, marginBottom: "1rem" }}>
          Every episode is analyzed by AI (Google Gemini 2.5 Flash) at import time — assigned topic tags
          and a relevance score against the curator's taste profile. The Discover feed uses these signals
          alongside listening history, community engagement, and recency. Three sliders let you
          tune the algorithm in real time. Every recommended episode shows a <strong style={{ color: "var(--color-text)" }}>"Why this?"</strong> chip
          with a visual breakdown of exactly which signals surfaced it.
        </p>
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8 }}>
          This is both a functional podcast platform and a <strong style={{ color: "var(--color-text)" }}>living media literacy artifact</strong> —
          designed to model what genuine agency over algorithmic systems looks like in practice.
        </p>
      </div>

      {/* Video Introduction */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: "16px", padding: "2rem", marginBottom: "2rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", marginBottom: "1rem" }}>
          🎬 Video Introduction
        </h2>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
          Wes gives an overview of PodCommons — what it is, why he built it, and how it works.
        </p>
        <div style={{
          position: "relative", paddingBottom: "56.25%", height: 0, overflow: "hidden",
          borderRadius: "10px", background: "var(--color-bg)"
        }}>
          <iframe
            src="https://www.youtube.com/embed/o-IsBZzpGkc?si=8e3mGbhTdqkf8qdW"
            title="PodCommons Introduction by Wes Fryer"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", borderRadius: "10px" }}
          />
        </div>
      </div>

      {/* Features */}
      <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: "16px", padding: "2rem", marginBottom: "2rem" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", marginBottom: "1.25rem" }}>
          What PodCommons Can Do
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
          {[
            { icon: "🧠", title: "AI-Powered Discovery", desc: "Every episode analyzed by Gemini 2.5 Flash — topic tags, taste scores, and relevance reasons assigned at import time. 3,700+ episodes already tagged." },
            { icon: "⚙️", title: "Tunable Algorithm", desc: "Three sliders adjust Discovery vs. Familiar, Recent vs. Timeless, and My Taste vs. Community in real time. Settings saved to your profile." },
            { icon: "🔍", title: "Why This?", desc: "Every episode card shows exactly which signals surfaced it — history match, topic match, community score, recency." },
            { icon: "🔎", title: "Search", desc: "Search across 3,700+ episodes and 400+ podcasts by title, show name, or description. Click any podcast to preview its recent episodes." },
            { icon: "📡", title: "RSS + OPML Import", desc: "Import your entire podcast subscription list via OPML. Automatic RSS polling every 4 hours keeps episodes fresh." },
            { icon: "🎧", title: "Listening Queue", desc: "Episodes auto-add to your queue when you press play. Access your queue from your profile. Remove completed episodes with one tap." },
            { icon: "▶️", title: "Resume Playback", desc: "Position saved every 10 seconds. Resume from where you left off — offers to resume or start over when you return." },
            { icon: "🏷️", title: "Topic Filtering", desc: "Filter the feed by topic — AI & Technology, Democracy & Civic, Education, Faith, History, and 15 more categories." },
            { icon: "👥", title: "Community Features", desc: "Like, favorite, comment, and queue episodes. Suggest podcasts for the curator to add. Community engagement feeds back into the algorithm." },
            { icon: "🐘", title: "Open Web", desc: "Share to Mastodon (your server) and Bluesky. Import from Pinboard and Mastodon. Built on RSS and open standards." },
            { icon: "🎙️", title: "Host Showcase", desc: "First-party shows get their own pages with full episode archives, artwork, and RSS/website links." },
            { icon: "🛡️", title: "Moderation", desc: "Three-tier trust system. Flagging queue with episode details. Admin dashboard with feed management, user roles, and error logs." },
            { icon: "👤", title: "Member Profiles", desc: "Public profiles with activity feeds, favorites, listening queues, and podcast suggestion forms." },
            { icon: "🔒", title: "Privacy Controls", desc: "Set your profile to Public, Members Only, or Private. Your data is yours." },
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
            { icon: "🤖", label: "AI Taste Score", desc: "Gemini 2.5 Flash analyzes each episode's title and description against the curator's taste profile. Scored 0–1 at import time." },
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
            "Top 10 favorite podcasts per member",
            "Data export (OPML, activity, LLM-ready)",
            "Mobile app (iOS + Android)",
            "Email digest",
            "Embeddable episode widget",
            "Native Bluesky AT Protocol posting",
            "Cross-device resume playback",
            "Community group sub-feeds",
            "Active discussions feed",
            "Error feed dashboard for admins",
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
          This is a direct expression of the <strong style={{ color: "var(--color-text)" }}>#OwnYourFeed</strong> philosophy
          and Wes's broader advocacy for the <strong style={{ color: "var(--color-text)" }}>Fediverse</strong> and
          open source / open standards social media platforms.
        </p>
        <p style={{ color: "var(--color-text-muted)", lineHeight: 1.8, marginBottom: "1rem" }}>
          When major platforms change their algorithms, terms of service, or ownership, your podcast
          subscriptions and listening history shouldn't be held hostage. RSS has always been the
          answer — PodCommons makes that answer beautiful, social, and algorithmically transparent.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {[
            { label: "🌱 Discovering Good Ideas", href: "https://wfryer.me/ideas" },
            { label: "📰 Reclaiming Our News Feeds", href: "https://wiki.wesfryer.com/Home/thrive2026" },
          ].map(l => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer"
              className="btn-ghost" style={{ fontSize: "0.85rem", padding: "0.4rem 1rem", textDecoration: "none" }}>
              {l.label}
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
          PodCommons was built in April–May 2026 through collaborative vibe-coding sessions with Claude AI.
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
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
          <Link to="/" className="btn-primary"
            style={{ textDecoration: "none", padding: "0.75rem 2rem", fontSize: "1rem" }}>
            ← Back to the feed
          </Link>
          <Link to="/search"
            style={{ textDecoration: "none", padding: "0.75rem 2rem", fontSize: "1rem",
              border: "1px solid var(--color-border)", borderRadius: "8px",
              color: "var(--color-text-muted)" }}>
            🔍 Search episodes
          </Link>
        </div>
        <p style={{ color: "var(--color-text-muted)" }}>
          Share PodCommons with <strong style={{ color: "var(--color-accent)" }}>#podcommons</strong>
        </p>
      </div>
    </div>
  );
}
