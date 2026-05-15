"use server";

import prisma from "@/lib/db";

export async function createSong(data) {
  return prisma.song.create({ data });
}
