import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import socket from "../socket";

export default function Jeu() {
  const navigate = useNavigate();
  const username = sessionStorage.getItem("pseudo");
  const room = sessionStorage.getItem("room");

  const [players, setPlayers] = useState([]);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState(() => {
    try {
      const stored = sessionStorage.getItem("chatHistory");
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("Unable to read chat history from sessionStorage", error);
      return [];
    }
  });

  useEffect(() => {
    if (!username || !room) {
        navigate("/");
        return () => {};
      }
    socket.emit("joinRoom", { username, room });

    socket.on("playersUpdate", setPlayers);
    socket.on("newMessage", (msg) =>
      setChat((prev) => {
        const updated = [...prev, msg];
        try {
          sessionStorage.setItem("chatHistory", JSON.stringify(updated));
        } catch (error) {
          console.error("Unable to persist chat history in sessionStorage", error);
        }
        return updated;
      })
    );

    return () => {
      socket.off("playersUpdate");
      socket.off("newMessage");
    };
    }, [navigate, room, username]);

  useEffect(() => {
    try {
      sessionStorage.setItem("chatHistory", JSON.stringify(chat));
    } catch (error) {
      console.error("Unable to persist chat history in sessionStorage", error);
    }
  }, [chat]);

  const sendMessage = () => {
    if (message.trim()) {
      socket.emit("chatMessage", { room, username, message });
      setMessage("");
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h2>Salle {room}</h2>

      <h3>Joueurs :</h3>
      <ul>{players.map((p, i) => <li key={i}>{p}</li>)}</ul>

      <h3>Chat :</h3>
      <div style={{ border: "1px solid #ccc", height: 150, overflowY: "auto" }}>
        {chat.map((m, i) => (
          <p key={i}><strong>{m.username}</strong>: {m.message}</p>
        ))}
      </div>

      <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Message..." />
      <button onClick={sendMessage}>Envoyer</button>

      <br /><br />
      <button onClick={() => navigate("/enigme1")}>Aller vers Enigme 1</button>
    </div>
  );
}
