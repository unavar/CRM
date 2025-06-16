import React, { useState, useEffect } from "react";
import {
  Steps,
  Button,
  Input,
  Select,
  Upload,
  message,
  Form,
  Image,
  Spin,
} from "antd";
import {
  UploadOutlined,
  DeleteOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import AdminDashboard from "../Layout/AdminDashboard";
import axios from "axios";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import UpdateFssaiForm from "./UpdateFssaiForm";
import { useAuth } from "../Context/AuthContext";
import { useLocation } from "react-router-dom";
const { Step } = Steps;
const { TextArea } = Input;
const { Option } = Select;

function AuditReport() {
  const [currentStep, setCurrentStep] = useState(0);
  const [auditItems, setAuditItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fileLists, setFileLists] = useState([]);
  const navigate = useNavigate();
  const params = useParams();
  const [formData, setFormData] = useState({});
  const [sections, setSections] = useState([]);
  const [preloadedImages, setPreloadedImages] = useState({});
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState({}); // Track editing state for each section
  const location = useLocation();
  const [deletedImages, setDeletedImages] = useState([]);    
  const [searchParams] = useSearchParams();

  const checklistId = searchParams.get("checklistId");
  const category = searchParams.get("category");
  const { user } = useAuth();

  const toggleEditing = (sectionIndex) => {
    setIsEditing((prev) => ({
      ...prev,
      [sectionIndex]: !prev[sectionIndex],
    }));
  };

  useEffect(() => {
    const fetchSections = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `/api/auditor/fetchingQuestionAnswer/${params.audit_id}?checkListId=${checklistId}` // Add checklistId to the query string
        );
        setSections(data);
        console.log("this is the data sdfsdf",data);
      } catch (error) {
        message.error("Failed to fetch section data.");
      } finally {
        setLoading(false);
      }
    };
  
    fetchSections();
  }, [checklistId]); // Add checklistId to the dependency array
  

  useEffect(() => {
    // Assuming 'sections' is fetched from API and contains the data
    const images = {};
    sections.forEach((section) => {
      section.questions.forEach((question) => {
        if (question.image_url) {
          images[question.questionId] = question.image_url;
          console.log( "thsi is the",question.image_url);
        }
      });
    });

    setPreloadedImages(images);
  }, [sections]);

  useEffect(() => {
    const fetchAuditItems = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(
          `/api/auditor/fetchLabelsWithQuestions/${checklistId}`
        );
        console.log(data);
        setAuditItems(data);
      } catch (error) {
        message.error("Failed to fetch audit data.");
      } finally {
        setLoading(false);
      }
    };
    fetchAuditItems();
  }, []);

  const handleUpdateSection = async (sectionIndex) => {
    const sectionResponses = form.getFieldValue("responses");
  
    try {
      setLoading(true);
  
      const formData = new FormData();
  
      const updatedResponses = sections[sectionIndex].questions.map((question) => {
        const questionId = question.questionId;
        const fileEntry = fileLists[questionId]?.[0] || null;
  
        let file = sectionResponses[questionId]?.file || null;
  
        if (Array.isArray(file)) {
          file = file[0]?.url || null;
        } else if (file && typeof file === "object") {
          const fullFile = file.file || null;
          if (fullFile) {
            formData.append("files", fullFile.originFileObj, fullFile.name);
          }
          file = fullFile?.name || null;
        }
  
        return {
          questionId,
          comment: sectionResponses[questionId]?.comment || "",
          selectedMark: sectionResponses[questionId]?.selectedMark || null,
          file: file || null,
        };
      });
  
      // Add structured data to FormData
      const dataPayload = {
        auditId: params.audit_id,
        responses: updatedResponses,
        deletedImages, // Add deletedImages to the payload
      };
      formData.append("data", JSON.stringify(dataPayload));
  
      await axios.post(`/api/auditor/updateAuditResponses`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
  
      message.success("Section updated successfully!");
      toggleEditing(sectionIndex);
    } catch (error) {
      console.error("Error updating section:", error);
      message.error(
        error.response?.data?.message || "An error occurred while updating the section."
      );
    } finally {
      setLoading(false);
    }
  };
  

  const goBack = () => {
    navigate(-1);
  };

  const handleChange = (questionId, info) => {
    const updatedFileLists = { ...fileLists };
    // Store the file and generate a preview URL
    const file = info.file.originFileObj;
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updatedFileLists[questionId] = [
          {
            url: reader.result, // Use FileReader result as URL
          },
        ];
        setFileLists(updatedFileLists);
      };
      reader.readAsDataURL(file); // Read the file as data URL
    } else {
      updatedFileLists[questionId] = [];
      setFileLists(updatedFileLists);
    }
  };

  const handleRemoveImage = (questionId) => {
    console.log("hello");
    const updatedFileLists = { ...fileLists };
    const fileList = updatedFileLists[questionId];
  
    if (fileList?.length > 0) {
      // Revoke the URL to free up memory
      URL.revokeObjectURL(fileList[0]?.url);
  
      // Debugging: Check the questionId and image being flagged
      console.log("Removing image for questionId:", questionId, "File:", fileList[0]);
  
      // Add the questionId to the deletedImages array
      setDeletedImages((prev) => {
        if (!prev.includes(questionId)) {
          return [...prev, questionId];
        }
        return prev; // Avoid duplicates
      });
    }
  
    // Clear the file list for the question
    updatedFileLists[questionId] = [];
    setFileLists(updatedFileLists);
  };
  
  const handleBeforeUpload = (file) => {
    const isValidType = file.type === "image/jpeg" || file.type === "image/png";
    const isValidSize = file.size / 1024 / 1024 < 2; // 2MB

    if (!isValidType) {
      message.error("Only JPEG and PNG images are allowed.");
      return false;
    }

    if (!isValidSize) {
      message.error("File size must be smaller than 2MB.");
      return false;
    }

    return true;
  };

  const pathSegments = location.pathname.split("/").filter(Boolean);

  // Extract the first segment, which will be the first meaningful part
  const firstSegment = pathSegments[0];

  const handleNextFormSubmit = (values) => {
    const updatedData = { ...formData };
    updatedData.responses = values.responses;
    setFormData(updatedData);
  };

  const renderQuestionsUI = () => (
    <>
      {sections.map((section, sectionIndex) => (
        <div
          key={sectionIndex}
          style={{
            display: sectionIndex === currentStep - 1 ? "block" : "none",
          }}
        >
          <div className="flex justify-between items-center my-4">
            <h2 className="text-lg font-bold"></h2>
            <Button
              type="primary"
              onClick={() => toggleEditing(sectionIndex)}
              disabled={
                !["draft", "modified"].includes(firstSegment) ||
                isEditing[sectionIndex]
              }
            >
              Edit Section
            </Button>
          </div>
          <Form
            layout="vertical"
            form={form}
            onFinish={(values) => handleNextFormSubmit(values, sectionIndex)}
            initialValues={{
              responses: section.questions.reduce((acc, question) => {
                acc[question.questionId] = {
                  comment: question.comment || "",
                  selectedMark: question.marks || undefined,
                  file: question.image_url
                    ? [
                        {
                          uid: question.questionId,
                          name: `Uploaded Image - ${question.questionId}`,
                          status: "done",
                          url: question.image_url,
                        },
                      ]
                    : [],
                };
                return acc;
              }, {}),
            }}
          >
            {section.questions.map((question, questionIndex) => (
              <div
                key={questionIndex}
                className="mt-8 p-6 rounded-lg shadow-lg bg-white"
              >
                <div className="ml-2 border text-center rounded-lg p-2 w-[10%]">
                  <label className="text-md text-gray-800">
                    Mark: {question.mark}
                  </label>
                </div>
                <p className="text-gray-800 text-lg p-2">
                  {question.description}
                </p>
                <div className="mt-4 flex items-center justify-around">
                  <Form.Item
                    name={["responses", question.questionId, "comment"]}
                    className="mt-2 w-1/2"
                  >
                    <TextArea
                      rows={3}
                      placeholder="Comments..."
                      disabled={!isEditing[sectionIndex]}
                    />
                  </Form.Item>
                  <Form.Item
                    name={["responses", question.questionId, "selectedMark"]}
                  >
                    <Select
                      placeholder="Select a mark"
                      style={{ width: 120 }}
                      disabled={!isEditing[sectionIndex]}
                    >
                       {question.mark === 2
                        ? [
                            // Generate options for 0, 1, 2
                            <Option key="N/A" value="N/A">
                              N/A
                            </Option>,
                            ...Array.from({ length: 3 }, (_, idx) => (
                              <Option key={idx} value={idx}>
                                {idx}
                              </Option>
                            )),
                          ]
                        : question.mark === 4
                        ? [
                            // Generate options for 0 and 4
                            <Option key="N/A" value="N/A">
                              N/A
                            </Option>,
                            ...[0, 4].map((value) => (
                              <Option key={value} value={value}>
                                {value}
                              </Option>
                            )),
                          ]
                        : null}
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name={["responses", question.questionId, "file"]}
                    valuePropName="file"
                  >
                    {!fileLists[question.questionId]?.length &&
                      !preloadedImages[question.questionId] && (
                        <Upload
                          beforeUpload={handleBeforeUpload}
                          fileList={fileLists[question.questionId] || []}
                          onChange={(info) =>
                            handleChange(question.questionId, info)
                          }
                          showUploadList={false}
                        >
                          <Button
                            disabled={!isEditing[sectionIndex]}
                            icon={<UploadOutlined />}
                          >
                            Upload
                          </Button>
                        </Upload>
                      )}
                  </Form.Item>
                  {(preloadedImages[question.questionId] ||
                    fileLists[question.questionId]?.length > 0) && (
                    <div className="flex flex-col items-center">
                      <Image
                        src={
                          fileLists[question.questionId]?.[0]?.url ||
                          preloadedImages[question.questionId]
                        }
                        alt="Preview"
                        width={100}
                        height={100}
                        style={{ objectFit: "fit" }}
                      />
                      {isEditing[sectionIndex] && (
                        <Button
                          danger
                          className="mt-2"
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            handleRemoveImage(question.questionId);
                            if (preloadedImages[question.questionId]) {
                              delete preloadedImages[question.questionId];
                            }
                          }}
                        >
                          Remove Image
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isEditing[sectionIndex] && (
              <div className="flex justify-end mt-4">
                <Button
                  type="primary"
                  onClick={() => handleUpdateSection(sectionIndex)}
                >
                  Update Section
                </Button>
              </div>
            )}
          </Form>
        </div>
      ))}
    </>
  );

  return (
    <AdminDashboard>
      <div className="p-8">
        <div className="flex justify-center mb-5">
          <h1 className="text-xl font-medium">
            View/Update Audit Reports <span>({category})</span>
          </h1>
        </div>

        {/* Steps Component with Clickable Steps */}
        <Steps
          current={currentStep}
          onChange={(step) => setCurrentStep(step)} // Make steps clickable
        >
          <Step title="FSSAI License" />
          {auditItems.map((item, index) => (
            <Step key={index} title={item.title} />
          ))}
        </Steps>
        {loading ? (
          <div className="flex justify-center mt-8">
            <Spin size="medium" />
          </div>
        ) : (
          <div className="flex justify-between mt-8">
            <h2 className="text-lg text-gray-600">
              {currentStep === 0
                ? "FSSAI License"
                : auditItems[currentStep - 1]?.title}
            </h2>
            <div>
              {" "}
              <Button
                type="link"
                onClick={goBack}
                icon={<HomeOutlined />}
                size="large"
              >
                Home{" "}
              </Button>
            </div>
          </div>
        )}
        {currentStep === 0 ? (
          <UpdateFssaiForm />
        ) : (
          renderQuestionsUI(auditItems[currentStep - 1]?.questions, params)
        )}
      </div>
    </AdminDashboard>
  );
}

export default AuditReport;
