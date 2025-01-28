import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import User from "../models/User.js";

// Helper function to generate a random 4-digit PIN
const generatePin = () => Math.floor(1000 + Math.random() * 9000);

// * Signup function
export const signup = async (req, res) => {
    const { name, email, password, userType, registrationNumber, organizationType } = req.body;

    // Validation for required fields
    if (!name || !email || !password || !userType) {
        return res.status(400).json({ message: "All fields are required" });
    }

    // Validate user type
    const validUserTypes = ["individual", "organization", "admin"];
    if (!validUserTypes.includes(userType)) {
        return res.status(400).json({ message: "Invalid user type" });
    }

    // Validate organization type
    if (userType === "organization") {
        if (!["donor", "recipient"].includes(organizationType)) {
            return res.status(400).json({ message: "Invalid organization type. Must be 'donor' or 'recipient'." });
        }
        if (!registrationNumber) {
            return res.status(400).json({ message: "Registration number is required for organizations." });
        }
    }

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate verification PIN
        const verificationPin = generatePin();

        // Create user
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            userType,
            verificationPin,
            registrationNumber: userType === "organization" ? registrationNumber : undefined,
            organizationType: userType === "organization" ? organizationType : undefined,
        });

        // Save the user
        await newUser.save();

        // Email setup
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.USER_EMAIL,
                pass: process.env.USER_PASSWORD,
            },
        });

        // Email content
        const subject = `Don't reply: Verify Your Email (${userType})`;
        const htmlContent = `
            <h2>Your verification PIN is:</h2>
            <p>${verificationPin}</p>
            <p>Enter this PIN to verify your email for ${userType} registration.</p>
        `;

        // Send email
        const mailOptions = {
            from: process.env.USER_EMAIL,
            to: email,
            subject,
            html: htmlContent,
        };

        await transporter.sendMail(mailOptions);

        // Success response
        res.status(201).json({ message: `${userType} created successfully. Check your email for verification.` });
    } catch (err) {
        console.error("[SIGNUP ERROR]:", err);
        res.status(500).json({ message: "[ERROR]: Registration failed." });
    }
};

// * Verify PIN function
export const verifyPin = async (req, res) => {
    const { email, pin } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User does not exist." });
        }

        if (user.verificationPin !== pin) {
            return res.status(400).json({ message: "Invalid PIN." });
        }

        user.isVerified = true;
        user.verificationPin = null;
        await user.save();

        res.status(200).json({ message: "Email verified successfully." });
    } catch (err) {
        console.error("[VERIFY PIN ERROR]:", err);
        res.status(500).json({ message: "[ERROR]: Verification failed." });
    }
};

// * Login function
export const login = async (req, res) => {
    const { email, name, password } = req.body;

    if (!email && !name) {
        return res.status(400).json({ message: "Email or name is required." });
    }
    if (!password) {
        return res.status(400).json({ message: "Password is required." });
    }

    try {
        const user = await User.findOne({ $or: [{ email }, { name }] });
        if (!user) {
            return res.status(400).json({ message: "User does not exist." });
        }

        if (!user.isVerified) {
            return res.status(400).json({ message: "Email not verified." });
        }

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: "Invalid credentials." });
        }

        const token = jwt.sign(
            { id: user._id, userType: user.userType },
            process.env.SECRET_KEY,
            { expiresIn: "1h" }
        );

        res.status(200).json({
            message: "Login successful.",
            userType: user.userType,
            token,
        });
    } catch (err) {
        console.error("[LOGIN ERROR]:", err);
        res.status(500).json({ message: "[ERROR]: Login failed." });
    }
};
