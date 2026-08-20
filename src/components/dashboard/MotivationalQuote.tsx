import { useEffect, useState } from "react";
import { Quote as QuoteIcon } from "lucide-react";

const QUOTES: { text: string; author: string }[] = [
  { text: "Excellence is never an accident; it is the result of high intention and intelligent execution.", author: "Aristotle" },
  { text: "Quality is not an act, it is a habit.", author: "Will Durant" },
  { text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Trust is built in very small moments.", author: "Brené Brown" },
  { text: "Compliance is not a constraint, it is the foundation of confidence.", author: "Lexora" },
  { text: "Great things in business are never done by one person.", author: "Steve Jobs" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier discussing habit" },
  { text: "Clarity precedes mastery.", author: "Robin Sharma" },
  { text: "Do the hard jobs first. The easy jobs will take care of themselves.", author: "Dale Carnegie" },
  { text: "Discipline equals freedom.", author: "Jocko Willink" },
  { text: "Discipline in detail creates trust at scale.", author: "Lexora" },
];

/** Rotates a motivational quote every 60 seconds. */
export function MotivationalQuote() {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * QUOTES.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % QUOTES.length);
        setVisible(true);
      }, 350);
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  const quote = QUOTES[index];

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card/60 p-4">
      <QuoteIcon className="absolute -right-2 -top-2 h-16 w-16 text-primary/5" />
      <div
        className={`transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}
      >
        <p className="text-sm font-medium leading-relaxed">“{quote.text}”</p>
        <p className="mt-2 text-xs text-muted-foreground">— {quote.author}</p>
      </div>
    </div>
  );
}
