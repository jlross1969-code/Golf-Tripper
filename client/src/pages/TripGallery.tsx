import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Link, useParams } from "wouter";
import { ArrowLeft, Images } from "lucide-react";

export default function TripGallery() {
  const { tripId } = useParams<{ tripId: string }>();
  const id = Number(tripId);
  const { data } = trpc.gallery.albums.useQuery({ tripId: id });
  const [open, setOpen] = useState<{ url: string; alt: string | null; caption: string | null } | null>(null);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-4 py-4 flex items-center gap-3">
        <Link href={`/trip/${id}`}><Button variant="ghost" size="icon" aria-label="Back to trip"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <Images className="w-5 h-5 text-primary" />
        <h1 className="font-bold">Photos</h1>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {!data && <Skeleton className="h-48" />}
        {data?.length === 0 && <p className="text-sm text-muted-foreground">No photos yet. Photos shared in trip chat appear here, grouped by round day.</p>}
        {data?.map((album) => (
          <section key={album.title}>
            <h2 className="font-bold mb-2">{album.title} <span className="text-xs text-muted-foreground font-normal">{album.photos.length}</span></h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {album.photos.map((p) => (
                <button key={p.id} type="button" onClick={() => setOpen(p)} className="aspect-square overflow-hidden rounded-lg bg-muted focus-visible:ring-2 focus-visible:ring-primary">
                  <img src={p.url} alt={p.alt ?? "Trip photo"} loading="lazy" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </section>
        ))}
      </main>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="sr-only">Photo</DialogTitle>
          {open && <><img src={open.url} alt={open.alt ?? "Trip photo"} className="w-full max-h-[75vh] object-contain" />{open.caption && <p className="text-sm">{open.caption}</p>}</>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
