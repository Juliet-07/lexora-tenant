import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PenSquare,
  GripVertical,
  MessageSquare,
  Trash2,
  Plus,
  FileStack,
  ArrowLeft,
  ChevronRight,
  BookOpen,
  Eye,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  fetchClauses,
  fetchPrecedents,
  fetchPrecedentFolders,
  createContract,
  deleteContract,
  addContractSection,
  addContractSectionFromPrecedent,
  removeContractSection,
  updateContractSectionBody,
  addContractComment,
  toggleContractComment,
  sendContractForReview,
  downloadContractPdf,
  fetchContractPdfBlob,
  type Deal,
  type Contract,
  addRedline,
  downloadRedlinedContractPdf,
} from "@/lib/grc/deals-api";

export default function ContractTab({ deal }: { deal: Deal }) {
  const [openContractId, setOpenContractId] = useState<string | null>(null);
  const contracts = deal.contracts ?? [];
  const openContract = contracts.find((c) => c._id === openContractId);

  if (openContract) {
    return (
      <ContractWorkspace
        deal={deal}
        contract={openContract}
        onBack={() => setOpenContractId(null)}
      />
    );
  }
  return (
    <ContractList
      deal={deal}
      contracts={contracts}
      onOpen={setOpenContractId}
    />
  );
}

function ContractList({
  deal,
  contracts,
  onOpen,
}: {
  deal: Deal;
  contracts: Contract[];
  onOpen: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deal", deal._id] });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const createMut = useMutation({
    mutationFn: () => createContract(deal._id, name.trim()),
    onSuccess: () => {
      invalidate();
      setName("");
      setOpen(false);
      toast.success("Contract created");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to create contract"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          A deal can hold multiple contracts — e.g. a Share Purchase Agreement
          and a separate Non-Compete Agreement.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              New contract
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New contract</DialogTitle>
            </DialogHeader>
            <div>
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Share Purchase Agreement"
              />
            </div>
            <DialogFooter>
              <Button
                disabled={!name.trim() || createMut.isPending}
                onClick={() => createMut.mutate()}
              >
                {createMut.isPending ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {contracts.map((c) => (
          <Card
            key={c._id}
            className="cursor-pointer hover:shadow-md transition"
            onClick={() => onOpen(c._id)}
          >
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileStack className="h-4 w-4" />
                  {c.name}
                </CardTitle>
                <Badge variant="outline">
                  {c.sections.length} section
                  {c.sections.length === 1 ? "" : "s"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Created {new Date(c.createdAt).toLocaleDateString()}
              </p>
            </CardHeader>
          </Card>
        ))}
        {contracts.length === 0 && (
          <div className="col-span-full text-center text-sm text-muted-foreground py-10">
            No contracts yet — create one to start drafting.
          </div>
        )}
      </div>
    </div>
  );
}

function ContractWorkspace({
  deal,
  contract,
  onBack,
}: {
  deal: Deal;
  contract: Contract;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["deal", deal._id] });
  const { data: clauses = [] } = useQuery({
    queryKey: ["deals-clauses"],
    queryFn: fetchClauses,
  });
  const { data: precedents = [] } = useQuery({
    queryKey: ["deals-precedents"],
    queryFn: fetchPrecedents,
  });
  const { data: precedentFolders = [] } = useQuery({
    queryKey: ["precedent-folders"],
    queryFn: fetchPrecedentFolders,
  });
  const [showLib, setShowLib] = useState(false);
  const [openComments, setOpenComments] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentAuthor, setCommentAuthor] = useState("");

  const addMut = useMutation({
    mutationFn: (clauseId: string) =>
      addContractSection(deal._id, contract._id, clauseId),
    onSuccess: invalidate,
  });
  const addFromPrecedentMut = useMutation({
    mutationFn: (precedentId: string) =>
      addContractSectionFromPrecedent(deal._id, contract._id, precedentId),
    onSuccess: () => {
      invalidate();
      toast.success("Precedent inserted");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to insert precedent"),
  });
  const removeMut = useMutation({
    mutationFn: (index: number) =>
      removeContractSection(deal._id, contract._id, index),
    onSuccess: invalidate,
  });
  const bodyMut = useMutation({
    mutationFn: ({ index, body }: { index: number; body: string }) =>
      updateContractSectionBody(deal._id, contract._id, index, body),
    onSuccess: invalidate,
  });
  const commentMut = useMutation({
    mutationFn: (index: number) =>
      addContractComment(
        deal._id,
        contract._id,
        index,
        commentAuthor || "You",
        commentText,
      ),
    onSuccess: () => {
      invalidate();
      setCommentText("");
    },
  });
  const toggleCommentMut = useMutation({
    mutationFn: ({ sIndex, cIndex }: { sIndex: number; cIndex: number }) =>
      toggleContractComment(deal._id, contract._id, sIndex, cIndex),
    onSuccess: invalidate,
  });
  const [openRedlines, setOpenRedlines] = useState<number | null>(null);
  const [redlineDraftLine, setRedlineDraftLine] = useState<number | null>(null);
  const [redlineText, setRedlineText] = useState("");
  const redlineMut = useMutation({
    mutationFn: ({
      sIndex,
      lineIndex,
      comment,
    }: {
      sIndex: number;
      lineIndex: number;
      comment: string;
    }) => addRedline(deal._id, contract._id, sIndex, lineIndex, comment),
    onSuccess: () => {
      invalidate();
      setRedlineText("");
      setRedlineDraftLine(null);
      toast.success("Redline added");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to add redline"),
  });
  const sendReviewMut = useMutation({
    mutationFn: () => sendContractForReview(deal._id, contract._id),
    onSuccess: (res) => {
      invalidate();
      toast.success(
        `Sent to ${res.sent.length} part${res.sent.length === 1 ? "y" : "ies"}`,
      );
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to send for review"),
  });
  const deleteMut = useMutation({
    mutationFn: () => deleteContract(deal._id, contract._id),
    onSuccess: () => {
      invalidate();
      onBack();
      toast.success("Contract deleted");
    },
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewMut = useMutation({
    mutationFn: () => fetchContractPdfBlob(deal._id, contract._id),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setPreviewOpen(true);
    },
    onError: () => toast.error("Failed to load preview"),
  });
  const closePreview = () => {
    setPreviewOpen(false);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const vars = contract.variables ?? {};
  function renderBody(body: string) {
    return body.replace(/\[([A-Z_]+)\]/g, (_, k) =>
      vars[k] ? vars[k] : `[${k}]`,
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <button
                className="text-muted-foreground hover:text-foreground flex items-center gap-1"
                onClick={onBack}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Contracts
              </button>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              <CardTitle className="text-base flex items-center gap-2">
                <PenSquare className="h-4 w-4" />
                {contract.name} ({contract.sections.length})
              </CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowLib(!showLib)}
              >
                {showLib ? "Hide" : "Insert from"} library
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={previewMut.isPending}
                onClick={() => previewMut.mutate()}
              >
                {previewMut.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Eye className="h-4 w-4 mr-1" />
                )}
                Preview
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={sendReviewMut.isPending}
                onClick={() => sendReviewMut.mutate()}
              >
                Send for review
              </Button>
              <Button
                size="sm"
                onClick={() => downloadContractPdf(deal._id, contract._id)}
              >
                Export Execution Version
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadRedlinedContractPdf(deal._id, contract._id)
                }
              >
                Export Redlined
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {contract.sections.map((s, i) => (
              <div
                key={i}
                className="border-2 border-dashed rounded-md p-3 hover:border-primary/60"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    {s.title}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setOpenRedlines(openRedlines === i ? null : i)
                      }
                    >
                      <PenSquare className="h-3.5 w-3.5 mr-1 text-rose-600" />
                      {s.redlines?.length ?? 0}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setOpenComments(openComments === i ? null : i)
                      }
                    >
                      <MessageSquare className="h-3.5 w-3.5 mr-1" />
                      {s.comments.length}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeMut.mutate(i)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <RichTextEditor
                  value={s.body}
                  onChange={(html) => bodyMut.mutate({ index: i, body: html })}
                  minHeight={120}
                />
                <div className="text-xs text-muted-foreground mt-2 border-t pt-2">
                  <div className="mb-1 font-medium">
                    Preview (with variables resolved)
                  </div>
                  <div
                    dangerouslySetInnerHTML={{ __html: renderBody(s.body) }}
                  />
                </div>

                {openRedlines === i && (
                  <div className="mt-3 border-t pt-2 space-y-1.5">
                    <div className="text-xs font-medium text-rose-700 mb-1">
                      Line-by-line redline
                    </div>
                    {(s.lines ?? []).map((line: string, lineIdx: number) => {
                      const lineRedlines = (s.redlines ?? []).filter(
                        (r) => r.lineIndex === lineIdx,
                      );
                      return (
                        <div
                          key={lineIdx}
                          className="border rounded p-2 text-xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="flex-1">{line}</span>
                            <button
                              className="text-rose-600 hover:text-rose-700 shrink-0"
                              onClick={() => {
                                setRedlineDraftLine(
                                  redlineDraftLine === lineIdx ? null : lineIdx,
                                );
                                setRedlineText("");
                              }}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {lineRedlines.map((r, ri) => (
                            <div
                              key={ri}
                              className="mt-1.5 pl-2 border-l-2 border-rose-300 text-[11px]"
                            >
                              <span className="font-medium">
                                {r.authorName}
                              </span>{" "}
                              <span className="text-muted-foreground">
                                ({r.source} ·{" "}
                                {new Date(r.createdAt).toLocaleDateString()})
                              </span>
                              <div>{r.comment}</div>
                            </div>
                          ))}
                          {redlineDraftLine === lineIdx && (
                            <div className="flex gap-2 mt-2">
                              <Input
                                placeholder="Redline comment…"
                                value={redlineText}
                                onChange={(e) => setRedlineText(e.target.value)}
                                className="h-7 text-xs"
                              />
                              <Button
                                size="sm"
                                disabled={
                                  !redlineText.trim() || redlineMut.isPending
                                }
                                onClick={() =>
                                  redlineMut.mutate({
                                    sIndex: i,
                                    lineIndex: lineIdx,
                                    comment: redlineText,
                                  })
                                }
                              >
                                Add
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {openComments === i && (
                  <div className="mt-3 border-t pt-2 space-y-2">
                    {s.comments.map((c, ci) => (
                      <div
                        key={ci}
                        className={`text-xs rounded p-2 border ${c.resolved ? "bg-emerald-500/5 border-emerald-500/20" : "bg-muted/40"}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{c.author}</span>
                          <button
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              toggleCommentMut.mutate({ sIndex: i, cIndex: ci })
                            }
                          >
                            {c.resolved ? "Reopen" : "Resolve"}
                          </button>
                        </div>
                        <div
                          className={
                            c.resolved
                              ? "line-through text-muted-foreground"
                              : ""
                          }
                        >
                          {c.text}
                        </div>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Your name"
                        value={commentAuthor}
                        onChange={(e) => setCommentAuthor(e.target.value)}
                        className="w-32 h-8 text-xs"
                      />
                      <Input
                        placeholder="Add a comment…"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Button
                        size="sm"
                        disabled={!commentText.trim()}
                        onClick={() => commentMut.mutate(i)}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {contract.sections.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-6">
                No sections yet. Insert from the Clause Library.
              </div>
            )}
            {showLib && (
              <div className="border rounded p-3 bg-muted/30">
                <Tabs defaultValue="clauses">
                  <TabsList>
                    <TabsTrigger value="clauses">
                      <BookOpen className="h-3.5 w-3.5 mr-1" />
                      Clauses
                    </TabsTrigger>
                    <TabsTrigger value="precedents">
                      <FileStack className="h-3.5 w-3.5 mr-1" />
                      Precedent Templates
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="clauses" className="space-y-2 mt-2">
                    {clauses.map((cl) => (
                      <div
                        key={cl._id}
                        className="flex items-center justify-between text-sm border-b py-1 last:border-0"
                      >
                        <div>
                          <span className="font-medium">{cl.title}</span>{" "}
                          <span className="text-xs text-muted-foreground">
                            — {cl.category}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={addMut.isPending}
                          onClick={() => addMut.mutate(cl._id)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Insert
                        </Button>
                      </div>
                    ))}
                    {clauses.length === 0 && (
                      <p className="text-xs text-muted-foreground py-2">
                        No clauses in the library yet.
                      </p>
                    )}
                  </TabsContent>
                  <TabsContent value="precedents" className="space-y-2 mt-2">
                    {precedents.map((p) => {
                      const folderName =
                        precedentFolders.find((f) => f._id === p.folderId)
                          ?.name ?? "—";
                      return (
                        <div
                          key={p._id}
                          className="flex items-center justify-between text-sm border-b py-1 last:border-0"
                        >
                          <div>
                            <span className="font-medium">{p.name}</span>{" "}
                            <span className="text-xs text-muted-foreground">
                              — {folderName} · {p.type}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={addFromPrecedentMut.isPending}
                            onClick={() => addFromPrecedentMut.mutate(p._id)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Insert
                          </Button>
                        </div>
                      );
                    })}
                    {precedents.length === 0 && (
                      <p className="text-xs text-muted-foreground py-2">
                        No precedent templates yet.
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        </Card>

        {contract.reviewLoop.responses.length > 0 && (
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle className="text-base">Review responses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {contract.reviewLoop.responses.map((r, i) => (
                <div
                  key={i}
                  className={`border rounded-md p-2.5 text-sm ${r.decision === "Approved" ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{r.partyName}</span>
                    <Badge variant="outline">{r.decision}</Badge>
                  </div>
                  {r.comment && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {r.comment}
                    </div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <Sheet open={previewOpen} onOpenChange={(o) => !o && closePreview()}>
        <SheetContent className="w-full sm:max-w-4xl p-0">
          <SheetHeader className="p-4 border-b">
            <SheetTitle>{contract.name} — Preview</SheetTitle>
          </SheetHeader>
          {previewUrl && (
            <iframe
              src={previewUrl}
              className="w-full h-[calc(100vh-64px)]"
              title="Contract preview"
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
