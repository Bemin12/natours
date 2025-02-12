const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldDB = (err) => {
  // const value = err.keyValue.name;
  const value = Object.values(err.keyValue);

  const message = `Duplicate field value ${value}. Please use another value`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);

  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = (req, res) =>
  new AppError('Invalid token. Please login again', 401);

const handleJWTExpires = () =>
  new AppError('Your token has expired. Please log in again', 401);

const sendErrorDev = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }

  // B) RENDERED WEBSITE
  // Automatically refresh token for protected routes in rendered website
  if (
    err.statusCode === 401 &&
    req.cookies.refreshToken &&
    err.message !== 'Please verify your email'
  ) {
    return res.redirect(`/api/v1/users/refresh?redirect=${req.originalUrl}`);
  }
  console.log('Error🔥', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message,
  });
};

const sendErrorProd = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    // A) Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // B) Programming or other unkown error: don't leak error details
    // 1) Log error
    console.log('Error🔥', err);
    // 2) Send generic message
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong',
    });
  }

  // B) RENDERED WEBSITE
  // A) Operational, trusted error: send message to client
  if (err.isOperational) {
    // Automatically refresh token for protected routes in rendered website
    if (
      err.statusCode === 401 &&
      req.cookies.refreshToken &&
      err.message !== 'Please verify your email'
    ) {
      return res.redirect(`/api/v1/users/refresh?redirect=${req.originalUrl}`);
    }

    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
  // B) Programming or other unkown error: don't leak error details
  // 1) Log error
  console.log('Error🔥', err);
  // 2) Send generic message
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.',
  });
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error'; // 'error' if we have 500 status code, 'fail' if it's a 400

  // refresh token malformed redirects to login page in rendered website
  if (req.originalUrl.startsWith('/api/v1/users/refresh?redirect')) {
    return res.redirect('/login');
  }

  // In production, we want to leak as little information abour our errors to the client as possible unlike in development
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = Object.assign(Object.create(Object.getPrototypeOf(err)), err);
    // This is because message property in err is not enumerable so it won't be in error first
    error.message = err.message;

    // We will pass the error that mongoose created into these functions, and this will return a new error created with AppError class
    // that error will then be marked as operational
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError(req, res);
    if (error.name === 'TokenExpiredError') error = handleJWTExpires();

    sendErrorProd(error, req, res);
  }
};
