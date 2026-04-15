import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import md5 from "md5";

function gravatarUrl(email) {
  return `https://www.gravatar.com/avatar/${md5(email.toLowerCase().trim())}?d=identicon&s=40`;
}

export default function Navbar() {
  const { user, profile, login, logout } = useAuth();
  const navigate = useNavigate();
  const [siteTitle, setSiteTitle] = useState("PodCommons");
  const [siteByline, setSiteByline] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const snap = await getDoc(doc(db, "siteSettings", "general"));
        if (snap.exists()) {
          setSiteTitle(snap.data().title || "PodCommons");
          setSiteByline(snap.data().byline || "");
        }
      } catch (err) {}
    };
    fetchSettings();
  }, []);

  return (
    <nav style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}
      className="sticky top-0 z-50 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div>
            <span style={{ fontFamily: "var(--font-display)", color: "var(--color-accent)", fontSize: "1.4rem", fontWeight: 900 }}>
              🎙️ {siteTitle}
            </span>
            {siteByline && (
              <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)", marginLeft: "0.5rem" }}>
                by {siteByline}
              </span>
            )}
          </div>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">

          <Link to="/about"
            style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}
            className="hover:text-white transition-colors hidden sm:block">
            About
          </Link>
          {user && profile && (
            <Link to={`/profile/${profile.username}?tab=queue`}
              title="My Listening Queue"
              style={{
                color: "var(--color-text-muted)", fontSize: "1.1rem",
                textDecoration: "none", display: "flex", alignItems: "center"
              }}
              className="hover:text-white transition-colors">
              🎧
            </Link>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              {profile?.role === "admin" && (
                <Link to="/admin"
                  style={{ fontSize: "0.8rem", background: "var(--color-accent)", color: "#000",
                    padding: "0.25rem 0.75rem", borderRadius: "6px", fontWeight: 600 }}>
                  Admin
                </Link>
              )}
              <button
                onClick={() => navigate(profile ? `/profile/${profile.username}` : "/complete-profile")}
                className="flex items-center gap-2">
                <img src={gravatarUrl(user.email)} alt="avatar" className="rounded-full"
                  style={{ width: 32, height: 32, border: "2px solid var(--color-border)" }} />
                <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                  {profile?.username || user.displayName?.split(" ")[0]}
                </span>
              </button>
              {!profile && (
                <Link to="/complete-profile"
                  style={{ fontSize: "0.8rem", background: "var(--color-accent)", color: "#000",
                    padding: "0.3rem 0.75rem", borderRadius: "6px", fontWeight: 600, textDecoration: "none" }}>
                  Complete profile
                </Link>
              )}
              {profile && (
                <Link to="/settings"
                  style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", padding: "0.3rem 0.5rem" }}
                  title="Edit profile">
                  ⚙️
                </Link>
              )}
              <button onClick={logout} className="btn-ghost"
                style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem" }}>
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={login}
                style={{
                  fontSize: "0.85rem", padding: "0.4rem 1rem", borderRadius: "8px",
                  border: "1px solid var(--color-border)", background: "none",
                  color: "var(--color-text-muted)", cursor: "pointer"
                }}>
                Sign in
              </button>
              <button onClick={login} className="btn-primary" style={{ fontSize: "0.85rem" }}>
                Join Community
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
