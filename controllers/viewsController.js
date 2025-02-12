const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const moment = require('moment-timezone');
const Review = require('../models/reviewModel');

exports.alerts = (req, res, next) => {
  const { alert } = req.query;
  if (alert === 'booking') {
    res.locals.alert =
      "Your booking was successful! Please check your email for a confirmation. If your booking doesn't show up here immediatly, please come back later.";
  }
  if (alert === 'verification') {
    res.locals.alert = 'Email verified!';
  }
  next();
};

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1) Get tour data from collection
  const tours = await Tour.find();

  // 2) Build template
  // 3) Render that template using tour data from 1)
  res.status(200).render('overview', {
    tours,
    title: 'All Tours',
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug })
    .populate('reviews', 'review rating user')
    .lean();

  if (!tour) {
    return next(new AppError('There is no tour with that name', 404));
  }

  tour.startDates = tour.startDates.map((startDate) => ({
    ...startDate,
    formatedDate: moment(startDate.date).tz('UTC').format('LLL'),
  }));

  // Checking if user have booked this tour before, and if so, cheking if he/she reviewed it
  tour.booked = false;
  tour.reviewed = false;
  if (res.locals.user) {
    const bookedTour = await Booking.findOne({
      tour: tour._id,
      user: res.locals.user._id,
    });

    if (bookedTour) {
      tour.booked = true;
      const reviewedTour = await Review.findOne({
        tour: tour._id,
        user: res.locals.user._id,
      });

      if (reviewedTour) tour.reviewed = true;
    }
  }

  res.status(200).render('tour', {
    title: `${tour.name} Tour`,
    tour,
  });
});

exports.getLoginForm = (req, res) => {
  if (res.locals.user) return res.redirect('/');

  res.status(200).render('login', {
    title: 'Log into your account',
  });
};

exports.getSignupForm = (req, res) => {
  if (res.locals.user) return res.redirect('/');

  res.status(200).render('signup', {
    title: 'Create your account!',
  });
};

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account',
  });
};

exports.updateUserData = catchAsync(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      name: req.body.name,
      email: req.body.email,
    },
    {
      new: true,
      runValidators: true,
    },
  );

  res.status(200).render('account', {
    title: 'Your account',
    user: updatedUser,
  });
});

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) Find all bookings and populate tour data
  let bookings = Booking.find({ user: req.user.id });
  bookings.skipPreFind = true; // skipping pre find middleware cause it's populating only tour name
  bookings = await bookings.populate('tour').lean();

  // 2) Extract populated tours data from bookings with adding startDate to display user specific booked date
  const tours = [];
  if (bookings) {
    bookings.forEach((booking) => {
      tours.push({ ...booking.tour, startDate: booking.startDate });
    });
  }

  // 2) Find tours with the returned IDs
  // const tourIDs = bookings.map((el) => el.tour);
  // const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.render('overview', {
    title: 'My Tours',
    tours,
  });
});

exports.getMyReviews = catchAsync(async (req, res, next) => {
  const reviews = await Review.find({ user: req.user._id })
    .sort('-createdAt')
    .populate('tour', 'slug');

  res.render('reviews', { reviews });
});
