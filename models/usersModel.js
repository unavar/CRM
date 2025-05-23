import mongoose from "mongoose";

const { Schema, model } = mongoose;

const userRoles = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ACCOUNT_ADMIN: "ACCOUNT_ADMIN",
  AUDIT_ADMIN: "AUDIT_ADMIN",
  AUDITOR: "AUDITOR", // Added AUDITOR role
};

// Defining user schema
const userSchema = new Schema(
  {
    userName: { 
      type: String,
      required: true,
    },
    userId: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: [
        userRoles.SUPER_ADMIN,
        userRoles.ACCOUNT_ADMIN,
        userRoles.AUDIT_ADMIN,
        userRoles.AUDITOR, // Added AUDITOR role to enum
      ],
      required: true,
    },
    resetPasswordOTP: {
      type: String,
      default: null,
    },
   
  },
  {
    timestamps: true,
    collection: "users", // Collection name remains as users
  }
);

// Creating User model
const User = model("User", userSchema);

export { User, userRoles }; // Exporting User and userRoles
