import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Accueil from "./pages/Accueil";
import Jeu from "./pages/Jeu";
import Enigme1 from "./pages/enigme1";
import Enigme3 from "./pages/enigme3";
import Enigme4 from "./pages/enigme4";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/jeu" element={<Jeu />} />
        <Route path="/enigme1" element={<Enigme1 />} />
        <Route path="/enigme3" element={<Enigme3 />} />
        <Route path="/enigme4" element={<Enigme4 />} />
      </Routes>
    </Router>
  );
}

export default App;
