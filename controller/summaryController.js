import ExcelJS from "exceljs";
import moment from "moment";
import Proposal from "../models/proposalModel.js";
import Invoice from "../models/invoiceModel.js";
import AuditorPayment from "../models/auditorPaymentModel.js";
import WorkLog from "../models/workLogModel.js";

/**
 * Generates an Excel file with 6 different sheets
 * Query Parameters:
 * @param {string} startDate - Format: 'YYYY-MM-DD'
 * @param {string} endDate   - Format: 'YYYY-MM-DD'
 */
export const generateProposalExcel = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "Both startDate and endDate are required in YYYY-MM-DD format",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        message: "Invalid date format. Please use YYYY-MM-DD format",
      });
    }
    // Fetch proposals in date range
    const proposals = await Proposal.find({
      proposal_date: { $gte: start, $lte: end },
    })
      .populate("enquiryId")
      .populate({
        path: "enquiryId",
        populate: {
          path: "business",
          select: "name",
        },
      })
      .lean()
      .then((proposals) => {
        return proposals.map((proposal) => {
          // Calculate total proposal value including GST
          const totalValue = proposal.outlets
            ? proposal.outlets.reduce((sum, outlet) => {
                const outletValue = outlet.quantity * outlet.unit_cost;
                return sum + outletValue;
              }, 0)
            : 0;

          const totalWithGST = totalValue + totalValue * 0.18; // Adding 18% GST

          return {
            ...proposal,
            outletCount: proposal.outlets ? proposal.outlets.length : 0,
            totalValue: totalValue,
            totalWithGST: totalWithGST,
          };
        });
      });

    // Fetch all auditor payments for these proposals
    const proposalIds = proposals.map((p) => p._id);
    const auditorPayments = await AuditorPayment.find({
      proposalId: { $in: proposalIds },
    })
      .populate("auditorId")
      .lean();

    // Create a map of proposal payments
    const proposalPaymentsMap = auditorPayments.reduce((map, payment) => {
      if (!map[payment.proposalId]) {
        map[payment.proposalId] = [];
      }
      map[payment.proposalId].push(payment);
      return map;
    }, {});

    // Determine the maximum number of accepted payments for any proposal
    let maxPayments = 0;
    for (const proposalId in proposalPaymentsMap) {
      const payments = proposalPaymentsMap[proposalId];
      const acceptedCount = payments.filter(
        (p) => p.status === "accepted"
      ).length;
      if (acceptedCount > maxPayments) {
        maxPayments = acceptedCount;
      }
    }

    // Fetch invoices in date range
    const invoices = await Invoice.find({
      invoice_date: { $gte: start, $lte: end },
    }).lean();

    // Fetch daily work logs in date range
    const workLogs = await WorkLog.find({
      createdAt: { $gte: start, $lte: end }, // ✅ Use createdAt or the actual field
    })
      .populate("userId", "userName") // ✅ Correct field to populate
      .lean();

    // Group work logs by date
    const workLogsByDate = workLogs.reduce((acc, log) => {
      const dateKey = moment(log.createdAt).format("YYYY-MM-DD");

      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          executiveName: log.userId?.userName || "N/A",
          descriptions: [],
          remarks: [],
        };
      }

      // Handle descriptions
      if (log.workType === "leave" && log.leaveStatus === "approved") {
        let leaveDesc = "";

        if (log.leaveType === "sickLeave") {
          leaveDesc = "Sick Leave";
        } else if (log.leaveType === "casualLeave") {
          leaveDesc = "Casual Leave";
        }

        if (log.isLOP) {
          leaveDesc += leaveDesc ? " + LOP" : "LOP";
        }

        if (leaveDesc) {
          acc[dateKey].descriptions.push(leaveDesc);
        }
      } else if (log.description) {
        acc[dateKey].descriptions.push(log.description);
      }

      // Handle remarks
      if (log.remarks) {
        acc[dateKey].remarks.push(log.remarks);
      }

      return acc;
    }, {});

    console.log("workLogsByDate:", workLogsByDate);

    console.log(proposals);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();

    // 1. Proposal Sheet (updated columns from image)
    const proposalSheet = workbook.addWorksheet("Proposal Sheet");
    proposalSheet.columns = [
      { header: "Date", key: "date", width: 15 },
      { header: "Proposal Number", key: "number", width: 18 },
      { header: "Client Name", key: "clientName", width: 30 },
      { header: "Location", key: "location", width: 20 },
      { header: "Scope", key: "scope", width: 20 },
      { header: "Email Id", key: "emailId", width: 40 },
      { header: "Outlet Count", key: "count", width: 15 },
      { header: "ProposalValue", key: "value", width: 12 },
    ];

    // 2. Invoice Format Sheet (updated columns from image)
    const invoiceSheet = workbook.addWorksheet("Invoice Format");
    invoiceSheet.columns = [
      { header: "Sr. No/Invoice Number", key: "invoiceNumber", width: 28 },
      { header: "Date", key: "date", width: 22 },
      { header: "Field Executive Name", key: "fieldExecutiveName", width: 30 },
      { header: "Team Leader Name", key: "teamLeaderName", width: 30 },
      { header: "Client Name", key: "clientName", width: 35 },
      { header: "Location", key: "location", width: 25 },
      { header: "Zone", key: "zone", width: 20 },
      ...Array.from(
        {
          length: Math.max(...invoices.map((inv) => inv.outlets?.length || 0)),
        },
        (_, index) => [
          {
            header: `WORK ${index + 1}`,
            key: `work${index + 1}service`,
            width: 20,
          },
          {
            header: `WORK ${index + 1}: Qty`,
            key: `work${index + 1}Qty`,
            width: 10,
          },
          { header: "Unit Cost", key: `work${index + 1}UnitCost`, width: 20 },
          {
            header: `Total WORK ${index + 1}`,
            key: `work${index + 1}Total`,
            width: 22,
          },
        ]
      ).flat(),
      { header: "Overall Total", key: "overallTotal", width: 15 },
      { header: "GST", key: "gst", width: 10 },
      {
        header: "Bill Value including GST",
        key: "billValueWithGST",
        width: 30,
      },
      { header: "Amount Receivable", key: "amountReceivable", width: 15 },

      {
        header: "Invoice sent to client",
        key: "invoiceSentToClient",
        width: 30,
      },
      { header: "Payment status", key: "paymentStatus", width: 15 },
    ];

    // 3. Proposal Wise Payment Summary
    const paymentSummarySheet = workbook.addWorksheet("Payment Summary");
    paymentSummarySheet.columns = [
      { header: "Proposal Number", key: "proposalNumber", width: 15 },
      { header: "FBO Name", key: "fboName", width: 30 },
      { header: "No. of Payments", key: "paymentCount", width: 15 },
      { header: "Proposal Value", key: "proposalValue", width: 15 },
      { header: "Payment Received", key: "paymentReceived", width: 15 },
      { header: "Balance Amount", key: "balanceAmount", width: 15 },
      ...Array.from({ length: maxPayments }).flatMap((_, idx) => [
        { header: `Payment ${idx + 1}`, key: `Payment ${idx + 1}`, width: 15 },
        {
          header: `Auditor Name ${idx + 1}`,
          key: `Auditor Name ${idx + 1}`,
          width: 20,
        },
      ]),
    ];

    // 4. Daily Work Sample
    const dailyWorkSheet = workbook.addWorksheet("Daily Work Sample");

    // Define the two-row header
    const headerRow1 = [
      "Date",
      "Executive Name",
      "Description",
      "HR",
      "", // This will be merged later
      "HR Revenue",
      "",
      "ERC",
      "",
      "ERC Revenue",
      "",
      "BHOG",
      "",
      "BHOG Revenue",
      "",
      "CSFH",
      "",
      "CSFH Revenue",
      "",
      "CVM",
      "",
      "CVM Revenue",
      "",
      "ERS",
      "",
      "ERS Revenue",
      "",
      "TPA",
      "",
      "TPA Revenue",
      "",
      "Total Unavar Revenue",
      "",
      "Remarks",
    ];

    const headerRow2 = [
      "",
      "",
      "", // For Date, Executive Name, Description
      "MOU",
      "Non Mou",
      "MOU",
      "Non Mou",
      "MOU",
      "Non Mou",
      "MOU",
      "Non Mou",
      "MOU",
      "Non Mou",
      "MOU",
      "Non Mou",
      "MOU",
      "Non Mou",
      "MOU",
      "Non Mou",
      "MOU",
      "Non Mou",
      "MOU",
      "Non Mou",
      "MOU",
      "Non Mou",
      "MOU",
      "Non Mou",
      "MOU",
      "Non Mou",
      "MOU",
      "Non Mou",
      "MOU",
      "Non Mou",
      "",
    ];
    dailyWorkSheet.addRow(headerRow1);
    const headerRow2Actual = dailyWorkSheet.addRow(headerRow2);

    // Define the columns for data rows (based on the second header row)
    dailyWorkSheet.columns = [
      { key: "date", width: 15 },
      { key: "executiveName", width: 25 },
      { key: "description", width: 50 },
      { key: "hrMOU", width: 10 },
      { key: "hrNonMou", width: 10 },
      { key: "hrRevenueMOU", width: 10 },
      { key: "hrRevenueNonMou", width: 10 },
      { key: "ercMOU", width: 10 },
      { key: "ercNonMou", width: 10 },
      { key: "ercRevenueMOU", width: 10 },
      { key: "ercRevenueNonMou", width: 10 },
      { key: "bhogMOU", width: 10 },
      { key: "bhogNonMou", width: 10 },
      { key: "bhogRevenueMOU", width: 10 },
      { key: "bhogRevenueNonMou", width: 10 },
      { key: "csfhMOU", width: 10 },
      { key: "csfhNonMou", width: 10 },
      { key: "csfhRevenueMOU", width: 10 },
      { key: "csfhRevenueNonMou", width: 10 },
      { key: "cvmMOU", width: 10 },
      { key: "cvmNonMou", width: 10 },
      { key: "cvmRevenueMOU", width: 10 },
      { key: "cvmRevenueNonMou", width: 10 },
      { key: "ersMOU", width: 10 },
      { key: "ersNonMou", width: 10 },
      { key: "ersRevenueMOU", width: 10 },
      { key: "ersRevenueNonMou", width: 10 },
      { key: "tpaMOU", width: 10 },
      { key: "tpaNonMou", width: 10 },
      { key: "tpaRevenueMOU", width: 10 },
      { key: "tpaRevenueNonMou", width: 10 },
      { key: "totalUnavarRevenueMOU", width: 10 },
      { key: "totalUnavarRevenueNonMou", width: 10 },
      { key: "remarks", width: 25 },
    ];

    // Merge cells for the first header row
    dailyWorkSheet.mergeCells("D1:E1"); // HR
    dailyWorkSheet.mergeCells("F1:G1"); // HR Revenue
    dailyWorkSheet.mergeCells("H1:I1"); // ERC
    dailyWorkSheet.mergeCells("J1:K1"); // ERC Revenue
    dailyWorkSheet.mergeCells("L1:M1"); // BHOG
    dailyWorkSheet.mergeCells("N1:O1"); // BHOG Revenue
    dailyWorkSheet.mergeCells("P1:Q1"); // CSFH
    dailyWorkSheet.mergeCells("R1:S1"); // CSFH Revenue
    dailyWorkSheet.mergeCells("T1:U1"); // CVM
    dailyWorkSheet.mergeCells("V1:W1"); // CVM Revenue
    dailyWorkSheet.mergeCells("X1:Y1"); // ERS
    dailyWorkSheet.mergeCells("Z1:AA1"); // ERS Revenue
    dailyWorkSheet.mergeCells("AB1:AC1"); // TPA
    dailyWorkSheet.mergeCells("AD1:AE1"); // TPA Revenue
    dailyWorkSheet.mergeCells("AF1:AG1"); // Total Unavar Revenue

    // Merge cells for the first three columns that span both rows
    dailyWorkSheet.mergeCells("A1:A2"); // Date
    dailyWorkSheet.mergeCells("B1:B2"); // Executive Name
    dailyWorkSheet.mergeCells("C1:C2"); // Description
    dailyWorkSheet.mergeCells("AH1:AH2"); // Remarks

    // Style header rows
    const headerRow1Style = dailyWorkSheet.getRow(1);
    headerRow1Style.font = { bold: true };
    headerRow1Style.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFFFC0CB" }, // Light red/pink
    };
    headerRow1Style.alignment = { vertical: "middle", horizontal: "center" };

    const headerRow2Style = dailyWorkSheet.getRow(2);
    headerRow2Style.font = { bold: true };
    headerRow2Style.alignment = { vertical: "middle", horizontal: "center" };

    // Apply specific colors to MOU and Non Mou cells in the second header row
    headerRow2Actual.eachCell((cell) => {
      if (cell.value === "MOU") {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF00B0F0" }, // Blue
        };
      } else if (cell.value === "Non Mou") {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF92D050" }, // Green
        };
      }
    });

    // Add data to Proposal Sheet (example, update mapping as per your model)
    proposals.forEach((proposal) => {
      proposalSheet.addRow({
        date: proposal.proposal_date
          ? moment(proposal.proposal_date).format("DD.MM.YYYY")
          : "",
        number: proposal.proposal_number || "",
        clientName: proposal.fbo_name || "",
        location: proposal.address.line2 || "",
        scope: proposal.enquiryId.service || "",
        emailId: proposal.email || "",
        count: proposal.outletCount || "",
        value: proposal.totalWithGST || "",
      });
    });
    // Add data to Invoice Format sheet
    invoices.forEach((invoice) => {
      // Calculate totals for outlets (WORK 1-6)
      const workData = Array(6).fill({ qty: "", unitCost: "", total: "" });
      if (invoice.outlets && invoice.outlets.length) {
        invoice.outlets.slice(0, 6).forEach((outlet, idx) => {
          workData[idx] = {
            qty: outlet.quantity || "",
            unitCost: outlet.unit_cost || "",
            total:
              outlet.amount ||
              (outlet.quantity && outlet.unit_cost
                ? outlet.quantity * outlet.unit_cost
                : ""),
          };
        });
      }

      // Calculate overall total (sum of outlet amounts)
      const overallTotal = invoice.outlets
        ? invoice.outlets.reduce((sum, o) => sum + (o.amount || 0), 0)
        : 0;
      // Calculate GST (18% of overall total)
      const gst = overallTotal * 0.18;
      // Calculate bill value with GST
      const billValueWithGST = overallTotal + gst;

      // Prepare dynamic work columns for each outlet (WORK 1, WORK 2, ...)
      const maxWorks = Math.max(
        ...invoices.map((inv) => inv.outlets?.length || 0),
        6
      ); // fallback to 6
      const workColumns = {};
      for (let i = 0; i < maxWorks; i++) {
        const outlet = invoice.outlets && invoice.outlets[i];
        workColumns[`work${i + 1}service`] = outlet
          ? outlet.description || ""
          : "";
        workColumns[`work${i + 1}Qty`] = outlet ? outlet.quantity || "" : "";
        workColumns[`work${i + 1}UnitCost`] = outlet
          ? outlet.unit_cost || ""
          : "";
        workColumns[`work${i + 1}Total`] = outlet
          ? outlet.amount ||
            (outlet.quantity && outlet.unit_cost
              ? outlet.quantity * outlet.unit_cost
              : "")
          : "";
      }

      invoiceSheet.addRow({
        invoiceNumber: invoice.invoice_number || "",
        date: invoice.invoice_date
          ? moment(invoice.invoice_date).format("DD.MM.YYYY")
          : "",
        fieldExecutiveName: invoice.field_executive_name || "",
        teamLeaderName: invoice.team_leader_name || "",
        clientName: invoice.fbo_name || "",
        location: invoice.address?.line2 || "",
        zone: invoice.zone || "",
        ...workColumns,
        overallTotal: overallTotal || "",
        gst: gst || "",
        billValueWithGST: billValueWithGST || "",
        amountReceivable: billValueWithGST || "",
        invoiceSentToClient: invoice.mail_status || "",
        paymentStatus: invoice.status || "",
      });
    });

    // Add data to Payment Summary sheet
    proposals.forEach((proposal) => {
      const proposalPayments = proposalPaymentsMap[proposal._id] || [];
      // Get all accepted payments and sum their amounts
      const acceptedPayments = proposalPayments.filter(
        (payment) => payment.status === "accepted"
      );
      const totalAmountReceived = acceptedPayments.reduce((sum, payment) => {
        return sum + (parseFloat(payment.amountReceived) || 0);
      }, 0);

      // Calculate balance as proposal value minus total amount received
      const balanceAmount = (proposal.totalWithGST || 0) - totalAmountReceived;

      // Add dynamic Payment N and Auditor Name N columns for each accepted payment
      const rowData = {
        proposalNumber: proposal.proposal_number || "",
        fboName: proposal.fbo_name || "",
        paymentCount: acceptedPayments.length,
        proposalValue: proposal.totalWithGST || 0,
        paymentReceived: totalAmountReceived,
        balanceAmount: balanceAmount,
      };

      // For each accepted payment, add Payment N and Auditor Name N fields
      acceptedPayments.forEach((payment, idx) => {
        rowData[`Payment ${idx + 1}`] = payment.amountReceived || "";
        rowData[`Auditor Name ${idx + 1}`] =
          payment.auditorId && payment.auditorId.userName
            ? payment.auditorId.userName
            : "";
      });
      // Fill empty cells for Payment/Auditor columns if less than maxPayments
      for (let i = acceptedPayments.length; i < maxPayments; i++) {
        rowData[`Payment ${i + 1}`] = "";
        rowData[`Auditor Name ${i + 1}`] = "";
      }

      paymentSummarySheet.addRow(rowData);
    });

    Object.values(workLogsByDate).forEach((workLog) => {
      const row = dailyWorkSheet.addRow({
        date: workLog.date ? moment(workLog.date).format("DD.MM.YYYY") : "",
        executiveName: workLog.executiveName,
        description: workLog.descriptions.join("\n"), // Each task on a new line

        hrMOU: "",
        hrNonMou: "",
        hrRevenueMOU: "",
        hrRevenueNonMou: "",
        ercMOU: "",
        ercNonMou: "",
        ercRevenueMOU: "",
        ercRevenueNonMou: "",
        bhogMOU: "",
        bhogNonMou: "",
        bhogRevenueMOU: "",
        bhogRevenueNonMou: "",
        csfhMOU: "",
        csfhNonMou: "",
        csfhRevenueMOU: "",
        csfhRevenueNonMou: "",
        cvmMOU: "",
        cvmNonMou: "",
        cvmRevenueMOU: "",
        cvmRevenueNonMou: "",
        ersMOU: "",
        ersNonMou: "",
        ersRevenueMOU: "",
        ersRevenueNonMou: "",
        tpaMOU: "",
        tpaNonMou: "",
        tpaRevenueMOU: "",
        tpaRevenueNonMou: "",
        totalUnavarRevenueMOU: "",
        totalUnavarRevenueNonMou: "",

        // ✅ Corrected from `dailyLog` to `workLog`
        remarks: workLog.remarks.join("\n"),
      });
      // Enable text wrapping for the description and remarks columns
      row.getCell('description').alignment = { wrapText: true };
      row.getCell('remarks').alignment = { wrapText: true };
    });

    // // Add data to Daily Work Sample sheet
    // Object.values(workLogsByDate).forEach((dailyLog) => {
    //   dailyWorkSheet.addRow({
    //     date: dailyLog.date ? moment(dailyLog.date).format("DD.MM.YYYY") : "",
    //     executiveName: dailyLog.executiveName,
    //     description: dailyLog.descriptions.join("; "), // Concatenate descriptions
    //     // Placeholder for HR, ERC, BHOG, etc. MOU/Non Mou values
    //     // You will need to define how these values are derived from your WorkLog model
    //     hrMOU: "dsffsd",
    //     hrNonMou: "",
    //     hrRevenueMOU: "",
    //     hrRevenueNonMou: "",
    //     ercMOU: "",
    //     ercNonMou: "",
    //     ercRevenueMOU: "",
    //     ercRevenueNonMou: "",
    //     bhogMOU: "",
    //     bhogNonMou: "",
    //     bhogRevenueMOU: "sss",
    //     bhogRevenueNonMou: "",
    //     csfhMOU: "",
    //     csfhNonMou: "",
    //     csfhRevenueMOU: "",
    //     csfhRevenueNonMou: "",
    //     cvmMOU: "",
    //     cvmNonMou: "",
    //     cvmRevenueMOU: "",
    //     cvmRevenueNonMou: "",
    //     ersMOU: "",
    //     ersNonMou: "",
    //     ersRevenueMOU: "",
    //     ersRevenueNonMou: "",
    //     tpaMOU: "",
    //     tpaNonMou: "",
    //     tpaRevenueMOU: "",
    //     tpaRevenueNonMou: "",
    //     totalUnavarRevenueMOU: "",
    //     totalUnavarRevenueNonMou: "",
    //     remarks: dailyLog.remarks.join("; "), // Concatenate remarks
    //   });
    // });

    // Style the sheets
    [proposalSheet, invoiceSheet, paymentSummarySheet, dailyWorkSheet].forEach(
      (sheet) => {
        // Style header row
        sheet.getRow(1).font = { bold: true };
        sheet.getRow(1).fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" },
        };

        // Add borders to all cells
        sheet.eachRow((row, rowNumber) => {
          row.eachCell((cell) => {
            cell.border = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" },
            };
          });
        });
      }
    );

    const filename = `Proposal_Report_${moment(start).format(
      "YYYYMMDD"
    )}_to_${moment(end).format("YYYYMMDD")}.xlsx`;

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
    res.setHeader("Content-Length", buffer.length);

    // Send the buffer as response
    res.send(buffer);
  } catch (error) {
    console.error("❌ Failed to generate proposal Excel:", error);
    res.status(500).json({
      message: "Failed to generate proposal Excel",
      error: error.message,
    });
  }
};
