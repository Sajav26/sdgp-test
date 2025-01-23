import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';

const app = express();
dotenv.config();

const connect = async()=>{
    try{
        await mongoose.connect(process.env.MONGO);
        console.log("Connected to MongoDB successfully");
    }catch(err){
        console.log(err);
    }
};

mongoose.connection.on("disconnection", ()=>{
    console.log("MongoDB disconnected");
});

app.use(express.json());

app.use('/backend/auth', authRoutes);

app.listen(process.env.PORT, () =>{
    console.log(`Backend sever connected in port ${process.env.PORT}`);
    connect();
});