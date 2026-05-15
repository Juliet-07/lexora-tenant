import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  User,
  MapPin,
  Phone,
  CreditCard,
  Briefcase,
  DollarSign,
  ShieldAlert,
  PenLine,
} from "lucide-react";

interface Props {
  formData: Record<string, any>;
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof User;
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

export function IndividualFormView({ formData }: Props) {
  if (!formData || Object.keys(formData).length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        The client has not submitted any form data yet.
      </p>
    );
  }

  const f = formData;

  // Declaration lives in _declaration (stamped on submit)
  const decl = f._declaration;

  return (
    <div className="space-y-4">
      {/* Personal Information */}
      <Section icon={User} title="Personal Information">
        <Grid>
          <Field label="Full Legal Name" value={f.fullName} />
          <Field label="Date of Birth"   value={f.dob} />
          <Field label="Place of Birth"  value={f.placeOfBirth} />
          <Field label="Nationality"     value={f.nationality} />
          <Field label="Tax Residency"   value={f.taxResidency} />
          <Field label="Tax ID / TIN"    value={f.taxId} />
        </Grid>
      </Section>

      {/* Residential Address */}
      <Section icon={MapPin} title="Residential Address">
        <Grid>
          <Field label="Street Address" value={f.street} />
          <Field label="City / Town"    value={f.city} />
          <Field label="State"          value={f.state} />
          <Field label="Postal Code"    value={f.postalCode} />
          <Field label="Country"        value={f.country} />
        </Grid>
      </Section>

      {/*Contact Information */}
      <Section icon={Phone} title="Contact Information">
        <Grid>
          <Field label="Primary Phone"   value={f.primaryPhone} />
          <Field label="Secondary Phone" value={f.secondaryPhone} />
          <Field label="Email Address"   value={f.email} />
        </Grid>
      </Section>

      {/* Identification */}
      <Section icon={CreditCard} title="Identification">
        <Grid>
          <Field label="ID / Passport Number" value={f.idNumber} />
          <Field label="Issuing Country"       value={f.idIssuingCountry} />
          <Field label="Issue Date"            value={f.idIssueDate} />
          <Field label="Expiry Date"           value={f.idExpiryDate} />
        </Grid>
      </Section>

      {/*Employment */}
      <Section icon={Briefcase} title="Employment Details">
        <Grid>
          <Field label="Employment Status" value={f.employmentStatus} />
          <Field label="Employer Name"     value={f.employer} />
          <Field label="Job Title"         value={f.occupation} />
          <Field label="Industry Sector"   value={f.industrySector} />
          <Field label="Employer Address"  value={f.employerAddress} />
        </Grid>
      </Section>

      {/* Source of Funds & Wealth */}
      <Section icon={DollarSign} title="Source of Funds &amp; Wealth">
        <div className="space-y-4">
          {/* Primary source of funds — array of checkboxes */}
          {f.primarySourceOfFunds?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Primary Source of Funds
              </p>
              <div className="flex flex-wrap gap-2">
                {(f.primarySourceOfFunds as string[]).map((s) => (
                  <Badge key={s} variant="secondary" className="capitalize">
                    {s}
                  </Badge>
                ))}
              </div>
              {f.primarySourceOfFundsOther && (
                <p className="text-sm mt-2 text-muted-foreground">
                  Other: {f.primarySourceOfFundsOther}
                </p>
              )}
            </div>
          )}

          <Grid>
            <Field
              label="Source of Wealth"
              value={f.sourceOfWealth}
            />
            <Field label="Estimated Net Worth" value={f.netWorth} />
            <Field label="Annual Income Range"  value={f.annualIncome} />
          </Grid>
        </div>
      </Section>

      {/* AML Risk Assessment */}
      <Section icon={ShieldAlert} title="AML Risk Assessment">
        <div className="space-y-4">
          <Grid>
            <Field label="Purpose of Relationship"   value={f.purpose} />
            <Field label="Expected Monthly Volume"   value={f.expectedValue} />
            <Field label="Expected Monthly Transactions" value={f.expectedVolume} />
            <Field label="Countries of Transaction"  value={f.expectedCountries} />
          </Grid>

          {/* Transaction patterns */}
          {f.transactionData?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Expected Transaction Patterns
              </p>
              <div className="flex flex-wrap gap-2">
                {(f.transactionData as string[]).map((t) => (
                  <Badge key={t} variant="outline" className="text-xs">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Source of funds (AML section) */}
          {f.sourceOfFunds?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                Source of Funds (AML)
              </p>
              <div className="flex flex-wrap gap-2">
                {(f.sourceOfFunds as string[]).map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* High-risk indicators */}
          {f.highRiskIndicators?.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground mb-2">
                High-Risk Indicators
              </p>
              <div className="flex flex-wrap gap-2">
                {(f.highRiskIndicators as string[])
                  .filter((h) => h !== "None of the above")
                  .map((h) => (
                    <Badge
                      key={h}
                      variant="destructive"
                      className="text-xs"
                    >
                      {h}
                    </Badge>
                  ))}
                {f.highRiskIndicators.includes("None of the above") && (
                  <Badge variant="secondary" className="text-xs">
                    None of the above
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/*Declaration */}
      {decl && (
        <Section icon={PenLine} title="Declaration">
          <div className="space-y-3">
            <Grid>
              <Field label="Signed By"  value={decl.signature} />
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
