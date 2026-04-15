const TOPICS = [
  "AI & Technology", "Education & Teaching", "Media Literacy",
  "Democracy & Civic", "Faith & Spirituality", "History",
  "Science", "Politics & Policy", "Local Charlotte/NC",
  "Health & Wellness", "Culture & Society", "Podcasting & Audio",
  "Environment", "Race & Justice", "International News",
  "Business & Economy", "Arts & Literature",
];

export default function TopicFilter({ selected, onSelect }) {
  return (
    <div style={{ marginBottom: "0.75rem" }}>
      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
        <button
          onClick={() => onSelect(null)}
          style={{
            fontSize: "0.75rem", padding: "0.25rem 0.75rem", borderRadius: "999px",
            border: `1px solid ${!selected ? "var(--color-accent)" : "var(--color-border)"}`,
            background: !selected ? "rgba(245,158,11,0.15)" : "transparent",
            color: !selected ? "var(--color-accent)" : "var(--color-text-muted)",
            cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
          }}>
          All
        </button>
        {TOPICS.map(topic => (
          <button key={topic} onClick={() => onSelect(selected === topic ? null : topic)}
            style={{
              fontSize: "0.75rem", padding: "0.25rem 0.75rem", borderRadius: "999px",
              border: `1px solid ${selected === topic ? "var(--color-accent)" : "var(--color-border)"}`,
              background: selected === topic ? "rgba(245,158,11,0.15)" : "transparent",
              color: selected === topic ? "var(--color-accent)" : "var(--color-text-muted)",
              cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
            }}>
            {topic}
          </button>
        ))}
      </div>
    </div>
  );
}
