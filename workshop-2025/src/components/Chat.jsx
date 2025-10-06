import { useState } from "react";

export default function Chat({ chat, onSendMessage }) {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    onSendMessage(trimmed);
    setMessage("");
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-box" role="log" aria-live="polite">
        {chat.length > 0 ? (
          chat.map((m, index) => (
            <div key={`${m.username}-${index}`} className="chat-message">
              <span className="chat-author">{m.username}</span>
              <span className="chat-text">{m.message}</span>
            </div>
          ))
        ) : (
          <p className="empty-state">Soyez le premier à lancer la conversation !</p>
        )}
      </div>

      <div className="chat-input">
        <input
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Écrire un message..."
        />
        <button className="game-primary" onClick={handleSend}>
          Envoyer
        </button>
      </div>
    </div>
  );
}