import React, { useState } from "react";
import { DatePicker, Button, Card, Divider, message } from "antd";
import { DownloadOutlined } from "@ant-design/icons";
import * as XLSX from 'xlsx';
import AdminDashboard from "../Layout/AdminDashboard";

const { RangePicker } = DatePicker;

const SummaryReports = () => {
  const [dateRange, setDateRange] = useState(null);

  // Sample summary data - replace with your actual data in production
  const summaryItems = [
    { id: 1, title: "Summary " },
   
  ];
 
  
  const handleDateChange = (dates) => {
    setDateRange(dates);
  };

  const generateAndDownload = async (summaryId) => {
    if (!dateRange || dateRange.length !== 2) {
      message.warning("Please select a date range first.");
      return;
    }

    const startDate = dateRange[0].format("YYYY-MM-DD");
    const endDate = dateRange[1].format("YYYY-MM-DD");

    try {
      const response = await fetch(
        `/api/summary/generateProposalExcel?startDate=${startDate}&endDate=${endDate}`
      );
      if (!response.ok) {
        throw new Error("Failed to generate Excel file");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Summary_Report_${summaryId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      message.success("Excel sheet downloaded successfully");
    } catch (error) {
      message.error("Failed to download Excel sheet");
    }
  };

  return (
    <AdminDashboard>
      <div className="p-8 bg-blue-50 min-h-screen">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-semibold text-gray-800">
            Summary Reports
          </h2>
          <div className="flex items-center">
            <span className="mr-4 text-gray-700">Filter by date</span>
            <RangePicker 
              onChange={handleDateChange}
              className="bg-white"
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-medium text-gray-700 mb-4">Summary</h3>
          <Divider className="my-4" />
        
          {summaryItems.map((item) => (
            <Card 
              key={item.id}
              className="mb-4 bg-gray-200 border-0"
            >
              <div className="flex justify-between items-center">
                <div className="text-lg font-medium">{item.title}</div>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  onClick={() => generateAndDownload(item.id)}
                  className="bg-white text-gray-800 border border-gray-300 rounded-full"
                >
                  Generate and download
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AdminDashboard>
  );
};

export default SummaryReports;