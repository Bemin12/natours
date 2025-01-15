const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const Booking = require('../models/bookingModel');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    // Information about the session
    mode: 'payment',
    payment_method_types: ['card'], // credit card
    success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`, // the URL that will get called as soon as a credit card has been successfully charged | Current is for not hosted app, it's not secure as anyone with this url can book a tour without paying
    cancel_url: `${req.protocol}://${req.get('host')}/tours/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    // Information about the product
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: tour.price * 100,
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.summary,
            images: [`https://natours.dev/img/tours/${tour.imageCover}`],
          },
        },
      },
    ],
  });

  // 3) Create session as response
  res.status(200).json({
    status: 'success',
    session,
  });
});

// The flow:
// user press 'pay'
// it go to the secure_url '/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}', hits the '/' in viewRoutes
// hits this controller
// (tour, user, price) exist -> create new booking
// redirect to '/'
// no (tour, user, price)
// return next()
// continue to authController.isLoggedIn, viewsController.getOverview and go to overview page
exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  // This is only TEMPORARY, becasue it's UNSECURE: everyone can make booking without paying
  const { tour, user, price } = req.query;

  if (!tour || !user || !price) return next();
  await Booking.create({ tour, user, price });

  res.redirect(`${req.originalUrl.split('?')[0]}`);
});

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
