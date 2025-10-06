import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Accueil() {
  const [pseudo, setPseudo] = useState("");
  const [room, setRoom] = useState("");
  const navigate = useNavigate();

  const handleJoin = () => {
    if (pseudo && room) {
      sessionStorage.setItem("pseudo", pseudo);
      sessionStorage.setItem("room", room);
      navigate("/jeu");
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Accueil</h1>
      <input placeholder="Pseudo" value={pseudo} onChange={e => setPseudo(e.target.value)} />
      <br />
      <input placeholder="Numéro de salle" value={room} onChange={e => setRoom(e.target.value)} />
      <br />
      <button onClick={handleJoin}>Jouer</button>
    </div>
  );
}
