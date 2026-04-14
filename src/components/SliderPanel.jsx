export default function SliderPanel({ sliders, setSliders, activeTab, onApply }) {
  const update = (key, val) => setSliders(prev => ({ ...prev, [key]: Number(val) }));

  const sliderConfig = [
    { key: "discoveryVsFamiliar", leftLabel: "Discovery", rightLabel: "Familiar",
      desc: "New shows vs. shows you already know" },
    { key: "recentVsTimeless", leftLabel: "Recent", rightLabel: "Timeless",
      desc: "Newest episodes vs. highly-rated older ones" },
    { key: "myTasteVsCommunity", leftLabel: "My Taste", rightLabel: "Community",
      desc: "Wes's signals vs. what the community loves" },
  ];

  const isDiscover = activeTab === "discover";

  return (
    <div style={{
      background: "var(--color-surface)", border: "1px solid var(--color-border)",
      borderRadius: "12px", padding: "1.25rem", marginBottom: "1rem"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <p style={{ fontWeight: 600, fontSize: "0.9rem" }}>⚙️ Feed Settings</p>
        <a href="/about#algorithm" style={{ fontSize: "0.75rem", color: "var(--color-accent)" }}>
          How does this work? →
        </a>
      </div>

      {!isDiscover && (
        <p style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginBottom: "1rem", fontStyle: "italic" }}>
          These sliders only affect the 🧠 Discover tab.
        </p>
      )}

      {sliderConfig.map(s => (
        <div key={s.key} style={{ marginBottom: "1rem", opacity: isDiscover ? 1 : 0.5 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: sliders[s.key] < 50 ? "var(--color-accent)" : "var(--color-text-muted)" }}>
              {s.leftLabel}
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{s.desc}</span>
            <span style={{ fontSize: "0.78rem", fontWeight: 600, color: sliders[s.key] > 50 ? "var(--color-accent)" : "var(--color-text-muted)" }}>
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
        </p>
        {isDiscover && (
          <button onClick={onApply} className="btn-primary"
            style={{ fontSize: "0.8rem", padding: "0.4rem 1rem", whiteSpace: "nowrap" }}>
            Apply →
          </button>
        )}
      </div>
    </div>
  );
}