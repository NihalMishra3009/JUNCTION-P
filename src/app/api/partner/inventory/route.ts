import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getProfileByClerkId,
  checkRestaurantAccess,
  updateRestaurantInventoryInDb,
} from "@/services/authService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfileByClerkId(userId);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await req.json();
    const {
      restaurantId,
      availableTables,
      availableCovers,
      expectedCovers,
      outOfOrderTables,
      notes,
    } = body;

    if (!restaurantId) {
      return NextResponse.json(
        { error: "Missing mandatory restaurantId field." },
        { status: 400 }
      );
    }

    // Role & Scoped Access check:
    // Organizers have broad access; Restaurant Partners must have a membership for this restaurant
    if (profile.role !== "ORGANIZER") {
      const membership = await checkRestaurantAccess(profile.id, restaurantId);
      if (!membership && profile.role !== "RESTAURANT_PARTNER") {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to manage this restaurant." },
          { status: 403 }
        );
      }
    }

    // Update in PostgreSQL database
    const inventoryRecord = await updateRestaurantInventoryInDb(restaurantId, profile.id, {
      availableTables: Number(availableTables) || 0,
      availableCovers: Number(availableCovers) || 0,
      expectedCovers: Number(expectedCovers) || 0,
      outOfOrderTables: Number(outOfOrderTables) || 0,
      notes: notes || undefined,
    });

    return NextResponse.json({
      success: true,
      message: "Restaurant inventory updated successfully.",
      inventoryRecord,
    });
  } catch (error) {
    console.error("Error in /api/partner/inventory:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
