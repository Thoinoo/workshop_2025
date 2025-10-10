require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { addEntry, getTopEntries, getTotalEntries } = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const ROOM_DURATION_SECONDS = Number(process.env.ROOM_DURATION_SECONDS || 3600);
const AVAILABLE_TOOLS = {
  fileFixer: { id: 'fileFixer' },
  hashTranslator: { id: 'hashTranslator' }
};

const buildInitialToolsState = () =>
  Object.keys(AVAILABLE_TOOLS).reduce((acc, id) => {
    acc[id] = { holder: null };
    return acc;
  }, {});

const TERMINAL_HISTORY_LIMIT = 200;
const ENIGME4_KEYS = ['A2', 'C3', 'D1'];
const ENIGME3_WALLETS = ['Wallet A', 'Wallet B', 'Wallet C'];
const ENIGME3_KEYS = ['Key1', 'Key2', 'Key3'];
const ENIGME3_MAPPING = {
  'Wallet A': 'Key1',
  'Wallet B': 'Key2',
  'Wallet C': 'Key3'
};

const ENIGME2_NODE_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const ENIGME2_SPECIAL_ENDPOINTS = ['center', 'left', 'right'];

const buildInitialEnigme2State = () => ({
  links: []
});

const ENIGME2_NODE_ID_SET = new Set(ENIGME2_NODE_IDS);
const ENIGME2_SPECIAL_ENDPOINTS_SET = new Set(ENIGME2_SPECIAL_ENDPOINTS);

const ENIGME5_GRID_ROWS = 5;
const ENIGME5_GRID_COLUMNS = 5;
const ENIGME5_TOTAL_PIECES = ENIGME5_GRID_ROWS * ENIGME5_GRID_COLUMNS;
const ENIGME5_PREVIEW_DURATION_MS = 5_000;
const ENIGME5_INITIAL_TIMER_SECONDS = 120;
const ENIGME5_HELP_DURATION_SECONDS = 20;
const ENIGME5_HELP_COST_SECONDS = 20;
const ENIGME5_HELP_GLOBAL_PENALTY = 500;
const ENIGME5_FRIEND_HELP_BONUS_SECONDS = 15;

const buildInitialEnigme4State = () => ({
  foundKeys: [],
  wrongCells: [],
  lastSelection: null,
  completed: false
});

const buildInitialEnigme3State = () => ({
  selections: {},
  feedback: {},
  completed: false
});

const buildInitialEnigme5State = (now = Date.now()) => ({
  pieces: Array.from({ length: ENIGME5_TOTAL_PIECES }, (_, index) => index),
  phase: 'preview',
  previewEndsAt: null,
  gameDeadline: null,
  helpActiveUntil: null,
  helpUses: 0,
  solvedAt: null,
  lastShuffleAt: null,
  lastUpdate: now
});

const shufflePieces = (input) => {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const generateShuffledPieces = () => {
  const base = Array.from({ length: ENIGME5_TOTAL_PIECES }, (_, index) => index);
  let candidate = shufflePieces(base);
  if (isPuzzleSolved(candidate)) {
    candidate = shufflePieces(candidate);
  }
  return candidate;
};

const isPuzzleSolved = (pieces) =>
  Array.isArray(pieces) &&
  pieces.length === ENIGME5_TOTAL_PIECES &&
  pieces.every((value, index) => value === index);

let rooms = {}; // { roomNumber: { players: [{ username, avatar, scene, terminalRole }], messages: [], timer: { remaining, interval, started }, enigmes: {}, startedAt: number|null, missionSummary?: { elapsedSeconds, completedAt }, missionFailed: boolean, tools: { [toolId]: { holder: string|null } }, terminalRoles: { [username]: 'operator'|'observer' }, terminal: { sharedInput: string, history: Array<{ command: string, outputs: string[] }> } } }

const ensureRoom = (roomName) => {
  if (!rooms[roomName]) {
    rooms[roomName] = {
      players: [],
      messages: [],
      timer: { remaining: ROOM_DURATION_SECONDS, interval: null, started: false },
      enigmes: {},
      enigme2: buildInitialEnigme2State(),
      enigme3: buildInitialEnigme3State(),
      enigme4: buildInitialEnigme4State(),
      enigme5: buildInitialEnigme5State(),
      startedAt: null,
      missionSummary: null,
      missionFailed: false,
      tools: buildInitialToolsState(),
      terminalRoles: {},
      terminal: {
        sharedInput: '',
        history: []
      }
    };
  }

  if (!rooms[roomName].tools) {
    rooms[roomName].tools = buildInitialToolsState();
  }

  if (!rooms[roomName].enigme3) {
    rooms[roomName].enigme3 = buildInitialEnigme3State();
  }

  if (!rooms[roomName].enigme2) {
    rooms[roomName].enigme2 = buildInitialEnigme2State();
  }

  if (!rooms[roomName].enigme4) {
    rooms[roomName].enigme4 = buildInitialEnigme4State();
  }

  if (!rooms[roomName].enigme5) {
    rooms[roomName].enigme5 = buildInitialEnigme5State();
  }

  return rooms[roomName];
};

const resetTerminalState = (roomState) => {
  if (!roomState) {
    return;
  }
  roomState.terminal = {
    sharedInput: '',
    history: []
  };
};

const sanitizePlayerList = (players = []) =>
  (players || []).filter(
    (player) => player && typeof player.username === 'string' && player.username.trim().length
  );

const assignTerminalRolesForRoom = (roomState) => {
  if (!roomState) {
    return;
  }

  const players = sanitizePlayerList(roomState.players);

  if (!players.length) {
    roomState.terminalRoles = {};
    return;
  }

  if (players.length === 1) {
    const username = players[0].username.trim();
    roomState.terminalRoles = { [username]: 'operator' };
  } else {
    const shuffled = players
      .map((player) => ({
        player,
        sort: Math.random()
      }))
      .sort((a, b) => a.sort - b.sort)
      .map((entry) => entry.player);

    const operatorCount = Math.max(1, Math.ceil(shuffled.length / 2));
    roomState.terminalRoles = {};

    shuffled.forEach((player, index) => {
      const role = index < operatorCount ? 'operator' : 'observer';
      roomState.terminalRoles[player.username.trim()] = role;
    });
  }

  roomState.players = players.map((player) => ({
    ...player,
    terminalRole: roomState.terminalRoles[player.username.trim()] ?? null
  }));
};

const emitTerminalState = (roomName) => {
  const roomState = rooms[roomName];
  if (!roomState) {
    return;
  }
  io.to(roomName).emit('terminal:state', {
    sharedInput: roomState.terminal?.sharedInput ?? '',
    history: Array.isArray(roomState.terminal?.history) ? roomState.terminal.history : []
  });
};

const broadcastPlayersUpdate = (roomName) => {
  const roomState = rooms[roomName];
  if (!roomState) {
    return;
  }
  io.to(roomName).emit('playersUpdate', roomState.players);
};

const isOperatorForRoom = (roomState, username) =>
  Boolean(
    roomState &&
      roomState.terminalRoles &&
      typeof username === 'string' &&
      roomState.terminalRoles[username] === 'operator'
  );

const emitToolsUpdate = (roomName) => {
  const roomState = rooms[roomName];
  if (!roomState || !roomState.tools) {
    return;
  }
  io.to(roomName).emit('toolsUpdate', { ...roomState.tools });
};

const assignToolsToPlayers = (roomState) => {
  if (!roomState) {
    return;
  }
  const toolIds = Object.keys(AVAILABLE_TOOLS);
  const playerNames = (roomState.players || [])
    .map((player) => (player && typeof player.username === 'string' ? player.username.trim() : ''))
    .filter((name) => Boolean(name));

  if (!toolIds.length) {
    roomState.tools = {};
    return;
  }

  if (!playerNames.length) {
    toolIds.forEach((toolId) => {
      roomState.tools[toolId] = { holder: null };
    });
    return;
  }

  const shuffledPlayers = playerNames
    .map((name) => ({ name, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map((entry) => entry.name);

  toolIds.forEach((toolId, index) => {
    const holder = shuffledPlayers[index % shuffledPlayers.length];
    roomState.tools[toolId] = { holder };
  });
};

const assignToolsForRoom = (roomName) => {
  const roomState = ensureRoom(roomName);
  assignToolsToPlayers(roomState);
  emitToolsUpdate(roomName);
};

const normalizeEnigme2Endpoint = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed.length) {
      return null;
    }
    if (ENIGME2_SPECIAL_ENDPOINTS_SET.has(trimmed)) {
      return trimmed;
    }
    const numericValue = Number(trimmed);
    if (Number.isInteger(numericValue) && ENIGME2_NODE_ID_SET.has(numericValue)) {
      return numericValue;
    }
    return null;
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value) && ENIGME2_NODE_ID_SET.has(value)) {
      return value;
    }
    return null;
  }
  return null;
};

const buildEnigme2LinkKey = (endpoint) =>
  typeof endpoint === 'number' ? `n${endpoint}` : `s${String(endpoint)}`;

const sanitizeEnigme2Links = (links) => {
  if (!Array.isArray(links)) {
    return [];
  }
  const seen = new Set();
  const sanitized = [];

  for (const rawLink of links) {
    const a = normalizeEnigme2Endpoint(rawLink?.a);
    const b = normalizeEnigme2Endpoint(rawLink?.b);
    if (a === null || b === null || a === b) {
      continue;
    }
    const keyA = buildEnigme2LinkKey(a);
    const keyB = buildEnigme2LinkKey(b);
    const sortAB = keyA <= keyB;
    const dedupeKey = sortAB ? `${keyA}-${keyB}` : `${keyB}-${keyA}`;
    if (seen.has(dedupeKey)) {
      continue;
    }
    seen.add(dedupeKey);
    sanitized.push({
      a: sortAB ? a : b,
      b: sortAB ? b : a
    });
  }

  sanitized.sort((left, right) => {
    const leftKey = `${buildEnigme2LinkKey(left.a)}-${buildEnigme2LinkKey(left.b)}`;
    const rightKey = `${buildEnigme2LinkKey(right.a)}-${buildEnigme2LinkKey(right.b)}`;
    return leftKey.localeCompare(rightKey);
  });

  return sanitized;
};

const getEnigme2State = (roomState) => {
  if (!roomState || typeof roomState !== 'object') {
    return buildInitialEnigme2State();
  }
  if (!roomState.enigme2 || typeof roomState.enigme2 !== 'object') {
    roomState.enigme2 = buildInitialEnigme2State();
  }
  if (!Array.isArray(roomState.enigme2.links)) {
    roomState.enigme2.links = [];
  }
  return roomState.enigme2;
};

const resetEnigme2State = (roomState) => {
  if (!roomState) {
    return;
  }
  roomState.enigme2 = buildInitialEnigme2State();
};

const emitEnigme2State = (roomName, { targetSocket = null } = {}) => {
  const roomState = ensureRoom(roomName);
  const enigme2State = getEnigme2State(roomState);
  const linksSnapshot = Array.isArray(enigme2State.links)
    ? enigme2State.links.map((link) => ({ a: link.a, b: link.b }))
    : [];
  const payload = {
    room: roomName,
    links: linksSnapshot
  };
  if (targetSocket) {
    targetSocket.emit('enigme2:state', payload);
  } else {
    io.to(roomName).emit('enigme2:state', payload);
  }
  return payload;
};

const getEnigme3State = (roomState) => {
  if (!roomState) {
    return buildInitialEnigme3State();
  }
  if (!roomState.enigme3 || typeof roomState.enigme3 !== 'object') {
    roomState.enigme3 = buildInitialEnigme3State();
  }
  return roomState.enigme3;
};

const resetEnigme3State = (roomState) => {
  if (!roomState) {
    return;
  }
  roomState.enigme3 = buildInitialEnigme3State();
};

const emitEnigme3State = (roomName, { targetSocket = null } = {}) => {
  const roomState = ensureRoom(roomName);
  const enigme3State = getEnigme3State(roomState);
  const payload = {
    selections: { ...enigme3State.selections },
    feedback: { ...enigme3State.feedback },
    completed: Boolean(enigme3State.completed)
  };
  if (targetSocket) {
    targetSocket.emit('enigme3:state', payload);
  } else {
    io.to(roomName).emit('enigme3:state', payload);
  }
};

const getEnigme4State = (roomState) => {
  if (!roomState) {
    return buildInitialEnigme4State();
  }
  if (!roomState.enigme4 || typeof roomState.enigme4 !== 'object') {
    roomState.enigme4 = buildInitialEnigme4State();
  }
  return roomState.enigme4;
};

const resetEnigme4State = (roomState) => {
  if (!roomState) {
    return;
  }
  roomState.enigme4 = buildInitialEnigme4State();
};

const emitEnigme4State = (roomName, { targetSocket = null } = {}) => {
  const roomState = ensureRoom(roomName);
  const enigme4State = getEnigme4State(roomState);
  const payload = {
    foundKeys: [...enigme4State.foundKeys],
    wrongCells: [...enigme4State.wrongCells],
    lastSelection: enigme4State.lastSelection ? { ...enigme4State.lastSelection } : null,
    completed: Boolean(enigme4State.completed)
  };
  if (targetSocket) {
    targetSocket.emit('enigme4:state', payload);
  } else {
    io.to(roomName).emit('enigme4:state', payload);
  }
};

const getEnigme5State = (roomState) => {
  if (!roomState) {
    return buildInitialEnigme5State();
  }
  if (!roomState.enigme5 || typeof roomState.enigme5 !== 'object') {
    roomState.enigme5 = buildInitialEnigme5State();
  }
  return roomState.enigme5;
};

const resetEnigme5State = (roomState) => {
  if (!roomState) {
    return;
  }
  roomState.enigme5 = buildInitialEnigme5State();
};

const normalizeEnigme5State = (enigme5State, now = Date.now()) => {
  if (!enigme5State) {
    return buildInitialEnigme5State(now);
  }

  const timestamp = Number.isFinite(now) ? now : Date.now();

  if (enigme5State.phase === 'preview' && !Number.isFinite(enigme5State.previewEndsAt)) {
    enigme5State.previewEndsAt = timestamp + ENIGME5_PREVIEW_DURATION_MS;
    enigme5State.lastUpdate = timestamp;
  }

  if (
    enigme5State.helpActiveUntil &&
    Number.isFinite(enigme5State.helpActiveUntil) &&
    timestamp >= enigme5State.helpActiveUntil
  ) {
    enigme5State.helpActiveUntil = null;
  }

  if (enigme5State.phase === 'preview' && enigme5State.previewEndsAt <= timestamp) {
    enigme5State.phase = 'active';
    enigme5State.pieces = generateShuffledPieces();
    enigme5State.gameDeadline = timestamp + ENIGME5_INITIAL_TIMER_SECONDS * 1000;
    enigme5State.lastShuffleAt = timestamp;
    enigme5State.lastUpdate = timestamp;
  }

  if (enigme5State.phase === 'active') {
    if (!Number.isFinite(enigme5State.gameDeadline)) {
      enigme5State.gameDeadline = timestamp + ENIGME5_INITIAL_TIMER_SECONDS * 1000;
      enigme5State.lastShuffleAt = enigme5State.lastShuffleAt ?? timestamp;
      enigme5State.lastUpdate = timestamp;
    } else if (timestamp >= enigme5State.gameDeadline) {
      enigme5State.pieces = generateShuffledPieces();
      enigme5State.gameDeadline = timestamp + ENIGME5_INITIAL_TIMER_SECONDS * 1000;
      enigme5State.lastShuffleAt = timestamp;
      enigme5State.lastUpdate = timestamp;
    }
  }

  if (enigme5State.phase === 'solved') {
    enigme5State.helpActiveUntil = null;
    enigme5State.gameDeadline = null;
    enigme5State.previewEndsAt = null;
  }

  return enigme5State;
};

const snapshotEnigme5State = (enigme5State, now = Date.now()) => ({
  pieces: Array.isArray(enigme5State?.pieces) ? [...enigme5State.pieces] : [],
  phase: enigme5State?.phase ?? 'preview',
  previewEndsAt: enigme5State?.previewEndsAt ?? null,
  gameDeadline: enigme5State?.gameDeadline ?? null,
  helpActiveUntil: enigme5State?.helpActiveUntil ?? null,
  helpUses: Number.isFinite(enigme5State?.helpUses) ? enigme5State.helpUses : 0,
  helpPenaltySeconds:
    (Number.isFinite(enigme5State?.helpUses) ? enigme5State.helpUses : 0) *
    ENIGME5_HELP_GLOBAL_PENALTY,
  solvedAt: enigme5State?.solvedAt ?? null,
  lastShuffleAt: enigme5State?.lastShuffleAt ?? null,
  serverTimestamp: now,
  config: {
    previewDurationMs: ENIGME5_PREVIEW_DURATION_MS,
    helpDurationSeconds: ENIGME5_HELP_DURATION_SECONDS,
    helpCostSeconds: ENIGME5_HELP_COST_SECONDS,
    initialTimerSeconds: ENIGME5_INITIAL_TIMER_SECONDS,
    friendHelpBonusSeconds: ENIGME5_FRIEND_HELP_BONUS_SECONDS,
    globalHelpPenaltySeconds: ENIGME5_HELP_GLOBAL_PENALTY
  }
});

const emitEnigme5State = (roomName, { targetSocket = null } = {}) => {
  const roomState = ensureRoom(roomName);
  const enigme5State = normalizeEnigme5State(getEnigme5State(roomState));
  const payload = snapshotEnigme5State(enigme5State);
  if (targetSocket) {
    targetSocket.emit('enigme5:state', payload);
  } else {
    io.to(roomName).emit('enigme5:state', payload);
  }
  return payload;
};

const appendSystemMessage = (roomName, message) => {
  const sanitizedMessage = typeof message === 'string' ? message : '';
  if (!sanitizedMessage.trim()) {
    return;
  }
  const roomState = ensureRoom(roomName);
  const entry = { username: 'SYSTEM', message: sanitizedMessage };
  roomState.messages.push(entry);
  io.to(roomName).emit('newMessage', entry);
};

const updateEnigmeStatusForRoom = (roomName, key, completed) => {
  const normalizedKey = typeof key === 'string' ? key.trim() : '';
  if (!normalizedKey) {
    return;
  }
  const roomState = ensureRoom(roomName);
  if (normalizedKey === 'enigme3') {
    const enigme3State = getEnigme3State(roomState);
    enigme3State.completed = Boolean(completed);
  }
  if (normalizedKey === 'enigme4') {
    const enigme4State = getEnigme4State(roomState);
    enigme4State.completed = Boolean(completed);
  }
  if (normalizedKey === 'enigme5') {
    const enigme5State = getEnigme5State(roomState);
    if (completed) {
      enigme5State.phase = 'solved';
      enigme5State.solvedAt = Date.now();
      enigme5State.helpActiveUntil = null;
      enigme5State.gameDeadline = null;
      if (!isPuzzleSolved(enigme5State.pieces)) {
        enigme5State.pieces = Array.from({ length: ENIGME5_TOTAL_PIECES }, (_, index) => index);
      }
    } else {
      enigme5State.phase = 'preview';
      enigme5State.solvedAt = null;
      enigme5State.previewEndsAt = null;
      enigme5State.gameDeadline = null;
      enigme5State.helpActiveUntil = null;
      enigme5State.helpUses = 0;
      enigme5State.lastShuffleAt = null;
      enigme5State.pieces = Array.from({ length: ENIGME5_TOTAL_PIECES }, (_, index) => index);
    }
  }
  roomState.enigmes[normalizedKey] = Boolean(completed);
  const enigmeStatuses = Object.values(roomState.enigmes);
  const allSolved = enigmeStatuses.length > 0 && enigmeStatuses.every(Boolean);
  if (allSolved && roomState.startedAt && !roomState.missionSummary) {
    const completedAt = Date.now();
    const elapsedMs = completedAt - roomState.startedAt;
    roomState.missionSummary = {
      completedAt,
      elapsedSeconds: Math.max(0, Math.round(elapsedMs / 1000))
    };
  }
  io.to(roomName).emit('enigmeStatusUpdate', {
    key: normalizedKey,
    completed: Boolean(completed)
  });
  io.to(roomName).emit('enigmesProgressSync', { ...roomState.enigmes });
};

const releaseToolsForUsername = (roomState, username) => {
  if (!roomState?.tools || !username) {
    return false;
  }
  let updated = false;
  Object.keys(roomState.tools).forEach((toolId) => {
    const toolState = roomState.tools[toolId];
    if (toolState?.holder === username) {
      roomState.tools[toolId] = { holder: null };
      updated = true;
    }
  });
  return updated;
};

const startTimerForRoom = (roomName, { reset = false } = {}) => {
  const room = ensureRoom(roomName);

  if (reset || !room.timer.started) {
    room.timer.remaining = ROOM_DURATION_SECONDS;
    room.timer.started = true;
    room.timer.speedMultiplier = 1;
    room.startedAt = Date.now();
    room.missionSummary = null;
    room.missionFailed = false;
  }

  if (room.timer.interval) return room.timer.remaining;

  room.timer.interval = setInterval(() => {
  if (!room.timer.started) return;

  const speed = room.timer.speedMultiplier || 1;
  room.timer.remaining = Math.max(0, room.timer.remaining - 0.1 * speed); // diminue plus vite si speed > 1

  io.to(roomName).emit("timerUpdate", room.timer.remaining);

  if (room.timer.remaining <= 0) {
    clearInterval(room.timer.interval);
    room.timer.interval = null;
    room.timer.started = false;
    room.timer.remaining = 0;
    room.missionFailed = true;
    io.to(roomName).emit("missionFailed", { elapsedSeconds: 0 });
  }
}, 100);


  io.to(roomName).emit("timerUpdate", room.timer.remaining);
  return room.timer.remaining;
};

const setTimerSpeedForRoom = (roomName, factor) => {
  const roomState = ensureRoom(roomName);
  if (!roomState?.timer) {
    return;
  }

  const speedFactor = Number.isFinite(Number(factor)) ? Math.max(1, Number(factor)) : 1;
  roomState.timer.speedMultiplier = speedFactor;

  if (!roomState.timer.started) {
    startTimerForRoom(roomName, { reset: true });
  }
};

const applyTimerPenaltyForRoom = (roomName, seconds, { reason = null, message = null } = {}) => {
  const trimmedRoom = typeof roomName === "string" ? roomName.trim() : "";
  const amount = Number(seconds);

  if (!trimmedRoom || !Number.isFinite(amount) || amount <= 0) {
    return;
  }

  const roomState = ensureRoom(trimmedRoom);
  if (!roomState?.timer || !roomState.timer.started) {
    return;
  }

  roomState.timer.remaining = Math.max(0, roomState.timer.remaining - amount);
  io.to(trimmedRoom).emit("timerUpdate", roomState.timer.remaining);

  const penaltyMessage =
    typeof message === "string" && message.trim()
      ? message
      : reason === "hint"
        ? "Indice utilise : -" + amount + "s"
        : null;

  if (penaltyMessage) {
    appendSystemMessage(trimmedRoom, penaltyMessage);
  }

  if (roomState.timer.remaining <= 0) {
    if (roomState.timer.interval) {
      clearInterval(roomState.timer.interval);
      roomState.timer.interval = null;
    }
    if (roomState.timer.started) {
      roomState.timer.started = false;
      roomState.timer.remaining = 0;
      roomState.missionFailed = true;
      io.to(trimmedRoom).emit("missionFailed", { elapsedSeconds: 0 });
    }
  }
};

const stopTimerForRoom = (roomName) => {
  const room = rooms[roomName];
  if (!room || !room.timer) {
    return;
  }

  if (room.timer.interval) {
    clearInterval(room.timer.interval);
    room.timer.interval = null;
  }

  room.timer.started = false;
  room.timer.remaining = ROOM_DURATION_SECONDS;
  room.startedAt = null;
  room.missionSummary = null;
  room.missionFailed = false;
};

const leaveRoom = (socket, roomName) => {
  if (!roomName) {
    return;
  }

  socket.leave(roomName);
  const room = rooms[roomName];

  if (!room) {
    return;
  }

  let toolsUpdated = false;
  if (socket.data?.username) {
    room.players = room.players.filter((player) => player.username !== socket.data.username);
    if (room.terminalRoles) {
      delete room.terminalRoles[socket.data.username];
    }
    toolsUpdated = releaseToolsForUsername(room, socket.data.username) || toolsUpdated;
    if (room.timer.started && room.players.length) {
      assignToolsToPlayers(room);
      toolsUpdated = true;
    } else if (!room.timer.started && !room.players.length) {
      room.tools = buildInitialToolsState();
      toolsUpdated = true;
    }
  }

  if (!room.players.length) {
    stopTimerForRoom(roomName);
  }

  if (!room.players.length && !room.messages.length) {
    delete rooms[roomName];
  } else {
    if (room.timer.started && room.players.length) {
      assignTerminalRolesForRoom(room);
    }
    io.to(roomName).emit('playersUpdate', room.players);
    if (toolsUpdated) {
      emitToolsUpdate(roomName);
    }
    if (room.timer.started) {
      emitTerminalState(roomName);
    }
  }
};

io.on('connection', (socket) => {
  console.log('🟢 Nouvelle connexion');

  socket.on('joinRoom', ({ username, room, avatar }, callback = () => {}) => {
    const trimmedUsername = (username ?? '').trim();
    const trimmedRoom = (room ?? '').trim();
    const sanitizedAvatar = typeof avatar === 'string' ? avatar.trim() : null;

    if (!trimmedUsername || !trimmedRoom) {
      callback({ players: [], messages: [], timer: ROOM_DURATION_SECONDS });
      return;
    }

    if (socket.data?.room && socket.data.room !== trimmedRoom) {
      leaveRoom(socket, socket.data.room);
    }

    socket.join(trimmedRoom);
    socket.data.username = trimmedUsername;
    socket.data.room = trimmedRoom;

    const roomState = ensureRoom(trimmedRoom);
    if (roomState.timer.started && !roomState.timer.interval) {
      startTimerForRoom(trimmedRoom);
    }
    const timerValue = roomState.timer.remaining;

    const existingPlayer = roomState.players.find((player) => player.username === trimmedUsername);
    roomState.players = roomState.players.filter((player) => player.username !== trimmedUsername);
    roomState.players.push({
      username: trimmedUsername,
      avatar: sanitizedAvatar,
      scene: existingPlayer?.scene ?? null,
      terminalRole: roomState.terminalRoles[trimmedUsername] ?? existingPlayer?.terminalRole ?? null
    });

    io.to(trimmedRoom).emit('playersUpdate', roomState.players);
    socket.emit('chatHistory', roomState.messages);
    socket.emit('timerUpdate', timerValue);
    socket.emit('enigmesProgressSync', { ...roomState.enigmes });
    socket.emit('toolsUpdate', { ...roomState.tools });
    socket.emit('terminal:state', {
      sharedInput: roomState.terminal?.sharedInput ?? '',
      history: Array.isArray(roomState.terminal?.history) ? roomState.terminal.history : []
    });
    emitEnigme2State(trimmedRoom, { targetSocket: socket });
    emitEnigme3State(trimmedRoom, { targetSocket: socket });
    emitEnigme4State(trimmedRoom, { targetSocket: socket });
    if (roomState.timer.started) {
      socket.emit('missionStarted');
    }

    callback({
      players: [...roomState.players],
      messages: [...roomState.messages],
      timer: timerValue,
      missionStarted: roomState.timer.started,
      missionFailed: roomState.missionFailed,
      missionSummary: roomState.missionSummary ? { ...roomState.missionSummary } : null,
      enigmes: { ...roomState.enigmes },
      tools: { ...roomState.tools },
      terminal: {
        sharedInput: roomState.terminal?.sharedInput ?? '',
        history: Array.isArray(roomState.terminal?.history) ? roomState.terminal.history : []
      },
      terminalRoles: { ...roomState.terminalRoles }
    });

    console.log(`${trimmedUsername} a rejoint la salle ${trimmedRoom}`);
  });

  socket.on('chatMessage', ({ room, username, message }) => {
    const msg = { username, message };
    const roomState = ensureRoom(room);
    roomState.messages.push(msg);
    io.to(room).emit('newMessage', msg);
  });

  socket.on('enigme2:requestState', ({ room } = {}, callback = () => {}) => {
    const trimmedRoom = (room ?? '').trim();
    if (!trimmedRoom) {
      if (typeof callback === 'function') {
        callback({ ok: false, error: 'room is required' });
      }
      return;
    }
    const payload = emitEnigme2State(trimmedRoom, { targetSocket: socket });
    if (typeof callback === 'function') {
      callback({ ok: true, links: payload.links, state: payload });
    }
  });

  socket.on('enigme2:updateLinks', ({ room, links } = {}) => {
    const trimmedRoom = (room ?? '').trim();
    if (!trimmedRoom) {
      return;
    }
    const roomState = ensureRoom(trimmedRoom);
    const enigme2State = getEnigme2State(roomState);
    const sanitizedLinks = sanitizeEnigme2Links(links);
    const currentLinks = Array.isArray(enigme2State.links) ? enigme2State.links : [];
    const hasChanged =
      sanitizedLinks.length !== currentLinks.length ||
      sanitizedLinks.some((link, index) => {
        const existing = currentLinks[index];
        return !existing || existing.a !== link.a || existing.b !== link.b;
      });
    if (!hasChanged) {
      return;
    }
    enigme2State.links = sanitizedLinks.map((link) => ({ a: link.a, b: link.b }));
    emitEnigme2State(trimmedRoom);
  });

  socket.on('enigme3:requestState', ({ room } = {}, callback = () => {}) => {
    const trimmedRoom = (room ?? '').trim();
    if (!trimmedRoom) {
      if (typeof callback === 'function') {
        callback({ selections: {}, feedback: {}, completed: false });
      }
      return;
    }
    const roomState = ensureRoom(trimmedRoom);
    const enigme3State = getEnigme3State(roomState);
    const snapshot = {
      selections: { ...enigme3State.selections },
      feedback: { ...enigme3State.feedback },
      completed: Boolean(enigme3State.completed)
    };
    if (typeof callback === 'function') {
      callback(snapshot);
    } else {
      emitEnigme3State(trimmedRoom, { targetSocket: socket });
    }
  });

  socket.on('enigme3:assignKey', ({ room, wallet, key } = {}, callback = () => {}) => {
    const trimmedRoom = (room ?? '').trim();
    const normalizedWallet = typeof wallet === 'string' ? wallet.trim() : '';
    const hasKeyPayload = typeof key === 'string' && key.trim().length > 0;
    const normalizedKey = hasKeyPayload ? key.trim() : '';
    const username = (socket.data?.username ?? '').trim();

    if (!trimmedRoom || !normalizedWallet || !username) {
      callback({ ok: false, error: 'invalid_payload' });
      return;
    }
    if (!ENIGME3_WALLETS.includes(normalizedWallet)) {
      callback({ ok: false, error: 'invalid_target' });
      return;
    }

    const roomState = ensureRoom(trimmedRoom);
    const enigme3State = getEnigme3State(roomState);
    if (enigme3State.completed) {
      callback({ ok: false, error: 'completed' });
      return;
    }
    if (!hasKeyPayload) {
      if (enigme3State.selections[normalizedWallet]) {
        delete enigme3State.selections[normalizedWallet];
        delete enigme3State.feedback[normalizedWallet];
        emitEnigme3State(trimmedRoom);
      }
      callback({ ok: true, removed: true });
      return;
    }
    if (!ENIGME3_KEYS.includes(normalizedKey)) {
      callback({ ok: false, error: 'invalid_target' });
      return;
    }

    Object.keys(enigme3State.selections || {}).forEach((walletName) => {
      if (enigme3State.selections[walletName] === normalizedKey && walletName !== normalizedWallet) {
        delete enigme3State.selections[walletName];
        delete enigme3State.feedback[walletName];
      }
    });

    enigme3State.selections[normalizedWallet] = normalizedKey;
    delete enigme3State.feedback[normalizedWallet];
    emitEnigme3State(trimmedRoom);

    callback({ ok: true });
  });

  socket.on('enigme3:validate', ({ room } = {}, callback = () => {}) => {
    const trimmedRoom = (room ?? '').trim();
    if (!trimmedRoom) {
      callback({ ok: false, error: 'invalid_payload' });
      return;
    }

    const roomState = ensureRoom(trimmedRoom);
    const enigme3State = getEnigme3State(roomState);
    const selections = enigme3State.selections || {};
    const feedback = {};
    let allCorrect = true;

    ENIGME3_WALLETS.forEach((walletName) => {
      const assigned = selections[walletName] || null;
      if (assigned && ENIGME3_MAPPING[walletName] === assigned) {
        feedback[walletName] = 'correct';
      } else {
        feedback[walletName] = assigned ? 'incorrect' : 'missing';
        allCorrect = false;
      }
    });

    enigme3State.feedback = feedback;
    if (allCorrect) {
      enigme3State.completed = true;
      updateEnigmeStatusForRoom(trimmedRoom, 'enigme3', true);
    } else {
      enigme3State.completed = false;
    }

    emitEnigme3State(trimmedRoom);
    callback({ ok: true, completed: enigme3State.completed });
  });

  socket.on('enigme4:requestState', ({ room } = {}, callback = () => {}) => {
    const trimmedRoom = (room ?? '').trim();
    if (!trimmedRoom) {
      if (typeof callback === 'function') {
        callback({
          foundKeys: [],
          wrongCells: [],
          lastSelection: null,
          completed: false
        });
      }
      return;
    }

    const roomState = ensureRoom(trimmedRoom);
    const state = getEnigme4State(roomState);
    const snapshot = {
      foundKeys: [...state.foundKeys],
      wrongCells: [...state.wrongCells],
      lastSelection: state.lastSelection ? { ...state.lastSelection } : null,
      completed: Boolean(state.completed)
    };

    if (typeof callback === 'function') {
      callback(snapshot);
    } else {
      emitEnigme4State(trimmedRoom, { targetSocket: socket });
    }
  });

  socket.on('enigme4:selectCell', ({ room, cell } = {}) => {
    const trimmedRoom = (room ?? '').trim();
    const normalizedCell =
      typeof cell === 'string' && cell.trim().length ? cell.trim().toUpperCase() : '';

    if (!trimmedRoom || !normalizedCell) {
      return;
    }

    const roomState = ensureRoom(trimmedRoom);
    const enigme4State = getEnigme4State(roomState);

    if (enigme4State.completed) {
      emitEnigme4State(trimmedRoom, { targetSocket: socket });
      return;
    }

    if (
      enigme4State.foundKeys.includes(normalizedCell) ||
      enigme4State.wrongCells.includes(normalizedCell)
    ) {
      emitEnigme4State(trimmedRoom, { targetSocket: socket });
      return;
    }

    const timestamp = Date.now();
    const isKey = ENIGME4_KEYS.includes(normalizedCell);

    if (isKey) {
      enigme4State.foundKeys.push(normalizedCell);
      enigme4State.lastSelection = { cell: normalizedCell, type: 'key', ts: timestamp };

      if (enigme4State.foundKeys.length >= ENIGME4_KEYS.length) {
        enigme4State.completed = true;
        updateEnigmeStatusForRoom(trimmedRoom, 'enigme4', true);
      }
    } else {
      enigme4State.wrongCells.push(normalizedCell);
      enigme4State.lastSelection = { cell: normalizedCell, type: 'wrong', ts: timestamp };

      const factor = enigme4State.wrongCells.length * 2;
      setTimerSpeedForRoom(trimmedRoom, factor);
      appendSystemMessage(
        trimmedRoom,
        `Alerte: Mauvaise case (${normalizedCell}) - vitesse x${factor}`
      );
    }

    emitEnigme4State(trimmedRoom);
  });

  socket.on('enigme5:requestState', ({ room } = {}, callback = () => {}) => {
    const trimmedRoom = (room ?? '').trim();
    const fallback = snapshotEnigme5State(buildInitialEnigme5State());

    if (!trimmedRoom) {
      if (typeof callback === 'function') {
        callback(fallback);
      }
      return;
    }

    const roomState = ensureRoom(trimmedRoom);
    const enigme5State = normalizeEnigme5State(getEnigme5State(roomState));
    const snapshot = snapshotEnigme5State(enigme5State);

    if (typeof callback === 'function') {
      callback(snapshot);
    } else {
      socket.emit('enigme5:state', snapshot);
    }
  });

  socket.on('enigme5:swapPieces', ({ room, sourceIndex, targetIndex } = {}) => {
    const trimmedRoom = (room ?? '').trim();
    if (!trimmedRoom) {
      return;
    }

    const from = Number(sourceIndex);
    const to = Number(targetIndex);
    if (!Number.isInteger(from) || !Number.isInteger(to)) {
      emitEnigme5State(trimmedRoom, { targetSocket: socket });
      return;
    }
    if (from === to) {
      emitEnigme5State(trimmedRoom, { targetSocket: socket });
      return;
    }

    const roomState = ensureRoom(trimmedRoom);
    const enigme5State = normalizeEnigme5State(getEnigme5State(roomState));

    if (enigme5State.phase !== 'active') {
      emitEnigme5State(trimmedRoom, { targetSocket: socket });
      return;
    }

    const now = Date.now();
    const pieces = Array.isArray(enigme5State.pieces) ? enigme5State.pieces : [];
    if (
      from < 0 ||
      from >= pieces.length ||
      to < 0 ||
      to >= pieces.length ||
      !Number.isInteger(from) ||
      !Number.isInteger(to)
    ) {
      emitEnigme5State(trimmedRoom, { targetSocket: socket });
      return;
    }

    [pieces[from], pieces[to]] = [pieces[to], pieces[from]];
    enigme5State.lastUpdate = now;

    if (isPuzzleSolved(pieces)) {
      enigme5State.phase = 'solved';
      enigme5State.solvedAt = now;
      enigme5State.helpActiveUntil = null;
      enigme5State.gameDeadline = null;
      updateEnigmeStatusForRoom(trimmedRoom, 'enigme5', true);
      emitEnigme5State(trimmedRoom);
      io.to(trimmedRoom).emit('enigme5:solved');
    } else {
      emitEnigme5State(trimmedRoom);
    }
  });

  socket.on('enigme5:requestHelp', ({ room } = {}, callback = () => {}) => {
    const trimmedRoom = (room ?? '').trim();
    if (!trimmedRoom) {
      if (typeof callback === 'function') {
        callback({ ok: false, error: 'invalid_room' });
      }
      return;
    }

    const roomState = ensureRoom(trimmedRoom);
    const enigme5State = normalizeEnigme5State(getEnigme5State(roomState));
    const now = Date.now();

    if (enigme5State.phase !== 'active') {
      emitEnigme5State(trimmedRoom, { targetSocket: socket });
      if (typeof callback === 'function') {
        callback({ ok: false, error: 'inactive' });
      }
      return;
    }

    enigme5State.helpUses = Number.isFinite(enigme5State.helpUses) ? enigme5State.helpUses + 1 : 1;
    const helpDurationMs = ENIGME5_HELP_DURATION_SECONDS * 1000;
    enigme5State.helpActiveUntil = now + helpDurationMs;
    enigme5State.lastUpdate = now;

    if (Number.isFinite(enigme5State.gameDeadline)) {
      enigme5State.gameDeadline -= ENIGME5_HELP_COST_SECONDS * 1000;
      if (!Number.isFinite(enigme5State.gameDeadline) || enigme5State.gameDeadline < now) {
        enigme5State.gameDeadline = now;
      }
    } else {
      enigme5State.gameDeadline = now + (ENIGME5_INITIAL_TIMER_SECONDS - ENIGME5_HELP_COST_SECONDS) * 1000;
    }

    const snapshot = emitEnigme5State(trimmedRoom);

    if (typeof callback === 'function') {
      callback({ ok: true, state: snapshot });
    }
  });

  socket.on('enigme5:friendHelpSuccess', ({ room } = {}, callback = () => {}) => {
    const trimmedRoom = (room ?? '').trim();
    if (!trimmedRoom) {
      if (typeof callback === 'function') {
        callback({ ok: false, error: 'invalid_room' });
      }
      return;
    }

    const roomState = ensureRoom(trimmedRoom);
    const enigme5State = normalizeEnigme5State(getEnigme5State(roomState));
    const now = Date.now();

    if (enigme5State.phase !== 'active') {
      emitEnigme5State(trimmedRoom, { targetSocket: socket });
      if (typeof callback === 'function') {
        callback({ ok: false, error: 'inactive' });
      }
      return;
    }

    const bonusMs = ENIGME5_FRIEND_HELP_BONUS_SECONDS * 1000;
    if (Number.isFinite(enigme5State.gameDeadline)) {
      enigme5State.gameDeadline += bonusMs;
    } else {
      enigme5State.gameDeadline = now + ENIGME5_INITIAL_TIMER_SECONDS * 1000 + bonusMs;
    }
    enigme5State.lastUpdate = now;

    const snapshot = emitEnigme5State(trimmedRoom);

    if (typeof callback === 'function') {
      callback({ ok: true, state: snapshot });
    }
  });

  socket.on('startMission', ({ room }) => {
    const trimmedRoom = (room ?? '').trim();
    if (!trimmedRoom) {
      return;
    }

    const roomState = ensureRoom(trimmedRoom);
    const shouldReset = !roomState.timer.started;
    const timerValue = startTimerForRoom(trimmedRoom, { reset: shouldReset });
    assignToolsForRoom(trimmedRoom);
    assignTerminalRolesForRoom(roomState);
    resetTerminalState(roomState);
    resetEnigme2State(roomState);
    resetEnigme3State(roomState);
    resetEnigme4State(roomState);
    resetEnigme5State(roomState);
    broadcastPlayersUpdate(trimmedRoom);
    emitTerminalState(trimmedRoom);
    emitEnigme2State(trimmedRoom);
    emitEnigme3State(trimmedRoom);
    emitEnigme4State(trimmedRoom);
    emitEnigme5State(trimmedRoom);
    io.to(trimmedRoom).emit('missionStarted');
    io.to(trimmedRoom).emit('timerUpdate', timerValue);
  });

  socket.on('timer:deduct', ({ room, seconds, reason } = {}) => {
    const trimmedRoom = (room ?? '').trim();
    if (!trimmedRoom) {
      return;
    }

    const amount = Number(seconds);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }

    const username = typeof socket.data?.username === 'string' ? socket.data.username.trim() : '';
    let penaltyMessage = null;

    if (reason === 'hint') {
      const actor = username || 'Un joueur';
      penaltyMessage = actor + ' a utilise un indice : -' + amount + 's';
    }

    applyTimerPenaltyForRoom(trimmedRoom, amount, { reason, message: penaltyMessage });
  });
  socket.on('resetMission', ({ room }) => {
    const trimmedRoom = (room ?? '').trim();
    if (!trimmedRoom) {
      return;
    }

    const roomState = ensureRoom(trimmedRoom);
    stopTimerForRoom(trimmedRoom);
    roomState.messages = [];
    roomState.enigmes = {};
    roomState.startedAt = null;
    roomState.missionSummary = null;
    roomState.missionFailed = false;
    roomState.tools = buildInitialToolsState();
    roomState.terminalRoles = {};
    roomState.players = roomState.players.map((player) => ({
      ...player,
      terminalRole: null
    }));
    resetTerminalState(roomState);
    resetEnigme2State(roomState);
    resetEnigme3State(roomState);
    resetEnigme4State(roomState);
    resetEnigme5State(roomState);
    io.to(trimmedRoom).emit('missionReset');
    io.to(trimmedRoom).emit('timerUpdate', roomState.timer.remaining);
    io.to(trimmedRoom).emit('enigmesProgressSync', {});
    emitToolsUpdate(trimmedRoom);
    broadcastPlayersUpdate(trimmedRoom);
    emitTerminalState(trimmedRoom);
    emitEnigme2State(trimmedRoom);
    emitEnigme3State(trimmedRoom);
    emitEnigme4State(trimmedRoom);
    emitEnigme5State(trimmedRoom);
  });

  socket.on('terminal:requestState', ({ room } = {}, callback = () => {}) => {
    const trimmedRoom = (room ?? '').trim();
    if (!trimmedRoom) {
      if (typeof callback === 'function') {
        callback({ sharedInput: '', history: [] });
      }
      return;
    }
    const roomState = ensureRoom(trimmedRoom);
    const snapshot = {
      sharedInput: roomState.terminal?.sharedInput ?? '',
      history: Array.isArray(roomState.terminal?.history) ? roomState.terminal.history : []
    };
    if (typeof callback === 'function') {
      callback(snapshot);
    } else {
      socket.emit('terminal:state', snapshot);
    }
  });

  socket.on('terminal:input', ({ room, text } = {}) => {
    const trimmedRoom = (room ?? '').trim();
    const username = (socket.data?.username ?? '').trim();
    if (!trimmedRoom || !username) {
      return;
    }
    const roomState = ensureRoom(trimmedRoom);
    if (!isOperatorForRoom(roomState, username)) {
      return;
    }
    const sanitizedText =
      typeof text === 'string' ? text.slice(0, 512) : '';
    roomState.terminal.sharedInput = sanitizedText;
    io.to(trimmedRoom).emit('terminal:inputUpdate', { text: sanitizedText });
  });

  socket.on('terminal:execute', ({ room, command, outputs } = {}, callback = () => {}) => {
    const trimmedRoom = (room ?? '').trim();
    const username = (socket.data?.username ?? '').trim();
    if (!trimmedRoom || !username) {
      if (typeof callback === 'function') {
        callback({ ok: false, error: 'invalid_payload' });
      }
      return;
    }

    const roomState = ensureRoom(trimmedRoom);
    if (!isOperatorForRoom(roomState, username)) {
      if (typeof callback === 'function') {
        callback({ ok: false, error: 'forbidden' });
      }
      return;
    }

    const sanitizedCommand = typeof command === 'string' ? command.trim() : '';
    if (!sanitizedCommand) {
      if (typeof callback === 'function') {
        callback({ ok: false, error: 'empty_command' });
      }
      return;
    }

    const sanitizedOutputs = Array.isArray(outputs)
      ? outputs
          .map((line) =>
            typeof line === 'string' ? line : String(line ?? '')
          )
          .slice(0, 50)
      : [];

    if (!Array.isArray(roomState.terminal?.history)) {
      roomState.terminal.history = [];
    }

    roomState.terminal.history.push({
      command: sanitizedCommand,
      outputs: sanitizedOutputs
    });

    if (roomState.terminal.history.length > TERMINAL_HISTORY_LIMIT) {
      roomState.terminal.history.splice(
        0,
        roomState.terminal.history.length - TERMINAL_HISTORY_LIMIT
      );
    }

    roomState.terminal.sharedInput = '';

    io.to(trimmedRoom).emit('terminal:commandExecuted', {
      command: sanitizedCommand,
      outputs: sanitizedOutputs
    });
    io.to(trimmedRoom).emit('terminal:inputUpdate', { text: '' });

    if (typeof callback === 'function') {
      callback({ ok: true });
    }
  });

  socket.on('terminal:clear', ({ room } = {}, callback = () => {}) => {
    const trimmedRoom = (room ?? '').trim();
    const username = (socket.data?.username ?? '').trim();
    if (!trimmedRoom || !username) {
      if (typeof callback === 'function') {
        callback({ ok: false, error: 'invalid_payload' });
      }
      return;
    }
    const roomState = ensureRoom(trimmedRoom);
    if (!isOperatorForRoom(roomState, username)) {
      if (typeof callback === 'function') {
        callback({ ok: false, error: 'forbidden' });
      }
      return;
    }

    resetTerminalState(roomState);
    io.to(trimmedRoom).emit('terminal:cleared');
    io.to(trimmedRoom).emit('terminal:inputUpdate', { text: '' });

    if (typeof callback === 'function') {
      callback({ ok: true });
    }
  });

  socket.on('tool:fileFixer:repair', ({ room, content } = {}, callback = () => {}) => {
    const trimmedRoom = (room ?? '').trim();
    const username = (socket.data?.username ?? '').trim();
    if (!trimmedRoom || !username) {
      callback({ ok: false, error: 'invalid_payload' });
      return;
    }

    const roomState = ensureRoom(trimmedRoom);
    const toolState = roomState.tools.fileFixer;
    if (!toolState) {
      callback({ ok: false, error: 'unknown_tool' });
      return;
    }
    if (!toolState.holder) {
      callback({ ok: false, error: 'unassigned' });
      return;
    }

    if (toolState.holder !== username) {
      callback({ ok: false, error: 'not_holder', holder: toolState.holder });
      return;
    }

    const text = typeof content === 'string' ? content : '';
    const containsSignature = text.includes('block_0365468.hash');
    const randomMessage = Math.random() < 0.5 ? 'reparation impossible' : 'repare';
    const message = containsSignature ? 'repare' : randomMessage;
    const alreadyCompleted = roomState.enigmes.enigme1 === true;

    if (containsSignature && !alreadyCompleted) {
      updateEnigmeStatusForRoom(trimmedRoom, 'enigme1', true);
    }

    callback({
      ok: true,
      message,
      success: containsSignature,
      alreadyCompleted
    });
  });

  socket.on('tool:hashTranslator:translate', ({ room, hash } = {}, callback = () => {}) => {
    const trimmedRoom = (room ?? '').trim();
    const username = (socket.data?.username ?? '').trim();
    if (!trimmedRoom || !username) {
      callback({ ok: false, error: 'invalid_payload' });
      return;
    }

    const roomState = ensureRoom(trimmedRoom);
    const toolState = roomState.tools.hashTranslator;
    if (!toolState) {
      callback({ ok: false, error: 'unknown_tool' });
      return;
    }
    if (!toolState.holder) {
      callback({ ok: false, error: 'unassigned' });
      return;
    }
    if (toolState.holder !== username) {
      callback({ ok: false, error: 'not_holder', holder: toolState.holder });
      return;
    }

    const normalizedHash = typeof hash === 'string' ? hash.trim().toLowerCase() : '';
    const knownTranslation = normalizedHash ? HASH_TRANSLATIONS[normalizedHash] : null;
    const translation = knownTranslation || pickRandomHashCell();

    callback({
      ok: true,
      translation,
      known: Boolean(knownTranslation),
      hash: normalizedHash
    });
  });

  socket.on('enigmeStatusUpdate', ({ room, key, completed }) => {
    const trimmedRoom = (room ?? '').trim();
    if (!trimmedRoom) {
      return;
    }

    updateEnigmeStatusForRoom(trimmedRoom, key, completed);
  });

  socket.on('avatarUpdate', ({ room, username, avatar }) => {
    const trimmedRoom = (room ?? '').trim();
    const trimmedUsername = (username ?? '').trim();
    if (!trimmedRoom || !trimmedUsername) {
      return;
    }
    const roomState = ensureRoom(trimmedRoom);
    const sanitizedAvatar = typeof avatar === 'string' ? avatar.trim() : null;
    let updated = false;
    roomState.players = roomState.players.map((player) => {
      if (player.username === trimmedUsername) {
        updated = true;
        return { ...player, avatar: sanitizedAvatar };
      }
      return player;
    });
    if (!updated) {
      roomState.players.push({ username: trimmedUsername, avatar: sanitizedAvatar, scene: null });
    }
    io.to(trimmedRoom).emit('playersUpdate', roomState.players);
  });

  socket.on('playerSceneUpdate', ({ room, username, scene }) => {
    const trimmedRoom = (room ?? '').trim();
    const trimmedUsername = (username ?? '').trim();
    if (!trimmedRoom || !trimmedUsername) {
      return;
    }
    const roomState = ensureRoom(trimmedRoom);
    let updated = false;
    const normalizedScene = typeof scene === 'string' && scene.trim().length ? scene.trim() : null;
    roomState.players = roomState.players.map((player) => {
      if (player.username === trimmedUsername) {
        if (player.scene !== normalizedScene) {
          updated = true;
          return { ...player, scene: normalizedScene };
        }
      }
      return player;
    });
    if (updated) {
      io.to(trimmedRoom).emit('playersUpdate', roomState.players);
    }
  });

  socket.on('leaderboardEntryRecorded', ({ room, entry }) => {
    const trimmedRoom = (room ?? '').trim();
    if (!trimmedRoom) {
      return;
    }
    io.to(trimmedRoom).emit('leaderboardEntryRecorded', entry ?? null);
  });

  socket.on('accelerateTimer', ({ room, factor } = {}) => {
    const trimmedRoom = (room ?? '').trim();
    if (!trimmedRoom) {
      return;
    }

    const speedFactor = Number.isFinite(Number(factor)) ? Math.max(1, Number(factor)) : 1;
    setTimerSpeedForRoom(trimmedRoom, speedFactor);

    console.log(`Timer for room "${trimmedRoom}" accelerated x${speedFactor}`);
});

  socket.on('disconnect', () => {
    const { room } = socket.data || {};

    leaveRoom(socket, room);
    console.log('🔴 Déconnexion');
  });
});

app.get('/api/leaderboard', (req, res) => {
  const limit = Number.parseInt(req.query.limit, 10);
  const entries = getTopEntries(limit);
  res.json({ entries, total: getTotalEntries() });
});

app.post('/api/leaderboard', (req, res) => {
  const { teamName, players, elapsedSeconds } = req.body ?? {};
  if (!Array.isArray(players) || players.length === 0) {
    return res.status(400).json({ error: 'players must be a non-empty array of names' });
  }
  if (!Number.isFinite(elapsedSeconds)) {
    return res.status(400).json({ error: 'elapsedSeconds must be provided' });
  }

  try {
    const entry = addEntry({ teamName, players, elapsedSeconds });
    res.status(201).json({ entry, total: getTotalEntries() });
  } catch (error) {
    console.error('Failed to add leaderboard entry', error);
    res.status(500).json({ error: 'Failed to store leaderboard entry' });
  }
});

server.listen(PORT, () => console.log(`API sur http://localhost:${PORT}`));


const HASH_TRANSLATIONS = {
  '892c1b5b4f90a2d7e8c3a1f5d4b6e7f1': 'A2',
  '5e2a9c7d1f48b3e0c6a4d8f2b1e7c9a5': 'C3',
  'c1f3a5d7e9b2c4a6d8f0e1b3a7c9d5f2': 'D1'
};
const HASH_TRANSLATOR_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const HASH_TRANSLATOR_NUMBERS = ['1', '2', '3', '4', '5', '6'];

const pickRandomHashCell = () => {
  const letter =
    HASH_TRANSLATOR_LETTERS[Math.floor(Math.random() * HASH_TRANSLATOR_LETTERS.length)];
  const number =
    HASH_TRANSLATOR_NUMBERS[Math.floor(Math.random() * HASH_TRANSLATOR_NUMBERS.length)];
  return `${letter}${number}`;
};

