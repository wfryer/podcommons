import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, provider, db } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);      // undefined = not yet resolved
  const [profile, setProfile] = useState(undefined); // undefined = not yet resolved
  const [loading, setLoading] = useState(true);      // true until BOTH user + profile resolved

  useEffect(() => {
    // Ensure login persists across browser sessions / app restarts
    setPersistence(auth, browserLocalPersistence).catch(console.error);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Don't set loading=false until profile fetch is also complete
      setUser(firebaseUser);

      if (firebaseUser) {
        try {
          const profileDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          // null = confirmed no profile exists
          // object = profile found
          setProfile(profileDoc.exists() ? { ...profileDoc.data(), uid: firebaseUser.uid } : null);
        } catch (err) {
          console.error("Profile fetch error:", err);
          // On error, set null so we don't loop forever
          setProfile(null);
        }
      } else {
        // No user logged in
        setProfile(null);
      }

      // Only mark loading complete AFTER both user and profile are resolved
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    try {
      // Reset to undefined while logging in so guards wait
      setProfile(undefined);
      setLoading(true);
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will fire and set everything
    } catch (error) {
      console.error("Login error:", error);
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (!auth.currentUser) return;
    try {
      const profileDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (profileDoc.exists()) {
        setProfile({ ...profileDoc.data(), uid: auth.currentUser.uid });
      }
    } catch (err) {
      console.error("Refresh profile error:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
