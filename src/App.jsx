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
import Navbar from "./components/Navbar";

// Only redirect to complete-profile if loading is done AND user has no profile
function RequireProfile({ children }) {
  const { user, profile, loading } = useAuth();
  // Still loading — show nothing, don't redirect yet
  if (loading) return null;
  // Loading done, user logged in, no profile found → send to complete profile
  if (!loading && user && !profile) return <Navigate to="/complete-profile" replace />;
  // Everything else — show the page
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen" style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
          <Navbar />
          <Routes>
            {/* Home requires profile */}
            <Route path="/" element={<RequireProfile><Home /></RequireProfile>} />

            {/* Always public */}
            <Route path="/about" element={<About />} />
            <Route path="/suggest" element={<Suggest />} />
            <Route path="/episode/:id" element={<Episode />} />
            <Route path="/show/:slug" element={<Show />} />
            <Route path="/profile/:username" element={<Profile />} />

            {/* Auth flows */}
            <Route path="/login" element={<Login />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/settings" element={<Settings />} />

            {/* Admin */}
            <Route path="/admin" element={<Admin />} />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
