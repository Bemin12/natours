const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Tour = require('../models/tourModel');
const User = require('../models/userModel');
const Booking = require('../models/bookingModel');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('../utils/appError');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  const { tourId, dateId } = req.params;

  if (!tourId || !dateId) {
    return next(new AppError('Provide both tourId, and dateId', 400));
  }

  const tour = await Tour.findById(tourId);

  if (!tour) {
    return next(new AppError('No tour found with this id', 404));
  }

  const prevBooking = await Booking.findOne({
    user: req.user.id,
    tour: tourId,
  });

  if (prevBooking) {
    return next(
      new AppError('User can not book the same tour more than once', 400),
    );
  }

  const tourInstance = tour.startDates.id(dateId);
  if (!tourInstance || tourInstance.soldOut) {
    return next(new AppError('This tour date is no longer available.', 404));
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: req.user.email,
    client_reference_id: tourId,
    // Shorten expiry to 30 mins to prevent long-lived abandoned sessions
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    success_url: `${req.protocol}://${req.get('host')}/my-tours?alert=booking`,
    cancel_url: `${req.protocol}://${req.get('host')}/tours/${tour.slug}`,
    metadata: {
      dateId,
      maxGroupSize: tour.maxGroupSize,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: tour.price * 100,
          product_data: {
            name: `${tour.name} Tour`,
            description: tour.description,
            images: [tour.imageCover.url],
          },
        },
      },
    ],
  });

  res.status(200).json({
    status: 'success',
    session,
  });
});

async function createBookingCheckout(session) {
  const tourId = session.client_reference_id;
  const userId = (await User.findOne({ email: session.customer_email })).id;
  const price = session.amount_total / 100;
  const { maxGroupSize, dateId } = session.metadata;

  const tour = await Tour.findOneAndUpdate(
    {
      _id: tourId,
      startDates: {
        $elemMatch: { _id: dateId, participants: { $lt: maxGroupSize } },
      },
    },
    {
      $inc: { 'startDates.$.participants': 1 },
    },
    {
      returnDocument: 'after',
    },
  );

  if (!tour) {
    console.error(`RACE CONDITION: Tour ${tourId} filled up during payment.`);

    await stripe.refunds.create({
      payment_intent: session.payment_intent,
      reason: 'requested_by_customer',
    });

    return;
  }

  await Booking.create({
    tour: tourId,
    user: userId,
    price,
    startDate: dateId,
    paid: true,
  });
}

exports.webhookCheckout = async (req, res, next) => {
  const signature = req.headers['stripe-signature'];
  // console.log('----------------------- signature -----------------------');
  // console.log(signature);
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    console.log(err);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    await createBookingCheckout(event.data.object);
  }

  res.status(200).json({ received: true });
};

exports.createBooking = factory.createOne(Booking);
exports.getBooking = factory.getOne(Booking);
exports.getAllBookings = factory.getAll(Booking);
exports.updateBooking = factory.updateOne(Booking, 'user');
exports.deleteBooking = factory.deleteOne(Booking, 'user');
