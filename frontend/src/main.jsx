import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const tabs = ["Dashboard", "Reservations", "Orders", "Kitchen", "Menu", "Billing", "Reports"];
const reservationStatuses = ["Pending", "Confirmed", "Seated", "Completed", "Cancelled"];
const orderStatuses = ["Placed", "Preparing", "Served", "Completed", "Cancelled"];

async function api(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || "Request failed");
  return data;
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value || 0);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function Badge({ children, tone = "neutral" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function Empty({ title }) {
  return <div className="empty">{title}</div>;
}

function App() {
  const [activeTab, setActiveTab] = useState("Dashboard");
  const [data, setData] = useState({
    summary: null,
    tables: [],
    customers: [],
    menu: [],
    reservations: [],
    orders: [],
    reports: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [summary, tables, customers, menu, reservations, orders, reports] = await Promise.all([
        api("/dashboard/summary"),
        api("/tables"),
        api("/customers"),
        api("/menu-items"),
        api("/reservations"),
        api("/orders"),
        api("/reports/service")
      ]);
      setData({ summary, tables, customers, menu, reservations, orders, reports });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function mutate(path, body, method = "POST", message = "Saved") {
    setError("");
    setNotice("");
    try {
      await api(path, { method, body: JSON.stringify(body) });
      setNotice(message);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="app">
      <aside className="sidebar">
        <div>
          <div className="brand">TableCraft</div>
          <div className="subtle">Bistro operations</div>
        </div>
        <nav>
          {tabs.map((tab) => (
            <button
              key={tab}
              className={activeTab === tab ? "active" : ""}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <h1>{activeTab}</h1>
            <p>{activeTab === "Dashboard" ? "Live reservations, kitchen load, tables, and revenue." : "Manage restaurant service from one workspace."}</p>
          </div>
          <button className="iconButton" onClick={load} aria-label="Refresh data">Refresh</button>
        </header>

        {error && <div className="alert error">{error}</div>}
        {notice && <div className="alert success">{notice}</div>}
        {loading ? (
          <div className="loading">Loading restaurant data...</div>
        ) : (
          <>
            {activeTab === "Dashboard" && <Dashboard data={data} />}
            {activeTab === "Reservations" && <Reservations data={data} mutate={mutate} />}
            {activeTab === "Orders" && <Orders data={data} mutate={mutate} />}
            {activeTab === "Kitchen" && <Kitchen orders={data.orders} mutate={mutate} />}
            {activeTab === "Menu" && <Menu menu={data.menu} mutate={mutate} />}
            {activeTab === "Billing" && <Billing orders={data.orders} mutate={mutate} />}
            {activeTab === "Reports" && <Reports reports={data.reports} />}
          </>
        )}
      </main>
    </div>
  );
}

function Dashboard({ data }) {
  const stats = data.summary?.stats || {};
  return (
    <section className="stack">
      <div className="statsGrid">
        <Metric label="Reservations Today" value={stats.reservationsToday} />
        <Metric label="Active Orders" value={stats.activeOrders} />
        <Metric label="Available Tables" value={stats.availableTables} />
        <Metric label="Completed Revenue" value={formatMoney(stats.revenueToday)} />
      </div>
      <div className="split">
        <Panel title="Upcoming Reservations">
          {data.summary.upcomingReservations.length ? data.summary.upcomingReservations.map((reservation) => (
            <div className="rowItem" key={reservation.id}>
              <div>
                <strong>{reservation.customer_name}</strong>
                <span>{reservation.reservation_date} at {reservation.reservation_time} · {reservation.table_label}</span>
              </div>
              <Badge tone={reservation.status.toLowerCase()}>{reservation.status}</Badge>
            </div>
          )) : <Empty title="No upcoming reservations" />}
        </Panel>
        <Panel title="Popular Items">
          {data.summary.popularItems.length ? data.summary.popularItems.map((item) => (
            <div className="rowItem" key={item.name}>
              <div><strong>{item.name}</strong><span>{item.quantity} ordered</span></div>
            </div>
          )) : <Empty title="No item sales yet" />}
        </Panel>
      </div>
      <Panel title="Table Floor">
        <div className="tableGrid">
          {data.tables.map((table) => (
            <div className={`tableTile ${table.status.toLowerCase()}`} key={table.id}>
              <strong>{table.label}</strong>
              <span>{table.zone}</span>
              <Badge>{table.capacity} seats</Badge>
              <Badge tone={table.status.toLowerCase()}>{table.status}</Badge>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value ?? 0}</strong>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function Reservations({ data, mutate }) {
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    table_id: data.tables.find((table) => table.status !== "Occupied")?.id || "",
    party_size: 2,
    reservation_date: today(),
    reservation_time: "19:00",
    status: "Pending",
    notes: ""
  });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <section className="workGrid">
      <Panel title="Create Reservation">
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault();
            mutate("/reservations", form, "POST", "Reservation created");
          }}
        >
          <input required placeholder="Customer name" value={form.customer_name} onChange={(e) => update("customer_name", e.target.value)} />
          <input required placeholder="Phone" value={form.customer_phone} onChange={(e) => update("customer_phone", e.target.value)} />
          <input placeholder="Email" value={form.customer_email} onChange={(e) => update("customer_email", e.target.value)} />
          <select required value={form.table_id} onChange={(e) => update("table_id", e.target.value)}>
            <option value="">Select table</option>
            {data.tables.map((table) => <option key={table.id} value={table.id}>{table.label} · {table.capacity} seats · {table.status}</option>)}
          </select>
          <input required type="number" min="1" value={form.party_size} onChange={(e) => update("party_size", e.target.value)} />
          <input required type="date" value={form.reservation_date} onChange={(e) => update("reservation_date", e.target.value)} />
          <input required type="time" value={form.reservation_time} onChange={(e) => update("reservation_time", e.target.value)} />
          <select value={form.status} onChange={(e) => update("status", e.target.value)}>
            {reservationStatuses.map((status) => <option key={status}>{status}</option>)}
          </select>
          <textarea placeholder="Notes" value={form.notes} onChange={(e) => update("notes", e.target.value)} />
          <button type="submit">Book Table</button>
        </form>
      </Panel>
      <Panel title="Reservation List">
        <div className="list">
          {data.reservations.map((reservation) => (
            <div className="record" key={reservation.id}>
              <div>
                <strong>{reservation.customer_name}</strong>
                <span>{reservation.reservation_date} · {reservation.reservation_time} · {reservation.table_label} · {reservation.party_size} guests</span>
              </div>
              <div className="actions">
                <Badge tone={reservation.status.toLowerCase()}>{reservation.status}</Badge>
                <select
                  value={reservation.status}
                  onChange={(e) => mutate(`/reservations/${reservation.id}/status`, { status: e.target.value }, "PUT", "Reservation updated")}
                >
                  {reservationStatuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function Orders({ data, mutate }) {
  const availableMenu = data.menu.filter((item) => item.available);
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    table_id: data.tables.find((table) => table.status !== "Cleaning")?.id || "",
    waiter_id: 2,
    notes: "",
    items: availableMenu.slice(0, 2).map((item) => ({ menu_item_id: item.id, quantity: 1 }))
  });

  function updateItem(index, field, value) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item)
    }));
  }

  return (
    <section className="workGrid">
      <Panel title="Place Dine-In Order">
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault();
            mutate("/orders", form, "POST", "Order placed");
          }}
        >
          <input required placeholder="Customer name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          <input required placeholder="Phone" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
          <select required value={form.table_id} onChange={(e) => setForm({ ...form, table_id: e.target.value })}>
            <option value="">Select table</option>
            {data.tables.map((table) => <option key={table.id} value={table.id}>{table.label} · {table.status}</option>)}
          </select>
          {form.items.map((item, index) => (
            <div className="lineControls" key={index}>
              <select value={item.menu_item_id} onChange={(e) => updateItem(index, "menu_item_id", Number(e.target.value))}>
                {availableMenu.map((menuItem) => <option key={menuItem.id} value={menuItem.id}>{menuItem.name} · {formatMoney(menuItem.price)}</option>)}
              </select>
              <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(index, "quantity", Number(e.target.value))} />
            </div>
          ))}
          <button type="button" className="secondary" onClick={() => setForm({ ...form, items: [...form.items, { menu_item_id: availableMenu[0]?.id, quantity: 1 }] })}>Add Item</button>
          <textarea placeholder="Order notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button type="submit">Send to Kitchen</button>
        </form>
      </Panel>
      <OrderList orders={data.orders} mutate={mutate} />
    </section>
  );
}

function OrderList({ orders, mutate }) {
  return (
    <Panel title="Orders">
      <div className="list">
        {orders.map((order) => (
          <div className="record" key={order.id}>
            <div>
              <strong>Order #{order.id} · {order.table_label}</strong>
              <span>{order.customer_name || "Walk-in"} · {order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}</span>
              <span>{formatMoney(order.total)} · {order.payment_status}</span>
            </div>
            <div className="actions">
              <Badge tone={order.status.toLowerCase()}>{order.status}</Badge>
              <select
                value={order.status}
                onChange={(e) => mutate(`/orders/${order.id}/status`, { status: e.target.value }, "PUT", "Order updated")}
              >
                {orderStatuses.map((status) => <option key={status}>{status}</option>)}
              </select>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Kitchen({ orders, mutate }) {
  const kitchenOrders = orders.filter((order) => ["Placed", "Preparing", "Served"].includes(order.status));
  return (
    <section className="kitchenBoard">
      {["Placed", "Preparing", "Served"].map((status) => (
        <Panel title={status} key={status}>
          {kitchenOrders.filter((order) => order.status === status).map((order) => (
            <div className="ticket" key={order.id}>
              <strong>#{order.id} · {order.table_label}</strong>
              {order.items.map((item) => <span key={item.id}>{item.quantity}x {item.name}</span>)}
              <button onClick={() => {
                const next = status === "Placed" ? "Preparing" : status === "Preparing" ? "Served" : "Completed";
                mutate(`/orders/${order.id}/status`, { status: next }, "PUT", `Order moved to ${next}`);
              }}>
                Advance
              </button>
            </div>
          ))}
          {!kitchenOrders.some((order) => order.status === status) && <Empty title="No tickets" />}
        </Panel>
      ))}
    </section>
  );
}

function Menu({ menu, mutate }) {
  const blank = { name: "", category: "Mains", price: 0, prep_minutes: 12, available: true, description: "" };
  const [form, setForm] = useState(blank);
  const categories = useMemo(() => [...new Set(menu.map((item) => item.category))], [menu]);

  return (
    <section className="workGrid">
      <Panel title="Add Menu Item">
        <form
          className="form"
          onSubmit={(event) => {
            event.preventDefault();
            mutate("/menu-items", form, "POST", "Menu item added");
            setForm(blank);
          }}
        >
          <input required placeholder="Item name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {[...new Set(["Starters", "Mains", "Beverages", "Desserts", ...categories])].map((category) => <option key={category}>{category}</option>)}
          </select>
          <input required type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          <input type="number" min="1" value={form.prep_minutes} onChange={(e) => setForm({ ...form, prep_minutes: Number(e.target.value) })} />
          <label className="check"><input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} /> Available</label>
          <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <button>Add Item</button>
        </form>
      </Panel>
      <Panel title="Current Menu">
        <div className="menuGrid">
          {menu.map((item) => (
            <article className="menuCard" key={item.id}>
              <div>
                <strong>{item.name}</strong>
                <span>{item.category} · {item.prep_minutes} min</span>
              </div>
              <div>
                <strong>{formatMoney(item.price)}</strong>
                <Badge tone={item.available ? "available" : "cancelled"}>{item.available ? "Available" : "Hidden"}</Badge>
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </section>
  );
}

function Billing({ orders, mutate }) {
  const billable = orders.filter((order) => order.status !== "Cancelled");
  return (
    <section className="stack">
      {billable.map((order) => (
        <Panel title={`Bill #${order.id}`} key={order.id}>
          <div className="bill">
            <div className="rowItem">
              <div>
                <strong>{order.customer_name || "Walk-in customer"}</strong>
                <span>{order.table_label} · {order.status}</span>
              </div>
              <Badge tone={order.payment_status === "Paid" ? "available" : "pending"}>{order.payment_status}</Badge>
            </div>
            {order.items.map((item) => (
              <div className="billLine" key={item.id}>
                <span>{item.quantity} x {item.name}</span>
                <strong>{formatMoney(item.quantity * item.unit_price)}</strong>
              </div>
            ))}
            <div className="totals">
              <span>Subtotal {formatMoney(order.subtotal)}</span>
              <span>Tax {formatMoney(order.tax)}</span>
              <strong>Total {formatMoney(order.total)}</strong>
            </div>
            <div className="actions">
              <button onClick={() => window.print()}>Print</button>
              <button
                className="secondary"
                onClick={() => mutate(`/orders/${order.id}/payment`, { payment_status: "Paid" }, "PUT", "Payment marked paid")}
              >
                Mark Paid
              </button>
            </div>
          </div>
        </Panel>
      ))}
      {!billable.length && <Empty title="No bills to show" />}
    </section>
  );
}

function Reports({ reports }) {
  return (
    <section className="split">
      <Panel title="Table Utilization">
        {reports.tableUtilization.map((table) => (
          <div className="rowItem" key={table.label}>
            <div><strong>{table.label}</strong><span>{table.capacity} seats · {table.reservations} reservations</span></div>
            <Badge tone={table.status.toLowerCase()}>{table.status}</Badge>
          </div>
        ))}
      </Panel>
      <Panel title="Revenue by Category">
        {reports.revenueByCategory.map((category) => (
          <div className="rowItem" key={category.category}>
            <div><strong>{category.category}</strong><span>{formatMoney(category.revenue)}</span></div>
          </div>
        ))}
      </Panel>
      <Panel title="Order Cycle">
        {reports.orderCycle.map((cycle) => (
          <div className="rowItem" key={cycle.status}>
            <div><strong>{cycle.status}</strong><span>{cycle.total} orders</span></div>
          </div>
        ))}
      </Panel>
    </section>
  );
}

createRoot(document.getElementById("root")).render(<App />);
