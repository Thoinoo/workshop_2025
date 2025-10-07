import { getAvatarById } from "../constants/avatars";

export default function PlayersList({ players = [] }) {
  return (
    <div className="players-list">
      <h3>Agents</h3>
      <ul>
        {players.length > 0 ? (
          players.map((player, index) => {
            const username = player?.username || `agent-${index + 1}`;
            const avatarMeta = getAvatarById(player?.avatar);
            return (
              <li key={username} className="players-list__item">
                <div className="players-list__avatar" aria-hidden="true">
                  {avatarMeta ? (
                    <img src={avatarMeta.src} alt="" />
                  ) : (
                    <span className="players-list__avatar--placeholder">
                      {username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="players-list__name">{username}</span>
              </li>
            );
          })
        ) : (
          <li className="empty-state">En attente d'autres joueurs...</li>
        )}
      </ul>
    </div>
  );
}
