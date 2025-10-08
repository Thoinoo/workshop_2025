import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Accueil from "./pages/Accueil";
import Jeu from "./pages/Jeu";
import Preparation from "./pages/Preparation";
import Enigme1 from "./pages/enigme1";
import Enigme2 from "./pages/enigme2";
import Enigme3 from "./pages/enigme3";
import Enigme4 from "./pages/enigme4";
import Enigme5 from "./pages/enigme5";
import Victory from "./pages/Victory";
import Defeat from "./pages/Defeat";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/preparation" element={<Preparation />} />
        <Route path="/jeu" element={<Jeu />} />
        <Route path="/enigme1" element={<Enigme1 />} />
        <Route path="/enigme2" element={<Enigme2 />} />
        <Route path="/enigme3" element={<Enigme3 />} />
        <Route path="/enigme4" element={<Enigme4 />} />
        <Route path="/enigme5" element={<Enigme5 />} />
        <Route path="/victoire" element={<Victory />} />
        <Route path="/defaite" element={<Defeat />} />
      </Routes>
    </Router>
  );
}

export default App;
