import { getAvatarById } from "../constants/avatars";

export default function EnigmePresence({ players = [], scene }) {
  if (!scene) {
    return null;
  }

  const onScene = players
    .filter((player) => player && player.scene === scene && player.username)
    .map((player) => ({
      username: player.username,
      avatar: player.avatar ?? null,
    }));

  return (
    <div className="enigme-presence" aria-live="polite">
      <span className="enigme-presence__label">Agents sur cette énigme :</span>
      {onScene.length ? (
        <ul className="enigme-presence__list">
          {onScene.map(({ username, avatar }) => {
            const avatarMeta = getAvatarById(avatar);
            return (
              <li key={username} className="enigme-presence__item">
                <div className="enigme-presence__avatar" aria-hidden="true">
                  {avatarMeta ? (
                    <img src={avatarMeta.src} alt="" />
                  ) : (
                    <span className="enigme-presence__avatar--placeholder">
                      {username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="enigme-presence__name">{username}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <span className="enigme-presence__empty">Seul dans cette énigme pour l&apos;instant…</span>
      )}
    </div>
  );
}
