import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth.jsx";

const DEFAULT_SLIDERS = {
  discoveryVsFamiliar: 70,
  recentVsTimeless: 60,
  myTasteVsCommunity: 50,
};

export default function SliderPanel({ sliders, setSliders, activeTab, onApply, onClose }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load saved settings on mount
  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (user) {
      // Load from Firestore for logged-in users
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && snap.data().sliderSettings) {
          setSliders({ ...DEFAULT_SLIDERS, ...snap.data().sliderSettings });
        }
      } catch (err) { /* use defaults */ }
    } else {
      // Load from localStorage for logged-out users
      try {
        const saved = localStorage.getItem("podcommons_sliders");
        if (saved) setSliders({ ...DEFAULT_SLIDERS, ...JSON.parse(saved) });
      } catch (err) { /* use defaults */ }
    }
  };

  const update = (key, val) => setSliders(prev => ({ ...prev, [key]: Number(val) }));

  const handleApply = async () => {
    setSaving(true);
    // Save settings
    if (user) {
      try {
        await updateDoc(doc(db, "users", user.uid), { sliderSettings: sliders });
      } catch (err) { console.error("Could not save slider settings:", err); }
    } else {
      localStorage.setItem("podcommons_sliders", JSON.stringify(sliders));
    }
    setSaving(false);
    setSaved(true);
    onApply();
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const sliderConfig = [
    { key: "discoveryVsFamiliar", leftLabel: "Discovery", rightLabel: "Familiar",
      desc: "New shows vs. shows already indexed" },
    { key: "recentVsTimeless", leftLabel: "Recent", rightLabel: "Timeless",
      desc: "Newest episodes vs. highly-rated older ones" },
    { key: "myTasteVsCommunity", leftLabel: "Wes' Tastes", rightLabel: "Community",
      desc: "Wes' signals vs. what the community likes" },
  ];

  const isDiscover = activeTab === "discover";

  return (
    <div style={{
      background: "var(--color-surface)", border: "1px solid var(--color-border)",
      borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>⚙️ Feed Settings</p>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <a href="/about#algorithm" style={{ fontSize: "0.75rem", color: "var(--color-accent)" }}>
            How does this work? →
          </a>
          <button onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer",
              fontSize: "1.1rem", color: "var(--color-text-muted)", padding: "0 0.25rem",
              lineHeight: 1 }}>
            ✕
          </button>
        </div>
      </div>

      {!isDiscover && (
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "1rem", fontStyle: "italic" }}>
          These sliders only affect the 🧠 Discover tab.
        </p>
      )}

      {sliderConfig.map(s => (
        <div key={s.key} style={{ marginBottom: "1rem", opacity: isDiscover ? 1 : 0.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 600,
              color: sliders[s.key] < 50 ? "var(--color-accent)" : "var(--color-text-muted)" }}>
              {s.leftLabel}
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{s.desc}</span>
            <span style={{ fontSize: "0.78rem", fontWeight: 600,
              color: sliders[s.key] > 50 ? "var(--color-accent)" : "var(--color-text-muted)" }}>
              {s.rightLabel}
            </span>
          </div>
          <input
            type="range" min={0} max={100}
            value={sliders[s.key]}
            onChange={e => update(s.key, e.target.value)}
            disabled={!isDiscover}
            className="slider-track"
          />
        </div>
      ))}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem" }}>
        <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
          💡 Click any episode's <strong>🧠 chip</strong> to see exactly why it was recommended.
          {user ? " Settings saved to your profile." : " Sign in to save settings."}
        </p>
        {isDiscover && (
          <button onClick={handleApply} disabled={saving}
            className="btn-primary"
            style={{ fontSize: "0.8rem", padding: "0.4rem 1rem", whiteSpace: "nowrap",
              minWidth: 80, opacity: saving ? 0.7 : 1 }}>
            {saved ? "✓ Saved!" : saving ? "Saving..." : "Apply →"}
          </button>
        )}
      </div>
    </div>
  );
}
