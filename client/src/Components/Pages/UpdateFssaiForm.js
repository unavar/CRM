import React, { useState, useEffect } from "react";
import {
  Form,
  Input,
  Upload,
  Button,
  Image,
  message,
  Typography,
  Spin,
} from "antd";
import { InboxOutlined, DeleteOutlined } from "@ant-design/icons";
import axios from "axios";
import { useParams } from "react-router-dom";
import { useLocation } from "react-router-dom";

const { Text } = Typography;

const UpdateFssaiForm = () => {
  const { audit_id } = useParams(); // Get the audit_id from route params
  const [form] = Form.useForm();
  const [fssaiNumber, setFssaiNumber] = useState(""); // Initialize as empty string
  const [fssaiImageUrl, setFssaiImageUrl] = useState(""); // Initialize as empty string
  const [newImage, setNewImage] = useState(null); // For new image upload
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isEditable, setIsEditable] = useState(false); // Control edit mode
  const location = useLocation();

  useEffect(() => {
    // Fetching data from API using the audit_id
    if (audit_id) {
      setLoading(true);
      axios
        .get(`/api/auditor/getAuditById/${audit_id}`)
        .then((response) => {
          const data = response.data.data; // Ensure you're accessing 'data' correctly
          if (data) {
            setFssaiNumber(data.fssai_number); // Set the fssai_number
            setFssaiImageUrl(data.fssai_image_url); // Set the fssai_image_url
            form.setFieldsValue({ fssai_number: data.fssai_number }); // Set form field
          } else {
            message.error("Data not found.");
          }
          setLoading(false);
        })
        .catch((error) => {
          message.error("Failed to fetch data");
          setLoading(false);
        });
    }
  }, [audit_id, form]); // Add 'form' dependency to ensure form updates when data is loaded

  const handleImageUpload = ({ fileList }) => {
    if (fileList.length) {
      const file = fileList[0].originFileObj;

      // Generate a preview URL
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target.result);
      reader.readAsDataURL(file);

      setNewImage(file);
    } else {
      setPreviewUrl(null);
      setNewImage(null);
    }
  };

  const removeImage = () => {
    setFssaiImageUrl(null);
    setNewImage(null);
  };

  const uploadProps = {
    accept: ".jpg,.png",
    maxCount: 1,
    beforeUpload: (file) => {
      const isImage = ["image/jpeg", "image/png"].includes(file.type);
      const isAllowedSize = file.size / 1024 / 1024 < 2; // Max 2 MB
      if (!isImage) {
        message.error("Only .jpg and .png files are allowed.");
        return Upload.LIST_IGNORE;
      }
      if (!isAllowedSize) {
        message.error("File size must be less than 2 MB.");
        return Upload.LIST_IGNORE;
      }
      return true;
    },
  };

  const pathSegments = location.pathname.split("/").filter(Boolean);

  // Extract the first segment, which will be the first meaningful part
  const firstSegment = pathSegments[0];

  const onFinish = async (values) => {
    setLoading(true);
    const formData = new FormData();
    formData.append("audit_id", audit_id);
    formData.append("fssai_number", values.fssai_number);

    if (newImage) {
      formData.append("file", newImage);
      formData.append("fileName", newImage.name);
    } else if (!fssaiImageUrl) {
      formData.append("deleteImage", true);
    }

    try {
      const response = await axios.put(
        "/api/auditor/updateFssaiDetails",
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      if (response.status === 200) {
        message.success("FSSAI details updated successfully!");
        setFssaiNumber(values.fssai_number);
        if (newImage) {
          setFssaiImageUrl(previewUrl);
        }
        setNewImage(null);
        setIsEditable(false);
      } else {
        message.error("Failed to update FSSAI details.");
      }
    } catch (error) {
      message.error(error.response?.data?.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div>
      {/* Full-page Loading Spinner */}
      {loading && (
        <div className="absolute top-0 left-0 right-0 bottom-0 flex justify-center items-center z-10">
          <Spin size="medium" />
        </div>
      )}

      {/* Edit Button */}
      <div className="flex justify-end my-4">
        <Button
          type="primary"
          onClick={() => setIsEditable(!isEditable)} // Toggle edit mode
          disabled={!["draft", "modified"].includes(firstSegment) || isEditable}
        >
          {isEditable ? "Cancel" : "Edit"}
        </Button>
      </div>

      <div className="text-lg text-gray-800 bg-white border mt-5 p-8 rounded-xl">
        The FSSAI license/Registration and Food Safety Display Board (FSDB) both
        are displayed at a prominent location.
        <br />
        (Note: The FSDBs are readable to both Food Handlers and Customers.)
      </div>

      <Form
        layout="vertical"
        form={form}
        onFinish={onFinish}
        style={{ marginTop: "24px" }}
        initialValues={{ fssai_number: fssaiNumber }} // Initial value here
      >
        <div className="my-4">
          <h1 className="text-gray-800 text-lg">
            Submit your FSSAI LICENSE number:
          </h1>
        </div>

        <div className="flex">
          <div>
            <h1 className="font-medium text-lg mr-4">FSSAI license number:</h1>
          </div>
          <Form.Item
            name="fssai_number"
            rules={[
              {
                required: true,
                message: "Please enter your FSSAI License No.",
              },
              {
                pattern: /^[0-9]{14}$/,
                message:
                  "FSSAI License No. must be exactly 14 numeric characters.",
              },
              {
                len: 14,
                message: "FSSAI License No. must be exactly 14 characters.",
              },
            ]}
          >
            <Input
              value={fssaiNumber}
              onChange={(e) => setFssaiNumber(e.target.value)}
              disabled={!isEditable} // Disable if not editable
              formatter={(str) => str.toUpperCase()}
            />
          </Form.Item>
        </div>

        {/* Image Upload Section */}
        {isEditable && !fssaiImageUrl && !newImage && (
          <div className="flex justify-center w-[300px] mx-auto">
            <Form.Item
              name="mediaUpload"
              label="Media Upload"
              valuePropName="fileList"
              getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
            >
              <Upload.Dragger {...uploadProps} onChange={handleImageUpload}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">
                  Drag your file(s) here, or click to browse
                </p>
                <p className="ant-upload-hint">
                  Max 2 MB files are allowed. Only support .jpg and .png files.
                </p>
              </Upload.Dragger>
            </Form.Item>
          </div>
        )}

        {/* Current Image Preview */}
        {(fssaiImageUrl || newImage) && (
          <div className="flex flex-col  mt-10  items-center">
            <Image
              width={200}
              src={newImage ? previewUrl : fssaiImageUrl}
              alt="FSSAI License"
              style={{ border: "1px solid #ccc", borderRadius: "8px" }}
            />
            {isEditable && (
              <Button
                type="primary"
                danger
                icon={<DeleteOutlined />}
                onClick={removeImage}
                className="mt-4"
              >
                Remove
              </Button>
            )}
          </div>
        )}

        {/* Submit Button */}
        {isEditable && (
          <div className="flex justify-end mt-10">
            <Button type="primary" htmlType="submit">
              Save Changes
            </Button>
          </div>
        )}
      </Form>
    </div>
  );
};

export default UpdateFssaiForm;
