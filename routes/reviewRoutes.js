const express = require('express');
const reviewController = require('../controllers/reviewController');
const authController = require('../controllers/authController');

// By default each router only has access to the parameters of thier specific routes
// But in the createReview route, the URL for POST, there's no tourId, so this is in order to access the tourId in the tour router in this router
const router = express.Router({ mergeParams: true });

// These two will end up in the below handler
// POST /tour/234fad4/reviews
// GET /tour/234fad4/reviews
// POST /reviews

router.use(authController.protect);

router
  .route('/')
  .get(reviewController.getAllReviews)
  .post(
    authController.restrictTo('user'),
    reviewController.setToursUsersIds,
    reviewController.createReview,
  );

router
  .route('/:id')
  .get(reviewController.getReview)
  .patch(
    authController.restrictTo('user', 'admin'),
    reviewController.updateReview,
  )
  .delete(
    authController.restrictTo('user', 'admin'),
    reviewController.deleteReview,
  );

module.exports = router;
