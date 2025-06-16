import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/dbConnect.js";
import cors from "cors";
import morgan from "morgan";
import bussinessRoutes from "./routes/bussinessRoutes.js";
import authenticatinRoutes from "./routes/authenticationRoutes.js";
import enquiryRoutes from "./routes/enquiryRoutes.js";
import proposalRoutes from "./routes/proposalRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import agreementRoutes from "./routes/agreementRoutes.js";
import auditorRoutes from "./routes/auditorRoutes.js";
import settingRoutes from "./routes/settingRoutes.js";
import workLogRoutes from "./routes/workLogRoutes.js";
import summaryRoutes from "./routes/summaryRoutes.js";
import cron from 'node-cron';
import {runCarryForwardForAllUsers,resetFinancialYearLeave} from "./controller/workLogController.js";

import path from "path";
import { fileURLToPath } from "url";
import paymentRoutes from "./routes/paymentRoutes.js";

// Configure environment variables
dotenv.config();

cron.schedule('1 0 1 * *', async () => {
  console.log('⏰ Running monthly carry forward...');
  await runCarryForwardForAllUsers();
});

cron.schedule('1 0 1 4 *', async () => {
  console.log('📅 Yearly financial leave reset running...');
  await resetFinancialYearLeave();
});

// Create Express app
const app = express();

// Get current filename and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// // Serve React app
app.use(express.static(path.join(__dirname, "./client/build")));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));



// Connect to database and start server
connectDB();

// Middleware setup
app.use(express.json());
app.use(cors());
app.use(morgan("dev"));

// API routes
app.use("/api/", bussinessRoutes);
app.use("/api/enquiry", enquiryRoutes);
app.use("/api/proposal", proposalRoutes);
app.use("/api/invoice", invoiceRoutes);
app.use("/api/agreement", agreementRoutes);
app.use("/api/auth", authenticatinRoutes);
app.use("/api/auditor", auditorRoutes);
app.use("/api/setting", settingRoutes);
app.use("/api/worklogs", workLogRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/summary", summaryRoutes);

// All other routes (non-API routes) go to React app
app.use("*", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build/index.html"));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// Port
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
