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
import Navbar from "./components/Navbar";

// Guard: logged in but no profile → send to complete-profile
function RequireProfile({ children }) {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (user && !profile) return <Navigate to="/complete-profile" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen" style={{ background: "var(--color-bg)", color: "var(--color-text)" }}>
          <Navbar />
          <Routes>
            <Route path="/" element={
              <RequireProfile><Home /></RequireProfile>
            } />
            <Route path="/login" element={<Login />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            <Route path="/episode/:id" element={<Episode />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/suggest" element={<Suggest />} />
            <Route path="/show/:slug" element={<Show />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
