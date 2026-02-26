import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

function connectToDB() {
  mongoose.connect(process.env.MONGO_URI)
    .then(() => {
      console.log("server is connected to db")
    }).catch((error) => {
      console.log("error while connecting to db", error)
      process.exit(1);
    })
}

export default connectToDB;