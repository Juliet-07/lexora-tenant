import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Quote as QuoteIcon } from "lucide-react";

// Fallback only — used while the real quote is loading, or if the
// API call fails outright. Never shown as if it were the live quote.
const FALLBACK_QUOTES: { text: string; author: string }[] = [
  {
    text: "Excellence is never an accident; it is the result of high intention and intelligent execution.",
    author: "Aristotle",
  },
  { text: "Quality is not an act, it is a habit.", author: "Will Durant" },
  {
    text: "The best way to predict the future is to create it.",
    author: "Peter Drucker",
  },
  {
    text: "Discipline is the bridge between goals and accomplishment.",
    author: "Jim Rohn",
  },
  { text: "Trust is built in very small moments.", author: "Brené Brown" },
  {
    text: "Great things in business are never done by one person.",
    author: "Steve Jobs",
  },
  { text: "Clarity precedes mastery.", author: "Robin Sharma" },
  {
    text: "Do the hard jobs first. The easy jobs will take care of themselves.",
    author: "Dale Carnegie",
  },
  { text: "Discipline equals freedom.", author: "Jocko Willink" },
];

interface DummyJsonQuote {
  id: number;
  quote: string;
  author: string;
}

// Free, no-auth, CORS-enabled — purpose-built for direct browser
// fetches like this one. https://dummyjson.com/docs/quotes
async function fetchRandomQuote(): Promise<{ text: string; author: string }> {
  const res = await fetch("https://dummyjson.com/quotes/random");
  if (!res.ok) throw new Error(`Quotes API returned ${res.status}`);
  const data: DummyJsonQuote = await res.json();
  return { text: data.quote, author: data.author };
}

/** Rotates a real, live-fetched quote every 60 seconds; falls back to a
 *  curated local list if the external API is ever unreachable. */
export function MotivationalQuote() {
  const [visible, setVisible] = useState(true);
  const [fallbackIndex, setFallbackIndex] = useState(() =>
    Math.floor(Math.random() * FALLBACK_QUOTES.length),
  );

  const { data, isError, refetch } = useQuery({
    queryKey: ["motivational-quote"],
    queryFn: fetchRandomQuote,
    staleTime: 55_000,
    retry: 1,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setFallbackIndex((i) => (i + 1) % FALLBACK_QUOTES.length);
        refetch();
        setVisible(true);
      }, 350);
    }, 60_000);
    return () => clearInterval(timer);
  }, [refetch]);

  const quote = data && !isError ? data : FALLBACK_QUOTES[fallbackIndex];

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
