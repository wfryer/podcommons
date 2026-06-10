import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth.jsx";

const DEFAULT_SLIDERS = {
  discoveryVsFamiliar: 60,
  recentVsTimeless: 55,
  myTasteVsCommunity: 92,
};

export default function SliderPanel({ sliders, setSliders, onApply, onClose }) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadSettings(); }, [user]);

  const loadSettings = async () => {
    if (user) {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists() && snap.data().sliderSettings) {
          setSliders({ ...DEFAULT_SLIDERS, ...snap.data().sliderSettings });
        }
      } catch (err) { /* use defaults */ }
    } else {
      try {
        const saved = localStorage.getItem("podcommons_sliders");
        if (saved) setSliders({ ...DEFAULT_SLIDERS, ...JSON.parse(saved) });
      } catch (err) { /* use defaults */ }
    }
  };

  const update = (key, val) => setSliders(prev => ({ ...prev, [key]: Number(val) }));

  const handleApply = async () => {
    setSaving(true);
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
    setTimeout(() => { setSaved(false); onClose(); }, 800);
  };

  const sliderConfig = [
    {
      key: "discoveryVsFamiliar",
      leftLabel: "Discovery",
      rightLabel: "Familiar",
      desc: "Surface new shows vs. shows already in your history",
    },
    {
      key: "recentVsTimeless",
      leftLabel: "Recent",
      rightLabel: "Timeless",
      desc: "Weight newest episodes vs. highly-rated older ones",
    },
    {
      key: "myTasteVsCommunity",
      leftLabel: "Curator's Taste",
      rightLabel: "Community",
      desc: "Curator's AI taste signals vs. what the community engages with",
    },
  ];

  return (
    <div style={{
      background: "var(--color-surface)", border: "1px solid var(--color-border)",
      borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
        <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>⚙️ Fine-tune Recommended</p>
        <button onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer",
            fontSize: "1.1rem", color: "var(--color-text-muted)", padding: "0 0.25rem", lineHeight: 1 }}>
          ✕
        </button>
      </div>

      <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "1rem", fontStyle: "italic" }}>
        These settings adjust how the curator's algorithm weights episodes. They affect the Recommended feed only.
      </p>

      {sliderConfig.map(s => (
        <div key={s.key} style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 600,
              color: sliders[s.key] < 50 ? "var(--color-accent)" : "var(--color-text-muted)" }}>
              {s.leftLabel}
            </span>
            <span style={{ fontSize: "0.7rem", color: "var(--color-text-muted)" }}>{s.desc}</span>
            <span style={{ fontSize: "0.78rem", fontWeight: 600,
              color: sliders[s.key] > 50 ? "var(--color-accent)" : "var(--color-text-muted)" }}>
              {s.rightLabel}
            </span>
          </div>
          <input type="range" min={0} max={100}
            value={sliders[s.key]}
            onChange={e => update(s.key, e.target.value)}
            className="slider-track"
          />
        </div>
      ))}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem" }}>
        <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
          💡 Click any episode's <strong>🧠 chip</strong> to see why it was recommended.
          {user ? " Settings saved to your profile." : " Sign in to save settings."}
        </p>
        <button onClick={handleApply} disabled={saving} className="btn-primary"
          style={{ fontSize: "0.8rem", padding: "0.4rem 1rem", whiteSpace: "nowrap",
            minWidth: 80, opacity: saving ? 0.7 : 1 }}>
          {saved ? "✓ Saved!" : saving ? "Saving..." : "Apply →"}
        </button>
      </div>
    </div>
  );
}
