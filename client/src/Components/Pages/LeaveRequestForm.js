import React, { useEffect, useState } from "react";
import { Modal, Form, DatePicker, Radio, Input, Button, message } from "antd";
import axios from "axios";

const { TextArea } = Input;
const { RangePicker } = DatePicker;

const LeaveRequestForm = ({ visible, onClose, auditorId }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [leaveBalance, setLeaveBalance] = useState({
    sickLeaveAvailable: 0,
    casualLeaveAvailable: 0,
  });

  useEffect(() => {
    const fetchLeaveBalance = async () => {
      try {
        const response = await axios.get(`/api/worklogs/calculateLeaveData/${auditorId}`);
        setLeaveBalance({
          sickLeaveAvailable: response.data.nonLOPLeavesAvailable.sick.thisMonth,
          casualLeaveAvailable: response.data.nonLOPLeavesAvailable.casual.thisMonth
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
      onClose();
    } catch (error) {
      message.error(error?.response?.data?.message || "Failed to submit leave request.");
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
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="dates"
          label="Leave Duration"
          rules={[{ required: true, message: "Please select leave dates." }]}
        >
          <RangePicker />
        </Form.Item>

        <Form.Item
          name="leaveType"
          label="Leave Type"
          dependencies={['leaveBalance']}
          rules={[{ required: true, message: "Please select a leave type." }]}
        >
          <Radio.Group>
            <Radio value="sickLeave" disabled={leaveBalance.sickLeaveAvailable === 0}>
              Sick Leave ({leaveBalance.sickLeaveAvailable} available)
            </Radio>
            <Radio value="casualLeave" disabled={leaveBalance.casualLeaveAvailable === 0}>
              Casual Leave ({leaveBalance.casualLeaveAvailable} available)
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
