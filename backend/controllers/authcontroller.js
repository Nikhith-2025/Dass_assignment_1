const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");


// Signup (participant only)
exports.signup = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      participantType,
      collegeOrganizationName,
      contactNumber,
      interests,
      recaptchaToken
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !participantType ||
      !collegeOrganizationName ||
      !contactNumber
    ) {
      return res.status(400).json({
        message: "All required participant fields must be provided"
      });
    }


    if (recaptchaToken) {
      try {
        const axios = require('axios');
        const secretKey = process.env.Captcha_SECRET_KEY;
        const response = await axios.post(
          `https://www.google.com/recaptcha/api/siteverify`,
          null,
          { params: { secret: secretKey, response: recaptchaToken } }
        );
        if (!response.data.success) {
          return res.status(400).json({ message: "reCAPTCHA verification failed. Please try again." });
        }
        if (response.data.score < 0.5) {
          return res.status(400).json({ message: "Suspicious activity detected. Please try again later." });
        }
      } catch (recaptchaError) {
        console.error('reCAPTCHA verification error:', recaptchaError.message);
        return res.status(500).json({ message: "Error verifying reCAPTCHA. Please try again." });
      }
    }

    if (participantType === "IIIT") {
      const emailDomain = email.toLowerCase().split('@')[1];
      if (emailDomain !== 'research.iiit.ac.in' && emailDomain !== 'students.iiit.ac.in') {
        return res.status(400).json({
          message: "IIIT participants must register using IIITH email (@research.iiit.ac.in or @students.iiit.ac.in)"
        });
      }
    }


    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }


    const hashedPassword = await bcrypt.hash(password, 10);


    const user = await User.create({
      role: "participant",
      firstName,
      lastName,
      email,
      password: hashedPassword,
      participantType,
      collegeOrganizationName,
      contactNumber,
      interests: interests || []
    });


    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "30m" }
    );

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      message: "Participant account created successfully",
      token,
      user: userResponse
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


// Login
exports.login = async (req, res) => {
  try {
    const { email, password, recaptchaToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required"
      });
    }


    if (recaptchaToken) {
      try {
        const axios = require('axios');
        const secretKey = process.env.Captcha_SECRET_KEY;

        const response = await axios.post(
          `https://www.google.com/recaptcha/api/siteverify`,
          null,
          {
            params: {
              secret: secretKey,
              response: recaptchaToken
            }
          }
        );

        if (!response.data.success) {
          return res.status(400).json({
            message: "reCAPTCHA verification failed. Please try again."
          });
        }


        if (response.data.score < 0.5) {
          return res.status(400).json({
            message: "Suspicious activity detected. Please try again later         lol."
          });
        }
      } catch (recaptchaError) {
        console.error('reCAPTCHA verification error:', recaptchaError.message);
        return res.status(500).json({
          message: "Error verifying reCAPTCHA. Please try again."
        });
      }
    }


    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }


    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }


    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      message: "Login successful",
      token,
      user: userResponse
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};