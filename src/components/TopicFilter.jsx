import { useState, useRef, useEffect } from "react";

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
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block", marginBottom: "0.75rem" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          fontSize: "0.8rem", padding: "0.4rem 0.875rem", borderRadius: "8px",
          border: `1px solid ${selected ? "var(--color-accent)" : "var(--color-border)"}`,
          background: selected ? "rgba(245,158,11,0.1)" : "none",
          color: selected ? "var(--color-accent)" : "var(--color-text-muted)",
          cursor: "pointer",
        }}>
        🏷️ {selected || "Filter by Topic"} {open ? "▲" : "▼"}
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0,
          background: "var(--color-surface)", border: "1px solid var(--color-border)",
          borderRadius: "12px", padding: "0.5rem",
          zIndex: 100, minWidth: 220, maxHeight: 360, overflowY: "auto",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        }}>
          <button onClick={() => { onSelect(null); setOpen(false); }}
            style={{
              display: "block", width: "100%", textAlign: "left",
              padding: "0.5rem 0.75rem", borderRadius: "6px",
              background: !selected ? "rgba(245,158,11,0.1)" : "none",
              color: !selected ? "var(--color-accent)" : "var(--color-text-muted)",
              border: "none", cursor: "pointer", fontSize: "0.82rem",
              fontWeight: !selected ? 600 : 400,
            }}>
            All topics
          </button>
          {TOPICS.map(topic => (
            <button key={topic} onClick={() => { onSelect(topic); setOpen(false); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                padding: "0.5rem 0.75rem", borderRadius: "6px",
                background: selected === topic ? "rgba(245,158,11,0.1)" : "none",
                color: selected === topic ? "var(--color-accent)" : "var(--color-text-muted)",
                border: "none", cursor: "pointer", fontSize: "0.82rem",
                fontWeight: selected === topic ? 600 : 400,
              }}>
              {selected === topic ? "✓ " : ""}{topic}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
