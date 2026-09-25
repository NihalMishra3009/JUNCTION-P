import { pgTable, text, timestamp, integer, boolean, doublePrecision, uuid, pgEnum } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", [
  "ORGANIZER",
  "RESTAURANT_PARTNER",
  "ATTENDEE",
]);

export const membershipRoleEnum = pgEnum("membership_role", [
  "OWNER",
  "MANAGER",
  "STAFF",
]);

// 1. PROFILES (Linked directly to Clerk user ID)
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  name: text("name"),
  email: text("email").notNull(),
  role: userRoleEnum("role").notNull().default("ATTENDEE"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 2. RESTAURANTS
export const restaurants = pgTable("restaurants", {
  id: text("id").primaryKey(), // e.g. "R1", "R2", "R3"
  name: text("name").notNull(),
  zone: text("zone").notNull(), // e.g. "ZONE_A", "ZONE_B", "ZONE_C"
  cuisine: text("cuisine"),
  address: text("address"),
  totalCapacity: integer("total_capacity").notNull().default(100),
  availableCovers: integer("available_covers").notNull().default(50),
  expectedReservations: integer("expected_reservations").notNull().default(0),
  priceRange: text("price_range").default("₹₹"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 3. RESTAURANT MEMBERSHIPS (Scoped access for restaurant partners)
export const restaurantMemberships = pgTable("restaurant_memberships", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => profiles.id, { onDelete: "cascade" }),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  role: membershipRoleEnum("role").notNull().default("STAFF"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 4. RESTAURANT INVENTORY (Live telemetry & updates)
export const restaurantInventory = pgTable("restaurant_inventory", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  restaurantId: text("restaurant_id")
    .notNull()
    .references(() => restaurants.id, { onDelete: "cascade" }),
  reportedByProfileId: uuid("reported_by_profile_id").references(() => profiles.id, {
    onDelete: "set null",
  }),
  availableTables: integer("available_tables").notNull().default(0),
  availableCovers: integer("available_covers").notNull().default(0),
  expectedCovers: integer("expected_covers").notNull().default(0),
  outOfOrderTables: integer("out_of_order_tables").notNull().default(0),
  notes: text("notes"),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
});

// TypeScript Types
export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
export type Restaurant = typeof restaurants.$inferSelect;
export type NewRestaurant = typeof restaurants.$inferInsert;
export type RestaurantMembership = typeof restaurantMemberships.$inferSelect;
export type NewRestaurantMembership = typeof restaurantMemberships.$inferInsert;
export type RestaurantInventory = typeof restaurantInventory.$inferSelect;
export type NewRestaurantInventory = typeof restaurantInventory.$inferInsert;
