require('dotenv').config()
const { query } = require('./db')
const bcrypt = require('bcryptjs')

const seed = async () => {
  console.log('Seeding database...')

  const hash = await bcrypt.hash('admin123', 10)
  const workerHash = await bcrypt.hash('worker123', 10)
  const userHash = await bcrypt.hash('user123', 10)

  // Demo users
  await query(`
    INSERT INTO users (name, email, phone, password_hash, role, is_verified) VALUES
    ('Admin User', 'admin@swiggy.com', '+919000000001', '${hash}', 'admin', true),
    ('Ravi Kumar', 'worker@swiggy.com', '+919000000002', '${workerHash}', 'worker', true),
    ('Meena Patel', 'meena@swiggy.com', '+919000000003', '${workerHash}', 'worker', true),
    ('Arjun Singh', 'arjun@swiggy.com', '+919000000004', '${workerHash}', 'worker', true),
    ('John Customer', 'user@swiggy.com', '+919000000005', '${userHash}', 'customer', true)
    ON CONFLICT (email) DO NOTHING
  `)

  // Worker profiles
  const workers = await query(`SELECT id FROM users WHERE role='worker' ORDER BY created_at`)
  for (const [i, w] of workers.rows.entries()) {
    const vehicles = ['motorcycle', 'scooter', 'motorcycle']
    await query(`
      INSERT INTO worker_profiles (user_id, vehicle_type, id_proof_type, platform_experience_years, verification_status, current_status, rating, total_deliveries)
      VALUES ($1,$2,'aadhar',$3,'verified','available',${4.5 + i * 0.1},${200 + i * 50})
      ON CONFLICT (user_id) DO NOTHING
    `, [w.id, vehicles[i], i + 1])
  }

  // Restaurants
  await query(`
    INSERT INTO restaurants (name, cuisine_type, address, lat, lng, zone, rating) VALUES
    ('Domino''s Pizza', 'Pizza, Italian', '123 MG Road, Chennai', 13.0827, 80.2707, 'Zone A', 4.5),
    ('Biryani Blues', 'Biryani, North Indian', '45 Anna Nagar, Chennai', 13.0900, 80.2100, 'Zone B', 4.3),
    ('McDonald''s', 'Burgers, Fast Food', '78 T Nagar, Chennai', 13.0400, 80.2341, 'Zone A', 4.1),
    ('Saravana Bhavan', 'South Indian', '12 Adyar, Chennai', 13.0067, 80.2556, 'Zone C', 4.6),
    ('Wow! Momo', 'Chinese, Momos', '56 Velachery, Chennai', 12.9789, 80.2209, 'Zone B', 4.2),
    ('KFC', 'Chicken, Fast Food', '90 OMR, Chennai', 12.9500, 80.2403, 'Zone C', 4.3)
    ON CONFLICT DO NOTHING
  `)

  // Menu items for first restaurant
  const rest = await query(`SELECT id FROM restaurants WHERE name='Domino''s Pizza' LIMIT 1`)
  if (rest.rows.length) {
    const rid = rest.rows[0].id
    await query(`
      INSERT INTO menu_items (restaurant_id, name, description, price, category) VALUES
      ('${rid}','Margherita Pizza','Classic tomato sauce, mozzarella',249,'Best Sellers'),
      ('${rid}','Farmhouse Pizza','Capsicum, onion, tomato, mushroom',329,'Best Sellers'),
      ('${rid}','Peppy Paneer','Paneer, capsicum, red paprika',369,'Veg Pizzas'),
      ('${rid}','Chicken Dominator','Double chicken sausage',499,'Non-Veg Pizzas'),
      ('${rid}','Garlic Bread','Crispy with herb butter',99,'Sides'),
      ('${rid}','Coke 750ml','Chilled Coca-Cola',69,'Beverages')
      ON CONFLICT DO NOTHING
    `)
  }

  // Delivery zones
  await query(`
    INSERT INTO delivery_zones (zone_name, city, center_lat, center_lng, radius_km) VALUES
    ('Zone A', 'Chennai', 13.0827, 80.2707, 5),
    ('Zone B', 'Chennai', 13.0900, 80.2100, 5),
    ('Zone C', 'Chennai', 13.0067, 80.2556, 5)
    ON CONFLICT (zone_name) DO NOTHING
  `)

  console.log('Seed complete! Demo logins:')
  console.log('  Admin:    admin@swiggy.com / admin123')
  console.log('  Worker:   worker@swiggy.com / worker123')
  console.log('  Customer: user@swiggy.com / user123')
  process.exit(0)
}

seed().catch((err) => { console.error('Seed failed:', err); process.exit(1) })
