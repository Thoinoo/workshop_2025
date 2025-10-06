import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./lobby.css";

export default function Accueil() {
  const [pseudo, setPseudo] = useState("");
  const [room, setRoom] = useState("");
  const navigate = useNavigate();

  const handleJoin = (event) => {
    event?.preventDefault();
    if (pseudo.trim() && room.trim()) {
      sessionStorage.setItem("pseudo", pseudo.trim());
      sessionStorage.setItem("room", room.trim());
      navigate("/jeu");
    }
  };

  return (
    <div className="game-page">
      <header className="game-header">
        <div>
          <p className="game-room">Bienvenue dans l'escape game</p>
          <p className="game-username">
            Créez votre identité d'agent, choisissez une salle et rejoignez votre équipe
            pour démarrer l'aventure.
          </p>
        </div>
      </header>

      <div className="game-layout">
        <section className="game-card">
          <h2>Rejoindre une salle</h2>
          <p>
            Indiquez votre pseudo ainsi que le numéro de salle communiqué par votre maître
            du jeu. Vous pourrez ensuite retrouver vos coéquipiers dans le lobby.
          </p>

          <form className="lobby-form" onSubmit={handleJoin}>
            <label>
              Pseudo
              <input
                className="lobby-input"
                placeholder="Nom de code"
                value={pseudo}
                onChange={(event) => setPseudo(event.target.value)}
              />
            </label>

            <label>
              Numéro de salle
              <input
                className="lobby-input"
                placeholder="Ex : 4521"
                value={room}
                onChange={(event) => setRoom(event.target.value)}
              />
            </label>

            <button type="submit" className="game-primary">
              Accéder au lobby
            </button>
          </form>
        </section>

        <aside className="chat-panel">
          <div className="puzzle-instructions">
            <h3>Avant de commencer</h3>
            <ul>
              <li>Assurez-vous d'avoir une connexion stable et un micro fonctionnel.</li>
              <li>Partagez le numéro de salle avec tous les membres de votre équipe.</li>
              <li>
                Préparez-vous à communiquer : la coopération sera la clé pour résoudre les
                énigmes.
              </li>
            </ul>
          </div>

          <div className="lobby-insight">
            <h3>Besoin d'aide ?</h3>
            <p>
              Si vous rencontrez un problème pour rejoindre une salle, vérifiez que le
              numéro est correct ou contactez votre maître du jeu.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
