import ExcelJS from 'exceljs';
import moment from 'moment';
import Proposal from '../models/proposalModel.js';
import Invoice from '../models/invoiceModel.js';
import AuditorPayment from '../models/auditorPaymentModel.js';
import WorkLog from '../models/workLogModel.js';

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
        message: "Both startDate and endDate are required in YYYY-MM-DD format" 
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        message: "Invalid date format. Please use YYYY-MM-DD format" 
      });
    }
    // Fetch proposals in date range
    const proposals = await Proposal.find({
      proposal_date: { $gte: start, $lte: end },
    })
    .populate('enquiryId')
    .populate({
      path: 'enquiryId',
      populate: {
        path: 'business',
        select: 'name'
      }
    })
    .lean()
    .then(proposals => {
      return proposals.map(proposal => {
        // Calculate total proposal value including GST
        const totalValue = proposal.outlets ? proposal.outlets.reduce((sum, outlet) => {
          const outletValue = (outlet.quantity * outlet.unit_cost);
          return sum + outletValue;
        }, 0) : 0;
        
        const totalWithGST = totalValue + (totalValue * 0.18); // Adding 18% GST

        return {
          ...proposal,
          outletCount: proposal.outlets ? proposal.outlets.length : 0,
          totalValue: totalValue,
          totalWithGST: totalWithGST
        };
      });
    });

    // Fetch all auditor payments for these proposals
    const proposalIds = proposals.map(p => p._id);
    const auditorPayments = await AuditorPayment.find({
      proposalId: { $in: proposalIds }
    }).lean();

    // Create a map of proposal payments
    const proposalPaymentsMap = auditorPayments.reduce((map, payment) => {
      if (!map[payment.proposalId]) {
        map[payment.proposalId] = [];
      }
      map[payment.proposalId].push(payment);
      return map;
    }, {});

    // Fetch invoices in date range
    const invoices = await Invoice.find({
      invoice_date: { $gte: start, $lte: end },
    }).lean();

    // Fetch daily work logs in date range
    const workLogs = await WorkLog.find({
      date: { $gte: start, $lte: end },
    }).populate('user').lean();

    // Group work logs by date
    const workLogsByDate = workLogs.reduce((acc, log) => {
      const dateKey = moment(log.date).format('YYYY-MM-DD');
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: log.date,
          executiveName: log.user ? log.user.name : 'N/A',
          descriptions: [],
          remarks: []
        };
      }
      if (log.description) {
        acc[dateKey].descriptions.push(log.description);
      }
      if (log.remarks) {
        acc[dateKey].remarks.push(log.remarks);
      }
      return acc;
    }, {});

    console.log(proposals);

    

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();

    // 1. Proposal Sheet (updated columns from image)
    const proposalSheet = workbook.addWorksheet('Proposal Sheet');
    proposalSheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Number', key: 'number', width: 15 },
      { header: 'Client Name', key: 'clientName', width: 30 },
      { header: 'Location', key: 'location', width: 20 },
      { header: 'Scope', key: 'scope', width: 20 },
      { header: 'Email Id', key: 'emailId', width: 30 },
      { header: 'Conveyance', key: 'conveyance', width: 12 },
      { header: 'Outlet Count', key: 'count', width: 8 },
      { header: 'ProposalValue', key: 'value', width: 12 },
      { header: 'Actual Value', key: 'amount', width: 12 },
      { header: 'Payment Details', key: 'paymentDetails', width: 40 },
      { header: 'Payment Date', key: 'paymentDate', width: 15 },
      { header: 'Amount (Payment)', key: 'amountPayment', width: 15 },
      { header: 'Number (Payment)', key: 'numberPayment', width: 15 },
      { header: 'Invoice Number', key: 'numberPayment', width: 15 },
      { header: 'Source of information', key: 'information', width: 15 },
      { header: 'Certificate Date', key: 'dateInfo', width: 15 },
      { header: 'Audit Done by', key: 'bg', width: 10 },
      { header: 'Audit Date', key: 'dateBg', width: 15 }
    ];

    // 2. Invoice Format Sheet (updated columns from image)
    const invoiceSheet = workbook.addWorksheet('Invoice Format');
    invoiceSheet.columns = [
      { header: 'Sr. No/Invoice Number', key: 'invoiceNumber', width: 18 },
      { header: 'Date', key: 'date', width: 12 },
      { header: 'Order Ref No.', key: 'orderRefNo', width: 15 },
      { header: 'Cust. PO. No.', key: 'custPONo', width: 15 },
      { header: 'Field Executive Name', key: 'fieldExecutiveName', width: 20 },
      { header: 'Team Leader Name', key: 'teamLeaderName', width: 20 },
      { header: 'Client Name', key: 'clientName', width: 25 },
      { header: 'Contracted Amount', key: 'contractedAmount', width: 15 },
      { header: 'Location', key: 'location', width: 15 },
      { header: 'Zone', key: 'zone', width: 10 },
      { header: 'WORK 1: Qty', key: 'work1Qty', width: 10 },
      { header: 'Unit Cost', key: 'work1UnitCost', width: 10 },
      { header: 'Total WORK 1', key: 'work1Total', width: 12 },
      { header: 'WORK 2: Qty', key: 'work2Qty', width: 10 },
      { header: 'Unit Cost', key: 'work2UnitCost', width: 10 },
      { header: 'Total WORK 2', key: 'work2Total', width: 12 },
      { header: 'WORK 3: Qty', key: 'work3Qty', width: 10 },
      { header: 'Unit Cost', key: 'work3UnitCost', width: 10 },
      { header: 'Total WORK 3', key: 'work3Total', width: 12 },
      { header: 'WORK 4: Qty', key: 'work4Qty', width: 10 },
      { header: 'Unit Cost', key: 'work4UnitCost', width: 10 },
      { header: 'Total WORK 4', key: 'work4Total', width: 12 },
      { header: 'WORK 5: Qty', key: 'work5Qty', width: 10 },
      { header: 'Unit Cost', key: 'work5UnitCost', width: 10 },
      { header: 'Total WORK 5', key: 'work5Total', width: 12 },
      { header: 'WORK 6: Qty', key: 'work6Qty', width: 10 },
      { header: 'Unit Cost', key: 'work6UnitCost', width: 10 },
      { header: 'Total WORK 6', key: 'work6Total', width: 12 },
      { header: 'Overall Total', key: 'overallTotal', width: 15 },
      { header: 'GST', key: 'gst', width: 10 },
      { header: 'Bill Value including GST', key: 'billValueWithGST', width: 20 },
      { header: 'Less: TDS Deducted', key: 'tdsDeducted', width: 15 },
      { header: 'Amount Receivable', key: 'amountReceivable', width: 15 },
      { header: 'REMARKS', key: 'remarks', width: 20 },
      { header: 'Invoice Raised', key: 'invoiceRaised', width: 15 },
      { header: 'Invoice sent to client', key: 'invoiceSentToClient', width: 20 },
      { header: 'Payment status', key: 'paymentStatus', width: 15 },
      { header: 'Invoice Prepared By', key: 'invoicePreparedBy', width: 18 },
      { header: 'Credit Note Amount', key: 'creditNoteAmount', width: 15 },
      { header: 'Credit Note Date', key: 'creditNoteDate', width: 15 },
      { header: 'Penalty Amount', key: 'penaltyAmount', width: 15 },
      { header: 'Receive Date', key: 'receiveDate', width: 15 },
      { header: 'Project', key: 'project', width: 15 },
      { header: 'Operation (Billing, Pending, Operation audit, Counterfeit)', key: 'operation', width: 30 },
      { header: 'Month', key: 'month', width: 10 },
      { header: 'Commercial Credit Note and New Invoice Raised', key: 'commercialCreditNote', width: 25 },
      { header: 'Invoice no. for new invoice', key: 'newInvoiceNo', width: 20 },
      { header: 'Reason for Invoice Creation', key: 'reasonForInvoice', width: 20 },
      { header: 'Remarks', key: 'remarks2', width: 20 }
    ];

    // 3. Proposal Wise Payment Summary
    const paymentSummarySheet = workbook.addWorksheet('Payment Summary');
    paymentSummarySheet.columns = [
      { header: 'Proposal Number', key: 'proposalNumber', width: 15 },
      { header: 'FBO Name', key: 'fboName', width: 30 },
      { header: 'No. of Payments', key: 'paymentCount', width: 15 },
      { header: 'Proposal Value', key: 'proposalValue', width: 15 },
      { header: 'Payment Received', key: 'paymentReceived', width: 15 },
      { header: 'Balance Amount', key: 'balanceAmount', width: 15 }
    ];

    // 4. Daily Work Sample
    const dailyWorkSheet = workbook.addWorksheet('Daily Work Sample');

    // Define the two-row header
    const headerRow1 = [
      'Date', 'Executive Name', 'Description',
      'HR', '', // This will be merged later
      'HR Revenue', '',
      'ERC', '',
      'ERC Revenue', '',
      'BHOG', '',
      'BHOG Revenue', '',
      'CSFH', '',
      'CSFH Revenue', '',
      'CVM', '',
      'CVM Revenue', '',
      'ERS', '',
      'ERS Revenue', '',
      'TPA', '',
      'TPA Revenue', '',
      'Total Unavar Revenue', '',
      'Remarks'
    ];

    const headerRow2 = [
      '', '', '', // For Date, Executive Name, Description
      'MOU', 'Non Mou', 'MOU', 'Non Mou', 'MOU', 'Non Mou', 'MOU', 'Non Mou',
      'MOU', 'Non Mou', 'MOU', 'Non Mou', 'MOU', 'Non Mou', 'MOU', 'Non Mou',
      'MOU', 'Non Mou', 'MOU', 'Non Mou', 'MOU', 'Non Mou', 'MOU', 'Non Mou',
      'MOU', 'Non Mou', '', // For Remarks
    ];

    const headerRow1Actual = dailyWorkSheet.addRow(headerRow1);
    const headerRow2Actual = dailyWorkSheet.addRow(headerRow2);

    // Define the columns for data rows (based on the second header row)
    dailyWorkSheet.columns = [
      { key: 'date', width: 15 },
      { key: 'executiveName', width: 25 },
      { key: 'description', width: 50 },
      { key: 'hrMOU', width: 10 },
      { key: 'hrNonMou', width: 10 },
      { key: 'hrRevenueMOU', width: 10 },
      { key: 'hrRevenueNonMou', width: 10 },
      { key: 'ercMOU', width: 10 },
      { key: 'ercNonMou', width: 10 },
      { key: 'ercRevenueMOU', width: 10 },
      { key: 'ercRevenueNonMou', width: 10 },
      { key: 'bhogMOU', width: 10 },
      { key: 'bhogNonMou', width: 10 },
      { key: 'bhogRevenueMOU', width: 10 },
      { key: 'bhogRevenueNonMou', width: 10 },
      { key: 'csfhMOU', width: 10 },
      { key: 'csfhNonMou', width: 10 },
      { key: 'csfhRevenueMOU', width: 10 },
      { key: 'csfhRevenueNonMou', width: 10 },
      { key: 'cvmMOU', width: 10 },
      { key: 'cvmNonMou', width: 10 },
      { key: 'cvmRevenueMOU', width: 10 },
      { key: 'cvmRevenueNonMou', width: 10 },
      { key: 'ersMOU', width: 10 },
      { key: 'ersNonMou', width: 10 },
      { key: 'ersRevenueMOU', width: 10 },
      { key: 'ersRevenueNonMou', width: 10 },
      { key: 'tpaMOU', width: 10 },
      { key: 'tpaNonMou', width: 10 },
      { key: 'tpaRevenueMOU', width: 10 },
      { key: 'tpaRevenueNonMou', width: 10 },
      { key: 'totalUnavarRevenueMOU', width: 10 },
      { key: 'totalUnavarRevenueNonMou', width: 10 },
      { key: 'remarks', width: 25 }
    ];

    // Merge cells for the first header row
    dailyWorkSheet.mergeCells('D1:E1'); // HR
    dailyWorkSheet.mergeCells('F1:G1'); // HR Revenue
    dailyWorkSheet.mergeCells('H1:I1'); // ERC
    dailyWorkSheet.mergeCells('J1:K1'); // ERC Revenue
    dailyWorkSheet.mergeCells('L1:M1'); // BHOG
    dailyWorkSheet.mergeCells('N1:O1'); // BHOG Revenue
    dailyWorkSheet.mergeCells('P1:Q1'); // CSFH
    dailyWorkSheet.mergeCells('R1:S1'); // CSFH Revenue
    dailyWorkSheet.mergeCells('T1:U1'); // CVM
    dailyWorkSheet.mergeCells('V1:W1'); // CVM Revenue
    dailyWorkSheet.mergeCells('X1:Y1'); // ERS
    dailyWorkSheet.mergeCells('Z1:AA1'); // ERS Revenue
    dailyWorkSheet.mergeCells('AB1:AC1'); // TPA
    dailyWorkSheet.mergeCells('AD1:AE1'); // TPA Revenue
    dailyWorkSheet.mergeCells('AF1:AG1'); // Total Unavar Revenue

    // Merge cells for the first three columns that span both rows
    dailyWorkSheet.mergeCells('A1:A2'); // Date
    dailyWorkSheet.mergeCells('B1:B2'); // Executive Name
    dailyWorkSheet.mergeCells('C1:C2'); // Description
    dailyWorkSheet.mergeCells('AH1:AH2'); // Remarks

    // Style header rows
    const headerRow1Style = dailyWorkSheet.getRow(1);
    headerRow1Style.font = { bold: true };
    headerRow1Style.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFC0CB' } // Light red/pink
    };
    headerRow1Style.alignment = { vertical: 'middle', horizontal: 'center' };

    const headerRow2Style = dailyWorkSheet.getRow(2);
    headerRow2Style.font = { bold: true };
    headerRow2Style.alignment = { vertical: 'middle', horizontal: 'center' };

    // Apply specific colors to MOU and Non Mou cells in the second header row
    headerRow2Actual.eachCell((cell, colNumber) => {
      if (cell.value === 'MOU') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF00B0F0' } // Blue
        };
      } else if (cell.value === 'Non Mou') {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF92D050' } // Green
        };
      }
    });

    // Add data to Proposal Sheet (example, update mapping as per your model)
    proposals.forEach(proposal => {
      proposalSheet.addRow({
        date: proposal.proposal_date ? moment(proposal.proposal_date).format('DD.MM.YYYY') : '',
        number: proposal.proposal_number || '',
        clientName: proposal.fbo_name|| '',
        location: proposal.address.line2 || '',
        scope: proposal.enquiryId.service || '',
        emailId: proposal.email || '',
        conveyance: proposal.conveyance || '',
        count: proposal.outletCount || '',
        value: proposal.totalValue || '',
        amount: proposal.totalWithGST || '',
        paymentDetails: proposal.payment_details || '',
        paymentDate: proposal.payment_date ? moment(proposal.payment_date).format('DD.MM.YYYY') : '',
        amountPayment: proposal.amount_payment || '',
        numberPayment: proposal.number_payment || '',
        information: proposal.information || '',
        dateInfo: proposal.date_info ? moment(proposal.date_info).format('DD-MM-YYYY') : '',
        bg: proposal.bg || '',
        dateBg: proposal.date_bg ? moment(proposal.date_bg).format('DD-MM-YYYY') : ''
      });
    });

    // Add data to Invoice Format sheet
    invoices.forEach(invoice => {
      // Calculate totals for outlets (WORK 1-6)
      const workData = Array(6).fill({ qty: '', unitCost: '', total: '' });
      if (invoice.outlets && invoice.outlets.length) {
        invoice.outlets.slice(0, 6).forEach((outlet, idx) => {
          workData[idx] = {
            qty: outlet.quantity || '',
            unitCost: outlet.unit_cost || '',
            total: outlet.amount || (outlet.quantity && outlet.unit_cost ? outlet.quantity * outlet.unit_cost : '')
          };
        });
      }
      invoiceSheet.addRow({
        invoiceNumber: invoice.invoice_number || '',
        date: invoice.invoice_date ? moment(invoice.invoice_date).format('DD.MM.YYYY') : '',
        orderRefNo: invoice.order_ref_no || '',
        custPONo: invoice.cust_po_no || '',
        fieldExecutiveName: invoice.field_executive_name || '',
        teamLeaderName: invoice.team_leader_name || '',
        clientName: invoice.fbo_name || '',
        contractedAmount: invoice.contracted_amount || '',
        location: invoice.address?.line2 || '',
        zone: invoice.zone || '',
        work1Qty: workData[0].qty,
        work1UnitCost: workData[0].unitCost,
        work1Total: workData[0].total,
        work2Qty: workData[1].qty,
        work2UnitCost: workData[1].unitCost,
        work2Total: workData[1].total,
        work3Qty: workData[2].qty,
        work3UnitCost: workData[2].unitCost,
        work3Total: workData[2].total,
        work4Qty: workData[3].qty,
        work4UnitCost: workData[3].unitCost,
        work4Total: workData[3].total,
        work5Qty: workData[4].qty,
        work5UnitCost: workData[4].unitCost,
        work5Total: workData[4].total,
        work6Qty: workData[5].qty,
        work6UnitCost: workData[5].unitCost,
        work6Total: workData[5].total,
        overallTotal: invoice.outlets ? invoice.outlets.reduce((sum, o) => sum + (o.amount || 0), 0) : '',
        gst: invoice.gst_number || '',
        billValueWithGST: '', // You can calculate if needed
        tdsDeducted: invoice.tds_deducted || '',
        amountReceivable: invoice.amount_receivable || '',
        remarks: invoice.remarks || '',
        invoiceRaised: invoice.invoice_raised || '',
        invoiceSentToClient: invoice.mail_status || '',
        paymentStatus: invoice.status || '',
        invoicePreparedBy: invoice.invoice_prepared_by || '',
        creditNoteAmount: invoice.credit_note_amount || '',
        creditNoteDate: invoice.credit_note_date ? moment(invoice.credit_note_date).format('DD.MM.YYYY') : '',
        penaltyAmount: invoice.penalty_amount || '',
        receiveDate: invoice.receive_date ? moment(invoice.receive_date).format('DD.MM.YYYY') : '',
        project: invoice.project || '',
        operation: invoice.operation || '',
        month: invoice.month || '',
        commercialCreditNote: invoice.commercial_credit_note || '',
        newInvoiceNo: invoice.new_invoice_no || '',
        reasonForInvoice: invoice.reason_for_invoice || '',
        remarks2: invoice.remarks2 || ''
      });
    });

    // Add data to Payment Summary sheet
    proposals.forEach(proposal => {
      const proposalPayments = proposalPaymentsMap[proposal._id] || [];
      // Get all accepted payments and sum their amounts
      const acceptedPayments = proposalPayments.filter(payment => payment.status === 'accepted');
      const totalAmountReceived = acceptedPayments.reduce((sum, payment) => {
        return sum + (parseFloat(payment.amountReceived) || 0);
      }, 0);
      
      // Calculate balance as proposal value minus total amount received
      const balanceAmount = (proposal.totalWithGST || 0) - totalAmountReceived;

      paymentSummarySheet.addRow({
        proposalNumber: proposal.proposal_number || '',
        fboName: proposal.fbo_name || '',
        paymentCount: acceptedPayments.length,
        proposalValue: proposal.totalWithGST || 0,
        paymentReceived: totalAmountReceived,
        balanceAmount: balanceAmount
      });
    });

    

    // Add data to Daily Work Sample sheet
    Object.values(workLogsByDate).forEach(dailyLog => {
      dailyWorkSheet.addRow({
        date: dailyLog.date ? moment(dailyLog.date).format('DD.MM.YYYY') : '',
        executiveName: dailyLog.executiveName,
        description: dailyLog.descriptions.join('; '), // Concatenate descriptions
        // Placeholder for HR, ERC, BHOG, etc. MOU/Non Mou values
        // You will need to define how these values are derived from your WorkLog model
        hrMOU: '', 
        hrNonMou: '',
        hrRevenueMOU: '',
        hrRevenueNonMou: '',
        ercMOU: '',
        ercNonMou: '',
        ercRevenueMOU: '',
        ercRevenueNonMou: '',
        bhogMOU: '',
        bhogNonMou: '',
        bhogRevenueMOU: '',
        bhogRevenueNonMou: '',
        csfhMOU: '',
        csfhNonMou: '',
        csfhRevenueMOU: '',
        csfhRevenueNonMou: '',
        cvmMOU: '',
        cvmNonMou: '',
        cvmRevenueMOU: '',
        cvmRevenueNonMou: '',
        ersMOU: '',
        ersNonMou: '',
        ersRevenueMOU: '',
        ersRevenueNonMou: '',
        tpaMOU: '',
        tpaNonMou: '',
        tpaRevenueMOU: '',
        tpaRevenueNonMou: '',
        totalUnavarRevenueMOU: '',
        totalUnavarRevenueNonMou: '',
        remarks: dailyLog.remarks.join('; ') // Concatenate remarks
      });
    });

    // Style the sheets
    [proposalSheet, invoiceSheet, paymentSummarySheet, dailyWorkSheet].forEach(sheet => {
      // Style header row
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };

      // Add borders to all cells
      sheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          };
        });
      });
    });

    const filename = `Proposal_Report_${moment(start).format('YYYYMMDD')}_to_${moment(end).format('YYYYMMDD')}.xlsx`;
    
    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Length', buffer.length);

    // Send the buffer as response
    res.send(buffer);

  } catch (error) {
    console.error('❌ Failed to generate proposal Excel:', error);
    res.status(500).json({ 
      message: 'Failed to generate proposal Excel',
      error: error.message 
    });
  }
};
