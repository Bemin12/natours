const multer = require('multer');
const sharp = require('sharp');
const cloudinary = require('../utils/cloudinary');
const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const factory = require('./handlerFactory');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 },
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  if (!req.files?.imageCover && !req.files?.images) return next();

  // 1) Cover image
  // req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`; // we put it in the body here becasue the `factory.updateOne()` updates all of the data that's on the body onto the new document
  if (req.files?.imageCover) {
    const processedBuffer = await sharp(req.files.imageCover[0].buffer)
      .resize(2000, 1333) // 3/2 ratio
      .toFormat('jpeg')
      .jpeg({ quality: 60 })
      // .toFile(`public/img/tours/${req.body.imageCover}`);
      .toBuffer();

    req.files.imageCover[0].buffer = processedBuffer;
  }

  // 2) Images
  if (req.files?.images) {
    req.body.images = [];

    await Promise.all(
      req.files.images.map(async (file, i) => {
        // const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

        const processedBuffer = await sharp(file.buffer)
          .resize(2000, 1333)
          .toFormat('jpeg')
          .jpeg({ quality: 60 })
          // .toFile(`public/img/tours/${filename}`);
          .toBuffer();

        // req.body.images.push(filename);
        req.files.images[i].buffer = processedBuffer;
      }),
    );
  }

  next();
});

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);
exports.getTour = factory.getOne(Tour, { path: 'reviews' });
exports.createTour = factory.createOne(Tour);
// exports.updateTour = factory.updateOne(Tour);
exports.updateTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id);
  if (!tour) {
    return next(new AppError('No tour found with this ID', 404));
  }

  const updateBody = { ...req.body };

  let imageCoverPromise = [Promise.resolve()];
  if (req.files?.imageCover) {
    if (tour.imageCover?.publicId) {
      await cloudinary.deleteImage(tour.imageCover.publicId);
    }

    imageCoverPromise = req.files.imageCover.map(async (image) => {
      const result = await cloudinary.uploadImage(image, 'natours/tours');

      updateBody.imageCover = {
        url: result.secure_url,
        publicId: result.public_id,
      };
    });

    // const result = await cloudinary.uploadImage(
    //   req.files.imageCover[0],
    //   'natours/tours',
    // );

    // updateBody.imageCover = {
    //   url: result.secure_url,
    //   publicId: result.public_id,
    // };
  }

  let imagesPromise = [Promise.resolve()];
  if (req.files?.images) {
    updateBody.images = [...tour.images];

    imagesPromise = req.files.images.map(async (image, i) => {
      if (updateBody.images[i]?.publicId) {
        await cloudinary.deleteImage(updateBody.images[i].publicId);
      }

      const result = await cloudinary.uploadImage(image, 'natours/tours');

      updateBody.images[i] = {
        url: result.secure_url,
        publicId: result.public_id,
      };
    });
  }
  await Promise.all([...imageCoverPromise, ...imagesPromise]);

  const updatedTour = await Tour.findByIdAndUpdate(req.params.id, updateBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({ status: 'success', data: { tour: updatedTour } });
});

// exports.deleteTour = factory.deleteOne(Tour);
exports.deleteTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id);

  if (!tour) {
    return next(new AppError('No tour found with this ID', 404));
  }

  if (tour.imageCover?.publicId)
    await cloudinary.deleteImage(tour.imageCover.publicId);

  if (tour.images?.length) {
    await Promise.all(
      tour.images.map(async (image) => {
        if (image.publicId) await cloudinary.deleteImage(image.publicId);
      }),
    );
  }

  await tour.deleteOne();

  res.status(204).json({ status: 'success', data: null });
});

exports.getTourStats = async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' },
      },
    },
    {
      $sort: { avgPrice: 1 },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats,
    },
  });
};

// Function to calculate the busiest month of a given year
exports.getMonthlyPlan = async (req, res, next) => {
  const year = +req.params.year;

  const plan = await Tour.aggregate([
    {
      $set: {
        startDates: {
          $map: {
            input: '$startDates',
            as: 'startDate',
            in: '$$startDate.date',
          },
        },
      },
    },
    {
      $unwind: '$startDates',
    },
    // method 1
    // {
    //   $match: {
    //     $expr: {
    //       $eq: [{ $year: '$startDates' }, year],
    //     },
    //   },
    // },
    // {
    //   $group: {
    //     _id: { $month: '$startDates' },
    //     numTourStarts: { $sum: 1 },
    //     tours: { $push: '$name' },
    //   },
    // },
    // method 2
    // {
    //   $project: {
    //     year: { $year: '$startDates' },
    //     month: { $month: '$startDates' },
    //     name: 1,
    //   },
    // },
    // {
    //   $match: {
    //     year: year,
    //   },
    // },
    // {
    //   $group: {
    //     _id: '$month',
    //     numTourStarts: { $sum: 1 },
    //     tours: { $push: '$name' },
    //   },
    // },
    // method 3
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' },
      },
    },
    {
      $project: {
        _id: 0,
        month: '$_id',
        numTourStarts: 1,
        tours: 1,
      },
    },
    {
      $sort: { numTourStarts: -1 },
    },
    {
      $limit: 12,
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
};

// /tour-within?distance=233&center=-40,45&unit=mi
// /tour-within/233/center/-40,45/unit/mi
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  // radius is the distance that we want to have as the radius, but converted to a special unit called radians
  // to get the radians, we need to divide our distance by the radius of the earth
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng',
      ),
      400,
    );
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } },
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours,
    },
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Please provide latitude and longitude in the format lat,lng',
      ),
      400,
    );
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [lng * 1, lat * 1] },
        distanceField: 'distance',
        distanceMultiplier: multiplier, // converting to mi | km
      },
    },
    {
      $project: {
        distance: 1,
        name: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    results: distances.length,
    data: {
      tours: distances,
    },
  });
});
