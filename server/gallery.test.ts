import { describe, expect, it } from "vitest";
import { buildAlbums } from "../shared/gallery";

const photo = (id: string, iso: string) => ({ id, url: `/p/${id}`, alt: null, caption: null, takenAt: new Date(iso), userId: 1 });

describe("buildAlbums", () => {
  it("groups photos by round day and keeps leftovers together", () => {
    const albums = buildAlbums(
      [photo("a", "2026-03-02T05:00:00Z"), photo("b", "2026-03-02T09:00:00Z"), photo("c", "2026-03-05T09:00:00Z")],
      [{ id: 1, name: "Day 1", roundDate: new Date("2026-03-02T00:00:00Z") }, { id: 2, name: "Day 2", roundDate: new Date("2026-03-03T00:00:00Z") }],
    );
    expect(albums.map((a) => [a.title, a.photos.length])).toEqual([["Day 1", 2], ["Other moments", 1]]);
  });
});
