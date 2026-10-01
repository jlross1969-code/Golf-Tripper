export type GalleryPhoto = { id: string; url: string; alt: string | null; caption: string | null; takenAt: Date; userId: number };
export type GalleryRound = { id: number; name: string; roundDate: Date };
export type GalleryAlbum = { title: string; roundId: number | null; photos: GalleryPhoto[] };

const dayKey = (date: Date) => {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
};

/** Groups photos into one album per round (matched by calendar day) plus an "Other moments" album. */
export function buildAlbums(photos: GalleryPhoto[], rounds: GalleryRound[]): GalleryAlbum[] {
  const albums: GalleryAlbum[] = [...rounds].sort((a, b) => new Date(a.roundDate).getTime() - new Date(b.roundDate).getTime())
    .map((r) => ({ title: r.name, roundId: r.id, photos: [] }));
  const other: GalleryAlbum = { title: "Other moments", roundId: null, photos: [] };
  const sortedRounds = [...rounds].sort((a, b) => new Date(a.roundDate).getTime() - new Date(b.roundDate).getTime());
  for (const photo of [...photos].sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime())) {
    const index = sortedRounds.findIndex((r) => dayKey(r.roundDate) === dayKey(photo.takenAt));
    (index >= 0 ? albums[index] : other).photos.push(photo);
  }
  return [...albums, other].filter((album) => album.photos.length > 0);
}
