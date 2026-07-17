import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link } from "wouter";
import { ArrowLeft, Plus, Flag, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const DEFAULT_HOLES = Array.from({ length: 18 }, (_, i) => ({
  holeNumber: i + 1,
  par: i % 6 === 2 || i % 6 === 5 ? 5 : i % 6 === 0 ? 3 : 4,
  strokeIndex: i + 1,
}));

export default function AdminCourses() {
  const { data: courses, refetch } = trpc.courses.list.useQuery();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [holeData, setHoleData] = useState(DEFAULT_HOLES);
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);

  const createCourse = trpc.courses.create.useMutation({
    onSuccess: () => { toast.success("Course created"); setOpen(false); refetch(); setName(""); setHoleData(DEFAULT_HOLES); },
    onError: (e) => toast.error(e.message),
  });

  const { data: courseDetail } = trpc.courses.get.useQuery(
    { id: expandedCourse! },
    { enabled: !!expandedCourse }
  );

  const updateHole = (index: number, field: "par" | "strokeIndex", value: number) => {
    setHoleData((prev) => prev.map((h, i) => i === index ? { ...h, [field]: value } : h));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin"><Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button></Link>
          <Flag className="w-5 h-5 text-primary" />
          <h1 className="font-bold text-foreground">Courses</h1>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" /> Add Course
        </Button>
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
                  <p className="text-xs text-muted-foreground">{course.totalHoles} holes</p>
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
                      </tr>
                    </thead>
                    <tbody>
                      {courseDetail.holes.map((h) => (
                        <tr key={h.id} className="border-t border-border/30">
                          <td className="py-1 text-foreground font-medium">{h.holeNumber}</td>
                          <td className="py-1 text-center text-muted-foreground">{h.par}</td>
                          <td className="py-1 text-center text-muted-foreground">{h.strokeIndex}</td>
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
    </div>
  );
}
