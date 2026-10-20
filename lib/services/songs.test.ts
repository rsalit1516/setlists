import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSongs, getSong, searchCatalog } from "./songs";

vi.mock("@/lib/db", () => ({
  default: {
    bandSong: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    song: {
      findMany: vi.fn(),
    },
  },
}));

import prisma from "@/lib/db";

const updatedAt = new Date("2026-05-01");

// The generic Song row; the band-owned fields (status, singer, keyboard) live on the BandSong.
const song = {
  id: "song-1",
  title: "Friend of the Devil",
  artist: "Grateful Dead",
  key: "G",
  durationSeconds: 270,
  bpm: 120,
  lyricsUrl: null,
  chartsUrl: null,
  lyrics: null,
  lyricsSource: null,
  lyricsSourceUrl: null,
  lyricsImportedAt: null,
  lyricsUpdatedAt: null,
  chartFileUrl: null,
  chartFileType: null,
  chartFileName: null,
  isActive: true,
  createdAt: new Date(),
  updatedAt,
  ownerBandId: null,
};

const bandSong = {
  id: "bs-1",
  status: "READY" as const,
  singer: "Alice",
  keyboardRequired: false,
  isActive: true,
  updatedAt,
};

const resolved = {
  ...song,
  id: "bs-1",
  status: "READY",
  singer: "Alice",
  keyboardRequired: false,
  genres: [],
};

const genreDead = { id: "genre-1", name: "Dead", isActive: true, createdAt: new Date(), updatedAt: new Date() };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSongs", () => {
  it("returns the band's catalog resolved to songs whose id is the BandSong id, without genres by default", async () => {
    vi.mocked(prisma.bandSong.findMany).mockResolvedValue([{ ...bandSong, song }] as never);
    const result = await getSongs("band-1");
    expect(result).toEqual([resolved]);
    expect(prisma.bandSong.findMany).toHaveBeenCalledWith({
      where: { bandId: "band-1", isActive: true, song: { isActive: true } },
      include: { song: true },
      orderBy: { song: { title: "asc" } },
    });
  });

  it("includes genres when includeGenres is true", async () => {
    vi.mocked(prisma.bandSong.findMany).mockResolvedValue([
      { ...bandSong, song: { ...song, genres: [genreDead] } },
    ] as never);
    const result = await getSongs("band-1", undefined, undefined, true);
    expect(result).toEqual([{ ...resolved, genres: [genreDead] }]);
    expect(prisma.bandSong.findMany).toHaveBeenCalledWith({
      where: { bandId: "band-1", isActive: true, song: { isActive: true } },
      include: { song: { include: { genres: true } } },
      orderBy: { song: { title: "asc" } },
    });
  });

  it("returns empty array when the band has no songs", async () => {
    vi.mocked(prisma.bandSong.findMany).mockResolvedValue([]);
    expect(await getSongs("band-1")).toEqual([]);
  });

  it("filters by the band's status when provided", async () => {
    vi.mocked(prisma.bandSong.findMany).mockResolvedValue([{ ...bandSong, song }] as never);
    await getSongs("band-1", "READY");
    expect(prisma.bandSong.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { bandId: "band-1", isActive: true, status: "READY", song: { isActive: true } },
      })
    );
  });

  it("filters by genre ids when provided, matching any of them", async () => {
    vi.mocked(prisma.bandSong.findMany).mockResolvedValue([]);
    await getSongs("band-1", undefined, ["genre-1", "genre-2"], true);
    expect(prisma.bandSong.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          bandId: "band-1",
          isActive: true,
          song: { isActive: true, genres: { some: { id: { in: ["genre-1", "genre-2"] } } } },
        },
      })
    );
  });

  it("ignores an empty genre ids array", async () => {
    vi.mocked(prisma.bandSong.findMany).mockResolvedValue([]);
    await getSongs("band-1", undefined, []);
    expect(prisma.bandSong.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { bandId: "band-1", isActive: true, song: { isActive: true } } })
    );
  });

  it("scopes to the given band, so another band's entries are never queried", async () => {
    vi.mocked(prisma.bandSong.findMany).mockResolvedValue([]);
    await getSongs("band-2");
    expect(prisma.bandSong.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ bandId: "band-2" }) })
    );
  });
});

describe("getSong", () => {
  it("returns the resolved song when found in the band, including genres", async () => {
    vi.mocked(prisma.bandSong.findFirst).mockResolvedValue({
      ...bandSong,
      song: { ...song, genres: [genreDead] },
    } as never);
    const result = await getSong("band-1", "bs-1");
    expect(result).toEqual({ ...resolved, genres: [genreDead] });
    expect(prisma.bandSong.findFirst).toHaveBeenCalledWith({
      where: { id: "bs-1", bandId: "band-1" },
      include: { song: { include: { genres: true } } },
    });
  });

  it("returns null when the song does not exist or is in another band's catalog", async () => {
    vi.mocked(prisma.bandSong.findFirst).mockResolvedValue(null);
    expect(await getSong("band-2", "bs-1")).toBeNull();
    expect(prisma.bandSong.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "bs-1", bandId: "band-2" } })
    );
  });
});

describe("searchCatalog", () => {
  const row = (overrides: Record<string, unknown> = {}) => ({
    id: "song-1",
    title: "Don't Stop Believin'",
    artist: "Journey",
    ownerBandId: null,
    bandSongs: [],
    ...overrides,
  });

  it("looks only at master songs and the band's own private songs", async () => {
    vi.mocked(prisma.song.findMany).mockResolvedValue([]);
    await searchCatalog("band-1", { title: "Don't Stop Believin'" });

    expect(prisma.song.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isActive: true,
          OR: [{ ownerBandId: null }, { ownerBandId: "band-1" }],
        }),
      })
    );
  });

  it("finds candidates by the title's longest words, case-insensitively", async () => {
    vi.mocked(prisma.song.findMany).mockResolvedValue([]);
    await searchCatalog("band-1", { title: "dont stop believin" });

    const { where } = vi.mocked(prisma.song.findMany).mock.calls[0][0] as unknown as {
      where: { AND: { OR: { title: { contains: string; mode: string } }[] }[] };
    };
    expect(where.AND[0].OR).toEqual([
      { title: { contains: "believin", mode: "insensitive" } },
      { title: { contains: "dont", mode: "insensitive" } },
      { title: { contains: "stop", mode: "insensitive" } },
    ]);
  });

  it("matches despite apostrophes and case, ranking the exact title first", async () => {
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      row({ id: "partial", title: "Stop Believin' In Me", artist: "Other" }),
      row({ id: "exact" }),
    ] as never);

    const result = await searchCatalog("band-1", { title: "dont stop believin" });

    expect(result.map((m) => m.songId)).toEqual(["exact", "partial"]);
    expect(result[0].score).toBe(1);
  });

  it("marks master and private songs, and whether the band already has them", async () => {
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      row({ id: "in-catalog", title: "Hurt", ownerBandId: null, bandSongs: [{ id: "bs-1", isActive: true }] }),
      row({ id: "removed", title: "Hurt Me", ownerBandId: null, bandSongs: [{ id: "bs-2", isActive: false }] }),
      row({ id: "private", title: "Hurt Again", ownerBandId: "band-1", bandSongs: [] }),
    ] as never);

    const result = await searchCatalog("band-1", { title: "hurt" });
    const byId = Object.fromEntries(result.map((m) => [m.songId, m]));

    expect(byId["in-catalog"]).toMatchObject({ isMaster: true, bandSongId: "bs-1", removed: false });
    expect(byId["removed"]).toMatchObject({ isMaster: true, bandSongId: null, removed: true });
    expect(byId["private"]).toMatchObject({ isMaster: false, bandSongId: null, removed: false });
  });

  it("drops candidates whose titles barely overlap with the query", async () => {
    vi.mocked(prisma.song.findMany).mockResolvedValue([
      row({ id: "weak", title: "Stop Making Sense Of Anything Else", artist: null }),
    ] as never);

    expect(await searchCatalog("band-1", { title: "stop believin wonderwall" })).toEqual([]);
  });

  it("returns nothing, without querying, for an empty or too-short title", async () => {
    expect(await searchCatalog("band-1", { title: "   " })).toEqual([]);
    expect(await searchCatalog("band-1", { title: "go" })).toEqual([]);
    expect(prisma.song.findMany).not.toHaveBeenCalled();
  });
});
