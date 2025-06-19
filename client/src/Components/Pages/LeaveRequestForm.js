import React, { useEffect, useState } from "react";
import { Modal, Form, DatePicker, Radio, Input, Button, message } from "antd";
import axios from "axios";
import moment from "moment";

const { TextArea } = Input;
const { RangePicker } = DatePicker;

const LeaveRequestForm = ({ visible, onClose, auditorId, fetchData }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState({
    sickLeaveAvailable: 0,
    casualLeaveAvailable: 0,
  });
  const [spansTwoMonths, setSpansTwoMonths] = useState(false);

  useEffect(() => {
    const fetchLeaveBalance = async () => {
      try {
        const response = await axios.get(
          `/api/worklogs/calculateLeaveData/${auditorId}`
        );
        console.log(response);
        setLeaveBalance({
          sickLeaveAvailable:
            response.data.nonLOPLeavesAvailable.sick.overall,
          casualLeaveAvailable:
            response.data.nonLOPLeavesAvailable.casual.overall,
        });
      } catch (error) {
        console.error("Error fetching leave balance:", error);
        message.error("Failed to fetch leave balance information");
      }
    };
    fetchLeaveBalance();
  }, [auditorId]);

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      await axios.post("/api/worklogs/submitLeaveRequest", {
        userId: auditorId,
        fromDate: values.dates[0],
        toDate: values.dates[1],
        leaveType: values.leaveType,
        reason: values.reason,
        date: new Date(),
      });

      message.success("Leave request submitted successfully.");
      form.resetFields();
      fetchData();
      onClose();
    } catch (error) {
      message.error(
        error?.response?.data?.message || "Failed to submit leave request."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Request Leave"
      open={visible}
      onCancel={onClose}
      footer={null}
      centered
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          name="dates"
          label="Leave Duration"
          rules={[{ required: true, message: "Please select leave dates." }]}
        >
          <RangePicker
            disabledDate={(current) =>
              current && current < moment().startOf("day")
            }
            onChange={(dates) => {
              if (dates && dates.length === 2) {
                const startMonth = dates[0].month();
                const endMonth = dates[1].month();
                setSpansTwoMonths(startMonth !== endMonth);
              } else {
                setSpansTwoMonths(false);
              }
            }}
          />
        </Form.Item>

        <Form.Item
          name="leaveType"
          label="Leave Type"
          dependencies={["leaveBalance"]}
        >
          <Radio.Group>
            <Radio
              value="sickLeave"
              disabled={
                leaveBalance.sickLeaveAvailable==0 
              }
            >
              Sick Leave (
              {leaveBalance.sickLeaveAvailable}
              )
            </Radio>
            <Radio
              value="casualLeave"
              disabled={
                leaveBalance.casualLeaveAvailable + (spansTwoMonths ? 1 : 0) ===
                0
              }
            >
              Casual Leave (
              {leaveBalance.casualLeaveAvailable + (spansTwoMonths ? 1 : 0)}{" "}
              available)
            </Radio>
          </Radio.Group>
        </Form.Item>

        <Form.Item
          name="reason"
          label="Reason"
          rules={[{ required: true, message: "Please enter a reason." }]}
        >
          <TextArea rows={3} placeholder="Write reason here..." />
        </Form.Item>
        {spansTwoMonths && (
          <div style={{ marginBottom: "12px", color: "#faad14" }}>
            Leave spans two months —  1 Casual Leave will be
            used.
          </div>
        )}

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Apply
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default LeaveRequestForm;
