const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const app = express();

const startBorrowReminderJob = require('./jobs/borrowReminderJob');

const PORT = process.env.PORT || 5000;

/*
|--------------------------------------------------------------------------
| REQUIRED ENVIRONMENT VARIABLES
|--------------------------------------------------------------------------
*/

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is required');
}

if (
  !process.env.JWT_SECRET ||
  process.env.JWT_SECRET.length < 32
) {
  throw new Error(
    'JWT_SECRET must be set and at least 32 characters long'
  );
}

app.disable('x-powered-by');

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
*/

const allowedOrigins = [
  // Local development
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://192.168.0.187:5173',

  // Production Vercel frontend
  'https://we-share-major.vercel.app',

  // Additional origins from Render environment variable
  ...(process.env.CLIENT_URL || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
];

console.log('Allowed CORS origins:', allowedOrigins);

/*
|--------------------------------------------------------------------------
| GOOGLE SIGN-IN / COOP
|--------------------------------------------------------------------------
|
| Google Identity Services uses popup/postMessage communication.
| Allow cross-origin popups to communicate with the frontend.
|
*/

app.use((req, res, next) => {
  res.setHeader(
    'Cross-Origin-Opener-Policy',
    'same-origin-allow-popups'
  );

  next();
});

/*
|--------------------------------------------------------------------------
| CORS MIDDLEWARE
|--------------------------------------------------------------------------
*/

app.use(
  cors({
    origin: (origin, callback) => {
      // Requests without an Origin header are allowed.
      // This includes some server-to-server requests.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(
        `CORS blocked origin: ${origin}`
      );

      return callback(null, false);
    },

    methods: [
      'GET',
      'POST',
      'PUT',
      'PATCH',
      'DELETE',
      'OPTIONS'
    ],

    allowedHeaders: [
      'Content-Type',
      'Authorization'
    ],

    credentials: true,

    optionsSuccessStatus: 204
  })
);

/*
|--------------------------------------------------------------------------
| BODY PARSING
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: '25mb'
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: '25mb'
  })
);

/*
|--------------------------------------------------------------------------
| API ROUTES
|--------------------------------------------------------------------------
*/

app.use(
  '/api/auth',
  require('./routes/authRoutes')
);

app.use(
  '/api/users',
  require('./routes/userRoutes')
);

app.use(
  '/api/items',
  require('./routes/itemRoutes')
);

app.use(
  '/api/borrow',
  require('./routes/borrowRoutes')
);

app.use(
  '/api/payments',
  require('./routes/paymentRoutes')
);

app.use(
  '/api/messages',
  require('./routes/messageRoutes')
);

app.use(
  '/api/notifications',
  require('./routes/notificationRoutes')
);

app.use(
  '/api/admin',
  require('./routes/adminRoutes')
);

/*
|--------------------------------------------------------------------------
| HEALTH CHECK
|--------------------------------------------------------------------------
*/

app.get('/', (req, res) => {
  res.json({
    message: 'We Share API is running!'
  });
});

/*
|--------------------------------------------------------------------------
| 404 HANDLER
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found'
  });
});

/*
|--------------------------------------------------------------------------
| ERROR HANDLER
|--------------------------------------------------------------------------
*/

app.use((err, req, res, next) => {
  console.error(
    'Unhandled server error:',
    err
  );

  if (res.headersSent) {
    return next(err);
  }

  res.status(err.status || 500).json({
    message: 'Internal server error'
  });
});

/*
|--------------------------------------------------------------------------
| START SERVER
|--------------------------------------------------------------------------
*/

const startServer = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI
    );

    console.log(
      '✅ MongoDB Connected Successfully!'
    );

    app.listen(PORT, () => {
      console.log(
        `🚀 Server running on port ${PORT}`
      );

      startBorrowReminderJob();
    });
  } catch (err) {
    console.error(
      '❌ MongoDB Connection Error:',
      err.message
    );

    process.exit(1);
  }
};

startServer();