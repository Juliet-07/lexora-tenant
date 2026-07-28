import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Paperclip, CheckCircle2, FileText } from "lucide-react";
import type { EvidenceItem } from "@/lib/grc/riskProgrammeStore";

/**
 * Shared "evidence upload + validator sign-off" block.
 * Used by Testing Programme (management sign-off), Deficiencies
 * (validation and close-out), and Audit remediation.
 */
export function EvidenceSignOff({
  evidence,
  onUpload,
  signedBy,
  signedAt,
  validatorLabel = "Validated by",
  signOffLabel = "Validate and close",
  validator,
  onValidatorChange,
  onSignOff,
  disabled,
  requireEvidence = true,
}: {
  evidence: EvidenceItem[];
  onUpload: (items: EvidenceItem[]) => void;
  signedBy: string;
  signedAt: string | null;
  validatorLabel?: string;
  signOffLabel?: string;
  validator: string;
  onValidatorChange: (v: string) => void;
  onSignOff: () => void;
  disabled?: boolean;
  requireEvidence?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = (files: FileList | null) => {
    if (!files) return;
    onUpload(
      Array.from(files).map((f) => ({
        id: Math.random().toString(36).slice(2, 10),
        name: f.name,
        size: f.size,
        uploadedAt: new Date().toISOString(),
      })),
    );
  };

  const blocked = disabled || (requireEvidence && evidence.length === 0);

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-xs">Evidence</Label>
        <div className="space-y-1 mt-1">
          {evidence.map((e) => (
            <div
              key={e.id}
              className="flex items-center gap-2 text-sm border rounded-md px-2 py-1.5"
            >
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="flex-1 truncate">{e.name}</span>
              <span className="text-xs text-muted-foreground">
                {(e.size / 1024).toFixed(0)} KB
              </span>
            </div>
          ))}
          {evidence.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No evidence attached yet — required before closure.
            </p>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = "";
          }}
        />
        <Button
          size="sm"
          variant="outline"
          className="mt-2"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <Paperclip className="h-3.5 w-3.5 mr-1" /> Attach evidence
        </Button>
      </div>

      {signedAt ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>
            {validatorLabel} <strong>{signedBy}</strong> on{" "}
            {new Date(signedAt).toLocaleDateString()}
          </span>
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-xs">{validatorLabel}</Label>
            <Input
              className="h-8"
              value={validator}
              onChange={(e) => onValidatorChange(e.target.value)}
              placeholder="Name or role"
            />
          </div>
          <Button
            size="sm"
            disabled={blocked || !validator.trim()}
            onClick={onSignOff}
          >
            {signOffLabel}
          </Button>
        </div>
      )}
      {!signedAt && requireEvidence && evidence.length === 0 && (
        <Badge variant="outline" className="text-xs">
          Evidence required before sign-off
        </Badge>
      )}
    </div>
  );
}
