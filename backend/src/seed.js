import { initializeDatabase, db, row } from "./db.js";

initializeDatabase();

const hasData = row("SELECT COUNT(*) AS total FROM users").total > 0;

if (!hasData) {
  db.exec(`
    INSERT INTO users (name, email, role) VALUES
      ('Asha Manager', 'admin@restaurant.test', 'admin'),
      ('Ravi Waiter', 'waiter@restaurant.test', 'waiter'),
      ('Meera Chef', 'chef@restaurant.test', 'chef'),
      ('Nisha Customer', 'customer@restaurant.test', 'customer');

    INSERT INTO customers (name, phone, email) VALUES
      ('Nisha Rao', '9876543210', 'nisha@example.com'),
      ('Arjun Mehta', '9988776655', 'arjun@example.com'),
      ('Priya Shah', '9123456780', 'priya@example.com'),
      ('Kabir Sen', '9001122334', 'kabir@example.com');

    INSERT INTO tables (label, capacity, zone, status) VALUES
      ('T1', 2, 'Window', 'Available'),
      ('T2', 4, 'Main Hall', 'Reserved'),
      ('T3', 4, 'Main Hall', 'Occupied'),
      ('T4', 6, 'Garden', 'Available'),
      ('T5', 8, 'Private Dining', 'Available'),
      ('T6', 2, 'Balcony', 'Cleaning');

    INSERT INTO menu_items (name, category, price, available, prep_minutes, description) VALUES
      ('Tomato Basil Soup', 'Starters', 180, 1, 8, 'Slow cooked tomato soup with basil oil.'),
      ('Paneer Tikka', 'Starters', 280, 1, 14, 'Charred cottage cheese with peppers.'),
      ('Veg Biryani', 'Mains', 340, 1, 18, 'Aromatic rice with vegetables and raita.'),
      ('Butter Chicken', 'Mains', 420, 1, 20, 'Creamy tomato gravy with grilled chicken.'),
      ('Dal Makhani', 'Mains', 300, 1, 16, 'Black lentils simmered overnight.'),
      ('Masala Chai', 'Beverages', 90, 1, 5, 'House spiced tea.'),
      ('Lime Soda', 'Beverages', 110, 1, 4, 'Fresh lime, soda, and mint.'),
      ('Gulab Jamun', 'Desserts', 160, 1, 7, 'Warm milk dumplings with syrup.'),
      ('Chocolate Brownie', 'Desserts', 220, 0, 9, 'Unavailable today.');

    INSERT INTO reservations
      (customer_id, table_id, party_size, reservation_date, reservation_time, status, notes)
    VALUES
      (1, 2, 4, date('now'), '19:30', 'Confirmed', 'Birthday dinner'),
      (2, 4, 5, date('now'), '20:00', 'Pending', 'Prefers outdoor seating'),
      (3, 1, 2, date('now', '+1 day'), '13:00', 'Confirmed', '');

    INSERT INTO orders
      (customer_id, reservation_id, table_id, waiter_id, status, payment_status, notes)
    VALUES
      (1, 1, 2, 2, 'Preparing', 'Unpaid', 'Serve soup first'),
      (3, NULL, 3, 2, 'Served', 'Unpaid', 'Dine-in walk-in');

    INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, notes) VALUES
      (1, 1, 2, 180, ''),
      (1, 4, 2, 420, 'Medium spice'),
      (1, 8, 2, 160, ''),
      (2, 2, 1, 280, ''),
      (2, 3, 2, 340, ''),
      (2, 6, 2, 90, '');
  `);
}

console.log(hasData ? "Database already seeded." : "Database seeded successfully.");
