const path = require('path');
const multer = require('multer');
const sharp = require('sharp');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const factory = require('./handlerFactory');

// Storing images to the memory (stored as a buffer, available at `req.file.buffer`) to do image processing to it before saving it to the disk
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  // we can also check the extension
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only images.', 400), false);
  }
};

// multer uploader
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});
exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();

  // by saving the file into the memory as a buffer, the filename will not get set, but we need it in other middleware (updateMe)
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`; // no need to get ${ext} because of the below code, images will always saved as jpeg

  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);

  next();
});

const filterObj = (obj, ...allowedFields) => {
  const filteredObj = {};
  // Object.keys(obj).forEach((el) => {
  //   if (allowedFields.includes(el)) filteredObj[el] = obj[el];
  // });

  for (const field of allowedFields) {
    if (field in obj) {
      filteredObj[field] = obj[field];
    }
  }

  return filteredObj;
};

// middleware to use factory.getOne for getting current user
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.paaswordConfrim) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword',
        400,
      ),
    );
  }

  // 2) Filtered out unwanted fields names that are not allowed to be updated (role, passwordResetToken|Expires, ...)
  const filteredBody = filterObj(req.body, 'name', 'email');
  if (req.file) filteredBody.photo = req.file.filename;

  // 3) Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user._id, filteredBody, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

// When user deletes his account, we set the account to inactive, so that the user might at some point in the future reactivate the account
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not defined! Please use /signup instead',
  });
};

// updateUser and deleteUser are only for adminstrators and only for updating data that is not the password
exports.updateUser = factory.updateOne(User);

exports.deleteUser = factory.deleteOne(User);
