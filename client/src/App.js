import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import ClientTable from "./Components/Pages/ClientTable";
import BusinessDetail from "./Components/Pages/BussinessDetail";
import OutletDetail from "./Components/Pages/OutletDetail";
import ClientOnboarding from "./Components/Pages/ClientOnboarding";
import AdminDashboard from "./Components/Layout/AdminDashboard";
import ClientOnboardingSuccess from "./Components/Pages/ClientOnboardingSuccess";
import AddClient from "./Components/Pages/AddClientForm";
import UpdateClient from "./Components/Pages/UpdateClient";
import AdminHeader from "./Components/Layout/AdminHeader";
import ProposalTable from "./Components/Pages/ProposalTable";
import LoginPage from "./Components/Auth/LoginPage";
import ForgotPasswordPage from "./Components/Auth/ForgotPassword";
import InvoiceTable from "./Components/Pages/InvoiceTable";
import Dashboard from "./Components/Pages/Dashboard";
import EnquiryTable from "./Components/Pages/EnquiryTable";
import ClientApprovalTable from "./Components/Pages/ClientApprovalTable";
import AgreementTable from "./Components/Pages/AgreementTable";
import ViewProposal from "./Components/Pages/ViewProposal";
import ViewInvoice from "./Components/Pages/ViewInvoice";
import ViewAgreement from "./Components/Pages/ViewAgreement";
import UnassignedAuditTable from "./Components/Pages/UnassignedAuditTable";
import AssignedAuditCard from "./Components/Pages/AssignedAuditCard";
import AuditForm from "./Components/Pages/AuditForm";
import AuditReport from "./Components/Pages/AuditReport";
import SubmittedForApproval from "./Components/Pages/SubmittedForApproval";
import ModifiedAuditCard from "./Components/Pages/ModifiedAuditCard";
import DraftAuditCard from "./Components/Pages/DraftAuditCard";
import UpdateAuditReport from "./Components/Pages/UpdateAuditReport";
import ApprovedAuditCard from "./Components/Pages/ApprovedAuditCard";
import SettingsPage from "./Components/Pages/SettingPage"; // Correct import path
import CompanyAddressSetting from "./Components/Pages/CompanyAddressSetting"; // Update as per file path
import BankDetailsSetting from "./Components/Pages/BankDetailsSetting"; // Update as per file path
import NoteForm from "./Components/Pages/NoteForm"; // Update as per file path
import MailSettingForm from "./Components/Pages/MailSettingForm"; // Update as per file path
import MailSettingCC from "./Components/Pages/MailSettingCC"; // Update as per file path
import UserListSetting from "./Components/Pages/UserListSetting"; // Update as per file path
import FormLinkMailSetting from "./Components/Pages/FormLinkMailSetting";
import EmployeeWorkForm from "./Components/Layout/EmployeeWorkForm";
import EmployeeDashboard from "./Components/Layout/EmployeeDashboard";
import PaymentFomWithTable from "./Components/Layout/PaymentFomWithTable";
import InvoiceManagement from "./Components/Layout/InvoiceManagement";
import WorkLogTable from "./Components/Pages/WorkLogTable";
import AdminWorkLogTable from "./Components/Pages/AdminWorkLogTable";
import UpdteWorkLog from "./Components/Pages/UpdateWorkLog";
import AuditorPayment from "./Components/Pages/AuditorPayment";
import PaymentRequestTable from "./Components/Pages/PaymentRequestTable";
import AllPaymentRequest from "./Components/Pages/AllPaymentRequest";
import WorkLogCalendarAuditor from "./Components/Pages/WorkLogCalendarAuditor";
import AdminWorkLogCalendar from "./Components/Pages/AdminWorkLogCalendar";
import LeaveRequestTable from "./Components/Pages/LeaveRequestTable";
import RegisterUser from "./Components/Layout/RegisterUser";
import {
  AccountAdminRoute,
  AuditAdminRoute,
} from "./Components/Context/ProtectedRoute";
import AuditTrack from "./Components/Pages/AuditorTrack";
import Summary from "./Components/Pages/Summary";

function App() {
  return (
    <>
      <Routes>
         <Route path="/reg" element={<RegisterUser />} />
        <Route path="/" element={<LoginPage />} />
        <Route path="/emp-form" element={<EmployeeWorkForm />} />

        <Route path="/emp-dashboard" element={<EmployeeDashboard />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/audit-track" element={<AuditTrack />} />
        <Route path="/payment-form" element={<PaymentFomWithTable />} />
        <Route path="/invoice-mangement" element={<InvoiceManagement />} />

        <Route element={<AccountAdminRoute />}>
          {/* Main Tables */}
          <Route path="/enquiry" element={<EnquiryTable />} />
          <Route path="/client-approval" element={<ClientApprovalTable />} />
          <Route path="/client-profile" element={<ClientTable />} />
          <Route path="/invoice" element={<InvoiceTable />} />
          <Route path="/proposal" element={<ProposalTable />} />
          <Route path="/agreement" element={<AgreementTable />} />
          <Route path="/add" element={<BusinessDetail />} />
          <Route path="/summary" element={<Summary />} />

          {/* View Specific Items */}
          <Route
            path="/proposal/view-proposal/:proposalId"
            element={<ViewProposal />}
          />
          <Route
            path="/invoice/view-invoice/:invoiceId"
            element={<ViewInvoice />}
          />
          <Route
            path="/agreement/view-agreement/:agreementId"
            element={<ViewAgreement />}
          />

          {/* Settings Page and Nested Routes */}
          <Route path="/settings" element={<SettingsPage />}>
            <Route path="company-address" element={<CompanyAddressSetting />} />
            <Route path="bank-details" element={<BankDetailsSetting />} />
            <Route path="notes" element={<NoteForm />} />
            <Route path="mail" element={<MailSettingForm />} />
            <Route path="mail-message" element={<MailSettingForm />} />
            <Route path="form-link-mail" element={<FormLinkMailSetting />} />
            <Route path="cc-mails" element={<MailSettingCC />} />
            <Route path="user" element={<UserListSetting />} />
          </Route>

          {/* Add Client Profile with Business Detail */}
          <Route
            path="/client-profile/add-business"
            element={
              <AdminDashboard>
                <AddClient newClientTitle={"Client Details Form"}>
                  <BusinessDetail />
                </AddClient>
              </AdminDashboard>
            }
          />
        </Route>

        <Route element={<AuditAdminRoute />}>
          {/* Main Audit Routes */}
          <Route path="/audit-work" element={<UnassignedAuditTable />} />
          <Route path="/assigned-audit" element={<AssignedAuditCard />} />
          <Route path="/draft" element={<DraftAuditCard />} />
          <Route path="/modified" element={<ModifiedAuditCard />} />
          <Route path="/approved" element={<ApprovedAuditCard />} />
          <Route path="/payment-request" element={<PaymentRequestTable />} />
          <Route path="/all-payment" element={<AllPaymentRequest />} />
          <Route path="/leave-request" element={<LeaveRequestTable />} />

          <Route
            path="/submittedForApproval"
            element={<SubmittedForApproval />}
          />

          {/* Nested Routes for Audits - Avoid Repeating Main Route Segment */}

          {/* Assigned Audits */}
          <Route
            path="/assigned-audit/audit-form/:audit_id"
            element={<AuditForm />}
          />
          <Route path="/work-log-table" element={<WorkLogTable />} />
          <Route path="/work-log/:date" element={<WorkLogTable />} />
          <Route path="/WorkLog2" element={<WorkLogCalendarAuditor />} />
          <Route path="/auditor-payment" element={<AuditorPayment />} />
          <Route
            path="/admin-work-log/:fromDate?/:toDate?"
            element={<AdminWorkLogTable />}
          />

          <Route path="/update-work-log" element={<UpdteWorkLog />} />
          <Route
            path="/admin-work-log-calendar"
            element={<AdminWorkLogCalendar />}
          />
          <Route
            path="/assigned-audit/audit-form/audit-report"
            element={<AuditReport />}
          />
          <Route
            path="/assigned-audit/audit-form/updateAuditReport/:audit_id"
            element={<UpdateAuditReport />}
          />

          {/* Draft Audits */}
          <Route path="/draft/audit-form/:audit_id" element={<AuditForm />} />
          <Route
            path="/draft/audit-form/audit-report/:audit_id"
            element={<AuditReport />}
          />
          <Route
            path="/draft/audit-form/updateAuditReport/:audit_id"
            element={<UpdateAuditReport />}
          />

          {/* Rejected Audits */}
          <Route
            path="/modified/audit-form/:audit_id"
            element={<AuditForm />}
          />
          <Route
            path="/modified/audit-form/audit-report/:audit_id"
            element={<AuditReport />}
          />
          <Route
            path="/modified/audit-form/updateAuditReport/:audit_id"
            element={<UpdateAuditReport />}
          />

          {/* Approved Audits */}
          <Route
            path="/approved/audit-form/:audit_id"
            element={<AuditForm />}
          />
          <Route
            path="/approved/audit-form/audit-report/:audit_id"
            element={<AuditReport />}
          />
          <Route
            path="/approved/audit-form/updateAuditReport/:audit_id"
            element={<UpdateAuditReport />}
          />

          {/* Submitted for Approval Audits */}
          <Route
            path="/submittedForApproval/audit-form/:audit_id"
            element={<AuditForm />}
          />
          <Route
            path="/submittedForApproval/audit-form/audit-report/:audit_id"
            element={<AuditReport />}
          />
          <Route
            path="/submittedForApproval/audit-form/updateAuditReport/:audit_id"
            element={<UpdateAuditReport />}
          />
        </Route>

        <Route
          path="client-profile/update-client"
          element={
            <>
              <AdminHeader />

              <UpdateClient newClientTitle="Update Client" />
            </>
          }
        />

        <Route
          path="client-profile/update-client-form/id/:id"
          element={
            <>
              <AdminHeader />
              <UpdateClient newClientTitle="Update Client" />
            </>
          }
        />

        <Route
          path="client-profile/update-client/id/:id"
          element={
            <AdminDashboard>
              <UpdateClient newClientTitle="View Client" />
            </AdminDashboard>
          }
        />

        <Route
          path="/client-profile/add-outlet"
          element={
            <AdminDashboard>
              <OutletDetail />
            </AdminDashboard>
          }
        />

        <Route path="/client-onboarding" element={<ClientOnboarding />} />
        <Route path="/client-success" element={<ClientOnboardingSuccess />} />
      </Routes>
      <Toaster />
    </>
  );
}

export default App;
