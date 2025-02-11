const mongoose = require('mongoose');
const Tour = require('./tourModel');

const bookingSchema = new mongoose.Schema({
  tour: {
    type: mongoose.Schema.ObjectId,
    ref: 'Tour',
    required: [true, 'Booking must belong to a Tour!'],
  },
  startDate: {
    type: Date,
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking must belong to a User!'],
  },
  price: {
    type: Number,
    required: [true, 'Booking must have a price.'],
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  paid: {
    type: Boolean,
    default: true,
  },
});

bookingSchema.index({ user: 1, tour: 1 }, { unique: true });

bookingSchema.pre(/^find/, function (next) {
  this.populate('user').populate('tour', 'name');
  next();
});

bookingSchema.post('save', async function () {
  // Update tour instance (specific date) participants
  const tour = await Tour.findById(this.tour);
  const instance = tour.startDates.find(
    (startDate) => startDate.date.getTime() === this.startDate.getTime(),
  );

  instance.participants += 1;
  if (instance.participants === tour.maxGroupSize) {
    instance.soldOut = true;
  }
  await tour.save();
});

bookingSchema.post(/.delete/i, async (doc) => {
  // Update tour instance (specific date) participants
  const tour = await Tour.findById(doc.tour);
  const instance = tour.startDates.find(
    (startDate) => startDate.date.getTime() === doc.startDate.getTime(),
  );

  instance.participants -= 1;
  instance.soldOut = false;
  await tour.save();
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
