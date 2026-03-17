const { db, admin } = require('./utils/firebase');
const bcrypt = require('bcryptjs');

const seed = async () => {
  try {
    console.log('Seeding Firestore...');

    // 1. Create Restaurants
    const restaurants = [
      {
        id: 'rest_1',
        name: 'Burger King',
        cuisine_type: 'Fast Food',
        address: 'MG Road, Chennai',
        lat: 13.0827,
        lng: 80.2707,
        zone: 'Chennai-Central',
        image_url: 'https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=800&q=80',
        rating: 4.2,
        is_active: true,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      },
      {
        id: 'rest_2',
        name: 'Pizza Hut',
        cuisine_type: 'Italian',
        address: 'Anna Nagar, Chennai',
        lat: 13.0850,
        lng: 80.2100,
        zone: 'Chennai-West',
        image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
        rating: 4.5,
        is_active: true,
        created_at: admin.firestore.FieldValue.serverTimestamp()
      }
    ];

    for (const r of restaurants) {
      await db.collection('restaurants').doc(r.id).set(r);
      
      // 2. Add Menu Items as subcollection
      const menuItems = [
        { name: 'Whopper', price: 199, category: 'Burgers', description: 'Flame grilled beef burger' },
        { name: 'Cheese Pizza', price: 299, category: 'Pizza', description: 'Classic mozzarella' }
      ];
      
      for (const item of menuItems) {
        await db.collection('restaurants').doc(r.id).collection('menu_items').add(item);
      }
    }

    // 3. Create Ravikumar (Worker)
    const passwordHash = await bcrypt.hash('password123', 10);
    const ravikumar = {
        name: 'Ravikumar',
        email: 'ravi@test.com',
        phone: '1234567891',
        role: 'worker',
        password_hash: passwordHash,
        is_verified: true,
        created_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('users').doc('ravi@test.com').set({ id: 'worker_ravi', ...ravikumar });
    await db.collection('worker_profiles').doc('worker_ravi').set({
        user_id: 'worker_ravi',
        vehicle_type: 'Bike',
        verification_status: 'verified',
        current_status: 'available',
        total_deliveries: 0,
        rating: 5.0,
        platform_experience_years: 2,
        current_lat: 13.0820,
        current_lng: 80.2700, // Very close to Burger King
        zone: 'Chennai-Central'
    });

    // 4. Create a Test Customer
    const customerPasswordHash = await bcrypt.hash('password123', 10);
    const testCustomer = {
        name: 'Test Customer',
        email: 'customer@test.com',
        phone: '9876543210',
        role: 'customer',
        password_hash: customerPasswordHash,
        is_verified: true,
        created_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('users').doc('customer@test.com').set({ id: 'customer_1', ...testCustomer });

    // 5. Create an Admin
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    const testAdmin = {
        name: 'Super Admin',
        email: 'admin@test.com',
        phone: '1112223334',
        role: 'admin',
        password_hash: adminPasswordHash,
        is_verified: true,
        created_at: admin.firestore.FieldValue.serverTimestamp()
    };
    await db.collection('users').doc('admin@test.com').set({ id: 'admin_1', ...testAdmin });

    console.log('Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
};

seed();
