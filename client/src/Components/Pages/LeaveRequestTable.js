import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  Radio,
  Button,
  Input,
  Tag,
  Space,
  Modal,
  Dropdown,
  Checkbox,
  Menu,
  ConfigProvider,
  Select,
  message,
  Badge,
} from "antd";
import {
  DeleteOutlined,
  MoreOutlined,
  SearchOutlined,
  MailOutlined,
  EditOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import AdminDashboard from "../Layout/AdminDashboard";
import axios from "axios";
import toast from "react-hot-toast";
import { ExclamationCircleFilled } from "@ant-design/icons";
import PaymentModal from "../Layout/PaymentModal";
import { useAuth } from "../Context/AuthContext";
import PaymentConfirmationModal from "../Layout/PaymentConfirmationModal";
import LeaveManagementModal from "./LeaveManagementModal";
import LeaveRequestForm from "./LeaveRequestForm";

const { confirm } = Modal;

// Debounce function definition
const debounce = (func, delay) => {
  let timeoutId;
  return function (...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

// Define your debounce delay (e.g., 300ms)
const debounceDelay = 300;

const LeaveRequestTable = () => {
  const [flattenedTableData, setFlattenedTableData] = useState([]);
  const [sortData, setSortData] = useState("alllist");
  const [selectionType, setSelectionType] = useState("checkbox");
  const [selectedRows, setSelectedRows] = useState([]);
  const [tableParams, setTableParams] = useState({
    pagination: {
      current: 1,
      pageSize: 8,
      total: 0,
    },
  });
  const [isLeaveManagement, setisLeaveManagement] = useState(false);
  const [isModalVisibleInvoice, setIsModalVisibleInvoice] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const [loading, setLoading] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [shouldFetch, setShouldFetch] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [proposalId, setProposalId] = useState(null);
  const [showSendMailModal, setShowSendMailModal] = useState(false);
  const [auditorPaynmentId, setAuditorPaymentId] = useState(null);
  const [UpdateProposal, setUpdateProposal] = useState(false);
  const [userId, setUserId] = useState(null);
  const [workLogId, setWorkLogId] = useState(null);
  const [isLeaveFormVisible, setIsLeaveFormVisible] = useState(false);
  const [fromDate,setFromDate]=useState("");
  const [toDate,setToDate]=useState("");

  const { user } = useAuth();

  const navigate = useNavigate();

  // Toggling

  const handleCancel = () => {
    setisLeaveManagement(false);
  };

  const showLeaveManagementModal = (record) => {
    setFromDate(record.fromDate);
    setToDate(record.toDate);
    setWorkLogId(record._id); // Set the workLogId from the record

    setUserId(record.userId); // Set the userId from the record
    setisLeaveManagement(true);
  };

  const showModalInvoice = (proposalId) => {
    console.log(proposalId);
    setProposalId(proposalId);
    setIsModalVisibleInvoice(true);
  };

  const showModalAgreement = (proposalId) => {
    setProposalId(proposalId);
    setIsModalVisible(true);
  };

  const showSendMail = (proposalId) => {
    setProposalId(proposalId);
    setShowSendMailModal(true);
  };

  const showCloseSendMail = () => {
    fetchData();
    setShowSendMailModal(false);
    setProposalId(null);
  };

  const showUpdateProposal = (proposalId) => {
    setProposalId(proposalId);
    setUpdateProposal(true);
  };

  const handleUpdatePropsoalCancel = () => {
    fetchData();
    setUpdateProposal(false);
    setProposalId(null);
  };

  const handleRecordPayment = (proposal_id, auditorPaymentId) => {
    console.log("this is auditor payment id", auditorPaymentId);
    setAuditorPaymentId(auditorPaymentId);
    setProposalId(proposal_id);
    setisLeaveManagement(true);
  };

  // Fetch data function
  const fetchData = useCallback(() => {
    setLoading(true);
    const url = `/api/worklogs/getAllLeaveRequests`;

    axios
      .get(url, {
        params: {
          page: tableParams.pagination.current,
          pageSize: tableParams.pagination.pageSize,
          sort: sortData,
          keyword: searchKeyword,
        },
      })
      .then((response) => {
        console.log("Response:", response);
        const { data } = response;
        const { data: responseData, total } = data;

        const flattenedData = responseData.map((row, index) => ({
          ...row,
          key: `${row._id}-${index}`,
        }));
        setFlattenedTableData(flattenedData);

        setTableParams((prevState) => ({
          ...prevState,
          pagination: {
            ...prevState.pagination,
            total: total,
          },
        }));

        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching data:", error);
        setLoading(false);
      });
  }, [
    tableParams.pagination.current,
    tableParams.pagination.pageSize,
    sortData,
    searchKeyword,
  ]);

  // Fetch initial data on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Pagination
  const handleTableChange = (pagination, filters, sorter) => {
    setTableParams({
      pagination,
      filters,
      ...sorter,
    });
  };

  // Row Selection
  const rowSelection = {
    onChange: (selectedRowKeys, selectedRows) => {
      setSelectedRowKeys(selectedRowKeys);
      setSelectedRows(selectedRows);
    },
  };

  // Show confirm Delete
  const showDeleteConfirm = () => {
    confirm({
      title: "Are you sure delete?",
      icon: <ExclamationCircleFilled />,
      okText: "Yes",
      okType: "danger",
      cancelText: "No",
      onOk() {
        axios
          .delete("/api/payment/deleteFields", { data: selectedRows })
          .then((response) => {
            const currentPage = tableParams.pagination.current;
            const pageSize = tableParams.pagination.pageSize;
            const newTotal = tableParams.pagination.total - selectedRows.length;
            const newCurrentPage = Math.min(
              currentPage,
              Math.ceil(newTotal / pageSize)
            );

            setTableParams((prevState) => ({
              ...prevState,
              pagination: {
                ...prevState.pagination,
                total: newTotal,
                current: newCurrentPage,
              },
            }));

            setSelectedRows([]);
            setShouldFetch(true); // Trigger data fetch
            toast.success("Successfully Deleted");
          })
          .catch((error) => {
            console.error("Error deleting rows:", error);
          });
      },
      onCancel() {
        console.log("Cancel");
      },
    });
  };

  const showSingleDeleteConfirm = (id) => {
    confirm({
      title: "Are you sure delete?",
      icon: <ExclamationCircleFilled />,
      okText: "Yes",
      okType: "danger",
      cancelText: "No",
      onOk() {
        axios
          .delete("/api/payment/deleteFields", { data: [id] }) // Send ID as an array
          .then((response) => {
            const currentPage = tableParams.pagination.current;
            const pageSize = tableParams.pagination.pageSize;
            const newTotal = tableParams.pagination.total - 1; // Only one row is deleted
            const newCurrentPage = Math.min(
              currentPage,
              Math.ceil(newTotal / pageSize)
            );

            setTableParams((prevState) => ({
              ...prevState,
              pagination: {
                ...prevState.pagination,
                total: newTotal,
                current: newCurrentPage,
              },
            }));

            setShouldFetch(true); // Trigger data fetch
            toast.success("Successfully Deleted");
          })
          .catch((error) => {
            console.error("Error deleting row:", error);
          });
      },
      onCancel() {
        console.log("Cancel");
      },
    });
  };

  // Handle Menu
  const handleMenuClick = (record, { key }) => {
    switch (key) {
      case "View Leave":
        showLeaveManagementModal(record);
        break;

      default:
        break;
    }
  };

  const menu = (record) => (
    <Menu
      onClick={(e) => handleMenuClick(record, e)}
      style={{ padding: "8px" }}
    >
      <Menu.Item
        key="View Leave"
        style={{ margin: "8px 0", backgroundColor: "#F0F4F8" }} // Industry standard light gray background
      >
        <span
          style={{ color: "#1890FF", fontWeight: "bold", fontSize: "12px" }} // Industry standard blue for links
        >
          <EyeOutlined /> View
        </span>
      </Menu.Item>
    </Menu>
  );

  const columns = [
    {
      title: "Auditor Name",
      dataIndex: "requester_name",
      key: "requester_name",
    },
    {
      title: "Leave Type",
      dataIndex: "leaveType",
      key: "leaveType",
      render: (text) => (
        <Tag color={text === "sickLeave" ? "red" : "blue"}>
          {text?.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: "Reason",
      dataIndex: "reason",
      key: "reason",
    },
    {
      title: "Start Date",
      dataIndex: "fromDate",
      key: "fromDate",
      render: (fromDate) => {
        if (!fromDate) return "N/A";
        const [day, month, year] = fromDate.split("-");
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      },
    },
    {
      title: "End Date",
      dataIndex: "toDate",
      key: "toDate",
      render: (toDate) => {
        if (!toDate) return "N/A";
        const [day, month, year] = toDate.split("-");
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      },
    },
    {
      title: "Total Days",
      key: "totalDays",
      render: (_, record) => {
        const [fDay, fMonth, fYear] = record.fromDate.split("-").map(Number);
        const [tDay, tMonth, tYear] = record.toDate.split("-").map(Number);
        const fromDate = new Date(fYear, fMonth - 1, fDay);
        const toDate = new Date(tYear, tMonth - 1, tDay);

        const diffTime = Math.abs(toDate - fromDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        return diffDays;
      },
    },
    {
      title: "Status",
      dataIndex: "leaveStatus",
      key: "leaveStatus",
      render: (status) => (
        <Badge
          status={
            status === "approved"
              ? "success"
              : status === "pending"
              ? "warning"
              : "error"
          }
          text={status?.toUpperCase()}
        />
      ),
    },
    {
      title: "Requested On",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date) => new Date(date).toLocaleDateString(),
    },
    {
      title: "Action",
      key: "action",
      render: (_, record) => (
        <Dropdown
          overlay={menu(record)}
          trigger={["click"]}
          placement="bottomLeft"
          arrow
          danger
        >
          <Button type="link" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  // Fetch data when shouldFetch changes
  useEffect(() => {
    if (shouldFetch) {
      fetchData();
      setShouldFetch(false);
    }
  }, [shouldFetch, fetchData]);

  // Fetch data with debounce
  const fetchDataWithDebounce = debounce(() => {
    // if (searchKeyword.trim()) {
    // Your backend call logic here
    // console.log("Fetching data for keyword:", searchKeyword);
    //}
  }, debounceDelay);

  const handleInputChange = (event) => {
    if (isModalOpen) return;

    const { value } = event.target;
    setSearchKeyword(value);
  };

  useEffect(() => {
    if (searchKeyword.trim()) {
      fetchDataWithDebounce();
    }
  }, [searchKeyword, fetchDataWithDebounce]);

  const handleStatusChange = (value, record) => {
    axios
      .put(`/api/proposal/updateProposalStatus/${record._id}`, {
        status: value,
      })
      .then((response) => {
        message.success("Status updated successfully");
        setShouldFetch(true);
      })
      .catch((error) => {
        console.error("Error updating status:", error);
        toast.error("Failed to update status");
      });
  };
  return (
    <AdminDashboard>
      <div className="bg-blue-50 m-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Leave Request Table</h2>
          <div className="space-x-2">
            <Space wrap></Space>
            {/* <Button shape="round" icon={<FilterOutlined />} size="default">
              Filters
            </Button>
            <Button
              shape="round"
              icon={<CloudDownloadOutlined />}
              size="default"
            >
              Export
            </Button> */}
          </div>
        </div>

        <div className="flex justify-between my-4">
          <ConfigProvider
            theme={{
              components: {
                Radio: {
                  buttonBorderWidth: 0,
                },
              },
            }}
          >
            <Radio.Group
              value={sortData}
              onChange={(e) => setSortData(e.target.value)}
            >
              <Radio.Button
                value="alllist"
                style={{
                  backgroundColor:
                    sortData === "alllist" ? "transparent" : "white",
                  color: sortData === "alllist" ? "black" : "black",
                  padding: "0 16px",
                  height: "32px",
                  lineHeight: "30px",
                  border: "1px solid #d3d3d3",
                  fontWeight: sortData === "alllist" ? "500" : "normal",
                }}
              >
                All List
              </Radio.Button>
              <Radio.Button
                value="newproposal"
                style={{
                  backgroundColor:
                    sortData === "newproposal" ? "transparent" : "white",
                  color: sortData === "newproposal" ? "black" : "black",
                  padding: "0 16px",
                  height: "32px",
                  lineHeight: "30px",
                  border: "1px solid #d3d3d3",
                  fontWeight: sortData === "alllist" ? "normal" : "500",
                }}
              >
                New Request
              </Radio.Button>
              {/* <Button
                type="primary"
                onClick={() => setIsLeaveFormVisible(true)}
              >
                Request Leave
              </Button> */}
            </Radio.Group>
          </ConfigProvider>

          <div className="space-x-2">
            <Input
              size="default"
              placeholder="Search by Auditor Name"
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={handleInputChange}
              style={{ width: 300 }}
            />
          </div>
        </div>

        <div>
          <ConfigProvider
            theme={{
              token: {
                colorTextHeading: "#4A5568",
                colorText: "#4A5568",
                fontWeight: "bold",
              },
              components: {
                Table: {
                  colorText: "#4A5568",
                  fontWeight: "bold",
                },
              },
            }}
          >
            <Table
              columns={columns}
              dataSource={flattenedTableData}
              rowKey={(record) => record.key}
              pagination={tableParams.pagination}
              loading={loading}
              onChange={handleTableChange}
            />
          </ConfigProvider>
        </div>
      </div>

      <LeaveManagementModal
        visible={isLeaveManagement}
        onClose={handleCancel}
        workLogId={workLogId}
        userId={userId}
        onLeaveUpdated={() => setShouldFetch(true)}
        fromDate={fromDate}
        toDate={toDate}
      />
      <LeaveRequestForm
        visible={isLeaveFormVisible}
        onClose={() => setIsLeaveFormVisible(false)}
        auditorId={user._id}
      />
    </AdminDashboard>
  );
};

export default LeaveRequestTable;
