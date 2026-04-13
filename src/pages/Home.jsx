import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth.jsx";
import { rankEpisodes } from "../utils/algorithmScorer";
import EpisodeCard from "../components/EpisodeCard";
import WesShowsShelf from "../components/WesShowsShelf";
import SliderPanel from "../components/SliderPanel";

const TABS = [
  { id: "discover", label: "🧠 Discover" },
  { id: "latest", label: "🕐 Latest" },
  { id: "wespicks", label: "⭐ Wes Picks" },
  { id: "community", label: "🔥 Community" },
];

const TAB_DESCRIPTIONS = {
  discover: "Ranked by Wes' listening history, topic signals, recency, and community engagement",
  latest: "Most recently published episodes across all subscriptions",
  wespicks: "Episodes from Wes's own shows and admin-featured picks",
  community: "Most liked and favorited episodes by the PodCommons community",
};

export default function Home() {
  const { user, profile } = useAuth();
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

  // Re-rank when sliders change on discover tab
  useEffect(() => {
    if (activeTab === "discover" && episodes.length > 0) {
      fetchEpisodes();
    }
  }, [sliders]);

  const fetchEpisodes = async () => {
    setLoading(true);
    try {
      let eps = [];

      if (activeTab === "latest") {
        const q = query(collection(db, "episodes"), orderBy("publishedAt", "desc"), limit(30));
        const snap = await getDocs(q);
        eps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        eps = eps.filter(e => e.visibility !== "hidden" && e.visibility !== "removed");

      } else if (activeTab === "wespicks") {
        const q = query(collection(db, "episodes"), orderBy("publishedAt", "desc"), limit(200));
        const snap = await getDocs(q);
        eps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        eps = eps.filter(e =>
          e.visibility !== "hidden" &&
          e.visibility !== "removed" &&
          (e.isFirstParty === true || e.featuredByAdmin === true)
        );

      } else if (activeTab === "community") {
        const q = query(collection(db, "episodes"), orderBy("likeCount", "desc"), limit(30));
        const snap = await getDocs(q);
        eps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        eps = eps.filter(e => e.visibility !== "hidden" && e.visibility !== "removed");

      } else {
        // DISCOVER — fetch a broad pool then rank with real algorithm
        const q = query(collection(db, "episodes"), orderBy("publishedAt", "desc"), limit(100));
        const snap = await getDocs(q);
        eps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        eps = eps.filter(e => e.visibility !== "hidden" && e.visibility !== "removed");

        // Apply real personalized ranking using listening history
        const userId = user?.uid || "admin";
        eps = await rankEpisodes(eps, sliders, userId);
        eps = eps.slice(0, 30);
      }

      setEpisodes(eps);
    } catch (err) {
      console.error("Feed fetch error:", err);
      // Fallback to recent
      try {
        const q = query(collection(db, "episodes"), orderBy("publishedAt", "desc"), limit(30));
        const snap = await getDocs(q);
        setEpisodes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        setEpisodes([]);
      }
    }
    setLoading(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <WesShowsShelf />

      {/* Feed Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`feed-tab ${activeTab === tab.id ? "active" : ""}`}>
            {tab.label}
          </button>
        ))}
        <button
          onClick={() => setShowSliders(!showSliders)}
          style={{
            marginLeft: "auto", fontSize: "0.8rem", padding: "0.4rem 0.75rem",
            borderRadius: "8px", border: "1px solid var(--color-border)",
            color: showSliders ? "var(--color-accent)" : "var(--color-text-muted)",
            background: "none", cursor: "pointer"
          }}>
          ⚙️ Feed Settings {showSliders ? "▲" : "▼"}
        </button>
      </div>

      {showSliders && (
        <SliderPanel
          sliders={sliders}
          setSliders={setSliders}
          activeTab={activeTab}
        />
      )}

      {/* Tab description */}
      <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
        {TAB_DESCRIPTIONS[activeTab]}
      </p>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
          {activeTab === "discover" ? "Building your personalized feed..." : "Loading episodes..."}
        </div>
      ) : episodes.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "4rem 2rem",
          color: "var(--color-text-muted)", border: "1px dashed var(--color-border)",
          borderRadius: "12px", marginTop: "1rem"
        }}>
          <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>🎙️</p>
          <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>No episodes here yet</p>
          <p style={{ fontSize: "0.85rem" }}>
            {activeTab === "wespicks"
              ? "Episodes from your five shows will appear here."
              : activeTab === "community"
              ? "Like some episodes to get the community feed going!"
              : "Import your OPML file in the Admin dashboard to start pulling in podcast episodes."}
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
            {episodes.length} episode{episodes.length !== 1 ? "s" : ""}
            {activeTab === "discover" && " · ranked by your taste profile"}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {episodes.map(ep => (
              <EpisodeCard key={ep.id} episode={ep} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
