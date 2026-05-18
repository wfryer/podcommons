import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth.jsx";
import Home from "./pages/Home";
import Login from "./pages/Login";
import CompleteProfile from "./pages/CompleteProfile";
import Episode from "./pages/Episode";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import Suggest from "./pages/Suggest";
import Show from "./pages/Show";
import Settings from "./pages/Settings";
import About from "./pages/About";
import Search from "./pages/Search";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Guard: only redirect to complete-profile when we are 100% certain
// the user is logged in AND has no profile document in Firestore.
// - user === undefined → auth not yet resolved, show nothing
// - profile === undefined → profile fetch not yet complete, show nothing
// - loading === true → either of the above, show nothing
// - user && profile === null → confirmed no profile, redirect
function RequireProfile({ children }) {
  const { user, profile, loading } = useAuth();

  // Still resolving — show a minimal loading state, never redirect
  if (loading || user === undefined || profile === undefined) {
    return (
      <div style={{
        minHeight: "60vh", display: "flex", alignItems: "center",
        justifyContent: "center", color: "var(--color-text-muted)"
      }}>
        <p style={{ fontSize: "0.85rem" }}>Loading...</p>
      </div>
    );
  }

  // Not logged in — show home page in logged-out state
  if (!user) return children;

  // Logged in, profile confirmed missing → send to complete profile
  if (profile === null) return <Navigate to="/complete-profile" replace />;

  // Logged in with profile → show page
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen" style={{ background: "var(--color-bg)", color: "var(--color-text)",
          display: "flex", flexDirection: "column" }}>
          <Navbar />
          <div style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<RequireProfile><Home /></RequireProfile>} />
              <Route path="/about" element={<About />} />
              <Route path="/search" element={<Search />} />
              <Route path="/suggest" element={<Suggest />} />
              <Route path="/episode/:id" element={<Episode />} />
              <Route path="/show/:slug" element={<Show />} />
              <Route path="/profile/:username" element={<Profile />} />
              <Route path="/login" element={<Login />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
