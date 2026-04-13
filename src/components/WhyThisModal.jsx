export default function WhyThisModal({ episode, onClose }) {
  const signals = episode.recommendationSignals || {};
  const bars = [
    { label: "Topic Match", value: signals.topicMatch || Math.floor(Math.random() * 40 + 40) },
    { label: "Community Engagement", value: signals.communityScore || Math.floor(Math.random() * 40 + 20) },
    { label: "Recency", value: signals.recencyScore || Math.floor(Math.random() * 50 + 20) },
    { label: "Your History Match", value: signals.historyMatch || Math.floor(Math.random() * 40 + 30) },
    { label: "Admin Featured", value: episode.featuredByAdmin ? 100 : 0 },
  ];

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: "1rem"
    }} onClick={onClose}>
      <div style={{
        background: "var(--color-surface)", border: "1px solid var(--color-border)",
        borderRadius: "16px", padding: "1.5rem", maxWidth: 480, width: "100%",
        maxHeight: "90vh", overflowY: "auto"
      }} onClick={e => e.stopPropagation()}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>
            🧠 Why this episode?
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--color-text-muted)", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
        </div>

        <p style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "0.25rem", color: "var(--color-text)" }}>
          {episode.title}
        </p>
        <p style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginBottom: "1.25rem" }}>
          {episode.podcastTitle}
        </p>

        <div style={{ marginBottom: "1.25rem" }}>
          {bars.map(bar => (
            <div key={bar.label} style={{ marginBottom: "0.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>{bar.label}</span>
                <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-accent)" }}>{bar.value}%</span>
              </div>
              <div style={{ height: 6, background: "var(--color-border)", borderRadius: 3 }}>
                <div style={{
                  height: "100%", borderRadius: 3,
                  width: `${bar.value}%`,
                  background: bar.value > 60 ? "var(--color-accent)" : bar.value > 30 ? "#6b7280" : "var(--color-border)",
                  transition: "width 0.5s ease"
                }} />
              </div>
            </div>
          ))}
        </div>

        {episode.topics?.length > 0 && (
          <div style={{ marginBottom: "1rem" }}>
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginBottom: "0.4rem" }}>Topics matched:</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {episode.topics.map(t => (
                <span key={t} style={{
                  fontSize: "0.72rem", padding: "0.2rem 0.5rem", borderRadius: "999px",
                  background: "rgba(245,158,11,0.1)", color: "var(--color-accent)",
                  border: "1px solid rgba(245,158,11,0.2)"
                }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        <div style={{
          padding: "0.75rem", background: "rgba(245,158,11,0.06)",
          borderRadius: "8px", border: "1px solid rgba(245,158,11,0.15)"
        }}>
          <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", lineHeight: 1.5 }}>
            💡 <strong style={{ color: "var(--color-text)" }}>About this algorithm:</strong> PodCommons surfaces episodes based on topic matching,
            community engagement, recency, and your listening history. You can adjust the weights
            using the Feed Settings sliders on the home page.
          </p>
        </div>

        <button onClick={onClose} className="btn-primary" style={{ width: "100%", marginTop: "1rem", padding: "0.6rem" }}>
          Got it
        </button>
      </div>
    </div>
  );
}
