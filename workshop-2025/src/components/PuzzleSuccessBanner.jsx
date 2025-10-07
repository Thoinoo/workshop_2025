import "./PuzzleSuccessBanner.css";

export default function PuzzleSuccessBanner({ visible }) {
  if (!visible) {
    return null;
  }

  return (
    <div className="puzzle-success-banner" role="status" aria-live="polite">
      Énigme réussie&nbsp;!
    </div>
  );
}
