import { Link } from "react-router-dom";

function Navigation() {
  // Styles pour positionner les boutons
  const style = { position: "absolute", top: "10px", left: "10px" };

  return (
    <div style={style}>
      {/* Bouton vers la page 1 */}
      <Link to="/enigme1">
        <button className="game-secondary" style={{ marginRight: "10px" }}>Room 1</button>
      </Link>

      {/* Bouton vers la page 2 */}
      <Link to="/enigme2">
        <button className="game-secondary">Room 2</button>
      </Link>
    </div>
  );
}

export default Navigation;
