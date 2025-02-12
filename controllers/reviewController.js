const Review = require('../models/reviewModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

// middleware
exports.setToursUsersIds = (req, res, next) => {
  // Allow nested routes
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;

  next();
};

// Middleware to check if user has booked a tour before reviewing it
exports.checkIfBooked = catchAsync(async (req, res, next) => {
  const tourBooked = await Booking.findOne({
    user: req.user._id,
    tour: req.body.tour,
  });

  if (!tourBooked) {
    return next(
      new AppError(
        'Users can only review a tour that they have actually booked',
        403,
      ),
    );
  }

  next();
});

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.createReview = factory.createOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.deleteReview = factory.deleteOne(Review);
