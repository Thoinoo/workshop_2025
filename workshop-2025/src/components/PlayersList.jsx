export default function PlayersList({ players }) {
    return (
      <div className="players-list">
        <h3>Participants</h3>
        <ul>
          {players.length > 0 ? (
            players.map((player, index) => <li key={`${player}-${index}`}>{player}</li>)
          ) : (
            <li className="empty-state">En attente d'autres joueurs…</li>
          )}
        </ul>
      </div>
    );
  }