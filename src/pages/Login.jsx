import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.jsx";

export default function Login() {
  const { user, profile, login, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      if (profile) navigate("/");
      else navigate("/complete-profile");
    }
  }, [user, profile, loading]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "2.5rem", color: "var(--color-accent)" }}>
          🎙️ PodCommons
        </h1>
        <p style={{ color: "var(--color-text-muted)", marginTop: "0.75rem", marginBottom: "2rem" }}>
          A community podcast discovery engine with transparent algorithms.
          Listen together. Understand the algorithm. Amplify what matters.
        </p>
        <button onClick={login} className="btn-primary" style={{ fontSize: "1rem", padding: "0.75rem 2rem" }}>
          Sign in with Google
        </button>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.75rem", marginTop: "1rem" }}>
          You can browse without signing in. Sign in to like, comment, and join the community.
        </p>
      </div>
    </div>
  );
}
