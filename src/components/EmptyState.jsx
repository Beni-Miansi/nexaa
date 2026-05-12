import NexaLogo from "./ui/NexaLogo";

const QUICK_CARDS = [
  { icon: "💡", title: "Expliquer un concept",  desc: "Obtenez des explications claires sur n'importe quel sujet",   prompt: "Explique-moi simplement ce qu'est l'intelligence artificielle et comment elle fonctionne" },
  { icon: "💻", title: "Déboguer du code",       desc: "Trouvez et corrigez les erreurs dans votre code",             prompt: "Aide-moi à déboguer ce code :\n\n" },
  { icon: "🌍", title: "Traduire un texte",      desc: "Traduction précise dans toutes les langues",                  prompt: "Traduis ce texte en anglais :\n\n" },
  { icon: "📝", title: "Résumer un texte",       desc: "Extrayez l'essentiel de n'importe quel document",             prompt: "Résume ce texte en 3 points clés :\n\n" },
  { icon: "🔢", title: "Résoudre en maths",      desc: "Étapes détaillées pour tout problème",                        prompt: "Résous ce problème mathématique :\n\n" },
  { icon: "✍️", title: "Rédiger un email",       desc: "Emails professionnels et percutants",                         prompt: "Aide-moi à rédiger un email professionnel pour :\n\n" },
];

export default function EmptyState({ onPrompt }) {
  return (
    <div className="empty-state">
      <div className="empty-glow" />
      <div className="empty-logo">
        <NexaLogo size={56} />
      </div>
      <h2>Comment puis-je vous aider ?</h2>
      <p>Posez une question ou choisissez un point de départ ci-dessous</p>
      <div className="quick-grid">
        {QUICK_CARDS.map(card => (
          <button
            key={card.title}
            className="quick-card"
            onClick={() => onPrompt(card.prompt)}
          >
            <span className="quick-icon">{card.icon}</span>
            <span className="quick-title">{card.title}</span>
            <span className="quick-desc">{card.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
