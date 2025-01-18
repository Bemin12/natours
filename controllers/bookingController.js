const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);

  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({
    // Information about the session
    mode: 'payment',
    payment_method_types: ['card'], // credit card
    // success_url: `${req.protocol}://${req.get('host')}/my-tours/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`, // the URL that will get called as soon as a credit card has been successfully charged | Current is for not hosted app, it's not secure as anyone with this url can book a tour without paying
    success_url: `${req.protocol}://${req.get('host')}/my-tours`,
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
            images: [
              `${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`,
            ],
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
// exports.createBookingCheckout = catchAsync(async (req, res, next) => {
//   // This is only TEMPORARY, becasue it's UNSECURE: everyone can make booking without paying
//   const { tour, user, price } = req.query;

//   if (!tour || !user || !price) return next();
//   await Booking.create({ tour, user, price });

//   res.redirect(`${req.originalUrl.split('?')[0]}`);
// });

const createBookingCheckout = catchAsync(async (session) => {
  const tour = session.client_reference_id;
  const user = await User.findOne(
    { email: session.customer_email },
    { _id: 1 },
  );
  const price = session.amount_total / 100;
  await Booking.create({ tour, user, price });
});

exports.webhookCheckout = (req, res, next) => {
  // When Stripe calls our webhook, it will add a header to that request containing a special signature for our webhook
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed')
    createBookingCheckout(event.data.object);

  res.status(200).json({ received: true });
};

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking);
exports.deleteBooking = factory.deleteOne(Booking);
