# Restaurant Table Reservation & Order Management System

A full-stack restaurant operations system built from scratch with ReactJS, Node.js, Express, and SQLite.

## Features

- Admin dashboard with reservations, active orders, table availability, revenue, popular items, and upcoming bookings.
- Reservation management with customer capture, table capacity validation, conflict prevention, and status updates.
- Dine-in order placement with menu item selection, quantities, kitchen status flow, and table status updates.
- Kitchen board for Placed, Preparing, and Served tickets.
- Menu item management with categories, prices, availability, prep time, and descriptions.
- Printable itemized bills with subtotal, tax, total, and payment status.
- Reports for table utilization, revenue by category, and order cycle status.
- Seeded SQLite database for demo data.

## Tech Stack

- Frontend: ReactJS + Vite
- Backend: Node.js + Express
- Database: SQLite using Node's built-in `node:sqlite` module

## Setup

```bash
npm run install:all
npm run seed
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

Backend API runs at:

```text
http://localhost:4000
```

## Useful Commands

```bash
npm run dev          # run backend and frontend together
npm run start        # run backend only
npm run seed         # initialize demo data
npm run build        # build frontend for production
```

## Environment Variables

Backend:

```text
PORT=4000
TAX_RATE=0.05
DATABASE_PATH=C:\path\to\restaurant.sqlite
```

Frontend:

```text
VITE_API_URL=http://localhost:4000/api
```

## Deployment

- Vercel frontend config: `vercel.json`
- Render backend blueprint: `render.yaml`

After deployment, set `VITE_API_URL` in Vercel to the Render backend API URL, for example:

```text
https://restaurant-system-api.onrender.com/api
```

## API Summary

- `GET /api/dashboard/summary` - dashboard analytics.
- `GET /api/tables` - list restaurant tables.
- `PUT /api/tables/:id/status` - update table status.
- `GET /api/menu-items` - list menu items.
- `POST /api/menu-items` - create menu item.
- `PUT /api/menu-items/:id` - update menu item.
- `GET /api/reservations` - list reservations.
- `POST /api/reservations` - create reservation.
- `PUT /api/reservations/:id/status` - update reservation status.
- `GET /api/orders` - list orders with item totals.
- `POST /api/orders` - create food order.
- `PUT /api/orders/:id/status` - update order status.
- `PUT /api/orders/:id/payment` - update payment status.
- `GET /api/orders/:id/bill` - get printable bill data.
- `GET /api/reports/service` - service and revenue reports.

## Demo Users

Authentication is not required for this assignment build. Seeded role records are available for review:

- `admin@restaurant.test`
- `waiter@restaurant.test`
- `chef@restaurant.test`
- `customer@restaurant.test`

## Submission Notes

For final college submission, include:

- GitHub repository link
- Deployed application link
- 5 to 8 minute video walkthrough link

By default the app stores restaurant data in your local app data folder to avoid SQLite file-locking issues in OneDrive-synced workspaces. Set `DATABASE_PATH` if you want to place the SQLite file somewhere else.
