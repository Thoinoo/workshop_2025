import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket";

export default function Enigme1() {
  const navigate = useNavigate();
  const username = sessionStorage.getItem("pseudo");
  const room = sessionStorage.getItem("room");

  const [players, setPlayers] = useState([]);
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    socket.on("playersUpdate", setPlayers);
    socket.on("newMessage", (msg) => setChat((prev) => [...prev, msg]));
    return () => {
      socket.off("playersUpdate");
      socket.off("newMessage");
    };
  }, []);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("chatMessage", { room, username, message });
      setMessage("");
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h1>Énigme 1 🔍</h1>
      <ul>{players.map((p, i) => <li key={i}>{p}</li>)}</ul>

      <div style={{ border: "1px solid #ccc", height: 150, overflowY: "auto" }}>
        {chat.map((m, i) => (
          <p key={i}><strong>{m.username}</strong>: {m.message}</p>
        ))}
      </div>

      <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Message..." />
      <button onClick={sendMessage}>Envoyer</button>

      <br /><br />
      <button onClick={() => navigate("/jeu")}>Retour au jeu</button>
    </div>
  );
}
