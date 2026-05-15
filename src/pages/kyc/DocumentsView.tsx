/**
 * DocumentsView.tsx
 * Renders uploaded documents from client.onboarding.documents
 * Each document has: name, category, url, mimeType, size, uploadedAt
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Image, File } from "lucide-react";

interface Document {
  name:        string;
  category:    string;
  url:         string;
  mimeType?:   string;
  size?:       number;
  description?: string;
  uploadedAt:  string;
}

interface Props {
  documents: Document[];
}

const CATEGORY_LABELS: Record<string, string> = {
  identity:        "Identity",
  address_proof:   "Address Proof",
  corporate_doc:   "Corporate Document",
  financial:       "Financial",
  beneficial_owner:"Beneficial Owner",
  other:           "Other",
};

function formatBytes(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024)       return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocIcon({ mimeType }: { mimeType?: string }) {
  if (mimeType?.startsWith("image/")) return <Image className="h-5 w-5 text-muted-foreground" />;
  return <FileText className="h-5 w-5 text-muted-foreground" />;
}

export function DocumentsView({ documents }: Props) {
  if (!documents || documents.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <File className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            No documents uploaded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by category
  const grouped = documents.reduce(
    (acc, doc) => {
      const cat = doc.category || "other";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(doc);
      return acc;
    },
    {} as Record<string, Document[]>,
  );

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, docs]) => (
        <Card key={category}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              {CATEGORY_LABELS[category] ?? category}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {docs.map((doc, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0">
                    <DocIcon mimeType={doc.mimeType} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {doc.uploadedAt
                        ? new Date(doc.uploadedAt).toLocaleDateString()
                        : ""}
                      {doc.size ? ` · ${formatBytes(doc.size)}` : ""}
                      {doc.description ? ` · ${doc.description}` : ""}
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" asChild className="shrink-0">
                  <a href={doc.url} target="_blank" rel="noreferrer">
                    <Download className="h-4 w-4 mr-1" /> View
                  </a>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
