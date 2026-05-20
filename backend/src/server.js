import express from "express";
import cors from "cors";
import morgan from "morgan";
import {
  db,
  initializeDatabase,
  money,
  nowDate,
  row,
  rows,
  run
} from "./db.js";
import "./seed.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const taxRate = Number(process.env.TAX_RATE || 0.05);

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

initializeDatabase();

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

function requireFields(body, fields) {
  const missing = fields.filter((field) => body[field] === undefined || body[field] === "");
  if (missing.length) {
    const error = new Error(`Missing required field(s): ${missing.join(", ")}`);
    error.status = 400;
    throw error;
  }
}

function findOrCreateCustomer({ customer_id, customer_name, customer_phone, customer_email }) {
  if (customer_id) {
    const existing = row("SELECT * FROM customers WHERE id = ?", [customer_id]);
    if (!existing) {
      const error = new Error("Customer not found.");
      error.status = 404;
      throw error;
    }
    return existing.id;
  }

  requireFields({ customer_name, customer_phone }, ["customer_name", "customer_phone"]);
  const existing = row("SELECT id FROM customers WHERE phone = ?", [customer_phone]);
  if (existing) return existing.id;

  const result = run(
    "INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)",
    [customer_name.trim(), customer_phone.trim(), customer_email?.trim() || null]
  );
  return Number(result.lastInsertRowid);
}

function assertTableCapacity(tableId, partySize) {
  const table = row("SELECT * FROM tables WHERE id = ?", [tableId]);
  if (!table) {
    const error = new Error("Table not found.");
    error.status = 404;
    throw error;
  }
  if (Number(partySize) > Number(table.capacity)) {
    const error = new Error(`Party size exceeds ${table.label} capacity of ${table.capacity}.`);
    error.status = 400;
    throw error;
  }
  return table;
}

function assertNoReservationConflict({ table_id, reservation_date, reservation_time, exclude_id }) {
  const conflict = row(
    `SELECT id FROM reservations
     WHERE table_id = ?
       AND reservation_date = ?
       AND reservation_time = ?
       AND status IN ('Pending','Confirmed','Seated')
       AND (? IS NULL OR id != ?)`,
    [table_id, reservation_date, reservation_time, exclude_id || null, exclude_id || null]
  );
  if (conflict) {
    const error = new Error("This table is already reserved for the selected date and time.");
    error.status = 409;
    throw error;
  }
}

function getOrder(orderId) {
  const order = row(
    `SELECT o.*, c.name AS customer_name, c.phone AS customer_phone, t.label AS table_label,
            u.name AS waiter_name
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     JOIN tables t ON t.id = o.table_id
     LEFT JOIN users u ON u.id = o.waiter_id
     WHERE o.id = ?`,
    [orderId]
  );
  if (!order) return null;
  const items = rows(
    `SELECT oi.*, mi.name, mi.category
     FROM order_items oi
     JOIN menu_items mi ON mi.id = oi.menu_item_id
     WHERE oi.order_id = ?
     ORDER BY oi.id`,
    [orderId]
  );
  const subtotal = money(items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0));
  const tax = money(subtotal * taxRate);
  return { ...order, items, subtotal, tax, total: money(subtotal + tax) };
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "restaurant-system-api" });
});

app.get("/api/dashboard/summary", (_req, res) => {
  const today = nowDate();
  const stats = {
    reservationsToday: row(
      "SELECT COUNT(*) AS total FROM reservations WHERE reservation_date = ? AND status != 'Cancelled'",
      [today]
    ).total,
    activeOrders: row(
      "SELECT COUNT(*) AS total FROM orders WHERE status IN ('Placed','Preparing','Served')"
    ).total,
    availableTables: row("SELECT COUNT(*) AS total FROM tables WHERE status = 'Available'").total,
    revenueToday: money(
      row(
        `SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS total
         FROM orders o
         JOIN order_items oi ON oi.order_id = o.id
         WHERE date(o.created_at) = date('now') AND o.status = 'Completed'`
      ).total
    )
  };

  const popularItems = rows(
    `SELECT mi.name, SUM(oi.quantity) AS quantity
     FROM order_items oi
     JOIN menu_items mi ON mi.id = oi.menu_item_id
     GROUP BY mi.id
     ORDER BY quantity DESC
     LIMIT 5`
  );

  const orderStatus = rows(
    "SELECT status, COUNT(*) AS total FROM orders GROUP BY status ORDER BY status"
  );

  const upcomingReservations = rows(
    `SELECT r.*, c.name AS customer_name, c.phone AS customer_phone, t.label AS table_label
     FROM reservations r
     JOIN customers c ON c.id = r.customer_id
     JOIN tables t ON t.id = r.table_id
     WHERE r.status IN ('Pending','Confirmed')
     ORDER BY r.reservation_date, r.reservation_time
     LIMIT 6`
  );

  res.json({ stats, popularItems, orderStatus, upcomingReservations });
});

app.get("/api/tables", (_req, res) => {
  res.json(rows("SELECT * FROM tables ORDER BY label"));
});

app.put("/api/tables/:id/status", (req, res) => {
  requireFields(req.body, ["status"]);
  const allowed = ["Available", "Reserved", "Occupied", "Cleaning"];
  if (!allowed.includes(req.body.status)) {
    const error = new Error("Invalid table status.");
    error.status = 400;
    throw error;
  }
  run("UPDATE tables SET status = ? WHERE id = ?", [req.body.status, req.params.id]);
  res.json(row("SELECT * FROM tables WHERE id = ?", [req.params.id]));
});

app.get("/api/customers", (_req, res) => {
  res.json(rows("SELECT * FROM customers ORDER BY name"));
});

app.get("/api/menu-items", (_req, res) => {
  res.json(rows("SELECT * FROM menu_items ORDER BY category, name"));
});

app.post("/api/menu-items", (req, res) => {
  requireFields(req.body, ["name", "category", "price"]);
  const result = run(
    `INSERT INTO menu_items (name, category, price, available, prep_minutes, description)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      req.body.name.trim(),
      req.body.category.trim(),
      Number(req.body.price),
      req.body.available ? 1 : 0,
      Number(req.body.prep_minutes || 12),
      req.body.description?.trim() || ""
    ]
  );
  res.status(201).json(row("SELECT * FROM menu_items WHERE id = ?", [result.lastInsertRowid]));
});

app.put("/api/menu-items/:id", (req, res) => {
  requireFields(req.body, ["name", "category", "price"]);
  run(
    `UPDATE menu_items
     SET name = ?, category = ?, price = ?, available = ?, prep_minutes = ?, description = ?
     WHERE id = ?`,
    [
      req.body.name.trim(),
      req.body.category.trim(),
      Number(req.body.price),
      req.body.available ? 1 : 0,
      Number(req.body.prep_minutes || 12),
      req.body.description?.trim() || "",
      req.params.id
    ]
  );
  res.json(row("SELECT * FROM menu_items WHERE id = ?", [req.params.id]));
});

app.get("/api/reservations", (req, res) => {
  const statusFilter = req.query.status ? "WHERE r.status = ?" : "";
  const params = req.query.status ? [req.query.status] : [];
  res.json(
    rows(
      `SELECT r.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
              t.label AS table_label, t.capacity
       FROM reservations r
       JOIN customers c ON c.id = r.customer_id
       JOIN tables t ON t.id = r.table_id
       ${statusFilter}
       ORDER BY r.reservation_date, r.reservation_time`,
      params
    )
  );
});

app.post("/api/reservations", (req, res) => {
  requireFields(req.body, ["table_id", "party_size", "reservation_date", "reservation_time"]);
  assertTableCapacity(req.body.table_id, req.body.party_size);
  assertNoReservationConflict(req.body);
  const customerId = findOrCreateCustomer(req.body);
  const result = run(
    `INSERT INTO reservations
      (customer_id, table_id, party_size, reservation_date, reservation_time, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      customerId,
      req.body.table_id,
      req.body.party_size,
      req.body.reservation_date,
      req.body.reservation_time,
      req.body.status || "Pending",
      req.body.notes || ""
    ]
  );
  run("UPDATE tables SET status = 'Reserved' WHERE id = ?", [req.body.table_id]);
  res.status(201).json(row("SELECT * FROM reservations WHERE id = ?", [result.lastInsertRowid]));
});

app.put("/api/reservations/:id/status", (req, res) => {
  requireFields(req.body, ["status"]);
  const allowed = ["Pending", "Confirmed", "Seated", "Completed", "Cancelled"];
  if (!allowed.includes(req.body.status)) {
    const error = new Error("Invalid reservation status.");
    error.status = 400;
    throw error;
  }
  const reservation = row("SELECT * FROM reservations WHERE id = ?", [req.params.id]);
  if (!reservation) {
    const error = new Error("Reservation not found.");
    error.status = 404;
    throw error;
  }
  run("UPDATE reservations SET status = ? WHERE id = ?", [req.body.status, req.params.id]);
  if (req.body.status === "Seated") {
    run("UPDATE tables SET status = 'Occupied' WHERE id = ?", [reservation.table_id]);
  }
  if (["Completed", "Cancelled"].includes(req.body.status)) {
    run("UPDATE tables SET status = 'Available' WHERE id = ?", [reservation.table_id]);
  }
  res.json(row("SELECT * FROM reservations WHERE id = ?", [req.params.id]));
});

app.get("/api/orders", (req, res) => {
  const statusFilter = req.query.status ? "WHERE o.status = ?" : "";
  const params = req.query.status ? [req.query.status] : [];
  const orders = rows(
    `SELECT o.*, c.name AS customer_name, t.label AS table_label, u.name AS waiter_name
     FROM orders o
     LEFT JOIN customers c ON c.id = o.customer_id
     JOIN tables t ON t.id = o.table_id
     LEFT JOIN users u ON u.id = o.waiter_id
     ${statusFilter}
     ORDER BY o.created_at DESC`,
    params
  ).map((order) => getOrder(order.id));
  res.json(orders);
});

app.post("/api/orders", (req, res) => {
  requireFields(req.body, ["table_id", "items"]);
  if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
    const error = new Error("Order must include at least one menu item.");
    error.status = 400;
    throw error;
  }
  const customerId = findOrCreateCustomer(req.body);
  const result = db.prepare(
    `INSERT INTO orders (customer_id, reservation_id, table_id, waiter_id, status, notes)
     VALUES (?, ?, ?, ?, 'Placed', ?)`
  ).run(
    customerId,
    req.body.reservation_id || null,
    req.body.table_id,
    req.body.waiter_id || null,
    req.body.notes || ""
  );
  const orderId = Number(result.lastInsertRowid);

  const insertItem = db.prepare(
    "INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, notes) VALUES (?, ?, ?, ?, ?)"
  );
  for (const item of req.body.items) {
    const menuItem = row("SELECT * FROM menu_items WHERE id = ? AND available = 1", [item.menu_item_id]);
    if (!menuItem) {
      const error = new Error("Menu item not found or unavailable.");
      error.status = 400;
      throw error;
    }
    insertItem.run(orderId, item.menu_item_id, Number(item.quantity || 1), menuItem.price, item.notes || "");
  }

  run("UPDATE tables SET status = 'Occupied' WHERE id = ?", [req.body.table_id]);
  res.status(201).json(getOrder(orderId));
});

app.put("/api/orders/:id/status", (req, res) => {
  requireFields(req.body, ["status"]);
  const allowed = ["Placed", "Preparing", "Served", "Completed", "Cancelled"];
  if (!allowed.includes(req.body.status)) {
    const error = new Error("Invalid order status.");
    error.status = 400;
    throw error;
  }
  const existing = getOrder(req.params.id);
  if (!existing) {
    const error = new Error("Order not found.");
    error.status = 404;
    throw error;
  }
  run("UPDATE orders SET status = ? WHERE id = ?", [req.body.status, req.params.id]);
  if (["Completed", "Cancelled"].includes(req.body.status)) {
    run("UPDATE tables SET status = 'Available' WHERE id = ?", [existing.table_id]);
  }
  res.json(getOrder(req.params.id));
});

app.put("/api/orders/:id/payment", (req, res) => {
  requireFields(req.body, ["payment_status"]);
  const allowed = ["Unpaid", "Paid", "Refunded"];
  if (!allowed.includes(req.body.payment_status)) {
    const error = new Error("Invalid payment status.");
    error.status = 400;
    throw error;
  }
  run("UPDATE orders SET payment_status = ? WHERE id = ?", [req.body.payment_status, req.params.id]);
  res.json(getOrder(req.params.id));
});

app.get("/api/orders/:id/bill", (req, res) => {
  const order = getOrder(req.params.id);
  if (!order) {
    const error = new Error("Order not found.");
    error.status = 404;
    throw error;
  }
  res.json({
    restaurant: {
      name: "TableCraft Bistro",
      address: "22 Residency Road, Bengaluru",
      taxRate
    },
    order
  });
});

app.get("/api/reports/service", (_req, res) => {
  res.json({
    tableUtilization: rows(
      `SELECT t.label, t.capacity, t.status, COUNT(r.id) AS reservations
       FROM tables t
       LEFT JOIN reservations r ON r.table_id = t.id
       GROUP BY t.id
       ORDER BY t.label`
    ),
    revenueByCategory: rows(
      `SELECT mi.category, ROUND(SUM(oi.quantity * oi.unit_price), 2) AS revenue
       FROM order_items oi
       JOIN menu_items mi ON mi.id = oi.menu_item_id
       JOIN orders o ON o.id = oi.order_id
       WHERE o.status != 'Cancelled'
       GROUP BY mi.category
       ORDER BY revenue DESC`
    ),
    orderCycle: rows(
      `SELECT status, COUNT(*) AS total FROM orders GROUP BY status ORDER BY total DESC`
    )
  });
});

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  res.status(status).json({ message: error.message || "Unexpected server error." });
});

if (process.env.VERCEL !== "1") {
  app.listen(port, () => {
    console.log(`Restaurant API running at http://localhost:${port}`);
  });
}

export default app;
