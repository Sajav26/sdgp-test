import FoodDonation from '../models/FoodDonation.js';
import FoodPurchase from '../models/FoodPurchase.js';
import User from '../models/User.js';

export const donateFood = async (req, res) => {
    const { foodType, quantity, expirationDate, location, pickupTime, contactInfo, recipientId } = req.body;

    // Validation for missing fields
    if (!foodType || !quantity || !expirationDate || !location || !pickupTime || !contactInfo || !recipientId) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        const donor = await User.findById(req.userId);

        // Check if the user is an individual
        if (donor.userType !== "individual") {
            return res.status(403).json({ message: "Only individuals can donate food" });
        }

        // Optionally, find recipient if provided
        const recipient = recipientId ? await User.findById(recipientId) : null;

        // Create a new donation
        const donation = new FoodDonation({
            donor: donor._id,
            foodType,
            quantity,
            expirationDate,
            location,
            pickupTime,
            contactInfo,
            recipient: recipient ? recipient._id : null
        });

        // Save the donation
        await donation.save();
        res.status(201).json({ message: "Donation created successfully" });

    } catch (error) {
        console.error("[DONATION FOOD ERROR]", error.message); // Log the error message for debugging
        res.status(500).json({ message: "Failed to create donation" });
    }
};

export const buyFood = async (req, res) => {
    const { resturant, foodType, quantity, price, discount } = req.body;

    if (!resturant || !foodType || !quantity || !price || !discount) {
        return res.status(400).json({ message: "Missing required fields" });
    }

    try {
        const buyer = await User.findById(req.userId);
        if (buyer.userType !== "individual") {
            return res.status(403).json({message: "Only individuals can buy food"});
        }
        
        // Calculate the total price using the formula
        const totalPrice = price * quantity * (1 - discount / 100);
        console.log(`Calculated totalPrice: ${totalPrice}`);

        const purchase = new FoodPurchase({
            buyer: buyer._id,
            resturant,
            foodType,
            quantity,
            price,
            discount,
            totalPrice,
            purchaseDate: new Date()
        });

        await purchase.save();
        res.status(201).json({ message: "Food purchased successfully" });

    } catch (error) {
        console.error("[BUY FOOD ERROR]", error);
        res.status(500).json({ message: "Failed to purchase food", error: error.message });
    }
};