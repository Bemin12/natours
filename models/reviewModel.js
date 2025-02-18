const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty'],
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      set: function (rating) {
        this._oldRating = this.rating;
        return rating;
      },
    },
    createdAt: {
      type: Date,
      default: Date.now(),
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// this unique index prevents duplicate reviews for the same user
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewSchema.pre(/^find/, function (next) {
  // this.populate('tour', 'name').populate('user', 'name photo');
  this.populate('user', 'name photo');
  next();
});

reviewSchema.statics.calcAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating,
    });
  } else {
    // in case of deleting last doc
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewSchema.post('save', function () {
  this.constructor.calcAverageRatings(this.tour);
});

reviewSchema.post(/^findOneAnd/, async (doc) => {
  if (doc) await doc.constructor.calcAverageRatings(doc.tour);
});

//////////////////////////////////
// Approach 2 of updating tour stats (ratingsSum, ratingsQuantity, and ratingsAverage) without aggregation
// To work with this approach, we add extra property (ratingsSum) to tour schema and use `.save()` instead of `.findByIdAndUpdate()` in `reviewController.js`
// We don't use aggregation in this approach, just update `ratingsSum`, `ratingsQuantity`, and `ratinsAverage` on the tour,

/*
// Track document state before saving
reviewSchema.pre('save', async function (next) {
  this.wasNew = this.isNew;
  this.wasRatingModified = this.isModified('rating');

  next();
});

// Update tour ratings after creating or updating a review
reviewSchema.post('save', async function (doc, next) {
  // Skip the case in which review is updated without chaning the rating
  if (!this.wasRatingModified && !this.wasNew) return next();

  // Default: increment `ratingsQuantity` by 1 and `ratingsSum` by `this.rating`
  let incrementQuantity = 1;
  let operation = this.rating;
  // Incase of updating an existing review rating
  if (this.wasRatingModified && !this.wasNew) {
    incrementQuantity = 0;
    operation = this.rating - this._oldRating;
  }

  await Tour.updateOne({ _id: this.tour }, [
    {
      $set: {
        ratingsSum: { $add: ['$ratingsSum', operation] },
        ratingsQuantity: { $add: ['$ratingsQuantity', incrementQuantity] },
      },
    },
    {
      $set: {
        ratingsAverage: { $divide: ['$ratingsSum', '$ratingsQuantity'] },
      },
    },
  ]);
});

// Update tour ratings after deleting a review
reviewSchema.post('findOneAndDelete', async (doc) => {
  // the if (doc) check is a safety measure to ensure that we only attempt to access properties of a valid document,
  // preventing errors when no document is found by the findOneAnd operation.
  if (doc) {
    await Tour.updateOne({ _id: doc.tour }, [
      {
        $set: {
          ratingsSum: { $subtract: ['$ratingsSum', doc.rating] },
          ratingsQuantity: { $subtract: ['$ratingsQuantity', 1] },
        },
      },
      {
        $set: {
          ratingsAverage: {
            $cond: {
              if: { $gt: ['$ratingsQuantity', 0] },
              then: { $divide: ['$ratingsSum', '$ratingsQuantity'] },
              else: 0,
            },
          },
        },
      },
    ]);
  }
});
*/

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
