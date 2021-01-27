/* eslint-disable prettier/prettier */
const express = require('express');
const {
  getAllTours,
  createTour,
  getTour,
  updateTour,
  deleteTour,
  aliasTours,
  getTourStats,
  getMonthlyPlan,
  getToursWithin,
  getTourDistances,
  uploadTourImages,
  resizeTourImages
} = require('../controllers/tourController');

const { protect, restrictTo } = require("../controllers/authController")
// const { createReview } = require("../controllers/reviewController")
const reviewRouter = require("./reviewRoutes")

const router = express.Router();

// router.param('id', checkId);

// Bad practice - Instead of importing review controller here, we can just use nested routing as seen below
// router.route("/:tourId/reviews").post(protect, restrictTo("user"), createReview)

// Mounting a router when a req hits the specified route (nested routing)
router.use("/:tourId/reviews", reviewRouter)

router.route("/monthly-plan/:year").get(protect, restrictTo("admin, lead-guide", "guide"), getMonthlyPlan);
router.route("/tour-stats").get(getTourStats);

router.route("/top-5-cheap").get(aliasTours, getAllTours)

router.route("/tours-within/:distance/center/:latlng/unit/:unit").get(getToursWithin)
router.route("/distances/:latlng/unit/:unit").get(getTourDistances)

router.route('/')
  .get(getAllTours)
  .post(protect, restrictTo("admin", "lead-guide"), createTour);
router.route('/:id').get(getTour).patch(protect, restrictTo("admin", "lead-guide"), uploadTourImages, resizeTourImages, updateTour).delete(protect, restrictTo("admin", "lead-guide"), deleteTour);


module.exports = router;
