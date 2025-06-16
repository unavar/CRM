import mongoose from "mongoose";

const leaveBalanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    sickLeave: {
      type: Number,
      default: 2, // Monthly sick leave quota (resets every month)
    },

    casualLeave: {
      type: Number,
      default: 2, // Monthly casual leave quota (resets every month)
    },

    sickLeaveAvailable: {
      type: Number,
      default: 2, // Available sick leave balance
    },

    casualLeaveAvailable: {
      type: Number,
      default: 2, // Available casual leave balance
    },

    sickLeaveTotalMonth: {
      type: Number,
      default: 0, // Cumulative total of sick leave taken
    },

    sickLeaveOverall: {
      type: Number,
      default: 0, // Overall sick leave taken
    },

    casualLeaveTotalMonth: {
      type: Number,
      default: 0, // Cumulative total of casual leave taken
    },
    casualLeaveOverall: {
      type: Number,
      default: 0, // Overall casual leave taken
    },
    sickTakenNextMonth: { type: Boolean, default: false },
    casualTakenNextMonth: { type: Boolean, default: false },

    lastMonthlyReset: { type: Date, default: null },
    lastFinancialYearReset: { type: Date, default: null },
  },
  { timestamps: true }
);

const LeaveBalance = mongoose.model("LeaveBalance", leaveBalanceSchema);

export default LeaveBalance;
