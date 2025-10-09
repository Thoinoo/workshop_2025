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
  const [draggingKey, setDraggingKey] = useState(null);
  const [keyTrayDropActive, setKeyTrayDropActive] = useState(false);
  const [hashVisible, setHashVisible] = useState(false);

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
  const walletFeedbackValues = Object.values(puzzleState.feedback || {});
  const hasValidationFeedback = walletFeedbackValues.length > 0;
  const isValidationSuccess =
    puzzleState.completed ||
    (hasValidationFeedback && walletFeedbackValues.every((value) => value === "correct"));
  const keyAssignments = puzzleState.selections || {};
  const keyToWalletMap = Object.entries(keyAssignments).reduce((acc, [walletName, keyName]) => {
    if (keyName) {
      acc[keyName] = walletName;
    }
    return acc;
  }, {});

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
  const handleDragStart = (event, keyName, originWallet = null) => {
    if (puzzleState.completed) {
      event.preventDefault();
      return;
    }
    const payload = JSON.stringify({ keyName, originWallet });
    event.dataTransfer.setData("application/enigme3-key", payload);
    event.dataTransfer.setData("text/plain", keyName);
    event.dataTransfer.effectAllowed = "move";
    setDragOverWallet(null);
    setDraggingKey({ keyName, originWallet });
    setKeyTrayDropActive(false);
  };

  const handleDragEnd = () => {
    setDragOverWallet(null);
    setDraggingKey(null);
    setKeyTrayDropActive(false);
  };

  const handleDragOver = (event, walletName) => {
    if (puzzleState.completed) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
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
    const serialized = event.dataTransfer.getData("application/enigme3-key");
    let keyName = "";
    let originWallet = null;
    if (serialized) {
      try {
        const parsed = JSON.parse(serialized);
        keyName = parsed.keyName;
        originWallet = parsed.originWallet || null;
      } catch (error) {
        keyName = event.dataTransfer.getData("text/plain");
      }
    } else {
      keyName = event.dataTransfer.getData("text/plain");
    }
    if (!keyName) {
      return;
    }

    if (puzzleState.selections[walletName] === keyName) {
      setDragOverWallet(null);
      return;
    }

    const displacedKey = puzzleState.selections[walletName];

    socket.emit("enigme3:assignKey", { room, wallet: walletName, key: keyName }, () => {});

    if (originWallet && originWallet !== walletName && displacedKey && displacedKey !== keyName) {
      socket.emit("enigme3:assignKey", { room, wallet: originWallet, key: displacedKey }, () => {});
    }

    setDragOverWallet(null);
    setDraggingKey(null);
  };

  const handleRemoveFromWallet = (walletName) => {
    if (puzzleState.completed || !missionStarted || !room) {
      return;
    }
    socket.emit("enigme3:assignKey", { room, wallet: walletName, key: null }, () => {});
    setDragOverWallet(null);
    setDraggingKey(null);
  };

  const handleKeyTrayDragOver = (event) => {
    if (puzzleState.completed) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setKeyTrayDropActive(true);
  };

  const handleKeyTrayDragLeave = () => {
    setKeyTrayDropActive(false);
  };

  const handleKeyTrayDrop = (event) => {
    if (puzzleState.completed || !missionStarted || !room) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    setKeyTrayDropActive(false);

    const serialized = event.dataTransfer.getData("application/enigme3-key");
    let keyName = "";
    let originWallet = draggingKey?.originWallet || null;

    if (serialized) {
      try {
        const parsed = JSON.parse(serialized);
        keyName = parsed.keyName || "";
        originWallet = parsed.originWallet || originWallet;
      } catch (error) {
        keyName = event.dataTransfer.getData("text/plain");
      }
    } else {
      keyName = event.dataTransfer.getData("text/plain");
    }

    if (!originWallet) {
      setDragOverWallet(null);
      setDraggingKey(null);
      return;
    }

    socket.emit("enigme3:assignKey", { room, wallet: originWallet, key: null }, () => {});
    setDragOverWallet(null);
    setDraggingKey(null);
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
      <header className="game-header game-header--timer-detached">
        <div className="game-header-section game-header-section--info">
          <EnigmesGridMenu active="enigme3" room={room} />
          <EnigmePresence players={players} scene="enigme3" />
        </div>

        <div className="game-header-section game-header-section--actions">
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

      <div className="game-timer-sticky">
        <div className="game-header-section game-header-section--timer">
          <BombeTimer remainingSeconds={missionStarted ? timerRemaining : null} />
        </div>
      </div>

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
            {/* Key tray */}
            <div
              onDrop={handleKeyTrayDrop}
              onDragOver={handleKeyTrayDragOver}
              onDragLeave={handleKeyTrayDragLeave}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 16,
                padding: "18px 24px 24px",
                marginBottom: 28,
                borderRadius: 14,
                border: keyTrayDropActive
                  ? "2px dashed rgba(34,211,238,0.7)"
                  : "2px dashed rgba(148,163,184,0.35)",
                background: keyTrayDropActive
                  ? "linear-gradient(180deg, rgba(14,65,80,0.55), rgba(11,30,45,0.75))"
                  : "linear-gradient(180deg, rgba(12,20,35,0.45), rgba(6,12,25,0.72))",
                transition: "border 0.18s ease, background 0.18s ease"
              }}
            >
              <div style={{ fontWeight: 800, letterSpacing: 0.4, color: "#e2e8f0" }}>
                Zone des cles
              </div>
              <div style={{ color: "#94a3b8", fontSize: 13, textAlign: "center", maxWidth: 420 }}>
                Fais glisser une cle depuis cette zone vers un wallet, ou depose une cle ici pour la recuperer.
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 20,
                  justifyContent: "center",
                  flexWrap: "wrap",
                  width: "100%"
                }}
              >
                {keys.map((k) => {
                  const assignedWallet = keyToWalletMap[k.name];
                  const isAvailable = !assignedWallet;
                  return (
                    <motion.div
                      key={k.name}
                      draggable={isAvailable && !puzzleState.completed}
                      onDragStart={(e) => handleDragStart(e, k.name, null)}
                      onDragEnd={handleDragEnd}
                      style={{
                        width: 88,
                        height: 88,
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        background: isAvailable
                          ? "rgba(148,163,184,0.08)"
                          : "rgba(30,41,59,0.45)",
                        border: isAvailable
                          ? "1px solid rgba(148,163,184,0.35)"
                          : "1px solid rgba(71,85,105,0.5)",
                        cursor:
                          puzzleState.completed || !isAvailable ? "not-allowed" : "grab",
                        opacity: puzzleState.completed
                          ? 0.4
                          : isAvailable
                          ? 1
                          : 0.55,
                        transition: "all 0.18s ease"
                      }}
                      title={
                        isAvailable
                          ? "Cle disponible"
                          : `Placee sur ${assignedWallet}`
                      }
                    >
                      <KeySVG id={k.name} size={isAvailable ? 56 : 48} />
                      {assignedWallet && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: 6,
                            left: "50%",
                            transform: "translateX(-50%)",
                            fontSize: 11,
                            color: "#cbd5f5",
                            textAlign: "center",
                            lineHeight: 1.1,
                            padding: "2px 6px",
                            borderRadius: 6,
                            background: "rgba(15,23,42,0.8)"
                          }}
                        >
                          {assignedWallet}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Wallets */}
            <div style={{ display: "flex", gap: 28, justifyContent: "center" }}>
              {wallets.map((w) => {
                const walletFeedback = puzzleState.feedback[w.name];
                const isCorrect =
                  walletFeedback === "correct" ||
                  (puzzleState.completed && puzzleState.selections[w.name] === correctMapping[w.name]);
                const isTargeted = dragOverWallet === w.name;
                const assignedKey = puzzleState.selections[w.name];
                const isHovered = hoveredWallet === w.name;
                const isOriginWallet = draggingKey?.originWallet === w.name;
                const highlightActive = !puzzleState.completed && (isTargeted || isHovered);
                const walletBorder = isCorrect
                  ? "3px solid rgba(72,255,138,0.9)"
                  : highlightActive
                  ? "2px solid rgba(46,224,230,0.55)"
                  : "2px solid rgba(120,120,140,0.25)";
                const walletShadow = isCorrect
                  ? "0 12px 40px rgba(72,255,138,0.18)"
                  : highlightActive
                  ? "0 0 32px rgba(46,224,230,0.28)"
                  : "inset 0 -6px 12px rgba(0,0,0,0.6)";
                const showTooltip = hoveredWallet === w.name;
                return (
                  <div
                    key={w.name}
                    style={{
                      position: "relative",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 8,
                      paddingBottom: 88
                    }}
                  >
                    <motion.div
                      onDrop={(e) => handleDrop(e, w.name)}
                      onDragOver={(e) => handleDragOver(e, w.name)}
                      onDragLeave={handleDragLeave}
                      onMouseEnter={() => setHoveredWallet(w.name)}
                      onMouseLeave={() => setHoveredWallet(null)}
                      style={{
                        width: 140,
                        height: 140,
                        borderRadius: 14,
                        background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
                        border: walletBorder,
                        boxShadow: walletShadow,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative",
                        padding: 8,
                        opacity: puzzleState.completed ? 0.9 : isOriginWallet ? 0.85 : 1,
                        transition: "box-shadow 0.18s ease, border 0.18s ease, opacity 0.18s ease"
                      }}
                    >
                      <div style={{ fontSize: 38 }}>{w.icon}</div>
                      <div style={{ marginTop: 6, fontWeight: 800, color: "#e6eef8" }}>{w.name}</div>

                      {assignedKey ? (
                        <motion.div
                          draggable={!puzzleState.completed}
                          onDragStart={(e) => handleDragStart(e, assignedKey, w.name)}
                          onDragEnd={handleDragEnd}
                          onDoubleClick={() => handleRemoveFromWallet(w.name)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            handleRemoveFromWallet(w.name);
                          }}
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -10%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: puzzleState.completed ? "not-allowed" : "grab"
                          }}
                          title="Double-clic ou clic droit pour retirer la cle"
                        >
                          <KeySVG id={assignedKey} size={36} />
                        </motion.div>
                      ) : null}
                    </motion.div>

                    {showTooltip && (
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
                          position: "absolute",
                          top: "100%",
                          left: "50%",
                          transform: "translate(-50%, 16px)",
                          pointerEvents: "none",
                          zIndex: 10
                        }}
                      >
                        <div style={{ fontWeight: 800, marginBottom: 6, color: "#fff" }}>{w.name} - Indice</div>
                        <div>{w.hint}</div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            {draggingKey && (
              <div
                style={{
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: 14,
                  marginTop: 12,
                  marginBottom: 20,
                  maxWidth: 520,
                  marginLeft: "auto",
                  marginRight: "auto"
                }}
              >
                {draggingKey.originWallet
                  ? `Depose ${draggingKey.keyName} sur un autre wallet pour l'echanger ou dans la zone des cles pour la recuperer.`
                  : `Amene ${draggingKey.keyName} sur le wallet correspondant.`}
              </div>
            )}

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

            {(hasValidationFeedback || puzzleState.completed) && (
              <div
                style={{
                  marginTop: 16,
                  textAlign: "center",
                  fontWeight: 700,
                  color: isValidationSuccess ? "#4ade80" : "#f87171",
                  letterSpacing: 0.4
                }}
              >
                {isValidationSuccess ? "Combinaison validée !" : "Combinaison incorrecte, réessayez."}
              </div>
            )}

            {allCorrect && <ConfettiLayer />}
          </div>
        </section>

        <aside className="chat-panel">
          <PlayersList players={players} />
          <ToolsMenu />
          <Chat chat={chat} onSendMessage={sendMessage} />
        </aside>
      </div>

      <div className="hash-reveal">
        <button
          type="button"
          className="hash-reveal__toggle"
          onClick={() => setHashVisible((prev) => !prev)}
          style={{
            background: "transparent",
            border: "none",
            color: "#6b7280",
            fontSize: "0.85rem",
            cursor: "pointer",
            textDecoration: "underline",
            padding: 0,
            marginTop: "1rem"
          }}
        >
          {hashVisible ? "Masquer le hash" : "Afficher le hash"}
        </button>
        {hashVisible ? (
          <code
            className="hash-reveal__value"
            style={{
              display: "block",
              marginTop: "0.25rem",
              color: "#0f172a",
              fontSize: "0.8rem"
            }}
          >
            c1f3a5d7e9b2c4a6d8f0e1b3a7c9d5f2
          </code>
        ) : null}
      </div>

      <PuzzleSuccessBanner visible={isCompleted || allCorrect} />
    </div>
  );
}







