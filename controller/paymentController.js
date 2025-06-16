import Payment from "../models/paymentModel.js";
import Proposal from "../models/proposalModel.js";
import multer from "multer";
import  path from "path";
import fs from "fs";
import AuditManagement from "../models/auditMangement.js";
import AuditorPayment from "../models/auditorPaymentModel.js";
import { User } from "../models/usersModel.js";
import { fileURLToPath } from "url";
import moment from "moment";
import exp from "constants";


// Get the correct directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



// Create a new payment
export const createPayment = async (req, res) => {
  try {
    const payment = new Payment(req.body);
    await payment.save();
    res.status(201).json({
      success: true,
      message: "Payment created successfully",
      payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating payment",
      error: error.message,
    });
  }
};

// Get all payments
export const getAllPayments = async (req, res) => {
  try {
    const payments = await Payment.find();
    res.status(200).json({ success: true, payments });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching payments",
      error: error.message,
    });
  }
};

// Get a single payment by ID
export const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment)
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });

    res.status(200).json({ success: true, payment });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching payment",
      error: error.message,
    });
  }
};

// Update a payment by ID
export const updatePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!payment)
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });

    res.status(200).json({
      success: true,
      message: "Payment updated successfully",
      payment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating payment",
      error: error.message,
    });
  }
};

// Delete a payment by ID
export const deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findByIdAndDelete(req.params.id);
    if (!payment)
      return res
        .status(404)
        .json({ success: false, message: "Payment not found" });

    res
      .status(200)
      .json({ success: true, message: "Payment deleted successfully" });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting payment",
      error: error.message,
    });
  }
};

export const getAllProposalDetailsWithPayment = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, sort, keyword } = req.query;

    const pageNumber = parseInt(page, 10);
    const sizePerPage = parseInt(pageSize, 10);

    if (isNaN(pageNumber) || pageNumber < 1 || isNaN(sizePerPage) || sizePerPage < 1) {
      return res.status(400).json({ message: "Invalid page or pageSize parameter" });
    }

    // Step 1: Query proposals directly from Proposal model
    let query = Proposal.find();

    // Step 2: Apply search filter if provided
    if (keyword) {
      const searchRegex = new RegExp(keyword, "i"); // create a case-insensitive regex
      pipeline.push({
        $match: {
          $or: [
            { "proposal.fbo_name": searchRegex },
            { "proposal.proposal_number": searchRegex },
            { "auditor.userName": searchRegex },
          ]
        }
      });
    }
    

    // Step 3: Sorting logic
    let sortQuery = {};
    switch (sort) {
      case "newproposal":
        sortQuery = { createdAt: -1 };
        break;
      case "alllist":
        sortQuery = { createdAt: 1 };
        break;
      default:
        sortQuery = { createdAt: 1 };
        break;
    }

    // Step 4: Count total proposals for pagination
    const totalProposals = await Proposal.countDocuments(query.getQuery());

    // Step 5: Fetch paginated proposals
    const proposals = await query
      .skip((pageNumber - 1) * sizePerPage)
      .limit(sizePerPage)
      .sort(sortQuery)
      .select("proposal_number fbo_name outlets proposal_date status createdAt updatedAt");

    
     
    // Step 6: Calculate proposal values
    const proposalsWithCounts = await Promise.all(
      proposals.map(async (proposal) => {
        const totalOutlets = proposal.outlets.length;
        const notInvoicedOutlets = proposal.outlets.filter((outlet) => !outlet.is_invoiced).length;

        // Calculate Proposal Value
        const total = proposal.outlets.reduce(
          (acc, outlet) => acc + parseFloat(outlet.amount?.$numberInt || outlet.amount || 0),
          0
        );
        const gst = total * 0.18;
        const overallTotal = total + gst;

        // Calculate Payment Received
        const payments = await AuditorPayment.find({
          proposalId: proposal._id,
          status: 'accepted',
        });
        const paymentReceived = payments.reduce((sum, payment) => sum + parseFloat(payment.amountReceived || 0), 0);

       const noOfPayments = await AuditorPayment.countDocuments({
  proposalId: proposal._id,
  status: 'accepted',
});


        return {
          _id: proposal._id,
          proposal_number: proposal.proposal_number,
          fbo_name: proposal.fbo_name,
          totalOutlets,
          notInvoicedOutlets,
          Proposal_value: `₹${overallTotal.toFixed(2)}` || "₹0.00",
          paymentReceived: `₹${paymentReceived.toFixed(2)}` || "₹0.00",
          balanceAmount: `₹${(overallTotal - paymentReceived).toFixed(2)}`,
          noOfPayments: noOfPayments || 0,
          
        };
      })
    );

    res.json({
      total: totalProposals,
      currentPage: pageNumber,
      data: proposalsWithCounts,
    });
  } catch (error) {
    console.error("Error fetching proposals:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


export const getAllProposalDetails = async (req, res) => {
  try {
    const { auditor_id } = req.params;
    const { page = 1, pageSize = 10, sort, keyword } = req.query;

    const pageNumber = parseInt(page, 10);
    const sizePerPage = parseInt(pageSize, 10);

    if (isNaN(pageNumber) || pageNumber < 1 || isNaN(sizePerPage) || sizePerPage < 1) {
      return res.status(400).json({ message: "Invalid page or pageSize parameter" });
    }

    // Step 1: Get all proposal IDs linked with the given auditor
    const auditRecords = await AuditManagement.find({ user: auditor_id }).select("proposalId");
    const proposalIds = auditRecords.map((audit) => audit.proposalId);

    // Step 2: Query proposals using the extracted proposalIds
    let query = Proposal.find({ _id: { $in: proposalIds } });

    // Step 3: Apply search filter if provided
    if (keyword) {
      const searchRegex = new RegExp(keyword, "i");
      query = query.where("fbo_name").regex(searchRegex);
    }

    // Step 4: Sorting logic
    let sortQuery = {};
    switch (sort) {
      case "newproposal":
        sortQuery = { createdAt: -1 };
        break;
      case "alllist":
        sortQuery = { createdAt: 1 };
        break;
      default:
        sortQuery = { createdAt: 1 };
        break;
    }

    // Step 5: Count total proposals for pagination
    const totalProposals = await Proposal.countDocuments(query.getQuery());

    // Step 6: Fetch paginated proposals
    const proposals = await query
      .skip((pageNumber - 1) * sizePerPage)
      .limit(sizePerPage)
      .sort(sortQuery)
      .select("proposal_number fbo_name outlets proposal_date status createdAt updatedAt");

    // Step 7: Calculate proposal values
    const proposalsWithCounts = await Promise.all(
      proposals.map(async (proposal) => {
        const totalOutlets = proposal.outlets.length;
        const notInvoicedOutlets = proposal.outlets.filter((outlet) => !outlet.is_invoiced).length;

        // Calculate Proposal Value
        const total = proposal.outlets.reduce(
          (acc, outlet) => acc + parseFloat(outlet.amount?.$numberInt || outlet.amount || 0),
          0
        );
        const gst = total * 0.18;
        const overallTotal = total + gst;

        // Calculate Payment Received
        const payments = await AuditorPayment.find({
          proposalId: proposal._id,
          status: 'accepted',
        });
        const paymentReceived = payments.reduce((sum, payment) => sum + parseFloat(payment.amountReceived || 0), 0);

        return {
          _id: proposal._id,
          proposal_number: proposal.proposal_number,
          fbo_name: proposal.fbo_name,
          totalOutlets,
          notInvoicedOutlets,
          Proposal_value: `₹${overallTotal.toFixed(2)}` || "₹0.00",
          paymentReceived: `₹${paymentReceived.toFixed(2)}` || "₹0.00",
          balanceAmount: `₹${(overallTotal - paymentReceived).toFixed(2)}`,
        };
      })
    );

    res.json({
      total: totalProposals,
      currentPage: pageNumber,
      data: proposalsWithCounts,
    });
  } catch (error) {
    console.error("Error fetching proposals:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};




export const getAllProposalDetailsForPayment = async (req, res) => {
  try {
    const { page = 1, pageSize = 10, sort, keyword, status } = req.query;

    const pageNumber = parseInt(page, 10);
    const sizePerPage = parseInt(pageSize, 10);

    if (isNaN(pageNumber) || pageNumber < 1 || isNaN(sizePerPage) || sizePerPage < 1) {
      return res.status(400).json({ message: "Invalid page or pageSize parameter" });
    }

    // Step 1: Get all valid proposal IDs from AuditorPayment with optional status filter
    let paymentQuery = {};
    if (status) {
      paymentQuery.status = status;
    }

    const payments = await AuditorPayment.find(paymentQuery).select("proposalId amountReceived referenceNumber status");
    const validPayments = payments.filter((payment) => payment.proposalId); // Remove undefined/null proposalId
    const proposalIds = validPayments.map((payment) => payment.proposalId.toString());

    if (proposalIds.length === 0) {
      return res.json({ total: 0, currentPage: pageNumber, data: [] });
    }

    // Step 2: Query proposals using valid proposalIds
    let query = Proposal.find({ _id: { $in: proposalIds } });

    // Step 3: Apply search filter if provided
    if (keyword) {
      const searchRegex = new RegExp(keyword, "i");
      query = query.where("fbo_name").regex(searchRegex);
    }

    // Step 4: Sorting logic
    let sortQuery = {};
    switch (sort) {
      case "newproposal":
        sortQuery = { createdAt: -1 };
        break;
      case "alllist":
        sortQuery = { createdAt: 1 };
        break;
      default:
        sortQuery = { createdAt: 1 };
        break;
    }

    // Step 5: Count total proposals for pagination
    const totalProposals = await Proposal.countDocuments(query.getQuery());

    // Step 6: Fetch paginated proposals
    const proposals = await query
      .skip((pageNumber - 1) * sizePerPage)
      .limit(sizePerPage)
      .sort(sortQuery)
      .select("proposal_number fbo_name outlets proposal_date status createdAt updatedAt");

    // Create a Map for quick lookup of payment details
    const paymentMap = new Map();
    validPayments.forEach((payment) => {
      paymentMap.set(payment.proposalId.toString(), payment);
    });

    // Step 7: Calculate proposal values and merge payment details
    const proposalsWithPayments = proposals.map((proposal) => {
      const totalOutlets = proposal.outlets.length;
      const notInvoicedOutlets = proposal.outlets.filter((outlet) => !outlet.is_invoiced).length;

      // Calculate Proposal Value
      const total = proposal.outlets.reduce(
        (acc, outlet) => acc + parseFloat(outlet.amount?.$numberInt || outlet.amount || 0),
        0
      );
      const gst = total * 0.18;
      const overallTotal = total + gst;

      // Get payment details
      const payment = paymentMap.get(proposal._id.toString()) || {};
      
      return {
        _id: proposal._id,
        proposal_number: proposal.proposal_number,
        fbo_name: proposal.fbo_name,
        totalOutlets,
        notInvoicedOutlets,
        Proposal_value: `₹${overallTotal.toFixed(2)}` || "₹0.00",
        amountReceived: payment.amountReceived || 0,
        referenceNumber: payment.referenceNumber || "N/A",
        paymentStatus: payment.status || "pending",
        balanceAmount: `₹${(overallTotal - (payment.amountReceived || 0)).toFixed(2)}`,
      };
    });

    res.json({
      total: totalProposals,
      currentPage: pageNumber,
      data: proposalsWithPayments,
    });
  } catch (error) {
    console.error("Error fetching proposals for payment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};





// Ensure the directory exists
const uploadDir = 'uploads/payment-reference/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Save files in 'uploads/payment-reference/' folder
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
    }
});

const upload = multer({ storage });

// Save Auditor Payment Details


export const saveAuditorPayment = async (req, res) => {
  console.log("Request Body:", req.body);
  console.log("Uploaded File:", req.file || "No file uploaded"); // Fix this

  try {
    const { proposalId, amountReceived, referenceNumber, auditor_id } = req.body;

    if (!proposalId || !amountReceived || !referenceNumber || !auditor_id) {
      return res.status(400).json({ message: "All fields are required." });
    }

    // Use req.file instead of req.files
    const referenceDocument = req.file
      ? `payment-reference/${req.file.filename}`
      : "";

    const newPayment = new AuditorPayment({
      proposalId,
      amountReceived,
      referenceNumber,
      referenceDocument,
      auditorId: auditor_id,
    });

    await newPayment.save();

    res.status(201).json({ message: "Auditor payment details saved successfully!" });
  } catch (error) {
    console.error("Error saving auditor payment:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateAuditorPayment = async (req, res) => {
  console.log("Request Body:", req.body);
  console.log("Uploaded File:", req.file || "No file uploaded");

  try {
    const { paymentId, proposalId, amountReceived, referenceNumber } = req.body;

    if (!paymentId || !proposalId || !amountReceived || !referenceNumber) {
      return res.status(400).json({ message: "All fields are required." });
    }

    const existingPayment = await AuditorPayment.findById(paymentId);
    console.log("Existing Payment:", existingPayment);
    if (!existingPayment) {
      return res.status(404).json({ message: "Payment not found." });
    }

    // Delete old reference document if a new one is uploaded
    if (req.file && existingPayment.referenceDocument) {
      const filePath = path.resolve(existingPayment.referenceDocument);
      console.log("Deleting old reference document:", filePath);
      try {
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
          console.log("Old reference document deleted.");
        }
      } catch (err) {
        console.error("Error deleting old reference document:", err);
      }
    }

    // Update payment details
    existingPayment.proposalId = proposalId;
    existingPayment.amountReceived = amountReceived;
    existingPayment.referenceNumber = referenceNumber;
    existingPayment.referenceDocument = req.file 
      ? `payment-reference/${req.file.filename}` 
      : existingPayment.referenceDocument;

    await existingPayment.save();

    res.status(200).json({ message: "Auditor payment details updated successfully!" });
  } catch (error) {
    console.error("Error updating auditor payment:", error);
    res.status(500).json({ message: "Server error" });
  }
};


export const getAuditorPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Payment ID is required." });
    }

    const payment = await AuditorPayment.findOne({ _id: id }).populate({
      path: 'auditorId',
      model: User,
      select: 'userName'
    });

    if (!payment) {
      return res.status(404).json({ message: "Pending payment details not found." });
    }

    res.status(200).json({
      ...payment.toObject(),
      auditor_name: payment.auditorId ? payment.auditorId.userName : null
    });
  } catch (error) {
    console.error("Error fetching pending auditor payment details:", error);
    res.status(500).json({ message: "Server error" });
  }
};


export const updateAuditorPaymentStatus = async (req, res) => {

  console.log("Request Body:", req.body);
  try {
    const { id } = req.params; // id represents auditorId
    const { status } = req.body;

    if (!id || !status) {
      return res.status(400).json({ message: "Auditor ID and status are required." });
    }

    const validStatuses = ["pending", "accepted", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status value." });
    }

    const payment = await AuditorPayment.findOneAndUpdate(
      { _id: id },
      { status },
      { new: true, runValidators: true }
    );

    if (!payment) {
      return res.status(404).json({ message: "Auditor payment not found." });
    }

    res.status(200).json({
      message: "Auditor payment status updated successfully.",
      payment,
    });
  } catch (error) {
    console.error("Error updating auditor payment status:", error);
    res.status(500).json({ message: "Server error" });
  }
};



export const getAllProposalDetailsAdmin = async (req, res) => {
  try {
    console.log("Request body:", req.body);

    // Step 1: Extract query parameters
    const { page = 1, pageSize = 10, sort, status, keyword } = req.query;

    const pageNumber = parseInt(page, 10);
    const sizePerPage = parseInt(pageSize, 10);

    if (isNaN(pageNumber) || pageNumber < 1 || isNaN(sizePerPage) || sizePerPage < 1) {
      return res.status(400).json({ message: "Invalid page or pageSize parameter" });
    }

    // Step 2: Sorting logic
    let sortQuery = { createdAt: 1 }; // Default sorting (oldest first)
    if (sort === "newproposal") sortQuery = { createdAt: -1 };
    else if (sort === "alllist") sortQuery = { createdAt: 1 };

    // Step 3: Create filter query dynamically
    let filterQuery = {};

    // Adding the status filter
    if (status) {
      const statusArray = Array.isArray(status) ? status : status.split(",");
      filterQuery.status = { $in: statusArray };
    }

    // **Search Query Logic**
    if (keyword) {
      filterQuery.$or = [
        { "proposalId.proposal_number": { $regex: new RegExp(keyword, "i") } },
        { "proposalId.fbo_name": { $regex: new RegExp(keyword, "i") } },
      ];
    }

    console.log("Filter Query:", JSON.stringify(filterQuery, null, 2));  // Debug: Check if the filter query is correctly built

    // Step 4: Fetch Auditor Payments with Search Applied
    const auditorPayments = await AuditorPayment.find(filterQuery)
      .populate({
        path: "auditorId",
        model: User,
        select: "userName",
      })
      .populate({
        path: "proposalId",
        select: "proposal_number fbo_name outlets proposal_date status createdAt updatedAt",
      })
      .sort(sortQuery)
      .skip((pageNumber - 1) * sizePerPage)
      .limit(sizePerPage);

    console.log("Fetched AuditorPayments:", auditorPayments.length);  // Debug: Check the fetched data length

    if (!auditorPayments.length) {
      return res.json({ total: 0, currentPage: pageNumber, data: [] });
    }

    // Step 5: Process each payment and add fallback 'N/A' for missing data
    const proposalsWithAuditor = await Promise.all(
      auditorPayments.map(async (payment) => {
        const proposal = payment.proposalId;
        const auditor = payment.auditorId;

        // Prepare response fields with default null or fallback values
        let totalProposalValue = 0;
        let gst = 0;
        let overallTotal = 0;
        let totalReceived = 0;

        // If proposal exists, calculate values, otherwise set to null
        if (proposal) {
          totalProposalValue = proposal.outlets.reduce(
            (acc, outlet) => acc + parseFloat(outlet.amount?.$numberInt || outlet.amount || 0),
            0
          );
          gst = totalProposalValue * 0.18;
          overallTotal = totalProposalValue + gst;

          // Calculate total payment received
          const paymentReceived = await AuditorPayment.aggregate([
            {
              $match: {
                proposalId: proposal._id,
                status: "accepted",
              },
            },
            {
              $group: {
                _id: null,
                totalReceived: { $sum: "$amountReceived" },
              },
            },
          ]);
          totalReceived = paymentReceived?.[0]?.totalReceived || 0;
        }

        return {
          _id: proposal ? proposal._id : null,
          proposal_number: proposal ? proposal.proposal_number : "N/A",  // Default to "N/A" if proposal is missing
          auditor_paymentId: payment._id,
          fbo_name: proposal ? proposal.fbo_name : "N/A",  // Default to "N/A" if proposal is missing
          totalOutlets: proposal ? proposal.outlets.length : 0,  // Default to 0 if proposal is missing
          notInvoicedOutlets: proposal ? proposal.outlets.filter((outlet) => !outlet.is_invoiced).length : 0,  // Default to 0 if proposal is missing
          status: payment.status,
          auditor_id: auditor ? auditor._id : "N/A",  // Default to "N/A" if auditor is missing
          auditor_name: auditor ? auditor.userName : "N/A",  // Default to "N/A" if auditor is missing
          Proposal_value: proposal ? `₹${overallTotal.toFixed(2)}` : "N/A",  // Default to "N/A" if proposal is missing
          paymentReceived: `₹${totalReceived.toFixed(2)}`,
          amounToVerify: `₹${payment.amountReceived.toFixed(2)}`,
        };
      })
    );

    // Step 6: Get total count for pagination
    const totalCount = await AuditorPayment.countDocuments(filterQuery);

    // Step 7: Send response with paginated results
    res.json({
      total: totalCount,
      currentPage: pageNumber,
      data: proposalsWithAuditor,
    });
  } catch (error) {
    console.error("Error fetching proposals:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};












export const deleteFields = async (req, res) => {
  try {
    const arrayOfAuditorPaymentIds = req.body;

    // Validate input
    if (!Array.isArray(arrayOfAuditorPaymentIds)) {
      return res
        .status(400)
        .json({ error: "Invalid input: Expected an array of AuditorPayment IDs" });
    }

    // Find all AuditorPayments to get their referenceDocument paths
    const auditorPayments = await AuditorPayment.find({
      _id: { $in: arrayOfAuditorPaymentIds },
    });

    // Delete associated reference document images
    auditorPayments.forEach((payment) => {
      if (payment.referenceDocument) {
        const filePath = path.join(__dirname, "../uploads", payment.referenceDocument);
        fs.unlink(filePath, (err) => {
          if (err) console.error(`Failed to delete file: ${filePath}`, err);
          else console.log(`Deleted file: ${filePath}`);
        });
      }
    });

    // Delete AuditorPayment records
    await AuditorPayment.deleteMany({ _id: { $in: arrayOfAuditorPaymentIds } });

    res.status(200).json({ message: "Auditor Payments and associated documents deleted successfully" });
  } catch (err) {
    console.error("Error deleting AuditorPayments:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};


export const getNoOfPayment = async (req, res) => {
  try {
    const { proposalId } = req.params;

    if (!proposalId) {
      return res.status(400).json({ message: "Proposal ID is required." });
    }

    // Find all payments for the given proposalId and populate auditorId
    const payments = await AuditorPayment.find({ proposalId })
      .populate({
        path: "auditorId",
        model: User,
        select: "userName"
      })
      .select("amountReceived auditorId"); // Only select amountReceived and auditorId

    // Map to desired response format
    const result = payments.map(payment => ({
      _id: payment._id,
      auditorName: payment.auditorId ? payment.auditorId.userName : null,
      amountReceived: payment.amountReceived

    }));

    res.status(200).json({ payments: result });
  } catch (error) {
    console.error("Error fetching number of payments:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllProposalDetailsAuditor = async (req, res) => {
  try {
    console.log("Request body:", req.body);

    // Step 1: Extract query parameters and auditorId
    const { page = 1, pageSize = 10, sort, status, keyword, auditorId } = req.query;

    const pageNumber = parseInt(page, 10);
    const sizePerPage = parseInt(pageSize, 10);

    if (isNaN(pageNumber) || pageNumber < 1 || isNaN(sizePerPage) || sizePerPage < 1) {
      return res.status(400).json({ message: "Invalid page or pageSize parameter" });
    }

    // Step 2: Sorting logic
    let sortQuery = { createdAt: 1 }; // Default sorting (oldest first)
    if (sort === "newproposal") sortQuery = { createdAt: -1 };
    else if (sort === "alllist") sortQuery = { createdAt: 1 };

    // Step 3: Create filter query dynamically
    let filterQuery = {};

    // Filter by auditorId if provided
    if (auditorId) {
      filterQuery.auditorId = auditorId;
    }

    // Adding the status filter
    if (status) {
      const statusArray = Array.isArray(status) ? status : status.split(",");
      filterQuery.status = { $in: statusArray };
    }

    // **Search Query Logic**
    if (keyword) {
      filterQuery.$or = [
        { "proposalId.proposal_number": { $regex: new RegExp(keyword, "i") } },
        { "proposalId.fbo_name": { $regex: new RegExp(keyword, "i") } },
      ];
    }

    console.log("Filter Query:", JSON.stringify(filterQuery, null, 2));  // Debug: Check if the filter query is correctly built

    // Step 4: Fetch Auditor Payments with Search Applied
    const auditorPayments = await AuditorPayment.find(filterQuery)
      .populate({
        path: "auditorId",
        model: User,
        select: "userName",
      })
      .populate({
        path: "proposalId",
        select: "proposal_number fbo_name outlets proposal_date status createdAt updatedAt",
      })
      .sort(sortQuery)
      .skip((pageNumber - 1) * sizePerPage)
      .limit(sizePerPage);

    console.log("Fetched AuditorPayments:", auditorPayments.length);  // Debug: Check the fetched data length

    if (!auditorPayments.length) {
      return res.json({ total: 0, currentPage: pageNumber, data: [] });
    }

    // Step 5: Process each payment and add fallback 'N/A' for missing data
    const proposalsWithAuditor = await Promise.all(
      auditorPayments.map(async (payment) => {
        const proposal = payment.proposalId;
        const auditor = payment.auditorId;

        // Prepare response fields with default null or fallback values
        let totalProposalValue = 0;
        let gst = 0;
        let overallTotal = 0;
        let totalReceived = 0;

        // If proposal exists, calculate values, otherwise set to null
        if (proposal) {
          totalProposalValue = proposal.outlets.reduce(
            (acc, outlet) => acc + parseFloat(outlet.amount?.$numberInt || outlet.amount || 0),
            0
          );
          gst = totalProposalValue * 0.18;
          overallTotal = totalProposalValue + gst;

          // Calculate total payment received
          const paymentReceived = await AuditorPayment.aggregate([
            {
              $match: {
                proposalId: proposal._id,
                status: "accepted",
              },
            },
            {
              $group: {
                _id: null,
                totalReceived: { $sum: "$amountReceived" },
              },
            },
          ]);
          totalReceived = paymentReceived?.[0]?.totalReceived || 0;
        }

        return {
          _id: proposal ? proposal._id : null,
          proposal_number: proposal ? proposal.proposal_number : "N/A",  // Default to "N/A" if proposal is missing
          auditor_paymentId: payment._id,
          fbo_name: proposal ? proposal.fbo_name : "N/A",  // Default to "N/A" if proposal is missing
          totalOutlets: proposal ? proposal.outlets.length : 0,  // Default to 0 if proposal is missing
          notInvoicedOutlets: proposal ? proposal.outlets.filter((outlet) => !outlet.is_invoiced).length : 0,  // Default to 0 if proposal is missing
          status: payment.status,
          auditor_id: auditor ? auditor._id : "N/A",  // Default to "N/A" if auditor is missing
          auditor_name: auditor ? auditor.userName : "N/A",  // Default to "N/A" if auditor is missing
          Proposal_value: proposal ? `₹${overallTotal.toFixed(2)}` : "N/A",  // Default to "N/A" if proposal is missing
          paymentReceived: `₹${totalReceived.toFixed(2)}`,
          amounToVerify: `₹${payment.amountReceived.toFixed(2)}`,
        };
      })
    );

    // Step 6: Get total count for pagination
    const totalCount = await AuditorPayment.countDocuments(filterQuery);

    // Step 7: Send response with paginated results
    res.json({
      total: totalCount,
      currentPage: pageNumber,
      data: proposalsWithAuditor,
    });
  } catch (error) {
    console.error("Error fetching proposals:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};