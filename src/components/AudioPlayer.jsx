import { useState, useRef, useEffect } from "react";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../hooks/useAuth.jsx";

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
  return `${m}:${s.toString().padStart(2,"0")}`;
}

const RESUME_KEY = (episodeId) => `podcommons_pos_${episodeId}`;
const SAVE_INTERVAL = 10; // save position every 10 seconds

export default function AudioPlayer({ audioUrl, episodeUrl, episodeId, title, imageUrl, podcastTitle }) {
  const { user } = useAuth();
  const audioRef = useRef(null);
  const saveTimerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [savedPosition, setSavedPosition] = useState(0);

  // Load saved position on mount
  useEffect(() => {
    const saved = localStorage.getItem(RESUME_KEY(episodeId));
    if (saved) {
      const pos = parseFloat(saved);
      if (pos > 10) { // only resume if more than 10 seconds in
        setSavedPosition(pos);
      }
    }
    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [episodeId]);

  const savePosition = () => {
    if (audioRef.current && audioRef.current.currentTime > 10) {
      localStorage.setItem(RESUME_KEY(episodeId), audioRef.current.currentTime.toString());
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      savePosition();
      setPlaying(false);
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    } else {
      setLoading(true);
      // Resume from saved position if not already resumed
      if (!resumed && savedPosition > 0) {
        audioRef.current.currentTime = savedPosition;
        setResumed(true);
      }
      audioRef.current.play()
        .then(() => {
          setPlaying(true);
          setLoading(false);
          // Save position every 10 seconds while playing
          saveTimerRef.current = setInterval(savePosition, SAVE_INTERVAL * 1000);
        })
        .catch(() => { setError(true); setLoading(false); });
    }
  };

  const skip = (seconds) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.min(
      Math.max(0, audioRef.current.currentTime + seconds), duration
    );
    setCurrentTime(audioRef.current.currentTime);
    savePosition();
  };

  const handleTimeUpdate = () => setCurrentTime(audioRef.current?.currentTime || 0);
  const handleLoadedMetadata = () => setDuration(audioRef.current?.duration || 0);
  const handleEnded = () => {
    setPlaying(false);
    localStorage.removeItem(RESUME_KEY(episodeId)); // clear saved position on completion
    if (saveTimerRef.current) clearInterval(saveTimerRef.current);
  };

  const handleSeek = (e) => {
    const time = (e.target.value / 100) * duration;
    if (audioRef.current) audioRef.current.currentTime = time;
    setCurrentTime(time);
    savePosition();
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;
  const remaining = duration - currentTime;

  if (error) {
    return (
      <a href={episodeUrl || audioUrl} target="_blank" rel="noopener noreferrer"
        className="btn-primary"
        style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem",
          textDecoration: "none", marginBottom: "1.5rem" }}>
        ▶ Listen to this episode ↗
      </a>
    );
  }

  return (
    <div style={{
      background: "var(--color-surface)",
      border: "1px solid var(--color-border)",
      borderRadius: "20px",
      overflow: "hidden",
      marginBottom: "1.5rem",
    }}>
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={() => setError(true)}
        preload="metadata"
      />

      {/* Artwork banner */}
      {imageUrl && (
        <div style={{
          width: "100%", height: 180, position: "relative", overflow: "hidden",
          background: "var(--color-bg)"
        }}>
          <img src={imageUrl} alt={podcastTitle || title}
            style={{ width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }} />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, transparent 40%, var(--color-surface) 100%)"
          }} />
          <div style={{
            position: "absolute", bottom: "1rem", left: "1rem", right: "1rem"
          }}>
            <p style={{ fontWeight: 700, fontSize: "1rem", color: "white",
              textShadow: "0 1px 4px rgba(0,0,0,0.8)", lineHeight: 1.3 }}>
              {title}
            </p>
            {podcastTitle && (
              <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.8)",
                textShadow: "0 1px 3px rgba(0,0,0,0.8)", marginTop: "0.2rem" }}>
                {podcastTitle}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Player controls */}
      <div style={{ padding: "1.25rem" }}>

        {/* Resume notice */}
        {savedPosition > 0 && !resumed && (
          <div style={{
            background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: "8px", padding: "0.5rem 0.875rem",
            marginBottom: "1rem", display: "flex", justifyContent: "space-between",
            alignItems: "center"
          }}>
            <p style={{ fontSize: "0.78rem", color: "var(--color-accent)" }}>
              ▶ Resume from {formatTime(savedPosition)}
            </p>
            <button onClick={() => {
              if (audioRef.current) audioRef.current.currentTime = 0;
              setSavedPosition(0);
              localStorage.removeItem(RESUME_KEY(episodeId));
            }} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "0.72rem", color: "var(--color-text-muted)"
            }}>
              Start over
            </button>
          </div>
        )}

        {/* Scrubber */}
        <div style={{ marginBottom: "0.5rem" }}>
          <input
            type="range" min={0} max={100}
            value={progress}
            onChange={handleSeek}
            style={{
              width: "100%", height: 6, cursor: "pointer",
              accentColor: "var(--color-accent)",
              background: `linear-gradient(to right, var(--color-accent) ${progress}%, var(--color-border) ${progress}%)`,
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.3rem" }}>
            <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums" }}>
              {formatTime(currentTime)}
            </span>
            <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums" }}>
              -{formatTime(remaining)}
            </span>
          </div>
        </div>

        {/* Main controls */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "center", gap: "1.5rem", marginTop: "0.75rem"
        }}>

          {/* Rewind 30s */}
          <button onClick={() => skip(-30)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: "0.2rem", padding: "0.5rem",
            }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 6C11.373 6 6 11.373 6 18s5.373 12 12 12 12-5.373 12-12" 
                stroke="var(--color-text-muted)" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M18 6l-4 4 4 4" stroke="var(--color-text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <text x="18" y="21" textAnchor="middle" fontSize="9" fill="var(--color-text-muted)" fontWeight="600">30</text>
            </svg>
          </button>

          {/* Big Play/Pause button */}
          <button onClick={togglePlay} disabled={loading}
            style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "var(--color-accent)",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.8rem", color: "#000",
              boxShadow: "0 4px 20px rgba(245,158,11,0.4)",
              transition: "transform 0.1s, box-shadow 0.1s",
              flexShrink: 0,
            }}
            onMouseDown={e => {
              e.currentTarget.style.transform = "scale(0.93)";
              e.currentTarget.style.boxShadow = "0 2px 10px rgba(245,158,11,0.3)";
            }}
            onMouseUp={e => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(245,158,11,0.4)";
            }}
          >
            {loading ? "⟳" : playing ? "⏸" : "▶"}
          </button>

          {/* Forward 30s */}
          <button onClick={() => skip(30)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: "0.2rem", padding: "0.5rem",
            }}>
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <path d="M18 6C24.627 6 30 11.373 30 18s-5.373 12-12 12-12-5.373-12-12"
                stroke="var(--color-text-muted)" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M18 6l4 4-4 4" stroke="var(--color-text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <text x="18" y="21" textAnchor="middle" fontSize="9" fill="var(--color-text-muted)" fontWeight="600">30</text>
            </svg>
          </button>
        </div>

        {/* Open externally */}
        {episodeUrl && (
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <a href={episodeUrl} target="_blank" rel="noopener noreferrer"
              style={{
                fontSize: "0.78rem", color: "var(--color-text-muted)",
                textDecoration: "none",
              }}>
              Open Original Podcast Link ↗
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
