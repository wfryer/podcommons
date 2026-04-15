import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, provider, db } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = not yet resolved
  const [profile, setProfile] = useState(undefined); // undefined = not yet resolved
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const profileDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          setProfile(profileDoc.exists() ? profileDoc.data() : null);
          // null = confirmed no profile exists
        } catch (err) {
          console.error("Profile fetch error:", err);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      try {
        const profileDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (profileDoc.exists()) setProfile(profileDoc.data());
      } catch (err) {
        console.error("Refresh profile error:", err);
      }
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
