import DealSigningPanel from "@/components/grc/DealSigningPanel";
import type { Deal } from "@/lib/grc/deals-api";

// The deal's contract is signed here. (The term sheet has its own signing,
// on the Term Sheet tab.)
export default function SigningTab({ deal }: { deal: Deal }) {
  return <DealSigningPanel deal={deal} kind="contract" />;
}
