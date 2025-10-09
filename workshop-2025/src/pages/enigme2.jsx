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

const ENIGME2_SPECIAL_ENDPOINTS = new Set(["center", "left", "right"]);

const ENIGME2_NODES = [
  { id: 1, angle: 0 },
  { id: 2, angle: 60 },
  { id: 3, angle: 120 },
  { id: 4, angle: 180 },
  { id: 5, angle: 240 },
  { id: 6, angle: 300 },
  // Extra diagonal nodes per corner, slightly closer to the center
  { id: 7, angle: 30, r: 250 },
  { id: 8, angle: 150, r: 250 },
  { id: 9, angle: 210, r: 250 },
  { id: 10, angle: 330, r: 250 },
];

const ENIGME2_NODE_ID_SET = new Set(ENIGME2_NODES.map((node) => node.id));

const normalizeLinkEndpoint = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed.length) {
      return null;
    }
    if (ENIGME2_SPECIAL_ENDPOINTS.has(trimmed)) {
      return trimmed;
    }
    const numericValue = Number(trimmed);
    if (Number.isInteger(numericValue) && ENIGME2_NODE_ID_SET.has(numericValue)) {
      return numericValue;
    }
    return null;
  }
  if (typeof value === "number") {
    if (Number.isInteger(value) && ENIGME2_NODE_ID_SET.has(value)) {
      return value;
    }
    return null;
  }
  return null;
};

const normalizeLinksArray = (links) => {
  if (!Array.isArray(links)) {
    return [];
  }

  const seen = new Set();
  const normalized = [];

  for (const rawLink of links) {
    const a = normalizeLinkEndpoint(rawLink?.a);
    const b = normalizeLinkEndpoint(rawLink?.b);
    if (a === null || b === null || a === b) {
      continue;
    }

    const keyA = typeof a === "number" ? `n${a}` : `s${a}`;
    const keyB = typeof b === "number" ? `n${b}` : `s${b}`;
    const sortAB = keyA <= keyB;
    const dedupeKey = sortAB ? `${keyA}-${keyB}` : `${keyB}-${keyA}`;
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    normalized.push({
      a: sortAB ? a : b,
      b: sortAB ? b : a,
    });
  }

  normalized.sort((left, right) => {
    const leftKey = `${typeof left.a === "number" ? `n${left.a}` : `s${left.a}`}-${typeof left.b === "number" ? `n${left.b}` : `s${left.b}`}`;
    const rightKey = `${typeof right.a === "number" ? `n${right.a}` : `s${right.a}`}-${typeof right.b === "number" ? `n${right.b}` : `s${right.b}`}`;
    return leftKey.localeCompare(rightKey);
  });

  return normalized;
};

export default function Enigme2() {
  const navigate = useNavigate();
  const { room, players, chat, timerRemaining, sendMessage, missionStarted, missionFailed } =
    useRoomState();
  const isCompleted = useEnigmeCompletion("enigme2", room);
  const [selected, setSelected] = useState(null); // null | number | 'center'
  const [links, setLinks] = useState([]); // array of { a: id, b: id }
  const [initialized, setInitialized] = useState(false);
  const [hadSavedLinks, setHadSavedLinks] = useState(false);
  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [hashVisible, setHashVisible] = useState(false);
  const skipBroadcastRef = useRef(false);
  const localLinksRef = useRef({ links: [], hasLinks: false });

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

  const nodes = ENIGME2_NODES;

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
  
  // Charger les liens sauvegardes en local pour servir de repli
  useEffect(() => {
    if (!room) {
      localLinksRef.current = { links: [], hasLinks: false };
      return;
    }
    try {
      const raw = localStorage.getItem(`enigme2:links:${room}`);
      if (!raw) {
        localLinksRef.current = { links: [], hasLinks: false };
        return;
      }
      const parsed = JSON.parse(raw);
      const restoredLinks = normalizeLinksArray(parsed);
      localLinksRef.current = {
        links: restoredLinks,
        hasLinks: restoredLinks.length > 0,
      };
    } catch (_e) {
      localLinksRef.current = { links: [], hasLinks: false };
    }
  }, [room]);

  // Persister les liens et synchroniser le serveur quand ils changent
  useEffect(() => {
    if (!initialized || !room) return;

    const snapshot = links.map((link) => ({ a: link.a, b: link.b }));
    localLinksRef.current = {
      links: snapshot,
      hasLinks: snapshot.length > 0,
    };

    try {
      localStorage.setItem(`enigme2:links:${room}`, JSON.stringify(snapshot));
    } catch (_e) {
      // ignore quota errors
    }

    if (skipBroadcastRef.current) {
      skipBroadcastRef.current = false;
      return;
    }

    socket.emit("enigme2:updateLinks", { room, links: snapshot });
  }, [links, room, initialized]);

  // Synchroniser les liens via le serveur pour tous les joueurs
  useEffect(() => {
    if (!room) {
      return;
    }

    const applyIncomingLinks = (incomingLinks, { skipBroadcast }) => {
      const normalizedLinks = normalizeLinksArray(incomingLinks);
      skipBroadcastRef.current = Boolean(skipBroadcast);
      setLinks((previous) => {
        if (
          previous.length === normalizedLinks.length &&
          previous.every((link, index) => {
            const candidate = normalizedLinks[index];
            return link?.a === candidate?.a && link?.b === candidate?.b;
          })
        ) {
          return previous;
        }
        return normalizedLinks;
      });
      setHadSavedLinks(normalizedLinks.length > 0);
      setInitialized(true);
    };

    const handleState = (payload = {}) => {
      const payloadRoom = typeof payload.room === "string" ? payload.room.trim() : "";
      if (!payloadRoom || payloadRoom !== room) {
        return;
      }
      applyIncomingLinks(payload.links ?? [], { skipBroadcast: true });
    };

    socket.on("enigme2:state", handleState);

    socket.emit("enigme2:requestState", { room }, (response = {}) => {
      const stateLinks = Array.isArray(response?.links)
        ? response.links
        : Array.isArray(response?.state?.links)
        ? response.state.links
        : [];

      if (stateLinks.length > 0) {
        applyIncomingLinks(stateLinks, { skipBroadcast: true });
        return;
      }

      if (localLinksRef.current.hasLinks) {
        applyIncomingLinks(localLinksRef.current.links, { skipBroadcast: false });
        return;
      }

      applyIncomingLinks([], { skipBroadcast: true });
    });

    return () => {
      socket.off("enigme2:state", handleState);
    };
  }, [room]);

  // Lier automatiquement les ordinateurs à la database au premier démarrage (si aucune progression sauvegardée)
  useEffect(() => {
    if (!initialized || hadSavedLinks) return;
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
  }, [initialized, hadSavedLinks]);

  // Validation automatique:
  //  - Tous les nœuds 1..10 doivent être dans le même composant connexe (via des liens entre nœuds uniquement)
  //  - Aucun chemin ne doit relier un nœud à la database corrompue ('center') dans le graphe complet
  useEffect(() => {
    if (!room || isCompleted) return;

    const NODE_IDS = new Set(nodes.map((n) => String(n.id)));

    // Construit une adjacency list pour un graphe non orienté
    const buildAdjacency = (edges) => {
      const adj = new Map();
      const add = (u, v) => {
        if (!adj.has(u)) adj.set(u, new Set());
        adj.get(u).add(v);
      };
      for (const e of edges) {
        const a = String(e.a);
        const b = String(e.b);
        add(a, b);
        add(b, a);
      }
      return adj;
    };

    // 1) Connectivité entre nœuds uniquement
    const nodeOnlyEdges = links.filter(
      (e) => NODE_IDS.has(String(e.a)) && NODE_IDS.has(String(e.b))
    );
    if (nodeOnlyEdges.length === 0) return; // pas encore de structure

    const adjNodes = buildAdjacency(nodeOnlyEdges);
    // BFS/DFS depuis un nœud présent
    const presentNodes = new Set();
    for (const e of nodeOnlyEdges) {
      presentNodes.add(String(e.a));
      presentNodes.add(String(e.b));
    }
    // Tous les nœuds 1..10 doivent être présents via au moins un lien pour prétendre à la connectivité
    for (const id of NODE_IDS) {
      if (!presentNodes.has(id)) {
        return; // un nœud isolé => non valide
      }
    }

    const start = presentNodes.values().next().value;
    const visited = new Set([start]);
    const queue = [start];
    while (queue.length) {
      const u = queue.shift();
      const neigh = adjNodes.get(u) || new Set();
      for (const v of neigh) {
        if (!visited.has(v)) {
          visited.add(v);
          queue.push(v);
        }
      }
    }
    // Tous les nœuds doivent être atteints
    for (const id of NODE_IDS) {
      if (!visited.has(id)) {
        return; // composant non connexe
      }
    }

    // 2) Aucun chemin d'un nœud vers 'center' dans le graphe complet (y compris ordinateurs)
    const fullAdj = buildAdjacency(links);
    const reachesCenter = (sourceId) => {
      const target = 'center';
      const seen = new Set([sourceId]);
      const q = [sourceId];
      while (q.length) {
        const u = q.shift();
        if (u === target) return true;
        const neigh = fullAdj.get(u) || new Set();
        for (const v of neigh) {
          if (!seen.has(v)) {
            seen.add(v);
            q.push(v);
          }
        }
      }
      return false;
    };

    // Vérifier aussi les PC
    for (const pc of ['left', 'right']) {
      if (reachesCenter(pc)) {
        return; // un PC a un chemin vers la DB corrompue
      }
    }

    for (const id of NODE_IDS) {
      if (reachesCenter(String(id))) {
        return; // un nœud a un chemin vers la DB corrompue
      }
    }

    // Conditions remplies -> valider l'énigme
    // Exigence supplementaire: les deux PC doivent etre connectes au nuage de noeuds
    const __connectsToAnyNode = (start) => {
      const fullAdj = new Map();
      for (const e of links) {
        const a = String(e.a), b = String(e.b);
        if (!fullAdj.has(a)) fullAdj.set(a, new Set());
        if (!fullAdj.has(b)) fullAdj.set(b, new Set());
        fullAdj.get(a).add(b);
        fullAdj.get(b).add(a);
      }
      const seen = new Set([start, 'center']);
      const q = [start];
      while (q.length) {
        const u = q.shift();
        const neigh = fullAdj.get(u) || new Set();
        for (const v of neigh) {
          if (seen.has(v)) continue;
          if (new Set(nodes.map((n)=>String(n.id))).has(String(v))) return true;
          seen.add(v);
          q.push(v);
        }
      }
      return false;
    };
    if (!__connectsToAnyNode('left') || !__connectsToAnyNode('right')) {
      return;
    }
    setEnigmeStatus(room, "enigme2", true);
    socket.emit("enigmeStatusUpdate", { room, key: "enigme2", completed: true });
  }, [links, room, isCompleted, nodes]);

  return (
    <div className="game-page">
      <header className="game-header game-header--timer-detached">
        <div className="game-header-section game-header-section--info">
          <EnigmesGridMenu active="enigme2" room={room} />
          <EnigmePresence players={players} scene="enigme2" />
        </div>

        <div className="game-header-section game-header-section--actions">
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
      
      <div className="game-timer-sticky">
        <div className="game-header-section game-header-section--timer">
          <BombeTimer remainingSeconds={missionStarted ? timerRemaining : null} />
        </div>
      </div>

      {isCompleted ? (
  <article className="enigme-post-completion">
    <header className="enigme-post-completion__header">
      <h3>Bravo !!</h3>
      <h3>Les noeuds de données</h3>
      <p className="enigme-post-completion__subtitle">
        Deuxième bloc du reseau Bitcoin - manifeste technique et politique.
      </p>
    </header>

    <div className="enigme-post-completion__grid">
      <section>
        <h4>Blockchain</h4>
        <p>
          2008 – Le concept de blockchain est présenté pour la première fois dans le livre blanc de Bitcoin publié par Satoshi Nakamoto, décrivant une technologie de registre distribué sécurisé et transparent.
        </p>
      </section>
      <section>
        <h4>Noeuds</h4>
        <p>
          2010 – Le réseau Bitcoin dépasse les 1 000 nœuds actifs, illustrant la croissance de sa décentralisation et la robustesse de son infrastructure distribuée.
        </p>
      </section>
      <section>
        <h4>Décentralisation</h4>
        <p>
          2015 – La plateforme Ethereum est lancée, introduisant les smart contracts et élargissant la décentralisation au-delà des simples transactions, vers des applications autonomes (dApps).
        </p>
      </section>
    </div>
  </article>
) : null}

      <div className="game-layout">
        <section className="game-card puzzle-content">
          <h2>Énigme 2 - Les noeuds de données</h2><p>
            La base de donnees est corrompue : trouvez un moyen de stocker les donnees de maniere securisee.
          </p>
          <p>
            Règle: connectez tous les noeuds 1–10 entre eux sans relier la base corrompue ni les ordinateurs à cette base.
          </p>
          <div className="puzzle-instructions">
          <div className="puzzle-instructions-enigme2" ref={containerRef}>
            {/* Lignes de liaison */}
            <svg
              className="links-overlay"
              viewBox={`0 0 ${Math.max(1, size.w)} ${Math.max(1, size.h)}`}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
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
                {/* Contenu volontairement vide (pas de numéro ni icône) */}
              </div>
            ))}
          </div>
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
            marginTop: "1rem",
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
              fontSize: "0.8rem",
            }}
          >
            5e2a9c7d1f48b3e0c6a4d8f2b1e7c9a5
          </code>
        ) : null}
      </div>
      <PuzzleSuccessBanner visible={isCompleted} />
    </div>
  );
}

