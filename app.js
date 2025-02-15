const path = require('path');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController');
const viewRouter = require('./routes/viewRoutes');

const app = express();

// using this, the header req.headers['x-forwarded-proto'] will be correctly set and req.ip will show the client's real IP address instead of the proxy server's IP
// app.enable('trust proxy');
app.set('trust proxy', process.NODE_ENV === 'production');

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views')); // using path.join to avoid potential pugs like not providing the '/'

// 1) GLOBAL MIDDLEWARES

// Implement CORS
// this wll work only for simple requests (GET, POST with basic headers)
app.use(cors());
// Access-Control-Allow-Origin *

// for non-simple requests (PUT, PATCH, DELETE requests, requests that send cookies or use nonstandered headers) require a preflight phase
// before the real request happens, the browswer first does an options request in order to figure out if the actual request is safe to send
app.options('*', cors());

// Serving static files
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://js.stripe.com'],
        frameSrc: ['https://js.stripe.com'],
        connectSrc: ["'self'", 'https://api.stripe.com'],
        imgSrc: ["'self'", 'data:', '*.cartocdn.com', '*.cloudinary.com'],
      },
    },
  }),
);

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Limit requests from same IP
// (try to prevent DOS and Brute Force Attacks)
const limiter = rateLimit({
  max: 100, // 100 request from the same IP
  windowMs: 60 * 60 * 1000, // per hour
  message: 'Too many requests from this IP, please try again in an hour',
  validate: { xForwardedForHeader: false }, // Rate limiter won't trust the X-Forwarded-For header sent by clients to prevents attackers from spoofing their IP address by manipulating this header
});
app.use('/api', limiter);

// The reason for defining this /webhook-chekout here in app.js instead of bookingRouter for e.g is because this handler function
// when we receive the body from Stripe, the Stripe function that we're then gonna use to actually read the body needs this body
// in a raw form, so basically as a stream not as JSON (the middleware below parse the body and convert it into json).
app.post(
  '/webhook-checkout',
  express.raw({ type: 'application/json' }),
  bookingController.webhookCheckout,
);

// Body parser
app.use(express.json({ limit: '10kb' })); // limit body payload
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser()); // parses data from cookies

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
// Configure xss to disallow all HTML tags
// const xssOptions = {
//   whiteList: {}, // Remove all tags
//   stripIgnoreTag: true, // Strip all HTML tags not in the whitelist
//   stripIgnoreTagBody: ['script'], // Remove <script> tag content entirely
// };

const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  // Use Object.entries() for safe iteration over object properties
  Object.entries(obj).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      // Sanitize each string element in the array
      obj[key] = value.map((item) =>
        typeof item === 'string' ? xss(item) : sanitizeObject(item),
      );
    } else if (typeof value === 'object') {
      // Recursively sanitize nested objects
      obj[key] = sanitizeObject(value);
    } else if (typeof value === 'string') {
      // Sanitize strings directly
      obj[key] = xss(value);
    }
  });

  return obj;
};

app.use((req, res, next) => {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);

  next();
});

// Prevent parameter pollution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// return a middleware function which is going to compress all the text that is sent to the clients
app.use(compression());

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  // console.log(req.headers);
  // console.log(req.cookies);
  next();
});

// 3) ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

// Handling Unhandled Routes
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
