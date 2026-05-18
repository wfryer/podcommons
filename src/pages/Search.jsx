import { useState, useEffect } from "react";
import { collection, getDocs, query, orderBy, limit, where, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Link, useNavigate } from "react-router-dom";
import { decodeEntities } from "../utils/textUtils";
import { useAuth } from "../hooks/useAuth.jsx";

function formatDate(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDuration(seconds) {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── Podcast Preview Modal ─────────────────────────────────────────────────────
function PodcastPreview({ podcast, preloadedEpisodes = [], onClose }) {
  const { user, profile } = useAuth();
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suggesting, setSuggesting] = useState(null);
  const [suggested, setSuggested] = useState({});
  const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN;

  useEffect(() => {
    if (preloadedEpisodes.length > 0) {
      setEpisodes(preloadedEpisodes);
      setLoading(false);
    } else {
      fetchEpisodes();
    }
  }, [podcast.id]);

  const fetchEpisodes = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, "episodes"),
        where("podcastId", "==", podcast.id),
        limit(20)
      ));
      if (!snap.empty) {
        const sorted = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const dateA = a.publishedAt?.toDate ? a.publishedAt.toDate() : new Date(0);
            const dateB = b.publishedAt?.toDate ? b.publishedAt.toDate() : new Date(0);
            return dateB - dateA;
          });
        setEpisodes(sorted);
      }
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleSuggestEpisode = async (ep) => {
    if (!user) return;
    setSuggesting(ep.id);
    try {
      await addDoc(collection(db, "podcastSuggestions"), {
        type: "episode",
        title: decodeEntities(ep.title),
        url: ep.episodeUrl,
        reason: `Suggested from podcast search: ${decodeEntities(podcast.title)}`,
        suggestedBy: user.uid,
        suggestedByUsername: profile?.username || "anonymous",
        status: "pending",
        createdAt: Timestamp.now(),
      });
      setSuggested(prev => ({ ...prev, [ep.id]: true }));
    } catch (err) { console.error(err); }
    setSuggesting(null);
  };

  const handleAdminImport = async (ep) => {
    // Admin can directly mark episode as community recommended
    setSuggesting(ep.id);
    try {
      await addDoc(collection(db, "podcastSuggestions"), {
        type: "episode",
        title: decodeEntities(ep.title),
        url: ep.episodeUrl,
        reason: "Admin direct import from search",
        suggestedBy: user.uid,
        suggestedByUsername: profile?.username || "anonymous",
        status: "approved",
        createdAt: Timestamp.now(),
      });
      setSuggested(prev => ({ ...prev, [ep.id]: true }));
    } catch (err) { console.error(err); }
    setSuggesting(null);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
      display: "flex", alignItems: "flex-end", justifyContent: "center",
      zIndex: 1000, padding: "1rem"
    }} onClick={onClose}>
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: "16px 16px 0 0", width: "100%", maxWidth: 640,
        maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column"
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: "1.25rem 1.25rem 0.75rem", borderBottom: "1px solid var(--color-border)",
          display: "flex", gap: "0.875rem", alignItems: "center" }}>
          {podcast.artworkUrl && (
            <img src={podcast.artworkUrl} alt=""
              style={{ width: 52, height: 52, borderRadius: "8px", objectFit: "cover", flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: "1rem", fontFamily: "var(--font-display)" }}>
              {podcast.title}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
              ✓ In PodCommons · Recent episodes
            </p>
          </div>
          <button onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer",
              color: "var(--color-text-muted)", fontSize: "1.25rem", flexShrink: 0 }}>
            ✕
          </button>
        </div>

        {/* Episodes list */}
        <div style={{ overflowY: "auto", flex: 1, padding: "0.75rem" }}>
          {loading ? (
            <p style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>
              Loading episodes...
            </p>
          ) : episodes.length === 0 ? (
            <p style={{ textAlign: "center", padding: "2rem", color: "var(--color-text-muted)" }}>
              No episodes found in database yet — check back after next poll.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {episodes.map(ep => (
                <div key={ep.id} style={{
                  background: "var(--color-bg)", border: "1px solid var(--color-border)",
                  borderRadius: "8px", padding: "0.75rem",
                  display: "flex", gap: "0.75rem", alignItems: "center"
                }}>
                  <Link to={`/episode/${ep.id}`} onClick={onClose}
                    style={{ flex: 1, minWidth: 0, textDecoration: "none" }}>
                    <p style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-text)",
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {decodeEntities(ep.title)}
                    </p>
                    <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                      {formatDate(ep.publishedAt)}
                      {ep.duration ? ` · ${formatDuration(ep.duration)}` : ""}
                    </p>
                  </Link>

                  {/* Action button */}
                  {suggested[ep.id] ? (
                    <span style={{ fontSize: "0.72rem", color: "#4ade80", flexShrink: 0 }}>✓ Done</span>
                  ) : profile?.role === "admin" ? (
                    <button onClick={() => handleAdminImport(ep)}
                      disabled={suggesting === ep.id}
                      style={{
                        fontSize: "0.72rem", padding: "0.25rem 0.6rem", borderRadius: "6px",
                        background: "rgba(245,158,11,0.15)", border: "1px solid var(--color-accent)",
                        color: "var(--color-accent)", cursor: "pointer", flexShrink: 0,
                        opacity: suggesting === ep.id ? 0.5 : 1
                      }}>
                      {suggesting === ep.id ? "..." : "⭐ Feature"}
                    </button>
                  ) : user ? (
                    <button onClick={() => handleSuggestEpisode(ep)}
                      disabled={suggesting === ep.id}
                      style={{
                        fontSize: "0.72rem", padding: "0.25rem 0.6rem", borderRadius: "6px",
                        background: "var(--color-surface)", border: "1px solid var(--color-border)",
                        color: "var(--color-text-muted)", cursor: "pointer", flexShrink: 0,
                        opacity: suggesting === ep.id ? 0.5 : 1
                      }}>
                      {suggesting === ep.id ? "..." : "💡 Suggest"}
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid var(--color-border)",
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          {podcast.firstPartySlug && (
            <Link to={`/show/${podcast.firstPartySlug}`} onClick={onClose}
              style={{ fontSize: "0.82rem", color: "var(--color-accent)" }}>
              View show page →
            </Link>
          )}
          {podcast.feedUrl && (
            <a href={podcast.feedUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>
              RSS feed ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Search Page ──────────────────────────────────────────────────────────
export default function Search() {
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState({ episodes: [], podcasts: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeTab, setActiveTab] = useState("episodes");
  const [selectedPodcast, setSelectedPodcast] = useState(null);
  const [selectedPodcastEpisodes, setSelectedPodcastEpisodes] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(false);

    try {
      const q = searchQuery.toLowerCase().trim();

      const [epSnap, podSnap] = await Promise.all([
        getDocs(query(collection(db, "episodes"), orderBy("publishedAt", "desc"), limit(500))),
        getDocs(query(collection(db, "podcasts"), orderBy("title"), limit(500))),
      ]);

      const episodes = epSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(e =>
          e.visibility !== "hidden" && e.visibility !== "removed" &&
          (
            decodeEntities(e.title || "").toLowerCase().includes(q) ||
            decodeEntities(e.podcastTitle || "").toLowerCase().includes(q) ||
            (e.description || "").toLowerCase().includes(q)
          )
        )
        .slice(0, 30);

      const podcasts = podSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p =>
          p.visibility !== "hidden" &&
          (p.title || "").toLowerCase().includes(q)
        )
        .slice(0, 20);

      setResults({ episodes, podcasts });
      setSearched(true);
      setActiveTab(episodes.length > 0 ? "episodes" : "podcasts");
    } catch (err) {
      console.error("Search error:", err);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem",
        marginBottom: "0.5rem", color: "var(--color-accent)" }}>
        🔍 Search PodCommons
      </h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
        Search across{" "}
        <Link to="/" style={{ color: "var(--color-accent)" }}>3,700+ episodes</Link>
        {" "}and 400+ podcasts
      </p>

      <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem" }}>
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search episodes, podcasts, topics..."
          style={{ flex: 1, fontSize: "1rem", padding: "0.75rem 1rem" }}
          autoFocus
        />
        <button type="submit" className="btn-primary"
          disabled={loading || !searchQuery.trim()}
          style={{ padding: "0.75rem 1.5rem", fontSize: "0.9rem" }}>
          {loading ? "..." : "Search"}
        </button>
      </form>

      {searched && (
        <>
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
            <button onClick={() => setActiveTab("episodes")}
              style={{
                padding: "0.4rem 1rem", borderRadius: "8px", cursor: "pointer",
                border: `1px solid ${activeTab === "episodes" ? "var(--color-accent)" : "var(--color-border)"}`,
                background: activeTab === "episodes" ? "rgba(245,158,11,0.1)" : "none",
                color: activeTab === "episodes" ? "var(--color-accent)" : "var(--color-text-muted)",
                fontSize: "0.85rem"
              }}>
              📻 Episodes ({results.episodes.length})
            </button>
            <button onClick={() => setActiveTab("podcasts")}
              style={{
                padding: "0.4rem 1rem", borderRadius: "8px", cursor: "pointer",
                border: `1px solid ${activeTab === "podcasts" ? "var(--color-accent)" : "var(--color-border)"}`,
                background: activeTab === "podcasts" ? "rgba(245,158,11,0.1)" : "none",
                color: activeTab === "podcasts" ? "var(--color-accent)" : "var(--color-text-muted)",
                fontSize: "0.85rem"
              }}>
              🎙️ Podcasts ({results.podcasts.length})
            </button>
          </div>

          {activeTab === "episodes" && (
            results.episodes.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "2rem" }}>
                No episodes found for "{searchQuery}"
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {results.episodes.map(ep => (
                  <Link key={ep.id} to={`/episode/${ep.id}`} style={{ textDecoration: "none" }}>
                    <div style={{
                      background: "var(--color-surface)", border: "1px solid var(--color-border)",
                      borderRadius: "10px", padding: "0.875rem",
                      display: "flex", gap: "0.875rem", alignItems: "flex-start"
                    }}>
                      {ep.imageUrl && (
                        <img src={ep.imageUrl} alt=""
                          style={{ width: 52, height: 52, borderRadius: "8px",
                            objectFit: "cover", flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text)",
                          marginBottom: "0.2rem",
                          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {decodeEntities(ep.title)}
                        </p>
                        <p style={{ fontSize: "0.78rem", color: "var(--color-accent)", marginBottom: "0.2rem" }}>
                          {decodeEntities(ep.podcastTitle)}
                        </p>
                        <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                          {formatDate(ep.publishedAt)}
                          {ep.topics?.length > 0 && ` · ${ep.topics.slice(0, 2).join(", ")}`}
                        </p>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-accent)",
                        flexShrink: 0, paddingTop: "0.2rem" }}>▶</span>
                    </div>
                  </Link>
                ))}
                {results.episodes.length === 30 && (
                  <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", textAlign: "center" }}>
                    Showing top 30 results — try a more specific search term
                  </p>
                )}
              </div>
            )
          )}

          {activeTab === "podcasts" && (
            results.podcasts.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "2rem" }}>
                No podcasts found for "{searchQuery}"
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {results.podcasts.map(pod => (
                  <button key={pod.id} onClick={() => {
                    setSelectedPodcast(pod);
                    // Pre-filter episodes we already have from search
                    const podEps = results.episodes.filter(e =>
                      e.podcastId === pod.id ||
                      decodeEntities(e.podcastTitle || "").toLowerCase() === (pod.title || "").toLowerCase()
                    );
                    setSelectedPodcastEpisodes(podEps);
                  }}
                    style={{
                      width: "100%", textAlign: "left", background: "none",
                      border: "none", cursor: "pointer", padding: 0
                    }}>
                    <div style={{
                      background: "var(--color-surface)", border: "1px solid var(--color-border)",
                      borderRadius: "10px", padding: "0.875rem",
                      display: "flex", gap: "0.875rem", alignItems: "center",
                      transition: "border-color 0.15s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = "var(--color-accent)"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border)"}>
                      {pod.artworkUrl && (
                        <img src={pod.artworkUrl} alt=""
                          style={{ width: 52, height: 52, borderRadius: "8px",
                            objectFit: "cover", flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--color-text)",
                          marginBottom: "0.2rem" }}>
                          {pod.isFirstParty && "🎙️ "}{pod.title}
                        </p>
                        <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                          {pod.visibility === "visible" ? "✓ In PodCommons" : pod.visibility}
                          {pod.communityRecommended && " · 👥 Community recommended"}
                        </p>
                      </div>
                      <span style={{ fontSize: "0.75rem", color: "var(--color-accent)", flexShrink: 0 }}>
                        View episodes →
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}
        </>
      )}

      {!searched && !loading && (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
          <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔍</p>
          <p>Search for any episode title, podcast name, or topic</p>
        </div>
      )}

      {selectedPodcast && (
        <PodcastPreview
          podcast={selectedPodcast}
          preloadedEpisodes={selectedPodcastEpisodes}
          onClose={() => { setSelectedPodcast(null); setSelectedPodcastEpisodes([]); }}
        />
      )}
    </div>
  );
}
