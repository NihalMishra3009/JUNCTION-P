import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getCurrentProfile, getCurrentPartnerRestaurants } from "@/services/authService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getCurrentProfile();
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const memberships = await getCurrentPartnerRestaurants(profile.id);

    return NextResponse.json({
      success: true,
      profile,
      memberships,
      isOrganizer: profile.role === "ORGANIZER",
      isRestaurantPartner: profile.role === "RESTAURANT_PARTNER" || memberships.length > 0,
    });
  } catch (error) {
    console.error("Error in /api/auth/me:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
