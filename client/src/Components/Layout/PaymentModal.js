import React, { useState, useEffect } from "react";
import { Modal, Button, Input, Upload, Form, message, Select } from "antd";
import { UploadOutlined } from "@ant-design/icons";
import axios from "axios";
import { useAuth } from "../Context/AuthContext";

const { Option } = Select;

const PaymentModal = ({ visible, handleCancel, proposalId, balanceAmount }) => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [fileList, setFileList] = useState([]);
  const [serviceList, setServiceList] = useState([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch available services
  useEffect(() => {
    if (proposalId && user?._id) {
      setLoadingServices(true);
      axios
        .get(
          `/api/payment/getAuditManagementByProposalAndAuditor/${proposalId}/${user._id}`
        )
        .then((res) => {
          setServiceList(res.data.auditRecord || []);
        })
        .catch(() => {
          message.error("Failed to load services");
          setServiceList([]);
        })
        .finally(() => setLoadingServices(false));
    }
  }, [proposalId, user]);

  // Reset form when modal is closed
  useEffect(() => {
    if (!visible) {
      form.resetFields();
      setFileList([]);
    }
  }, [visible]);

  // Handle file changes (limit to one file)
  const handleFileChange = ({ fileList }) => {
    setFileList(fileList.slice(-1));
  };

  // File validation (PDF/Image only)
  const beforeUpload = (file) => {
    const isValidType =
      file.type === "application/pdf" || file.type.startsWith("image/");
    if (!isValidType) {
      message.error("Only PDF or image files are allowed.");
    }
    return isValidType ? false : Upload.LIST_IGNORE;
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const numericBalanceAmount = parseFloat(
        balanceAmount.toString().replace(/[^\d.-]/g, "")
      );

      if (values.amountReceived > numericBalanceAmount) {
        message.error(
          "Amount received cannot be greater than the balance amount."
        );
        return;
      }

      const formData = new FormData();
      formData.append("amountReceived", values.amountReceived);
      formData.append("referenceNumber", values.referenceNumber);
      formData.append("proposalId", proposalId);
      formData.append("auditor_id", user._id);
      formData.append("service", values.service);

      if (fileList.length > 0) {
        formData.append("referenceDocument", fileList[0].originFileObj);
      }

      setSubmitting(true);

      const response = await axios.post(
        "/api/payment/saveAuditorPayment",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      message.success(response.data.message);
      form.resetFields();
      setFileList([]);
      handleCancel();
    } catch (error) {
      console.error("Error submitting payment:", error);
      message.error("Failed to save payment details");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title="Payment Details"
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={submitting}
      destroyOnClose
    >
      <Form form={form} layout="vertical" name="paymentForm">
        <Form.Item
          name="amountReceived"
          label="Amount Received"
          rules={[
            { required: true, message: "Please enter the amount received" },
          ]}
        >
          <Input type="number" placeholder="Enter amount received" />
        </Form.Item>

        <Form.Item
          name="referenceNumber"
          label="Reference Number"
          rules={[
            { required: true, message: "Please enter the reference number" },
          ]}
        >
          <Input placeholder="Enter reference number" />
        </Form.Item>

        <Form.Item
          name="service"
          label="Select Service"
          rules={[{ required: true, message: "Please select a service" }]}
        >
          <Select
            placeholder="Select a service"
            loading={loadingServices}
            allowClear
          >
            {serviceList.map((service, index) => (
              <Option key={index} value={service.service}>
                {service.service}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="referenceDocument"
          label="Reference Document (PDF/Image)"
          valuePropName="fileList"
          getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
        >
          <Upload
            name="referenceDocument"
            beforeUpload={beforeUpload}
            listType="picture"
            fileList={fileList}
            onChange={handleFileChange}
          >
            {fileList.length < 1 && (
              <Button icon={<UploadOutlined />}>Click to Upload</Button>
            )}
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default PaymentModal;
