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
  const [purchasedHints, setPurchasedHints] = useState({});
  const [btcBalance, setBtcBalance] = useState(1800);
  const [pendingHint, setPendingHint] = useState(null);
  const [spendFx, setSpendFx] = useState(null);
  const HINT_COST = 60;
  const handleDebugComplete = () => {
    if (!room || isCompleted) {
      return;
    }
    setEnigmeStatus(room, "enigme1", true);
    socket.emit("enigmeStatusUpdate", { room, key: "enigme1", completed: true });
  };

  const handleHintClick = (index) => {
    if (purchasedHints[index]) {
      setOpenedHints((current) => ({
        ...current,
        [index]: !current[index]
      }));
      return;
    }

    if (btcBalance < HINT_COST) {
      setSpendFx({ type: "insufficient" });
      window.setTimeout(() => setSpendFx(null), 1800);
      return;
    }

    setPendingHint(index);
  };

  const handleConfirmHintPurchase = () => {
    if (pendingHint === null) {
      return;
    }

    setPendingHint(null);
    setPurchasedHints((prev) => ({ ...prev, [pendingHint]: true }));
    setOpenedHints((prev) => ({ ...prev, [pendingHint]: true }));
    setBtcBalance((prev) => Math.max(prev - HINT_COST, 0));
    setSpendFx({ type: "spent", amount: HINT_COST });
    window.setTimeout(() => setSpendFx(null), 1800);
  };

  const handleCancelHintPurchase = () => {
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
              Valider l enigme (debug)
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
                <h3>Le Bloc Genesis</h3>
                <p className="enigme-post-completion__subtitle">
                  Premier bloc du reseau Bitcoin - manifeste technique et politique.
                </p>
              </header>

              <div className="enigme-post-completion__grid">
                <section>
                  <h4>Origine</h4>
                  <p>
                    Cree le 3 janvier 2009 par Satoshi Nakamoto, il lance la chaine et contextualise
                    la reponse de Bitcoin a la crise financiere.
                  </p>
                </section>
                <section>
                  <h4>Message cache</h4>
                  <p>
                    <q>The Times 03/Jan/2009 - Chancellor on brink of second bailout for banks.</q>
                    <br />
                    Une reference explicite a la defiance envers les sauvetages bancaires successifs.
                  </p>
                </section>
                <section>
                  <h4>En resume</h4>
                  <p>
                    Le Genesis Block symbolise a la fois le demarrage technique de la blockchain et
                    l ambition d une monnaie sans autorite centrale.
                  </p>
                </section>
              </div>
            </article>
          ) : null}

          <div className="puzzle-instructions">
            <h3>Briefing</h3>
            <p>
              Equipe, alerte critique. Le reseau global vient de lever un drapeau rouge : la
              blockchain universelle est hors service. Sans le Bloc Genesis, aucune transaction ne
              peut etre verifiee et l historique se desintegre.
            </p>
            <p>
              Trouvez et reparez le block Genesis !
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

          <GenesisTerminal />
          <div className="enigme-hints">
            <div className="enigme-hints__balance">
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
                <span className="enigme-hints__content">le mot "note" semble mis en avant dans le readme, un find [mot] permettrais de mettre en avant certains fichier peut etre</span>
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
                <span className="enigme-hints__content">genesis/genesis_note2.enc semble encode, et si on essayait de le dechiffrer ?</span>
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
                <span className="enigme-hints__content">Des mots ressortent apres avoir dechiffre genesis_note2.enc. Un find -il [mot] sur l un de ces indices devrait pointer vers le fichier a traiter et a reparer, peut etre avec un de vos outils !.</span>
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
      {spendFx ? (
        <div className={"btc-spend-fx " + spendFx.type}>
          {spendFx.type === "spent" ? "- " + spendFx.amount + " BTC" : "Solde insuffisant"}
        </div>
      ) : null}

      {pendingHint !== null ? (
        <div className="hint-purchase-backdrop">
          <div className="hint-purchase-modal">
            <h4>Debloquer l'indice {pendingHint + 1}</h4>
            <p>Depenser {HINT_COST} BTC pour reveler cet indice ?</p>
            <div className="hint-purchase-actions">
              <button type="button" className="game-primary" onClick={handleConfirmHintPurchase}>
                Payer {HINT_COST} BTC
              </button>
              <button type="button" className="game-secondary" onClick={handleCancelHintPurchase}>
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
              color: "#4b5563",
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










