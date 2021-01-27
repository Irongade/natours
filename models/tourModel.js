/* eslint-disable prettier/prettier */
const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require("./userModel")
// const validator = require("validator")

const tourSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'A tour must have a price'],
        unique: true,
        trim: true,
        minlength: [10, "Name must be more or equal than 10 characters"],
        maxlength: [40, "Name must be less or equal than 40 characters"]
    },
    duration: {
        type: Number,
        required: [true, "A tour must have a duration"]
    },
    maxGroupSize: {
        type: Number,
        required: [true, "A tour must have a group size"]
    },
    difficulty: {
        type: String,
        required: [true, "A tour must have a difficulty"],
        enum: {
            values: ["easy", "medium", "difficult"],
            message: "Difficulty can only be easy, medium or difficult"
        }
    },
    ratingsAverage: {
        type: Number,
        default: 4.5,
        min: [1.0, "ratings average must not be less than 1.0"],
        max: [5.0, "ratings average must not be greater than 5.0"],
        set: val => Math.round(val * 10) / 10
    },
    ratingsQuantity: {
        type: Number,
        default: 0
    },
    rating: {
        type: Number,
        default: 4.5,
    },
    price: {
        type: Number,
        required: [true, 'A tour must have a price'],
    },
    priceDiscount: {
        type: Number,
        validate: {
            validator: function (val) {
                return val < this.price
            },
            message: "Price discount ({VALUE}) must be less than regular price"
        }
    },
    summary: {
        type: String,
        trim: true,
        required: [true, "A tour must have a description"]
    },
    description: {
        type: String,
        trim: true
    },
    imageCover: {
        type: String,
        required: [true, "A tour must have a cover image"]
    },
    images: [String],
    createdAt: {
        type: Date,
        default: Date.now(),
        select: false
    },
    startDates: [Date],
    secretTour: {
        type: Boolean,
        default: false
    },
    startLocation: {
        // GeoJSON is used to specify location params
        // the location requires documents or objects(in this case type and coordinates, must be atleast 2 field names) and sub documents
        type: {
            type: String,
            default: "Point",
            enum: ["Point"]
        },
        coordinates: [Number],
        address: String,
        description: String
    },
    locations: [
        {
            type: {
                type: String,
                default: "Point",
                enum: ["Point"]
            },
            coordinates: [Number],
            address: String,
            description: String,
            day: Number
        }
    ],
    slug: String,
    // guides: Array --- This is for embedding data
    guides: [ // this is for referencing 
        {
            type: mongoose.Schema.ObjectId,
            ref: "User"
        }
    ]
},
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true }
    }
);
// Single field index - example
// tourSchema.index({ price: 1 })

// Compound field index
tourSchema.index({ price: 1, ratingsAverage: -1 })
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: "2dsphere" });

tourSchema.virtual("durationWeeks").get(function () {
    return this.duration / 7;
})

// Virtual Populate 
tourSchema.virtual("reviews", {
    ref: "Review",
    foreignField: "tour", // this is what the current model is named in the other model where it is referenced
    localField: "_id" // the local field is what the current model (and subsequently the document) is in the DB, which is the _id
})

tourSchema.pre('save', function (next) {
    this.slug = slugify(this.name, { lower: true });
    next();
});

tourSchema.pre(/^find/, function (next) {
    this.populate(
        {
            path: "guides",
            select: "-__v -passwordChangedAt"
        }
    )
    next()
})

// HOW To EMBED/DENORMALIZE data into the database
// The User sends the ID from the client and the document is found and oersisted into the database
// tourSchema.pre("save", async function (next) {
//     const guidesPromises = this.guides.map(async id => await User.findById(id));

//     this.guides = await Promise.all(guidesPromises)
//     next();
// })

// DOCUMENT MIDDLEWARE, runs before .save() and .create()
// but not insertMany

// tourSchema.pre("save", function () {
//     console.log(this)
// })

// tourSchema.pre("save", function(next) {
//     console.log("will save document....")
//     next();
// })

// tourSchema.post("save", function(doc, next) {
//     console.log(doc)
//     next();
// })

// QUERY MIDDLERWARE

// tourSchema.pre(/^find/, function (next) {
//     this.find({
//         secretTour: { $ne: true }
//     })
//     next();
// })

// tourSchema.post(/^find/, function (docs,next) {
//     console.log(docs)
//     next();
// })

// AGGREGRATION MIDDLEWARE

// tourSchema.pre("aggregate", function (next) {

//     this.pipeline().unshift({
//         $match: { secretTour: { $ne: true } }
//     })

//     console.log(this.pipeline())

//     next();
// })

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;