import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { MOCK_RESTAURANTS_BASE } from "@/data/mockRestaurants";

/**
 * GET /api/partner/identity
 *
 * Reads the authenticated Clerk user's publicMetadata to determine
 * which canonical JUNCTION restaurant (R1-R5) they represent.
 *
 * Expected publicMetadata shape:
 *   {
 *     junctionRole: "RESTAURANT_PARTNER",
 *     propertyId: "R1" | "R2" | "R3" | "R4" | "R5"
 *   }
 *
 * Allowed establishment IDs: R1, R2, R3, R4, R5 ONLY.
 * Hotel IDs (H1-H5) are NOT valid Restaurant Partner establishments.
 * No automatic fallback to R1.
 */
export async function GET() {
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
      propertyType?: string;
    };

    const junctionRole = metadata?.junctionRole;
    const propertyId = metadata?.propertyId;

    const userEmail = clerkUser.emailAddresses?.[0]?.emailAddress;
    const userName = clerkUser.fullName || clerkUser.firstName || null;

    // Check 1: Handle ORGANIZER role
    if (junctionRole === "ORGANIZER") {
      return NextResponse.json(
        {
          error: "ORGANIZER_ACCOUNT",
          message: "You are logged in as an Event Organizer.",
          junctionRole: "ORGANIZER",
          isOrganizer: true,
          userEmail,
          userName,
        },
        { status: 403 }
      );
    }

    // Check 2: Check if junctionRole is set to RESTAURANT_PARTNER
    if (junctionRole !== "RESTAURANT_PARTNER") {
      return NextResponse.json(
        {
          error: "ROLE_NOT_ASSIGNED",
          message: "Your Clerk account is authenticated, but no JUNCTION role has been assigned yet.",
          junctionRole: junctionRole || null,
          userEmail,
          userName,
        },
        { status: 403 }
      );
    }

    // Check 3: Missing propertyId (No automatic fallback!)
    if (!propertyId) {
      return NextResponse.json(
        {
          error: "UNASSIGNED_PROPERTY",
          message: "Your JUNCTION restaurant access has not been assigned yet.",
          junctionRole,
          userEmail,
          userName,
        },
        { status: 404 }
      );
    }

    // Check 4: Must be in allowed restaurant list R1-R5
    const VALID_RESTAURANT_IDS = ["R1", "R2", "R3", "R4", "R5"];
    if (!VALID_RESTAURANT_IDS.includes(propertyId)) {
      return NextResponse.json(
        {
          error: "INVALID_PROPERTY_ID",
          message: `Property ID '${propertyId}' is not a valid Restaurant Partner establishment. Allowed establishments: R1 (Trishna), R2 (Bade Miya), R3 (Britannia & Co.), R4 (Café Madras), R5 (Shalimar Restaurant).`,
          propertyId,
          junctionRole,
          userEmail,
          userName,
        },
        { status: 400 }
      );
    }

    // Find canonical restaurant object
    const restaurant = MOCK_RESTAURANTS_BASE.find((r) => r.id === propertyId);
    if (!restaurant) {
      return NextResponse.json(
        {
          error: "RESTAURANT_NOT_FOUND",
          message: `Restaurant ID '${propertyId}' not found in JUNCTION data registry.`,
          propertyId,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      junctionRole: "RESTAURANT_PARTNER",
      propertyType: "RESTAURANT" as const,
      propertyId,
      establishment: restaurant,
      userEmail,
      userName,
    });
  } catch (error) {
    console.error("Error in /api/partner/identity:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Internal Server Error" },
      { status: 500 }
    );
  }
}

