import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import EpisodeCard from "../components/EpisodeCard";
import WesShowsShelf from "../components/WesShowsShelf";
import SliderPanel from "../components/SliderPanel";

const TABS = [
  { id: "discover", label: "🧠 Discover" },
  { id: "latest", label: "🕐 Latest" },
  { id: "wespicks", label: "⭐ Wes Picks" },
  { id: "community", label: "🔥 Community" },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState("discover");
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSliders, setShowSliders] = useState(false);
  const [sliders, setSliders] = useState({
    discoveryVsFamiliar: 70,
    recentVsTimeless: 60,
    myTasteVsCommunity: 50,
  });

  useEffect(() => {
    fetchEpisodes();
  }, [activeTab]);

  const fetchEpisodes = async () => {
    setLoading(true);
    try {
      // Simple queries without composite indexes for now
      let q;
      if (activeTab === "latest") {
        q = query(collection(db, "episodes"), orderBy("publishedAt", "desc"), limit(20));
      } else if (activeTab === "community") {
        q = query(collection(db, "episodes"), orderBy("likeCount", "desc"), limit(20));
      } else if (activeTab === "wespicks") {
        q = query(collection(db, "episodes"), orderBy("featuredByAdmin", "desc"), limit(20));
      } else {
        q = query(collection(db, "episodes"), orderBy("algorithmScore", "desc"), limit(20));
      }

      const snap = await getDocs(q);
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Filter out hidden/removed client-side for now
      setEpisodes(all.filter(e => e.visibility !== "hidden" && e.visibility !== "removed"));
    } catch (err) {
      console.error("Error fetching episodes:", err);
      setEpisodes([]);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <WesShowsShelf />

      {/* Feed Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`feed-tab ${activeTab === tab.id ? "active" : ""}`}>
            {tab.label}
          </button>
        ))}
        <button onClick={() => setShowSliders(!showSliders)}
          style={{
            marginLeft: "auto", fontSize: "0.8rem", padding: "0.4rem 0.75rem",
            borderRadius: "8px", border: "1px solid var(--color-border)",
            color: showSliders ? "var(--color-accent)" : "var(--color-text-muted)",
            background: "none", cursor: "pointer"
          }}>
          ⚙️ Feed Settings {showSliders ? "▲" : "▼"}
        </button>
      </div>

      {showSliders && <SliderPanel sliders={sliders} setSliders={setSliders} />}

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
          Loading episodes...
        </div>
      ) : episodes.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "4rem 2rem",
          color: "var(--color-text-muted)", border: "1px dashed var(--color-border)",
          borderRadius: "12px", marginTop: "1rem"
        }}>
          <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🎙️</p>
          <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>No episodes yet</p>
          <p style={{ fontSize: "0.85rem" }}>
            {activeTab === "wespicks"
              ? "Episodes you feature will appear here."
              : "Import your OPML file in the Admin dashboard to start pulling in podcast episodes."}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
          {episodes.map(ep => (
            <EpisodeCard key={ep.id} episode={ep} />
          ))}
        </div>
      )}
    </div>
  );
}
