import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useRoomState from "../hooks/useRoomState";
import { getAvatarById } from "../constants/avatars";
import { formatDuration, formatOrdinal } from "../utils/formatting";
import "./lobby.css";

const joinPlayers = (players) =>
  Array.isArray(players)
    ? players.filter((name) => typeof name === "string" && name.trim()).join(", ")
    : "";

const buildTeamName = (names, room) => {
  if (!Array.isArray(names) || !names.length) {
    return room ? `Salle ${room}` : "Equipe anonyme";
  }
  if (names.length === 1) {
    return names[0];
  }
  if (names.length === 2) {
    return `${names[0]} & ${names[1]}`;
  }
  return `${names[0]} + ${names.length - 1}`;
};

export default function Victory() {
  const navigate = useNavigate();
  const {
    room,
    players,
    missionStarted,
    missionCompleted,
    missionElapsedSeconds,
    resetMission,
    isHost,
    allEnigmesCompleted,
    latestLeaderboardEntry,
    recordLeaderboardEntry,
  } = useRoomState();

  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardTotal, setLeaderboardTotal] = useState(null);
  const [leaderboardError, setLeaderboardError] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const submissionRef = useRef(false);
  const lastFetchedEntryIdRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => () => {
    isMountedRef.current = false;
  }, []);

  useEffect(() => {
    if (!missionCompleted && !allEnigmesCompleted) {
      navigate(missionStarted ? "/jeu" : "/preparation", { replace: true });
    }
  }, [allEnigmesCompleted, missionCompleted, missionStarted, navigate]);

  const currentPlayers = useMemo(
    () => (players && players.length ? players.map((player) => player?.username).filter(Boolean) : []),
    [players]
  );

  const formattedTime = useMemo(
    () => formatDuration(missionElapsedSeconds),
    [missionElapsedSeconds]
  );

  const bitcoinsRemaining = useMemo(() => {
    if (
      latestLeaderboardEntry &&
      typeof latestLeaderboardEntry.bitcoinsRemaining === "number"
    ) {
      return latestLeaderboardEntry.bitcoinsRemaining;
    }
    return 21_000_000;
  }, [latestLeaderboardEntry]);

  const formattedBitcoinsRemaining = useMemo(
    () =>
      typeof bitcoinsRemaining === "number"
        ? bitcoinsRemaining.toLocaleString("fr-FR")
        : "—",
    [bitcoinsRemaining]
  );

  const teamName = useMemo(() => buildTeamName(currentPlayers, room), [currentPlayers, room]);

  const fetchLeaderboard = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }
    setLeaderboardLoading(true);
    setLeaderboardError(null);
    try {
      const response = await fetch("/api/leaderboard?limit=10");
      if (!response.ok) {
        throw new Error("Impossible de charger le classement");
      }
      const data = await response.json();
      if (!isMountedRef.current) {
        return;
      }
      setLeaderboard(Array.isArray(data.entries) ? data.entries : []);
      setLeaderboardTotal(typeof data.total === "number" ? data.total : null);
    } catch (error) {
      if (isMountedRef.current) {
        setLeaderboardError(error.message || "Impossible de charger le classement");
      }
    } finally {
      if (isMountedRef.current) {
        setLeaderboardLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  useEffect(() => {
    if (!missionCompleted) {
      submissionRef.current = false;
      return;
    }
    if (submissionRef.current) {
      return;
    }

    if (latestLeaderboardEntry) {
      submissionRef.current = true;
      fetchLeaderboard();
      return;
    }

    if (!isHost) {
      submissionRef.current = true;
      fetchLeaderboard();
      return;
    }

    if (!currentPlayers.length || !Number.isFinite(missionElapsedSeconds)) {
      submissionRef.current = true;
      fetchLeaderboard();
      return;
    }

    submissionRef.current = true;
    (async () => {
      try {
        const response = await fetch("/api/leaderboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamName,
            players: currentPlayers,
            elapsedSeconds: missionElapsedSeconds,
          }),
        });
        if (!response.ok) {
          throw new Error("Impossible d'enregistrer le score");
        }
        const data = await response.json();
        if (data.entry) {
          recordLeaderboardEntry(data.entry, { broadcast: true });
        }
        if (typeof data.total === "number") {
          setLeaderboardTotal(data.total);
        }
        await fetchLeaderboard();
      } catch (error) {
        if (isMountedRef.current) {
          setLeaderboardError(error.message || "Impossible d'enregistrer le score");
        }
        submissionRef.current = false;
      }
    })();
  }, [
    missionCompleted,
    missionElapsedSeconds,
    currentPlayers,
    teamName,
    isHost,
    latestLeaderboardEntry,
    recordLeaderboardEntry,
    fetchLeaderboard,
  ]);

  useEffect(() => {
    if (!latestLeaderboardEntry || latestLeaderboardEntry.id === lastFetchedEntryIdRef.current) {
      return;
    }
    lastFetchedEntryIdRef.current = latestLeaderboardEntry.id;
    fetchLeaderboard();
  }, [latestLeaderboardEntry, fetchLeaderboard]);

  const currentEntry = latestLeaderboardEntry;
  const currentRankLabel = useMemo(
    () => (currentEntry?.rank ? formatOrdinal(currentEntry.rank) : "--"),
    [currentEntry]
  );

  const outsideTopEntry = useMemo(() => {
    if (!currentEntry) {
      return null;
    }
    return leaderboard.some((entry) => entry.id === currentEntry.id) ? null : currentEntry;
  }, [currentEntry, leaderboard]);

  return (
    <div className="game-page victory-page">
      <header className="game-header">
        <div className="game-header-section game-header-section--info">
          <p className="game-room">Salle {room}</p>
          <p className="game-username">
            Mission accomplie ! Chaque bloc a ete restaure et la blockchain respire de nouveau.
          </p>
        </div>

        <div className="game-header-section game-header-section--actions">
          <button className="game-secondary" onClick={() => navigate("/")}>
            Retour au QG
          </button>
          {isHost ? (
            <button className="game-primary" onClick={resetMission}>
              Relancer une mission
            </button>
          ) : null}
        </div>
      </header>

      <main className="victory-layout">
        <section className="game-card victory-card">
          <h1>Victoire !</h1>
          <p className="victory-subtitle">
            Vous avez reconstitue l&apos;integrite du registre. Analyse du deploiement :
          </p>

          <div className="victory-metrics">
            <div className="victory-metric">
              <span className="victory-metric__label">Temps total</span>
              <span className="victory-metric__value">{formattedTime}</span>
            </div>
            <div className="victory-metric">
              <span className="victory-metric__label">Bitcoins restants</span>
              <span className="victory-metric__value">{formattedBitcoinsRemaining}</span>
            </div>
            <div className="victory-metric">
              <span className="victory-metric__label">Statut</span>
              <span className="victory-metric__value victory-metric__value--success">
                Blockchain stabilisee
              </span>
            </div>
            <div className="victory-metric">
              <span className="victory-metric__label">Classement</span>
              <span className="victory-metric__value">{currentRankLabel}</span>
              {leaderboardTotal ? (
                <span className="victory-metric__hint">sur {leaderboardTotal} equipes</span>
              ) : null}
            </div>
          </div>

          <div className="victory-players">
            <h2 className="victory-players__title">Équipes ayant participé</h2>
            <div className="victory-avatars">
              {players && players.length ? (
                players.map((player, index) => {
                  const username = player?.username || `agent-${index + 1}`;
                  const avatarMeta = getAvatarById(player?.avatar);
                  return (
                    <figure key={username} className="victory-avatar">
                      <span className="victory-avatar__frame" aria-hidden="true">
                        {avatarMeta ? (
                          <img src={avatarMeta.src} alt="" />
                        ) : (
                          <span className="victory-avatar__placeholder">
                            {username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </span>
                      <figcaption className="victory-avatar__name">{username}</figcaption>
                    </figure>
                  );
                })
              ) : (
                <p className="victory-avatars__empty">Les agents se déconnectent…</p>
              )}
            </div>
          </div>

          <div className="victory-leaderboard">
            <div className="leaderboard__header">
              <h2>Top 10 mondial</h2>
              {leaderboardTotal ? (
                <span className="leaderboard__total">{leaderboardTotal} equipes</span>
              ) : null}
            </div>
            {leaderboardError ? (
              <p className="leaderboard__error">{leaderboardError}</p>
            ) : null}
            {leaderboardLoading ? (
              <p className="leaderboard__loading">Chargement du classement…</p>
            ) : null}
            {!leaderboardLoading && !leaderboardError ? (
              leaderboard.length ? (
                <>
                  <ol className="leaderboard">
                    {leaderboard.map((entry) => {
                      const isCurrent = currentEntry && entry.id === currentEntry.id;
                      return (
                        <li
                          key={entry.id}
                          className={`leaderboard__item ${isCurrent ? "is-current" : ""}`.trim()}
                        >
                          <span className="leaderboard__rank">{formatOrdinal(entry.rank)}</span>
                          <span className="leaderboard__team">
                            <strong>{entry.teamName}</strong>
                            <span className="leaderboard__members">{joinPlayers(entry.players)}</span>
                          </span>
                          <span className="leaderboard__time">{formatDuration(entry.elapsedSeconds)}</span>
                        </li>
                      );
                    })}
                  </ol>
                  {outsideTopEntry ? (
                    <div className="leaderboard__current">
                      <span className="leaderboard__rank">{formatOrdinal(outsideTopEntry.rank)}</span>
                      <span className="leaderboard__team">
                        <strong>{outsideTopEntry.teamName}</strong>
                        <span className="leaderboard__members">{joinPlayers(outsideTopEntry.players)}</span>
                      </span>
                      <span className="leaderboard__time">
                        {formatDuration(outsideTopEntry.elapsedSeconds)}
                      </span>
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="leaderboard__empty">Pas encore de mission enregistrée.</p>
              )
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
