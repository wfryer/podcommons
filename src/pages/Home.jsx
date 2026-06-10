import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth.jsx";
import { rankEpisodes, DISCOVER_MODES, DEFAULT_MODE } from "../utils/algorithmScorer";
import EpisodeCard from "../components/EpisodeCard";
import WesShowsShelf from "../components/WesShowsShelf";
import TopicFilter from "../components/TopicFilter";
import SliderPanel from "../components/SliderPanel";

const TABS = [
  { id: "discover", label: "🧠 Discover" },
  { id: "latest", label: "🕐 Latest" },
  { id: "adminpicks", label: "⭐ Admin Picks" },
  { id: "community", label: "🔥 Community" },
  { id: "discussions", label: "💬 Discussions" },
];

const TAB_DESCRIPTIONS = {
  discover: null, // dynamic — set by active mode
  latest: "Chronological feed — no algorithm, just the newest episodes first",
  adminpicks: "Episodes from Wes's own shows and admin-featured picks",
  community: "Most liked and favorited episodes by the PodCommons community",
  discussions: "Episodes with active community comments — join the conversation",
};

export default function Home() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("discover");
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shelfVisible, setShelfVisible] = useState(true);
  const [showSliders, setShowSliders] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [discoverMode, setDiscoverMode] = useState(DEFAULT_MODE);
  const [sliders, setSliders] = useState(
    DISCOVER_MODES.find(m => m.id === DEFAULT_MODE).sliders
  );

  useEffect(() => { fetchEpisodes(); }, [activeTab, selectedTopic, discoverMode]);
  useEffect(() => {
    if (activeTab === "discover" && episodes.length > 0) fetchEpisodes();
  }, [sliders]);

  const fetchEpisodes = async () => {
    setLoading(true);
    try {
      let eps = [];

      if (selectedTopic) {
        // Use Firestore array-contains to search ALL episodes by topic
        const snap = await getDocs(query(
          collection(db, "episodes"),
          where("topics", "array-contains", selectedTopic),
          orderBy("publishedAt", "desc"),
          limit(50)
        ));
        eps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        eps = eps.filter(e => e.visibility !== "hidden" && e.visibility !== "removed");

        // Apply tab-specific sorting
        if (activeTab === "discover") {
          eps = await rankEpisodes(eps, sliders, user?.uid || "admin");
        } else if (activeTab === "community") {
          eps = eps.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
        } else if (activeTab === "adminpicks") {
          eps = eps.filter(e => e.featuredByAdmin === true);
        }

      } else if (activeTab === "latest") {
        const snap = await getDocs(query(collection(db, "episodes"), orderBy("publishedAt", "desc"), limit(30)));
        eps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        eps = eps.filter(e => e.visibility !== "hidden" && e.visibility !== "removed");

      } else if (activeTab === "adminpicks") {
        const snap = await getDocs(query(
          collection(db, "episodes"),
          where("featuredByAdmin", "==", true),
          orderBy("publishedAt", "desc"),
          limit(50)
        ));
        eps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        eps = eps.filter(e => e.visibility !== "hidden" && e.visibility !== "removed");

      } else if (activeTab === "community") {
        const snap = await getDocs(query(collection(db, "episodes"), orderBy("likeCount", "desc"), limit(30)));
        eps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        eps = eps.filter(e => e.visibility !== "hidden" && e.visibility !== "removed");

      } else {
        // Discover — mode-driven ranking
        const snap = await getDocs(query(collection(db, "episodes"), orderBy("publishedAt", "desc"), limit(200)));
        eps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        eps = eps.filter(e => e.visibility !== "hidden" && e.visibility !== "removed");
        if (discoverMode === "latest") {
          // Pure chronological — already sorted by publishedAt desc
          eps = eps.slice(0, 30);
        } else if (discoverMode === "community_pulse") {
          // Sort purely by community engagement
          eps = eps.sort((a, b) => {
            const scoreA = (a.likeCount || 0) * 3 + (a.favoriteCount || 0) * 4 + (a.commentCount || 0) * 5;
            const scoreB = (b.likeCount || 0) * 3 + (b.favoriteCount || 0) * 4 + (b.commentCount || 0) * 5;
            return scoreB - scoreA;
          }).slice(0, 30);
        } else {
          // curators_taste and surprise_me use the scorer with mode-specific sliders
          const modeSliders = DISCOVER_MODES.find(m => m.id === discoverMode)?.sliders || sliders;
          eps = await rankEpisodes(eps, modeSliders, user?.uid || "admin");
          eps = eps.slice(0, 30);
        }
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
      const snap = await getDocs(query(collection(db, "episodes"), orderBy("publishedAt", "desc"), limit(200)));
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(e => e.visibility !== "hidden" && e.visibility !== "removed");
      const random = all[Math.floor(Math.random() * all.length)];
      if (random) window.location.href = `/episode/${random.id}`;
    } catch (err) { console.error(err); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">

      <WesShowsShelf visible={shelfVisible} onToggle={() => setShelfVisible(v => !v)} />

      {/* Feed Tabs + Lucky Button */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`feed-tab ${activeTab === tab.id ? "active" : ""}`}>
            {tab.label}
          </button>
        ))}

        <button onClick={handleLucky}
          title="Show me a random episode!"
          style={{
            fontSize: "0.8rem", padding: "0.4rem 0.75rem", borderRadius: "8px",
            border: "1px solid var(--color-border)",
            background: "none", cursor: "pointer",
            color: "var(--color-text-muted)",
          }}>
          🎲 Lucky
        </button>
      </div>

      {/* Discover Mode Pills — only shown on Discover tab */}
      {activeTab === "discover" && (
        <div style={{ marginBottom: "0.75rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            {DISCOVER_MODES.map(mode => (
              <button key={mode.id}
                onClick={() => {
                  setDiscoverMode(mode.id);
                  setSliders(mode.sliders);
                }}
                style={{
                  fontSize: "0.8rem", padding: "0.4rem 0.9rem", borderRadius: "20px",
                  border: `1px solid ${discoverMode === mode.id ? "var(--color-accent)" : "var(--color-border)"}`,
                  background: discoverMode === mode.id ? "rgba(245,158,11,0.15)" : "none",
                  color: discoverMode === mode.id ? "var(--color-accent)" : "var(--color-text-muted)",
                  cursor: "pointer", fontWeight: discoverMode === mode.id ? 600 : 400,
                  transition: "all 0.15s ease",
                }}>
                {mode.icon} {mode.label}
              </button>
            ))}
            <button onClick={() => setShowSliders(!showSliders)}
              style={{
                marginLeft: "auto", fontSize: "0.75rem", padding: "0.4rem 0.75rem",
                borderRadius: "8px", border: "1px solid var(--color-border)",
                color: showSliders ? "var(--color-accent)" : "var(--color-text-muted)",
                background: "none", cursor: "pointer"
              }}>
              ⚙️ Advanced {showSliders ? "▲" : "▼"}
            </button>
          </div>
        </div>
      )}

      <TopicFilter selected={selectedTopic} onSelect={(t) => { setSelectedTopic(t); }} />

      {showSliders && <SliderPanel sliders={sliders} setSliders={setSliders} activeTab={activeTab} onApply={fetchEpisodes} onClose={() => setShowSliders(false)} />}

      <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
        {activeTab === "discover"
          ? DISCOVER_MODES.find(m => m.id === discoverMode)?.desc
          : TAB_DESCRIPTIONS[activeTab]}
      </p>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
          {activeTab === "discover" ? "Building your personalized feed..." : "Loading episodes..."}
        </div>
      ) : episodes.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "4rem 2rem", color: "var(--color-text-muted)",
          border: "1px dashed var(--color-border)", borderRadius: "12px", marginTop: "1rem"
        }}>
          <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🎙️</p>
          <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>No episodes here yet</p>
          <p style={{ fontSize: "0.85rem" }}>
            {activeTab === "adminpicks" ? "Feature episodes using the ⭐ button on any episode card or episode page."
              : activeTab === "community" ? "Like some episodes to get the community feed going!"
              : selectedTopic
              ? `No episodes tagged "${selectedTopic}" yet — AI tagging is still running overnight!`
              : "Import your OPML file in the Admin dashboard to start pulling in podcast episodes."}
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
            {episodes.length} episode{episodes.length !== 1 ? "s" : ""}
            {selectedTopic && ` tagged "${selectedTopic}"`}
            {activeTab === "discover" && !selectedTopic && (
              ` · ${DISCOVER_MODES.find(m => m.id === discoverMode)?.icon} ${DISCOVER_MODES.find(m => m.id === discoverMode)?.label}`
            )}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {episodes.map(ep => <EpisodeCard key={ep.id} episode={ep} />)}
          </div>
        </>
      )}
    </div>
  );
}
