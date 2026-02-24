const express = require("express");
const { signup, login } = require("../controllers/authcontroller");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
const authMiddleware = require("../middleware/authmiddleware");

router.get("/me", authMiddleware, (req, res) => {
  res.json({
    message: "Protected route working",
    user: req.user
  });
});

module.exports = router;