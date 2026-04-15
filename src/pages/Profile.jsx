import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { collection, query, where, getDocs, doc, getDoc, addDoc, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth.jsx";
import { decodeEntities } from "../utils/textUtils";
import md5 from "md5";

function gravatarUrl(email) {
  if (!email) return "";
  return `https://www.gravatar.com/avatar/${md5(email.toLowerCase().trim())}?d=identicon&s=80`;
}

function formatDate(ts) {
  if (!ts) return "";
  try {
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch { return ""; }
}

// ─── Suggest Form ─────────────────────────────────────────────────────────────
function SuggestForm({ user, profile }) {
  const [type, setType] = useState("podcast");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, "podcastSuggestions"), {
        type, title: title.trim(), url: url.trim(), reason: reason.trim(),
        suggestedBy: user.uid, suggestedByUsername: profile?.username || "anonymous",
        status: "pending", createdAt: Timestamp.now(),
      });
      setSubmitted(true);
      setTitle(""); setUrl(""); setReason("");
    } catch (err) { console.error(err); }
    setSubmitting(false);
  };

  if (submitted) return (
    <div style={{ padding: "1rem", background: "rgba(74,222,128,0.1)",
      border: "1px solid #4ade80", borderRadius: "10px" }}>
      <p style={{ color: "#4ade80", fontWeight: 600 }}>✓ Thanks for your suggestion!</p>
      <button onClick={() => setSubmitted(false)} className="btn-ghost"
        style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem", marginTop: "0.5rem" }}>
        Suggest another
      </button>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        {["podcast", "episode"].map(t => (
          <button key={t} onClick={() => setType(t)} style={{
            padding: "0.35rem 1rem", borderRadius: "999px", cursor: "pointer",
            border: `1px solid ${type === t ? "var(--color-accent)" : "var(--color-border)"}`,
            background: type === t ? "rgba(245,158,11,0.15)" : "transparent",
            color: type === t ? "var(--color-accent)" : "var(--color-text-muted)",
            fontSize: "0.82rem",
          }}>
            {t === "podcast" ? "🎙️ Podcast" : "📻 Episode"}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder={type === "podcast" ? "Podcast name *" : "Episode title *"} />
        <input value={url} onChange={e => setUrl(e.target.value)}
          placeholder="RSS feed URL or episode URL" />
        <textarea value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Why would this be a good fit?" rows={3} />
        <button onClick={handleSubmit} disabled={submitting || !title.trim()}
          className="btn-primary" style={{ alignSelf: "flex-start",
            opacity: (!title.trim() || submitting) ? 0.5 : 1 }}>
          {submitting ? "Submitting..." : "Submit →"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Profile ─────────────────────────────────────────────────────────────
export default function Profile() {
  const { username } = useParams();
  const { user, profile: currentUserProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const urlTab = new URLSearchParams(location.search).get("tab");
  const [activeTab, setActiveTab] = useState(urlTab || "queue");
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [visibility, setVisibility] = useState("public");

  useEffect(() => { fetchProfile(); }, [username]);
  useEffect(() => { if (profileData) fetchTabData(); }, [activeTab, profileData]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"), where("username", "==", username.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const data = { id: snap.docs[0].id, ...snap.docs[0].data() };
        setProfileData(data);
        setVisibility(data.profileVisibility || "public");
      }
    } catch (err) { console.error("Profile fetch error:", err); }
    setLoading(false);
  };

  const fetchTabData = async () => {
    if (activeTab === "suggest") return;
    setItemsLoading(true);
    setItems([]);
    try {
      const typeMap = { queue: "queue", favorites: "favorite", activity: null };
      const interactionType = typeMap[activeTab];

      let q;
      if (interactionType) {
        q = query(collection(db, "interactions"),
          where("userId", "==", profileData.id),
          where("type", "==", interactionType)
        );
      } else {
        // Activity — all types
        q = query(collection(db, "interactions"),
          where("userId", "==", profileData.id)
        );
      }

      const snap = await getDocs(q);
      let raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // For activity, exclude queue items
      if (activeTab === "activity") {
        raw = raw.filter(i => i.type !== "queue");
      }

      // Sort by date
      raw.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
        return dateB - dateA;
      });
      raw = raw.slice(0, 30);

      // Fetch episode details for each item
      const withEpisodes = await Promise.all(raw.map(async item => {
        if (!item.episodeId) return item;
        try {
          const epSnap = await getDoc(doc(db, "episodes", item.episodeId));
          return { ...item, episode: epSnap.exists() ? { id: epSnap.id, ...epSnap.data() } : null };
        } catch { return item; }
      }));

      setItems(withEpisodes);
    } catch (err) { console.error("Tab data error:", err); }
    setItemsLoading(false);
  };

  const saveVisibility = async (newVis) => {
    setVisibility(newVis);
    try {
      await updateDoc(doc(db, "users", profileData.id), { profileVisibility: newVis });
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-text-muted)" }}>
      Loading profile...
    </div>
  );

  if (!profileData) return (
    <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-text-muted)" }}>
      <p style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>👤</p>
      <p>User @{username} not found.</p>
      <Link to="/" style={{ color: "var(--color-accent)" }}>← Back to feed</Link>
    </div>
  );

  const isOwnProfile = user?.uid === profileData.id;
  const roleBadgeColor = { admin: "#f59e0b", trusted: "#4ade80", new: "#6b7280" };

  const TABS = [
    { id: "queue", label: "🎧 Queue" },
    { id: "favorites", label: "★ Favorites" },
    { id: "activity", label: "📋 Activity" },
    { id: "suggest", label: "💡 Suggest" },
  ];

  const typeIcon = { like: "♥", favorite: "★", comment: "💬" };
  const typeLabel = { like: "liked", favorite: "favorited", comment: "commented on" };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Link to="/" style={{ color: "var(--color-text-muted)", fontSize: "0.85rem",
        display: "inline-flex", alignItems: "center", gap: "0.3rem", marginBottom: "1.5rem" }}>
        ← Back to feed
      </Link>

      {/* Header */}
      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "2rem", alignItems: "flex-start" }}>
        <img src={gravatarUrl(profileData.email || "")} alt={profileData.username}
          style={{ width: 80, height: 80, borderRadius: "50%",
            border: "3px solid var(--color-accent)", flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem" }}>
              @{profileData.username}
            </h1>
            <span style={{
              fontSize: "0.72rem", padding: "0.2rem 0.5rem", borderRadius: "999px",
              background: `${roleBadgeColor[profileData.role] || "#6b7280"}20`,
              color: roleBadgeColor[profileData.role] || "#6b7280",
              border: `1px solid ${roleBadgeColor[profileData.role] || "#6b7280"}40`
            }}>{profileData.role}</span>
          </div>
          {profileData.bio && (
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem",
              lineHeight: 1.6, marginBottom: "0.5rem" }}>
              {profileData.bio}
            </p>
          )}
          {profileData.socialLink && (
            <a href={profileData.socialLink} target="_blank" rel="noopener noreferrer"
              style={{ color: "var(--color-accent)", fontSize: "0.82rem" }}>
              {profileData.socialLink}
            </a>
          )}
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.4rem" }}>
            Member since {formatDate(profileData.createdAt)}
            {profileData.communityGroups?.length > 0 && ` · ${profileData.communityGroups.join(", ")}`}
          </p>

          {/* Visibility toggle — own profile only */}
          {isOwnProfile && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.6rem", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>Profile:</span>
              {[
                { id: "public", label: "🌐 Public" },
                { id: "members", label: "👥 Members only" },
                { id: "private", label: "🔒 Private" },
              ].map(v => (
                <button key={v.id} onClick={() => saveVisibility(v.id)}
                  style={{
                    fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: "999px",
                    cursor: "pointer",
                    border: `1px solid ${visibility === v.id ? "var(--color-accent)" : "var(--color-border)"}`,
                    background: visibility === v.id ? "rgba(245,158,11,0.15)" : "transparent",
                    color: visibility === v.id ? "var(--color-accent)" : "var(--color-text-muted)",
                  }}>
                  {v.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {isOwnProfile && (
          <button onClick={() => navigate("/settings")} className="btn-ghost"
            style={{ fontSize: "0.82rem", padding: "0.4rem 0.875rem", flexShrink: 0 }}>
            ✏️ Edit profile
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem",
        borderBottom: "1px solid var(--color-border)", paddingBottom: "0.75rem", flexWrap: "wrap" }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "0.4rem 0.875rem", borderRadius: "8px", cursor: "pointer",
              border: activeTab === tab.id ? "1px solid var(--color-accent)" : "1px solid transparent",
              background: activeTab === tab.id ? "rgba(245,158,11,0.1)" : "none",
              color: activeTab === tab.id ? "var(--color-accent)" : "var(--color-text-muted)",
              fontSize: "0.85rem", fontWeight: activeTab === tab.id ? 600 : 400,
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Suggest tab */}
      {activeTab === "suggest" && (
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", marginBottom: "0.5rem" }}>
            💡 Suggest a Podcast or Episode
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
            Know a great podcast that should be in PodCommons? Suggest it here!
          </p>
          {user ? (
            <SuggestForm user={user} profile={currentUserProfile} />
          ) : (
            <p style={{ color: "var(--color-text-muted)" }}>
              <Link to="/login" style={{ color: "var(--color-accent)" }}>Sign in</Link> to suggest a podcast.
            </p>
          )}
        </div>
      )}

      {/* Data tabs */}
      {activeTab !== "suggest" && (
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", marginBottom: "1rem" }}>
            {activeTab === "queue" && "🎧 Listening Queue"}
            {activeTab === "favorites" && "★ Favorite Episodes"}
            {activeTab === "activity" && "📋 Recent Activity"}
          </h2>

          {itemsLoading ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>Loading...</p>
          ) : items.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
              {activeTab === "queue" && (isOwnProfile
                ? "Your queue is empty — click 🎧 on any episode card to add it!"
                : "No episodes in queue.")}
              {activeTab === "favorites" && "No favorites yet."}
              {activeTab === "activity" && "No activity yet."}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {items.map(item => (
                <Link key={item.id} to={item.episodeId ? `/episode/${item.episodeId}` : "#"}
                  style={{ textDecoration: "none" }}>
                  <div style={{ background: "var(--color-surface)",
                    border: "1px solid var(--color-border)", borderRadius: "8px",
                    padding: "0.75rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>

                    {item.episode?.imageUrl && (
                      <img src={item.episode.imageUrl} alt=""
                        style={{ width: 44, height: 44, borderRadius: "6px",
                          objectFit: "cover", flexShrink: 0 }} />
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-text)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.episode ? decodeEntities(item.episode.title) : "Episode"}
                      </p>
                      <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                        {item.episode && decodeEntities(item.episode.podcastTitle)}
                        {activeTab === "activity" && (
                          <span style={{ marginLeft: "0.4rem" }}>
                            · {typeLabel[item.type] || item.type}
                            {item.content && ` · "${item.content.slice(0, 50)}"`}
                          </span>
                        )}
                      </p>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
                      {activeTab === "activity" && (
                        <span style={{ color: "var(--color-accent)", fontSize: "1rem" }}>
                          {typeIcon[item.type] || "•"}
                        </span>
                      )}
                      {activeTab === "queue" && (
                        <span style={{ fontSize: "0.75rem", color: "var(--color-accent)",
                          background: "var(--color-accent)20", padding: "0.2rem 0.5rem",
                          borderRadius: "6px" }}>
                          ▶ Play
                        </span>
                      )}
                      <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                        {formatDate(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
