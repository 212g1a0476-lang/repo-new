import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultDataDir = join(
  process.env.LOCALAPPDATA || process.env.TEMP || join(__dirname, "..", "data"),
  "restaurant-reservation-order-system"
);
const databasePath = process.env.DATABASE_PATH || join(defaultDataDir, "restaurant.sqlite");
const dataDir = dirname(databasePath);
mkdirSync(dataDir, { recursive: true });

export const db = new DatabaseSync(databasePath);
db.exec("PRAGMA foreign_keys = ON");

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL CHECK (role IN ('admin','waiter','chef','customer'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT
    );

    CREATE TABLE IF NOT EXISTS tables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label TEXT NOT NULL UNIQUE,
      capacity INTEGER NOT NULL CHECK (capacity > 0),
      zone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Available'
        CHECK (status IN ('Available','Reserved','Occupied','Cleaning'))
    );

    CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      table_id INTEGER NOT NULL REFERENCES tables(id),
      party_size INTEGER NOT NULL CHECK (party_size > 0),
      reservation_date TEXT NOT NULL,
      reservation_time TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending'
        CHECK (status IN ('Pending','Confirmed','Seated','Completed','Cancelled')),
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL CHECK (price >= 0),
      available INTEGER NOT NULL DEFAULT 1,
      prep_minutes INTEGER NOT NULL DEFAULT 12,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER REFERENCES customers(id),
      reservation_id INTEGER REFERENCES reservations(id),
      table_id INTEGER NOT NULL REFERENCES tables(id),
      waiter_id INTEGER REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'Placed'
        CHECK (status IN ('Placed','Preparing','Served','Completed','Cancelled')),
      payment_status TEXT NOT NULL DEFAULT 'Unpaid'
        CHECK (payment_status IN ('Unpaid','Paid','Refunded')),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price REAL NOT NULL CHECK (unit_price >= 0),
      notes TEXT
    );
  `);
}

function bind(statement, method, params) {
  const prepared = db.prepare(statement);
  if (Array.isArray(params)) return prepared[method](...params);
  if (params && Object.keys(params).length) return prepared[method](params);
  return prepared[method]();
}

export function rows(statement, params = []) {
  return bind(statement, "all", params);
}

export function row(statement, params = []) {
  return bind(statement, "get", params);
}

export function run(statement, params = []) {
  return bind(statement, "run", params);
}

export function nowDate() {
  return new Date().toISOString().slice(0, 10);
}

export function money(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}
