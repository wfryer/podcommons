import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, addDoc, updateDoc, Timestamp } from "firebase/firestore";
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
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Suggest a Podcast Form ───────────────────────────────────────────────────
function SuggestPodcastForm({ user, profile, onSuccess }) {
  const [type, setType] = useState("podcast");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    await addDoc(collection(db, "podcastSuggestions"), {
      type,
      title: title.trim(),
      url: url.trim(),
      reason: reason.trim(),
      suggestedBy: user.uid,
      suggestedByUsername: profile?.username || "anonymous",
      status: "pending",
      createdAt: Timestamp.now(),
    });
    setSubmitting(false);
    setSubmitted(true);
    setTitle(""); setUrl(""); setReason("");
    if (onSuccess) onSuccess();
  };

  if (submitted) return (
    <div style={{ padding: "1rem", background: "rgba(74,222,128,0.1)", border: "1px solid #4ade80",
      borderRadius: "10px", marginTop: "1rem" }}>
      <p style={{ color: "#4ade80", fontWeight: 600 }}>✓ Thanks for your suggestion!</p>
      <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
        An admin will review it and add it to the feed.
      </p>
      <button onClick={() => setSubmitted(false)} className="btn-ghost"
        style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem", marginTop: "0.75rem" }}>
        Suggest another
      </button>
    </div>
  );

  return (
    <div style={{ marginTop: "1rem" }}>
      {/* Type selector */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        {["podcast", "episode"].map(t => (
          <button key={t} onClick={() => setType(t)}
            style={{
              padding: "0.35rem 1rem", borderRadius: "999px", cursor: "pointer",
              border: `1px solid ${type === t ? "var(--color-accent)" : "var(--color-border)"}`,
              background: type === t ? "rgba(245,158,11,0.15)" : "transparent",
              color: type === t ? "var(--color-accent)" : "var(--color-text-muted)",
              fontSize: "0.82rem", fontWeight: type === t ? 600 : 400,
            }}>
            {t === "podcast" ? "🎙️ Suggest a Podcast" : "📻 Suggest an Episode"}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <input value={title} onChange={e => setTitle(e.target.value)}
          placeholder={type === "podcast" ? "Podcast name *" : "Episode title *"} />
        <input value={url} onChange={e => setUrl(e.target.value)}
          placeholder={type === "podcast" ? "RSS feed URL or website" : "Episode URL"} />
        <textarea value={reason} onChange={e => setReason(e.target.value)}
          placeholder="Why would this be a good fit for PodCommons?" rows={3} />
        <button onClick={handleSubmit} disabled={submitting || !title.trim()}
          className="btn-primary"
          style={{ opacity: (!title.trim() || submitting) ? 0.5 : 1, alignSelf: "flex-start" }}>
          {submitting ? "Submitting..." : "Submit suggestion →"}
        </button>
      </div>
    </div>
  );
}

// ─── Listening Queue ──────────────────────────────────────────────────────────
function ListeningQueue({ userId, isOwnProfile }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchQueue(); }, [userId]);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "interactions"),
        where("userId", "==", userId),
        where("type", "==", "queue"),
        limit(50)
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB - dateA;
        });

      // Fetch episode details
      const withEpisodes = await Promise.all(items.map(async item => {
        try {
          const epSnap = await getDoc(doc(db, "episodes", item.episodeId));
          return { ...item, episode: epSnap.exists() ? { id: epSnap.id, ...epSnap.data() } : null };
        } catch { return item; }
      }));
      setQueue(withEpisodes.filter(i => i.episode));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>Loading...</p>;
  if (queue.length === 0) return (
    <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
      {isOwnProfile ? "Your listening queue is empty. Add episodes from the feed!" : "No episodes in queue."}
    </p>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {queue.map(item => (
        <Link key={item.id} to={`/episode/${item.episodeId}`} style={{ textDecoration: "none" }}>
          <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)",
            borderRadius: "8px", padding: "0.75rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
            {item.episode?.imageUrl && (
              <img src={item.episode.imageUrl} alt="" style={{ width: 40, height: 40, borderRadius: "6px", objectFit: "cover" }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-text)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {decodeEntities(item.episode?.title)}
              </p>
              <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                {decodeEntities(item.episode?.podcastTitle)}
              </p>
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", flexShrink: 0 }}>▶ Play</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────
function ActivityFeed({ userId, isOwnProfile }) {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchActivity(); }, [userId]);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "interactions"),
        where("userId", "==", userId),
        limit(50)
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(i => i.type !== "queue")
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB - dateA;
        })
        .slice(0, 30);

      // Fetch episode titles
      const withEpisodes = await Promise.all(items.map(async item => {
        if (!item.episodeId) return item;
        try {
          const epSnap = await getDoc(doc(db, "episodes", item.episodeId));
          return { ...item, episode: epSnap.exists() ? { id: epSnap.id, ...epSnap.data() } : null };
        } catch { return item; }
      }));
      setActivity(withEpisodes);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const typeIcon = { like: "♥", favorite: "★", comment: "💬" };
  const typeLabel = { like: "liked", favorite: "favorited", comment: "commented on" };

  if (loading) return <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>Loading...</p>;
  if (activity.length === 0) return (
    <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>No activity yet.</p>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {activity.map(item => (
        <Link key={item.id} to={`/episode/${item.episodeId}`} style={{ textDecoration: "none" }}>
          <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)",
            borderRadius: "8px", padding: "0.6rem 0.875rem",
            display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ color: "var(--color-accent)", fontSize: "0.9rem", flexShrink: 0 }}>
              {typeIcon[item.type] || "•"}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "0.82rem", color: "var(--color-text)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {item.episode ? decodeEntities(item.episode.title) : "an episode"}
              </p>
              <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                {typeLabel[item.type] || item.type}
                {item.content && <span> · "{item.content.slice(0, 60)}"</span>}
                {item.episode?.podcastTitle && <span> · {decodeEntities(item.episode.podcastTitle)}</span>}
              </p>
            </div>
            <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", flexShrink: 0 }}>
              {formatDate(item.createdAt)}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── Favorites ────────────────────────────────────────────────────────────────
function Favorites({ userId }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchFavorites(); }, [userId]);

  const fetchFavorites = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "interactions"),
        where("userId", "==", userId),
        where("type", "==", "favorite"),
        limit(50)
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const withEpisodes = await Promise.all(items.map(async item => {
        try {
          const epSnap = await getDoc(doc(db, "episodes", item.episodeId));
          return { ...item, episode: epSnap.exists() ? { id: epSnap.id, ...epSnap.data() } : null };
        } catch { return item; }
      }));
      setFavorites(withEpisodes.filter(i => i.episode));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  if (loading) return <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>Loading...</p>;
  if (favorites.length === 0) return (
    <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>No favorites yet.</p>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {favorites.map(item => (
        <Link key={item.id} to={`/episode/${item.episodeId}`} style={{ textDecoration: "none" }}>
          <div style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)",
            borderRadius: "8px", padding: "0.75rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
            {item.episode?.imageUrl && (
              <img src={item.episode.imageUrl} alt="" style={{ width: 40, height: 40, borderRadius: "6px", objectFit: "cover" }} />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-text)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {decodeEntities(item.episode?.title)}
              </p>
              <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
                {decodeEntities(item.episode?.podcastTitle)} · {formatDate(item.createdAt)}
              </p>
            </div>
            <span style={{ fontSize: "0.9rem", color: "var(--color-accent)" }}>★</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── Main Profile Page ────────────────────────────────────────────────────────
export default function Profile() {
  const { username } = useParams();
  const { user, profile: currentUserProfile } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("queue");
  const [suggestionCount, setSuggestionCount] = useState(0);

  useEffect(() => { fetchProfile(); }, [username]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"), where("username", "==", username.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) setProfileData({ id: snap.docs[0].id, ...snap.docs[0].data() });
    } catch (err) { console.error(err); }
    setLoading(false);
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
  const isAdmin = currentUserProfile?.role === "admin";
  const [visibility, setVisibility] = useState(profileData.profileVisibility || "public");

  const updateVisibility = async (newVis) => {
    setVisibility(newVis);
    try {
      await updateDoc(doc(db, "users", profileData.id), { profileVisibility: newVis });
    } catch (err) { console.error(err); }
  };

  const TABS = [
    { id: "queue", label: "🎧 Queue" },
    { id: "favorites", label: "★ Favorites" },
    { id: "activity", label: "📋 Activity" },
    { id: "suggest", label: "💡 Suggest" },
  ];

  const roleBadge = { admin: "#f59e0b", trusted: "#4ade80", new: "#6b7280" };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      <Link to="/" style={{ color: "var(--color-text-muted)", fontSize: "0.85rem",
        display: "inline-flex", alignItems: "center", gap: "0.3rem", marginBottom: "1.5rem" }}>
        ← Back to feed
      </Link>

      {/* Profile header */}
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
              background: `${roleBadge[profileData.role]}20`,
              color: roleBadge[profileData.role],
              border: `1px solid ${roleBadge[profileData.role]}40`
            }}>{profileData.role}</span>
          </div>
          {profileData.bio && (
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem", lineHeight: 1.6, marginBottom: "0.5rem" }}>
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
          {isOwnProfile && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.6rem" }}>
              <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>Profile visibility:</span>
              {["public", "members", "private"].map(v => (
                <button key={v} onClick={() => updateVisibility(v)}
                  style={{
                    fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: "999px",
                    cursor: "pointer",
                    border: `1px solid ${visibility === v ? "var(--color-accent)" : "var(--color-border)"}`,
                    background: visibility === v ? "rgba(245,158,11,0.15)" : "transparent",
                    color: visibility === v ? "var(--color-accent)" : "var(--color-text-muted)",
                  }}>
                  {v === "public" ? "🌐 Public" : v === "members" ? "👥 Members" : "🔒 Private"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Edit profile button for own profile */}
        {isOwnProfile && (
          <button onClick={() => navigate("/settings")} className="btn-ghost"
            style={{ fontSize: "0.82rem", padding: "0.4rem 0.875rem", flexShrink: 0 }}>
            ✏️ Edit profile
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap",
        borderBottom: "1px solid var(--color-border)", paddingBottom: "0.75rem" }}>
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

      {/* Tab content */}
      {activeTab === "queue" && (
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", marginBottom: "1rem" }}>
            🎧 Listening Queue
          </h2>
          <ListeningQueue userId={profileData.id} isOwnProfile={isOwnProfile} />
        </div>
      )}

      {activeTab === "favorites" && (
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", marginBottom: "1rem" }}>
            ★ Favorite Episodes
          </h2>
          <Favorites userId={profileData.id} />
        </div>
      )}

      {activeTab === "activity" && (
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", marginBottom: "1rem" }}>
            📋 Recent Activity
          </h2>
          <ActivityFeed userId={profileData.id} isOwnProfile={isOwnProfile} />
        </div>
      )}

      {activeTab === "suggest" && (
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", marginBottom: "0.5rem" }}>
            💡 Suggest a Podcast or Episode
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "0.5rem" }}>
            Know a great podcast that should be in PodCommons? Suggest it here and an admin will review it.
          </p>
          {user ? (
            <SuggestPodcastForm user={user} profile={currentUserProfile} />
          ) : (
            <p style={{ color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
              <Link to="/login" style={{ color: "var(--color-accent)" }}>Sign in</Link> to suggest a podcast.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
