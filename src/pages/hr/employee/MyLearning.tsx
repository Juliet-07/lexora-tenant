import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  GraduationCap,
  BookOpen,
  Award,
  PlayCircle,
  Presentation,
  Link as LinkIcon,
  Trophy,
  Download,
  CheckCircle2,
  Clock,
  ClipboardList,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  useLearning,
  startCourse,
  updateProgress,
  submitAttempt,
  certificatesForEmployee,
  findEnrollment,
  type Course,
  type CourseKind,
  type Certificate,
} from "@/lib/learningStore";
import { downloadCertificate } from "@/lib/certificate";

const kindIcon = (k: CourseKind) =>
  k === "video" ? PlayCircle : k === "pptx" ? Presentation : LinkIcon;

function CoursePlayer({
  course,
  employeeId,
  employeeName,
  onClose,
}: {
  course: Course;
  employeeId: string;
  employeeName: string;
  onClose: () => void;
}) {
  const enroll = findEnrollment(course.id, employeeId);
  const [phase, setPhase] = useState<"content" | "assessment" | "result">(
    enroll?.status === "completed" ? "result" : "content",
  );
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
    cert?: Certificate;
  } | null>(
    enroll?.status === "completed" && enroll.bestScore !== undefined
      ? { score: enroll.bestScore, passed: true }
      : null,
  );

  const beginAssessment = () => {
    startCourse(course.id, employeeId, employeeName);
    updateProgress(course.id, employeeId, 90);
    setPhase("assessment");
  };

  const submit = () => {
    const total = course.assessment.questions.length;
    if (Object.keys(answers).length < total) {
      toast.error("Please answer every question.");
      return;
    }
    const correct = course.assessment.questions.reduce(
      (n, q) => (answers[q.id] === q.correctIndex ? n + 1 : n),
      0,
    );
    const score = Math.round((correct / total) * 100);
    const { passed, certificate } = submitAttempt(
      course.id,
      employeeId,
      employeeName,
      score,
    );
    setResult({ score, passed, cert: certificate });
    setPhase("result");
    if (passed) {
      toast.success(`Passed with ${score}%! Certificate issued.`);
    } else {
      toast.error(`Scored ${score}%. Pass mark is ${course.assessment.passMark}%.`);
    }
  };

  const renderContent = () => {
    const asset = course.asset;
    if (!asset) return <p className="text-sm text-muted-foreground">No content uploaded.</p>;
    const src = asset.dataUrl || asset.externalUrl;
    if (!src) return null;
    if (course.kind === "video") {
      if (asset.dataUrl) {
        return (
          <video
            src={src}
            controls
            className="w-full rounded-lg bg-black"
            onPlay={() => {
              startCourse(course.id, employeeId, employeeName);
              updateProgress(course.id, employeeId, 30);
            }}
            onEnded={() => updateProgress(course.id, employeeId, 90)}
          />
        );
      }
      return (
        <div className="aspect-video">
          <iframe
            src={src}
            className="w-full h-full rounded-lg border"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title={course.title}
          />
        </div>
      );
    }
    if (course.kind === "pptx") {
      // Browsers can't render pptx natively; offer download / office online preview.
      const officeViewer = asset.externalUrl
        ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(asset.externalUrl)}`
        : null;
      return (
        <div className="space-y-3">
          {officeViewer ? (
            <div className="aspect-video">
              <iframe
                src={officeViewer}
                className="w-full h-full rounded-lg border"
                title={course.title}
              />
            </div>
          ) : (
            <div className="p-6 rounded-lg border bg-muted/30 text-center space-y-2">
              <Presentation className="h-10 w-10 text-primary mx-auto" />
              <p className="text-sm">
                Download the presentation to view it, then return here to take the assessment.
              </p>
              <Button asChild variant="outline" size="sm">
                <a href={src} download={asset.fileName}>
                  <Download className="h-4 w-4 mr-1" /> Download {asset.fileName}
                </a>
              </Button>
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="aspect-video">
        <iframe
          src={src}
          className="w-full h-full rounded-lg border"
          allow="autoplay; encrypted-media"
          allowFullScreen
          title={course.title}
        />
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {phase === "content" && (
        <>
          {renderContent()}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Pass mark: {course.assessment.passMark}% ·{" "}
              {course.assessment.questions.length} question
              {course.assessment.questions.length === 1 ? "" : "s"}
            </p>
            <Button onClick={beginAssessment}>
              <ClipboardList className="h-4 w-4 mr-2" /> Take assessment
            </Button>
          </div>
        </>
      )}

      {phase === "assessment" && (
        <div className="space-y-4">
          {course.assessment.questions.map((q, i) => (
            <Card key={q.id}>
              <CardContent className="p-4 space-y-3">
                <p className="font-medium text-sm">
                  {i + 1}. {q.prompt}
                </p>
                <RadioGroup
                  value={answers[q.id]?.toString() ?? ""}
                  onValueChange={(v) =>
                    setAnswers((a) => ({ ...a, [q.id]: Number(v) }))
                  }
                >
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <RadioGroupItem value={oi.toString()} id={`${q.id}-${oi}`} />
                      <Label htmlFor={`${q.id}-${oi}`} className="font-normal">
                        {opt}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          ))}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPhase("content")}>
              Back
            </Button>
            <Button onClick={submit}>Submit answers</Button>
          </div>
        </div>
      )}

      {phase === "result" && result && (
        <div className="text-center space-y-4 py-8">
          <div
            className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
              result.passed
                ? "bg-success/10 text-success"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {result.passed ? (
              <Award className="h-10 w-10" />
            ) : (
              <ClipboardList className="h-10 w-10" />
            )}
          </div>
          <div>
            <h3 className="text-2xl font-bold">
              {result.passed ? "Congratulations!" : "Almost there"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your score: <strong>{result.score}%</strong> (pass mark{" "}
              {course.assessment.passMark}%)
            </p>
          </div>
          <div className="flex justify-center gap-2">
            {result.passed && result.cert && (
              <Button onClick={() => downloadCertificate(result.cert!)}>
                <Download className="h-4 w-4 mr-2" /> Download certificate
              </Button>
            )}
            {!result.passed && (
              <Button
                onClick={() => {
                  setAnswers({});
                  setPhase("assessment");
                  setResult(null);
                }}
              >
                Try again
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MyLearning() {
  const { user } = useAuth();
  const { courses, enrollments } = useLearning();
  const [selected, setSelected] = useState<Course | null>(null);

  const employeeId = user?.id ?? "anon";
  const employeeName = `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "You";

  const myEnrollments = useMemo(
    () => enrollments.filter((e) => e.employeeId === employeeId),
    [enrollments, employeeId],
  );
  const myCerts = certificatesForEmployee(employeeId);

  const enrolledById = new Map(myEnrollments.map((e) => [e.courseId, e]));

  const inProgress = courses.filter(
    (c) => enrolledById.get(c.id)?.status === "in_progress",
  );
  const completed = courses.filter(
    (c) => enrolledById.get(c.id)?.status === "completed",
  );
  const available = courses.filter((c) => !enrolledById.has(c.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Learning</h1>
        <p className="text-sm text-muted-foreground">
          Courses published by your organisation. Complete assessments to earn certificates.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Available" value={courses.length} icon={BookOpen} tone="from-primary to-secondary" />
        <Stat label="In progress" value={inProgress.length} icon={Clock} tone="from-blue-500 to-cyan-500" />
        <Stat label="Completed" value={completed.length} icon={CheckCircle2} tone="from-emerald-500 to-teal-500" />
        <Stat label="Certificates" value={myCerts.length} icon={Award} tone="from-amber-500 to-orange-500" />
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All courses</TabsTrigger>
          <TabsTrigger value="progress">In progress ({inProgress.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
          <TabsTrigger value="certs">My certificates ({myCerts.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <CourseGrid
            courses={courses}
            enrolledById={enrolledById}
            onOpen={setSelected}
          />
        </TabsContent>
        <TabsContent value="progress">
          <CourseGrid
            courses={inProgress}
            enrolledById={enrolledById}
            onOpen={setSelected}
          />
        </TabsContent>
        <TabsContent value="completed">
          <CourseGrid
            courses={completed}
            enrolledById={enrolledById}
            onOpen={setSelected}
          />
        </TabsContent>
        <TabsContent value="certs">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">My certificates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {myCerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No certificates yet. Complete a course to earn one.
                </p>
              ) : (
                myCerts.map((c) => (
                  <div key={c.id} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                    <div className="flex items-center gap-3">
                      <Award className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{c.courseTitle}</p>
                        <p className="text-xs text-muted-foreground">
                          Score {c.score}% · issued {new Date(c.issuedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => downloadCertificate(c)}>
                      <Download className="h-4 w-4 mr-1" /> PDF
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.title}</SheetTitle>
                <SheetDescription>
                  {selected.category} · {selected.durationMinutes} min
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4">
                <CoursePlayer
                  key={selected.id}
                  course={selected}
                  employeeId={employeeId}
                  employeeName={employeeName}
                  onClose={() => setSelected(null)}
                />
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function CourseGrid({
  courses,
  enrolledById,
  onOpen,
}: {
  courses: Course[];
  enrolledById: Map<string, { status: string; progress: number; bestScore?: number }>;
  onOpen: (c: Course) => void;
}) {
  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Nothing here yet.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {courses.map((c) => {
        const enr = enrolledById.get(c.id);
        const Icon = kindIcon(c.kind);
        const label =
          enr?.status === "completed"
            ? "Review"
            : enr?.status === "in_progress"
              ? "Continue"
              : "Start";
        return (
          <Card key={c.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="font-semibold truncate">{c.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.category} · {c.durationMinutes} min
                  </p>
                </div>
                {c.mandatory && (
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
                    Required
                  </Badge>
                )}
              </div>
              {c.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {c.description}
                </p>
              )}
              {enr && (
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">
                      {enr.status === "completed"
                        ? `Score ${enr.bestScore ?? 0}%`
                        : "Progress"}
                    </span>
                    <span className="font-medium">{enr.progress}%</span>
                  </div>
                  <Progress value={enr.progress} className="h-2" />
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {c.assessment.questions.length} question
                  {c.assessment.questions.length === 1 ? "" : "s"} · pass{" "}
                  {c.assessment.passMark}%
                </span>
                <Button size="sm" onClick={() => onOpen(c)}>
                  {label}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

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
        <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}
