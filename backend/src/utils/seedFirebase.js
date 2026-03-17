const { db } = require('./firebase');
const bcrypt = require('bcryptjs');

const seedFirebase = async () => {
  console.log('Starting Firebase seeding...');

  try {
    // Seed Users
    const users = [
      {
        email: 'customer@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'John Customer',
        phone: '1234567890',
        role: 'customer',
        is_verified: true,
        created_at: new Date()
      },
      {
        email: 'worker@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Ravi Worker',
        phone: '9876543210',
        role: 'worker',
        is_verified: true,
        created_at: new Date()
      },
      {
        email: 'admin@example.com',
        password: await bcrypt.hash('password123', 10),
        name: 'Admin User',
        phone: '5555555555',
        role: 'admin',
        is_verified: true,
        created_at: new Date()
      }
    ];

    for (const user of users) {
      await db.collection('users').doc(user.email).set(user);
      console.log(`Seeded user: ${user.email}`);
    }

    // Seed Restaurants & Menu Items
    const restaurants = [
      {
        name: "Domino's Pizza",
        image_url: "https://www.dominos.co.in/assets/logo.png",
        rating: 4.4,
        delivery_time: "25-30",
        cuisine: "Pizzas, Italian",
        address: "MG Road, Bangalore",
        lat: 12.9716,
        lng: 77.5946,
        menu_items: [
          { name: "Margherita Pizza", price: 249, description: "Classic cheese pizza", category: "Pizzas", image_url: "https://images.unsplash.com/photo-1574071318508-1cdbad80ad38" },
          { name: "Farmhouse Pizza", price: 329, description: "Delightful combination of onion, capsicum, tomato & mushroom", category: "Pizzas", image_url: "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47" }
        ]
      }
    ];

    for (const resData of restaurants) {
      const { menu_items, ...rest } = resData;
      const resRef = await db.collection('restaurants').add(rest);
      console.log(`Seeded restaurant: ${rest.name}`);

      for (const item of menu_items) {
        await resRef.collection('menu_items').add(item);
      }
    }

    console.log('Firebase seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedFirebase();
