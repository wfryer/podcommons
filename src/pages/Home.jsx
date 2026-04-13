import { useState, useEffect } from "react";
import { collection, query, orderBy, limit, getDocs, where } from "firebase/firestore";
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
      let snap;

      if (activeTab === "latest") {
        // Pure chronological — newest first
        const q = query(
          collection(db, "episodes"),
          orderBy("publishedAt", "desc"),
          limit(30)
        );
        snap = await getDocs(q);
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setEpisodes(all.filter(e => e.visibility !== "hidden" && e.visibility !== "removed"));

      } else if (activeTab === "wespicks") {
        // First-party (host) episodes + any admin-featured, sorted by date
        const q = query(
          collection(db, "episodes"),
          orderBy("publishedAt", "desc"),
          limit(100)
        );
        snap = await getDocs(q);
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const filtered = all.filter(e =>
          e.visibility !== "hidden" &&
          e.visibility !== "removed" &&
          (e.isFirstParty === true || e.featuredByAdmin === true)
        );
        setEpisodes(filtered);

      } else if (activeTab === "community") {
        // Most liked episodes
        const q = query(
          collection(db, "episodes"),
          orderBy("likeCount", "desc"),
          limit(30)
        );
        snap = await getDocs(q);
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setEpisodes(all.filter(e => e.visibility !== "hidden" && e.visibility !== "removed"));

      } else {
        // Discover — algorithm score, fall back to date
        const q = query(
          collection(db, "episodes"),
          orderBy("algorithmScore", "desc"),
          limit(30)
        );
        snap = await getDocs(q);
        const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setEpisodes(all.filter(e => e.visibility !== "hidden" && e.visibility !== "removed"));
      }
    } catch (err) {
      console.error("Feed fetch error:", err);
      // Fallback: just get recent episodes
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

      {showSliders && <SliderPanel sliders={sliders} setSliders={setSliders} />}

      {/* Tab description */}
      <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
        {activeTab === "discover" && "Algorithmically ranked episodes based on your taste profile"}
        {activeTab === "latest" && "Most recently published episodes across all subscriptions"}
        {activeTab === "wespicks" && "Episodes from Wes's own shows and admin-featured picks"}
        {activeTab === "community" && "Most liked episodes by the PodCommons community"}
      </p>

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
          <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>No episodes here yet</p>
          <p style={{ fontSize: "0.85rem" }}>
            {activeTab === "wespicks"
              ? "Episodes from your five shows will appear here. You can also feature any episode from the Admin dashboard."
              : activeTab === "community"
              ? "Like some episodes to get the community feed going!"
              : "Import your OPML file in the Admin dashboard to start pulling in podcast episodes."}
          </p>
        </div>
      ) : (
        <>
          <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
            {episodes.length} episode{episodes.length !== 1 ? "s" : ""}
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
