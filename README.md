# Swiggy Clone — Gig Worker Research Platform
### Full-stack food delivery app with AI insurance data collection

---

## What this is

A complete Swiggy clone (React + Node.js + PostgreSQL) that works exactly like Swiggy — customers order food, workers deliver, admins manage. **Under the hood**, every delivery automatically captures GPS routes, environmental data (AQI, rainfall, weather), and income stats for your AI parametric insurance project.

---

## Project Structure

```
swiggy-clone/
├── frontend/                  # React + Vite + TailwindCSS
│   └── src/
│       ├── pages/
│       │   ├── customer/      # Home, RestaurantDetail, Cart, OrderTracking
│       │   ├── worker/        # Dashboard, Orders, Earnings, Analytics
│       │   ├── admin/         # Dashboard, LiveMap, Workers, Analytics, InsuranceExport
│       │   └── auth/          # Login, Register, WorkerRegister, OtpVerify
│       ├── components/        # CustomerLayout, WorkerLayout, AdminLayout, cards
│       ├── services/          # api.js (Axios), socket.js (Socket.io)
│       └── store/             # authStore (Zustand), cartStore (Zustand)
│
├── backend/                   # Node.js + Express + Socket.io
│   └── src/
│       ├── routes/
│       │   ├── auth.js        # Login, register, OTP, worker-register
│       │   ├── orders.js      # Place, track, cancel orders
│       │   ├── workers.js     # Accept orders, GPS ping, earnings, failure report
│       │   ├── restaurants.js # Browse, search, menu
│       │   ├── admin.js       # Dashboard, worker verify, analytics
│       │   └── insurance.js   # ← YOUR AI PROJECT DATA ENDPOINTS
│       ├── services/
│       │   ├── environment.js # OpenWeatherMap + AQI fetch & store
│       │   └── orderAssignment.js # Nearest-worker algorithm (Haversine)
│       ├── websocket/
│       │   └── socket.js      # Real-time GPS tracking, order status
│       └── utils/
│           ├── db.js           # PostgreSQL pool
│           ├── migrate.js      # All table creation
│           └── seed.js         # Demo data
└── README.md
```

---

## Quick Start (5 steps)

### 1. PostgreSQL database
```bash
createdb swiggy_platform
```

### 2. Backend setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DB URL and API keys
npm run setup       # runs migrate + seed
npm run dev         # starts on :5000
```

### 3. Frontend setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev         # starts on :3000
```

### 4. Open the app
- Customer: http://localhost:3000
- Admin: http://localhost:3000/admin
- Worker: http://localhost:3000/worker

### 5. Demo logins
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@swiggy.com | admin123 |
| Worker | worker@swiggy.com | worker123 |
| Customer | user@swiggy.com | user123 |

---

## API Keys You Need

| Service | For | Get at |
|---------|-----|--------|
| OpenWeatherMap | Weather + AQI per delivery | openweathermap.org/api (free) |
| Google Maps | Live tracking map | console.cloud.google.com |
| Twilio | OTP SMS | twilio.com (free trial) |

---

## Insurance Data API (for your AI project)

All endpoints need: `Authorization: Bearer <INSURANCE_API_KEY>`
(set `INSURANCE_API_KEY` in backend `.env`)

```
GET  /api/insurance/workers              — All worker profiles + stats
GET  /api/insurance/workers/:id/stats    — Deep stats per worker (income volatility, daily earnings)
GET  /api/insurance/deliveries           — All deliveries with GPS, distance, duration, earnings
GET  /api/insurance/failures             — Failed deliveries with reason + environmental conditions
GET  /api/insurance/environment          — Weather/AQI log per delivery
GET  /api/insurance/export?format=json   — Full dataset export (JSON or CSV)
```

### Example: get all failures with AQI data
```bash
curl -H "Authorization: Bearer swiggy_insurance_secret_key_change_this" \
  http://localhost:5000/api/insurance/failures
```

### Response includes:
```json
{
  "failures": [{
    "order_id": "...",
    "worker_name": "Ravi Kumar",
    "reason": "heavy_rainfall",
    "worker_lat_at_failure": 13.0827,
    "worker_lng_at_failure": 80.2707,
    "aqi_at_failure": 185,
    "rainfall_at_failure": 42.5,
    "weather_at_failure": "Rain",
    "reported_at": "2026-03-16T14:22:00Z"
  }]
}
```

---

## Data Collected Per Delivery (Insurance Model Inputs)

| Data | Source | Table |
|------|--------|-------|
| GPS route (every 5s) | Worker mobile | `gps_logs` |
| Distance travelled | Calculated | `orders.actual_distance_km` |
| Time taken | Timestamps | `orders.actual_duration_min` |
| Worker earnings | Per order | `worker_earnings` |
| Temperature, humidity | OpenWeatherMap | `environmental_logs` |
| Rainfall mm/h | OpenWeatherMap | `environmental_logs` |
| AQI, PM2.5, PM10 | OpenWeatherMap Air | `environmental_logs` |
| Wind speed & direction | OpenWeatherMap | `environmental_logs` |
| Failure reason | Worker report | `delivery_failures` |
| Worker location at failure | GPS | `delivery_failures` |
| Daily/weekly earnings | Aggregated | `worker_earnings` |

---

## Parametric Insurance Logic

**Trigger conditions** (use from `/api/insurance/failures`):
- `rainfall_at_failure > 50mm/h` → Extreme rain event
- `aqi_at_failure > 300` → Hazardous air quality
- `reason = 'flood'` → Flood disruption

**Income baseline** (use from `/api/insurance/workers/:id/stats`):
- `daily_earnings[]` → 30-day rolling average
- `income_volatility` → Pre-calculated standard deviation
- `low_income_days` → Days earning < 50% of average

---

## Deployment

### Frontend → Vercel
```bash
cd frontend
npm run build
# Push to GitHub, connect to Vercel
# Set environment variables in Vercel dashboard
```

### Backend → Render
```bash
# Connect GitHub repo to Render
# Set environment variables in Render dashboard
# Build command: npm install
# Start command: npm start
# Add PostgreSQL addon in Render
```
