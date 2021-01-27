/* eslint-disable prettier/prettier */
const crypto = require("crypto")
const mongoose = require("mongoose");
const validator = require("validator")
const bcrypt = require("bcryptjs")

// name, email, photo, password, passwordConfirm

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please tell us your name!"],
        max: 50
    },
    email: {
        type: String,
        required: [true, "Please provide your email"],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, "Please provide a valid email"]
    },
    role: {
        type: String,
        enum: ["user", "guide", "lead-guide", "admin"],
        default: "user"
    },
    photo: {
        type: String,
        default: "default.jpg"
    },
    password: {
        type: String,
        required: [true, "Please provide a password"],
        minlength: 8,
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, "Please confirm your password"],
        validate: {
            // This only works on SAVE or CREATE and not on findby ID and update
            validator: function (el) {
                return el === this.password
            },
            message: "Passwords are not the same"
        }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    }
})

// userSchema.virtual("bookings", {
//     ref: "Booking",
//     foreignField: "user", // this is what the current model is named in the other model where it is referenced
//     localField: "_id" // the local field is what the current model (and subsequently the document) is in the DB, which is the _id
// })

userSchema.pre("save", async function (next) {

    // Only run if password was modified
    if (!this.isModified("password")) return next();

    // hash password with cost of 12
    this.password = await bcrypt.hash(this.password, 12);

    // remove confirm password.
    this.passwordConfirm = undefined;
    next();
})

userSchema.pre("save", function (next) {
    if (!this.isModified("password") || this.isNew) return next();

    this.passwordChangedAt = Date.now() - 1000;
    next();
})

userSchema.pre(/^find/, function (next) {
    // this points to the current query and finds only users with active === true

    this.find({ active: { $ne: false } });
    next()
})

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        const changedTimeStamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10)

        return JWTTimestamp < changedTimeStamp;
    }

    return false;
}

userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    return await bcrypt.compare(candidatePassword, userPassword)
}

userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString("hex");

    this.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    this.passwordResetExpires = Date.now() + 10 * 60 * 1000

    // console.log({ resetToken }, this.passwordResetToken)

    return resetToken;
}

const User = mongoose.model("User", userSchema);

module.exports = User;
