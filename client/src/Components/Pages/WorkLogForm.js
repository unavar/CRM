import {
  Form,
  Input,
  Select,
  TimePicker,
  Checkbox,
  Button,
  Modal,
  message,
} from "antd";
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import dayjs from "dayjs";
import axios from "axios";
import { useAuth } from "../Context/AuthContext";

const { Option } = Select;

const WorkLogForm = ({ isModalOpen, handleOk, handleCancel }) => {
  const [form] = Form.useForm();
  const [workType, setWorkType] = useState("");
  const { user } = useAuth();
  const location = useLocation();
  const firstSegment = location.pathname.split("/").filter(Boolean)[0];

  const [auditors, setAuditors] = useState([]);

  // Fetch auditors when the modal opens
  const fetchAuditors = useCallback(() => {
    axios
      .get("/api/auditor/getAuditAdmins")
      .then((response) => {
        if (response.data.success) {
          setAuditors(response.data.data);
        }
      })
      .catch((error) => console.error("Error fetching auditors:", error));
  }, []);

  useEffect(() => {
    if (isModalOpen && firstSegment === "admin-work-log") {
      fetchAuditors();
    }
  }, [isModalOpen, firstSegment, fetchAuditors]);

  const onFinish = async (values) => {
    if (values.startTime && values.endTime) {
      if (dayjs(values.startTime).isAfter(dayjs(values.endTime))) {
        message.error("Start time should be less than end time");
        return;
      }
    }

    try {
      const data = {
        userId: firstSegment === "admin-work-log" ? values.userId : user._id,
        workType: values.workType,
        startTime: values.startTime
          ? dayjs(values.startTime).toISOString()
          : null,
        endTime: values.endTime ? dayjs(values.endTime).toISOString() : null,
        description: values.description || "",
        reason: values.reason || "",
        paidLeave: values.paidLeave || false,
        sickLeave: values.sickLeave || false,
      };

      const response = await axios.post("/api/worklogs/createWorkLog", data);

      if (response.status === 201) {
        console.log("Work log created successfully:", response.data);
        handleOk();
      }
    } catch (error) {
      console.error("Error saving work log:", error);

      if (error.response) {
        console.log("API Response:", error.response);

        if (error.response.status === 401) {
          message.error("Work log entry already exists for today");
          return;
        }else if(error.response.status === 400){
          message.error("Time cannot overlap with existing work logs");
          return;
        }
      }
    }
  };

  return (
    <Modal
      title="Work Log Form"
      open={isModalOpen}
      onOk={handleOk}
      onCancel={() => {
        form.resetFields(); // Reset form fields
        handleCancel(); // Call parent function to close modal and fetch data
      }}
      footer={null}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ paidLeave: false, sickLeave: false }}
        onFinish={onFinish}
      >
        {/* Show "Select User" only if firstSegment is "admin-work-log" */}
        {firstSegment === "admin-work-log" && (
          <Form.Item
            name="userId"
            label="Select Auditor"
            rules={[{ required: true }]}
          >
            <Select placeholder="Select User">
              {auditors.map((auditor) => (
                <Option key={auditor._id} value={auditor._id}>
                  {auditor.userName}
                </Option>
              ))}
            </Select>
          </Form.Item>
        )}

        <Form.Item
          name="workType"
          label="Work Type"
          rules={[{ required: true }]}
        >
          <Select
            placeholder="Select Work Type"
            onChange={(value) => setWorkType(value)}
          >
            <Option value="audit">Audit Work</Option>
            <Option value="wfh">WFH</Option>
            <Option value="office">Office</Option>
            <Option value="onDuty">On Duty</Option>
            {/* <Option value="absent">Absent</Option> */}
          </Select>
        </Form.Item>

        <div className="grid grid-cols-2 gap-4">
          <Form.Item
            name="startTime"
            label="Start Time"
            rules={[{ required: workType !== "absent" }]}
          >
            <TimePicker
              use12Hours
              format="h:mm A"
              className="w-full"
              disabled={workType === "absent"}
            />
          </Form.Item>
          <Form.Item
            name="endTime"
            label="End Time"
            rules={[{ required: workType !== "absent" }]}
          >
            <TimePicker
              use12Hours
              format="h:mm A"
              className="w-full"
              disabled={workType === "absent"}
            />
          </Form.Item>
        </div>

        <Form.Item name="description" label="Description">
          <Input.TextArea
            rows={3}
            placeholder="Enter description"
            disabled={workType === "absent"}
          />
        </Form.Item>

        {workType === "absent" && (
          <>
            <Form.Item
              name="reason"
              label="Reason"
              rules={[{ required: true }]}
            >
              <Input.TextArea rows={2} placeholder="Enter reason for absence" />
            </Form.Item>

            <div className="flex gap-4">
              <Form.Item name="paidLeave" valuePropName="checked">
                <Checkbox>Paid Leave</Checkbox>
              </Form.Item>
              <Form.Item name="sickLeave" valuePropName="checked">
                <Checkbox>Sick Leave</Checkbox>
              </Form.Item>
            </div>
          </>
        )}

        <Form.Item>
          <Button type="primary" htmlType="submit" className="w-full">
            Submit
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default WorkLogForm;
