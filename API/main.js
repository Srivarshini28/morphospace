require('dotenv').config();
const { MongoClient } = require('mongodb');
const express = require("express");
const cors = require("cors");
const jwt = require('jsonwebtoken');

// Environment Variables
const MONGO_URL = process.env.MONGO_URL || 'mongodb+srv://muthusivanpillai:muthu1510@cluster0.8yxbp.mongodb.net/';
const PORT = process.env.PORT || 8888;
const JWT_SECRET = process.env.JWT_SECRET || 'SECRET';

const app = express();
const client = new MongoClient(MONGO_URL);

// Middleware
app.use(cors());
app.use(express.json());

let db;

// Initialize MongoDB Connection
(async () => {
    try {
        await client.connect();
        db = client.db("Project");
        console.log("Connected to MongoDB");

        // Start the server after DB connection is established
        app.listen(PORT, () => {
            console.log(`Server started on port ${PORT}`);
        });
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
})();

// Routes

// Registration
app.post("/Reg", async (req, res) => {
    const { username, email, password, confirmPassword } = req.body;

    if (!username || !email || !password || !confirmPassword) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    try {
        const data = { username, email, password };
        await db.collection("login").insertOne(data);
        res.json({ success: true, message: "Registered successfully!" });
    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).json({ success: false, message: "Failed to register" });
    }
});

// Login
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    try {
        const user = await db.collection("login").findOne({ email, password });

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        const token = jwt.sign({ email: user.email }, JWT_SECRET, { expiresIn: '1h' });
        res.json({ success: true, token, message: "Login successful!" });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ success: false, message: "Failed to login" });
    }
});

// User Management
app.post('/user', async (req, res) => {
    const { firstname, lastname, email, address, contactno, city, state, password } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    try {
        const existingUser = await db.collection("Details").findOne({ email });

        if (existingUser) {
            await db.collection("Details").updateOne(
                { email },
                { $set: { firstname, lastname, address, contactno, city, state } }
            );
            return res.status(200).json({ message: 'User updated successfully' });
        } else {
            const newUser = { firstname, lastname, email, address, contactno, city, state, password };
            await db.collection("Details").insertOne(newUser);
            return res.status(201).json({ message: 'User created successfully', user: newUser });
        }
    } catch (error) {
        console.error("Error managing user:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Feedback
app.post("/Feedback", async (req, res) => {
    const { name, email, review_star, review } = req.body;

    if (!name || !email || !review_star || !review) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    try {
        const data = { name, email, review_star, review };
        await db.collection("feedback").insertOne(data);
        res.json({ success: true, message: "Review added successfully!" });
    } catch (error) {
        console.error("Error adding feedback:", error);
        res.status(500).json({ success: false, message: "Failed to add feedback" });
    }
});

app.get('/disfeedback', async (req, res) => {
    try {
        const feedback = await db.collection("feedback").find({}, { projection: { _id: 0, name: 1, review_star: 1, review: 1 } }).toArray();
        res.json(feedback);
    } catch (error) {
        console.error("Error fetching feedback:", error);
        res.status(500).json({ error: 'Error fetching feedback data' });
    }
});

// Product Details
app.post("/saveDetails", async (req, res) => {
    const { title, tagline } = req.body;

    if (!title || !tagline) {
        return res.status(400).json({ success: false, message: "Both title and tagline are required" });
    }

    try {
        const data = { title, tagline };
        await db.collection("products").insertOne(data);
        res.json({ success: true, message: "Details saved successfully!" });
    } catch (error) {
        console.error("Error saving details:", error);
        res.status(500).json({ success: false, message: "Failed to save details" });
    }
});

app.get('/cartItems', async (req, res) => {
    try {
        const cartItems = await db.collection("products").find({}).toArray();
        const formattedCartItems = cartItems.map(item => ({ ...item, quantity: item.quantity || 1 }));
        res.json(formattedCartItems);
    } catch (error) {
        console.error("Error fetching cart items:", error);
        res.status(500).json({ message: "Failed to fetch cart items" });
    }
});

// Reviews
app.post("/addReview", async (req, res) => {
    const { name, review } = req.body;

    if (!name || !review) {
        return res.status(400).json({ message: "Name and review are required" });
    }

    try {
        const newReview = { name, review, createdAt: new Date() };
        await db.collection("Review").insertOne(newReview);
        res.status(201).json({ message: "Review added successfully" });
    } catch (error) {
        console.error("Error adding review:", error);
        res.status(500).json({ message: "Failed to add review" });
    }
});

app.get("/getReviews", async (req, res) => {
    try {
        const reviews = await db.collection("Review").find().sort({ createdAt: -1 }).toArray();
        res.status(200).json(reviews);
    } catch (error) {
        console.error("Error fetching reviews:", error);
        res.status(500).json({ message: "Failed to fetch reviews" });
    }
});


/* the API for editing the password with phone otp or email otp  */
/*
const express = require('express');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const twilio = require('twilio'); // Optional: for SMS
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com', // Replace with your email
    pass: 'your-email-password', // Replace with your email password
  },
});

// Twilio Configuration (optional for SMS)
const twilioClient = twilio('ACCOUNT_SID', 'AUTH_TOKEN'); // Replace with Twilio credentials

// In-memory OTP store (replace with a database for production)
const otpStore = {};

// Step 1: Request OTP
app.post('/request-otp', async (req, res) => {
  const { identifier } = req.body; // Can be phone or email
  const otp = crypto.randomInt(100000, 999999); // Generate a 6-digit OTP
  otpStore[identifier] = otp; // Store OTP temporarily

  try {
    if (identifier.includes('@')) {
      // Send OTP via email
      await transporter.sendMail({
        from: 'your-email@gmail.com',
        to: identifier,
        subject: 'Password Reset OTP',
        text: `Your OTP for password reset is: ${otp}`,
      });
      return res.json({ success: true, message: 'OTP sent to email.' });
    } else {
      // Send OTP via SMS
      await twilioClient.messages.create({
        body: `Your OTP for password reset is: ${otp}`,
        from: '+1234567890', // Replace with your Twilio number
        to: identifier,
      });
      return res.json({ success: true, message: 'OTP sent to phone.' });
    }
  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({ success: false, message: 'Error sending OTP.' });
  }
});

// Step 2: Verify OTP and Reset Password
app.post('/reset-password', (req, res) => {
  const { identifier, otp, newPassword } = req.body;

  if (otpStore[identifier] && otpStore[identifier] === parseInt(otp)) {
    // OTP is valid, proceed with password reset
    delete otpStore[identifier]; // Remove OTP after successful verification

    // Save new password in the database (mock example)
    // Assume `users` is a database collection
    // users.updateOne({ identifier }, { $set: { password: newPassword } });

    return res.json({ success: true, message: 'Password reset successfully.' });
  } else {
    return res.status(400).json({ success: false, message: 'Invalid OTP.' });
  }
});

// Start the server
app.listen(5000, () => {
  console.log('Server running on port 5000');
});
 */