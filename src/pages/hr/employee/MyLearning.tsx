import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  BookOpen,
  Award,
  PlayCircle,
  Presentation,
  Link as LinkIcon,
  Download,
  CheckCircle2,
  Clock,
  ClipboardList,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchMyCourses,
  fetchMyCourseById,
  startMyCourse,
  updateMyCourseProgress,
  submitMyAssessment,
  fetchMyCertificates,
  downloadMyCertificate,
  resolveLearningFileUrl,
  type EmployeeCourse,
  type CourseKind,
} from "@/lib/hr-learning-api";

const kindIcon = (k: CourseKind) =>
  k === "video" ? PlayCircle : k === "pptx" ? Presentation : LinkIcon;

function CoursePlayer({
  courseId,
  onClose,
}: {
  courseId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<"content" | "assessment" | "result">(
    "content",
  );
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{
    score: number;
    passed: boolean;
  } | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [hasEngaged, setHasEngaged] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSavedAtRef = useRef<number>(0);
  const currentPositionRef = useRef<number>(0);
  const currentPercentRef = useRef<number>(0);
  const hasSeekedRef = useRef(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ["my-course", courseId],
    queryFn: () => fetchMyCourseById(courseId),
  });

  // Reopening an already-completed course jumps straight to the
  // result screen — but only once, on first load, so it doesn't
  // fight the user's own "Try again" navigation after a refetch.
  useEffect(() => {
    if (course && !initialized) {
      if (course.myEnrollment?.status === "completed") {
        setResult({ score: course.myEnrollment.bestScore ?? 0, passed: true });
        setPhase("result");
        setHasEngaged(true);
      }
      setInitialized(true);
    }
  }, [course, initialized]);

  const startMutation = useMutation({
    mutationFn: () => startMyCourse(courseId),
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to start course"),
  });

  const progressMutation = useMutation({
    mutationFn: (payload: { progress: number; positionSeconds?: number }) =>
      updateMyCourseProgress(
        courseId,
        payload.progress,
        payload.positionSeconds,
      ),
    onError: (err: any) =>
      toast.error(err?.response?.data?.message ?? "Failed to save progress"),
  });

  const saveVideoPosition = (force = false) => {
    const now = Date.now();
    if (!force && now - lastSavedAtRef.current < 5000) return;
    lastSavedAtRef.current = now;
    progressMutation.mutate({
      progress: currentPercentRef.current,
      positionSeconds: currentPositionRef.current,
    });
  };

  useEffect(() => {
    return () => {
      if (currentPositionRef.current > 0) {
        updateMyCourseProgress(
          courseId,
          currentPercentRef.current,
          currentPositionRef.current,
        ).catch(() => {});
      }
    };
  }, [courseId]);

  const submitMutation = useMutation({
    mutationFn: () =>
      submitMyAssessment(
        courseId,
        Object.entries(answers).map(([key, selectedIndex]) => ({
          key,
          selectedIndex,
        })),
      ),
    onSuccess: (res) => {
      setResult({ score: res.score, passed: res.passed });
      setPhase("result");
      queryClient.invalidateQueries({ queryKey: ["my-course", courseId] });
      queryClient.invalidateQueries({ queryKey: ["my-courses"] });
      queryClient.invalidateQueries({ queryKey: ["my-certificates"] });
      if (res.passed)
        toast.success(`Passed with ${res.score}%! Certificate issued.`);
      else toast.error(`Scored ${res.score}%. Try again.`);
    },
    onError: (err: any) =>
      toast.error(
        err?.response?.data?.message ?? "Failed to submit assessment",
      ),
  });

  const beginAssessment = () => {
    startMutation.mutate();
    progressMutation.mutate({
      progress: Math.max(90, currentPercentRef.current),
      positionSeconds: currentPositionRef.current,
    });
    setPhase("assessment");
  };

  const submit = () => {
    if (!course) return;
    const total = course.assessment.questions.length;
    if (Object.keys(answers).length < total) {
      toast.error("Please answer every question.");
      return;
    }
    submitMutation.mutate();
  };

  const renderContent = () => {
    if (!course) return null;
    const asset = course.asset;
    if (!asset)
      return (
        <p className="text-sm text-muted-foreground">No content uploaded.</p>
      );

    const hostedUrl = asset.url ? resolveLearningFileUrl(asset.url) : null;

    if (course.kind === "video") {
      if (hostedUrl) {
        const resumeAt = course.myEnrollment?.lastPositionSeconds ?? 0;
        return (
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <video
              ref={videoRef}
              src={hostedUrl}
              controls
              className="w-full h-full object-contain"
              onLoadedMetadata={() => {
                if (videoRef.current && resumeAt > 0 && !hasSeekedRef.current) {
                  videoRef.current.currentTime = resumeAt;
                  hasSeekedRef.current = true;
                }
              }}
              onPlay={() => {
                setHasEngaged(true);
                startMutation.mutate();
              }}
              onTimeUpdate={(e) => {
                const { currentTime, duration } = e.currentTarget;
                currentPositionRef.current = currentTime;
                if (duration > 0) {
                  currentPercentRef.current = Math.min(
                    89,
                    Math.round((currentTime / duration) * 90),
                  );
                }
                saveVideoPosition();
              }}
              onPause={() => saveVideoPosition(true)}
              onEnded={() => {
                currentPercentRef.current = 90;
                saveVideoPosition(true);
              }}
            />
          </div>
        );
      }
      if (asset.externalUrl) {
        return (
          <div className="space-y-3">
            <div className="aspect-video">
              <iframe
                src={asset.externalUrl}
                className="w-full h-full rounded-lg border"
                allow="autoplay; encrypted-media"
                allowFullScreen
                title={course.title}
              />
            </div>
            {renderReviewAck()}
          </div>
        );
      }
      return null;
    }

    if (course.kind === "pptx") {
      const officeViewer = asset.externalUrl
        ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(asset.externalUrl)}`
        : null;
      if (officeViewer) {
        return (
          <div className="space-y-3">
            <div className="aspect-video">
              <iframe
                src={officeViewer}
                className="w-full h-full rounded-lg border"
                title={course.title}
              />
            </div>
            {renderReviewAck()}
          </div>
        );
      }
      return (
        <div className="p-6 rounded-lg border bg-muted/30 text-center space-y-2">
          <Presentation className="h-10 w-10 text-primary mx-auto" />
          <p className="text-sm">
            Download the presentation to view it, then return here to take the
            assessment.
          </p>
          <Button asChild variant="outline" size="sm">
            <a href={hostedUrl ?? undefined} download={asset.fileName}>
              <Download className="h-4 w-4 mr-1" /> Download {asset.fileName}
            </a>
          </Button>
          {renderReviewAck()}
        </div>
      );
    }

    // "link" kind
    const src = hostedUrl || asset.externalUrl;
    if (!src) return null;
    return (
      <div className="space-y-3">
        <div className="aspect-video">
          <iframe
            src={src}
            className="w-full h-full rounded-lg border"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title={course.title}
          />
        </div>
        {renderReviewAck()}
      </div>
    );
  };

  const renderReviewAck = () =>
    hasEngaged ? (
      <p className="text-xs text-success flex items-center gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5" /> Marked as reviewed
      </p>
    ) : (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          setHasEngaged(true);
          startMutation.mutate();
          progressMutation.mutate({ progress: 90 });
        }}
      >
        I've reviewed this material
      </Button>
    );

  if (isLoading || !course) {
    return (
      <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {phase === "content" && (
        <>
          {renderContent()}
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {!hasEngaged
                ? "Play the video or mark the material as reviewed to unlock the assessment."
                : `Pass mark: ${course.assessment.passMark}% · ${course.assessment.questions.length} question${course.assessment.questions.length === 1 ? "" : "s"}`}
            </p>
            <Button onClick={beginAssessment} disabled={!hasEngaged}>
              <ClipboardList className="h-4 w-4 mr-2" /> Take assessment
            </Button>
          </div>
        </>
      )}

      {phase === "assessment" && (
        <div className="space-y-4">
          {course.assessment.questions.map((q, i) => (
            <Card key={q.key}>
              <CardContent className="p-4 space-y-3">
                <p className="font-medium text-sm">
                  {i + 1}. {q.prompt}
                </p>
                <RadioGroup
                  value={answers[q.key]?.toString() ?? ""}
                  onValueChange={(v) =>
                    setAnswers((a) => ({ ...a, [q.key]: Number(v) }))
                  }
                >
                  {q.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <RadioGroupItem
                        value={oi.toString()}
                        id={`${q.key}-${oi}`}
                      />
                      <Label htmlFor={`${q.key}-${oi}`} className="font-normal">
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
            <Button onClick={submit} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Submit answers
            </Button>
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
            {result.passed && (
              <Button onClick={() => downloadMyCertificate(course._id)}>
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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["my-courses"],
    queryFn: fetchMyCourses,
  });
  const { data: myCerts = [] } = useQuery({
    queryKey: ["my-certificates"],
    queryFn: fetchMyCertificates,
  });

  const selectedCourse = courses.find((c) => c._id === selectedId) ?? null;

  const inProgress = courses.filter(
    (c) => c.myEnrollment?.status === "in_progress",
  );
  const completed = courses.filter(
    (c) => c.myEnrollment?.status === "completed",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Learning</h1>
        <p className="text-sm text-muted-foreground">
          Courses published by your organisation. Complete assessments to earn
          certificates.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Available"
          value={courses.length}
          icon={BookOpen}
          tone="from-primary to-secondary"
        />
        <Stat
          label="In progress"
          value={inProgress.length}
          icon={Clock}
          tone="from-blue-500 to-cyan-500"
        />
        <Stat
          label="Completed"
          value={completed.length}
          icon={CheckCircle2}
          tone="from-emerald-500 to-teal-500"
        />
        <Stat
          label="Certificates"
          value={myCerts.length}
          icon={Award}
          tone="from-amber-500 to-orange-500"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading courses…</span>
        </div>
      ) : (
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All courses</TabsTrigger>
            <TabsTrigger value="progress">
              In progress ({inProgress.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({completed.length})
            </TabsTrigger>
            <TabsTrigger value="certs">
              My certificates ({myCerts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <CourseGrid courses={courses} onOpen={setSelectedId} />
          </TabsContent>
          <TabsContent value="progress">
            <CourseGrid courses={inProgress} onOpen={setSelectedId} />
          </TabsContent>
          <TabsContent value="completed">
            <CourseGrid courses={completed} onOpen={setSelectedId} />
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
                    <div
                      key={c.courseId}
                      className="flex items-center justify-between border-b pb-2 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <Award className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{c.courseTitle}</p>
                          <p className="text-xs text-muted-foreground">
                            Score {c.score}% · issued{" "}
                            {new Date(c.completedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadMyCertificate(c.courseId)}
                      >
                        <Download className="h-4 w-4 mr-1" /> PDF
                      </Button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Sheet
        open={!!selectedId}
        onOpenChange={(v) => !v && setSelectedId(null)}
      >
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          {selectedId && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedCourse?.title ?? "Course"}</SheetTitle>
                <SheetDescription>
                  {selectedCourse
                    ? `${selectedCourse.category} · ${selectedCourse.durationMinutes} min`
                    : ""}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4">
                <CoursePlayer
                  key={selectedId}
                  courseId={selectedId}
                  onClose={() => setSelectedId(null)}
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
  onOpen,
}: {
  courses: EmployeeCourse[];
  onOpen: (id: string) => void;
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
        const enr = c.myEnrollment;
        const Icon = kindIcon(c.kind);
        const label =
          enr?.status === "completed" ? "Review" : enr ? "Continue" : "Start";
        return (
          <Card key={c._id} className="hover:shadow-md transition-shadow">
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
                  <Badge
                    variant="outline"
                    className="bg-warning/10 text-warning border-warning/20"
                  >
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
                <Button size="sm" onClick={() => onOpen(c._id)}>
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
        <div
          className={`h-10 w-10 rounded-lg bg-gradient-to-br ${tone} flex items-center justify-center`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardContent>
    </Card>
  );
}
