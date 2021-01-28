/* eslint-disable prettier/prettier */
const path = require("path")
const express = require("express");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit")
const helmet = require("helmet")
const mongoSanitize = require("express-mongo-sanitize")
const xss = require("xss-clean")
const hpp = require("hpp")
const compression = require("compression")

const tourRouter = require("./routes/tourRoutes")
const userRouter = require("./routes/userRoutes")
const reviewRouter = require("./routes/reviewRoutes")
const viewRouter = require("./routes/viewRoutes")
const bookingRouter = require("./routes/bookingRoutes")
const AppError = require("./utils/appError")
const globalErrorHandler = require("./controllers/errorController")

const app = express();

// Heroku is a proxy(modifies incoming requests before passing it into our app), and hence we need to tell express we can trust it
app.enable("trust proxy");

app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"))

// GLOBAL MIDDLEWARE

// app.use(function (req, res, next) {
//     res.setHeader(
//         'Content-Security-Policy',
//         "default-src *; https://* http://*; font-src *; img-src *; script-src  https://* http://* 'unsafe-inline' 'unsafe-eval'; connect-src 'self' ws://localhost:52004/ 'unsafe-inline' 'unsafe-eval';  style-src 'self' https://* http://*; frame-src *"

//     )
//     next()
// })

// serving static files
app.use(express.static(path.join(__dirname, "public")))

// Set security http headers
app.use(helmet())

// Development logging
if (process.env.NODE_ENV === "development") {
    app.use(morgan("dev"))
}


// limits API requests form /api
const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: "Too many requests from this IP, please try again in an Hour!"
})

app.use("/api", limiter)

// reading data from  the body into req.body
app.use(express.json({
    limit: "10kb"
}))

// Data sanitization against NoSQL query Injection
app.use(mongoSanitize());

// Data sanitization against XSS (cross site scripting)
app.use(xss());

// Prevent parameter pollution
app.use(hpp({
    whitelist: [
        "duration",
        "ratingsQuantity",
        "ratingsAverage",
        "maxGroupSize",
        "difficulty",
        "price"
    ]
}))

app.use(compression())

// Test middleware
// app.use((req, res, next) => {
//     req.requestTime = new Date().toISOString();
//     // console.log(req.headers)
//     next();
// })

app.use("/", viewRouter)
app.use("/api/v1/tours", tourRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/reviews", reviewRouter)
app.use("/api/v1/bookings", bookingRouter)

app.all("*", (req, res, next) => {
    next(new AppError(`Cant find ${req.originalUrl} on this server`, 404))
})

app.use(globalErrorHandler)

module.exports = app;
