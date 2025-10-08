import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import "./lobby.css";
import BombeTimer from "../components/BombeTimer";
import useRoomState from "../hooks/useRoomState";
import EnigmesGridMenu from "../components/EnigmesGrid";
import EnigmePresence from "../components/EnigmePresence";
import PuzzleSuccessBanner from "../components/PuzzleSuccessBanner";
import useEnigmeCompletion from "../hooks/useEnigmeCompletion";
import errorImg from "../assets/error.png";
import computerImg from "../assets/computer.png";
import fireImg from "../assets/fire.png";
import "../styles/enigme2.css";
import socket from "../socket";
import { setEnigmeStatus } from "../utils/enigmesProgress";
import ToolsMenu from "../components/ToolsMenu";

export default function Enigme2() {
  const navigate = useNavigate();
  const { room, players, chat, timerRemaining, sendMessage, missionStarted, missionFailed } =
    useRoomState();
  const isCompleted = useEnigmeCompletion("enigme2", room);
  const [selected, setSelected] = useState(null); // null | number | 'center'
  const [links, setLinks] = useState([]); // array of { a: id, b: id }
  const [initialized, setInitialized] = useState(false);
  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    if (!missionStarted && !missionFailed) {
      navigate("/preparation", { replace: true });
    }
  }, [missionFailed, missionStarted, navigate]);

  useEffect(() => {
    if (missionFailed && location.pathname !== "/defaite") {
      navigate("/defaite", { replace: true });
    }
  }, [location.pathname, missionFailed, navigate]);

  const handleDebugComplete = () => {
    if (!room || isCompleted) {
      return;
    }
    setEnigmeStatus(room, "enigme2", true);
    socket.emit("enigmeStatusUpdate", { room, key: "enigme2", completed: true });
  };

  const nodes = [
    { id: 1, angle: 0 },
    { id: 2, angle: 60 },
    { id: 3, angle: 120 },
    { id: 4, angle: 180 },
    { id: 5, angle: 240 },
    { id: 6, angle: 300 },
    // Nouveaux nœuds diagonaux (un par "coin"), légèrement plus proches du centre
    { id: 7, angle: 30, r: 250 },   // coin haut-droite (triangle avec 1 et 2)
    { id: 8, angle: 150, r: 250 },  // coin haut-gauche (triangle avec 3 et 4)
    { id: 9, angle: 210, r: 250 },  // coin bas-gauche (triangle avec 4 et 5)
    { id: 10, angle: 330, r: 250 }, // coin bas-droite (triangle avec 6 et 1)
  ];

  const RADIUS = 160; // distance pixels du centre pour les noeuds

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const el = containerRef.current;
      setSize({ w: el.clientWidth, h: el.clientHeight });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const positions = useMemo(() => {
    const cx = size.w / 2;
    const cy = size.h / 2;
    const map = new Map();
    map.set("center", { x: cx, y: cy });
    // positions des ordinateurs latéraux (doivent correspondre au CSS)
    const compHalf = 40; // largeur .computer: 80px => moitié = 40
    const sidePad = 100; // décalage latéral CSS (voir .computer--left/.computer--right)
    map.set("left", { x: sidePad + compHalf, y: cy });
    map.set("right", { x: size.w - sidePad - compHalf, y: cy });
    for (const n of nodes) {
      const rad = (n.angle * Math.PI) / 180;
      const rr = n.r ?? RADIUS;
      const x = cx + rr * Math.cos(rad);
      const y = cy + rr * Math.sin(rad);
      map.set(n.id, { x, y });
    }
    return map;
  }, [nodes, size.h, size.w]);

  const handleConnect = (targetId) => {
    if (selected == null) {
      setSelected(targetId);
      return;
    }
    if (selected === targetId) {
      // same selection: deselect
      setSelected(null);
      return;
    }
    // normalize pair order to avoid duplicates
    const a = selected;
    const b = targetId;
    const keyA = String(a);
    const keyB = String(b);
    const [u, v] = keyA < keyB ? [a, b] : [b, a];
    setLinks((prev) => {
      const exists = prev.some((p) => String(p.a) === String(u) && String(p.b) === String(v));
      if (exists) return prev;
      return [...prev, { a: u, b: v }];
    });
    setSelected(null);
  };
  
  // Charger les liens sauvegardés pour la salle courante
  useEffect(() => {
    if (!room) return;
    try {
      const raw = localStorage.getItem(`enigme2:links:${room}`);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) {
          setLinks(arr.map((l) => ({ a: String(l.a), b: String(l.b) })));
        } else {
          setLinks([]);
        }
      } else {
        setLinks([]);
      }
    } catch (_e) {
      setLinks([]);
    }
    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  // Persister les liens quand ils changent
  useEffect(() => {
    if (!initialized || !room) return;
    try {
      localStorage.setItem(`enigme2:links:${room}`, JSON.stringify(links));
    } catch (_e) {
      // ignore quota errors
    }
  }, [links, room, initialized]);

  // Lier automatiquement les ordinateurs à la database au premier démarrage (si absent)
  useEffect(() => {
    if (!initialized) return;
    setLinks((prev) => {
      const hasLeft = prev.some(
        (p) => (String(p.a) === 'center' && String(p.b) === 'left') || (String(p.a) === 'left' && String(p.b) === 'center')
      );
      const hasRight = prev.some(
        (p) => (String(p.a) === 'center' && String(p.b) === 'right') || (String(p.a) === 'right' && String(p.b) === 'center')
      );
      if (hasLeft && hasRight) return prev;
      const next = [...prev];
      if (!hasLeft) next.push({ a: 'center', b: 'left' });
      if (!hasRight) next.push({ a: 'center', b: 'right' });
      return next;
    });
  }, [initialized]);

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="game-header-section game-header-section--info">
          <EnigmesGridMenu active="enigme2" room={room} />
          <EnigmePresence players={players} scene="enigme2" />
        </div>

        <div className="game-header-section game-header-section--timer">
          <BombeTimer remainingSeconds={missionStarted ? timerRemaining : null} />
        </div>

        <div className="game-header-section game-header-section--actions">
          <ToolsMenu />
          <button className="game-secondary" onClick={() => navigate("/jeu")}>
            Retour au lobby
          </button>
          {!isCompleted ? (
            <button type="button" className="game-secondary" onClick={handleDebugComplete}>
              Valider l enigme (debug)
            </button>
          ) : null}
        </div>
      </header>

      <div className="game-layout">
        <section className="game-card puzzle-content">
          <h2>Enigme 2</h2>
          {isCompleted ? (
            <div className="enigme-post-completion">
              Ajouter ici les informations post reussite de l enigme
            </div>
          ) : null}
          <p>
            La base de donnees est corrompue : trouvez un moyen de stocker les donnees de maniere securisee.
          </p>
          <div className="puzzle-instructions" ref={containerRef}>
            {/* Lignes de liaison */}
            <svg
              className="links-overlay"
              width={size.w}
              height={size.h}
              style={{ position: "absolute", inset: 0 }}
            >
              {links.map((link, idx) => {
                const p1 = positions.get(link.a);
                const p2 = positions.get(link.b);
                if (!p1 || !p2) return null;
                const handleRemove = (e) => {
                  e.stopPropagation();
                  setLinks((prev) => prev.filter((_, i) => i !== idx));
                };
                const key = `${String(link.a)}-${String(link.b)}-${idx}`;
                return (
                  <g key={key}>
                    {/* Large invisible hit-area for easier clicks */}
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="#22c55e"
                      strokeWidth="14"
                      strokeOpacity="0"
                      strokeLinecap="round"
                      pointerEvents="stroke"
                      style={{ cursor: "pointer" }}
                      onClick={handleRemove}
                    />
                    {/* Visible line */}
                    <line
                      x1={p1.x}
                      y1={p1.y}
                      x2={p2.x}
                      y2={p2.y}
                      stroke="#22c55e"
                      strokeWidth="4"
                      strokeLinecap="round"
                      pointerEvents="none"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Ordinateurs à gauche et à droite (cliquables) */}
            <img
              src={computerImg}
              alt="Ordinateur gauche"
              className={`computer computer--left${selected === "left" ? " selected" : ""}`}
              onClick={() => handleConnect("left")}
            />
            <img
              src={computerImg}
              alt="Ordinateur droite"
              className={`computer computer--right${selected === "right" ? " selected" : ""}`}
              onClick={() => handleConnect("right")}
            />

            <div className="database-error" onClick={() => handleConnect("center")}>
              <img
                src={errorImg}
                alt="Erreur base de donnees"
                className={selected === "center" ? "selected" : undefined}
                style={{ cursor: "pointer" }}
              />
              {/* Icône feu en bas à gauche de la database */}
              <img src={fireImg} alt="Feu" className="database-fire" style={{ pointerEvents: "none" }} />
            </div>
            {/* Noeuds autour */}
            {nodes.map((node) => (
              <div
                key={node.id}
                className={`node${selected === node.id ? " node--selected" : ""}`}
                style={{
                  transform: `translate(-50%, -50%) rotate(${node.angle}deg) translate(${(node.r ?? RADIUS)}px) rotate(-${node.angle}deg)`,
                  cursor: "pointer",
                }}
                onClick={() => handleConnect(node.id)}
              >
                <span>{node.id}</span>
              </div>
            ))}
          </div>
        </section>
        <aside className="chat-panel">
          <PlayersList players={players} />
          <Chat chat={chat} onSendMessage={sendMessage} />
        </aside>
      </div>
      <PuzzleSuccessBanner visible={isCompleted} />
    </div>
  );
}
