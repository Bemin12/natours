const crypto = require('crypto');
const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const RefreshToken = require('../models/refreshTokenModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Email = require('../utils/email');

const signTokens = (id) => {
  const accessToken = jwt.sign({ id }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN,
  });

  const refreshToken = jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
};

const createSendToken = async (
  user,
  statusCode,
  req,
  res,
  next = undefined,
  existingToken = null,
  isLoggedIn = false,
) => {
  const { accessToken, refreshToken } = signTokens(user._id);

  // Rotating refresh token
  if (existingToken) {
    await existingToken.deleteOne();
    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt: new Date(
        Date.now() +
          process.env.JWT_REFRESH_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
      ),
    });
  } else {
    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt: new Date(
        Date.now() +
          process.env.JWT_REFRESH_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
      ),
    });
  }

  res.cookie('jwt', accessToken, {
    expires: new Date(
      Date.now() + process.env.JWT_ACCESS_COOKIE_EXPIRES_IN * 60 * 1000,
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https', // x-forwarded-proto header is used to identify the protocol (http or https) that a client used to connect to your proxy or load balancer
  });

  res.cookie('refreshToken', refreshToken, {
    expires: new Date(
      Date.now() +
        process.env.JWT_REFRESH_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
    sameSite: 'strict',
    // path: '/api/v1/users',
  });

  if (isLoggedIn) {
    res.locals.user = user;
    return next();
  }

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    accessToken,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const { name, email, password, passwordConfirm } = req.body;

  const newUser = await User.create({
    name,
    email,
    password,
    passwordConfirm,
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  new Email(newUser, url).sendWelcome();

  createSendToken(newUser, 201, req, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1) Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // 2) Check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  // 3) If everything ok, send token to client
  createSendToken(user, 200, req, res);
});

exports.logout = catchAsync(async (req, res) => {
  const { refreshToken } = req.cookies;
  if (refreshToken) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');
    await RefreshToken.deleteOne({ token: hashedToken });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
      sameSite: 'strict',
      path: '/api/v1/users',
    });
  }
  res.clearCookie('jwt', {
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
  });

  res.status(200).json({ status: 'success' });
});

exports.logoutAllDevices = catchAsync(async (req, res, next) => {
  await RefreshToken.deleteMany({ userId: req.user._id });
  res.status(200).json({ status: 'success' });
});

// --AUTHENTICATION--
exports.protect = catchAsync(async (req, res, next) => {
  // 1) Getting token and check if it's there
  let token;
  if (req.headers?.authorization?.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access', 401),
    );
  }

  // 2) Verification token
  // jwt.verify() is synchronous by default but can be made asynchronous by providing a callback.
  // Converting the callback-based asynchronous jwt.verify() method into a promise-based version.
  const decoded = await promisify(jwt.verify)(
    token,
    process.env.JWT_ACCESS_SECRET,
  );

  // 3) Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist',
        401,
      ),
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('User recently changed password! Please log in again.', 401),
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = currentUser;
  res.locals.user = currentUser;
  next();
});

// Only for rendered pages, not to protect any route (no errors!)
exports.isLoggedIn = async (req, res, next) => {
  // for rendered pages we will not have the token in the header
  if (req.cookies.jwt || req.cookies.refreshToken) {
    try {
      // 1) Verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_ACCESS_SECRET,
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      // res.locals in Express is an object that is available for storing information that you want to pass to the views (or templates)
      // and share across middleware functions during the lifecycle of a request.
      // Exists for the lifecycle of the request. Cleared after the response.
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      // Automatically refreshing the token if refresh token provided
      // The same logic for exports.refresh but without throwing errors
      if (req.cookies.refreshToken) {
        try {
          const decoded = await promisify(jwt.verify)(
            req.cookies.refreshToken,
            process.env.JWT_REFRESH_SECRET,
          );
          const hashedToken = crypto
            .createHash('sha256')
            .update(req.cookies.refreshToken)
            .digest('hex');

          const existingToken = await RefreshToken.findOne({
            token: hashedToken,
            expiresAt: { $gt: Date.now() },
          });

          if (!existingToken) {
            return next();
          }
          const user = await User.findById(decoded.id);
          if (!user) {
            return next();
          }
          return createSendToken(
            user,
            200,
            req,
            res,
            next,
            existingToken,
            true,
          );
        } catch (error) {
          return next();
        }
      }
      return next();
    }
  }
  next();
};

// --AUTHORIZATION--
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'lead-guide']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403),
      );
    }

    next();
  };
};

exports.refreshToken = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return next(new AppError('Refresh token missing', 400));
  }

  const decoded = await promisify(jwt.verify)(
    refreshToken,
    process.env.JWT_REFRESH_SECRET,
  );

  const hashedToken = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  const existingToken = await RefreshToken.findOne({
    token: hashedToken,
    expiresAt: { $gt: Date.now() },
  });
  if (!existingToken) {
    return next(new AppError('Invalid or expired token', 401));
  }

  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new AppError('User not found', 401));
  }

  await createSendToken(user, 200, req, res, undefined, existingToken);
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on POSTed email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('There is no user with this email address', 404));
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // to save the resetToken to the user | `false` in order to pass the validation because we pass only the token | the `passwordConfirm` gives an error

  // 3) Send it to user's email
  try {
    const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email',
    });
  } catch (err) {
    // Reset passworkd token and expires in case of error
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was an error sending the email. Try again later',
        500,
      ),
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) Get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(
      new AppError('Invalid or expired token. Please log in again.', 400),
    );
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();
  // Invalidate refresh tokens across all devices after reseting password
  await RefreshToken.deleteMany({ userId: user._id });
  // 3) Update `changedPasswordAt` property for the user
  // 4) Log the user in, send JWT
  createSendToken(user, 200, req, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) Get user from collection
  const user = await User.findById(req.user._id).select('+password');

  // 2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent))) {
    return next(new AppError('Password is incorrect', 401));
  }

  // 3) If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // Invalidate refresh tokens across all devices after reseting password
  await RefreshToken.deleteMany({ userId: req.user._id });

  // 4) Log the user in, send JWT
  createSendToken(user, 200, req, res);
});
