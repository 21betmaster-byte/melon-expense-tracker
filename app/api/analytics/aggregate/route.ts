/**
 * Daily business metrics aggregation endpoint.
 *
 * Computes aggregate stats from Firestore and sends them to GA4 via
 * Measurement Protocol. Protected by CRON_SECRET — Vercel Cron sends it
 * as `Authorization: Bearer <secret>`.
 *
 * Also writes a snapshot to Firestore `_analytics/{date}` for historical record.
 *
 * GET /api/analytics/aggregate
 */

import { NextResponse, type NextRequest } from "next/server";
import { getAdminFirestore } from "@/lib/firebase/admin";
import { sendServerEvent } from "@/lib/analytics/measurement-protocol";

export async function GET(req: NextRequest) {
  // Vercel Cron sends Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminFirestore();
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Total households
    const householdsSnap = await db.collection("households").count().get();
    const totalHouseholds = householdsSnap.data().count;

    // 2. Expenses in last 24h (collectionGroup query)
    const recentExpensesSnap = await db
      .collectionGroup("expenses")
      .where("date", ">=", dayAgo)
      .count()
      .get();
    const expensesLast24h = recentExpensesSnap.data().count;

    // 3. Total expenses
    const totalExpensesSnap = await db
      .collectionGroup("expenses")
      .count()
      .get();
    const totalExpenses = totalExpensesSnap.data().count;

    // 4. Active users in last 7d (distinct created_by)
    const activeUsersSnap = await db
      .collectionGroup("expenses")
      .where("date", ">=", weekAgo)
      .select("created_by")
      .get();
    const activeUsers = new Set(
      activeUsersSnap.docs
        .map((d) => d.data().created_by)
        .filter(Boolean),
    ).size;

    // 5. New households in last 7d
    const newHouseholdsSnap = await db
      .collection("households")
      .where("created_at", ">=", weekAgo)
      .count()
      .get();
    const newHouseholdsWeek = newHouseholdsSnap.data().count;

    const metrics = {
      total_households: totalHouseholds,
      expenses_last_24h: expensesLast24h,
      total_expenses: totalExpenses,
      active_users_7d: activeUsers,
      new_households_7d: newHouseholdsWeek,
    };

    // Write to Firestore for historical record
    const dateStr = now.toISOString().split("T")[0];
    await db
      .collection("_analytics")
      .doc(dateStr)
      .set({
        ...metrics,
        computed_at: now,
      });

    // Send to GA4 via Measurement Protocol
    await sendServerEvent("server-daily-aggregation", [
      {
        name: "daily_business_metrics",
        params: metrics,
      },
    ]);

    return NextResponse.json({ ok: true, date: dateStr, ...metrics });
  } catch (error) {
    console.error("[analytics/aggregate] Error:", error);
    return NextResponse.json(
      { error: "Aggregation failed" },
      { status: 500 },
    );
  }
}
