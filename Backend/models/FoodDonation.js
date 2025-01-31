import mongoose from "mongoose";

const donationSchema = new mongoose.Schema({
    donor: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    foodType: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    expirationDate: {
        type: Date,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    pickupTime: {
        type: String,
        required: true
    },
    contactInfo: {
        type: String,
        required: true
    },
    images: {
        type: [String],
        default: []
    },
    status: {
        type: String,
        enum: ["pending", "accepted", "rejected"],
        default: "pending"
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model("FoodDonation", donationSchema);
