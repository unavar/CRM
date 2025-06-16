import React, { useState, useEffect } from "react";
import { Modal, Select, Button, Spin, message, Steps, DatePicker, Typography, Form } from "antd";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import tost from "react-hot-toast"; // Assuming you are using react-hot-toast for notifications

const { Option } = Select;
const { Step } = Steps;

const CurrentStepModal = ({ visible, onClose, reload }) => {
  const statusOptions = [
    "Not Started",
    "Physical Audit Completed",
    "Documentation Work On",
    "FSSAI Portal Updated",
  ];

  const [selectedStatus, setSelectedStatus] = useState("Not Started");
  const [auditDate, setAuditDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);
  const { audit_id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  useEffect(() => {
    if (visible) {
      fetchAudit();
    }
  }, [visible]);

  const fetchAudit = async () => {
    try {
      const response = await axios.get(`/api/auditor/getAuditById/${audit_id}`);
      if (response.data.success) {
        const { stepsStatus, physical_date } = response.data.data;
        setSelectedStatus(stepsStatus);
        setAuditDate(physical_date ? dayjs(physical_date) : null);
        form.setFieldsValue({
          stepsStatus: stepsStatus,
          physical_date: physical_date ? dayjs(physical_date) : null,
        });
      } else {
        message.error(response.data.message);
      }
    } catch (error) {
      message.error("Failed to fetch audit details.");
    } finally {
      setLoading(false);
      setIsUpdated(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await form.validateFields();
      setLoading(true);
      
      const updateData = {
        audit_id,
        stepsStatus: selectedStatus,
        physical_date: auditDate ? auditDate.toDate() : null,
      };

    if(selectedStatus==="Not Started"){
      tost.error("Please select a valid status.");
      setLoading(false);
      return;
    }

      await axios.put("/api/auditor/updateStepsStatus", updateData);
       await axios.put(`/api/auditor/updateStatusHistoryByAuditId/${audit_id}`, { status: selectedStatus });
      message.success("Updated successfully.");
      setIsUpdated(true);
      if (typeof reload === "function") {
        reload();
      }
    } catch (error) {
      console.error("Update error:", error);
      message.error("Update failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      await form.validateFields(); // Validate all fields before submitting
      setSubmitLoading(true);
      
      await axios.put(`/api/auditor/updateStatusHistoryByAuditId/${audit_id}`, { status: selectedStatus });
      message.success("Submitted successfully!");
      navigate("/submittedForApproval");
    } catch (error) {
      console.error("Submission error:", error);
      message.error(error?.errorFields?.[0]?.errors?.[0] || "Submission failed.");
    } finally {
      setSubmitLoading(false);
    }
  };
  

  const isAllStepsCompleted = selectedStatus === "FSSAI Portal Updated";

  return (
    <Modal open={visible} onCancel={onClose} footer={null} destroyOnClose width={800}>
      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
          <Spin />
        </div>
      ) : (
        <>
          <Typography.Title level={4} style={{ textAlign: "center", marginBottom: 20 }}>
            Update Audit Step
          </Typography.Title>

          <Typography.Title level={4} style={{ marginBottom: 20 }}>Status Progress:</Typography.Title>

          <Steps current={statusOptions.indexOf(selectedStatus)} size="small">
            {statusOptions.map((status, index) => (
              <Step 
                key={index} 
                title={status}
                disabled={index < statusOptions.indexOf(selectedStatus)}
              />
            ))}
          </Steps>

          <Form form={form} layout="vertical">
            <Form.Item
              label="Current Status"
              name="stepsStatus"
              rules={[{ required: true, message: "Please select a status" }]}
              className="mt-5"
            >
              <Select
                style={{ width: "100%", marginTop: 5 }}
                onChange={(value) => {
                  setSelectedStatus(value);
                  setIsUpdated(false);
                }}
              >
                {statusOptions.map((status) => (
                  <Option key={status} value={status}>{status}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              label="Physical Audit Date"
              name="physical_date"
              getValueProps={(value) => ({ value: value ? dayjs(value) : null })}
              rules={[{ required: !auditDate, message: "Please select an audit date" }]}
            >
              <DatePicker
                style={{ width: "100%", marginTop: 5 }}
                onChange={(date) => {
                  setAuditDate(date);
                  setIsUpdated(false);
                }}
                format="DD/MM/YYYY"
                placeholder="Select Audit Date"
                disabledDate={current => current && current > dayjs().endOf('day')}
              />
            </Form.Item>
          </Form>

          <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between" }}>
            <Button type="primary" onClick={handleUpdate} disabled={loading || isUpdated}>
              {loading ? "Updating..." : "Update"}
            </Button>
            {isAllStepsCompleted && (
              <Button type="primary" danger onClick={handleSubmit} loading={submitLoading} disabled={loading}>
                Submit
              </Button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
};

export default CurrentStepModal;
