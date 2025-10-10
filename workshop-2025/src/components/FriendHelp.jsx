import { useState } from "react";

const QUESTIONS = [
  {
    question: "Quel est le rôle principal du minage de cryptomonnaie ?",
    choices: [
      "A-Valider les transactions",
      "B-Créer des comptes utilisateurs",
      "C-Réduire la taille des blocs",
      "D-Améliorer la vitesse d’Internet",
    ],
    answer: "A-Valider les transactions",
  },
  {
    question: "Quelle unité mesure la puissance de minage ?",
    choices: ["A-Hashrate", "B-Gigabyte", "C-Megahertz", "D-Bandwidth"],
    answer: "A-Hashrate",
  },
  {
    question: "Quel matériel est souvent utilisé pour miner ?",
    choices: [
      "A-Carte graphique (GPU)",
      "B-Disque dur externe",
      "C-Clé USB",
      "D-Ordinateur portable classique",
    ],
    answer: "A-Carte graphique (GPU)",
  },
  {
    question: "Qu’est-ce qu’un ‘bloc’ dans la blockchain ?",
    choices: [
      "A-Un ensemble de transactions validées",
      "B-Un ordinateur de minage",
      "C-Un fichier audio crypté",
      "D-Un type de contrat intelligent"
    ],
    answer: "A-Un ensemble de transactions validées",
  },
  {
    question: "Quel algorithme de hachage est utilisé par Bitcoin ?",
    choices: ["A-SHA-256", "B-AES-128", "C-MD5", "D-RSA"],
    answer: "A-SHA-256",
  },
  {
    question: "Quelle récompense reçoit un mineur après avoir validé un bloc ?",
    choices: ["A-Des frais de transaction", "B-Des NFT", "C-Des tokens aléatoires", "D-Du stockage cloud"],
    answer: "A-Des frais de transaction",
  },
  {
    question: "Que signifie Proof of Work ?",
    choices: [
      "A-Preuve de travail",
      "B-Partage de richesse",
      "C-Protocole ouvert Web",
      "D-Protection des wallets",
    ],
    answer: "A-Preuve de travail",
  },
];

export default function FriendHelp({ onCorrectAnswer, onWrongAnswer }) {
  const [question, setQuestion] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const getRandomQuestion = () => {
    const randomIndex = Math.floor(Math.random() * QUESTIONS.length);
    return QUESTIONS[randomIndex];
  };

  const handleAskHelp = () => {
    setQuestion(getRandomQuestion());
    setFeedback(null);
  };

  const handleAnswerClick = (choice) => {
    if (!question) return;

    if (choice === question.answer) {
      setFeedback("✅ Bonne réponse ! +15s");
      onCorrectAnswer();
      setTimeout(() => {
        setQuestion(getRandomQuestion());
        setFeedback(null);
      }, 1000);
    } else {
      setFeedback("❌ Mauvaise réponse !");
      onWrongAnswer();
      setTimeout(() => setQuestion(null), 1000);
    }
  };

  return (
    <div className="friend-help">
      {!question && (
        <button onClick={handleAskHelp} className="help-button">
          ⏳ Temps sup (QCM)
        </button>
      )}

      {question && (
        <div className="friend-help-question">
          <p className="question-text">{question.question}</p>
          <div className="choices">
            {question.choices.map((choice, idx) => (
              <button key={idx} onClick={() => handleAnswerClick(choice)}>
                {choice}
              </button>
            ))}
          </div>
          {feedback && <p className="friend-help-feedback">{feedback}</p>}
        </div>
      )}
    </div>
  );
}
