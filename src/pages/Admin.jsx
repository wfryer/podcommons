import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import {
  collection, getDocs, query, where, orderBy, limit,
  doc, updateDoc, deleteDoc, getDoc, addDoc, setDoc, Timestamp
} from "firebase/firestore";
import { db } from "../firebase";

// ─── Poll Status ────────────────────────────────────────────────────────────
function PollStatus({ onRefresh }) {
  const [status, setStatus] = useState(null);
  const [polling, setPolling] = useState(false);
  const [result, setResult] = useState(null);
  const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN;

  useEffect(() => { fetchStatus(); }, []);

  const fetchStatus = async () => {
    try {
      const snap = await getDoc(doc(db, "siteSettings", "pollStatus"));
      if (snap.exists()) setStatus(snap.data());
    } catch (err) { console.error(err); }
  };

  const handleRefresh = async () => {
    if (!ADMIN_TOKEN) {
      alert("ADMIN_TOKEN not configured. Add VITE_ADMIN_TOKEN to your .env file.");
      return;
    }
    setPolling(true);
    setResult(null);
    try {
      const url = `https://us-central1-podcommons-41064.cloudfunctions.net/manualRSSPoll?token=${ADMIN_TOKEN}&limit=50`;
      const res = await fetch(url);
      const data = await res.json();
      setResult(data);
      fetchStatus();
      if (onRefresh) onRefresh();
    } catch (err) {
      setResult({ error: err.message });
    }
    setPolling(false);
  };

  const fmt = (ts) => {
    if (!ts) return "Never";
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString();
  };

  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "1.5rem", marginBottom: "1.5rem" }}>
      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", marginBottom: "1rem" }}>
        📡 RSS Feed Polling
      </h3>

      {status && (
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {[
            { label: "Last poll", value: fmt(status.lastPollAt) },
            { label: "Duration", value: status.lastPollDuration ? `${status.lastPollDuration}s` : "—" },
            { label: "Episodes added", value: status.lastPollAdded ?? "—" },
            { label: "AI analyzed", value: status.lastPollAnalyzed ?? "—" },
            { label: "Feeds processed", value: status.lastPollProcessed ?? "—" },
            { label: "Errors", value: status.lastPollErrors ?? "—" },
            { label: "Next poll", value: fmt(status.nextPollAt) },
          ].map(s => (
            <div key={s.label} style={{ background: "var(--color-bg)", borderRadius: "8px", padding: "0.6rem 1rem", minWidth: 120 }}>
              <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginBottom: "0.2rem" }}>{s.label}</p>
              <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text)" }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <button onClick={handleRefresh} disabled={polling}
        className="btn-primary"
        style={{ opacity: polling ? 0.7 : 1, display: "flex", alignItems: "center", gap: "0.5rem" }}>
        {polling ? (
          <>
            <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
            Polling feeds... (this may take a few minutes)
          </>
        ) : "⟳ Refresh Feeds Now"}
      </button>

      {result && (
        <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", borderRadius: "8px",
          background: result.error ? "rgba(248,113,113,0.1)" : "rgba(74,222,128,0.1)",
          border: `1px solid ${result.error ? "#f87171" : "#4ade80"}` }}>
          {result.error ? (
            <p style={{ color: "#f87171", fontSize: "0.85rem" }}>Error: {result.error}</p>
          ) : (
            <p style={{ color: "#4ade80", fontSize: "0.85rem" }}>
              ✓ Done! {result.added} new episodes added from {result.processed} feeds in {result.duration}s
            </p>
          )}
        </div>
      )}

      <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.75rem" }}>
        Automatic polling runs every 4 hours via Cloud Functions. Manual refresh polls 50 feeds at a time.
      </p>
    </div>
  );
}

// ─── Moderation Queue ────────────────────────────────────────────────────────
function ModerationQueue() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchQueue(); }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, "moderationQueue"),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc"),
        limit(50)
      ));
      const raw = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Fetch user info for each
      const withUsers = await Promise.all(raw.map(async item => {
        try {
          const userSnap = await getDoc(doc(db, "users", item.userId));
          return { ...item, user: userSnap.exists() ? userSnap.data() : null };
        } catch { return item; }
      }));
      setItems(withUsers);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const approve = async (item) => {
    await updateDoc(doc(db, "moderationQueue", item.id), { status: "approved" });
    if (item.interactionId) {
      await updateDoc(doc(db, "interactions", item.interactionId), { status: "approved" });
    }
    setItems(prev => prev.filter(i => i.id !== item.id));
  };

  const reject = async (item) => {
    await updateDoc(doc(db, "moderationQueue", item.id), { status: "rejected" });
    setItems(prev => prev.filter(i => i.id !== item.id));
  };

  const approveAndTrust = async (item) => {
    await approve(item);
    await updateDoc(doc(db, "users", item.userId), { role: "trusted" });
  };

  if (loading) return <p style={{ color: "var(--color-text-muted)" }}>Loading...</p>;
  if (items.length === 0) return (
    <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)", border: "1px dashed var(--color-border)", borderRadius: "12px" }}>
      <p style={{ fontSize: "1.5rem" }}>✅</p>
      <p>Moderation queue is empty!</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {items.map(item => (
        <div key={item.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                @{item.user?.username || item.userId} · <span style={{ color: "var(--color-accent)" }}>{item.type}</span>
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                {item.user?.communityGroups?.join(", ") || "No groups"}
              </p>
            </div>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
              {item.createdAt?.toDate?.().toLocaleDateString()}
            </p>
          </div>
          {item.content && (
            <p style={{ fontSize: "0.85rem", color: "var(--color-text)", marginBottom: "0.75rem",
              background: "var(--color-bg)", padding: "0.5rem 0.75rem", borderRadius: "6px" }}>
              "{item.content}"
            </p>
          )}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button onClick={() => approve(item)} className="btn-primary" style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem" }}>
              Approve
            </button>
            <button onClick={() => approveAndTrust(item)}
              style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem", borderRadius: "8px",
                background: "rgba(74,222,128,0.15)", border: "1px solid #4ade80", color: "#4ade80", cursor: "pointer" }}>
              Approve + Trust User
            </button>
            <button onClick={() => reject(item)}
              style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem", borderRadius: "8px",
                background: "rgba(248,113,113,0.1)", border: "1px solid #f87171", color: "#f87171", cursor: "pointer" }}>
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Flag Queue ──────────────────────────────────────────────────────────────
function FlagQueue() {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchFlags(); }, []);

  const fetchFlags = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(
        collection(db, "flags"),
        where("status", "==", "pending"),
        orderBy("createdAt", "desc"),
        limit(50)
      ));
      setFlags(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleFlag = async (flag, decision) => {
    await updateDoc(doc(db, "flags", flag.id), { status: decision, reviewedAt: new Date() });
    if (decision === "removed") {
      await updateDoc(doc(db, flag.targetType === "episode" ? "episodes" : "podcasts", flag.targetId),
        { visibility: "removed" });
    } else if (decision === "restored") {
      await updateDoc(doc(db, flag.targetType === "episode" ? "episodes" : "podcasts", flag.targetId),
        { visibility: "visible" });
    }
    setFlags(prev => prev.filter(f => f.id !== flag.id));
  };

  if (loading) return <p style={{ color: "var(--color-text-muted)" }}>Loading...</p>;
  if (flags.length === 0) return (
    <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)", border: "1px dashed var(--color-border)", borderRadius: "12px" }}>
      <p style={{ fontSize: "1.5rem" }}>✅</p>
      <p>No flags pending!</p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {flags.map(flag => (
        <div key={flag.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "1rem" }}>
          <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.25rem" }}>
            🚩 {flag.targetType} flagged
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "0.25rem" }}>
            Reason: {flag.reason}
          </p>
          {flag.note && <p style={{ fontSize: "0.8rem", color: "var(--color-text)", marginBottom: "0.5rem" }}>"{flag.note}"</p>}
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
            {flag.createdAt?.toDate?.().toLocaleDateString()}
          </p>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={() => handleFlag(flag, "restored")} className="btn-primary"
              style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem" }}>Restore</button>
            <button onClick={() => handleFlag(flag, "hidden")}
              style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem", borderRadius: "8px",
                background: "rgba(245,158,11,0.15)", border: "1px solid var(--color-accent)",
                color: "var(--color-accent)", cursor: "pointer" }}>Keep Hidden</button>
            <button onClick={() => handleFlag(flag, "removed")}
              style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem", borderRadius: "8px",
                background: "rgba(248,113,113,0.1)", border: "1px solid #f87171",
                color: "#f87171", cursor: "pointer" }}>Remove Permanently</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── User Management ─────────────────────────────────────────────────────────
function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"), limit(100)));
      setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const setRole = async (userId, role) => {
    await updateDoc(doc(db, "users", userId), { role });
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
  };

  const roleBadge = (role) => {
    const colors = { admin: "#f59e0b", trusted: "#4ade80", new: "#6b7280" };
    return (
      <span style={{ fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: "999px",
        background: `${colors[role]}20`, color: colors[role],
        border: `1px solid ${colors[role]}40` }}>
        {role}
      </span>
    );
  };

  if (loading) return <p style={{ color: "var(--color-text-muted)" }}>Loading...</p>;

  return (
    <div>
      <p style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
        {users.length} members
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {users.map(user => (
          <div key={user.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: "10px", padding: "0.875rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <p style={{ fontWeight: 600, fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                @{user.username} {roleBadge(user.role)}
              </p>
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                {user.email} · {user.createdAt?.toDate?.().toLocaleDateString()}
              </p>
              {user.bio && <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>{user.bio}</p>}
            </div>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              {user.role !== "trusted" && user.role !== "admin" && (
                <button onClick={() => setRole(user.id, "trusted")}
                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", borderRadius: "6px",
                    background: "rgba(74,222,128,0.1)", border: "1px solid #4ade80",
                    color: "#4ade80", cursor: "pointer" }}>
                  → Trusted
                </button>
              )}
              {user.role !== "admin" && (
                <button onClick={() => setRole(user.id, "admin")}
                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", borderRadius: "6px",
                    background: "rgba(245,158,11,0.1)", border: "1px solid var(--color-accent)",
                    color: "var(--color-accent)", cursor: "pointer" }}>
                  → Admin
                </button>
              )}
              {user.role !== "new" && (
                <button onClick={() => setRole(user.id, "new")}
                  style={{ fontSize: "0.75rem", padding: "0.25rem 0.6rem", borderRadius: "6px",
                    background: "rgba(107,114,128,0.1)", border: "1px solid #6b7280",
                    color: "#6b7280", cursor: "pointer" }}>
                  → New
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Feed Management ─────────────────────────────────────────────────────────
function FeedManagement() {
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => { fetchFeeds(); }, []);

  const fetchFeeds = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "podcasts"), orderBy("title"), limit(500)));
      setFeeds(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const setVisibility = async (feedId, visibility) => {
    await updateDoc(doc(db, "podcasts", feedId), { visibility });
    setFeeds(prev => prev.map(f => f.id === feedId ? { ...f, visibility } : f));
  };

  const deleteFeed = async (feed) => {
    if (!confirm(`Permanently delete "${feed.title}"? This cannot be undone.`)) return;
    await deleteDoc(doc(db, "podcasts", feed.id));
    await addDoc(collection(db, "blockedFeeds"), {
      feedUrl: feed.feedUrl, title: feed.title,
      removedAt: new Date(), removedBy: "admin", reason: "admin deleted",
    });
    setFeeds(prev => prev.filter(f => f.id !== feed.id));
  };

  const filtered = feeds.filter(f => {
    const matchSearch = f.title?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || f.visibility === filter ||
      (filter === "firstparty" && f.isFirstParty);
    return matchSearch && matchFilter;
  });

  const visibilityColor = { visible: "#4ade80", hidden: "#f59e0b", removed: "#f87171" };

  if (loading) return <p style={{ color: "var(--color-text-muted)" }}>Loading {feeds.length} feeds...</p>;

  return (
    <div>
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search feeds..." style={{ flex: 1, minWidth: 200 }} />
        <select value={filter} onChange={e => setFilter(e.target.value)}
          style={{ padding: "0.5rem 0.75rem" }}>
          <option value="all">All ({feeds.length})</option>
          <option value="visible">Visible ({feeds.filter(f => f.visibility === "visible").length})</option>
          <option value="hidden">Hidden ({feeds.filter(f => f.visibility === "hidden").length})</option>
          <option value="firstparty">First-party</option>
        </select>
      </div>

      <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.75rem" }}>
        Showing {filtered.length} of {feeds.length} feeds
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {filtered.map(feed => (
          <div key={feed.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)",
            borderRadius: "8px", padding: "0.75rem", display: "flex",
            justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1, minWidth: 0 }}>
              {feed.artworkUrl && (
                <img src={feed.artworkUrl} alt="" style={{ width: 36, height: 36, borderRadius: "6px", objectFit: "cover", flexShrink: 0 }} />
              )}
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: "0.85rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {feed.isFirstParty && "🎙️ "}{feed.title}
                </p>
                <p style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>
                  <span style={{ color: visibilityColor[feed.visibility] || "#6b7280" }}>● {feed.visibility || "visible"}</span>
                  {feed.lastPolledAt && ` · polled ${feed.lastPolledAt.toDate?.().toLocaleDateString()}`}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
              {feed.visibility !== "visible" && (
                <button onClick={() => setVisibility(feed.id, "visible")}
                  style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem", borderRadius: "6px",
                    background: "rgba(74,222,128,0.1)", border: "1px solid #4ade80", color: "#4ade80", cursor: "pointer" }}>
                  Show
                </button>
              )}
              {feed.visibility !== "hidden" && (
                <button onClick={() => setVisibility(feed.id, "hidden")}
                  style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem", borderRadius: "6px",
                    background: "rgba(245,158,11,0.1)", border: "1px solid var(--color-accent)",
                    color: "var(--color-accent)", cursor: "pointer" }}>
                  Hide
                </button>
              )}
              {!feed.isFirstParty && (
                <button onClick={() => deleteFeed(feed)}
                  style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem", borderRadius: "6px",
                    background: "rgba(248,113,113,0.1)", border: "1px solid #f87171",
                    color: "#f87171", cursor: "pointer" }}>
                  Delete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export default function Admin() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("system");
  const [modCount, setModCount] = useState(0);
  const [flagCount, setFlagCount] = useState(0);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "admin")) {
      navigate("/");
    }
  }, [user, profile, loading]);

  useEffect(() => {
    fetchCounts();
  }, []);

  const fetchCounts = async () => {
    try {
      const [modSnap, flagSnap] = await Promise.all([
        getDocs(query(collection(db, "moderationQueue"), where("status", "==", "pending"))),
        getDocs(query(collection(db, "flags"), where("status", "==", "pending"))),
      ]);
      setModCount(modSnap.size);
      setFlagCount(flagSnap.size);
    } catch (err) { console.error(err); }
  };

  if (loading || !profile) return null;
  if (profile?.role !== "admin") return null;

  const TABS = [
    { id: "system", label: "⚙️ System" },
    { id: "moderation", label: `💬 Moderation${modCount > 0 ? ` (${modCount})` : ""}` },
    { id: "flags", label: `🚩 Flags${flagCount > 0 ? ` (${flagCount})` : ""}` },
    { id: "feeds", label: "📡 Feeds" },
    { id: "users", label: "👥 Users" },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", marginBottom: "0.5rem" }}>
        Admin Dashboard
      </h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem", marginBottom: "2rem" }}>
        Welcome, @{profile.username}
      </p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`feed-tab ${activeTab === tab.id ? "active" : ""}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "system" && (
        <div>
          <PollStatus onRefresh={fetchCounts} />
          <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "12px", padding: "1.5rem" }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", marginBottom: "1rem" }}>
              🔑 Registration Gate
            </h3>
            <RegistrationGate />
          </div>
        </div>
      )}
      {activeTab === "moderation" && <ModerationQueue />}
      {activeTab === "flags" && <FlagQueue />}
      {activeTab === "feeds" && <FeedManagement />}
      {activeTab === "users" && <UserManagement />}
    </div>
  );
}

// ─── Registration Gate ────────────────────────────────────────────────────────
function RegistrationGate() {
  const [mode, setMode] = useState("open");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getDoc(doc(db, "siteSettings", "registration")).then(snap => {
      if (snap.exists()) setMode(snap.data().mode || "open");
    });
  }, []);

  const save = async (newMode) => {
    setSaving(true);
    await setDoc(doc(db, "siteSettings", "registration"), { mode: newMode }, { merge: true });
    setMode(newMode);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const modes = [
    { id: "open", label: "🟢 Open", desc: "Anyone with Google account can register" },
    { id: "invite", label: "🟡 Invite Only", desc: "Requires an invite code" },
    { id: "closed", label: "🔴 Closed", desc: "No new registrations accepted" },
  ];

  return (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
      {modes.map(m => (
        <button key={m.id} onClick={() => save(m.id)}
          style={{
            padding: "0.75rem 1.25rem", borderRadius: "10px", cursor: "pointer",
            border: `2px solid ${mode === m.id ? "var(--color-accent)" : "var(--color-border)"}`,
            background: mode === m.id ? "rgba(245,158,11,0.1)" : "var(--color-bg)",
            textAlign: "left", transition: "all 0.2s"
          }}>
          <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: "0.2rem" }}>{m.label}</p>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{m.desc}</p>
        </button>
      ))}
      {saved && <p style={{ color: "#4ade80", fontSize: "0.85rem", alignSelf: "center" }}>✓ Saved!</p>}
    </div>
  );
}
