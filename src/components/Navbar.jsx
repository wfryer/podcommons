import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import { useEffect, useState, useRef } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

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

  // Close menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <nav style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}
      className="sticky top-0 z-50 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
            <span style={{ fontFamily: "var(--font-display)", color: "var(--color-accent)", fontSize: "1.4rem", fontWeight: 900 }}>
              🎙️ {siteTitle}
            </span>
            {siteByline && (
              <span style={{ fontSize: "0.68rem", color: "var(--color-text-muted)" }}>
                by {siteByline}
              </span>
            )}
          </div>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">

          <Link to="/search"
            title="Search episodes and podcasts"
            style={{ color: "var(--color-text-muted)", fontSize: "1.1rem",
              textDecoration: "none", display: "flex", alignItems: "center" }}
            className="hover:text-white transition-colors">
            🔍
          </Link>

          <Link to="/about"
            style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}
            className="hover:text-white transition-colors">
            About
          </Link>

          {user && profile && (
            <Link to={`/profile/${profile.username}?tab=queue`}
              title="My Listening Queue"
              style={{
                color: "var(--color-text-muted)", fontSize: "1.1rem",
                textDecoration: "none", display: "flex", alignItems: "center"
              }}>
              🎧
            </Link>
          )}

          {user ? (
            <div ref={menuRef} style={{ position: "relative" }}>
              {/* Avatar button — opens dropdown */}
              <button onClick={() => setMenuOpen(o => !o)}
                style={{ display: "flex", alignItems: "center", gap: "0.5rem",
                  background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <img src={gravatarUrl(user.email)} alt="avatar"
                  style={{ width: 36, height: 36, borderRadius: "50%",
                    border: "2px solid var(--color-border)" }} />
              </button>

              {/* Dropdown menu */}
              {menuOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0,
                  background: "var(--color-surface)", border: "1px solid var(--color-border)",
                  borderRadius: "12px", padding: "0.5rem", minWidth: 180,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.4)", zIndex: 200,
                }}>
                  {/* Username */}
                  <div style={{ padding: "0.5rem 0.75rem", borderBottom: "1px solid var(--color-border)", marginBottom: "0.25rem" }}>
                    <p style={{ fontWeight: 600, fontSize: "0.85rem" }}>@{profile?.username}</p>
                    <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{user.email}</p>
                  </div>

                  {[
                    { label: "👤 My Profile", href: profile ? `/profile/${profile.username}` : "/complete-profile" },
                    { label: "🎧 Listening Queue", href: profile ? `/profile/${profile.username}?tab=queue` : "/" },
                    { label: "⚙️ Settings", href: "/settings" },
                    ...(profile?.role === "admin" ? [{ label: "🛡️ Admin Dashboard", href: "/admin" }] : []),
                  ].map(item => (
                    <Link key={item.label} to={item.href}
                      onClick={() => setMenuOpen(false)}
                      style={{
                        display: "block", padding: "0.5rem 0.75rem", borderRadius: "8px",
                        color: "var(--color-text-muted)", textDecoration: "none",
                        fontSize: "0.85rem",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--color-bg)"}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}>
                      {item.label}
                    </Link>
                  ))}

                  <div style={{ borderTop: "1px solid var(--color-border)", marginTop: "0.25rem", paddingTop: "0.25rem" }}>
                    <button onClick={() => { logout(); setMenuOpen(false); }}
                      style={{
                        display: "block", width: "100%", textAlign: "left",
                        padding: "0.5rem 0.75rem", borderRadius: "8px",
                        color: "var(--color-text-muted)", background: "none",
                        border: "none", cursor: "pointer", fontSize: "0.85rem",
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--color-bg)"}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}>
                      Sign out
                    </button>
                  </div>
                </div>
              )}
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
              <button onClick={login} className="btn-primary hidden sm:block"
                style={{ fontSize: "0.85rem" }}>
                Join Community
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
