import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, setDoc, collection, query, where, getDocs, getDoc } from "firebase/firestore";
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

export default function CompleteProfile() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [socialLink, setSocialLink] = useState("");
  const [groups, setGroups] = useState([]);
  const [inviteCode, setInviteCode] = useState("");
  const [registrationMode, setRegistrationMode] = useState("open");
  const [error, setError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    // Check registration mode
    const fetchSettings = async () => {
      const snap = await getDoc(doc(db, "siteSettings", "registration"));
      if (snap.exists()) setRegistrationMode(snap.data().mode || "open");
    };
    fetchSettings();
  }, [user]);

  const checkUsername = async (val) => {
    setUsername(val);
    if (val.length < 3) { setUsernameError("Username must be at least 3 characters"); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(val)) { setUsernameError("Letters, numbers, and underscores only"); return; }
    const q = query(collection(db, "users"), where("username", "==", val.toLowerCase()));
    const snap = await getDocs(q);
    if (!snap.empty) setUsernameError("That username is taken");
    else setUsernameError("");
  };

  const toggleGroup = (id) => {
    setGroups(prev => prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]);
  };

  const handleSubmit = async () => {
    if (!username || usernameError) { setError("Please choose a valid username"); return; }
    if (bio.length > 101) { setError("Bio must be 101 characters or less"); return; }
    if (registrationMode === "invite" && !inviteCode) { setError("Please enter your invite code"); return; }

    setSaving(true);
    setError("");

    try {
      // Validate invite code if needed
      if (registrationMode === "invite") {
        const codeQuery = query(
          collection(db, "inviteCodes"),
          where("code", "==", inviteCode.toUpperCase()),
          where("isActive", "==", true)
        );
        const codeSnap = await getDocs(codeQuery);
        if (codeSnap.empty) {
          setError("That invite code isn't valid. Check for typos or contact us for a new one.");
          setSaving(false);
          return;
        }
        const codeData = codeSnap.docs[0].data();
        if (codeData.maxUses && codeData.useCount >= codeData.maxUses) {
          setError("That invite code has reached its maximum uses. Please contact us for a new one.");
          setSaving(false);
          return;
        }
        if (codeData.expiresAt && codeData.expiresAt.toDate() < new Date()) {
          setError("That invite code has expired. Please contact us for a new one.");
          setSaving(false);
          return;
        }
      }

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        username: username.toLowerCase(),
        bio,
        socialLink,
        gravatarHash: md5(user.email.toLowerCase().trim()),
        communityGroups: groups,
        role: "new",
        inviteCodeUsed: registrationMode === "invite" ? inviteCode.toUpperCase() : null,
        createdAt: new Date(),
        approvedAt: null,
        approvedBy: null,
      });

      await refreshProfile();
      navigate("/");
    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    }
    setSaving(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "16px", padding: "2rem" }}>

          <div className="flex items-center gap-4 mb-6">
            <img src={gravatarUrl(user.email)} alt="avatar"
              style={{ width: 64, height: 64, borderRadius: "50%", border: "2px solid var(--color-accent)" }} />
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}>Complete your profile</h2>
              <p style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>{user.email}</p>
            </div>
          </div>

          {registrationMode === "invite" && (
            <div className="mb-5">
              <label style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", display: "block", marginBottom: "0.4rem" }}>
                Invite Code *
              </label>
              <input
                value={inviteCode}
                onChange={e => setInviteCode(e.target.value)}
                placeholder="Enter your invite code"
                style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}
              />
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.3rem" }}>
                PodCommons is currently invite-only. Don't have a code?{" "}
                <a href="mailto:wes@wesfryer.com" style={{ color: "var(--color-accent)" }}>Contact Wes</a>
              </p>
            </div>
          )}

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
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="A short description about yourself"
              rows={2}
              maxLength={101}
            />
          </div>

          <div className="mb-5">
            <label style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", display: "block", marginBottom: "0.4rem" }}>
              Social / Web Link
            </label>
            <input value={socialLink} onChange={e => setSocialLink(e.target.value)} placeholder="https://mastodon.social/@you" />
          </div>

          <div className="mb-6">
            <label style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", display: "block", marginBottom: "0.6rem" }}>
              How did you find PodCommons? (select all that apply)
            </label>
            <div className="flex flex-wrap gap-2">
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

          <button onClick={handleSubmit} disabled={saving} className="btn-primary w-full"
            style={{ width: "100%", padding: "0.75rem", fontSize: "1rem" }}>
            {saving ? "Saving..." : "Join PodCommons →"}
          </button>

          <div style={{ marginTop: "1.5rem", padding: "1rem", background: "rgba(245,158,11,0.08)", borderRadius: "8px", border: "1px solid rgba(245,158,11,0.2)" }}>
            <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
              <strong style={{ color: "var(--color-accent)" }}>Welcome to the community!</strong> Your likes and comments will be reviewed
              before appearing publicly. Once you're a known quantity, you'll be upgraded to Trusted status.
              This keeps our community healthy and spam-free.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
