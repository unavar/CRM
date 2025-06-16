import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Input,
  Upload,
  Form,
  message,
  Row,
  Col,
  Image,
  Spin,
} from "antd";
import { UploadOutlined } from "@ant-design/icons";
import axios from "axios";
import { useAuth } from "../Context/AuthContext";

const PaymentConfirmationModal = ({
  visible,
  handleCancel,
  proposalId,
  auditorPaymentId,
  viewOnly
}) => {
  const [form] = Form.useForm();
  const { user } = useAuth();
  const [fileList, setFileList] = useState([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
const domain =
  process.env.NODE_ENV === 'production'
    ? 'https://crm.unavar.com'
    : `http://localhost:${process.env.PORT || 5000}`;


  useEffect(() => {
    if (visible) {
      fetchAuditorPayment();
    }
  }, [visible]);

  const fetchAuditorPayment = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/payment/getAuditorPaymentById/${auditorPaymentId}`
      );
      const {
        auditor_name,
        amountReceived,
        referenceNumber,
        referenceDocument,
      } = response.data;

      form.setFieldsValue({
        auditor_name: auditor_name || user.name,
        amountReceived,
        referenceNumber,
      });

      if (referenceDocument) {
        const filePath = `${domain}/uploads/${referenceDocument}`;

        setFileList([
          {
            uid: "-1",
            name: referenceDocument.split("/").pop(),
            status: "done",
            url: filePath,
          },
        ]);
      }
    } catch (error) {
      message.error("Failed to fetch payment details");
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = (file) => {
    const isPDF =
      file.type === "application/pdf" || file.name?.endsWith(".pdf");

    if (isPDF) {
      let pdfUrl = file.url || URL.createObjectURL(file.originFileObj);

      if (!pdfUrl.startsWith("http")) {
        pdfUrl = `${window.location.origin}/${pdfUrl}`;
      }

      window.open(pdfUrl, "_blank", "noopener,noreferrer");
    } else {
      setPreviewFile(file.url || URL.createObjectURL(file.originFileObj));
      setPreviewVisible(true);
    }
  };

  const handleSubmit = async () => {
    if (!auditorPaymentId) {
      message.error("Auditor Payment ID is missing for updating.");
      return;
    }

    try {
      const values = await form.validateFields();
      const formData = new FormData();

      formData.append("auditor_name", values.auditor_name);
      formData.append("amountReceived", values.amountReceived);
      formData.append("referenceNumber", values.referenceNumber);
      formData.append("referenceDocument", values.referenceDocument);
      formData.append("proposalId", proposalId);
      formData.append("auditor_id", user._id);
      formData.append("paymentId", auditorPaymentId);

      if (fileList.length > 0) {
        formData.append("referenceDocument", fileList[0].originFileObj);
      }

      console.log(
        "Updating with Form Data:",
        Object.fromEntries(formData.entries())
      );

      await axios.put("/api/payment/updateAuditorPayment", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      message.success("Payment details updated successfully");
      form.resetFields();
      setFileList([]);
      setIsEditing(false);
      handleCancel();
    } catch (error) {
      console.error("Error during update:", error);
      message.error("Failed to update payment details");
    }
  };

  const handleConfirm = async (status) => {
    try {
      await axios.put(`/api/payment/updatePaymentStatus/${auditorPaymentId}`, {
        status,
      });

      message.success(
        `Payment ${
          status === "accepted" ? "accepted" : "rejected"
        } successfully`
      );
      handleCancel();
    } catch (error) {
      message.error(`Failed to ${status} payment`);
    }
  };

  return (
    <Modal
      title="Payment Confirmation"
      open={visible}
      onCancel={handleCancel}
      destroyOnClose
      centered
      footer={null}
    >
      <Spin spinning={loading}>
        {!viewOnly && (
          <div className="flex justify-end space-x-2">
            {isEditing ? (
              <Button type="primary" onClick={handleSubmit}>
                Save
              </Button>
            ) : (
              <Button type="default" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
            )}
            {isEditing && (
              <Button type="default" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        )}

        <Form form={form} layout="vertical" name="paymentConfirmationForm">
          <Form.Item name="auditor_name" label="Auditor Name">
            <Input disabled />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amountReceived" label="Amount Received">
                <Input readOnly={!isEditing} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="referenceNumber" label="Reference Number">
                <Input readOnly={!isEditing} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="Reference Document (PDF/Image)">
            <Upload
              beforeUpload={() => false} // Prevent automatic upload
              listType="picture"
              fileList={fileList}
              onChange={({ fileList }) => setFileList(fileList.slice(-1))} // Keep only the latest file
              onPreview={handlePreview}
              readOnly={!isEditing}
            >
              {isEditing && !viewOnly && <Button icon={<UploadOutlined />}>Upload</Button>}
            </Upload>
          </Form.Item>
          <Modal
            open={previewVisible}
            footer={null}
            onCancel={() => setPreviewVisible(false)}
          >
            {previewFile && (
              <Image
                src={previewFile}
                alt="Preview"
                style={{ width: "100%" }}
              />
            )}
          </Modal>
        </Form>

        {/* Accept & Reject Buttons */}
        {!viewOnly && (
          <div className="flex justify-between mt-4">
            <Button
              type="primary"
              danger
              onClick={() => handleConfirm("rejected")}
            >
              Reject
            </Button>
            <Button type="primary" onClick={() => handleConfirm("accepted")}>
              Accept
            </Button>
          </div>
        )}
      </Spin>
    </Modal>
  );
};

export default PaymentConfirmationModal;
