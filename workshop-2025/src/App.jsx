import { useEffect, useState } from 'react';

function App() {
  const [msg, setMsg] = useState('Chargement...');

  useEffect(() => {
    fetch('/api/hello')
      .then(res => res.json())
      .then(data => setMsg(data.message))
      .catch(err => setMsg('Erreur: ' + err.message));
  }, []);

  return (
    <div style={{ textAlign: 'center' }}>
      <h1>Test communication front ↔ back</h1>
      <p>{msg}</p>
    </div>
  );
}

export default App;
