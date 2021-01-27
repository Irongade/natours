/* eslint-disable prettier/prettier */
const mongoose = require("mongoose")
const Tour = require("./tourModel")

const reviewSchema = new mongoose.Schema(
    {
        review: {
            type: String,
            required: [true, "Review can not be empty"]
        },
        rating: {
            type: Number,
            min: 1,
            max: 5,
        },
        createdAt: {
            type: Date,
            default: Date.now
        },
        tour: {
            type: mongoose.Schema.ObjectId,
            ref: "Tour",
            required: [true, "Review must belong to a tour"]
        },
        user: {
            type: mongoose.Schema.ObjectId,
            ref: "User",
            required: [true, "Review must belong to a user"]
        }
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
)

reviewSchema.index({ tour: 1, user: 1 }, { unique: true })

reviewSchema.pre(/^find/, function (next) {
    // this.populate({
    //     path: "tour",
    //     select: "name"
    // }).populate({
    //     path: "user",
    //     select: "name photo"
    // })

    // we just want to populate the users

    this.populate({
        path: "user",
        select: "name photo"
    })

    next();
})

reviewSchema.statics.calcAverageRatings = async function (tourId) {
    // console.log(this)
    const stats = await this.aggregate([
        {
            $match: { tour: tourId }
        },
        {
            $group: {
                _id: '$tour',
                nRating: { $sum: 1 },
                avgRating: { $avg: '$rating' }
            }
        }
    ]);
    // console.log(stats);

    if (stats.length > 0) {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: stats[0].nRating,
            ratingsAverage: stats[0].avgRating
        });
    } else {
        await Tour.findByIdAndUpdate(tourId, {
            ratingsQuantity: 0,
            ratingsAverage: 4.5
        });
    }
};

reviewSchema.post('save', function () {
    // this points to current review
    this.constructor.calcAverageRatings(this.tour);
});

// pre or post save hooks dont work for findByIdAndUpdate (when a document is being updated)
// and for findByIdAndDelete (when a document is being delete) as they are queries
// so we use pre middleware for find queries (since that what they are)

reviewSchema.pre(/^findOneAnd/, async function (next) {
    // we use pre to get access to the documents tourId before it is updated

    // this is a way to pass documents from pre to post middleware
    this.r = await this.findOne();
    // console.log(this.r)
    // console.log(this)

    next();
})

reviewSchema.post(/^findOneAnd/, async function () {
    // we use post now to get access to execute our static function
    // since await this.findOne() does not work here, query has already executed
    await this.r.constructor.calcAverageRatings(this.r.tour)

})

const Review = mongoose.model("Review", reviewSchema)

module.exports = Review;