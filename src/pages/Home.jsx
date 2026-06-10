import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth.jsx";
import { rankEpisodes, DISCOVER_MODES, DEFAULT_MODE } from "../utils/algorithmScorer";
import EpisodeCard from "../components/EpisodeCard";
import WesShowsShelf from "../components/WesShowsShelf";
import TopicFilter from "../components/TopicFilter";
import SliderPanel from "../components/SliderPanel";

export default function Home() {
  const { user } = useAuth();
  const [mode, setMode] = useState(DEFAULT_MODE);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shelfVisible, setShelfVisible] = useState(true);
  const [showSliders, setShowSliders] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [sliders, setSliders] = useState(
    DISCOVER_MODES.find(m => m.id === "recommended").sliders
  );

  useEffect(() => { fetchEpisodes(); }, [mode, selectedTopic]);
  useEffect(() => {
    if (mode === "recommended") fetchEpisodes();
  }, [sliders]);

  const fetchEpisodes = async () => {
    setLoading(true);
    try {
      let eps = [];

      // ── Topic filter overrides mode sorting ──────────────────────────────
      if (selectedTopic) {
        const snap = await getDocs(query(
          collection(db, "episodes"),
          where("topics", "array-contains", selectedTopic),
          orderBy("publishedAt", "desc"),
          limit(50)
        ));
        eps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        eps = eps.filter(e => e.visibility !== "hidden" && e.visibility !== "removed");
        if (mode === "recommended") {
          eps = await rankEpisodes(eps, sliders, user?.uid || "admin", "recommended");
        } else if (mode === "buzzing") {
          eps = eps.sort((a, b) => {
            const sA = (a.likeCount||0)*3 + (a.favoriteCount||0)*4 + (a.commentCount||0)*5;
            const sB = (b.likeCount||0)*3 + (b.favoriteCount||0)*4 + (b.commentCount||0)*5;
            return sB - sA;
          });
        } else if (mode === "picks") {
          eps = eps.filter(e => e.featuredByAdmin === true);
        } else if (mode === "talking") {
          eps = eps.filter(e => (e.commentCount || 0) > 0)
            .sort((a, b) => (b.commentCount || 0) - (a.commentCount || 0));
        }
        // fresh and wander just use publishedAt desc (already sorted)
        setEpisodes(eps);
        setLoading(false);
        return;
      }

      // ── Mode-specific fetches ─────────────────────────────────────────────
      if (mode === "fresh") {
        const snap = await getDocs(query(
          collection(db, "episodes"),
          orderBy("publishedAt", "desc"),
          limit(30)
        ));
        eps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        eps = eps.filter(e => e.visibility !== "hidden" && e.visibility !== "removed");

      } else if (mode === "picks") {
        const snap = await getDocs(query(
          collection(db, "episodes"),
          where("featuredByAdmin", "==", true),
          orderBy("publishedAt", "desc"),
          limit(50)
        ));
        eps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        eps = eps.filter(e => e.visibility !== "hidden" && e.visibility !== "removed");

      } else if (mode === "talking") {
        // Get recent episodes and filter to those with comments
        const snap = await getDocs(query(
          collection(db, "episodes"),
          orderBy("commentCount", "desc"),
          limit(50)
        ));
        eps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        eps = eps.filter(e =>
          e.visibility !== "hidden" &&
          e.visibility !== "removed" &&
          (e.commentCount || 0) > 0
        );

      } else if (mode === "buzzing") {
        const snap = await getDocs(query(
          collection(db, "episodes"),
          orderBy("likeCount", "desc"),
          limit(100)
        ));
        eps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        eps = eps.filter(e => e.visibility !== "hidden" && e.visibility !== "removed");
        // Re-sort by combined engagement score
        eps = eps.sort((a, b) => {
          const sA = (a.likeCount||0)*3 + (a.favoriteCount||0)*4 + (a.commentCount||0)*5;
          const sB = (b.likeCount||0)*3 + (b.favoriteCount||0)*4 + (b.commentCount||0)*5;
          return sB - sA;
        }).slice(0, 30);

      } else {
        // recommended + wander — both use the scorer, with different sliders
        const snap = await getDocs(query(
          collection(db, "episodes"),
          orderBy("publishedAt", "desc"),
          limit(300)
        ));
        eps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        eps = eps.filter(e => e.visibility !== "hidden" && e.visibility !== "removed");
        const modeConfig = DISCOVER_MODES.find(m => m.id === mode);
        const activeSliders = mode === "recommended" ? sliders : modeConfig.sliders;
        eps = await rankEpisodes(eps, activeSliders, user?.uid || "admin", mode);
        eps = eps.slice(0, 30);
      }

      setEpisodes(eps);
    } catch (err) {
      console.error("Feed fetch error:", err);
      try {
        const snap = await getDocs(query(collection(db, "episodes"), orderBy("publishedAt", "desc"), limit(30)));
        setEpisodes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) { setEpisodes([]); }
    }
    setLoading(false);
  };

  const handleLucky = async () => {
    try {
      const snap = await getDocs(query(collection(db, "episodes"), orderBy("publishedAt", "desc"), limit(300)));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(e => e.visibility !== "hidden" && e.visibility !== "removed");
      const random = all[Math.floor(Math.random() * all.length)];
      if (random) window.location.href = `/episode/${random.id}`;
    } catch (err) { console.error(err); }
  };

  const activeMode = DISCOVER_MODES.find(m => m.id === mode);

  const emptyMessage = {
    picks: "Feature episodes using the ⭐ button on any episode card or episode page.",
    talking: "No episodes have comments yet — be the first to start a conversation!",
    buzzing: "Like some episodes to get the community feed going!",
    wander: "Couldn't find unexpected episodes — try clearing your topic filter.",
    recommended: "No episodes found — try adjusting your feed settings.",
    fresh: "No episodes yet — check back soon!",
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">

      <WesShowsShelf visible={shelfVisible} onToggle={() => setShelfVisible(v => !v)} />

      {/* Mode Pills */}
      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        {DISCOVER_MODES.map(m => (
          <button key={m.id}
            onClick={() => { setMode(m.id); setShowSliders(false); }}
            style={{
              fontSize: "0.82rem", padding: "0.4rem 0.9rem", borderRadius: "20px",
              border: `1px solid ${mode === m.id ? "var(--color-accent)" : "var(--color-border)"}`,
              background: mode === m.id ? "rgba(245,158,11,0.15)" : "none",
              color: mode === m.id ? "var(--color-accent)" : "var(--color-text-muted)",
              cursor: "pointer", fontWeight: mode === m.id ? 600 : 400,
              transition: "all 0.15s ease",
            }}>
            {m.icon} {m.label}
          </button>
        ))}

        {/* Lucky — sits with the other pills */}
        <button onClick={handleLucky} title="Take me to a random episode!"
          style={{
            fontSize: "0.82rem", padding: "0.4rem 0.9rem",
            borderRadius: "20px", border: "1px solid var(--color-border)",
            background: "none", cursor: "pointer", color: "var(--color-text-muted)",
          }}>
          🎲 Lucky
        </button>
      </div>

      {/* Advanced toggle — only for Recommended, on its own line */}
      {mode === "recommended" && (
        <div style={{ marginBottom: "0.5rem" }}>
          <button onClick={() => setShowSliders(!showSliders)}
            style={{
              fontSize: "0.75rem", padding: "0.3rem 0.75rem", borderRadius: "8px",
              border: "1px solid var(--color-border)",
              color: showSliders ? "var(--color-accent)" : "var(--color-text-muted)",
              background: "none", cursor: "pointer",
            }}>
            ⚙️ Fine-tune Recommended {showSliders ? "▲" : "▼"}
          </button>
        </div>
      )}

      {/* Topic Filter */}
      <TopicFilter selected={selectedTopic} onSelect={setSelectedTopic} />

      {/* Slider Panel — Recommended only */}
      {showSliders && mode === "recommended" && (
        <SliderPanel
          sliders={sliders}
          setSliders={setSliders}
          onApply={fetchEpisodes}
          onClose={() => setShowSliders(false)}
        />
      )}

      {/* Mode description */}
      <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
        {selectedTopic
          ? `Showing episodes tagged "${selectedTopic}" · ${activeMode.icon} ${activeMode.label}`
          : activeMode.desc}
      </p>

      {/* Episode list */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
          {mode === "recommended" || mode === "wander" ? "Building your feed..." : "Loading episodes..."}
        </div>
      ) : episodes.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "4rem 2rem", color: "var(--color-text-muted)",
          border: "1px dashed var(--color-border)", borderRadius: "12px", marginTop: "1rem"
        }}>
          <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{activeMode.icon}</p>
          <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Nothing here yet</p>
          <p style={{ fontSize: "0.85rem" }}>{emptyMessage[mode]}</p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
            {episodes.length} episode{episodes.length !== 1 ? "s" : ""}
            {selectedTopic && ` tagged "${selectedTopic}"`}
            {` · ${activeMode.icon} ${activeMode.label}`}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {episodes.map(ep => <EpisodeCard key={ep.id} episode={ep} />)}
          </div>
        </>
      )}
    </div>
  );
}
