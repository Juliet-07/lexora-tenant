import { describe, expect, it } from "vitest";
import {
  billDetails,
  claimDetails,
  quoteDetails,
  taxFilingDetails,
} from "./approval-details";
const fmt = (n: number, c: string) => `${c} ${n}`;
const base: any = {
  _id: "1",
  ref: "QT-1",
  kind: "Quote",
  clientName: "C",
  title: "T",
  amount: 10,
  currency: "USD",
  issued: "2026-11-01T10:00:00Z",
  expires: "2026-12-01",
  submittedByName: "Em",
};

describe("approval details", () => {
  it("dual quote: shows who approved, who is pending", () => {
    const d = quoteDetails(
      {
        ...base,
        status: "Pending approval",
        approval: {
          tierName: "Finance managers",
          mode: "dual",
          approverIds: ["a", "b"],
          approverNames: ["Ann", "Bob"],
          approvals: [{ userId: "a", name: "Ann", at: "2026-11-02T08:00:00Z" }],
        },
      },
      fmt,
    );
    expect(d.summary).toBe("1 of 2 approvals given");
    const ann = d.steps.find((s) => s.name === "Ann")!;
    const bob = d.steps.find((s) => s.name === "Bob")!;
    expect(ann.state).toBe("done");
    expect(ann.at).toBeTruthy();
    expect(bob.state).toBe("pending");
  });
  it("owner approval is tagged and listed even if not a named approver", () => {
    const d = quoteDetails(
      {
        ...base,
        status: "Draft",
        approval: {
          tierName: "T",
          mode: "dual",
          approverIds: ["a", "b"],
          approverNames: ["Ann", "Bob"],
          approvals: [
            { userId: "o", name: "Julie", at: "2026-11-02", isOwner: true },
          ],
        },
      },
      fmt,
    );
    expect(d.summary).toContain("account owner");
    const o = d.steps.find((s) => s.name === "Julie")!;
    expect(o.tag).toBe("Account owner");
    expect(o.state).toBe("done");
  });
  it("rejection records who, when and why", () => {
    const d = billDetails(
      {
        ref: "B1",
        vendorName: "V",
        description: "x",
        amount: 5,
        currency: "USD",
        dueOn: "2026-12-01",
        status: "Rejected",
        submittedByName: "Em",
        rejectedReason: "No PO",
        approval: {
          tierName: "T",
          mode: "single",
          approverIds: ["a"],
          approverNames: ["Ann"],
          approvals: [],
          rejectedBy: "Ann",
          rejectedAt: "2026-11-03",
          rejectedReason: "No PO",
        },
      } as any,
      fmt,
    );
    const rej = d.steps.find((s) => s.state === "rejected")!;
    expect(rej.name).toBe("Ann");
    expect(rej.note).toBe("No PO");
    expect(d.rejectedReason).toBe("No PO");
  });
  it("owner-written quote without routing reads as no approval needed", () => {
    const d = quoteDetails(
      { ...base, submittedByName: undefined, status: "Draft", approval: null },
      fmt,
    );
    expect(d.summary).toMatch(/No approval was needed/);
  });
  it("legacy bill approver name is shown", () => {
    const d = billDetails(
      {
        ref: "B2",
        vendorName: "V",
        description: "x",
        amount: 5,
        currency: "USD",
        dueOn: "2026-12-01",
        status: "Approved",
        approvedBy: "Julie",
        approvedAt: "2026-11-04",
      } as any,
      fmt,
    );
    expect(d.steps[0]).toMatchObject({ name: "Julie", state: "done" });
  });
  it("claim and tax filing trails", () => {
    const c = claimDetails(
      {
        ref: "EC1",
        employee: "Em",
        description: "d",
        amount: 3,
        currency: "USD",
        rechargeable: false,
        status: "Approved",
        createdAt: "2026-11-01",
        decidedByName: "Julie",
        decidedAt: "2026-11-02",
      } as any,
      fmt,
    );
    expect(c.steps.map((s) => s.label)).toEqual(["Submitted", "Approved"]);
    const t = taxFilingDetails(
      {
        name: "VAT",
        period: "Oct",
        dueOn: "2026-11-15",
        currency: "RWF",
        status: "Filed",
        filing: {
          filedOn: "2026-11-10",
          amountPaid: 9,
          recordedByName: "Em",
          recordedAt: "2026-11-10",
          approvedByName: "Julie",
          approvedAt: "2026-11-11",
          rejectedReason: "",
          rejectedAt: null,
        },
      } as any,
      fmt,
    );
    expect(t.summary).toBe("Approved by Julie");
    expect(t.steps).toHaveLength(2);
  });
});
