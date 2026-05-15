import prisma from "@/lib/db";

export async function getSongs() {
  return prisma.song.findMany();
}
