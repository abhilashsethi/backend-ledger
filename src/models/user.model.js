import mongoose from "mongoose";
import bcrypt from "bcrypt";

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, "Email is required"],
    trim: true,
    lowercase: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please fill a valid email address'],
    unique: [true, "Email already exists"]
  },
  name: {
    type: String,
    require: [true, "Name is required"],
    trim: true
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters long"],
    select: false
  },
}, {
  timestamps: true,
})

userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return
  }

  const hash = await bcrypt.hash(this.password, 10);
  this.password = hash;

  return;
})

userSchema.methods.comparePassword = async function (password) {
  console.log("comparing password", password, this.password)
  return await bcrypt.compare(password, this.password)
}

const userModel = mongoose.model("user", userSchema)

export default userModel;