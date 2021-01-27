/* eslint-disable prettier/prettier */
// const fs = require("fs")
const multer = require("multer");
const sharp = require("sharp")
const Tour = require("../models/tourModel")
// const APIFeatures = require("../utils/apiFeatures")
const catchAsync = require("../utils/catchAsync")
const AppError = require("../utils/appError")
const factory = require("./handlerFactory")

// const tours = JSON.parse(
//     fs.readFileSync(`${__dirname}/../dev-data/data/tours-simple.json`)
// )

// exports.checkId = (req, res, next, val) => {
//     // console.log(`The id of the route is ${val}`)

//     const id = req.params.id * 1

//     if (id > tours.length) {
//         return res.status(404).json({
//             status: "fail",
//             message: "Invalid ID"
//         })
//     }
//     next();
// }

const multerStorage = multer.memoryStorage() // memory storage saves files as buffers

const multerFilter = (req, file, cb) => {
    if (file.mimetype.startsWith("image")) {
        cb(null, true);
    } else {
        cb(new AppError("Now an image! Please upload only images.", 400), false);
    }
}

const upload = multer({
    storage: multerStorage,
    fileFilter: multerFilter
});

// upload.fields() multiple images of varying numbers
// upload.single("image") single image
// upload.array("images", 5) // multiple images of same name
exports.uploadTourImages = upload.fields([
    { name: "imageCover", maxCount: 1 },
    { name: "images", maxCount: 3 }
]);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
    // console.log(req.files)

    if (!req.files.imageCover || !req.files.images) return next();

    // 1 IMAGE COVER
    req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`

    await sharp(req.files.imageCover[0].buffer)
        .resize(2000, 1333)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(`public/img/users/${req.body.imageCover}`)

    // 2 IMAGES
    req.body.images = [];

    await Promise.all(
        req.files.images.map(async (file, i) => {
            const filename = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`

            await sharp(file.buffer)
                .resize(2000, 1333)
                .toFormat("jpeg")
                .jpeg({ quality: 90 })
                .toFile(`public/img/users/${filename}`)

            req.body.images.push(filename)
        })
    );

    next();
})



exports.aliasTours = (req, res, next) => {
    req.query.limit = "5";
    req.query.sort = "-ratingsAverage,price";
    req.query.fields = "name,price,ratingsAverage,summary,difficulty"
    // console.log(req.query)
    next();
}

// exports.getAllTours = catchAsync(async (req, res, next) => {

//     //  EXECUTE QUERY
//     const features = new APIFeatures(Tour.find(), req.query).filter().sort().limitFields().paginate()
//     const tours = await features.query

//     // SEND RESPONSE
//     res.status(200).json({
//         status: "success",
//         results: tours.length,
//         data: {
//             tours
//         }
//     })
// })

// exports.getTour = catchAsync(async (req, res, next) => {
//     // const id = req.params.id * 1
//     // const tour = tours.find(el => el.id === id);

//     //findById: this is same as writing Tour.findOne({_id: req.params.id})
//     const tour = await Tour.findById(req.params.id).populate("reviews")

//     if (!tour) {
//         return next(new AppError("No Tour found with that ID", 404))
//     }

//     res.status(200).json({
//         status: "success",
//         data: {
//             tour
//         }
//     })

// })

// exports.createTour = catchAsync(async (req, res, next) => {
//     // method 1, create instance of Tour using the Tour details and call save method
//     //  const newTour = new Tour({})
//     // newTour.save()

//     // For error handling

//     const newTour = await Tour.create(req.body)

//     res.status(201).json(
//         {
//             status: "success",
//             data: { tour: newTour }
//         }
//     )

// })

exports.getAllTours = factory.getAll(Tour)
exports.getTour = factory.getOne(Tour, { path: "reviews" })
exports.createTour = factory.createOne(Tour)
exports.updateTour = factory.updateOne(Tour)
exports.deleteTour = factory.deleteOne(Tour)


exports.getTourStats = catchAsync(async (req, res, next) => {
    const stats = await Tour.aggregate([
        {
            $match: { ratingsAverage: { $gte: 4.5 } }
        },
        {
            $group: {
                _id: { $toUpper: "$difficulty" },
                numTours: { $sum: 1 },
                numRatings: { $sum: "$ratingsQuantity" },
                avgRating: { $avg: "$ratingsAverage" },
                avgPrice: { $avg: "$price" },
                minPrice: { $min: "$price" },
                maxPrice: { $max: "$price" }
            }
        },
        {
            $sort: { avgPrice: 1 }
        }
    ])
    res.status(200).json({
        status: "success",
        data: {
            stats
        }
    }
    )
    // try {
    // } catch (err) {
    //     res.status(400).json({
    //         status: "fail",
    //         message: err
    //     })
    // }
})

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
    const year = req.params.year * 1
    const stats = await Tour.aggregate([
        {
            $unwind: "$startDates"
        },
        {
            $match: {
                startDates: {
                    $gte: new Date(`${year}-01-01`),
                    $lte: new Date(`${year}-12-31`)
                }
            }
        },
        {
            $group: {
                _id: { $month: "$startDates" },
                numTourStarts: { $sum: 1 },
                tours: { $push: "$name" }
            }
        },
        {
            $addFields: { month: "$_id" }
        },
        {
            $project: {
                _id: 0
            }
        },
        {
            $sort: {
                numTourStarts: -1
            }
        },
        {
            $limit: 12
        },
    ])
    res.status(200).json({
        status: "success",
        data: {
            stats
        }
    }
    )
    // try {
    // } catch (err) {
    //     res.status(400).json({
    //         status: "fail",
    //         message: err
    //     })
    // }
})

// /tours-within/:distance/center/:latlng/unit/:unit
// latlng = 34.111745, -118.113491
exports.getToursWithin = catchAsync(async (req, res, next) => {
    const { distance, latlng, unit } = req.params;
    const [lat, lng] = latlng.split(",")

    // radius can only be in radians

    const radius = unit === "mi" ? distance / 3963.2 : distance / 6378.1;

    if (!lat || !lng) {
        return next(new AppError("Please provide latitude and longitude in the format lat,lng", 400))
    }

    // console.log(distance, lat, lng, unit)

    const tours = await Tour.find({
        startLocation: {
            $geoWithin: {
                $centerSphere: [[lng, lat], radius]
            }
        }
    });

    res.status(200).json({
        status: "success",
        results: tours.length,
        data: {
            data: tours
        }
    })
})

exports.getTourDistances = catchAsync(async (req, res, next) => {
    const { latlng, unit } = req.params;
    const [lat, lng] = latlng.split(",")

    const multiplier = unit === "mi" ? 0.000621371 : 0.001

    if (!lat || !lng) {
        return next(new AppError("Please provide latitude and longitude in the format lat,lng", 400))
    }

    const distances = await Tour.aggregate([
        {
            $geoNear: {
                near: {
                    type: "Point",
                    coordinates: [lng * 1, lat * 1]
                },
                distanceField: "distance",
                distanceMultiplier: multiplier
            }
        },
        {
            $project: {
                distance: 1,
                name: 1
            }
        }
    ])

    res.status(200).json({
        status: "success",
        data: {
            data: distances
        }
    })
})
