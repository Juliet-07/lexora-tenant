import {
  Table, TableBody, TableCell, TableRow,
} from "@/components/ui/table";
import { money, type Mandate } from "@/lib/crm/mandates-api";

export function PnLTab({ mandate }: { mandate: Mandate }) {
  const margin = mandate.billed + mandate.wip - mandate.actualCost;
  const marginPct = mandate.billed + mandate.wip
    ? Math.round((margin / (mandate.billed + mandate.wip)) * 100)
    : 0;

  const rows: [string, string][] = [
    ["Budget", money(mandate.budget, mandate.currency)],
    ["Billed to date", money(mandate.billed, mandate.currency)],
    ["Unbilled WIP", money(mandate.wip, mandate.currency)],
    ["Actual cost", money(mandate.actualCost, mandate.currency)],
    ["Margin", `${money(margin, mandate.currency)} (${marginPct}%)`],
    ["Budget variance", money(mandate.budget - mandate.actualCost, mandate.currency)],
  ];

  return (
    <Table>
      <TableBody>
        {rows.map(([l, v]) => (
          <TableRow key={l}>
            <TableCell className="text-sm text-muted-foreground">{l}</TableCell>
            <TableCell className="text-right text-sm font-medium">{v}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
