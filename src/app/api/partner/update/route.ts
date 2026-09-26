import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { MOCK_RESTAURANTS_BASE } from "@/data/mockRestaurants";

/**
 * POST /api/partner/update
 *
 * Updates inventory for the authenticated restaurant partner's assigned establishment (R1-R5).
 *
 * The propertyId is determined SERVER-SIDE from Clerk publicMetadata.
 * Client cannot override or spoof the propertyId.
 *
 * Body: { availableTables: number }
 *
 * Allowed establishment IDs: R1, R2, R3, R4, R5 ONLY.
 * Returns the validated update payload for the client-side AppContext to apply.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const metadata = clerkUser.publicMetadata as {
      junctionRole?: string;
      propertyId?: string;
    };

    if (metadata?.junctionRole !== "RESTAURANT_PARTNER") {
      return NextResponse.json(
        { error: "Access denied. Not a Restaurant Partner account." },
        { status: 403 }
      );
    }

    const propertyId = metadata?.propertyId;

    if (!propertyId) {
      return NextResponse.json(
        { error: "No restaurant assigned to this account." },
        { status: 404 }
      );
    }

    const VALID_RESTAURANT_IDS = ["R1", "R2", "R3", "R4", "R5"];
    if (!VALID_RESTAURANT_IDS.includes(propertyId)) {
      return NextResponse.json(
        {
          error: `Property ID '${propertyId}' is not a valid Restaurant Partner establishment. Allowed: R1–R5.`,
        },
        { status: 400 }
      );
    }

    const restaurant = MOCK_RESTAURANTS_BASE.find((r) => r.id === propertyId);
    if (!restaurant) {
      return NextResponse.json({ error: "Restaurant not found in registry" }, { status: 404 });
    }

    const body = await req.json();
    const availableTables = Number(body.availableTables);

    if (isNaN(availableTables) || availableTables < 0) {
      return NextResponse.json({ error: "availableTables must be a non-negative number" }, { status: 400 });
    }

    const maxTables = Math.ceil(restaurant.capacity / 4);
    if (availableTables > maxTables + 10) {
      return NextResponse.json(
        { error: `availableTables (${availableTables}) exceeds maximum table capacity for ${restaurant.name}.` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      propertyType: "RESTAURANT",
      propertyId,
      restaurantName: restaurant.name,
      update: {
        restaurantId: propertyId,
        availableTables,
      },
      reportedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in /api/partner/update:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

