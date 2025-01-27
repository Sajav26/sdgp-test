import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import User from '../models/User.js';

const generatePin = () => Math.floor(1000 + Math.random() * 9000);

// * Signup function
export const signup = async (req, res) => {
    const { name, email, password, userType, adminId, registrationNumber, organiztionType} = req.body;

    // ! Ensure all fields are provided
    if(!['individual', 'organization', 'admin'].includes(userType)){
        return res.status(400).json({message: "Invalid user type"});
    }

    if(userType == 'organization' && !['donor', 'recipient'].includes(organiztionType)){
        return res.status(400).json({message: "Invaild organization type. Must be 'donor' or 'recipient'"});
    }

    try{
        // * Check if the user already exists
        const existingUser = await User.findOne({email});
        if(existingUser){
            return res.status(400).json({message: "User already exists"});
        }

        // TODO: validate adminId for admin users
        if(userType === 'admin'&& !adminId){
            return res.status(400).json({message: "Admin ID is required for admin users"});
        }

        // TODO: Validate registrationNumber for organization users
        if(userType === 'organization' && !registrationNumber){
            return res.status(400).json({message: "Registration number is required for organization users"});
        }

        // * Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // * Generate a verification pin
        const verificationPin = generatePin();

        // * Create the user
        const newUser = new User({
            name,
            email,
            password: hashedPassword,
            userType,
            verificationPin,
            adminId: userType === 'admin' ? adminId: undefined,
            registrationNumber: userType === 'organization' ? registrationNumber: undefined,
            organizationType: userType === 'organization' ? organiztionType: undefined
        });

        await newUser.save();

        // * Prepare the email
        let subject, htmlContent;

        if (userType === 'individual') {
            subject = "Don't reply: Verify Your Email (Individual)";
            htmlContent = `
                <h2>Your verification PIN is:</h2>
                <p>${verificationPin}</p>
                <p>Enter this PIN to verify your email for your Individual account.</p>
            `;
        } else if (userType === 'organization') {
            subject = `Don't reply: Verify Your Email (${organizationType === 'donor' ? 'Donor' : 'Recipient'})`;
            htmlContent = `
                <h2>Your verification PIN is:</h2>
                <p>${verificationPin}</p>
                <p>Enter this PIN to verify your email for your ${organizationType === 'donor' ? 'Donor' : 'Recipient'} account.</p>
            `;
        } else if (userType === 'admin') {
            subject = "Don't reply: Verify Your Email (Admin)";
            htmlContent = `
                <h2>Your verification PIN is:</h2>
                <p>${verificationPin}</p>
                <p>Enter this PIN to verify your email for Admin registration.</p>
            `;
        }

        // * Send verification email
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth:{
                user: process.env.USER_EMAIL,
                pass: process.env.USER_PASSWORD,
            },
        });

        const mailOptions = {
            from: process.env.USER_EMAIL,
            to: email,
            subject,
            html: htmlContent,
        };

        await transporter.sendMail(mailOptions);

        res.status(201).json({message: "User created successfully. Check your email for verification"});
    } catch(err){
        res.status(500).json({message: "[ERROR]: Something went wrong"});
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