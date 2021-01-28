/* eslint-disable prettier/prettier */
const crypto = require("crypto")
const { promisify } = require("util")
const jwt = require("jsonwebtoken")
const catchAsync = require("../utils/catchAsync")
const User = require("../models/userModel");
const AppError = require("../utils/appError")
const Email = require("../utils/email.js")

const signToken = id => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    })
}

const createAndSendToken = (user, statusCode, req, res) => {
    const token = signToken(user._id)

    res.cookie("jwt", token, {
        expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: req.secure || req.headers("x-forwarded-proto") === "https"
    })

    // Remove USer password from being sent
    user.password = undefined;

    res.status(statusCode).json({
        status: "success",
        token,
        data: {
            user
        }
    });
}

exports.signUp = catchAsync(async (req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        role: req.body.role
    });

    const url = `${req.protocol}://${req.get("host")}/update-my-profile`
    await new Email(newUser, url).sendWelcome()

    createAndSendToken(newUser, 201, req, res)
}
)

exports.login = catchAsync(async (req, res, next) => {
    const { email, password } = req.body;

    // 1, check if email and password exists
    if (!email || !password) {
        return next(new AppError("Please provide email and password", 400));
        // 400 - BAD request
    }

    // 2 check if users exist && password is correct
    const user = await User.findOne({ email }).select("+password")

    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new AppError("Incorrect email or password", 401))
        // 401 - UnAuthorized
    }

    // 3 if everything is ok, send token
    createAndSendToken(user, 200, req, res)

}
)

exports.protect = catchAsync(async (req, res, next) => {
    // 1 get token and check if its there
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
        token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (!token) {
        return next(new AppError("You are not logged in! Please login to get access", 401))
        // 401 Unathorized
    }

    // 2 vefify token (verification)
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET)
    // console.log(decoded) this returns the id and other payload parameters

    // 3 check if user still exist
    const currentUser = await User.findById(decoded.id)
    if (!currentUser) {
        return next(new AppError("The user belonging to this token no longer exists", 401))
    }

    // 4 check if user changed passwords after the token was issued

    if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next(new AppError("User recently changed password! Please log in again", 401))
    }

    // attach the user to the request object (could be useful in future)
    req.user = currentUser;

    // Grant Access to protected route.
    next();
});

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        // using spread parameter turns the arguments into an array
        // roles ["admin", "lead-guide"]. user role = "user"

        if (!roles.includes(req.user.role)) {
            return next(new AppError("You do not have permissions to perform this action", 403))
            // 403 - Forbidden.
        }

        next();
    }
}

exports.forgotPassword = catchAsync(async (req, res, next) => {
    // 1 get user based on posted email
    const user = await User.findOne({ email: req.body.email })

    if (!user) {
        return next(new AppError("There is no user with this email address.", 404))
    }

    // 2 generate the random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // 3 send it to users email
    const resetUrl = `${req.protocol}//${req.get("host")}/api/v1/users/reset-password/${resetToken}`;

    // const message = `Forgot your password? Submit a PATCH request with your new password and password confirm
    // to: ${resetUrl}.\nIf you didnt forget your password, please ignore this email`;

    try {

        await new Email(user, resetUrl).sendPasswordReset()

        res.status(200).json({
            status: "success",
            message: "Token sent to email"
        });

    } catch (err) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        return (next(new AppError("There was an error sending the email, Try again later."), 500))
    }
})

exports.resetPassword = catchAsync(async (req, res, next) => {

    // Get user based on token
    const hashResetToken = crypto.createHash("sha256").update(req.params.token).digest("hex")

    const user = await User.findOne({
        passwordResetToken: hashResetToken,
        passwordResetExpires: { $gt: Date.now() }
    });

    // check if token has not expired and if theres a user, set new password
    if (!user) {
        return next(new AppError("Token is invalid or has expired", 400))
    }
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save()

    // 3 update changedPasswordat property for the user
    //this was done inside the user model as a middleware pre hoom function.

    //4 log user in and send JWT
    createAndSendToken(user, 200, req, res)

})

exports.updatePassword = catchAsync(async (req, res, next) => {
    // 1 get user from collection

    // console.log(req.user) NOTE req.user does not contain password

    const user = await User.findById(req.user.id).select("+password")

    // 2 check if posted password is correct
    if (!(await user.correctPassword(req.body.currentPassword, user.password))) {
        return next(new AppError("Your current password is wrong", 401))
    }

    // 3 if s0, uodate the password
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save()

    // 4 Log user in. send JWT
    createAndSendToken(user, 200, req, res)

})