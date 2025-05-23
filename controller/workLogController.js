import WorkLog from "../models/workLogModel.js";
import moment from "moment";
import mongoose from "mongoose";
import LeaveBalance from "../models/leaveBalanceSchema.js";

// Create Work Log
export const createWorkLog = async (req, res) => {
  console.log(req.body);
  try {
    const {
      userId,
      workType,
      startTime,
      endTime,
      description,
      reason,
      paidLeave,
      sickLeave,
    } = req.body;

    // Validate required fields
    if (!userId || !workType) {
      return res.status(400).json({
        message: "userId, workType, startTime, and endTime are required",
      });
    }

    // Create a new work log entry
    const workLog = new WorkLog({
      userId,
      workType,
      startTime,
      endTime,
      description,
      reason,
      paidLeave,
      sickLeave,
    });

    await workLog.save();
    res.status(201).json({ message: "Work log created successfully", workLog });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating work log", error: error.message });
  }
};

// Update Work Log
export const updateWorkLog = async (req, res) => {
  console.log(req.body);
  try {
    const { id } = req.params;
    const updateData = req.body;
    const { role } = req.user || {};

    if (role === "AUDITOR") {
      const todayStart = moment().startOf("day");
      const todayEnd = moment().endOf("day");

      if (!moment(workLog.createdAt).isBetween(todayStart, todayEnd)) {
        return res.status(403).json({
          message:
            "Forbidden: Auditors can only update work logs created today",
        });
      }
    }

    const workLog = await WorkLog.findById(id);
    if (!workLog) {
      return res.status(404).json({ message: "Work log not found" });
    }

    const currentWorkType = workLog.workType;

    if (currentWorkType === "absent" && updateData.workType !== "absent") {
      console.log("Resetting absent fields");
      // Reset reason, paidLeave, and sickLeave if workType changes from "Absent"
      updateData.reason = null;
      updateData.paidLeave = false;
      updateData.sickLeave = false;
    } else if (
      currentWorkType !== "absent" &&
      updateData.workType === "absent"
    ) {
      // Reset startTime, endTime, and description if workType remains "Absent"
      updateData.startTime = null;
      updateData.endTime = null;
      updateData.description = null;
    }

    const updatedWorkLog = await WorkLog.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true, // Ensures validation rules are applied
    });

    res
      .status(200)
      .json({ message: "Work log updated successfully", updatedWorkLog });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating work log", error: error.message });
  }
};

// Delete Work Log
export const deleteWorkLogs = async (req, res) => {
  console.log(req.body);
  try {
    const arrayOfWorkLogIds = req.body;
    const { role } = req.user || {};

    if (!Array.isArray(arrayOfWorkLogIds) || arrayOfWorkLogIds.length === 0) {
      return res.status(400).json({
        error: "Invalid input: Expected a non-empty array of WorkLog IDs",
      });
    }

    // Fetch work logs before deleting
    const workLogs = await WorkLog.find({ _id: { $in: arrayOfWorkLogIds } });

    if (!workLogs.length) {
      return res.status(404).json({ message: "No matching work logs found" });
    }

    // Auditor restriction: Can only delete today's work logs
    if (role === "AUDITOR") {
      const todayStart = moment().startOf("day");
      const todayEnd = moment().endOf("day");

      const unauthorizedLogs = workLogs.some(
        (log) => !moment(log.createdAt).isBetween(todayStart, todayEnd)
      );

      if (unauthorizedLogs) {
        return res.status(403).json({
          message:
            "Forbidden: Auditors can only delete work logs created today",
        });
      }
    }

    // Delete work logs in bulk
    await WorkLog.deleteMany({ _id: { $in: arrayOfWorkLogIds } });

    res.status(200).json({ message: "WorkLogs deleted successfully" });
  } catch (err) {
    console.error("Error deleting work logs:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllWorkLogsByUser = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, sort, keyword, userId, date } = req.query;

    if (!userId) {
      return res.status(400).json({ message: "UserId is required" });
    }

    const pageNumber = parseInt(page, 10);
    const sizePerPage = parseInt(pageSize, 10);

    if (
      isNaN(pageNumber) ||
      pageNumber < 1 ||
      isNaN(sizePerPage) ||
      sizePerPage < 1
    ) {
      return res
        .status(400)
        .json({ message: "Invalid page or pageSize parameter" });
    }
    let query = { userId };

    
      // Exclude leave type from query
      query.workType = { $ne: "leave" };

    // Add date filter if provided
    if (date) {
      const startOfDay = moment(date, "DD-MM-YYYY").startOf("day").toDate();
      const endOfDay = moment(date, "DD-MM-YYYY").endOf("day").toDate();
      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }

    if (keyword) {
      query = {
        ...query,
        $or: [
          { workType: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
        ],
      };
    }

    let sortQuery = {};
    switch (sort) {
      case "alllist":
        sortQuery = { createdAt: 1 };
        break;
      case "newlyadded":
        sortQuery = { createdAt: -1 };
        break;
      default:
        sortQuery = { createdAt: -1 };
        break;
    }

    const workLogs = await WorkLog.find(query)
      .sort(sortQuery)
      .skip((pageNumber - 1) * sizePerPage)
      .limit(sizePerPage)
      .select("workType description startTime endTime createdAt");

    const totalWorkLogs = await WorkLog.countDocuments(query);

    res.status(200).json({
      data: workLogs.map((log) => ({
        ...log.toObject(),
        startTime: log.startTime
          ? moment(log.startTime).format("HH:mm A")
          : "N/A",
        endTime: log.endTime ? moment(log.endTime).format("HH:mm A") : "N/A",
        date: moment(log.createdAt).format("DD-MM-YYYY"), // Extracted date from createdAt
        dateAndTime: moment(log.createdAt).format("DD-MM-YYYY HH:mm A"), // Formatted timestamp
        totalHours: log.startTime
          ? moment
              .duration(moment(log.endTime).diff(moment(log.startTime)))
              .asHours()
              .toFixed(2)
              .toString() + " Hours"
          : "N/A",
      })),
      total: totalWorkLogs,
      page: pageNumber,
      pageSize: sizePerPage,
      totalPages: Math.ceil(totalWorkLogs / sizePerPage),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
// Controller function to check if a work log already exists for today
export const isWorkLogAlreadyExist = async (req, res) => {
  try {
    const { userId } = req.query; // Get the userId from the query params

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Get today's date (ignoring time)
    const todayStart = moment().startOf("day"); // This will get the start of today (00:00)
    const todayEnd = moment().endOf("day"); // This will get the end of today (23:59)

    // Check if a work log entry already exists for the user today
    const existingWorkLog = await WorkLog.findOne({
      userId,
      createdAt: { $gte: todayStart.toDate(), $lte: todayEnd.toDate() }, // Check within today's date range
    });

    if (existingWorkLog) {
      return res
        .status(401)
        .json({ message: "Work log entry already exists for today" });
    }
    // Check if a work log entry already exists for the user today

    res.status(200).json({ message: "No work log entry found for today" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error checking work log", error: error.message });
  }
};

export const getAllWorkLogs = async (req, res) => {
  try {
    let { page = 1, pageSize = 10, sort, userId, fromDate, toDate } = req.query;

    const pageNumber = parseInt(page, 10);
    const sizePerPage = parseInt(pageSize, 10);

    if (
      isNaN(pageNumber) ||
      pageNumber < 1 ||
      isNaN(sizePerPage) ||
      sizePerPage < 1
    ) {
      return res
        .status(400)
        .json({ message: "Invalid page or pageSize parameter" });
    }

    let query = {};

    // User filter
    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid userId" });
      }
      query.userId = userId;
    }

    // Exclude leave type from query
    query.workType = { $ne: "leave" };

    // Date filtering logic
    if (fromDate && !toDate) {
      // If only `fromDate` is provided, fetch logs for that single day
      query.createdAt = {
        $gte: moment(fromDate, "YYYY-MM-DD").startOf("day").toDate(),
        $lte: moment(fromDate, "YYYY-MM-DD").endOf("day").toDate(),
      };
    } else if (fromDate && toDate) {
      // If both `fromDate` and `toDate` are provided, fetch logs in the range
      query.createdAt = {
        $gte: moment(fromDate, "YYYY-MM-DD").startOf("day").toDate(),
        $lte: moment(toDate, "YYYY-MM-DD").endOf("day").toDate(),
      };
    } else {
      // Default: Last 7 days if no dates are provided
      query.createdAt = {
        $gte: moment().subtract(7, "days").startOf("day").toDate(),
        $lte: moment().endOf("day").toDate(),
      };
    }

    let sortQuery = { createdAt: 1 }; // Default sorting (oldest first)
    if (sort === "newlyadded") {
      sortQuery = { createdAt: -1 };
    }

    const workLogs = await WorkLog.find(query)
      .sort(sortQuery)
      .skip((pageNumber - 1) * sizePerPage)
      .limit(sizePerPage)
      .populate("userId", "userName")
      .select(
        "workType description startTime endTime createdAt userId paidLeave sickLeave"
      );

    const totalWorkLogs = await WorkLog.countDocuments(query);

    res.status(200).json({
      data: workLogs.map((log) => ({
        ...log.toObject(),
        auditor_name: log.userId?.userName || "N/A",
        startTime: log.startTime
          ? moment(log.startTime).format("HH:mm A")
          : "N/A",
        endTime: log.endTime ? moment(log.endTime).format("HH:mm A") : "N/A",
        date: moment(log.createdAt).format("DD-MM-YYYY"),
        dateAndTime: moment(log.createdAt).format("DD-MM-YYYY HH:mm A"),
        paidLeave: log.paidLeave,
        sickLeave: log.sickLeave,
        totalHours:
          log.startTime && log.endTime
            ? moment
                .duration(moment(log.endTime).diff(moment(log.startTime)))
                .asHours()
                .toFixed(2) + " Hours"
            : "N/A",
      })),
      total: totalWorkLogs,
      page: pageNumber,
      pageSize: sizePerPage,
      totalPages: Math.ceil(totalWorkLogs / sizePerPage),
      fromDate: fromDate || moment().subtract(7, "days").format("YYYY-MM-DD"),
      toDate: toDate || moment().format("YYYY-MM-DD"),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getWorkLogById = async (req, res) => {
  try {
    const { workLogId } = req.params; // Get work log ID from request params

    // Find work log by ID
    const workLog = await WorkLog.findById(workLogId);

    if (!workLog) {
      return res.status(404).json({ message: "Work log not found" });
    }

    // Format the work log data
    const formattedWorkLog = {
      ...workLog.toObject(),
      startTime: workLog.startTime,
      endTime: workLog.endTime,
      date: moment(workLog.createdAt).format("DD-MM-YYYY"), // Extracted date from createdAt
      dateAndTime: moment(workLog.createdAt).format("DD-MM-YYYY HH:mm A"), // Formatted timestamp
      totalHours: workLog.startTime
        ? moment
            .duration(moment(workLog.endTime).diff(moment(workLog.startTime)))
            .asHours()
            .toFixed(2) + " Hours"
        : "N/A",
    };

    res.status(200).json({ workLog: formattedWorkLog });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching work log", error: error.message });
  }
};

export const fetchWorkLogDates = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Fetch work logs for the given user
    const workLogs = await WorkLog.find({ userId });

    // Extract and format unique dates from timestamps
    const workLogDates = [
      ...new Set(
        workLogs.map((log) => moment(log.timestamp).format("YYYY-MM-DD"))
      ),
    ];

    return res.json(workLogDates);
  } catch (error) {
    console.error("Error fetching work log dates:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const submitLeaveRequest = async (req, res) => {
  console.log(req.body);
  try {
    const { userId, leaveType, reason, fromDate, toDate } = req.body;

    if (!userId || !leaveType || !reason || !fromDate || !toDate) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Check for leave balance or create if missing
    let leaveBalance = await LeaveBalance.findOne({ userId });

    if (!leaveBalance) {
      leaveBalance = await LeaveBalance.create({
        userId,
        sickLeave: 2,
        casualLeave: 2,
        casualLeaveHistory: [],
      });
    }

    // Check LOP
    let isLOP = false;
    if (leaveType === "sickLeave" && leaveBalance.sickLeave <= 0) isLOP = true;
    if (leaveType === "casualLeave" && leaveBalance.casualLeave <= 0)
      isLOP = true;

    // Create work log (leave request)
    const leaveRequest = new WorkLog({
      userId,
      workType: "leave",
      leaveType,
      reason,
      startTime: new Date(fromDate),
      endTime: new Date(toDate),
      fromDate: new Date(fromDate), // Add this line
      toDate: new Date(toDate), // Add this line
      isLOP,
      leaveStatus: "pending",
    });

    await leaveRequest.save();

    res.status(201).json({
      message: "Leave request submitted successfully",
      leaveRequest,
    });
  } catch (error) {
    console.error("Error submitting leave request:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllLeaveRequests = async (req, res) => {
  try {
    let {
      page = 1,
      pageSize = 10,
      sort,
      userId,
      fromDate,
      toDate,
      leaveStatus,
      keyword, // ✅ NEW: keyword from query
    } = req.query;

    const pageNumber = parseInt(page, 10);
    const sizePerPage = parseInt(pageSize, 10);

    if (
      isNaN(pageNumber) ||
      pageNumber < 1 ||
      isNaN(sizePerPage) ||
      sizePerPage < 1
    ) {
      return res
        .status(400)
        .json({ message: "Invalid page or pageSize parameter" });
    }

    let query = { workType: "leave" };

    if (userId) {
      if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ message: "Invalid userId" });
      }
      query.userId = userId;
    }

    if (leaveStatus) {
      query.leaveStatus = leaveStatus;
    }

    // Date filters
    if (fromDate && !toDate) {
      query.fromDate = {
        $gte: moment(fromDate, "YYYY-MM-DD").startOf("day").toDate(),
        $lte: moment(fromDate, "YYYY-MM-DD").endOf("day").toDate(),
      };
    } else if (fromDate && toDate) {
      query.fromDate = {
        $gte: moment(fromDate, "YYYY-MM-DD").startOf("day").toDate(),
        $lte: moment(toDate, "YYYY-MM-DD").endOf("day").toDate(),
      };
    } else {
      query.createdAt = {
        $gte: moment().subtract(7, "days").startOf("day").toDate(),
        $lte: moment().endOf("day").toDate(),
      };
    }

    let sortQuery = { createdAt: 1 };
    if (sort === "newlyadded") {
      sortQuery = { createdAt: -1 };
    }

    // Base query
    let baseQuery = WorkLog.find(query)
      .sort(sortQuery)
      .skip((pageNumber - 1) * sizePerPage)
      .limit(sizePerPage)
      .populate("userId", "userName")
      .select(
        "userId leaveType reason startTime endTime fromDate toDate isLOP leaveStatus createdAt"
      );

    // Apply keyword filtering after population
    let leaveRequests = await baseQuery;

    // ✅ Keyword search after fetching
    if (keyword) {
      const searchRegex = new RegExp(keyword, "i");
      leaveRequests = leaveRequests.filter((log) => {
        return (
          searchRegex.test(log.leaveType) ||
          searchRegex.test(log.reason) ||
          searchRegex.test(log?.userId?.userName || "")
        );
      });
    }

    // Count total (with/without keyword)
    const totalLeaveRequests = keyword
      ? leaveRequests.length
      : await WorkLog.countDocuments(query);

    res.status(200).json({
      data: leaveRequests.map((log) => ({
        ...log.toObject(),
        requester_name: log.userId?.userName || "N/A",
        userId: log.userId._id,
        startTime: log.startTime
          ? moment(log.startTime).format("HH:mm A")
          : "N/A",
        endTime: log.endTime ? moment(log.endTime).format("HH:mm A") : "N/A",
        fromDate: log.fromDate
          ? moment(log.fromDate).format("DD-MM-YYYY")
          : "N/A",
        toDate: log.toDate ? moment(log.toDate).format("DD-MM-YYYY") : "N/A",
        requestDate: moment(log.createdAt).format("DD-MM-YYYY"),
        requestDateAndTime: moment(log.createdAt).format("DD-MM-YYYY HH:mm A"),
        leaveType: log.leaveType,
        reason: log.reason,
        isLOP: log.isLOP,
        leaveStatus: log.leaveStatus,
      })),
      total: totalLeaveRequests,
      page: pageNumber,
      pageSize: sizePerPage,
      totalPages: Math.ceil(totalLeaveRequests / sizePerPage),
      fromDate: fromDate || moment().subtract(7, "days").format("YYYY-MM-DD"),
      toDate: toDate || moment().format("YYYY-MM-DD"),
    });
  } catch (error) {
    console.error("Error fetching leave requests:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const approveLeaveRequest = async (req, res) => {
  console.log(req.body);

  try {
    const { id } = req.params;

    // 1. Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid leave request ID" });
    }

    // 2. Fetch leave request
    const leaveRequest = await WorkLog.findById(id);
    console.log("Fetched leave request:", leaveRequest);

    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    // 3. Ensure it's a leave request
    if (leaveRequest.workType !== "leave") {
      return res.status(400).json({ message: "This is not a leave request" });
    }

    const { userId, leaveType, fromDate, toDate } = leaveRequest;

    if (!fromDate || !toDate) {
      return res.status(400).json({ message: "Missing leave date range" });
    }

    const startDate = moment(fromDate).startOf("day");
    const endDate = moment(toDate).endOf("day");
    const leaveDays = endDate.diff(startDate, "days") + 1;
    console.log(`Leave Days: ${leaveDays}`);

    // 4. Get or create leave balance
    let leaveBalance = await LeaveBalance.findOne({ userId });
    if (!leaveBalance) {
      res.status(404).json({ message: "Leave balance not found" });
    }

    // 5. Deduct leave or apply LOP
    let lopDays = 0;
    let leaveDescription = "";

    if (leaveType === "sickLeave") {
      const available = leaveBalance.sickLeaveAvailable || 0;

      if (available >= leaveDays) {
        leaveBalance.sickLeaveAvailable -= leaveDays;
        leaveBalance.sickLeaveTotalMonth += leaveDays;
        leaveBalance.sickLeaveOverall += leaveDays;
        leaveDescription = `Approved with ${leaveDays} SL`;
      } else {
        const usedSL = available;
        lopDays = leaveDays - usedSL;

        leaveBalance.sickLeaveAvailable = 0;
        leaveBalance.sickLeaveTotalMonth += usedSL;
        leaveBalance.sickLeaveOverall += usedSL;

        leaveDescription = `Approved with ${usedSL} SL and ${lopDays} LOP`;
      }
    } else if (leaveType === "casualLeave") {
      const available = leaveBalance.casualLeaveAvailable || 0;

      if (available >= leaveDays) {
        leaveBalance.casualLeaveAvailable -= leaveDays;
        leaveBalance.casualLeaveTotalMonth += leaveDays;
        leaveBalance.casualLeaveOverall += leaveDays;
        leaveDescription = `Approved with ${leaveDays} CL`;
      } else {
        const usedCL = available;
        lopDays = leaveDays - usedCL;

        leaveBalance.casualLeaveAvailable = 0;
        leaveBalance.casualLeaveTotalMonth += usedCL;
        leaveBalance.casualLeaveOverall += usedCL;

        leaveDescription = `Approved with ${usedCL} CL and ${lopDays} LOP`;
      }
    }

    // 6. Update leave request
    leaveRequest.leaveStatus = "approved";
    leaveRequest.isLOP = lopDays > 0;
    leaveRequest.lopDays = lopDays;
    leaveRequest.description = leaveDescription;

    // 7. Save updates
    const leaveBalanceSaved = await leaveBalance.save();
    const leaveRequestSaved = await leaveRequest.save();

    // 8. Respond
    return res.status(200).json({
      message: "Leave approved successfully",
      leaveRequest: leaveRequestSaved,
      updatedLeaveBalance: leaveBalanceSaved,
    });
  } catch (error) {
    console.error("Error in approveLeaveRequest:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};

export const calculateLeaveData = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const startOfMonth = moment().startOf("month").toDate();
    const endOfMonth = moment().endOf("month").toDate();

    const objectUserId = new mongoose.Types.ObjectId(userId);

    let leaveBalance = await LeaveBalance.findOne({ userId: objectUserId });

    if (!leaveBalance) {
      const today = moment().toDate(); // or new Date()

      leaveBalance = await LeaveBalance.create({
        userId: objectUserId,
        sickLeave: 2,
        casualLeave: 2,
        sickLeaveAvailable: 2,
        casualLeaveAvailable: 2,
        sickLeaveTotalMonth: 0,
        sickLeaveOverall: 0,
        casualLeaveTotalMonth: 0,
        casualLeaveOverall: 0,
        lastMonthlyReset: moment().toDate(),
        lastFinancialYearReset: moment().toDate(), // or null if you prefer
      });
    }

    const today = moment();

    // Check if today is April 1st
    const isFinancialYearStart = today.date() === 1 && today.month() === 3;

    // Optional: Add this field in your LeaveBalance model if not present
    // lastFinancialYearReset: { type: Date, default: null }

    const lastFYReset = leaveBalance.lastFinancialYearReset
      ? moment(leaveBalance.lastFinancialYearReset)
      : null;
    const alreadyResetThisFY = lastFYReset?.isSame(today, "day");

    if (isFinancialYearStart && !alreadyResetThisFY) {
      // Reset overall balances
      leaveBalance.sickLeaveOverall = 0;
      leaveBalance.casualLeaveOverall = 0;

      // Reset available leave for new year
      leaveBalance.sickLeaveAvailable = 2;
      leaveBalance.casualLeaveAvailable = 2;

      leaveBalance.sickLeave = 2;
      leaveBalance.casualLeave = 2;

      // Also reset monthly leave counters for April
      leaveBalance.sickLeaveTotalMonth = 0;
      leaveBalance.casualLeaveTotalMonth = 0;

      leaveBalance.lastFinancialYearReset = today.toDate();
      await leaveBalance.save();
    }

    // Check if today is 1st day of any month
    const isFirstDayOfMonth = today.date() === 1;

    const lastMonthlyReset = leaveBalance.lastMonthlyReset
      ? moment(leaveBalance.lastMonthlyReset)
      : null;
    const alreadyResetThisMonth =
      lastMonthlyReset?.month() === today.month() &&
      lastMonthlyReset?.year() === today.year();

    if (isFirstDayOfMonth && !alreadyResetThisMonth) {
      console.log("Resetting monthly leave usage");
      
      // Reset monthly leave usage
      leaveBalance.sickLeaveTotalMonth = 0;
      leaveBalance.casualLeaveTotalMonth = 0;

      // Add monthly leaves (e.g., 2 per month)
      leaveBalance.sickLeaveAvailable += 2;
      leaveBalance.casualLeaveAvailable += 2;

      leaveBalance.sickLeave = leaveBalance.sickLeaveAvailable;
      leaveBalance.casualLeave = leaveBalance.casualLeaveAvailable;

      leaveBalance.lastMonthlyReset = today.toDate();
      await leaveBalance.save();
    }

    const approvedLeaves = await WorkLog.find({
      userId,
      workType: "leave",
      leaveStatus: "approved",
    });

    let leaveTaken = {
      thisMonth: { sick: 0, casual: 0, lop: 0 },
      overall: { sick: 0, casual: 0, lop: 0 },
    };

    approvedLeaves.forEach((leave) => {
      const from = moment(leave.fromDate);
      const to = moment(leave.toDate);
      const totalDays = to.diff(from, "days") + 1;

      const isThisMonth = from.isBetween(startOfMonth, endOfMonth, "day", "[]");

      const lopDays = leave.lopDays || 0;
      const approvedDays = totalDays - lopDays;

      // Add LOP days
      leaveTaken.overall.lop += lopDays;
      if (isThisMonth) leaveTaken.thisMonth.lop += lopDays;

      // Add approved non-LOP days based on leaveType
      if (leave.leaveType === "casualLeave") {
        leaveTaken.overall.casual += approvedDays;
        if (isThisMonth) leaveTaken.thisMonth.casual += approvedDays;
      } else if (leave.leaveType === "sickLeave") {
        leaveTaken.overall.sick += approvedDays;
        if (isThisMonth) leaveTaken.thisMonth.sick += approvedDays;
      }
    });

    const response = {
      nonLOPLeavesAvailable: {
        sick: {
          thisMonth: leaveBalance.sickLeaveAvailable,
          overall: leaveBalance.sickLeave,
        },
        casual: {
          thisMonth: leaveBalance.casualLeaveAvailable,
          overall: leaveBalance.casualLeave,
        },
      },
      totalLeavesTaken: {
        lop: {
          thisMonth: leaveTaken.thisMonth.lop,
          overall: leaveTaken.overall.lop,
        },
        sick: {
          thisMonth: leaveBalance.sickLeave - leaveBalance.sickLeaveAvailable,
          overall: leaveBalance.sickLeaveOverall,
        },
        casual: {
          thisMonth:
            leaveBalance.casualLeave - leaveBalance.casualLeaveAvailable,
          overall: leaveBalance.casualLeaveOverall,
        },
        status: approvedLeaves.length > 0 ? "approved" : "pending",
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error in calculateLeaveData:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const checkLeaveBalanceLeftOrNot = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const leaveBalance = await LeaveBalance.findOne({ userId });

    if (!leaveBalance) {
      return res.status(404).json({ message: "Leave balance not found" });
    }

    // Check if any leave balance is left
    const hasLeaveBalance =
      leaveBalance.sickLeave > 0 || leaveBalance.casualLeave > 0;

    res.status(200).json({ hasLeaveBalance });
  } catch (error) {
    console.error("Error in checkLeaveBalanceLeftOrNot:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const simulateCarryForward = async (req, res) => {
  try {
    const { userId } = req.params; // Get userId from request params
    const userLeave = await LeaveBalance.findOne({ userId });

    if (!userLeave) {
      return res.status(404).json({ message: "User leave not found" });
    }

    const today = moment().add(1, "month"); // Simulate next month's date
    const currentMonth = today.month() + 1; // 1-indexed
    const currentYear = today.year();

    // Check if it's the start of a new month
    const lastMonth = today.subtract(1, "month"); // Get the previous month

    // Track sick leave usage (just a cumulative total)
    const lastMonthSickLeave = userLeave.sickLeave;

    userLeave.casualLeaveOverall += userLeave.casualLeaveTotalMonth; // Add the total casual leave taken to overall
    userLeave.casualLeaveTotalMonth = 0; // Reset monthly casual leave taken

    userLeave.casualLeaveOverall += userLeave.casualLeave;

    // Update the sick leave for the current month
    userLeave.sickLeave = 2 + lastMonthSickLeave; // New sick leave = carry forward + 2 for the current month

    // Reset casual leave to 2 for the current month
    userLeave.casualLeave = 2; // Reset casual leave to 2

    // Save the updated leave balance and history
    await userLeave.save();
    return res.status(200).json({
      message: "Leave balance updated with carry forward and reset",
      updatedSickLeaveBalance: userLeave.sickLeave,

      resetCasualLeaveBalance: userLeave.casualLeave,
    });
  } catch (error) {
    console.error("Error in simulateCarryForward:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};
