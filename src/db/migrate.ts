import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is missing in .env.local");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 5000,
  });

  console.log("🔄 Connecting to PostgreSQL database...");

  try {
    const client = await pool.connect();
    console.log("✅ Successfully connected to PostgreSQL database.");

    // 1. Create Enums if they don't exist
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('ORGANIZER', 'RESTAURANT_PARTNER', 'ATTENDEE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE membership_role AS ENUM ('OWNER', 'MANAGER', 'STAFF');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create tables
    console.log("🔄 Creating / verifying PostgreSQL tables...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clerk_user_id TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        name TEXT,
        role user_role NOT NULL DEFAULT 'ATTENDEE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Ensure columns match if table was created previously with clerk_id
    await client.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'profiles' AND column_name = 'clerk_id'
        ) THEN
          ALTER TABLE profiles RENAME COLUMN clerk_id TO clerk_user_id;
        END IF;

        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'profiles' AND column_name = 'full_name'
        ) THEN
          ALTER TABLE profiles RENAME COLUMN full_name TO name;
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        zone TEXT NOT NULL,
        cuisine TEXT,
        address TEXT,
        total_capacity INTEGER NOT NULL DEFAULT 100,
        available_covers INTEGER NOT NULL DEFAULT 50,
        expected_reservations INTEGER NOT NULL DEFAULT 0,
        price_range TEXT DEFAULT '₹₹',
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurant_memberships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        role membership_role NOT NULL DEFAULT 'STAFF',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(profile_id, restaurant_id)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurant_inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        reported_by_profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
        available_tables INTEGER NOT NULL DEFAULT 0,
        available_covers INTEGER NOT NULL DEFAULT 0,
        expected_covers INTEGER NOT NULL DEFAULT 0,
        out_of_order_tables INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log("✅ Tables created or verified.");

    // 3. Seed initial restaurants if table is empty
    const { rows: restaurantRows } = await client.query("SELECT COUNT(*) as count FROM restaurants");
    if (parseInt(restaurantRows[0].count, 10) === 0) {
      console.log("🔄 Seeding initial JUNCTION restaurant directory...");
      await client.query(`
        INSERT INTO restaurants (id, name, zone, cuisine, address, total_capacity, available_covers, expected_reservations, price_range, lat, lng)
        VALUES
          ('R1', 'Trishna', 'ZONE_A', 'Coastal Seafood', 'Kala Ghoda, Fort, Mumbai', 80, 20, 45, '₹₹₹', 18.9282, 72.8318),
          ('R2', 'Bade Miya', 'ZONE_A', 'Street & Kebabs', 'Tulloch Rd, Apollo Bandar, Colaba, Mumbai', 60, 15, 30, '₹₹', 18.9238, 72.8324),
          ('R3', 'Britannia & Co.', 'ZONE_B', 'Parsi Irani Café', 'Wakefield House, Ballard Estate, Fort, Mumbai', 120, 50, 40, '₹₹', 18.9372, 72.8396),
          ('R4', 'Café Madras', 'ZONE_C', 'South Indian', 'Bhaudaji Rd, Matunga, Mumbai', 90, 45, 20, '₹', 19.0278, 72.8556),
          ('R5', 'Shalimar Restaurant', 'ZONE_C', 'Mughlai & Kebabs', 'Vazir Building, Bhendi Bazaar, Mumbai', 150, 80, 35, '₹₹', 18.9565, 72.8335)
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log("✅ Seeded initial restaurants.");
    } else {
      console.log(`ℹ️ Restaurants table already contains ${restaurantRows[0].count} entries.`);
    }

    client.release();
    await pool.end();
    console.log("🎉 PostgreSQL migration and setup completed successfully!");
  } catch (err) {
    console.error("❌ Migration failed with error:", err);
    process.exit(1);
  }
}

runMigration();
