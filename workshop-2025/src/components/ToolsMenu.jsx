import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useRoomState from "../hooks/useRoomState";
import { TOOL_IDS, TOOL_LIST } from "../constants/tools";
import "../styles/tools-menu.css";
import toolsMenuIllustration from "../assets/tools_menu.png";

const formatToolUseError = (code, holder) => {
  switch (code) {
    case "not_holder":
      return holder ? `Outil attribue a ${holder}.` : "Outil attribue a un autre agent.";
    case "unassigned":
      return "Outil pas encore attribue.";
    case "unknown_tool":
      return "Outil inconnu.";
    case "invalid_payload":
    case "missing_room":
      return "Aucune salle active.";
    default:
      return "Action impossible pour le moment.";
  }
};

const removeKey = (object, key) => {
  if (!object || !Object.prototype.hasOwnProperty.call(object, key)) {
    return object;
  }
  const next = { ...object };
  delete next[key];
  return next;
};

export default function ToolsMenu() {
  const { username, tools, useFileFixer, useHashTranslator, missionStarted } = useRoomState();
  const [isOpen, setIsOpen] = useState(false);
  const [toolFeedback, setToolFeedback] = useState({});
  const [pendingUse, setPendingUse] = useState({});
  const [fileFixerInput, setFileFixerInput] = useState("");
  const [hashTranslatorInput, setHashTranslatorInput] = useState("");
  const [collapsedTools, setCollapsedTools] = useState(
    () => new Set(TOOL_LIST.map((tool) => tool.id))
  );
  const TUTORIAL_STORAGE_KEY = "toolsTutorialDismissedMission";
  const [dismissedMissionId, setDismissedMissionId] = useState(() => {
    if (typeof window === "undefined") {
      return null;
    }
    return window.sessionStorage.getItem(TUTORIAL_STORAGE_KEY);
  });
  const [showTutorial, setShowTutorial] = useState(false);
  const containerRef = useRef(null);

  const toolStates = useMemo(
    () => (tools && typeof tools === "object" ? tools : {}),
    [tools]
  );

  const fileFixerHolder = toolStates[TOOL_IDS.FILE_FIXER]?.holder ?? null;
  const isFileFixerHolder = Boolean(
    username && fileFixerHolder && username === fileFixerHolder
  );
  const fileFixerFeedback = toolFeedback[TOOL_IDS.FILE_FIXER];
  const fileFixerPending = Boolean(pendingUse[TOOL_IDS.FILE_FIXER]);

  const hashTranslatorHolder = toolStates[TOOL_IDS.HASH_TRANSLATOR]?.holder ?? null;
  const isHashTranslatorHolder = Boolean(
    username && hashTranslatorHolder && username === hashTranslatorHolder
  );
  const isToolCollapsed = useCallback(
    (toolId) => collapsedTools.has(toolId),
    [collapsedTools]
  );

  const toggleToolCollapsed = useCallback((toolId) => {
    setCollapsedTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolId)) {
        next.delete(toolId);
      } else {
        next.add(toolId);
      }
      return next;
    });
  }, []);
  const hashTranslatorFeedback = toolFeedback[TOOL_IDS.HASH_TRANSLATOR];
  const hashTranslatorPending = Boolean(pendingUse[TOOL_IDS.HASH_TRANSLATOR]);

  const dismissTutorial = useCallback(() => {
    setShowTutorial(false);
    if (typeof window !== "undefined") {
      const missionId = window.sessionStorage.getItem("missionStartTimestamp");
      if (missionId) {
        window.sessionStorage.setItem(TUTORIAL_STORAGE_KEY, missionId);
        setDismissedMissionId(missionId);
      }
    }
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const handleDocumentClick = (event) => {
      if (!containerRef.current) {
        return;
      }
      if (!containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isFileFixerHolder) {
      return;
    }
    setFileFixerInput("");
    setToolFeedback((prev) => removeKey(prev, TOOL_IDS.FILE_FIXER));
  }, [isFileFixerHolder]);

  useEffect(() => {
    if (isHashTranslatorHolder) {
      return;
    }
    setHashTranslatorInput("");
    setToolFeedback((prev) => removeKey(prev, TOOL_IDS.HASH_TRANSLATOR));
  }, [isHashTranslatorHolder]);

  useEffect(() => {
    if (!missionStarted) {
      setShowTutorial(false);
      return;
    }
    if (typeof window === "undefined") {
      return;
    }
    const missionId = window.sessionStorage.getItem("missionStartTimestamp");
    if (missionId && missionId !== dismissedMissionId) {
      setShowTutorial(true);
    }
  }, [missionStarted, dismissedMissionId]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    if (showTutorial) {
      dismissTutorial();
    }
  };

  const handleFileFixerSubmit = async (event) => {
    event.preventDefault();
    if (!isFileFixerHolder || fileFixerPending) {
      return;
    }
    setPendingUse((prev) => ({ ...prev, [TOOL_IDS.FILE_FIXER]: true }));
    const response = await useFileFixer(fileFixerInput);
    setPendingUse((prev) => ({ ...prev, [TOOL_IDS.FILE_FIXER]: false }));

    if (!response?.ok) {
      const message = formatToolUseError(response?.error, response?.holder);
      setToolFeedback((prev) => ({
        ...prev,
        [TOOL_IDS.FILE_FIXER]: {
          message: message || "Action impossible.",
          success: false,
        },
      }));
      return;
    }

    const feedback = {
      message: response.message || "",
      success: Boolean(response.success),
      alreadyCompleted: Boolean(response.alreadyCompleted),
    };
    setToolFeedback((prev) => ({
      ...prev,
      [TOOL_IDS.FILE_FIXER]: feedback,
    }));
  };

  const handleHashTranslatorSubmit = async (event) => {
    event.preventDefault();
    if (!isHashTranslatorHolder || hashTranslatorPending) {
      return;
    }
    const trimmed = hashTranslatorInput.trim();
    if (!trimmed) {
      return;
    }

    setPendingUse((prev) => ({ ...prev, [TOOL_IDS.HASH_TRANSLATOR]: true }));
    const response = await useHashTranslator(trimmed);
    setPendingUse((prev) => ({ ...prev, [TOOL_IDS.HASH_TRANSLATOR]: false }));

    if (!response?.ok) {
      const message = formatToolUseError(response?.error, response?.holder);
      setToolFeedback((prev) => ({
        ...prev,
        [TOOL_IDS.HASH_TRANSLATOR]: {
          message: message || "Action impossible.",
          success: false,
        },
      }));
      return;
    }

    setToolFeedback((prev) => ({
      ...prev,
      [TOOL_IDS.HASH_TRANSLATOR]: {
        success: true,
        translation: response.translation,
        known: Boolean(response.known),
      },
    }));
  };

  const renderFileFixer = () => {
    if (!fileFixerHolder) {
      return (
        <p className="tools-menu__ownership">
          Outil en attente d attribution par le QG.
        </p>
      );
    }

    if (!isFileFixerHolder) {
      return (
        <p className="tools-menu__ownership">
          Outil attribue a {fileFixerHolder}.
        </p>
      );
    }

    return (
      <form className="tools-menu__form" onSubmit={handleFileFixerSubmit}>
        <p className="tools-menu__ownership">Vous détenez File Fixer.</p>
        <label className="tools-menu__label">
          Fichier a reparer
          <textarea
            className="tools-menu__textarea"
            placeholder='Collez le contenu ou le nom d un fichier'
            value={fileFixerInput}
            onChange={(event) => setFileFixerInput(event.target.value)}
            rows={4}
          />
        </label>
        <div className="tools-menu__actions">
          <button
            type="submit"
            className="game-primary"
            disabled={fileFixerPending || !fileFixerInput.trim()}
          >
            Reparer
          </button>
        </div>
        {fileFixerFeedback ? (
          <div
            className={`tools-menu__feedback ${
              fileFixerFeedback.success ? "is-success" : "is-error"
            }`}
          >
            <p>
              Resultat : <strong>{fileFixerFeedback.message || "..."}</strong>
            </p>
            {fileFixerFeedback.details ? (
              <p className="tools-menu__feedback-details">{fileFixerFeedback.details}</p>
            ) : null}
            {fileFixerFeedback.success && !fileFixerFeedback.alreadyCompleted ? (
              <p className="tools-menu__feedback-note">Énigme 1 validée.</p>
            ) : null}
            {fileFixerFeedback.success && fileFixerFeedback.alreadyCompleted ? (
              <p className="tools-menu__feedback-note">
                Enigme 1 etait deja validee pour cette salle.
              </p>
            ) : null}
          </div>
        ) : null}
      </form>
    );
  };

  const renderHashTranslator = () => {
    if (!hashTranslatorHolder) {
      return (
        <p className="tools-menu__ownership">
          Outil en attente d attribution par le QG.
        </p>
      );
    }

    if (!isHashTranslatorHolder) {
      return (
        <p className="tools-menu__ownership">
          Outil attribue a {hashTranslatorHolder}.
        </p>
      );
    }

    return (
      <form className="tools-menu__form" onSubmit={handleHashTranslatorSubmit}>
        <p className="tools-menu__ownership">Vous détenez Hash Translator.</p>
        <label className="tools-menu__label">
          Hash a traduire
          <input
            type="text"
            className="tools-menu__textarea"
            placeholder="Collez le hash a dechiffrer"
            value={hashTranslatorInput}
            onChange={(event) => setHashTranslatorInput(event.target.value)}
          />
        </label>
        <div className="tools-menu__actions">
          <button
            type="submit"
            className="game-primary"
            disabled={hashTranslatorPending || !hashTranslatorInput.trim()}
          >
            Traduire
          </button>
        </div>
        {hashTranslatorFeedback ? (
          hashTranslatorFeedback.success ? (
            <div className="tools-menu__feedback is-success">
              <p>
                Case cible :{" "}
                <strong>{hashTranslatorFeedback.translation || "??"}</strong>
              </p>
              <p className="tools-menu__feedback-note">
                {hashTranslatorFeedback.known
                  ? "Hash reconnu par le QG."
                  : "Hash inconnu : proposition calculee par l IA."}
              </p>
            </div>
          ) : (
            <div className="tools-menu__feedback is-error">
              <p>{hashTranslatorFeedback.message || "Action impossible pour le moment."}</p>
            </div>
          )
        ) : null}
      </form>
    );
  };

  const renderToolSection = (tool, { collapsed }) => {
    if (collapsed) {
      return null;
    }
    switch (tool.id) {
      case TOOL_IDS.FILE_FIXER:
        return renderFileFixer();
      case TOOL_IDS.HASH_TRANSLATOR:
        return renderHashTranslator();
      default:
        return (
          <p className="tools-menu__placeholder">
            Interface en cours de preparation pour cet outil.
          </p>
        );
    }
  };

  return (
    <div
      className={`tools-menu ${isOpen ? "is-open" : ""} ${
        showTutorial ? "tools-menu--highlight" : ""
      }`}
      ref={containerRef}
      style={{ pointerEvents: "none" }}
    >
      <button
        type="button"
        className="game-secondary tools-menu__toggle"
        onClick={handleToggle}
        aria-expanded={isOpen ? "true" : "false"}
        style={{ pointerEvents: "auto" }}
      >
        <img src={toolsMenuIllustration} alt="Illustration du panneau d'outils" className="tools-menu__illustration" />
      </button>
      {showTutorial ? (
        <aside className="tools-menu__tutorial" role="dialog" aria-live="polite">
          <p className="tools-menu__tutorial-text">
            Vous trouverez vos outils ici !
          </p>
          <button
            type="button"
            className="tools-menu__tutorial-close"
            aria-label="Fermer le tutoriel des outils"
            onClick={dismissTutorial}
          >
            OK
          </button>
        </aside>
      ) : null}
      <div className="tools-menu__panel" aria-hidden={isOpen ? "false" : "true"} style={{ pointerEvents: isOpen ? "auto" : "none" }}>
        <header className="tools-menu__header">
          
          <div className="tools-menu__title">
            <h3>Outils de mission</h3>
            <p>Chaque outil est attribué automatiquement à un agent.</p>
          </div>
        </header>
        <div className="tools-menu__content">
          {TOOL_LIST.map((tool) => (
            <section
              key={tool.id}
              className={`tools-menu__tool ${
                isToolCollapsed(tool.id) ? "tools-menu__tool--collapsed" : ""
              }`}
            >
              <header className="tools-menu__tool-header">
                <h4>{tool.name}</h4>
                <p className="tools-menu__description">{tool.description}</p>
                <button
                  type="button"
                  className="tools-menu__collapse"
                  onClick={() => toggleToolCollapsed(tool.id)}
                  aria-expanded={isToolCollapsed(tool.id) ? "false" : "true"}
                  aria-controls={`tool-panel-${tool.id}`}
                >
                  {isToolCollapsed(tool.id) ? "Afficher" : "Masquer"}
                </button>
              </header>
              <div
                id={`tool-panel-${tool.id}`}
                className="tools-menu__tool-body"
                aria-hidden={isToolCollapsed(tool.id) ? "true" : "false"}
              >
                {renderToolSection(tool, { collapsed: isToolCollapsed(tool.id) })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
