import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    password:{
        type: String,
        required: true
    },
    isVerified:{
        type: Boolean,
        default: false
    },
    userType:{
        type: String,
        enum:["individual", "organization", "admin"],
        required: true
    },
    registrationNumber:{
        type: String,
        required: function(){
            return this.userType === "organization";
        },
    },
    verificationPin:{
        type: String,
        required: function(){
            return !this.isVerified;
        },
    },
    adminId:{
        type: String,
        unique: true,
        required: function(){
            return this.userType === "admin";
        },
        default: function(){
            if(this.userType === "admin"){
                return generateAdminId();
            }
        },
    },
    organizationType:{
        type: String,
        enum:["donor", "recipient"],
        required: function(){
            return this.userType === "organization";
        },
    },
    date:{
        type: Date,
        default: Date.now
    },
});

function generateAdminId(){
    return Math.floor(Math.random() * 9000);
}

export default mongoose.model("User", userSchema);