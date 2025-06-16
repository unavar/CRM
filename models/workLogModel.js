// models/WorkLog.js
import mongoose from "mongoose";

const workLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    workType: {
      type: String,
      enum: ["audit", "wfh", "office", "onDuty", "absent", "leave"],
      required: true,
    },
     
    fromDate: {
      type: Date,
      required: function () {
        return this.workType === "leave";
      },
    },
    toDate: {
      type: Date,
      required: function () {
        return this.workType === "leave";
      },
    },
    startTime: {
      type: Date,
    },
    endTime: {
      type: Date,
    },
    description: {
      type: String,
      trim: true,
    },
    leaveType: {
      type: String,
      enum: ["sickLeave", "casualLeave","lop"],
   
    },
    leaveStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      required: function () {
        return this.workType === "leave";
      },
    },
    reason: {
      type: String,
      required: function () {
        return this.workType === "leave";
      },
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lopDays: {
      type: Number,
      default: 0, 
    },
    isLOP: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const WorkLog = mongoose.model("WorkLog", workLogSchema);

export default WorkLog;
