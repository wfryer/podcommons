import { useState } from "react";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import { Link } from "react-router-dom";
import { decodeEntities } from "../utils/textUtils";

function formatDate(ts) {
  if (!ts) return "";
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Search() {
  const [query2, setQuery2] = useState("");
  const [results, setResults] = useState({ episodes: [], podcasts: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [activeTab, setActiveTab] = useState("episodes");

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query2.trim()) return;
    setLoading(true);
    setSearched(false);

    try {
      const q = query2.toLowerCase().trim();

      // Fetch episodes and podcasts, filter client-side
      // Firestore doesn't support full-text search natively
      // so we fetch a large batch and filter locally
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
          (
            (p.title || "").toLowerCase().includes(q) ||
            (p.description || "").toLowerCase().includes(q)
          )
        )
        .slice(0, 20);

      setResults({ episodes, podcasts });
      setSearched(true);
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
        Search across {" "}
        <Link to="/" style={{ color: "var(--color-accent)" }}>3,700+ episodes</Link>
        {" "}and 400+ podcasts
      </p>

      {/* Search form */}
      <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem" }}>
        <input
          value={query2}
          onChange={e => setQuery2(e.target.value)}
          placeholder="Search episodes, podcasts, topics..."
          style={{ flex: 1, fontSize: "1rem", padding: "0.75rem 1rem" }}
          autoFocus
        />
        <button type="submit" className="btn-primary"
          disabled={loading || !query2.trim()}
          style={{ padding: "0.75rem 1.5rem", fontSize: "0.9rem" }}>
          {loading ? "..." : "Search"}
        </button>
      </form>

      {/* Results */}
      {searched && (
        <>
          {/* Tab switcher */}
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

          {/* Episode results */}
          {activeTab === "episodes" && (
            results.episodes.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "2rem" }}>
                No episodes found for "{query2}"
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {results.episodes.map(ep => (
                  <Link key={ep.id} to={`/episode/${ep.id}`}
                    style={{ textDecoration: "none" }}>
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

          {/* Podcast results */}
          {activeTab === "podcasts" && (
            results.podcasts.length === 0 ? (
              <p style={{ color: "var(--color-text-muted)", textAlign: "center", padding: "2rem" }}>
                No podcasts found for "{query2}"
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {results.podcasts.map(pod => (
                  <div key={pod.id} style={{
                    background: "var(--color-surface)", border: "1px solid var(--color-border)",
                    borderRadius: "10px", padding: "0.875rem",
                    display: "flex", gap: "0.875rem", alignItems: "center"
                  }}>
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
                    {pod.feedUrl && (
                      <a href={pod.feedUrl} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: "0.72rem", color: "var(--color-accent)",
                          textDecoration: "none", flexShrink: 0 }}>
                        RSS ↗
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* Initial state */}
      {!searched && !loading && (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
          <p style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔍</p>
          <p>Search for any episode title, podcast name, or topic</p>
        </div>
      )}
    </div>
  );
}
