const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Booking must belong to a User!'],
    },
    tour: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tour',
      required: [true, 'Booking must belong to a Tour!'],
    },
    price: {
      type: Number,
      required: [true, 'Booking must have a price.'],
    },
    startDate: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Booking must have a specific start date ID.'],
    },
    paid: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

bookingSchema.index({ user: 1, tour: 1 }, { unique: true });

bookingSchema.pre(/^find/, function (next) {
  if (this.skipPreFind) return next();
  this.populate('user').populate('tour', 'name');
  next();
});

bookingSchema.post(/.delete/i, async (doc) => {
  if (!doc) return;

  await mongoose.model('Tour').updateOne(
    { _id: doc.tour, 'startDates._id': doc.startDate },
    {
      $inc: { 'startDates.$.participants': -1 },
      // $set: { 'startDates.$.soldOut': false },
    },
    {
      runValidators: true,
    },
  );
});

module.exports = mongoose.model('Booking', bookingSchema);
