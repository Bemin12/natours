const mongoose = require('mongoose');
const slugify = require('slugify');

const imageSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      default:
        'https://res.cloudinary.com/dxbiecqpq/image/upload/v1739834848/natours/tours/tour-default-2.jpg',
    },
    publicId: String,
  },
  { _id: false },
);

const startDatesSchema = new mongoose.Schema(
  {
    date: Date,
    participants: {
      type: Number,
      default: 0,
      validate: {
        validator: function (val) {
          // this.parent() is a Mongoose-specific method that allows you to access the parent document of a subdocument.
          return val <= this.parent().maxGroupSize;
        },
        message: 'Maximum participants reached (tour sold out)!',
      },
    },
    soldOut: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false },
);

const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,
      maxlength: [40, 'A tour must have less or equal than 40 characters'],
      minlength: [10, 'A tour must have more or equal than 10 characters'],
    },
    slug: String,
    duration: {
      type: Number,
      requried: [true, 'A tour must have a duration'],
    },
    maxGroupSize: {
      type: Number,
      require: [true, 'A tour must have a group size'],
    },
    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, difficult',
      },
    },
    ratingsAverage: {
      type: Number,
      default: 0,
      min: [0, 'Rating must be above 0'],
      max: [5, 'Rating must be below 5.0'],
      // will run each time that a new value is set for this field
      set: (val) => Math.round(val * 10) / 10, // 4.66666, 46.6666, 47, 4.7
    },
    ratingsQuantity: {
      type: Number,
      default: 0,
    },
    // To work with 'Approach 2' in `reviewModel.js`
    // ratingsSum: {
    //   type: Number,
    //   default: 0,
    // },
    price: {
      type: Number,
      required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
      type: Number,
      validate: {
        // val is the value inputted (priceDiscount)
        validator: function (val) {
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price',
      },
    },
    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a summary'],
    },
    description: {
      type: String,
      trim: true,
    },
    imageCover: imageSchema,
    images: [imageSchema],
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false,
    },
    startDates: [startDatesSchema],
    secretTour: {
      type: Boolean,
      default: false,
    },
    startLocation: {
      type: {
        type: String,
        default: 'Point',
        enum: ['Point'],
      },
      coordinates: [Number],
      address: String,
      description: String,
    },
    locations: [
      {
        type: {
          type: 'String',
          default: 'Point',
          enum: ['Point'],
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number, // a day of the tour in which people will go to this location
      },
    ],
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

tourSchema.virtual('durationWeeks').get(function () {
  return this.duration / 7; // this is pointing to the current document
});

// Populated virtual
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id',
});

tourSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });

  // Mongoose doesn't automatically create the subdocuments with the default values.  It simply leaves those fields undefined.
  // Create imageCover subdocument if it doesn't exist
  if (!this.imageCover) {
    this.imageCover = {};
  }

  // Ensure images array has at least 3 elements, filling with defaults if needed
  if (!this.images || this.images.length < 3) {
    this.images = [
      this.images[0] || {},
      this.images[1] || {},
      this.images[2] || {},
    ];
  }

  next();
});

tourSchema.pre(/^find/, function (next) {
  // suppose we have secret tours in our database (like tours that are ony offered internally for a very small like VIP group of people)
  this.find({ secretTour: { $ne: true } });

  // Setting a property onto the query object, it's really a regular object at the end
  // this.start = Date.now();
  next();
});

tourSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt -verified',
  });

  next();
});

// tourSchema.post(/^find/, function (docs, next) {
//   // calculating how much it take to execute the query
//   console.log(`Query took ${Date.now() - this.start} milliseconds`);
//   // console.log(docs);
//   next();
// });

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
