import { useState, useRef, useEffect } from "react";

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AudioPlayer({ audioUrl, episodeUrl, title }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      setLoading(true);
      audioRef.current.play()
        .then(() => { setPlaying(true); setLoading(false); })
        .catch(() => { setError(true); setLoading(false); });
    }
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current?.currentTime || 0);
  };

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current?.duration || 0);
  };

  const handleSeek = (e) => {
    const pct = e.target.value / 100;
    const time = pct * duration;
    if (audioRef.current) audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <a href={episodeUrl || audioUrl} target="_blank" rel="noopener noreferrer"
        className="btn-primary"
        style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", textDecoration: "none", marginBottom: "1.5rem" }}>
        ▶ Listen to this episode ↗
      </a>
    );
  }

  return (
    <div style={{
      background: "var(--color-surface)", border: "1px solid var(--color-border)",
      borderRadius: "14px", padding: "1.25rem", marginBottom: "1.5rem"
    }}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setPlaying(false)}
        onError={() => setError(true)}
        preload="metadata"
      />

      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {/* Big play button */}
        <button onClick={togglePlay} disabled={loading}
          style={{
            width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
            background: "var(--color-accent)", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.3rem", color: "#000",
            boxShadow: "0 0 0 4px rgba(245,158,11,0.2)",
            transition: "transform 0.1s",
          }}
          onMouseDown={e => e.currentTarget.style.transform = "scale(0.95)"}
          onMouseUp={e => e.currentTarget.style.transform = "scale(1)"}
        >
          {loading ? "⟳" : playing ? "⏸" : "▶"}
        </button>

        {/* Progress */}
        <div style={{ flex: 1 }}>
          <input
            type="range" min={0} max={100}
            value={progress}
            onChange={handleSeek}
            className="slider-track"
            style={{ marginBottom: "0.3rem" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
              {formatTime(currentTime)}
            </span>
            <span style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* External link */}
        {episodeUrl && (
          <a href={episodeUrl} target="_blank" rel="noopener noreferrer"
            title="Open in podcast app"
            style={{
              fontSize: "0.8rem", color: "var(--color-text-muted)",
              textDecoration: "none", flexShrink: 0,
              border: "1px solid var(--color-border)", borderRadius: "6px",
              padding: "0.3rem 0.6rem"
            }}>
            ↗ Open
          </a>
        )}
      </div>
    </div>
  );
}
