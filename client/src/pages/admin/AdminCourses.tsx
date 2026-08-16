import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link } from "wouter";
import { ArrowLeft, Plus, Flag, ChevronDown, ChevronUp, ImageUp, Loader2, CheckCircle2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

const DEFAULT_HOLES = Array.from({ length: 18 }, (_, i) => ({
  holeNumber: i + 1,
  par: i % 6 === 2 || i % 6 === 5 ? 5 : i % 6 === 0 ? 3 : 4,
  strokeIndex: i + 1,
}));

type ImportedHole = { holeNumber: number; par: number; strokeIndex: number; distanceMeters: number };
type ScorecardPreview = { courseName: string; measurement: "meters" | "yards"; holes: { holeNumber: number; par: number; tees: { name: string; distanceMeters: number; strokeIndex: number }[] }[]; teeNames: string[] };

export default function AdminCourses() {
  const { data: courses, refetch } = trpc.courses.list.useQuery();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [holeData, setHoleData] = useState(DEFAULT_HOLES);
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<ScorecardPreview | null>(null);
  const [selectedTee, setSelectedTee] = useState("");
  const [importName, setImportName] = useState("");
  const [importHoles, setImportHoles] = useState<ImportedHole[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const createCourse = trpc.courses.create.useMutation({
    onSuccess: () => { toast.success("Course created"); setOpen(false); refetch(); setName(""); setHoleData(DEFAULT_HOLES); },
    onError: (e) => toast.error(e.message),
  });
  const previewImport = trpc.courses.previewScorecardImport.useMutation({
    onSuccess: (data) => {
      const preview = data as ScorecardPreview;
      setImportPreview(preview);
      setImportName(preview.courseName || "");
      if (preview.teeNames.length === 1) applyTee(preview, preview.teeNames[0]);
      else setSelectedTee("");
    },
    onError: (error) => toast.error(error.message || "The scorecard could not be read. Please try a clearer image."),
  });
  const importCourse = trpc.courses.importScorecard.useMutation({
    onSuccess: (data) => {
      toast.success(`${importName} imported from the ${data.teeName} tees`);
      setImportOpen(false);
      resetImport();
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const { data: courseDetail } = trpc.courses.get.useQuery(
    { id: expandedCourse! },
    { enabled: !!expandedCourse }
  );

  const updateHole = (index: number, field: "par" | "strokeIndex", value: number) => {
    setHoleData((prev) => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
  };

  const resetImport = () => {
    setImportPreview(null);
    setSelectedTee("");
    setImportName("");
    setImportHoles([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const applyTee = (preview: ScorecardPreview, teeName: string) => {
    try {
      const holes = preview.holes.map((hole) => {
        const tee = hole.tees.find((candidate) => candidate.name === teeName);
        if (!tee) throw new Error(`The ${teeName} tee is missing on Hole ${hole.holeNumber}.`);
        return { holeNumber: hole.holeNumber, par: hole.par, strokeIndex: tee.strokeIndex, distanceMeters: tee.distanceMeters };
      }).sort((a, b) => a.holeNumber - b.holeNumber);
      setSelectedTee(teeName);
      setImportHoles(holes);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That tee is incomplete in the source scorecard.");
    }
  };

  const handleScorecardImage = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Please use an image smaller than 5 MB."); return; }
    setUploading(true);
    setImportPreview(null);
    setSelectedTee("");
    setImportHoles([]);
    try {
      const form = new FormData();
      form.append("scorecard", file);
      const response = await fetch("/api/upload/course-scorecard", { method: "POST", body: form });
      const uploaded = await response.json();
      if (!response.ok || !uploaded.key) throw new Error(uploaded.error || "Image upload failed.");
      previewImport.mutate({ imageKey: uploaded.key });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const updateImportHole = (index: number, field: "par" | "strokeIndex" | "distanceMeters", value: number) => {
    setImportHoles((previous) => previous.map((hole, holeIndex) => holeIndex === index ? { ...hole, [field]: value } : hole));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div className="flex items-center gap-3">
          <Link href="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <Flag className="w-5 h-5 text-primary" />
          <h1 className="font-bold text-foreground">Courses</h1>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button size="sm" variant="outline" className="flex-1 gap-2 sm:flex-none" onClick={() => setImportOpen(true)}>
            <ImageUp className="w-4 h-4" /> Import Scorecard
          </Button>
          <Button size="sm" className="flex-1 gap-2 sm:flex-none" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" /> Add Course
          </Button>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
        {!courses || courses.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <Flag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No courses yet.</p>
            <Button onClick={() => setOpen(true)} className="gap-2"><Plus className="w-4 h-4" />Add Course</Button>
          </div>
        ) : (
          courses.map((course) => (
            <div key={course.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div
                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
              >
                <div>
                  <p className="font-semibold text-foreground">{course.name}</p>
                  <p className="text-xs text-muted-foreground">{course.totalHoles} holes{(course as any).teeName ? ` · ${(course as any).teeName} tees` : ""}</p>
                </div>
                {expandedCourse === course.id
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                }
              </div>
              {expandedCourse === course.id && courseDetail && (
                <div className="border-t border-border bg-muted/20 px-4 py-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground">
                        <th className="text-left py-1">Hole</th>
                        <th className="text-center py-1">Par</th>
                        <th className="text-center py-1">Stroke Index</th>
                        <th className="text-center py-1">Distance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseDetail.holes.map((h) => (
                        <tr key={h.id} className="border-t border-border/30">
                          <td className="py-1 text-foreground font-medium">{h.holeNumber}</td>
                          <td className="py-1 text-center text-muted-foreground">{h.par}</td>
                          <td className="py-1 text-center text-muted-foreground">{h.strokeIndex}</td>
                          <td className="py-1 text-center text-muted-foreground">{(h as any).distanceMeters ? `${(h as any).distanceMeters} m` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Course</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Course Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. St Andrews Old Course" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Hole Details</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-muted-foreground border-b border-border">
                      <th className="text-left py-2 px-2">Hole</th>
                      <th className="text-center py-2 px-2">Par</th>
                      <th className="text-center py-2 px-2">Stroke Index</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holeData.map((h, i) => (
                      <tr key={i} className="border-b border-border/40">
                        <td className="py-1 px-2 font-medium text-foreground">{h.holeNumber}</td>
                        <td className="py-1 px-2">
                          <Input
                            type="number" min={3} max={5}
                            value={h.par}
                            onChange={(e) => updateHole(i, "par", parseInt(e.target.value))}
                            className="w-16 h-7 text-center text-xs mx-auto"
                          />
                        </td>
                        <td className="py-1 px-2">
                          <Input
                            type="number" min={1} max={18}
                            value={h.strokeIndex}
                            onChange={(e) => updateHole(i, "strokeIndex", parseInt(e.target.value))}
                            className="w-16 h-7 text-center text-xs mx-auto"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!name || createCourse.isPending}
              onClick={() => createCourse.mutate({ name, holes: holeData })}
            >
              Create Course
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={(value) => { setImportOpen(value); if (!value) resetImport(); }}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ImageUp className="w-5 h-5 text-primary" /> Import Course Scorecard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
              <p className="font-medium text-foreground">Upload a complete scorecard image</p>
              <p className="mt-1 text-sm text-muted-foreground">We will read the 18 holes, par, stroke index, and every tee column. You choose the tee set before importing.</p>
              <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleScorecardImage(event.target.files?.[0])} />
              <Button className="mt-3 gap-2" variant="outline" onClick={() => inputRef.current?.click()} disabled={uploading || previewImport.isPending}>
                {uploading || previewImport.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageUp className="w-4 h-4" />}
                {uploading ? "Uploading…" : previewImport.isPending ? "Reading scorecard…" : "Choose Scorecard Image"}
              </Button>
            </div>

            {importPreview && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-foreground">Course Name</label>
                    <Input value={importName} onChange={(event) => setImportName(event.target.value)} placeholder="Enter course name" />
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-medium text-foreground">Scorecard measurement</p>
                    <div className="h-10 rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-muted-foreground capitalize">{importPreview.measurement}; distances import as metres</div>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">Choose tee set to import</p>
                  <div className="flex flex-wrap gap-2">
                    {importPreview.teeNames.map((teeName) => (
                      <Button key={teeName} size="sm" variant={selectedTee === teeName ? "default" : "outline"} onClick={() => applyTee(importPreview, teeName)}>
                        {selectedTee === teeName && <CheckCircle2 className="mr-1.5 w-3.5 h-3.5" />}{teeName}
                      </Button>
                    ))}
                  </div>
                  {importPreview.teeNames.length > 1 && !selectedTee && <p className="mt-2 text-xs text-amber-400">Select the tees you will play before importing.</p>}
                </div>

                {importHoles.length === 18 && (
                  <div className="overflow-x-auto rounded-xl border border-border">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40 text-xs text-muted-foreground">
                        <tr><th className="p-2 text-left">Hole</th><th className="p-2 text-center">Par</th><th className="p-2 text-center">SI</th><th className="p-2 text-center">{selectedTee} distance (m)</th></tr>
                      </thead>
                      <tbody>
                        {importHoles.map((hole, index) => (
                          <tr key={hole.holeNumber} className="border-t border-border/60">
                            <td className="p-2 font-medium text-foreground">{hole.holeNumber}</td>
                            <td className="p-2"><Input className="mx-auto h-8 w-16 text-center" type="number" min={3} max={6} value={hole.par} onChange={(event) => updateImportHole(index, "par", Number(event.target.value))} /></td>
                            <td className="p-2"><Input className="mx-auto h-8 w-16 text-center" type="number" min={1} max={18} value={hole.strokeIndex} onChange={(event) => updateImportHole(index, "strokeIndex", Number(event.target.value))} /></td>
                            <td className="p-2"><Input className="mx-auto h-8 w-24 text-center" type="number" min={40} max={900} value={hole.distanceMeters} onChange={(event) => updateImportHole(index, "distanceMeters", Number(event.target.value))} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button disabled={!importName.trim() || !selectedTee || importHoles.length !== 18 || importCourse.isPending} onClick={() => importCourse.mutate({ name: importName.trim(), teeName: selectedTee, measurement: importPreview?.measurement ?? "meters", holes: importHoles })}>
              {importCourse.isPending && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}Import {selectedTee || "Selected"} Tees
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
