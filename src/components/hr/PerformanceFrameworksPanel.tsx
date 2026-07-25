import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import {
  fetchCompetencyFramework,
  updateCompetencyFramework,
  fetchValuesFramework,
  updateValuesFramework,
  type FrameworkItem,
} from "@/lib/hr/hr-performance-api";

export function PerformanceFrameworksPanel() {
  return (
    <Tabs defaultValue="competencies" className="space-y-4">
      <TabsList>
        <TabsTrigger value="competencies">Competencies</TabsTrigger>
        <TabsTrigger value="values">Values</TabsTrigger>
      </TabsList>
      <TabsContent value="competencies">
        <FrameworkEditor
          queryKey="competency-framework"
          fetchFn={fetchCompetencyFramework}
          updateFn={updateCompetencyFramework}
          description="Scored on every employee's review (1–5, dual assessment), regardless of role."
        />
      </TabsContent>
      <TabsContent value="values">
        <FrameworkEditor
          queryKey="values-framework"
          fetchFn={fetchValuesFramework}
          updateFn={updateValuesFramework}
          description="Company values scored on every employee's review (1–5, dual assessment)."
        />
      </TabsContent>
    </Tabs>
  );
}

function FrameworkEditor({
  queryKey,
  fetchFn,
  updateFn,
  description,
}: {
  queryKey: string;
  fetchFn: () => Promise<{ items: FrameworkItem[] }>;
  updateFn: (items: FrameworkItem[]) => Promise<{ items: FrameworkItem[] }>;
  description: string;
}) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: fetchFn,
  });
  const [items, setItems] = useState<FrameworkItem[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) setItems(data.items);
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: updateFn,
    onSuccess: (result) => {
      queryClient.setQueryData([queryKey], result);
      setDirty(false);
      toast.success("Saved.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to save"),
  });

  const updateItem = (key: string, patch: Partial<FrameworkItem>) => {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, ...patch } : i)),
    );
    setDirty(true);
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
    setDirty(true);
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { key: `item_${Date.now()}`, title: "", description: "" },
    ]);
    setDirty(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={addItem}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Item
          </Button>
          <Button
            size="sm"
            disabled={!dirty || updateMutation.isPending}
            onClick={() => updateMutation.mutate(items)}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Save className="h-3.5 w-3.5 mr-1" /> Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {items.map((item) => (
        <Card key={item.key}>
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Title"
                value={item.title}
                onChange={(e) =>
                  updateItem(item.key, { title: e.target.value })
                }
                className="font-medium"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeItem(item.key)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
            <Input
              placeholder="Description — what this means in practice"
              value={item.description}
              onChange={(e) =>
                updateItem(item.key, { description: e.target.value })
              }
            />
          </CardContent>
        </Card>
      ))}

      {items.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            No items yet. Add at least one before launching a review cycle.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
