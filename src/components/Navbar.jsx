import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";
import md5 from "md5";

function gravatarUrl(email) {
  return `https://www.gravatar.com/avatar/${md5(email.toLowerCase().trim())}?d=identicon&s=40`;
}

export default function Navbar() {
  const { user, profile, login, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <nav style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}
      className="sticky top-0 z-50 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span style={{ fontFamily: "var(--font-display)", color: "var(--color-accent)", fontSize: "1.4rem", fontWeight: 900 }}>
            🎙️ PodCommons
          </span>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <Link to="/suggest"
            style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}
            className="hover:text-white transition-colors hidden sm:block">
            Suggest a Podcast
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              {profile?.role === "admin" && (
                <Link to="/admin"
                  style={{ fontSize: "0.8rem", background: "var(--color-accent)", color: "#000", padding: "0.25rem 0.75rem", borderRadius: "6px", fontWeight: 600 }}>
                  Admin
                </Link>
              )}
              <button
                onClick={() => profile?.username ? navigate(`/profile/${profile.username}`) : null}
                className="flex items-center gap-2">
                <img
                  src={gravatarUrl(user.email)}
                  alt="avatar"
                  className="rounded-full"
                  style={{ width: 32, height: 32, border: "2px solid var(--color-border)" }}
                />
                <span style={{ fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
                  {profile?.username || user.displayName?.split(" ")[0]}
                </span>
              </button>
              <button onClick={logout} className="btn-ghost" style={{ fontSize: "0.8rem", padding: "0.3rem 0.75rem" }}>
                Sign out
              </button>
            </div>
          ) : (
            <button onClick={login} className="btn-primary" style={{ fontSize: "0.85rem" }}>
              Join Community
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
