import { useState, useEffect } from "react";
import { useSquadSocket } from "@/hooks/useSquadSocket";
import { PhaserGame } from "@/office/PhaserGame";

const HEADER_TEXT = "Infinity Squad";
const TYPE_SPEED = 80;

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
        justifyContent: "space-between",
        padding: "0 24px",
        height: 56,
        minHeight: 56,
        borderBottom: "1px solid rgba(16, 185, 129, 0.15)",
        background: "linear-gradient(90deg, #080c16 0%, #0f1629 50%, #080c16 100%)",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <img
          src="/assets/logo.png"
          alt="Logo"
          style={{
            height: 32,
            width: 32,
            objectFit: "contain",
            filter: "drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))",
          }}
        />
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 1.5,
            color: "#ffffff",
          }}
        >
          {displayed}
          {!done && (
            <span
              style={{
                display: "inline-block",
                width: 2,
                height: "1.1em",
                marginLeft: 3,
                background: "#10b981",
                animation: "blink-caret 0.6s step-end infinite",
                verticalAlign: "text-bottom",
              }}
            />
          )}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12,
          color: "#6b7894",
          fontWeight: 500,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#10b981",
            boxShadow: "0 0 6px #10b981",
          }}
        />
        BMAD Method
      </div>
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

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <PhaserGame />
      </div>
    </div>
  );
}
