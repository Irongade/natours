/* eslint-disable prettier/prettier */
const multer = require("multer");
const sharp = require("sharp")
const User = require("../models/userModel")
const catchAsync = require("../utils/catchAsync")
const AppError = require("../utils/appError");
const factory = require("./handlerFactory")

// For implementing disk storage
// const multerStorage = multer.diskStorage({ //disk storage saves files normally
//     destination: (req, file, cb) => {
//         cb(null, "public/img/users")
//     },
//     filename: (req, file, cb) => {
//         const ext = file.mimetype.split("/")[1];
//         cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//     }
// })

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

exports.uploadUserPhoto = upload.single("photo");

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
    if (!req.file) return next();

    // console.log(req.file)
    req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`

    await sharp(req.file.buffer)
        .resize(500, 500)
        .toFormat("jpeg")
        .jpeg({ quality: 90 })
        .toFile(`public/img/users/${req.file.filename}`)

    next();
})


const filterObj = (obj, ...allowedFields) => {
    const newObj = {}
    Object.keys(obj).forEach(el => {
        if (allowedFields.includes(el)) newObj[el] = obj[el]
    })
    return newObj;
}

exports.getMyProfile = (req, res, next) => {
    req.params.id = req.user.id
    next()
}

exports.updateMyProfile = catchAsync(async (req, res, next) => {

    // 1 create error if user posts password data
    if (req.body.password || req.body.passwordConfirm) {
        return next(new AppError("This route is not for password updates, please use /update-my-password", 400))
    }

    // filter our unwanted field names not allowed to be updated
    const filteredBody = filterObj(req.body, "name", "email");
    if (req.file) filteredBody.photo = req.file.filename;

    //2 Update user document
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        status: "success",
        data: {
            user: updatedUser
        }
    })
})

exports.deleteMyProfile = catchAsync(async (req, res, next) => {
    // get user profile from protect function
    await User.findByIdAndUpdate(req.user.id, { active: false })

    res.status(204).json({
        status: "success",
        data: null
    })
})

exports.createUser = (req, res) => {
    res.status(500).json({
        status: "error",
        message: "this route is not defined! Please use /sign-up"
    })
}

// exports.getAllUsers = catchAsync(async (req, res, next) => {
//     const users = await User.find()

//     res.status(200).json({
//         status: "success",
//         results: users.length,
//         data: {
//             users
//         }
//     })
// })

exports.getAllUsers = factory.getAll(User)
exports.getUser = factory.getOne(User)
exports.updateUser = factory.updateOne(User)
exports.deleteUser = factory.deleteOne(User);