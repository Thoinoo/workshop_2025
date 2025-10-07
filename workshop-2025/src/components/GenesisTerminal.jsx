import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const INITIAL_BOOT_LINES = [
  "[BOOT SEQUENCE ERROR]",
  "Blockchain node corrupted...",
  "> Missing: Genesis Block (ID #0)",
  "> Without it, no transactions can be verified.",
  "",
  "Mission: Reconstruct the lost Genesis Block",
  "Hint: Satoshi left a hidden message inside...",
];

const COMMANDS = [
  {
    command: "help",
    description: "Affiche cette liste d'aide",
  },
  {
    command: "ls [path]",
    description: "Liste le contenu d'un dossier",
  },
  {
    command: "cat <file>",
    description: "Affiche le contenu d'un fichier texte",
  },
  {
    command: "grep [-ril] <mot> [cible]",
    description: "Recherche un mot dans un fichier ou un dossier",
  },
  {
    command: "decode <file>",
    description: "Decode automatiquement (base64, caesar, rot13)",
  },
  {
    command: "hashinfo <file>",
    description: "Analyse un bloc et verifie son hash",
  },
  {
    command: "clear",
    description: "Nettoie l'ecran du terminal",
  },
];

const HELP_LINES = [
  "Available commands:",
  ...COMMANDS.map(
    ({ command, description }) =>
      `- ${command.padEnd(18)} ${description} `
  ),
];

const FILE_SYSTEM = {
  ".": {
    genesis: "dir",
    system: "dir",
    "readme.txt": "file",
  },
  "./genesis": {
    "README.txt": "file",
    "config.sys": "file",
    "block0.dat": "file",
    "block0.log": "file",
    "genesis_old.bak": "file",
    "genesis_note1.enc": "file",
    "genesis_note2.enc": "file",
    "genesis_map.dat": "file",
    "genesis_metadata.log": "file",
    "genesis_temp.txt": "file",
    "seed_genesis_001.bin": "file",
    "legacy_genesis.001": "file",
    "random01.txt": "file",
    "random02.txt": "file",
    "backup_readme.md": "file",
    "archive_genesis_v2.zip": "file",
    "secure-note.enc": "file",
    "block_final.hash": "file",
    "block_0001.dat": "file",
    "times_reference.txt": "file",
    docs: "dir",
  },
  "./genesis/docs": {
    "notes_genesis.txt": "file",
  },
  "./system": {
    "node.cfg": "file",
  },
};

const FILE_DATA = {
  "readme.txt": {
    content:
      "Satoshi's first message is hidden in the genesis folder, maybe you can find some notes.\nTo rebuild the chain, you must find the truth in the Times...",
  },
  "genesis/README.txt": {
    content:
      "# Node Genesis Brief\nThis node was shut down during the bailout crisis.\nManual recovery required.",
  },
  "genesis/config.sys": {
    content: "[system]\nmode=recovery\nconsensus=halted\n",
  },
  "genesis/block0.dat": {
    content:
      "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f\nMerkleRoot: 4a5e1e4baab89f3a32518a88c31bc87f618f76673e2cc77ab2127b7afdeda33b\nTimestamp: 1231006505\nNonce: 2083236893",
  },
  "genesis/block0.log": {
    content:
      "[01:12:45] Attempting block recovery...\n[01:12:47] Merkle root verified\n[01:12:51] Nonce search exhausted\n[01:13:02] Message payload corrupted - requires manual decode",
  },
  "genesis/genesis_old.bak": {
    content: "legacy GENESIS backup record :: do not deploy\nlast_verified: false",
  },
  "genesis/genesis_note1.enc": {
    content: "VGhpcyBpcyBhIHRlc3QgZGVjb2RlLg==",
  },
  "genesis/genesis_note2.enc": {
    content: "Uifsf jt b tfdsfu nfttbhf gspn Tbuptij/",
  },
  "genesis/genesis_map.dat": {
    content: "010101001110101000111010101000111001000\n// genesis topology sketch (corrupted)",
  },
  "genesis/genesis_metadata.log": {
    content:
      "[meta] genesis checksum mismatch\n[meta] flagged for manual rebuild\n[meta] trace keyword => genesis",
  },
  "genesis/genesis_temp.txt": {
    content: "# backup of genesis metadata\ncreated: 2010-01-01\nowner: node-admin",
  },
  "genesis/seed_genesis_001.bin": {
    content: "[binary] seed GENESIS payload",
    binary: true,
  },
  "genesis/legacy_genesis.001": {
    content: "legacy genesis snapshot\nstatus: deprecated\nnote: contains obsolete merkle seeds",
  },
  "genesis/random01.txt": {
    content: "random buffer :: genesis placeholder",
  },
  "genesis/random02.txt": {
    content: "random buffer :: genesis placeholder (2)",
  },
  "genesis/backup_readme.md": {
    content: "# Backup Plan\n- restore genesis metadata\n- confirm message integrity",
  },
  "genesis/archive_genesis_v2.zip": {
    content: "[binary archive: genesis data v2]",
    binary: true,
  },
  "genesis/secure-note.enc": {
    content: "n qhfnm xnt rts gdq",
  },
  "genesis/block_final.hash": {
    content:
      "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f\nReference: Chancellor on brink of second bailout for banks.",
  },
  "genesis/block_0001.dat": {
    content:
      "0000000082b5015589a3f41006f20b76a4d1b06fe5aebe1b51444ce07080f438\nNote: requires verified genesis hash.",
  },
  "genesis/times_reference.txt": {
    content: "Times archive marker: headline stored in verified hash records.",
  },
  "genesis/docs/notes_genesis.txt": {
    content: "Notes: legacy migration. do not trust.\nkeyword: genesis",
  },
  "system/node.cfg": {
    content:
      "# node.cfg\n[peers]\n  upstream = offline\n  consensus = suspended\n[status]\n  blocks_restored = 0/1",
  },
};

const HASH_RESPONSES = {
  "genesis/block0.dat": [
    "Block #0 hash:",
    "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
    "Status: VERIFIED [OK]",
    "Blockchain restored...",
    "",
    "[BLOCKCHAIN RESTORED - LEVEL 1]",
    'Genesis Block rebuilt successfully.',
    'You may proceed to Block #1: "The Chain of Trust"',
  ],
  "genesis/block_final.hash": [
    "Recovered hash record:",
    "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f",
    "Cross-reference: Chancellor on brink of second bailout for banks.",
    "Status: VERIFIED [OK]",
  ],
};

const MEANINGFUL_KEYWORDS = [
  "the",
  "this",
  "secret",
  "message",
  "genesis",
  "chancellor",
  "bailout",
  "banks",
];

const resolvePath = (input) => {
  if (!input) return ".";
  if (input === "." || input === "./") {
    return ".";
  }
  if (input.startsWith("./")) {
    return input.replace(/\/+$/, "");
  }
  if (input.startsWith("/")) {
    return `.${input}`.replace(/\/+$/, "");
  }
  return `./${input}`.replace(/\/+$/, "");
};

const normalizeFileKey = (input) => {
  if (!input) return null;
  const normalized = resolvePath(input).replace(/^\.\//, "");
  if (!normalized || normalized === ".") {
    return null;
  }
  if (FILE_DATA[normalized]) {
    return normalized;
  }
  if (!normalized.includes("/")) {
    const genesisKey = `genesis/${normalized}`;
    if (FILE_DATA[genesisKey]) {
      return genesisKey;
    }
  }
  return FILE_DATA[normalized] ? normalized : null;
};

const listDirectory = (path) => {
  const normalized = resolvePath(path);
  const entry = FILE_SYSTEM[normalized];
  if (!entry) {
    return `ls: cannot access '${path || "."}': No such file or directory`;
  }

  return Object.entries(entry)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, type]) => (type === "dir" ? `${name}/` : name))
    .join("  ");
};

const getFileData = (path) => {
  const key = normalizeFileKey(path);
  if (!key) {
    return null;
  }
  return { key, ...FILE_DATA[key] };
};

const readFile = (path) => {
  const data = getFileData(path);
  if (!data) {
    return `cat: ${path}: No such file`;
  }
  if (data.binary) {
    return `cat: ${path}: Binary data cannot be displayed`;
  }
  return data.content;
};

const isLikelyBase64 = (value) =>
  /^[A-Za-z0-9+/=\s]+$/.test(value) && value.replace(/\s+/g, "").length % 4 === 0;

const decodeBase64 = (value) => {
  try {
    if (typeof window !== "undefined" && window.atob) {
      return window.atob(value.replace(/\s+/g, ""));
    }
    if (typeof Buffer !== "undefined") {
      return Buffer.from(value.replace(/\s+/g, ""), "base64").toString("utf-8");
    }
  } catch (error) {
    return null;
  }
  return null;
};

const decodeCaesarShift = (text, shift = -1) =>
  text.replace(/[A-Za-z]/g, (char) => {
    const base = char >= "a" && char <= "z" ? "a".charCodeAt(0) : "A".charCodeAt(0);
    const offset = ((char.charCodeAt(0) - base + shift + 26) % 26) + base;
    return String.fromCharCode(offset);
  });

const decodeRot13 = (text) =>
  text.replace(/[A-Za-z]/g, (char) => {
    const base = char <= "Z" ? "A".charCodeAt(0) : "a".charCodeAt(0);
    return String.fromCharCode(((char.charCodeAt(0) - base + 13) % 26) + base);
  });

const isMeaningful = (text) => {
  const lower = text.toLowerCase();
  return MEANINGFUL_KEYWORDS.some((keyword) => lower.includes(keyword));
};

const decodeFile = (path) => {
  const data = getFileData(path);
  if (!data) {
    return { success: false, message: `decode: ${path}: No such file` };
  }
  if (data.binary) {
    return { success: false, message: `decode: ${path}: Binary data cannot be decoded` };
  }

  const raw = (data.content || "").trim();
  if (!raw) {
    return { success: false, message: `decode: ${path}: File is empty` };
  }

  const attempts = [];

  if (isLikelyBase64(raw)) {
    const decoded = decodeBase64(raw);
    if (decoded) {
      attempts.push({ label: "base64", output: [decoded] });
    }
  }

  const caesar = decodeCaesarShift(raw, -1);
  if (caesar && caesar !== raw && isMeaningful(caesar)) {
    if (data.key === "genesis/genesis_note2.enc") {
      attempts.push({
        label: "caesar(+1)",
        output: [
          "There is a secret message from Satoshi.",
          '"The Times 03/Jan/2009 [Chancellor] on brink of second [bailout] for banks."',
        ],
      });
    } else {
      attempts.push({ label: "caesar(+1)", output: [caesar] });
    }
  }

  const rot13 = decodeRot13(raw);
  if (rot13 && rot13 !== raw && isMeaningful(rot13)) {
    attempts.push({ label: "rot13", output: [rot13] });
  }

  if (attempts.length === 0) {
    return {
      success: false,
      message: `decode: unable to detect cipher for ${path}`,
    };
  }

  // Prefer non-base64 attempts when available (to surface the narrative answer first)
  const preferred =
    attempts.find((attempt) => attempt.label !== "base64") ?? attempts.find(() => true);

  return {
    success: true,
    lines: preferred.output,
  };
};

const unquote = (value) => value.replace(/^["']|["']$/g, "");

const collectFiles = (target, recursive) => {
  const normalized = resolvePath(target);
  const isDir = !!FILE_SYSTEM[normalized];

  if (!isDir) {
    const data = getFileData(target);
    return data ? [data.key] : [];
  }

  const prefix =
    normalized === "." ? "" : `${normalized.replace(/^\.\//, "").replace(/\/$/, "")}/`;

  if (!recursive) {
    return Object.keys(FILE_DATA).filter((key) => {
      if (!key.startsWith(prefix)) return false;
      const rest = key.slice(prefix.length);
      return !rest.includes("/");
    });
  }

  return Object.keys(FILE_DATA).filter((key) => key.startsWith(prefix));
};

const runGrep = ({ args }) => {
  if (args.length === 0) {
    return ["Usage: grep [-ril] <pattern> [path]"];
  }

  let index = 0;
  const flags = {
    recursive: false,
    ignoreCase: false,
    listOnly: false,
  };

  while (index < args.length && args[index].startsWith("-")) {
    const flagToken = args[index].slice(1);
    [...flagToken].forEach((flag) => {
      if (flag === "r") flags.recursive = true;
      else if (flag === "i") flags.ignoreCase = true;
      else if (flag === "l") flags.listOnly = true;
    });
    index += 1;
  }

  if (index >= args.length) {
    return ["Usage: grep [-ril] <pattern> [path]"];
  }

  const patternRaw = args[index];
  index += 1;
  const pattern = unquote(patternRaw);

  const target = index < args.length ? args[index] : ".";
  const files = collectFiles(target, flags.recursive);

  if (files.length === 0) {
    return ["grep: no matching files found"];
  }

  const results = [];
  const searchedPattern = flags.ignoreCase ? pattern.toLowerCase() : pattern;

  files.forEach((key) => {
    const data = FILE_DATA[key];
    const rawPath = `./${key}`;
    let relativePath = rawPath;
    if (rawPath.startsWith("./genesis/")) {
      relativePath = `./${rawPath.slice("./genesis/".length)}`;
    }
    const pathForMatch = flags.ignoreCase ? rawPath.toLowerCase() : rawPath;
    const patternMatchInPath = pathForMatch.includes(searchedPattern);

    const content = data?.content ?? "";
    const haystack = flags.ignoreCase ? content.toLowerCase() : content;
    const contentMatches = haystack.includes(searchedPattern);

    if (!patternMatchInPath && !contentMatches) {
      return;
    }

    if (flags.listOnly) {
      results.push(relativePath);
      return;
    }

    if (contentMatches && content) {
      const lines = content.split("\n");
      lines.forEach((line) => {
        const compareLine = flags.ignoreCase ? line.toLowerCase() : line;
        if (compareLine.includes(searchedPattern)) {
          results.push(`${relativePath}:${line}`);
        }
      });
    } else {
      results.push(relativePath);
    }
  });

  if (results.length === 0) {
    return [`grep: no results for "${pattern}"`];
  }

  return [...new Set(results)];
};

export default function GenesisTerminal() {
  const [log, setLog] = useState(() =>
    INITIAL_BOOT_LINES.map((line, index) => ({
      id: `boot-${index}`,
      role: "system",
      text: line,
    }))
  );
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const node = containerRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [log]);

  const appendLog = useCallback((entries) => {
    setLog((current) => [...current, ...entries]);
  }, []);

  const executeCommand = useCallback(
    (rawCommand) => {
      const trimmed = rawCommand.trim();
      const parts = trimmed.split(/\s+/);
      const command = parts[0] || "";
      const args = parts.slice(1);

      if (!command) {
        appendLog([{ id: `cmd-${Date.now()}`, role: "command", text: "" }]);
        return;
      }

      const outputs = [];
      const addOutput = (text) => {
        const lines = Array.isArray(text) ? text : [text];
        lines.forEach((line) => {
          outputs.push({ id: `out-${Date.now()}-${Math.random()}`, role: "output", text: line });
        });
      };

      const logCommand = {
        id: `cmd-${Date.now()}`,
        role: "command",
        text: `> ${trimmed}`,
      };

      switch (command) {
        case "help":
          HELP_LINES.forEach((line) => addOutput(line));
          break;
        case "ls":
          addOutput(listDirectory(args[0]));
          break;
        case "cat":
          if (!args[0]) {
            addOutput("cat: missing file operand");
          } else {
            addOutput(readFile(args[0]));
          }
          break;
        case "grep":
          addOutput(runGrep({ args }));
          break;
        case "decode": {
          if (!args[0]) {
            addOutput("decode: missing file operand");
          } else {
            const result = decodeFile(args[0]);
            if (!result.success) {
              addOutput(result.message);
            } else {
              result.lines.forEach((line) => addOutput(line));
            }
          }
          break;
        }
        case "hashinfo": {
          if (!args[0]) {
            addOutput("hashinfo: missing block file operand");
            break;
          }
          const data = getFileData(args[0]);
          if (!data) {
            addOutput(`hashinfo: ${args[0]}: No such file`);
            break;
          }
          const response = HASH_RESPONSES[data.key];
          if (!response) {
            addOutput(`hashinfo: ${args[0]}: Unsupported target`);
            break;
          }
          response.forEach((line) => addOutput(line));
          break;
        }
        case "clear":
          setLog([]);
          return;
        default:
          addOutput(`Command not found: ${command}`);
      }

      appendLog([logCommand, ...outputs]);
    },
    [appendLog]
  );

  const handleSubmit = useCallback(
    (event) => {
      event.preventDefault();
      const command = input;
      executeCommand(command);
      if (command.trim()) {
        setHistory((current) => [...current, command]);
      }
      setHistoryIndex(null);
      setInput("");
    },
    [executeCommand, input]
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault();
        setHistoryIndex((currentIndex) => {
          if (history.length === 0) return null;
          let newIndex = currentIndex;
          if (event.key === "ArrowUp") {
            newIndex = currentIndex === null ? history.length - 1 : Math.max(currentIndex - 1, 0);
          } else {
            if (currentIndex === null) {
              return null;
            }
            newIndex = currentIndex + 1;
            if (newIndex >= history.length) {
              setInput("");
              return null;
            }
          }
          setInput(history[newIndex]);
          return newIndex;
        });
      } else if (event.key === "Escape") {
        setInput("");
        setHistoryIndex(null);
      }
    },
    [history]
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const renderedLog = useMemo(
    () =>
      log.map((entry) => (
        <div key={entry.id} className={`terminal-line terminal-line--${entry.role}`}>
          {entry.text}
        </div>
      )),
    [log]
  );

  return (
    <div className="puzzle-terminal">
      <div ref={containerRef} className="terminal-display" role="log" aria-live="polite">
        {renderedLog}
      </div>
      <form className="terminal-input-row" onSubmit={handleSubmit}>
        <span className="terminal-prompt">&gt;</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          className="terminal-input"
          spellCheck="false"
          autoComplete="off"
          aria-label="Terminal command input"
        />
      </form>
    </div>
  );
}
