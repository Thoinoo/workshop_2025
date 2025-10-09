import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import "./lobby.css";
import BombeTimer from "../components/BombeTimer";
import useRoomState from "../hooks/useRoomState";
import EnigmesGridMenu from "../components/EnigmesGrid";
import EnigmePresence from "../components/EnigmePresence";
import GenesisTerminal from "../components/GenesisTerminal";
import PuzzleSuccessBanner from "../components/PuzzleSuccessBanner";
import useEnigmeCompletion from "../hooks/useEnigmeCompletion";
import socket from "../socket";
import { setEnigmeStatus } from "../utils/enigmesProgress";
import ToolsMenu from "../components/ToolsMenu";

export default function Enigme1() {
  const navigate = useNavigate();
  const { username, room, players, chat, timerRemaining, sendMessage, missionStarted, missionFailed } =
    useRoomState();
  const isCompleted = useEnigmeCompletion("enigme1", room);
  const [openedHints, setOpenedHints] = useState({});
  const [hashVisible, setHashVisible] = useState(false);
  const [unlockedHints, setUnlockedHints] = useState({});
  const [pendingHint, setPendingHint] = useState(null);
  const [penaltyFx, setPenaltyFx] = useState(null);
  const HINT_TIME_PENALTY = 60;
  const handleDebugComplete = () => {
    if (!room || isCompleted) {
      return;
    }
    setEnigmeStatus(room, "enigme1", true);
    socket.emit("enigmeStatusUpdate", { room, key: "enigme1", completed: true });
  };

  const handleHintClick = (index) => {
    if (unlockedHints[index]) {
      setOpenedHints((current) => ({
        ...current,
        [index]: !current[index]
      }));
      return;
    }

    setPendingHint(index);
  };

  const handleConfirmHintUnlock = () => {
    if (pendingHint === null) {
      return;
    }

    setPendingHint(null);
    setUnlockedHints((prev) => ({ ...prev, [pendingHint]: true }));
    setOpenedHints((prev) => ({ ...prev, [pendingHint]: true }));
    if (room) {
      socket.emit("timer:deduct", { room, seconds: HINT_TIME_PENALTY, reason: "hint" });
    }
    setPenaltyFx({ amount: HINT_TIME_PENALTY });
    window.setTimeout(() => setPenaltyFx(null), 1800);
  };

  const handleCancelHintUnlock = () => {
    setPendingHint(null);
  };

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

  useEffect(() => {
    if (isCompleted && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [isCompleted]);

  return (
    <div className="game-page">
      <header className="game-header game-header--timer-detached">
        <div className="game-header-section game-header-section--info">
          <EnigmesGridMenu active="enigme1" room={room} />
          <EnigmePresence players={players} scene="enigme1" />
        </div>

        <div className="game-header-section game-header-section--actions">
          <button className="game-secondary" onClick={() => navigate("/jeu")}>
            Retour au lobby
          </button>
        </div>
      </header>
      <div className="game-timer-sticky">
        <div className="game-header-section game-header-section--timer">
          <BombeTimer remainingSeconds={missionStarted ? timerRemaining : null} />
        </div>
      </div>
          {!isCompleted ? (
            <button type="button" className="game-secondary" onClick={handleDebugComplete}>
              Valider l’énigme (debug)
            </button>
          ) : null}
      <div className="game-layout">
        <section className="game-card puzzle-content">
          <p className="game-username">
            
          </p>
          <h2>Bloc Genesis</h2>
          {isCompleted ? (
            <article className="enigme-post-completion">
              <header className="enigme-post-completion__header">
                <h3>Bravo !!</h3>
                <h3>Le bloc Genesis</h3>
                <p className="enigme-post-completion__subtitle">
                  Premier bloc du réseau Bitcoin — manifeste technique et politique.
                </p>
              </header>

              <div className="enigme-post-completion__grid">
                <section>
                  <h4>Origine</h4>
                  <p>
                    Créé le 3 janvier 2009 par Satoshi Nakamoto, il lance la chaîne et contextualise
                    la réponse de Bitcoin à la crise financière.
                  </p>
                </section>
                <section>
                  <h4>Message caché</h4>
                  <p>
                    <q>The Times 03/Jan/2009 - Chancellor on brink of second bailout for banks.</q>
                    <br />
                    Une référence explicite à la défiance envers les sauvetages bancaires successifs.
                  </p>
                </section>
                <section>
                  <h4>En résumé</h4>
                  <p>
                    Le bloc Genesis symbolise à la fois le démarrage technique de la blockchain et
                    l’ambition d’une monnaie sans autorité centrale.
                  </p>
                </section>
              </div>
            </article>
          ) : null}

          <div className="puzzle-instructions">
            <h3>Briefing</h3>
            <p>
              Équipe, alerte critique. Le réseau global vient de lever un drapeau rouge : la
              blockchain universelle est hors service. Sans le bloc Genesis, aucune transaction ne
              peut être vérifiée et l’historique se désintègre.
            </p>
            <p>
              Trouvez et réparez le bloc Genesis !
            </p>
            {/* <p>
              Utilisez le terminal et tapez <code>help</code> si besoin. Gardez ces commandes a
              portee de main :
            </p> */}
            {/* <ul>
              <li>
                <code>ls</code> : explorer les repertoires disponibles
              </li>
              <li>
                <code>cat &lt;fichier&gt;</code> : afficher le contenu d un fichier
              </li>
              <li>
                <code>decode &lt;fichier&gt;</code> : dechiffrer les notes trouvees
              </li>
              <li>
                <code>find &lt;mot&gt;</code> : reperer les fichiers contenant un terme cible
              </li>
            </ul>
            <p>
              Fouillez le dossier <code>genesis/</code>, identifiez le bon fichier, decodez les
              indices et prouvez que le Bloc Genesis est authentique.
            </p> */}
          </div>

          <p>Vous trouvez un post-it avec le mot "help" collé sur un terminal étrang.</p>
          <GenesisTerminal />
          <div className="enigme-hints">
            <div className="enigme-hints__balance">
              <span>Chaque indice retire {HINT_TIME_PENALTY}s du timer de l'equipe.</span>
            </div>
            <h3>Indices</h3>
            <ul className="enigme-hints__list">
              <li
                className={`enigme-hints__item ${openedHints[0] ? "is-open" : ""}`}
              >
                <button
                  type="button"
                  className="enigme-hints__toggle"
                  onClick={() => handleHintClick(0)}
                  aria-expanded={openedHints[0] ? "true" : "false"}
                >
                  Indice 1
                </button>
                <span className="enigme-hints__content">Le mot « note » semble mis en avant dans le README ; un find [mot] permettrait de mettre en avant certains fichiers, peut‑être.</span>
              </li>
              <li
                className={`enigme-hints__item ${openedHints[1] ? "is-open" : ""}`}
              >
                <button
                  type="button"
                  className="enigme-hints__toggle"
                  onClick={() => handleHintClick(1)}
                  aria-expanded={openedHints[1] ? "true" : "false"}
                >
                  Indice 2
                </button>
                <span className="enigme-hints__content">genesis/genesis_note2.enc semble encodé, et si on essayait de le déchiffrer ?</span>
              </li>
              <li
                className={`enigme-hints__item ${openedHints[2] ? "is-open" : ""}`}
              >
                <button
                  type="button"
                  className="enigme-hints__toggle"
                  onClick={() => handleHintClick(2)}
                  aria-expanded={openedHints[2] ? "true" : "false"}
                >
                  Indice 3
                </button>
                <span className="enigme-hints__content">Des mots ressortent après avoir déchiffré genesis_note2.enc. Un find -il [mot] sur l’un de ces indices devrait pointer vers le fichier à traiter et à réparer, peut‑être avec un de vos outils !</span>
              </li>
            </ul>
          </div>
        </section>

        <aside className="chat-panel">
          <PlayersList players={players} />
          <ToolsMenu />
          <Chat chat={chat} onSendMessage={sendMessage} />
        </aside>
      </div>
      {penaltyFx ? (
        <div className="btc-spend-fx spent">
          - {penaltyFx.amount} BTC ! 
        </div>
      ) : null}

      {pendingHint !== null ? (
        <div className="hint-purchase-backdrop">
          <div className="hint-purchase-modal">
            <h4>Debloquer l'indice {pendingHint + 1}</h4>
            <p>Reduire le timer de {HINT_TIME_PENALTY} secondes pour reveler cet indice ?</p>
            <div className="hint-purchase-actions">
              <button type="button" className="game-primary" onClick={handleConfirmHintUnlock}>
                Confirmer (-{HINT_TIME_PENALTY}s)
              </button>
              <button type="button" className="game-secondary" onClick={handleCancelHintUnlock}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
            892c1b5b4f90a2d7e8c3a1f5d4b6e7f1
          </code>
        ) : null}
      </div>
      <PuzzleSuccessBanner visible={isCompleted} />
    </div>
  );
}
