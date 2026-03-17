require('dotenv').config();
const { query } = require('./db');

const migrate = async () => {
  console.log('Running migrations...');

  await query(`
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      phone VARCHAR(20) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('customer', 'worker', 'admin')),
      is_verified BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      profile_photo VARCHAR(255),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS otp_codes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      phone VARCHAR(20) NOT NULL,
      code VARCHAR(6) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS worker_profiles (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      vehicle_type VARCHAR(30) CHECK (vehicle_type IN ('motorcycle','scooter','bicycle','car','on_foot')),
      vehicle_number VARCHAR(20),
      id_proof_url VARCHAR(255),
      id_proof_type VARCHAR(30),
      selfie_url VARCHAR(255),
      platform_experience_years INT DEFAULT 0,
      verification_status VARCHAR(20) DEFAULT 'pending' CHECK (verification_status IN ('pending','verified','rejected','suspended')),
      verified_at TIMESTAMP,
      verified_by UUID REFERENCES users(id),
      current_status VARCHAR(20) DEFAULT 'offline' CHECK (current_status IN ('available','delivering','offline')),
      current_lat DECIMAL(10,8),
      current_lng DECIMAL(11,8),
      last_location_update TIMESTAMP,
      rating DECIMAL(3,2) DEFAULT 5.00,
      total_deliveries INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS restaurants (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name VARCHAR(150) NOT NULL,
      cuisine_type VARCHAR(50),
      address TEXT NOT NULL,
      lat DECIMAL(10,8) NOT NULL,
      lng DECIMAL(11,8) NOT NULL,
      zone VARCHAR(50),
      rating DECIMAL(3,2) DEFAULT 4.00,
      image_url VARCHAR(255),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
      name VARCHAR(150) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      category VARCHAR(50),
      is_veg BOOLEAN DEFAULT TRUE,
      image_url VARCHAR(255),
      is_available BOOLEAN DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      order_number VARCHAR(20) UNIQUE NOT NULL,
      customer_id UUID REFERENCES users(id),
      restaurant_id UUID REFERENCES restaurants(id),
      worker_id UUID REFERENCES users(id),
      status VARCHAR(30) DEFAULT 'placed' CHECK (status IN (
        'placed','confirmed','preparing','ready',
        'assigned','picked_up','delivering','delivered','failed','cancelled'
      )),
      pickup_address TEXT NOT NULL,
      pickup_lat DECIMAL(10,8) NOT NULL,
      pickup_lng DECIMAL(11,8) NOT NULL,
      delivery_address TEXT NOT NULL,
      delivery_lat DECIMAL(10,8) NOT NULL,
      delivery_lng DECIMAL(11,8) NOT NULL,
      delivery_zone VARCHAR(50),
      subtotal DECIMAL(10,2) NOT NULL,
      delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 30.00,
      total_amount DECIMAL(10,2) NOT NULL,
      worker_earning DECIMAL(10,2),
      estimated_distance_km DECIMAL(8,3),
      actual_distance_km DECIMAL(8,3),
      estimated_duration_min INT,
      actual_duration_min INT,
      assigned_at TIMESTAMP,
      picked_up_at TIMESTAMP,
      delivered_at TIMESTAMP,
      failure_reason VARCHAR(100),
      failure_location_lat DECIMAL(10,8),
      failure_location_lng DECIMAL(11,8),
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id UUID REFERENCES menu_items(id),
      name VARCHAR(150),
      quantity INT NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      total_price DECIMAL(10,2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS gps_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
      worker_id UUID REFERENCES users(id),
      lat DECIMAL(10,8) NOT NULL,
      lng DECIMAL(11,8) NOT NULL,
      speed_kmh DECIMAL(6,2),
      heading DECIMAL(5,2),
      accuracy_meters DECIMAL(8,2),
      recorded_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS environmental_logs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
      worker_id UUID REFERENCES users(id),
      lat DECIMAL(10,8),
      lng DECIMAL(11,8),
      temperature_celsius DECIMAL(5,2),
      feels_like_celsius DECIMAL(5,2),
      humidity_percent INT,
      rainfall_mm_per_hour DECIMAL(8,3),
      wind_speed_kmh DECIMAL(6,2),
      wind_direction VARCHAR(10),
      weather_condition VARCHAR(100),
      weather_description VARCHAR(200),
      aqi INT,
      aqi_category VARCHAR(30),
      pm25 DECIMAL(8,3),
      pm10 DECIMAL(8,3),
      visibility_km DECIMAL(6,2),
      cloud_cover_percent INT,
      recorded_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS delivery_failures (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      order_id UUID REFERENCES orders(id),
      worker_id UUID REFERENCES users(id),
      reason VARCHAR(100) NOT NULL CHECK (reason IN (
        'heavy_rainfall','flood','air_pollution','road_blockage',
        'natural_disaster','accident','vehicle_breakdown',
        'customer_unavailable','other'
      )),
      description TEXT,
      worker_lat_at_failure DECIMAL(10,8),
      worker_lng_at_failure DECIMAL(11,8),
      worker_lat_at_assignment DECIMAL(10,8),
      worker_lng_at_assignment DECIMAL(11,8),
      aqi_at_failure INT,
      rainfall_at_failure DECIMAL(8,3),
      weather_at_failure VARCHAR(100),
      reported_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS worker_earnings (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      worker_id UUID REFERENCES users(id),
      order_id UUID REFERENCES orders(id),
      base_earning DECIMAL(10,2) NOT NULL,
      tip_amount DECIMAL(10,2) DEFAULT 0,
      bonus_amount DECIMAL(10,2) DEFAULT 0,
      total_earning DECIMAL(10,2) NOT NULL,
      distance_km DECIMAL(8,3),
      duration_min INT,
      earned_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS delivery_zones (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      zone_name VARCHAR(50) UNIQUE NOT NULL,
      city VARCHAR(100),
      center_lat DECIMAL(10,8),
      center_lng DECIMAL(11,8),
      radius_km DECIMAL(8,3),
      is_active BOOLEAN DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS worker_sessions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      worker_id UUID REFERENCES users(id),
      started_at TIMESTAMP NOT NULL,
      ended_at TIMESTAMP,
      total_orders INT DEFAULT 0,
      total_distance_km DECIMAL(8,3) DEFAULT 0,
      total_earnings DECIMAL(10,2) DEFAULT 0,
      active_minutes INT DEFAULT 0,
      idle_minutes INT DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_gps_logs_order ON gps_logs(order_id);
    CREATE INDEX IF NOT EXISTS idx_gps_logs_worker ON gps_logs(worker_id);
    CREATE INDEX IF NOT EXISTS idx_gps_logs_time ON gps_logs(recorded_at);
    CREATE INDEX IF NOT EXISTS idx_orders_worker ON orders(worker_id);
    CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_env_logs_order ON environmental_logs(order_id);
    CREATE INDEX IF NOT EXISTS idx_worker_earnings_worker ON worker_earnings(worker_id);
    CREATE INDEX IF NOT EXISTS idx_worker_earnings_date ON worker_earnings(earned_at);
  `);

  console.log('All migrations completed successfully.');
  process.exit(0);
};

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
