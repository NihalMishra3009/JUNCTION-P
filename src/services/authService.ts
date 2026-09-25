import { eq, and } from "drizzle-orm";
import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  profiles,
  restaurants,
  restaurantMemberships,
  restaurantInventory,
  Profile,
  Restaurant,
  RestaurantMembership,
} from "@/db/schema";

export interface UserSessionContext {
  profile: Profile;
  memberships: (RestaurantMembership & { restaurant: Restaurant })[];
  isOrganizer: boolean;
  isRestaurantPartner: boolean;
}

/**
 * Retrieves a user profile by Clerk User ID.
 */
export async function getProfileByClerkId(clerkUserId: string): Promise<Profile | null> {
  const result = await db
    .select()
    .from(profiles)
    .where(eq(profiles.clerkUserId, clerkUserId))
    .limit(1);
  return result[0] || null;
}

/**
 * Server-side helper to get or auto-provision the authenticated Clerk user's PostgreSQL profile.
 * PRESERVES existing role if profile already exists in database.
 */
export async function getCurrentProfile(
  intendedRole?: "ORGANIZER" | "RESTAURANT_PARTNER"
): Promise<Profile | null> {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  // 1. Look up existing profile in PostgreSQL
  const existing = await getProfileByClerkId(userId);
  if (existing) {
    // Preserve existing database role strictly
    return existing;
  }

  // 2. Provision new profile for first-time sign-in
  const clerkUser = await currentUser();
  const email =
    clerkUser?.emailAddresses?.[0]?.emailAddress || `${userId}@clerk.local`;
  const name = clerkUser?.fullName || clerkUser?.firstName || null;
  const initialRole = intendedRole || "ATTENDEE";

  const [newProfile] = await db
    .insert(profiles)
    .values({
      clerkUserId: userId,
      email,
      name,
      role: initialRole,
    })
    .returning();

  // If newly provisioned as RESTAURANT_PARTNER, assign default restaurant membership (R1 Trishna)
  if (initialRole === "RESTAURANT_PARTNER") {
    await db
      .insert(restaurantMemberships)
      .values({
        profileId: newProfile.id,
        restaurantId: "R1",
        role: "MANAGER",
      })
      .onConflictDoNothing();
  }

  return newProfile;
}

/**
 * Server-side guard requiring an authenticated ORGANIZER profile in PostgreSQL.
 */
export async function requireOrganizer() {
  const profile = await getCurrentProfile("ORGANIZER");

  if (!profile) {
    redirect("/login/organizer");
  }

  if (profile.role !== "ORGANIZER") {
    // If user has a different role in PostgreSQL, redirect to their authorized section
    if (profile.role === "RESTAURANT_PARTNER") {
      redirect("/partner");
    }
    redirect("/login/organizer?error=unauthorized");
  }

  return profile;
}

/**
 * Server-side guard requiring an authenticated RESTAURANT_PARTNER profile in PostgreSQL.
 */
export async function requireRestaurantPartner() {
  const profile = await getCurrentProfile("RESTAURANT_PARTNER");

  if (!profile) {
    redirect("/login/restaurant");
  }

  if (profile.role !== "RESTAURANT_PARTNER" && profile.role !== "ORGANIZER") {
    redirect("/login/restaurant?error=unauthorized");
  }

  // Fetch scoped restaurant memberships
  const memberships = await getCurrentPartnerRestaurants(profile.id);

  return {
    profile,
    memberships,
    primaryRestaurant: memberships[0]?.restaurant || null,
  };
}

/**
 * Returns all restaurants assigned to a partner profile from restaurant_memberships.
 */
export async function getCurrentPartnerRestaurants(profileId: string) {
  const rows = await db
    .select({
      membership: restaurantMemberships,
      restaurant: restaurants,
    })
    .from(restaurantMemberships)
    .innerJoin(restaurants, eq(restaurantMemberships.restaurantId, restaurants.id))
    .where(eq(restaurantMemberships.profileId, profileId));

  return rows.map(r => ({
    ...r.membership,
    restaurant: r.restaurant,
  }));
}

/**
 * Verifies if a user has access to a specific restaurant.
 */
export async function checkRestaurantAccess(
  profileId: string,
  restaurantId: string
): Promise<RestaurantMembership | null> {
  const result = await db
    .select()
    .from(restaurantMemberships)
    .where(
      and(
        eq(restaurantMemberships.profileId, profileId),
        eq(restaurantMemberships.restaurantId, restaurantId)
      )
    )
    .limit(1);

  return result[0] || null;
}

/**
 * Updates restaurant inventory and records telemetry history in PostgreSQL.
 */
export async function updateRestaurantInventoryInDb(
  restaurantId: string,
  profileId: string | null,
  data: {
    availableTables: number;
    availableCovers: number;
    expectedCovers: number;
    outOfOrderTables?: number;
    notes?: string;
  }
) {
  // 1. Insert history record
  const [inventoryLog] = await db
    .insert(restaurantInventory)
    .values({
      restaurantId,
      reportedByProfileId: profileId,
      availableTables: data.availableTables,
      availableCovers: data.availableCovers,
      expectedCovers: data.expectedCovers,
      outOfOrderTables: data.outOfOrderTables || 0,
      notes: data.notes || null,
    })
    .returning();

  // 2. Update current availability on restaurant entity
  await db
    .update(restaurants)
    .set({
      availableCovers: data.availableCovers,
      expectedReservations: data.expectedCovers,
      updatedAt: new Date(),
    })
    .where(eq(restaurants.id, restaurantId));

  return inventoryLog;
}

/**
 * Assigns a user to a restaurant with a specific membership role.
 */
export async function assignRestaurantMembership(
  profileId: string,
  restaurantId: string,
  role: "OWNER" | "MANAGER" | "STAFF" = "STAFF"
) {
  return await db
    .insert(restaurantMemberships)
    .values({
      profileId,
      restaurantId,
      role,
    })
    .onConflictDoNothing()
    .returning();
}
