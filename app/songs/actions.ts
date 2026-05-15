"use server";

import prisma from "@/lib/db";

export async function createSong(title: string) {
  return prisma.song.create({
    data: { title },
  });
}
