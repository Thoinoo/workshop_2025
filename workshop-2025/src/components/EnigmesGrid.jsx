import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const GRID_ITEMS = [
  { key: "enigme1", label: "Énigme 1", path: "/enigme1" },
  { key: "enigme2", label: "Énigme 2", path: "/enigme2" },
  { key: "enigme3", label: "Énigme 3", path: "/enigme3" },
  { key: "enigme4", label: "Énigme 4", path: "/enigme4" },
  { key: "slot-5", label: "À venir", disabled: true },
  { key: "slot-6", label: "À venir", disabled: true },
  { key: "slot-7", label: "À venir", disabled: true },
  { key: "slot-8", label: "À venir", disabled: true },
  { key: "slot-9", label: "À venir", disabled: true },
];

function GridButtons({ active, onAfterNavigate }) {
  const navigate = useNavigate();

  return (
    <nav aria-label="Navigation entre les énigmes" className="enigmes-grid">
      {GRID_ITEMS.map(({ key, label, path, disabled }) => {
        const isActive = key === active;

        return (
          <button
            key={key}
            type="button"
            className={[
              "enigmes-grid__item",
              isActive ? "enigmes-grid__item--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => {
              if (!disabled && path) {
                navigate(path);
                onAfterNavigate?.();
              }
            }}
            disabled={disabled || isActive}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}

export default function EnigmesGridMenu({ active }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    setIsOpen(false);
  }, [active]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!isOpen) return;
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={["enigmes-menu", isOpen ? "enigmes-menu--open" : ""].join(" ").trim()}
    >
      <button
        type="button"
        className="enigmes-menu__toggle"
        aria-haspopup="true"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((previous) => !previous)}
      >
        <span className="enigmes-menu__icon" aria-hidden="true">
          {GRID_ITEMS.map(({ key }) => (
            <span key={key} />
          ))}
        </span>
        <span className="enigmes-menu__label">Sélection des énigmes</span>
      </button>

      <div className="enigmes-menu__panel">
        <GridButtons active={active} onAfterNavigate={() => setIsOpen(false)} />
      </div>
    </div>
  );
}
