import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import PlayersList from "../components/PlayersList";
import Chat from "../components/Chat";
import BombeTimer from "../components/BombeTimer";
import EnigmesGridMenu from "../components/EnigmesGrid";
import EnigmePresence from "../components/EnigmePresence";
import ToolsMenu from "../components/ToolsMenu";
import PuzzleSuccessBanner from "../components/PuzzleSuccessBanner";
import useRoomState from "../hooks/useRoomState";
import useEnigmeCompletion from "../hooks/useEnigmeCompletion";
import { setEnigmeStatus } from "../utils/enigmesProgress";
import socket from "../socket";
import "./lobby.css";

export default function Enigme3() {
  const navigate = useNavigate();
  const location = useLocation();
  const { room, players, chat, timerRemaining, sendMessage, missionStarted, missionFailed } =
    useRoomState();
  const isCompleted = useEnigmeCompletion("enigme3", room);

  const [puzzleState, setPuzzleState] = useState({
    selections: {},
    feedback: {},
    completed: false
  });
  const [hoveredWallet, setHoveredWallet] = useState(null);
  const [dragOverWallet, setDragOverWallet] = useState(null);

  const wallets = [
    {
      name: "Wallet A",
      icon: "💼",
      hint:
        "Archiviste — garde l’historique complet des blocs et des transactions. Son mécanisme est conçu pour préserver la mémoire; seule une clé stable, 'précieuse' et robuste l’ouvrira."
    },
    {
      name: "Wallet B",
      icon: "💰",
      hint:
        "Rapide — conçu pour le débit et la réactivité. Il ne retient pas tout l’historique: il privilégie la légèreté et la vitesse plutôt que la conservation."
    },
    {
      name: "Wallet C",
      icon: "👜",
      hint:
        "Exécutant — n’archive pas mais orchestre des smart contracts et scripts complexes. Il exige précision et finesse pour déclencher correctement ses routines."
    }
  ];

  const keys = [
    { name: "Key1", tone: "gold" },
    { name: "Key2", tone: "cyan" },
    { name: "Key3", tone: "rose" }
  ];

  const correctMapping = { "Wallet A": "Key1", "Wallet B": "Key2", "Wallet C": "Key3" };
  const allCorrect =
    puzzleState.completed ||
    wallets.every(({ name }) => puzzleState.selections[name] === correctMapping[name]);

  useEffect(() => {
    if (!missionStarted && !missionFailed) navigate("/preparation", { replace: true });
  }, [missionFailed, missionStarted, navigate]);

  useEffect(() => {
    if (missionFailed && location.pathname !== "/defaite") navigate("/defaite", { replace: true });
  }, [location, missionFailed, navigate]);

  useEffect(() => {
    if (!room) {
      setPuzzleState({ selections: {}, feedback: {}, completed: false });
      return () => {};
    }

    let canceled = false;

    const applySharedState = (payload = {}) => {
      if (canceled) {
        return;
      }

      const nextSelections =
        payload.selections && typeof payload.selections === "object"
          ? { ...payload.selections }
          : {};
      const nextFeedback =
        payload.feedback && typeof payload.feedback === "object" ? { ...payload.feedback } : {};
      const completed = Boolean(payload.completed);

      setPuzzleState({ selections: nextSelections, feedback: nextFeedback, completed });

      if (completed) {
        setEnigmeStatus(room, "enigme3", true);
      }
    };

    socket.on("enigme3:state", applySharedState);
    socket.emit("enigme3:requestState", { room }, (initialState) => {
      applySharedState(initialState || {});
    });

    return () => {
      canceled = true;
      socket.off("enigme3:state", applySharedState);
    };
  }, [room]);

  const handleDebugComplete = () => {
    if (!room || isCompleted || puzzleState.completed) return;
    Object.entries(correctMapping).forEach(([walletName, keyName]) => {
      socket.emit("enigme3:assignKey", { room, wallet: walletName, key: keyName }, () => {});
    });
    socket.emit("enigme3:validate", { room });
    setEnigmeStatus(room, "enigme3", true);
    socket.emit("enigmeStatusUpdate", { room, key: "enigme3", completed: true });
  };

  // drag handlers
  const handleDragStart = (event, keyName) => {
    if (puzzleState.completed) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.setData("text/plain", keyName);
    setDragOverWallet(null);
  };

  const handleDragOver = (event, walletName) => {
    if (puzzleState.completed) {
      return;
    }
    event.preventDefault();
    setDragOverWallet(walletName);
  };

  const handleDragLeave = () => {
    setDragOverWallet(null);
  };

  const handleDrop = (event, walletName) => {
    if (puzzleState.completed || !missionStarted || !room) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const keyName = event.dataTransfer.getData("text/plain");
    if (!keyName) {
      return;
    }

    if (puzzleState.selections[walletName] === keyName) {
      setDragOverWallet(null);
      return;
    }

    socket.emit("enigme3:assignKey", { room, wallet: walletName, key: keyName }, () => {});
    setDragOverWallet(null);
  };

  const handleCheck = () => {
    if (!room || puzzleState.completed) {
      return;
    }
    socket.emit("enigme3:validate", { room });
  };

  const KeySVG = ({ id, size = 56 }) => {
    const tone = keys.find((k) => k.name === id)?.tone || "gray";
    const stroke =
      tone === "gold" ? "#D4AF37" : tone === "cyan" ? "#2EE0E6" : tone === "rose" ? "#FF69B4" : "#DDD";
    return (
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        whileHover={{ scale: 1.06, y: -6 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <circle cx="20" cy="20" r="10" stroke={stroke} strokeWidth="2.5" fill="rgba(255,255,255,0.01)" />
        <rect x="28" y="18" width="22" height="6" rx="2" stroke={stroke} strokeWidth="2.5" fill="none" />
        <rect x="44" y="22" width="4" height="12" rx="1" stroke={stroke} strokeWidth="2.5" fill="none" />
        <rect x="36" y="28" width="3" height="4" fill={stroke} />
        <rect x="40" y="28" width="3" height="4" fill={stroke} />
      </motion.svg>
    );
  };

  const ConfettiLayer = () => (
    <motion.div className="absolute inset-0 pointer-events-none z-40">
      {[...Array(26)].map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.8;
        const emoji = ["🎉", "✨", "💎", "🔆"][Math.floor(Math.random() * 4)];
        return (
          <motion.div
            key={i}
            initial={{ y: -40, x: `${left}vw`, opacity: 0 }}
            animate={{ y: ["-20vh", "80vh"], opacity: [0, 1, 0] }}
            transition={{ duration: 2.2 + Math.random() * 1.2, delay }}
            style={{ position: "absolute", left: `${left}vw`, fontSize: 18 + Math.random() * 20 }}
          >
            {emoji}
          </motion.div>
        );
      })}
    </motion.div>
  );

  const bgStyle = {
    background:
      "radial-gradient(ellipse at 10% 10%, rgba(9,10,25,0.6), rgba(4,4,10,0.95)), linear-gradient(180deg, rgba(10,0,30,0.7), rgba(0,0,0,0.85))",
    minHeight: "60vh",
    borderRadius: 12,
    padding: 28
  };

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="game-header-section game-header-section--info">
          <EnigmesGridMenu active="enigme3" room={room} />
          <EnigmePresence players={players} scene="enigme3" />
        </div>

        <div className="game-header-section game-header-section--timer">
          <BombeTimer remainingSeconds={missionStarted ? timerRemaining : null} />
        </div>

        <div className="game-header-section game-header-section--actions">
          <ToolsMenu />
          <button className="game-secondary" onClick={() => navigate("/jeu")}>
            Retour au lobby
          </button>
          {!isCompleted && (
            <button type="button" className="game-secondary" onClick={handleDebugComplete}>
              Valider l'énigme (debug)
            </button>
          )}
        </div>
      </header>

      <div className="game-layout">
        <section className="game-card puzzle-content" style={{ position: "relative" }}>
          <h2 className="text-2xl font-bold text-center text-cyan-300 mb-4">
            🔐 Énigme 3 — Cryptex : les clés perdues
          </h2>

          <div className="prose max-w-3xl mx-auto text-gray-200 mb-6" style={{ textAlign: "justify" }}>
            <p>
              Tu pénètres dans la salle de contrôle de <strong>Cryptex</strong>, le réseau blockchain
              le plus isolé que tu aies jamais visité. Des panneaux holographiques projettent des fragments
              d’historique, des diagnostics et des flux de transactions : le système est vivant, mais il tousse.
            </p>
            <p>
              Trois clés ont été arrachées au registre.L’une porte un éclat doré ancien, l’autre
              semble d’un bleu glacé presque liquide, la troisième affiche une teinte rose métallique. leurs signatures ont été effacées. Seule ta logique permettra de les rattacher
              au bon wallet.
            </p>
            <p>
              Approche, observe, fais glisser.
            </p>
          </div>

          <div style={bgStyle} className="relative">
            {/* Keys */}
            <div style={{ display: "flex", gap: 28, justifyContent: "center", marginBottom: 24 }}>
              {keys.map((k) => {
                const used = Object.values(puzzleState.selections || {}).includes(k.name);
                if (used) return null;
                return (
                  <motion.div
                    key={k.name}
                    draggable
                    onDragStart={(e) => handleDragStart(e, k.name)}
                    whileHover={{ scale: 1.06, y: -6 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      width: 72,
                      height: 72,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: puzzleState.completed ? "not-allowed" : "grab",
                      opacity: puzzleState.completed ? 0.35 : 1
                    }}
                  >
                    <KeySVG id={k.name} size={56} />
                  </motion.div>
                );
              })}
            </div>

            {/* Wallets */}
            <div style={{ display: "flex", gap: 28, justifyContent: "center" }}>
              {wallets.map((w) => {
                const walletFeedback = puzzleState.feedback[w.name];
                const isCorrect =
                  walletFeedback === "correct" ||
                  (puzzleState.completed &&
                    puzzleState.selections[w.name] === correctMapping[w.name]);
                const isIncorrect = walletFeedback === "incorrect";
                const isTargeted = dragOverWallet === w.name;
                const assignedKey = puzzleState.selections[w.name];
                const feedbackIcon =
                  walletFeedback === "correct"
                    ? "✅"
                    : walletFeedback === "incorrect"
                    ? "❌"
                    : "";
                return (
                  <div key={w.name} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                    <motion.div
                      onDrop={(e) => handleDrop(e, w.name)}
                      onDragOver={(e) => handleDragOver(e, w.name)}
                      onDragLeave={handleDragLeave}
                      onMouseEnter={() => setHoveredWallet(w.name)}
                      onMouseLeave={() => setHoveredWallet(null)}
                      whileHover={{ scale: puzzleState.completed ? 1 : 1.03 }}
                      animate={
                        isIncorrect
                          ? { x: [0, -6, 6, -4, 4, 0] }
                          : isTargeted && !puzzleState.completed
                          ? { boxShadow: ["0 0 0 rgba(0,0,0,0)", "0 0 28px rgba(0,255,200,0.22)"] }
                          : { scale: isCorrect ? 1.04 : 1 }
                      }
                      transition={{ type: "spring", stiffness: 300, damping: 14 }}
                      style={{
                        width: 140,
                        height: 140,
                        borderRadius: 14,
                        background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
                        border: isCorrect ? "3px solid rgba(72,255,138,0.9)" : "2px solid rgba(120,120,140,0.25)",
                        boxShadow: isCorrect ? "0 12px 40px rgba(72,255,138,0.08)" : "inset 0 -6px 12px rgba(0,0,0,0.6)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        padding: 8,
                        opacity: puzzleState.completed ? 0.9 : 1
                      }}
                    >
                      <div style={{ fontSize: 38 }}>{w.icon}</div>
                      <div style={{ marginTop: 6, fontWeight: 800, color: "#e6eef8" }}>{w.name}</div>

                      {assignedKey ? (
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -10%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                        >
                          <KeySVG id={assignedKey} size={36} />
                        </div>
                      ) : null}

                      <div style={{ position: "absolute", top: 8, right: 8, fontSize: 16 }}>
                        {feedbackIcon}
                      </div>
                    </motion.div>

                    {hoveredWallet === w.name && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.12 }}
                        style={{
                          width: 260,
                          background: "rgba(5,5,10,0.86)",
                          border: "1px solid rgba(255,255,255,0.04)",
                          color: "#cdd6e2",
                          padding: "8px 10px",
                          borderRadius: 8,
                          textAlign: "center",
                          fontSize: 13,
                          lineHeight: 1.2,
                          marginTop: 6
                        }}
                      >
                        <div style={{ fontWeight: 800, marginBottom: 6, color: "#fff" }}>{w.name} — Indice</div>
                        <div>{w.hint}</div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
              <button
                onClick={handleCheck}
                style={{
                  background: "rgba(29, 78, 216, 0.35)",
                  color: "#f8fafc",
                  padding: "10px 22px",
                  borderRadius: 10,
                  border: "1px solid rgba(59, 130, 246, 0.6)",
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
                }}
              >
                Vérifier
              </button>
            </div>

            {allCorrect && <ConfettiLayer />}
          </div>
        </section>

        <aside className="chat-panel">
          <PlayersList players={players} />
          <Chat chat={chat} onSendMessage={sendMessage} />
        </aside>
      </div>

      <PuzzleSuccessBanner visible={isCompleted || allCorrect} />
    </div>
  );
}














