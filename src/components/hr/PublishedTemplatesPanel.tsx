import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, FileText, Eye } from "lucide-react";
import {
  fetchContractTemplates,
  type ContractTemplate,
  type WorkerCategory,
} from "@/lib/hr/hr-contracts-api";

// Read-only — a contract template is now authored and published by
// the super admin (Contract Templates, module "hr"). The tenant
// browses the published library here and picks from it when
// generating a contract (Contracts.tsx); there's no create/edit/
// delete here any more.
export function PublishedTemplatesPanel() {
  return (
    <Tabs defaultValue="employee" className="space-y-4">
      <TabsList>
        <TabsTrigger value="employee">Employee Templates</TabsTrigger>
        <TabsTrigger value="consultant">Consultant Templates</TabsTrigger>
      </TabsList>
      <TabsContent value="employee">
        <TemplateList workerCategory="employee" />
      </TabsContent>
      <TabsContent value="consultant">
        <TemplateList workerCategory="consultant" />
      </TabsContent>
    </Tabs>
  );
}

function TemplateList({ workerCategory }: { workerCategory: WorkerCategory }) {
  const [preview, setPreview] = useState<ContractTemplate | null>(null);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["contract-templates", workerCategory],
    queryFn: () => fetchContractTemplates(workerCategory),
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Templates published by your platform admin for{" "}
        {workerCategory === "consultant" ? "consultants" : "employees"}. Fields
        like the employee's name, job title and salary are filled in
        automatically when you generate a document — there's nothing to type
        from scratch.
      </p>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading templates…</span>
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No templates published for this category yet. Ask your platform
            admin to publish one.
          </CardContent>
        </Card>
      ) : (
        templates.map((t) => (
          <Card key={t._id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <h3 className="font-semibold">{t.title}</h3>
                  {t.hrRequiresSignature === false && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-info/10 text-info border-info/20"
                    >
                      No signature needed
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreview(t)}
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" /> Preview
                </Button>
              </div>
              {t.description && (
                <p className="text-xs text-muted-foreground">{t.description}</p>
              )}
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{preview?.title}</DialogTitle>
          </DialogHeader>
          {preview && (
            <div
              className="prose prose-sm max-w-none text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
              dangerouslySetInnerHTML={{ __html: preview.content }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
