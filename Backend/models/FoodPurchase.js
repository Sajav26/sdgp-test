import mongoose from "mongoose";

const purchaseSchema = new mongoose.Schema({
    buyer:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    resturant:{
        type: String,
        required: true
    },
    foodType:{
        type: String,
        required: true
    },
    quantity:{
        type: Number,
        required: true,
        min: 1
    },
    price:{
        type: Number,
        required: true,
    },
    discount:{
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    totalPrice:{
        type: Number,
        required: true
    },
    purchaseDate:{
        type: Date,
        required: true
    },
});

purchaseSchema.pre("save", function(next){
    this.totalPrice = this.price * this.quantity * (1 - this.discount / 100);
    next();
});

export default mongoose.model("FoodPurchase", purchaseSchema);