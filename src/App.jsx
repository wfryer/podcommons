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

// Guard: only redirect when we're 100% sure user has no profile
// undefined = still loading, null = confirmed no profile
function RequireProfile({ children }) {
  const { user, profile, loading } = useAuth();
  // Still resolving auth or profile — wait
  if (loading || user === undefined || profile === undefined) return null;
  // Confirmed: logged in AND no profile exists
  if (user && profile === null) return <Navigate to="/complete-profile" replace />;
  // All other cases: show the page
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
