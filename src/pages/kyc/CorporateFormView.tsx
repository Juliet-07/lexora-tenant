/**
 * CorporateFormView.tsx
 * Renders the corporate/trust/partnership client's submitted onboarding form.
 * Reads from: client.onboarding.formData (flat object from the backend)
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  MapPin,
  Activity,
  Users,
  UserCheck,
  Network,
  ShieldAlert,
  PenLine,
  AlertTriangle,
} from "lucide-react";

interface Props {
  formData: Record<string, any>;
}

// ── Shared primitives ─────────────────────────────────────────

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Building2;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">{children}</div>
  );
}

// ─────────────────────────────────────────────────────────────

export function CorporateFormView({ formData }: Props) {
  if (!formData || Object.keys(formData).length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        The client has not submitted any form data yet.
      </p>
    );
  }

  const f    = formData;
  const decl = f._declaration;

  const beneficialOwners: any[] = f.beneficialOwnersList ?? [];
  const directors:        any[] = f.directorsList        ?? [];
  const relatedEntities:  any[] = f.relatedEntitiesList  ?? [];

  return (
    <div className="space-y-4">
      {/* A — Entity Details */}
      <Section icon={Building2} title="A — Entity Details">
        <Grid>
          <Field label="Legal Entity Name"         value={f.legalEntityName} />
          <Field label="Entity Type"               value={f.entityType !== "Other" ? f.entityType : f.entityTypeOther} />
          <Field label="Registration Number"       value={f.registrationNumber} />
          <Field label="Tax Jurisdiction"          value={f.taxJurisdiction} />
          <Field label="Date Established"          value={f.dateEstablished} />
          <Field label="Countries of Operation"    value={f.countriesOfOperation} />
          <Field label="Company Website"           value={f.website} />
        </Grid>
      </Section>

      {/* Registered Address */}
      <Section icon={MapPin} title="Registered Business Address">
        <Grid>
          <Field label="Street"       value={f.regStreet} />
          <Field label="City"         value={f.regCity} />
          <Field label="State"        value={f.regState} />
          <Field label="Postal Code"  value={f.regPostalCode} />
          <Field label="Country"      value={f.regCountry} />
        </Grid>
      </Section>

      {/* Business Activity */}
      <Section icon={Activity} title="Business Activity">
        <div className="space-y-3">
          <Grid>
            <Field label="Primary Activity"        value={f.primaryBusinessActivity} />
            <Field label="Annual Revenue"          value={f.annualRevenue} />
            <Field label="Number of Employees"     value={f.numberOfEmployees} />
          </Grid>
          {f.businessDescription && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Business Description
              </p>
              <p className="text-sm">{f.businessDescription}</p>
            </div>
          )}
        </div>
      </Section>

      {/* Beneficial Owners */}
      <Section icon={Users} title="B — Beneficial Ownership Structure">
        {f.hasBeneficialOwner === "no" ? (
          <p className="text-sm text-muted-foreground">
            No individual owns 25% or more of this entity.
          </p>
        ) : beneficialOwners.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No beneficial owners declared.
          </p>
        ) : (
          <div className="space-y-4">
            {beneficialOwners.map((owner, i) => (
              <div
                key={i}
                className="p-4 rounded-lg border bg-muted/20 space-y-3"
              >
                <p className="text-sm font-semibold text-primary">
                  Owner {i + 1}
                </p>
                <Grid>
                  <Field label="First Name"          value={owner.firstName} />
                  <Field label="Last Name"           value={owner.lastName} />
                  <Field label="Date of Birth"       value={owner.dob} />
                  <Field label="Nationality"         value={owner.nationality} />
                  <Field label="Residential Address" value={owner.residentialAddress} />
                  <Field label="Ownership %"         value={owner.ownershipPercentage} />
                  <Field label="Nature of Control"   value={owner.natureOfControl} />
                </Grid>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Directors & Officers */}
      <Section icon={UserCheck} title="C — Directors &amp; Officers">
        {directors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No directors or officers declared.
          </p>
        ) : (
          <div className="space-y-4">
            {directors.map((d, i) => (
              <div
                key={i}
                className="p-4 rounded-lg border bg-muted/20 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-primary">
                    {d.title || `Director ${i + 1}`}
                  </p>
                  {d.pepStatus && d.pepStatus !== "Not a PEP" && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {d.pepStatus}
                    </Badge>
                  )}
                </div>
                <Grid>
                  <Field label="First Name"          value={d.firstName} />
                  <Field label="Last Name"           value={d.lastName} />
                  <Field label="Date of Birth"       value={d.dob} />
                  <Field label="Nationality"         value={d.nationality} />
                  <Field label="Residential Address" value={d.residentialAddress} />
                </Grid>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Related Entities */}
      <Section icon={Network} title="D — Related Entities">
        {f.hasRelatedEntity === "no" ? (
          <p className="text-sm text-muted-foreground">
            No related entities declared.
          </p>
        ) : relatedEntities.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No related entities declared.
          </p>
        ) : (
          <div className="space-y-4">
            {relatedEntities.map((r, i) => (
              <div
                key={i}
                className="p-4 rounded-lg border bg-muted/20 space-y-3"
              >
                <p className="text-sm font-semibold text-primary">
                  {r.entityName || `Entity ${i + 1}`}
                </p>
                <Grid>
                  <Field label="Registration Number"     value={r.registrationNumber} />
                  <Field label="Jurisdiction"            value={r.jurisdiction} />
                  <Field label="Business Activity"       value={r.businessActivity} />
                  <Field label="Shareholder Name"        value={r.shareholderName} />
                  <Field label="Ownership %"             value={r.ownershipPercentage} />
                  <Field label="Nature of Relationship"  value={r.natureOfRelationship} />
                </Grid>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* E — AML Risk Assessment */}
      <Section icon={ShieldAlert} title="E — AML Risk Assessment">
        <div className="space-y-4">
          <Grid>
            <Field label="Purpose of Relationship"      value={f.purpose} />
            <Field label="Expected Monthly Volume"      value={f.expectedValue} />
            <Field label="Expected Monthly Transactions" value={f.expectedVolume} />
            <Field label="Countries of Transaction"     value={f.expectedCountries} />
          </Grid>

          {f.transactionData?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Expected Transaction Patterns
              </p>
              <div className="flex flex-wrap gap-2">
                {(f.transactionData as string[]).map((t) => (
                  <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                ))}
              </div>
            </div>
          )}

          {f.sourceOfFunds?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Primary Source of Funds
              </p>
              <div className="flex flex-wrap gap-2">
                {(f.sourceOfFunds as string[]).map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          {f.highRiskIndicators?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                High-Risk Indicators
              </p>
              <div className="flex flex-wrap gap-2">
                {(f.highRiskIndicators as string[])
                  .filter((h) => h !== "None of the above")
                  .map((h) => (
                    <Badge key={h} variant="destructive" className="text-xs">{h}</Badge>
                  ))}
                {f.highRiskIndicators.includes("None of the above") && (
                  <Badge variant="secondary" className="text-xs">None of the above</Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* F — Declaration */}
      {decl && (
        <Section icon={PenLine} title="F — Declaration">
          <div className="space-y-3">
            <Grid>
              <Field label="Signatory Name"  value={decl.signature} />
              <Field label="Signatory Title" value={decl.signatoryTitle} />
              <Field
                label="Signed At"
                value={decl.signedAt
                  ? new Date(decl.signedAt).toLocaleString()
                  : undefined}
              />
              <Field label="IP Address" value={decl.ipAddress} />
            </Grid>
            <Separator />
            <div className="grid grid-cols-3 gap-3 text-sm">
              <ConsentBadge label="Information Accurate" value={decl.agreeTrue} />
              <ConsentBadge label="Agreed to Notify"    value={decl.agreeUpdate} />
              <ConsentBadge label="Data Processing"     value={decl.agreeConsent} />
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}

function ConsentBadge({ label, value }: { label: string; value?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 text-center p-2 rounded-lg bg-muted/40">
      <Badge variant={value ? "default" : "destructive"} className="text-xs">
        {value ? "Yes" : "No"}
      </Badge>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
