const TOPICS = [
  "AI & Technology", "Education & Teaching", "Media Literacy",
  "Democracy & Civic", "Faith & Spirituality", "History",
  "Science", "Politics & Policy", "Local Charlotte/NC",
  "Health & Wellness", "Culture & Society", "Podcasting & Audio",
  "Environment", "Race & Justice", "International News",
  "Business & Economy", "Arts & Literature", "True Crime",
  "Sports", "Entertainment & Celebrity"
];

export default function TopicFilter({ selected, onSelect }) {
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <p style={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em",
        color: "var(--color-text-muted)", textTransform: "uppercase",
        marginBottom: "0.5rem" }}>
        Filter by topic
      </p>
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        <button onClick={() => onSelect(null)} style={{
          fontSize: "0.75rem", padding: "0.3rem 0.875rem", borderRadius: "999px",
          border: `1px solid ${!selected ? "var(--color-accent)" : "var(--color-border)"}`,
          background: !selected ? "rgba(245,158,11,0.15)" : "transparent",
          color: !selected ? "var(--color-accent)" : "var(--color-text-muted)",
          cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
          fontWeight: !selected ? 600 : 400,
        }}>
          All
        </button>
        {TOPICS.map(topic => (
          <button key={topic} onClick={() => onSelect(selected === topic ? null : topic)}
            style={{
              fontSize: "0.75rem", padding: "0.3rem 0.875rem", borderRadius: "999px",
              border: `1px solid ${selected === topic ? "var(--color-accent)" : "var(--color-border)"}`,
              background: selected === topic ? "rgba(245,158,11,0.15)" : "transparent",
              color: selected === topic ? "var(--color-accent)" : "var(--color-text-muted)",
              cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
              fontWeight: selected === topic ? 600 : 400,
            }}>
            {topic}
          </button>
        ))}
      </div>
      {selected && (
        <p style={{ fontSize: "0.72rem", color: "var(--color-text-muted)", marginTop: "0.4rem" }}>
          Showing episodes tagged <strong style={{ color: "var(--color-accent)" }}>{selected}</strong>
          {" "}· <button onClick={() => onSelect(null)}
            style={{ background: "none", border: "none", cursor: "pointer",
              color: "var(--color-accent)", fontSize: "0.72rem", padding: 0 }}>
            Clear filter ✕
          </button>
        </p>
      )}
    </div>
  );
}
