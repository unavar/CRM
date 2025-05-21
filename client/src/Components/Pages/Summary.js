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
    { id: 1, title: "Summary 1" },
    { id: 2, title: "Summary 2" }
  ];

  const handleDateChange = (dates) => {
    setDateRange(dates);
  };

  const generateAndDownload = (summaryId) => {
    // Create a completely empty Excel workbook
    const wb = XLSX.utils.book_new();
    
    // Create an empty worksheet
    const ws = XLSX.utils.aoa_to_sheet([]);
    
    // Add empty worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Empty Sheet");
    
    // Generate Excel file and trigger download
    XLSX.writeFile(wb, `Summary_Report_${summaryId}.xlsx`);
    
    message.success(`Excel sheet downloaded successfully`);
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