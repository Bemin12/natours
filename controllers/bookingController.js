const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // 2) Check if selected date is available and not sold out
  const startDate = new Date(req.params.startDate);

  const tourInstance = tour.startDates.find(
    (instance) => instance.date.getTime() === startDate.getTime(),
  );

  if (!tourInstance) {
    return next(new AppError('Tour is not available on this date', 400));
  }

  if (tourInstance.soldOut) {
    return next(new AppError('Sold out! Please choose another date.', 400));
  }

  // 3) Create checkout session
  const session = await stripe.checkout.sessions.create({
    // Information about the session
    mode: 'payment',
    payment_method_types: ['card'], // credit card
    // success_url: `${req.protocol}://${req.get('host')}/my-tours/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}&startDate=${req.params.startDate}`, // the URL that will get called as soon as a credit card has been successfully charged | Current is for not hosted app, it's not secure as anyone with this url can book a tour without paying
    success_url: `${req.protocol}://${req.get('host')}/my-tours?alert=booking`,
    cancel_url: `${req.protocol}://${req.get('host')}/tours/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: `${req.params.tourId}|${req.params.startDate}`,
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
            images: [
              `${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`,
            ],
          },
        },
      },
    ],
  });

  // 4) Create session as response
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
// exports.createBookingCheckout = catchAsync(async (req, res, next) => {
//   // This is only TEMPORARY, becasue it's UNSECURE: everyone can make booking without paying
//   const { tour, user, price, startDate } = req.query;
//   if (!tour || !user || !price) return next();
//   await Booking.create({ tour, user, price, startDate });

//   res.redirect(`${req.originalUrl.split('?')[0]}?alert=booking`);
// });

const createBookingCheckout = catchAsync(async (session) => {
  const [tour, startDate] = session.client_reference_id.split('|');
  const user = await User.findOne(
    { email: session.customer_email },
    { _id: 1 },
  );
  const price = session.amount_total / 100;
  await Booking.create({ tour, startDate, user, price });
});

exports.webhookCheckout = (req, res, next) => {
  // Stripe sends a signature in the request headers to verify the webhook is legitimate
  // This prevents fraudulent webhook calls from unauthorized sources
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    // Verify the webhook event using Stripe's SDK
    // This requires three things:
    // 1. The raw request body
    // 2. The Stripe signature from headers
    // 3. Our webhook secret (stored in environment variables)
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    // If signature verification fails, return a 400 error
    // This happens if the webhook is called with invalid/missing signature
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  // If the webhook event is a completed checkout session
  // Process the booking in our database
  if (event.type === 'checkout.session.completed')
    createBookingCheckout(event.data.object);

  // Send back a 200 status to let Stripe know we received the webhook successfully
  res.status(200).json({ received: true });
};

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
