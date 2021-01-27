/* eslint-disable prettier/prettier */
const express = require("express");

const { getAllUsers,
    createUser,
    getUser,
    updateUser,
    deleteUser, updateMyProfile, deleteMyProfile, getMyProfile, uploadUserPhoto, resizeUserPhoto } = require("../controllers/userController")

const { signUp, login, forgotPassword, resetPassword, updatePassword, protect, restrictTo } = require("../controllers/authController")


const router = express.Router()

router.post("/sign-up", signUp)
router.post("/login", login)
router.patch("/reset-password/:token", resetPassword)
router.post("/forgot-password", forgotPassword)

// Authentication - For Protected routes - protects all routes aftter this middleware
router.use(protect)

router.patch("/update-my-password", updatePassword)

router.get("/get-my-profile", getMyProfile, getUser)
router.patch("/update-my-profile", uploadUserPhoto, resizeUserPhoto, updateMyProfile)
router.delete("/delete-my-profile", deleteMyProfile)

//Authorization - This route is restricted to only adminstrators - restricts all routes to admins after this middleware
router.use(restrictTo("admin"))

router.route("/").get(getAllUsers).post(createUser)
router.route("/:id").get(getUser).patch(updateUser).delete(deleteUser)

module.exports = router;
