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

const PaymentRequestTable = () => {
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
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
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
  const [selectedStatus, setSelectedStatus] = useState();
  const { user } = useAuth();

  const navigate = useNavigate();

  // Toggling

  const handleCancelPayment = () => {
    setIsPaymentModalVisible(false);
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
    setIsPaymentModalVisible(true);
  };

  // Fetch data function
  const fetchData = useCallback((status = selectedStatus) => {
    setLoading(true);
    const url = `/api/payment/getAllProposalDetailsAdmin`;
  
    axios
      .get(url, {
        params: {
          page: tableParams.pagination.current,
          pageSize: tableParams.pagination.pageSize,
          sort: sortData,
          keyword: searchKeyword,
          status: status, // ✅ Use parameter instead of state
        },
      })
      .then((response) => {
        const { data } = response;
        const { data: responseData, total, currentPage } = data;
  
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
            current: currentPage,
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

  const handleFilterChange = (value) => {
    setSelectedStatus(value);
    fetchData(value); // ✅ Pass the value directly to fetchData
  };

  // Pagination
  const handleTableChange = (pagination, filters, sorter) => {
    setTableParams({
      pagination,
      filters,
      ...sorter,
    });
    if (pagination.pageSize !== tableParams.pagination.pageSize) {
      setFlattenedTableData([]);
    }
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
      case "generate_agreement":
        showModalAgreement(record._id);
        break;

      case "send_mail":
        showSendMail(record._id);
        break;

      case "generate_invoice":
        showModalInvoice(record._id);
        break;

      case "delete":
        showSingleDeleteConfirm(record.auditor_paymentId);
        break;

      case "view":
        navigate(`/proposal/view-proposal/${record._id}`);
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
        key="delete"
        style={{ margin: "8px 0", backgroundColor: "#FFCDD2" }}
      >
        <span
          style={{ color: "#B71C1C", fontWeight: "bold", fontSize: "12px" }}
        >
          <DeleteOutlined /> Delete
        </span>
      </Menu.Item>
    </Menu>
  );

  const columns = [
    {
      title: "Auditor Name",
      dataIndex: "auditor_name",
      key: "auditor_name",
    },

    {
      title: "Proposal Number",
      dataIndex: "proposal_number",
      key: "proposal_number",
    },
    {
      title: "FBO Name",
      dataIndex: "fbo_name",
      key: "fbo_name",
    },
  
    {
      title: "Proposal Value",
      dataIndex: "Proposal_value",
      key: "Proposal_value",
    },
    {
      title: "Total Payment Received",
      dataIndex: "paymentReceived",
      key: "paymentReceived",
    },
    {
      title: "Amount to verify",
      dataIndex: "amounToVerify",
      key: "amountToVerify",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        let color;
        switch (status) {
          case "accepted":
            color = "green";
            break;
          case "rejected":
            color = "red";
            break;
          case "pending":
            color = "orange";
            break;
          default:
            color = "gray";
        }
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: "Verify Payment",
      key: "verify_payment",
      render: (_, record) => (
        <Button
          className={
            record.status === "accepted" || record.status === "rejected"
              ? "bg-yellow-500 text-white hover:bg-yellow-600"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }
          onClick={() =>
            handleRecordPayment(record._id, record.auditor_paymentId)
          }
        >
          {record.status === "accepted" || record.status === "rejected"
            ? "View/Edit"
            : "Verify"}
        </Button>
      ),
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
          <h2 className="text-xl font-semibold">Payment Requests</h2>
          <div className="space-x-2">
            <Space wrap>
              <>
                <div>
                  <h2 className="text-xl font-semibold">Filters</h2>
                </div>
                <div className="ml-5">
                  {/* Status Multi-Select */}
                  <Select
                    mode="multiple"
                    placeholder="Select Status"
                    options={[
                      { value: "pending", label: "Pending" },
                      { value: "accepted", label: "Accepted" },
                      { value: "rejected", label: "Rejected" },
                    ]}
                    value={selectedStatus}
                    onChange={handleFilterChange}
                    style={{ width: 300 }}
                  />
                </div>
              </>
              <Button
                onClick={showDeleteConfirm}
                icon={<DeleteOutlined />}
                disabled={selectedRowKeys.length === 0}
                shape="round"
              >
                Delete
              </Button>
            </Space>
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
                New Requests
              </Radio.Button>
            </Radio.Group>
          </ConfigProvider>

          <div className="space-x-2">
            {/* <Input
              size="default"
              placeholder="Search by FBO Name"
              prefix={<SearchOutlined />}
              value={searchKeyword}
              onChange={handleInputChange}
              style={{ width: 300 }}
            /> */}
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
              rowSelection={{
                type: selectionType,
                ...rowSelection,
              }}
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
      <PaymentConfirmationModal
        visible={isPaymentModalVisible}
        proposalId={proposalId}
        auditorPaymentId={auditorPaynmentId}
        handleCancel={handleCancelPayment}
      />
    </AdminDashboard>
  );
};

export default PaymentRequestTable;
