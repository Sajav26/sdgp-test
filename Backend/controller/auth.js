import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import User from '../models/User.js';

const generatePin = () => Math.floor(1000 + Math.random() * 9000);

export const signup = async (req, res) => {
    const { name, email, password, userType, adminId, registrationNumber, organizationType } = req.body;

    // TODO: Validate userType
    if (!['individual', 'organization', 'admin'].includes(userType)) {
        return res.status(400).json({ message: "Invalid user type" });
    }

    // TODO: Validate organizationType if userType is organization
    if (userType === 'organization' && !['donor', 'recipient'].includes(organizationType)) {
        return res.status(400).json({ message: "Invalid organization type. Must be 'donor' or 'recipient'." });
    }

    try {
        // ? Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // TODO: Validate adminId for admin users
        if (userType === 'admin' && !adminId) {
            return res.status(400).json({ message: "Admin ID is required for admin users" });
        }

        // TODO: Validate registrationNumber for organizations
        if (userType === 'organization' && !registrationNumber) {
            return res.status(400).json({ message: "Registration Number is required for organizations" });
        }

        // * Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // * Generate verification PIN
        const verificationPin = generatePin();

        // * Create a new user
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            userType,
            verificationPin,
            adminId: userType === 'admin' ? adminId : undefined,
            registrationNumber: userType === 'organization' ? registrationNumber : undefined,
            organizationType: userType === 'organization' ? organizationType : undefined,
        });

        await newUser.save();

        // * Prepare email content based on userType and organizationType
        let subject;
        let htmlContent;

        if (userType === 'individual') {
            subject = "Don't reply: Verify Your Email (Individual)";
            htmlContent = `
                <h2>Your verification PIN is:</h2>
                <p>${verificationPin}</p>
                <p>Enter this PIN to verify your email for your Individual account.</p>
            `;
        } else if (userType === 'organization') {
            if (organizationType === 'donor') {
                subject = "Don't reply: Verify Your Email (Donor)";
                htmlContent = `
                    <h2>Your verification PIN is:</h2>
                    <p>${verificationPin}</p>
                    <p>Enter this PIN to verify your email for your Donor account.</p>
                `;
            } else if (organizationType === 'recipient') {
                subject = "Don't reply: Verify Your Email (Recipient)";
                htmlContent = `
                    <h2>Your verification PIN is:</h2>
                    <p>${verificationPin}</p>
                    <p>Enter this PIN to verify your email for your Recipient account.</p>
                `;
            } else {
                throw new Error("Invalid organization type");
            }
        } else if (userType === 'admin') {
            subject = "Don't reply: Verify Your Email (Admin)";
            htmlContent = `
                <h2>Your verification PIN is:</h2>
                <p>${verificationPin}</p>
                <p>Enter this PIN to verify your email for Admin registration.</p>
            `;
        } else {
            throw new Error("Invalid user type");
        }        

        // ! Send verification email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.USER_EMAIL,
                pass: process.env.USER_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.USER_EMAIL,
            to: email,
            subject: subject,
            html: htmlContent,
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json({ message: 'Signup successful! Check your email for the verification PIN.' });
    } catch (err) {
        res.status(500).json({ message: "[ERROR]: Something went wrong" });
    }
};

export const verifyPin = async (req, res) => {
    const { email, pin } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User does not exist" });
        }

        if (user.verificationPin !== pin) {
            return res.status(400).json({ message: "Invalid PIN" });
        }

        user.isVerified = true;
        user.verificationPin = null;
        await user.save();

        res.status(200).json({ message: "Email verified successfully" });
    } catch (err) {
        res.status(500).json({ message: "[ERROR]: Something went wrong" });
    }
};

export const login = async (res,req) => {
    const {email, name, password} = req.body;

    try{
        // ! Ensure atleast one idtifier and password provided
        if((!email && !password) || !password){
            return res.status(400).json({message: "Email or name and password are required"});
        }

        // * Find the user by email or name
        const user = await User.findOne({
            $or: [{email},{name}]
        });

        if(!user){
            return req.status(400).json({message: "User does not exist"});
        }

        // ! Check if the user is verified
        if(!user.isVerified){
            return res.status(400).json({message: "Email not verified"});
        }

        // TODO: Verify the password
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if(!isPasswordCorrect){
            return res.status(400).json({message: "Invalid credentials"});
        }

        // * Generate a token
        const token = jwt.sign(
            {id: user._id, userType: user.userType},
            process.env.SERCERT_KEY,
            {expiresIn: '1h'}
        );

        res.status(200).json({
            message: "Login successful",
            userType: user.userType,
            token
        });
    }catch(err){
        res.status(500).json({message: "[ERROR]: Something went wrong"});
    }
};