import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Accueil from "./pages/accueil";
import Jeu from "./pages/Jeu";
import Enigme1 from "./pages/enigme1";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/jeu" element={<Jeu />} />
        <Route path="/enigme1" element={<Enigme1 />} />
      </Routes>
    </Router>
  );
}

export default App;
