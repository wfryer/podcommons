import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth.jsx";
import md5 from "md5";

const COMMUNITY_GROUPS = [
  { id: "mediaEdClub", label: "Media Ed Club / Media Education Lab" },
  { id: "edtechSR", label: "EdTech Situation Room listeners" },
  { id: "church", label: "Caldwell Presbyterian Church" },
  { id: "indivisible", label: "Indivisible Charlotte" },
  { id: "facebook", label: "Facebook friends" },
  { id: "other", label: "Other / Found it myself" },
];

function gravatarUrl(email) {
  return `https://www.gravatar.com/avatar/${md5(email.toLowerCase().trim())}?d=identicon&s=80`;
}

export default function Settings() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [socialLink, setSocialLink] = useState("");
  const [mastodonHandle, setMastodonHandle] = useState("");
  const [mastodonServer, setMastodonServer] = useState("");
  const [groups, setGroups] = useState([]);
  const [usernameError, setUsernameError] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    if (profile) {
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setSocialLink(profile.socialLink || "");
      setMastodonHandle(profile.mastodonHandle || "");
      setMastodonServer(profile.mastodonServer || "");
      setGroups(profile.communityGroups || []);
    }
  }, [profile, user]);

  const checkUsername = async (val) => {
    setUsername(val);
    if (val === profile?.username) { setUsernameError(""); return; }
    if (val.length < 3) { setUsernameError("At least 3 characters"); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(val)) { setUsernameError("Letters, numbers, underscores only"); return; }
    const q = query(collection(db, "users"), where("username", "==", val.toLowerCase()));
    const snap = await getDocs(q);
    if (!snap.empty) setUsernameError("That username is taken");
    else setUsernameError("");
  };

  const toggleGroup = (id) => {
    setGroups(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const handleSave = async () => {
    if (!username || usernameError) { setError("Please choose a valid username"); return; }
    if (bio.length > 101) { setError("Bio must be 101 characters or less"); return; }
    setSaving(true);
    setError("");
    try {
      await updateDoc(doc(db, "users", user.uid), {
        username: username.toLowerCase(),
        bio,
        socialLink,
        mastodonHandle: mastodonHandle.replace("@", "").trim(),
        mastodonServer: mastodonServer.trim().replace(/\/+$/, ""),
        communityGroups: groups,
      });
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    }
    setSaving(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "16px", padding: "2rem" }}>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
            <img src={gravatarUrl(user.email)} alt="avatar"
              style={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid var(--color-accent)" }} />
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem" }}>Edit Profile</h2>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.8rem" }}>{user.email}</p>
            </div>
          </div>

          <div className="mb-4">
            <label style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", display: "block", marginBottom: "0.4rem" }}>
              Username *
            </label>
            <input value={username} onChange={e => checkUsername(e.target.value)} placeholder="yourname" />
            {usernameError && <p style={{ color: "#f87171", fontSize: "0.75rem", marginTop: "0.3rem" }}>{usernameError}</p>}
          </div>

          <div className="mb-4">
            <label style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", display: "block", marginBottom: "0.4rem" }}>
              Bio <span style={{ color: "var(--color-text-muted)" }}>({bio.length}/101)</span>
            </label>
            <textarea value={bio} onChange={e => setBio(e.target.value)}
              placeholder="A short description about yourself" rows={2} maxLength={101} />
          </div>

          <div className="mb-4">
            <label style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", display: "block", marginBottom: "0.4rem" }}>
              Social / Web Link
            </label>
            <input value={socialLink} onChange={e => setSocialLink(e.target.value)}
              placeholder="https://wesfryer.com" />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", display: "block", marginBottom: "0.4rem" }}>
              Mastodon
            </label>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input value={mastodonHandle} onChange={e => setMastodonHandle(e.target.value)}
                placeholder="yourhandle" style={{ flex: 1 }} />
              <span style={{ display: "flex", alignItems: "center", color: "var(--color-text-muted)", fontSize: "1rem" }}>@</span>
              <input value={mastodonServer} onChange={e => setMastodonServer(e.target.value)}
                placeholder="triangletoot.party" style={{ flex: 2 }} />
            </div>
            <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "0.3rem" }}>
              Your Mastodon handle and server (e.g. wesfryer @ triangletoot.party)
            </p>
          </div>

          <div className="mb-6">
            <label style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", display: "block", marginBottom: "0.6rem" }}>
              Community groups
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {COMMUNITY_GROUPS.map(g => (
                <button key={g.id} onClick={() => toggleGroup(g.id)}
                  style={{
                    fontSize: "0.8rem", padding: "0.3rem 0.75rem", borderRadius: "999px",
                    border: `1px solid ${groups.includes(g.id) ? "var(--color-accent)" : "var(--color-border)"}`,
                    background: groups.includes(g.id) ? "rgba(245,158,11,0.15)" : "transparent",
                    color: groups.includes(g.id) ? "var(--color-accent)" : "var(--color-text-muted)",
                    cursor: "pointer", transition: "all 0.2s"
                  }}>
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p style={{ color: "#f87171", fontSize: "0.85rem", marginBottom: "1rem" }}>{error}</p>}
          {saved && <p style={{ color: "#4ade80", fontSize: "0.85rem", marginBottom: "1rem" }}>✓ Profile saved!</p>}

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button onClick={handleSave} disabled={saving} className="btn-primary"
              style={{ flex: 1, padding: "0.75rem", fontSize: "1rem" }}>
              {saving ? "Saving..." : "Save changes"}
            </button>
            <button onClick={() => navigate(-1)} className="btn-ghost"
              style={{ padding: "0.75rem 1.25rem", fontSize: "0.9rem" }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
