import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FolderClosed,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Paperclip,
  Loader2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import {
  fetchMyBoardPackRequests,
  submitMyBoardPackDoc,
  resolveGrcFileUrl,
  type MyBoardPackRequest,
} from "@/lib/grc/governance-api";

function StatCard({ label, value, icon: Icon }: any) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}

const isOverdue = (r: MyBoardPackRequest) =>
  !r.fileUrl && !!r.dueDate && new Date(r.dueDate).getTime() < Date.now();

function RequestCard({
  r,
  onUpload,
  uploading,
}: {
  r: MyBoardPackRequest;
  onUpload: (files: File[]) => void;
  uploading: boolean;
}) {
  const canAct = !r.fileUrl;
  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold">{r.name}</p>
            <p className="text-xs text-muted-foreground">
              {r.meetingTitle} · {new Date(r.meetingDate).toLocaleDateString()}{" "}
              · {r.agendaItemTitle || "Procedural documents"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={r.fileUrl ? "secondary" : "outline"}>
              {r.fileUrl ? "Submitted" : "Outstanding"}
            </Badge>
            {r.dueDate && (
              <span
                className={`text-[11px] ${isOverdue(r) ? "text-destructive" : "text-muted-foreground"}`}
              >
                Due {new Date(r.dueDate).toLocaleDateString()}
                {isOverdue(r) && " (overdue)"}
              </span>
            )}
          </div>
        </div>

        {r.fileUrl && (
          <a
            href={resolveGrcFileUrl(r.fileUrl)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs bg-muted/40 hover:bg-muted rounded px-2 py-1"
          >
            <Paperclip className="h-3 w-3" />
            {r.name}
          </a>
        )}

        {canAct && (
          <div className="flex items-center gap-2 pt-1">
            <label className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs cursor-pointer hover:bg-muted">
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Paperclip className="h-3.5 w-3.5" />
              )}
              Upload file
              <input
                type="file"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  if (e.target.files?.length)
                    onUpload(Array.from(e.target.files));
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MyBoardPackRequests() {
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["my-board-pack-requests"],
    queryFn: fetchMyBoardPackRequests,
  });
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: ({
      meetingId,
      index,
      files,
    }: {
      meetingId: string;
      index: number;
      files: File[];
    }) => submitMyBoardPackDoc(meetingId, index, files[0]),
    onMutate: ({ meetingId, index }) =>
      setUploadingKey(`${meetingId}-${index}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-board-pack-requests"] });
      toast({ title: "File uploaded" });
    },
    onError: (err: any) =>
      toast({
        title: "Upload failed",
        description: err?.response?.data?.message ?? err.message,
        variant: "destructive",
      }),
    onSettled: () => setUploadingKey(null),
  });

  const outstanding = requests.filter((r) => !r.fileUrl);
  const submitted = requests.filter((r) => !!r.fileUrl);
  const overdueCount = outstanding.filter(isOverdue).length;

  if (isLoading) {
    return (
      <div className="flex justify-center py-24 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading board pack requests…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FolderClosed className="h-6 w-6" />
          Board Pack Requests
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Documents a board or committee meeting's organiser has asked of you —
          upload what's asked, filed straight into that meeting's board pack.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard label="Outstanding" value={outstanding.length} icon={Clock} />
        <StatCard label="Overdue" value={overdueCount} icon={AlertTriangle} />
        <StatCard
          label="Submitted"
          value={submitted.length}
          icon={CheckCircle2}
        />
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            You have no board pack document requests right now.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <RequestCard
              key={`${r.meetingId}-${r.index}`}
              r={r}
              uploading={uploadingKey === `${r.meetingId}-${r.index}`}
              onUpload={(files) =>
                uploadMutation.mutate({
                  meetingId: r.meetingId,
                  index: r.index,
                  files,
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
