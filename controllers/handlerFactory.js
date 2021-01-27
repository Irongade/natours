/* eslint-disable prettier/prettier */
const catchAsync = require("../utils/catchAsync")
const AppError = require("../utils/appError")
const APIFeatures = require("../utils/apiFeatures")

exports.deleteOne = Model => catchAsync(async (req, res, next) => {

    const doc = await Model.findByIdAndDelete(req.params.id)

    if (!doc) {
        return next(new AppError("No document found with that ID", 400))
    }

    res.status(204).json({
        status: "success",
        data: null
    })
})

exports.updateOne = Model => catchAsync(async (req, res, next) => {

    const doc = await Model.findByIdAndUpdate(req.params.id, req.body,
        {
            new: true,
            runValidators: true
        })

    if (!doc) {
        return next(new AppError("No document found with that ID", 404))
    }

    res.status(200).json({
        status: "success",
        data: {
            data: doc
        }
    })
})

exports.createOne = Model => catchAsync(async (req, res, next) => {

    const doc = await Model.create(req.body)

    res.status(201).json(
        {
            status: "success",
            data: { data: doc }
        }
    )

})

exports.getOne = (Model, populateOptions) => catchAsync(async (req, res, next) => {
    // queries can be saved in variables, more queries can be added to it till we complete all the queries we want to achieve then we await the final results.
    let query = Model.findById(req.params.id)
    if (populateOptions) query = query.populate(populateOptions)
    const doc = await query

    if (!doc) {
        return next(new AppError("No document found with that ID", 404))
    }

    res.status(200).json({
        status: "success",
        data: {
            data: doc
        }
    })
})

exports.getAll = Model => catchAsync(async (req, res, next) => {

    // To allow for nested Get reviews on tour {hack}
    let filter = {};
    if (req.params.tourId) filter = { tour: req.params.tourId }

    //  EXECUTE QUERY
    const features = new APIFeatures(Model.find(filter), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate()

    // .explain() tells us details of the query made, no of docs examined and all 
    // const doc = await features.query.explain() - example
    const doc = await features.query


    // SEND RESPONSE
    res.status(200).json({
        status: "success",
        results: doc.length,
        data: {
            data: doc
        }
    })
})