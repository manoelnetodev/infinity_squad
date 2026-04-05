import { useState, useEffect } from "react";
import { useSquadSocket } from "@/hooks/useSquadSocket";
import { PhaserGame } from "@/office/PhaserGame";

const HEADER_TEXT = "Infinity Squad";
const TYPE_SPEED = 80; // ms per character

function TypewriterHeader() {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(HEADER_TEXT.slice(0, i));
      if (i >= HEADER_TEXT.length) {
        clearInterval(interval);
        setTimeout(() => setDone(true), 600);
      }
    }, TYPE_SPEED);
    return () => clearInterval(interval);
  }, []);

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        padding: "0 20px",
        height: 48,
        minHeight: 48,
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-sidebar)",
        fontFamily: "'Rajdhani', sans-serif",
        fontSize: 20,
        fontWeight: 700,
        letterSpacing: 3,
        textTransform: "uppercase",
        color: "#ff2d2d",
      }}
    >
      {displayed}
      {!done && (
        <span
          style={{
            display: "inline-block",
            width: 2,
            height: "1.1em",
            marginLeft: 2,
            background: "#ff2d2d",
            animation: "blink-caret 0.6s step-end infinite",
          }}
        />
      )}
    </header>
  );
}

export function App() {
  useSquadSocket();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
    >
      <TypewriterHeader />

      {/* Main content — full width, no sidebar */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <PhaserGame />
      </div>
    </div>
  );
}
