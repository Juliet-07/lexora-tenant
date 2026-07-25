import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  GraduationCap,
  BookOpen,
  Award,
  Clock,
  Upload,
  Trash2,
  ClipboardList,
  Trophy,
  Users,
  PlayCircle,
  Presentation,
  Link as LinkIcon,
  Pencil,
  Plus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchCourses,
  createCourse,
  updateCourse,
  deleteCourse,
  fetchCourseStats,
  fetchCourseLeaderboard,
  type Course,
  type CourseKind,
  type AssessmentQuestion,
} from "@/lib/hr/hr-learning-api";

const kindIcon = (k: CourseKind) =>
  k === "video" ? PlayCircle : k === "pptx" ? Presentation : LinkIcon;

const emptyQuestion = (): AssessmentQuestion => ({
  key: Math.random().toString(36).slice(2, 8),
  prompt: "",
  options: ["", "", "", ""],
  correctIndex: 0,
});

const MAX_COURSE_FILE_SIZE_MB = 500;

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: any;
  icon: any;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div
          className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}

function CourseBuilder({
  initial,
  onDone,
}: {
  initial?: Course;
  onDone: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "Compliance");
  const [kind, setKind] = useState<CourseKind>(initial?.kind ?? "video");
  const [mandatory, setMandatory] = useState(initial?.mandatory ?? false);
  const [duration, setDuration] = useState(initial?.durationMinutes ?? 30);
  const [externalUrl, setExternalUrl] = useState(
    initial?.asset?.externalUrl ?? "",
  );
  const [file, setFile] = useState<File | null>(null);
  const [passMark, setPassMark] = useState(initial?.assessment.passMark ?? 70);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>(
    initial?.assessment.questions.length
      ? initial.assessment.questions
      : [emptyQuestion()],
  );

  const fileSizeMb = file ? file.size / (1024 * 1024) : 0;
  const fileTooLarge = file ? fileSizeMb > MAX_COURSE_FILE_SIZE_MB : false;

  const canSave =
    title.trim() &&
    (kind === "link"
      ? externalUrl.trim()
      : file || initial?.asset?.url || externalUrl.trim()) &&
    !fileTooLarge &&
    questions.every(
      (q) =>
        q.prompt.trim() &&
        q.options.every((o) => o.trim()) &&
        q.options.length >= 2,
    );

  const updateQuestion = (i: number, patch: Partial<AssessmentQuestion>) => {
    setQuestions((qs) =>
      qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)),
    );
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        kind,
        mandatory,
        durationMinutes: duration,
        externalUrl: externalUrl.trim() || undefined,
        passMark,
        questions: questions.map((q) => ({
          key: q.key,
          prompt: q.prompt,
          options: q.options,
          correctIndex: q.correctIndex,
        })),
        file,
      };
      return initial
        ? updateCourse(initial._id, payload)
        : createCourse(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success(
        initial
          ? "Course updated"
          : "Course published — all employees notified.",
      );
      onDone();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to save course"),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Description</Label>
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Content type</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as CourseKind)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="video">Video (MP4/WebM)</SelectItem>
              <SelectItem value="pptx">PowerPoint (PPTX)</SelectItem>
              <SelectItem value="link">
                External link (YouTube/embed)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Duration (minutes)</Label>
          <Input
            type="number"
            min={1}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </div>
        {kind === "link" ? (
          <div className="space-y-2 md:col-span-2">
            <Label>External URL</Label>
            <Input
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
        ) : (
          <div className="space-y-2 md:col-span-2">
            <Label>
              Upload file{" "}
              {initial?.asset?.fileName &&
                `(current: ${initial.asset.fileName})`}
            </Label>
            <Input
              type="file"
              accept={kind === "video" ? "video/*" : ".pptx,.ppt"}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <p
                className={`text-xs ${fileTooLarge ? "text-destructive font-medium" : "text-muted-foreground"}`}
              >
                {fileSizeMb.toFixed(1)} MB
                {fileTooLarge &&
                  ` — exceeds the ${MAX_COURSE_FILE_SIZE_MB}MB limit. Use a smaller file or an external URL instead.`}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Max {MAX_COURSE_FILE_SIZE_MB}MB for uploads. For larger videos,
              paste an external URL below.
            </p>
            <Input
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="…or external URL (optional)"
            />
          </div>
        )}
        <label className="flex items-center gap-2 md:col-span-2 text-sm">
          <input
            type="checkbox"
            checked={mandatory}
            onChange={(e) => setMandatory(e.target.checked)}
          />
          Mandatory for all employees
        </label>
      </div>

      <div className="space-y-3 border-t pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <ClipboardList className="h-4 w-4" /> Assessment
            </h3>
            <p className="text-xs text-muted-foreground">
              Multiple choice questions. Employees earn a certificate on
              passing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Pass mark %</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={passMark}
              onChange={(e) => setPassMark(Number(e.target.value))}
              className="w-20"
            />
          </div>
        </div>

        {questions.map((q, i) => (
          <Card key={q.key}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Question {i + 1}</Label>
                  <Textarea
                    rows={2}
                    value={q.prompt}
                    onChange={(e) =>
                      updateQuestion(i, { prompt: e.target.value })
                    }
                  />
                </div>
                {questions.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setQuestions((qs) => qs.filter((_, idx) => idx !== i))
                    }
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${q.key}`}
                      checked={q.correctIndex === oi}
                      onChange={() => updateQuestion(i, { correctIndex: oi })}
                      title="Mark correct answer"
                    />
                    <Input
                      value={opt}
                      onChange={(e) => {
                        const options = [...q.options];
                        options[oi] = e.target.value;
                        updateQuestion(i, { options });
                      }}
                      placeholder={`Option ${oi + 1}`}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setQuestions((qs) => [...qs, emptyQuestion()])}
        >
          <Plus className="h-4 w-4 mr-1" /> Add question
        </Button>
      </div>

      <DialogFooter>
        <Button
          disabled={!canSave || saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          {initial ? "Save changes" : "Publish course"}
        </Button>
      </DialogFooter>
    </div>
  );
}

function LeaderboardSheet({
  course,
  open,
  onOpenChange,
}: {
  course: Course | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: stats } = useQuery({
    queryKey: ["course-stats", course?._id],
    queryFn: () => fetchCourseStats(course!._id),
    enabled: !!course,
  });
  const { data: board = [] } = useQuery({
    queryKey: ["course-leaderboard", course?._id],
    queryFn: () => fetchCourseLeaderboard(course!._id),
    enabled: !!course,
  });

  if (!course) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{course.title}</SheetTitle>
          <SheetDescription>
            Learner interactions and top performers.
          </SheetDescription>
        </SheetHeader>
        <div className="grid grid-cols-3 gap-3 mt-4">
          <Stat
            label="Enrolled"
            value={stats?.enrolled ?? "—"}
            icon={Users}
            tone="from-primary to-secondary"
          />
          <Stat
            label="Completed"
            value={stats?.completed ?? "—"}
            icon={Award}
            tone="from-emerald-500 to-teal-500"
          />
          <Stat
            label="Avg score"
            value={stats ? `${stats.avgScore}%` : "—"}
            icon={Trophy}
            tone="from-amber-500 to-orange-500"
          />
        </div>
        <div className="mt-6">
          <h3 className="font-semibold flex items-center gap-2 mb-2">
            <Trophy className="h-4 w-4 text-warning" /> Top performers
          </h3>
          {board.length === 0 ? (
            <p className="text-sm text-muted-foreground">No completions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {board.map((e, i) => (
                  <TableRow key={e.employeeId}>
                    <TableCell className="font-semibold">{i + 1}</TableCell>
                    <TableCell>{e.employeeName}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="bg-success/10 text-success border-success/20"
                      >
                        {e.bestScore}%
                      </Badge>
                    </TableCell>
                    <TableCell>{e.attempts}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {e.completedAt
                        ? new Date(e.completedAt).toLocaleDateString()
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CourseCard({
  course,
  onEdit,
  onLeaderboard,
}: {
  course: Course;
  onEdit: () => void;
  onLeaderboard: () => void;
}) {
  const queryClient = useQueryClient();
  const Icon = kindIcon(course.kind);

  const { data: stats } = useQuery({
    queryKey: ["course-stats", course._id],
    queryFn: () => fetchCourseStats(course._id),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteCourse(course._id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Course deleted.");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to delete course"),
  });

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary shrink-0" />
              <h3 className="font-semibold truncate">{course.title}</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {course.category} · {course.durationMinutes} min ·{" "}
              {course.assessment.questions.length} question
              {course.assessment.questions.length === 1 ? "" : "s"}
            </p>
          </div>
          {course.mandatory && (
            <Badge
              variant="outline"
              className="bg-warning/10 text-warning border-warning/20"
            >
              Mandatory
            </Badge>
          )}
        </div>
        {course.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {course.description}
          </p>
        )}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Completion rate</span>
            <span className="font-medium">{stats?.completionRate ?? 0}%</span>
          </div>
          <Progress value={stats?.completionRate ?? 0} className="h-2" />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {stats?.enrolled ?? 0} enrolled · {stats?.completed ?? 0} completed
            · avg {stats?.avgScore ?? 0}%
          </span>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (confirm(`Delete course "${course.title}"?`))
                  deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
            <Button size="sm" variant="outline" onClick={onLeaderboard}>
              <Trophy className="h-3.5 w-3.5 mr-1" /> Leaderboard
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HRLearning() {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [selected, setSelected] = useState<Course | null>(null);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: fetchCourses,
  });

  const openBuilder = (c?: Course) => {
    setEditing(c ?? null);
    setBuilderOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Learning & Development</h1>
          <p className="text-sm text-muted-foreground">
            Publish courses, build assessments and track employee learning.
          </p>
        </div>
        <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openBuilder()}>
              <Upload className="h-4 w-4 mr-2" /> Upload course
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Edit course" : "Upload a new course"}
              </DialogTitle>
            </DialogHeader>
            <CourseBuilder
              initial={editing ?? undefined}
              onDone={() => setBuilderOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Courses"
          value={courses.length}
          icon={BookOpen}
          tone="from-primary to-secondary"
        />
        <Stat
          label="Mandatory"
          value={courses.filter((c) => c.mandatory).length}
          icon={GraduationCap}
          tone="from-blue-500 to-cyan-500"
        />
        <Stat
          label="Optional"
          value={courses.filter((c) => !c.mandatory).length}
          icon={Award}
          tone="from-emerald-500 to-teal-500"
        />
        <Stat
          label="Total questions"
          value={courses.reduce((s, c) => s + c.assessment.questions.length, 0)}
          icon={Clock}
          tone="from-amber-500 to-orange-500"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading courses…</span>
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No courses yet. Click <strong>Upload course</strong> to publish your
            first course for employees.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {courses.map((c) => (
            <CourseCard
              key={c._id}
              course={c}
              onEdit={() => openBuilder(c)}
              onLeaderboard={() => setSelected(c)}
            />
          ))}
        </div>
      )}

      <LeaderboardSheet
        course={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </div>
  );
}
