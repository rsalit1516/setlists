import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSongs, getSong } from "./songs";

vi.mock("@/lib/db", () => ({
  default: {
    bandSong: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
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
