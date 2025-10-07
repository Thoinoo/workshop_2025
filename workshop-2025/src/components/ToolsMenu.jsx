import { useEffect, useMemo, useRef, useState } from "react";
import useRoomState from "../hooks/useRoomState";
import { TOOL_IDS, TOOL_LIST } from "../constants/tools";
import "../styles/tools-menu.css";

const formatToolError = (code, holder) => {
  switch (code) {
    case "already_held":
      return holder ? `Outil deja detenu par ${holder}.` : "Outil deja detenu.";
    case "not_holder":
      return holder ? `Outil detenu par ${holder}.` : "Outil detenu par un autre agent.";
    case "unknown_tool":
      return "Outil inconnu.";
    case "invalid_payload":
    case "missing_room_or_tool":
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
  const { username, tools, claimTool, releaseTool, useFileFixer } = useRoomState();
  const [isOpen, setIsOpen] = useState(false);
  const [claimErrors, setClaimErrors] = useState({});
  const [toolFeedback, setToolFeedback] = useState({});
  const [pendingTools, setPendingTools] = useState({});
  const [fileFixerInput, setFileFixerInput] = useState("");
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
  const fileFixerPending = Boolean(pendingTools[TOOL_IDS.FILE_FIXER]);
  const claimErrorFileFixer = claimErrors[TOOL_IDS.FILE_FIXER];

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

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
  };

  const handleClaim = async (toolId) => {
    setPendingTools((prev) => ({ ...prev, [toolId]: true }));
    setClaimErrors((prev) => ({ ...prev, [toolId]: null }));
    const response = await claimTool(toolId);
    setPendingTools((prev) => ({ ...prev, [toolId]: false }));
    if (!response?.ok) {
      const message = formatToolError(response?.error, response?.holder);
      setClaimErrors((prev) => ({ ...prev, [toolId]: message }));
      return;
    }
    setClaimErrors((prev) => ({ ...prev, [toolId]: null }));
  };

  const handleRelease = async (toolId) => {
    setPendingTools((prev) => ({ ...prev, [toolId]: true }));
    const response = await releaseTool(toolId);
    setPendingTools((prev) => ({ ...prev, [toolId]: false }));
    if (!response?.ok) {
      const message = formatToolError(response?.error, response?.holder);
      setClaimErrors((prev) => ({ ...prev, [toolId]: message }));
      return;
    }
    setClaimErrors((prev) => ({ ...prev, [toolId]: null }));
    setToolFeedback((prev) => removeKey(prev, toolId));
    if (toolId === TOOL_IDS.FILE_FIXER) {
      setFileFixerInput("");
    }
  };

  const handleFileFixerSubmit = async (event) => {
    event.preventDefault();
    if (!isFileFixerHolder || fileFixerPending) {
      return;
    }
    setPendingTools((prev) => ({ ...prev, [TOOL_IDS.FILE_FIXER]: true }));
    const response = await useFileFixer(fileFixerInput);
    setPendingTools((prev) => ({ ...prev, [TOOL_IDS.FILE_FIXER]: false }));
    if (!response?.ok) {
      const message = formatToolError(response?.error, response?.holder);
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
    if (!response.success) {
      feedback.details = '';
    }
    setToolFeedback((prev) => ({
      ...prev,
      [TOOL_IDS.FILE_FIXER]: feedback,
    }));
  };

  const renderFileFixer = () => {
    if (!isFileFixerHolder) {
      const holder = fileFixerHolder;
      return (
        <>
          <p className="tools-menu__ownership">
            {holder ? `Outil detenu par ${holder}.` : "Outil disponible pour votre equipe."}
          </p>
          <div className="tools-menu__actions">
            <button
              type="button"
              className="game-primary"
              onClick={() => handleClaim(TOOL_IDS.FILE_FIXER)}
              disabled={Boolean(holder) || pendingTools[TOOL_IDS.FILE_FIXER]}
            >
              Prendre l outil
            </button>
          </div>
        </>
      );
    }

    return (
      <form className="tools-menu__form" onSubmit={handleFileFixerSubmit}>
        <p className="tools-menu__ownership">Vous detenez File Fixer.</p>
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
          <button
            type="button"
            className="game-secondary"
            onClick={() => handleRelease(TOOL_IDS.FILE_FIXER)}
            disabled={fileFixerPending}
          >
            Rendre l outil
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
              <p className="tools-menu__feedback-note">Enigme 1 validee.</p>
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

  const renderToolSection = (tool) => {
    switch (tool.id) {
      case TOOL_IDS.FILE_FIXER:
        return renderFileFixer();
      default:
        return (
          <p className="tools-menu__placeholder">
            Interface en cours de preparation pour cet outil.
          </p>
        );
    }
  };

  return (
    <div className={`tools-menu ${isOpen ? "is-open" : ""}`} ref={containerRef}>
      <button
        type="button"
        className="game-secondary tools-menu__toggle"
        onClick={handleToggle}
        aria-expanded={isOpen ? "true" : "false"}
      >
        Outils
      </button>
      <div className="tools-menu__panel" aria-hidden={isOpen ? "false" : "true"}>
        <header className="tools-menu__header">
          <h3>Outils de mission</h3>
          <p>Un seul agent peut detenir un outil par salle.</p>
        </header>
        <div className="tools-menu__content">
          {TOOL_LIST.map((tool) => (
            <section key={tool.id} className="tools-menu__tool">
              <header className="tools-menu__tool-header">
                <h4>{tool.name}</h4>
                <p className="tools-menu__description">{tool.description}</p>
              </header>
              {renderToolSection(tool)}
              {claimErrors[tool.id] ? (
                <p className="tools-menu__error" role="alert">
                  {claimErrors[tool.id]}
                </p>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
