import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Accueil from "./pages/Accueil";
import Jeu from "./pages/Jeu";
import Enigme1 from "./pages/enigme1";
import Enigme3 from "./pages/enigme3";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/jeu" element={<Jeu />} />
        <Route path="/enigme1" element={<Enigme1 />} />
        <Route path="/enigme3" element={<Enigme3 />} />
      </Routes>
    </Router>
  );
}

export default App;
