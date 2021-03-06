/* eslint-disable prettier/prettier */
const Tour = require("../models/tourModel")
const catchAsync = require("../utils/catchAsync")

exports.getOverview = catchAsync(async (req, res) => {
    // 1) Get tour data
    const tours = await Tour.find()

    // 2) build template

    // 3) Render that template using tour data

    res.status(200).render("overview", {
        title: "All tours",
        tours
    })
})

exports.getTour = catchAsync(async (req, res) => {
    // 1) get tour data using slug
    const tour = await Tour.findOne({ slug: req.params.slug }).populate({
        path: "reviews",
        fields: "review rating user"
    })

    // 2) build the template

    // 3) render and send back the template

    res.status(200).render("tour", {
        title: `${tour.name} Tour`,
        tour
    })
})

exports.getLoginForm = catchAsync(async (req, res, next) => {
    res.status(200).render("login", {
        title: "Login to your account"
    })
})