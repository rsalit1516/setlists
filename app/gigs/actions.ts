import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function updateGig(prevState: any, formData: FormData) {
  try {
    const gigId = formData.get("gigId") as string;
    const amountPaid = parseFloat(formData.get("amountPaid") as string);
    const paidAtRaw = formData.get("paidAt") as string | null;
    const tipsRaw = formData.get("tips") as string | null;
    const otherRevenueRaw = formData.get("otherRevenue") as string | null;

    const data: any = {
      amountPaid,
    };

    if (paidAtRaw) {
      data.paidAt = new Date(paidAtRaw);
    } else {
      data.paidAt = null;
    }

    if (tipsRaw) {
      const tips = parseFloat(tipsRaw);
      data.tips = isNaN(tips) ? 0 : tips;
    } else {
      data.tips = 0;
    }

    if (otherRevenueRaw) {
      const other = parseFloat(otherRevenueRaw);
      data.otherRevenue = isNaN(other) ? 0 : other;
    } else {
      data.otherRevenue = 0;
    }

    await prisma.gig.update({
      where: { id: gigId },
      data,
    });

    // Revalidate the gig page so UI reflects changes
    revalidatePath(`/gigs/${gigId}`);

    return { success: true };
  } catch (error: any) {
    console.error("Failed to update gig:", error);
    return { error: error.message ?? "Failed to update gig" };
  }
}
