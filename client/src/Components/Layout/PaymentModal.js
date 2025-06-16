import React, { useState } from "react";
import { Modal, Button, Input, Upload, Form, message } from "antd";
import { AlertOutlined, UploadOutlined } from "@ant-design/icons";
import axios from "axios";
import { useAuth } from "../Context/AuthContext";

const PaymentModal = ({ visible, handleCancel, proposalId, balanceAmount }) => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [fileList, setFileList] = useState([]);

  // Handle file change
  const handleFileChange = ({ fileList }) => {
    setFileList(fileList.slice(-1)); // Keep only the last file
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

      if (fileList.length > 0) {
        formData.append("referenceDocument", fileList[0].originFileObj);
      }

      // Log formData for debugging
      for (let pair of formData.entries()) {
        console.log(`${pair[0]}: ${pair[1]}`);
      }

      // Send data to backend
      const response = await axios.post(
        "/api/payment/saveAuditorPayment",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      message.success(response.data.message);
      form.resetFields();
      setFileList([]); // Reset file list after submission
      handleCancel();
    } catch (error) {
      console.error("Error submitting payment:", error);
      message.error("Failed to save payment details");
    }
  };

  return (
    <Modal
      title="Payment Details"
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
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
          <Input placeholder="Enter amount received" />
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
          name="referenceDocument"
          label="Reference Document (PDF/Image)"
          valuePropName="fileList"
          getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
        >
          <Upload
            beforeUpload={() => false}
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
