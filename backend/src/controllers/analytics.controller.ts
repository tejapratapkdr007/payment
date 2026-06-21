import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";
import { ok } from "../utils/response";
import { AppError } from "../utils/AppError";
import { getTeacherAuth } from "../middleware/auth";

const overviewQuerySchema = z.object({
  collectionId: z.string().uuid().optional(),
});

export { overviewQuerySchema as analyticsOverviewQuerySchema };

/**
 * Headline numbers + chart-ready data for one collection (or, if none is
 * specified, the teacher's most recently created active collection). All
 * collection-scoped stats — students paid/pending/late, amounts, status
 * distribution — use the same per-collection grouping as
 * payments.controller's getMyPayments, so a teacher's "60/48/80%" matches
 * what students see.
 */
export const getOverview = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = getTeacherAuth(req);
  const { collectionId: requestedCollectionId } = req.query as unknown as z.infer<typeof overviewQuerySchema>;

  const collection = requestedCollectionId
    ? await prisma.collection.findFirst({ where: { id: requestedCollectionId, teacherId } })
    : await prisma.collection.findFirst({ where: { teacherId, isActive: true }, orderBy: { createdAt: "desc" } });

  if (!collection) {
    throw AppError.notFound("No collection found. Create a collection first.");
  }

  const totalStudents = await prisma.student.count({ where: { class: { teacherId } } });

  const statusCounts = await prisma.payment.groupBy({
    by: ["status"],
    where: { collectionId: collection.id },
    _count: { _all: true },
  });

  const countFor = (status: string) =>
    statusCounts.find((s) => s.status === status)?._count._all ?? 0;

  const paid = countFor("APPROVED");
  const pendingReview = countFor("PENDING");
  const pendingPayment = countFor("PENDING_PAYMENT");
  const late = countFor("LATE");
  const rejected = countFor("REJECTED");
  const reuploadRequested = countFor("REUPLOAD_REQUESTED");

  const amount = Number(collection.amount);
  const expectedAmount = totalStudents * amount;
  const receivedAmount = paid * amount;

  // Daily collection trend over the last 14 days, for a line/bar chart.
  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const approvedRecently = await prisma.payment.findMany({
    where: { collectionId: collection.id, status: "APPROVED", reviewedAt: { gte: fourteenDaysAgo } },
    select: { reviewedAt: true },
  });

  const trendMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    trendMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const p of approvedRecently) {
    if (!p.reviewedAt) continue;
    const key = p.reviewedAt.toISOString().slice(0, 10);
    if (trendMap.has(key)) trendMap.set(key, (trendMap.get(key) ?? 0) + 1);
  }

  const dailyTrend = Array.from(trendMap.entries()).map(([date, count]) => ({ date, count }));

  return ok(res, {
    collection: { id: collection.id, name: collection.name, amount },
    summary: {
      totalStudents,
      paid,
      pendingReview,
      pendingPayment,
      late,
      rejected,
      reuploadRequested,
      percentComplete: totalStudents > 0 ? Math.round((paid / totalStudents) * 100) : 0,
      expectedAmount,
      receivedAmount,
      remainingAmount: expectedAmount - receivedAmount,
    },
    charts: {
      statusDistribution: [
        { label: "Paid", value: paid },
        { label: "Pending Review", value: pendingReview },
        { label: "Not Yet Paid", value: pendingPayment },
        { label: "Late", value: late },
        { label: "Rejected", value: rejected },
        { label: "Re-upload Requested", value: reuploadRequested },
      ],
      dailyCollectionTrend: dailyTrend,
      collectionProgress: { paid, total: totalStudents },
    },
  });
});

/** Lightweight list of all collections with their paid/total counts, for a collections-overview table. */
export const listCollectionSummaries = asyncHandler(async (req: Request, res: Response) => {
  const { teacherId } = getTeacherAuth(req);
  const totalStudents = await prisma.student.count({ where: { class: { teacherId } } });

  const collections = await prisma.collection.findMany({
    where: { teacherId },
    orderBy: { createdAt: "desc" },
  });

  const results = await Promise.all(
    collections.map(async (c) => {
      const paid = await prisma.payment.count({ where: { collectionId: c.id, status: "APPROVED" } });
      return {
        id: c.id,
        name: c.name,
        amount: Number(c.amount),
        isActive: c.isActive,
        deadline: c.deadline,
        totalStudents,
        paid,
        percentComplete: totalStudents > 0 ? Math.round((paid / totalStudents) * 100) : 0,
      };
    })
  );

  return ok(res, results);
});
