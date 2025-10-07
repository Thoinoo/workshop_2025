import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import "./lobby.css";
import BombeTimer from "../components/BombeTimer";
import useRoomState from "../hooks/useRoomState";
import EnigmesGridMenu from "../components/EnigmesGrid";
import GenesisTerminal from "../components/GenesisTerminal";

export default function Enigme1() {
  const navigate = useNavigate();
  const { username, room, players, chat, timerRemaining, sendMessage, missionStarted } =
    useRoomState();
  const [openedHints, setOpenedHints] = useState({});

  const toggleHint = (index) => {
    setOpenedHints((current) => ({
      ...current,
      [index]: !current[index],
    }));
  };

  useEffect(() => {
    if (!missionStarted) {
      navigate("/preparation", { replace: true });
    }
  }, [missionStarted, navigate]);

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="game-header-section game-header-section--info">
          <EnigmesGridMenu active="enigme1" room={room} />
        </div>

        <div className="game-header-section game-header-section--timer">
          <BombeTimer remainingSeconds={missionStarted ? timerRemaining : null} />
        </div>

        <div className="game-header-section game-header-section--actions">
          <button className="game-secondary" onClick={() => navigate("/jeu")}>
            Retour au lobby
          </button>
        </div>
      </header>

      <div className="game-layout">
        <section className="game-card puzzle-content">
          <p className="game-username">
            {username ? (
              <>
                Agent <strong>{username}</strong>, decryptez les indices pour progresser vers la
                prochaine etape.
              </>
            ) : (
              "Preparez-vous a resoudre la premiere enigme."
            )}
          </p>
          <h2>Enigme 1</h2>
          <p>
            Observez attentivement les elements fournis par votre maitre du jeu. Chaque detail
            compte et l'echange d'idees avec votre equipe sera determinant.
          </p>

          <div className="puzzle-instructions">
            <h3>Briefing</h3>
            <p>
              Équipe, attention. Le réseau global vient de lever un drapeau rouge : la blockchain universelle est cassée. Certains blocs ont disparu, et sans le tout premier — le Bloc Genesis — le registre est orphelin : aucune transaction ne peut être vérifiée, aucun compte ne peut retrouver son historique. Vous êtes les derniers ingénieurs capables de réparer ça.

Devant vous se trouve un terminal sécurisé, dernier vestige d’un nœud intact. Satoshi a laissé un indice. Votre mission : retrouver le Bloc Genesis, extraire le message caché qu’il contient et vérifier son intégrité. Sans ce bloc, le réseau restera en panne et les valeurs tomberont dans l’oubli.

Utilisez le terminal. Tapez help si besoin. Les commandes utiles sont : ls pour lister, cat pour lire, decode pour déchiffrer, et hashinfo pour vérifier l’intégrité d’un bloc. Fouillez le répertoire genesis/, trouvez le fichier chiffré, décodez-le et prouvez que le bloc est authentique.
              </p>
          </div>

          

          <GenesisTerminal room={room} />
          <div className="enigme-hints">
            <h3>Indices</h3>
            <ul className="enigme-hints__list">
              <li
                className={`enigme-hints__item ${openedHints[0] ? "is-open" : ""}`}
              >
                <button
                  type="button"
                  className="enigme-hints__toggle"
                  onClick={() => toggleHint(0)}
                  aria-expanded={openedHints[0] ? "true" : "false"}
                >
                  Indice 1
                </button>
                <span className="enigme-hints__content">le mot "note" semble mis en avant dans le readme, un grep -r permettrais de mettre en avant certains fichier peut être</span>
              </li>
              <li
                className={`enigme-hints__item ${openedHints[1] ? "is-open" : ""}`}
              >
                <button
                  type="button"
                  className="enigme-hints__toggle"
                  onClick={() => toggleHint(1)}
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
                  onClick={() => toggleHint(2)}
                  aria-expanded={openedHints[2] ? "true" : "false"}
                >
                  Indice 3
                </button>
                <span className="enigme-hints__content">Des mots semblent mis en avant après avoir déchiffré genesis_note2.enc, un grep -ril sur un de ces mots permettrait peut être de trouver le fichier qu'on doit vérifier avec hashinfo !</span>
              </li>
            </ul>
          </div>
        </section>

        <aside className="chat-panel">
          <PlayersList players={players} />
          <Chat chat={chat} onSendMessage={sendMessage} />
        </aside>
      </div>
    </div>
  );
}
