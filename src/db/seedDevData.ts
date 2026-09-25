import { Pool } from "pg";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function seedDevData() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL missing");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  console.log("🔄 Seeding development data in PostgreSQL...");

  try {
    // 1. Seed/Verify Restaurant R1
    await client.query(`
      INSERT INTO restaurants (id, name, zone, cuisine, address, total_capacity, available_covers, expected_reservations, price_range, lat, lng)
      VALUES ('R1', 'Trishna', 'ZONE_A', 'Coastal Seafood', 'Kala Ghoda, Fort, Mumbai', 80, 20, 45, '₹₹₹', 18.9282, 72.8318)
      ON CONFLICT (id) DO NOTHING;
    `);

    // 2. Seed Dev Organizer Profile
    const orgRes = await client.query(`
      INSERT INTO profiles (clerk_user_id, email, name, role)
      VALUES ('clerk_dev_organizer_001', 'organizer@junction.local', 'City Command Lead', 'ORGANIZER')
      ON CONFLICT (clerk_user_id) 
      DO UPDATE SET role = 'ORGANIZER', name = 'City Command Lead'
      RETURNING id, clerk_user_id, email, name, role;
    `);
    console.log("✅ Seeded/Verified Dev Organizer:", orgRes.rows[0]);

    // 3. Seed Dev Restaurant Partner Profile
    const partnerRes = await client.query(`
      INSERT INTO profiles (clerk_user_id, email, name, role)
      VALUES ('clerk_dev_partner_001', 'manager@trishna.local', 'Trishna Operations Manager', 'RESTAURANT_PARTNER')
      ON CONFLICT (clerk_user_id)
      DO UPDATE SET role = 'RESTAURANT_PARTNER', name = 'Trishna Operations Manager'
      RETURNING id, clerk_user_id, email, name, role;
    `);
    const partnerProfile = partnerRes.rows[0];
    console.log("✅ Seeded/Verified Dev Restaurant Partner:", partnerProfile);

    // 4. Seed Restaurant Membership linking partner to R1
    const membershipRes = await client.query(`
      INSERT INTO restaurant_memberships (profile_id, restaurant_id, role)
      VALUES ($1, 'R1', 'MANAGER')
      ON CONFLICT (profile_id, restaurant_id) DO NOTHING
      RETURNING id, profile_id, restaurant_id, role;
    `, [partnerProfile.id]);

    console.log("✅ Seeded/Verified Restaurant Membership:", membershipRes.rows[0] || "Already exists");

    // 5. Seed initial inventory log
    await client.query(`
      INSERT INTO restaurant_inventory (restaurant_id, reported_by_profile_id, available_tables, available_covers, expected_covers, notes)
      VALUES ('R1', $1, 5, 20, 45, 'Initial baseline capacity')
    `, [partnerProfile.id]);

    console.log("🎉 Development test data successfully seeded in PostgreSQL!");
  } catch (err) {
    console.error("❌ Seeding dev data failed:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDevData();
