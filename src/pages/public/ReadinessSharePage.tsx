import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  Download,
  ExternalLink,
  FileText,
  Lock,
} from "lucide-react";
import {
  acceptPublicNda,
  fetchPublicShare,
  requestPublicDownload,
} from "@/lib/grc/readiness-workspace-api";
import {
  errMsg,
  fmtBytes,
  fmtDate,
  uploadUrl,
} from "@/pages/grc/intelligence/readiness/shared";

// Public, unauthenticated page behind the link in the "data room" email a
// tenant sends an investor. The token is the credential: there is nothing to
// log in to. If the tenant asked for an NDA, nothing is listed until the
// investor accepts it; view-only links open the file, download links fetch
// it through the download endpoint so the download is counted.
export default function ReadinessSharePage() {
  const { token = "" } = useParams<{ token: string }>();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");

  const q = useQuery({
    queryKey: ["readiness-share", token],
    queryFn: () => fetchPublicShare(token),
    enabled: !!token,
    retry: false,
  });
  const view = q.data;

  const accept = useMutation({
    mutationFn: () => acceptPublicNda(token, name.trim()),
    onSuccess: (v) => {
      setError("");
      qc.setQueryData(["readiness-share", token], v);
    },
    onError: (e) => setError(errMsg(e)),
  });
  const download = useMutation({
    mutationFn: (fileId: string) => requestPublicDownload(token, fileId),
    onSuccess: ({ url }) => {
      setError("");
      window.open(uploadUrl(url), "_blank", "noopener");
      qc.invalidateQueries({ queryKey: ["readiness-share", token] });
    },
    onError: (e) => setError(errMsg(e)),
  });

  const shell = (children: React.ReactNode) => (
    <div className="flex min-h-screen items-start justify-center bg-muted/30 p-4 sm:p-8">
      <div className="w-full max-w-2xl space-y-4">{children}</div>
    </div>
  );

  if (q.isLoading) {
    return shell(
      <p className="py-24 text-center text-sm text-muted-foreground">
        Loading…
      </p>,
    );
  }
  if (q.isError || !view) {
    return shell(
      <Notice
        title="This link isn't valid"
        text="It may have been mistyped. Ask the sender for a new link."
      />,
    );
  }
  if (view.state === "revoked") {
    return shell(
      <Notice
        title="This link has been withdrawn"
        text={`${view.company} has ended access. Contact them if you still need the documents.`}
      />,
    );
  }
  if (view.state === "expired") {
    return shell(
      <Notice
        title="This link has expired"
        text={`Access ended on ${fmtDate(view.expiresAt)}. Ask ${view.company} for a fresh link.`}
      />,
    );
  }

  const gated = view.nda !== "none" && !view.ndaAccepted;

  return shell(
    <>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Data room
        </p>
        <h1 className="text-2xl font-bold">{view.company}</h1>
        <p className="text-sm text-muted-foreground">
          Shared with {view.investorName} · available until{" "}
          {fmtDate(view.expiresAt)} ·{" "}
          {view.accessLevel === "download" ? "view and download" : "view only"}
        </p>
      </div>

      {view.message ? (
        <Card>
          <CardContent className="p-4 text-sm italic">
            {view.message}
          </CardContent>
        </Card>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      {gated ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex items-center gap-2 font-semibold">
              <Lock className="h-4 w-4" /> Confidentiality agreement
            </div>
            {view.nda === "click" ? (
              <>
                <p className="text-sm text-muted-foreground">
                  The documents are confidential to {view.company}. By
                  continuing you agree to use them only to evaluate the proposed
                  transaction and not to share them with anyone else.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="nda-name">Your full name</Label>
                  <Input
                    id="nda-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={agree}
                    onCheckedChange={(c) => setAgree(c === true)}
                    aria-label="I agree to keep these documents confidential"
                  />
                  <span>I agree to keep these documents confidential.</span>
                </label>
                <Button
                  onClick={() => accept.mutate()}
                  disabled={!name.trim() || !agree || accept.isPending}
                >
                  Accept and view documents
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  An NDA between you and {view.company} is already on file, so
                  confirm your name to continue.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="nda-name">Your full name</Label>
                  <Input
                    id="nda-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <Button
                  onClick={() => accept.mutate()}
                  disabled={!name.trim() || accept.isPending}
                >
                  Confirm and continue
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : view.categories.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No documents have been uploaded to the shared categories yet.
          </CardContent>
        </Card>
      ) : (
        view.categories.map((c) => (
          <Card key={c.category}>
            <CardContent className="p-0">
              <div className="border-b px-4 py-2.5 text-sm font-semibold">
                {c.category}
              </div>
              <ul className="divide-y">
                {c.items.map((it) => (
                  <li
                    key={it.file.id}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {it.name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {it.file.name} · {fmtBytes(it.file.size)} · v
                        {it.version}
                      </div>
                    </div>
                    {view.accessLevel === "download" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => download.mutate(it.file.id)}
                        disabled={download.isPending}
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                      </Button>
                    ) : it.file.url ? (
                      <Button size="sm" variant="outline" asChild>
                        <a
                          href={uploadUrl(it.file.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open
                        </a>
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </>,
  );
}

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
        <AlertTriangle className="h-8 w-8 text-amber-500" />
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
