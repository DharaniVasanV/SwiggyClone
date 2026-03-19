require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { initWebSocket } = require('./websocket/socket');

const authRoutes = require('./routes/auth');
const workerRoutes = require('./routes/workers');
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const deliveryRoutes = require('./routes/deliveries');
const adminRoutes = require('./routes/admin');
const trackingRoutes = require('./routes/tracking');
const restaurantRoutes = require('./routes/restaurants');
const externalRoutes = require('./routes/external');

const app = express();
const server = http.createServer(app);

initWebSocket(server);

app.use(helmet());
const frontendUrl = process.env.FRONTEND_URL ? process.env.FRONTEND_URL.replace(/\/$/, '') : null;
const allowedOrigins = [frontendUrl, 'http://localhost:3000', 'http://localhost:5173'].filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200 }));

app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

app.use('/api/auth', authRoutes);
app.use('/api/workers', workerRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/deliveries', deliveryRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/external', externalRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
module.exports = { app, server };
