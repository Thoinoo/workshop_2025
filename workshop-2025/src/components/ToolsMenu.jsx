import { useEffect, useMemo, useRef, useState } from "react";
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
  const { username, tools, useFileFixer } = useRoomState();
  const [isOpen, setIsOpen] = useState(false);
  const [toolFeedback, setToolFeedback] = useState({});
  const [pendingUse, setPendingUse] = useState({});
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
  const fileFixerPending = Boolean(pendingUse[TOOL_IDS.FILE_FIXER]);

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
        <img src={toolsMenuIllustration} alt="Illustration du panneau d'outils" className="tools-menu__illustration" />
      </button>
      <div className="tools-menu__panel" aria-hidden={isOpen ? "false" : "true"}>
        <header className="tools-menu__header">
          
          <div className="tools-menu__title">
            <h3>Outils de mission</h3>
            <p>Chaque outil est attribue automatiquement a un agent.</p>
          </div>
        </header>
        <div className="tools-menu__content">
          {TOOL_LIST.map((tool) => (
            <section key={tool.id} className="tools-menu__tool">
              <header className="tools-menu__tool-header">
                <h4>{tool.name}</h4>
                <p className="tools-menu__description">{tool.description}</p>
              </header>
              {renderToolSection(tool)}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}



