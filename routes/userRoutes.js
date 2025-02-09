const express = require('express');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const rateLimit = require('express-rate-limit');
const AppError = require('../utils/appError');

const router = express.Router();

// For maximum login attempts
const limiter = rateLimit({
  max: 5,
  windowMs: 15 * 60 * 1000,
  handler: (req, res, next) => {
    next(
      new AppError(
        'Too many failed login attempts. Please try again in 15 minutes',
        429,
      ),
    );
  },
  validate: { xForwardedForHeader: false },
});

router.post('/signup', authController.signup);
router.get('/verifyEmail', authController.verifyEmail);
router.post('/login', limiter, authController.login);
router.get('/refresh', authController.refreshToken);
router.get('/logout', authController.logout);
router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword); // it's patch because the result of this will be the modification of password property in the user document

// Remember that the router is like a mini application
// so that just like with the regular app, we can use middleware on this router as well
// so instead of writing it to all next route, we can simply write it as this, and this will protect all the routes that come after thie point
// that's because middleware runs in sequence
router.use(authController.protect);

router.patch('/updateMyPassword', authController.updatePassword);

router.get('/me', userController.getMe, userController.getUser);
// Multer adds a body object and a file or files object to the request object.
// The body object contains the values of the text fields of the form, the file or files object contains the files uploaded via the form.
router.patch(
  '/updateMe',
  userController.uploadUserPhoto,
  userController.resizeUserPhoto,
  userController.updateMe,
);
router.delete('/deleteMe', userController.deleteMe);

// as the next routes should only be accessable by adminstrators
router.use(authController.restrictTo('admin'));

router
  .route('/')
  .get(userController.getAllUsers)
  .post(userController.createUser);
router
  .route('/:id')
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
