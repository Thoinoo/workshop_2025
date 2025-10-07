import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Chat from "../components/Chat";
import PlayersList from "../components/PlayersList";
import BombeTimer from "../components/BombeTimer";
import useRoomState from "../hooks/useRoomState";
import btcCounterImage from "../assets/btc_counter.png";
import enigmGridImage from "../assets/enigm_grid.png";
import { AVATARS, getAvatarById } from "../constants/avatars";
import "./lobby.css";

export default function Preparation() {
  const navigate = useNavigate();
  const {
    username,
    room,
    players,
    chat,
    sendMessage,
    timerRemaining,
    isHost,
    missionStarted,
    startMission,
    avatar,
    updateAvatar,
  } = useRoomState();
  const selectedAvatar = getAvatarById(avatar);

  const infoMessage = useMemo(() => {
    if (players.length <= 1) {
      return "En attente de vos coequipiers. Partagez le code de salle pour les inviter avant de lancer la mission.";
    }
    if (isHost) {
      return "Tout le monde est la ? Vous pouvez lancer la mission lorsque l'equipe est prete.";
    }
    return "L'hote demarrera la mission des que l'equipe est au complet. Restez a l'ecoute.";
  }, [isHost, players.length]);

  useEffect(() => {
    if (missionStarted) {
      navigate("/jeu");
    }
  }, [missionStarted, navigate]);

  return (
    <div className="game-page">
      <header className="game-header">
        <div className="game-header-section game-header-section--info">
          <p className="game-room game-room--blink">Salle {room}</p>
          
          <p className="game-username">
            {username ? (
              <>
                Agent <strong>{username}</strong>, nous attendons l'equipe avant de declencher le compte a rebours.
              </>
            ) : (
              "Temps de preparation en cours."
            )}
          </p>
        </div>

        <div className="game-header-section game-header-section--timer">
          <BombeTimer remainingSeconds={timerRemaining} />
        </div>

        <div className="game-header-section game-header-section--actions">
          {isHost ? (
            <button className="game-primary" onClick={startMission} disabled={missionStarted}>
              Lancer la mission
            </button>
          ) : (
            <span className="home-code-badge">En attente du lancement</span>
          )}
        </div>
      </header>

      <div className="game-layout">
        <section className="game-card">
          <h2>Transmission prioritaire : RASSEMBLEMENT DES AGENTS</h2>

          <div className="puzzle-instructions">
            <h4>Briefing d'urgence</h4>
            <p>
              Ingenieurs, ecoutez : la blockchain universelle se desagrege sous vos yeux. Des blocs ont ete effaces, d'autres corrompus, et le tissu de la confiance numerique se dechire. Ici, dans cette salle, commence votre dernier effort pour recoudre le monde. Vous etes la main qui tiendra le registre.
            </p>

            <h4>Compteur Bitcoin - votre timer de survie</h4>
            <p>
              En haut de l'ecran, le compteur de Bitcoin pulse comme un coeur en peril : il represente le temps restant avant que le reseau ne s'eteigne. Quand il atteindra zero, les transactions tomberont dans l'oubli et vous aurez perdu. Regardez-le, sentez sa cadence : chaque seconde compte, chaque decision pese.
            </p>
              <img src={btcCounterImage} alt="Compteur Bitcoin affiché en haut de l'écran" />
            

            <h4>Numero de salle - appelez des renforts</h4>
            <p>
              En haut a gauche, votre numero de salle clignote : c'est le seul canal pour appeler d'autres ingenieurs. Partagez-le maintenant. Chaque nouvelle paire d'yeux et de cerveaux augmente vos chances de reparer la chaine avant l'ultime effondrement.
            </p>

            <h4>Choisissez votre avatar</h4>
            <p>
              Identifiez-vous visuellement pour votre escouade. Selectionnez un avatar pour qu'il s'affiche aupres de vos coequipiers.
            </p>
            <div className="avatar-selector">
              {AVATARS.map(({ id, src, label }) => {
                const isSelected = id === avatar;
                return (
                  <button
                    key={id}
                    type="button"
                    className={["avatar-selector__choice", isSelected ? "is-selected" : ""].join(" ").trim()}
                    onClick={() => updateAvatar(id)}
                    aria-pressed={isSelected}
                  >
                    <span className="avatar-selector__image">
                      <img src={src} alt={label} />
                    </span>
                    <span className="avatar-selector__label">{label}</span>
                  </button>
                );
              })}
            </div>

            <h4>En route vers les enigmes</h4>
            <p>
              Le chemin vers la reparation compte quatre etapes. Utilisez le bouton de navigation ci-dessous pour lancer la premiere mission : cliquez sur l'icone. Les enigmes sont vos outils : resolvez-les pour restaurer le Genesis Block, recalculer les liens, retablir le consensus et decrypter la cle maitresse.
            </p>
              <img src={enigmGridImage} alt="Grille d'enigmes à completer" />
            

            <h4>Communication et cooperation</h4>
            <p>
              Restez connectes : le chat conserve l'historique et la liste des joueurs reste visible. Partagez les indices, repartissez les taches, surveillez le compteur. Une erreur isolee peut etre fatale, mais une equipe synchronisee peut inverser la destinee du reseau.
            </p>

            <h4>Mission - reparer la blockchain</h4>
            <p>
              Le monde depend de vous. Travaillez vite, travaillez bien : chaque enigme reussie rallume une portion du registre global. Gagnez, et vous sauverez l'economie numerique. Perdez, et tout s'effondrera en poussiere de donnees. Allez, le futur n'attend pas !
            </p>
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
