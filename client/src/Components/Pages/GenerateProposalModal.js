import React, { useState, useEffect } from "react";
import {
  Modal,
  DatePicker,
  Form,
  InputNumber,
  Input,
  Select,
  Table,
  Button,
  message,
  Spin,
} from "antd";
import { DeleteOutlined } from "@ant-design/icons";
import moment from "moment";
import axios from "axios";
import GenreateSuccessSendMailTableModal from "./GenreateSuccessSendMailTableModal";
import "../css/GenerateProposalModal.css";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

// Extend dayjs with customParseFormat
dayjs.extend(customParseFormat);

const { Option } = Select;

const GenerateProposalModal = ({
  visible,
  onOk,
  onCancel,
  enquiryId,
  service,
}) => {
  const [form] = Form.useForm();
  const [outletItem, setItems] = useState([
    {
      outletId: "",
      outlet_name: "",
      no_of_food_handlers: 0,
      man_days: 0,
      type_of_industry: "",
      unit: 0,
      description: "",
      amount: 0,

      no_of_production_line: 0,
      vertical_of_industry: "",
    },
  ]);
  const [proposal_date, setProposalDate] = useState("");
  const [proposal_number, setProposalNumber] = useState("");
  const [outlets, setOutlets] = useState([]);
  const [initialValuesLoaded, setInitialValuesLoaded] = useState(false);
  const [showSendMailModal, setShowSendMailModal] = useState(false);
  const [subTotal, setSubTotal] = useState(0);
  const [sgst, setSgst] = useState(0);
  const [cgst, setCgst] = useState(0);
  const [igst, setIgst] = useState(0);
  const [total, setTotal] = useState(0);
  const [email, setEmail] = useState(0);
  const [prosposalId, setPropsalId] = useState();
  const [representaive, setRepesentaive] = useState([]);
  const [isFetching, setIsFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [checkState, setCheckState] = useState("");
  const [sameState, setSameState] = useState(true);
  const [customerType, setCustomerType] = useState(""); 
  const handleCancel = () => {
    setItems([]);
    setItems([
      {
        outletId: "",
        outlet_name: "",
        no_of_food_handlers: 0,
        man_days: 0,
        description: "",
        amount: 0,
        no_of_production_line: 0,
        vertical_of_industry: "",
        
      },
    ]);
    setSubTotal(0);
    setSgst(0);
    setCgst(0);
    setIgst(0);
    setTotal(0);
    onCancel();
    setIsFetching(false);
  };

  useEffect(() => {
    if (visible) {
      setProposalDate(moment());

      const fetchProposalNumber = async () => {
        try {
          const response = await axios.get(
            "/api/proposal/genrateProposalNumber"
          );
          setProposalNumber(response.data);
          form.setFieldsValue({
            proposal_number: response.data.proposal_number,
          });
        } catch (error) {
          console.error("Error in fetching proposal Number", error);
        }
      };

      const fetchOutlets = async () => {
        try {
          const response = await axios.get(
            `/api/proposal/getOutletDetailsById/${enquiryId}`
          );
          const outletData = response.data;
          console.log("this is the outelt data", outletData);
          setOutlets(outletData);

          // Set items state with fetched data
          setItems(
            outletData.map((outlet) => {
              const type_of_industry = outlet.type_of_industry || "";
              const unit = outlet.unit || 0;
              const no_of_production_line = outlet?.no_of_production_line || 0;
              const vertical_of_industry = outlet.vertical_of_industry || "";

              let man_days = 0;

              if (type_of_industry === "Catering") {
                man_days = calculateManDays(unit);
              } else if (type_of_industry === "Transportation") {
                man_days = calculateVehicleManDays(unit);
              } else if (type_of_industry === "Trade and Retail") {
                man_days = calculateStorageManDays(unit);
              } else {
                man_days = calculateManufacturingManDays(
                  unit,
                  no_of_production_line
                );
              }

              return {
                outletId: outlet._id || "",
                outlet_name: outlet.branch_name || "",
                type_of_industry: type_of_industry,
                unit: unit,
                man_days: man_days,
                amount: 0,
                vertical_of_industry: vertical_of_industry,
                
              };
            })
          );
        } catch (error) {
          console.error("Error fetching outlets", error);
        }
      };

      const fetchProfileSetting = async () => {
        try {
          const response = await axios.get("/api/setting/getCompanyDetail");
          console.log("here", response.data.profile.company_address.state);
          setCheckState(response.data.profile.company_address.state);
        } catch (error) {
          console.error("Error is fetching the profile state");
        }
      };

      const fetchBusinessDetails = async () => {
        try {
          const response = await axios.get(
            `/api/proposal/getBusinessDetailsByEnquiryId/${enquiryId}`
          );
          const businessData = response.data;

          
          setCustomerType(businessData.customer_type)
        
          setEmail(businessData.email);

          const addressLine1 = businessData.address?.line1 || "";
          const addressLine2 = businessData.address?.line2 || "";

          // Concatenate addressLine1 with addressLine2 if either one exists
          const line1 = [addressLine1, addressLine2].filter(Boolean).join(", ");

          const city = businessData.address?.city || "";
          const state = businessData.address?.state || "";

          // Concatenate city and state if both exist
          const line2 = [city, state].filter(Boolean).join(", ");

          

          form.setFieldsValue({
            fbo_name: businessData.name,
            address: {
              line1: line1,
              line2: line2,
            },
            pincode: businessData.address?.pincode || "",
            gst_number: businessData.gst_number,
            contact_person: businessData.contact_person,
            phone: businessData.phone,

          });

          setInitialValuesLoaded(true);

          if (checkState === state) {
            setSameState(true);
          } else {
            setSameState(false);
          }
        } catch (error) {
          console.error("Error fetching business details", error);
        } finally {
          setIsFetching(false);
        }
      };

      const fetchAllrepresentaive = async () => {
        try {
          const response = await axios.get("/api/auth/getAllUsers"); // Adjust the endpoint as needed
          setRepesentaive(response.data.data);
        } catch (error) {
          console.error("Error fetching auditors:", error);
        }
      };

      fetchOutlets();
      fetchProposalNumber();
      fetchAllrepresentaive();
      fetchProfileSetting();
      fetchBusinessDetails();
    }
  }, [visible, enquiryId, form, checkState]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Validate form fields before submission
      await form.validateFields();

      // Collect form values
      const formData = form.getFieldsValue();

      // Prepare data to send
      const proposalData = {
        ...formData,
        enquiryId: enquiryId,
        outlets: outletItem,
        email: email,
        same_state: sameState,
        service: service,
        customer_type:customerType
      };

      // Make POST request to create proposal
      const response = await axios.post(
        "/api/proposal/createProposalAndOutlet",
        proposalData
      );

      // Get proposal ID from response and show mail modal
      setPropsalId(response.data.proposal._id);
      setShowSendMailModal(true);
    

      // Update enquiry status to mark proposal as done
      await axios.post("/api/enquiry/updateEnquiryProposalStatus", {
        equiryId: enquiryId,
        isProposalDone: true,
      });
      form.resetFields();
      // Finalize actions and messages
      onOk(); // Trigger any OK handling logic (such as closing modals)
      message.success("Proposal generated and status updated successfully!");
    } catch (error) {
      message.error("Failed to generate proposal or update status.");
    }finally{
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems((prevItems) => {
      const newItems = [
        ...prevItems,
        {
          outletId: "",
          outlet_name: "",
          no_of_food_handlers: 0,
          man_days: 0,
          amount: 0,
        },
      ];
      calculateTotals(newItems);
      return newItems;
    });
  };

  const removeItem = (index) => {
    const newItems = outletItem.filter((item, i) => i !== index);
    setItems(newItems);
  };

  const calculateManDays = (foodHandlers) => {
    if (foodHandlers <= 25) return 0.5;
    if (foodHandlers >= 26 && foodHandlers <= 50) return 1;
    if (foodHandlers >= 51 && foodHandlers <= 100) return 1.5;
    return 2;
  };

  const calculateStorageManDays = (area) => {
    if (area < 15000) return 0.5;
    if (area >= 15000 && area <= 50000) return 1;
    if (area > 50000) return 1.5;
    return 0;
  };

  const calculateVehicleManDays = (noOfVehicles) => {
    if (noOfVehicles <= 2) return 0.5;
    if (noOfVehicles >= 3 && noOfVehicles <= 5) return 1;
    if (noOfVehicles >= 6 && noOfVehicles <= 7) return 1.5;
    if (noOfVehicles >= 8 && noOfVehicles <= 10) return 2;
    return 2;
  };

  const calculateManufacturingManDays = (foodHandlers, productionLine) => {
    let manDaysFoodHandlers = 0;
    let manDaysProductionLine = 0;

    // Calculate man-days based on food handlers
    if (foodHandlers <= 50) {
      manDaysFoodHandlers = 0.5;
    } else if (foodHandlers <= 100) {
      manDaysFoodHandlers = 1;
    } else if (foodHandlers <= 300) {
      manDaysFoodHandlers = 1.5;
    } else if (foodHandlers <= 600) {
      manDaysFoodHandlers = 2;
    } else if (foodHandlers <= 1000) {
      manDaysFoodHandlers = 2.5;
    } else if (foodHandlers > 1000) {
      manDaysFoodHandlers = 3;
    }

    // Calculate man-days based on production lines
    if (productionLine == 1) {
      manDaysProductionLine = 0.5;
    } else if (productionLine <= 2) {
      manDaysProductionLine = 1;
    } else if (productionLine <= 4) {
      manDaysProductionLine = 1.5;
    } else if (productionLine == 6) {
      manDaysProductionLine = 2;
    } else if (productionLine == 8) {
      manDaysProductionLine = 2.5;
    } else if (productionLine >= 10) {
      manDaysProductionLine = 3;
    }

    // Return the maximum of the two values
    return Math.max(manDaysFoodHandlers, manDaysProductionLine);
  };

  const handleInputChange = (index, field, value) => {
    setItems((prevItems) => {
      const newItems = [...prevItems];
      const currentItem = newItems[index];

      if (field === "outletId") {
        if (value === "others") {
          newItems[index] = {
            ...currentItem,
            outletId: value,
            outlet_name: "Others",
            unit: 0,
            man_days: 0,
            amount: 0,
          };
        } else {
          const selectedOutlet = outlets.find((outlet) => outlet._id === value);

          const type_of_industry = selectedOutlet?.type_of_industry || "";
          const unit = selectedOutlet?.unit || 0;
          const no_of_production_line =
            selectedOutlet?.no_of_production_line || 0;
          let man_days = 0;
          console.log(unit, no_of_production_line);

          if (type_of_industry === "Catering") {
            man_days = calculateManDays(unit);
          } else if (type_of_industry === "Transportation") {
            man_days = calculateVehicleManDays(unit);
          } else if (type_of_industry === "Trade and Retail") {
            man_days = calculateStorageManDays(unit);
          } else {
            man_days = calculateManufacturingManDays(
              unit,
              no_of_production_line
            );
          }

          newItems[index] = {
            ...currentItem,
            outletId: value,
            type_of_industry: selectedOutlet?.type_of_industry || 0,
            outlet_name: selectedOutlet?.branch_name || "",
            unit: selectedOutlet?.unit || 0,
            service: selectedOutlet?.service || 0,
            amount: 0,
            man_days,
          };
        }
      }

      // Calculation logic directly in the conditions
      if (field === "unit_cost") {
        newItems[index].unit_cost = value;
        newItems[index].amount =
          (newItems[index].quantity || 0) * (newItems[index].unit_cost || 0);
      }

      if (field === "quantity") {
        newItems[index].quantity = value;
        newItems[index].amount =
          (newItems[index].quantity || 0) * (newItems[index].unit_cost || 0);
      }

      if (field === "description") {
        newItems[index].description = value;
      }

      // Recalculate totals
      calculateTotals(newItems);

      return newItems;
    });
  };

  const calculateTotals = (items) => {
    if (!Array.isArray(items) || items.length === 0) {
      setSubTotal(0);
      if (sameState) {
        setSgst(0);
        setCgst(0);
      } else {
        setIgst(0);
      }

      setTotal(0);
      return;
    }

    const calculatedSubTotal = items.reduce(
      (sum, item) => sum + (parseFloat(item.amount) || 0),
      0
    );
    setSubTotal(calculatedSubTotal);
    if (sameState) {
      const calculatedIgst = calculatedSubTotal * 0.09;
      const calculatedCgst = calculatedSubTotal * 0.09;

      setSgst(calculatedIgst);
      setCgst(calculatedCgst);
      const calculatedTotal =
        calculatedSubTotal + calculatedIgst + calculatedCgst;
      setTotal(calculatedTotal);
    } else {
      const calculatedGst = calculatedSubTotal * 0.18;

      setIgst(calculatedGst);
      const calculatedTotal = calculatedSubTotal + calculatedGst;
      setTotal(calculatedTotal);
    }
  };

  const columns = [
    {
      title: "Outlet name",
      dataIndex: "outletId",
      render: (text, record, index) => (
        <Select
          value={text}
          onChange={(value) => handleInputChange(index, "outletId", value)}
          className="w-full"
          style={{ width: 120 }}
        >
          <Option value="others">Others</Option>
          {outlets.map((outlet) => (
            <Option key={outlet._id} value={outlet._id}>
              {outlet.branch_name}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: "Services",
      dataIndex: "description",
      render: (text, record, index) => {
        const isOthers = record.outletId === "others";
        return isOthers ? (
          <Input
            value={text}
            onChange={(e) =>
              handleInputChange(index, "description", e.target.value)
            }
            className="w-full"
          />
        ) : (
          <Select
            value={text}
            className="w-full"
            style={{ width: 120 }}
            onChange={(value) => handleInputChange(index, "description", value)}
          >
            <Option value="TPA">TPA</Option>
            <Option value="Hygiene Rating">Hygiene Rating</Option>
            <Option value="ER Station">ER Station</Option>
            <Option value="ER Fruit and Vegetable Market">
              ER Fruit and Vegetable Market
            </Option>
            <Option value="ER Hub">ER Hub</Option>
            <Option value="ER Campus">ER Campus</Option>
            <Option value="ER Worship Place">ER Worship Place</Option>
          </Select>
        );
      },
    },
    {
      title: "Criteria",
      dataIndex: "unit",
      render: (text, record, index) => {
        const isOthers = record.outletId === "others";
        let postfix = "none";

        switch (record.type_of_industry) {
          case "Transportation":
            postfix = "VH";
            break;
          case "Catering":
            postfix = "FH";
            break;
          case "Trade and Retail":
            postfix = "Sq ft";
            break;
          case "Manufacturing":
            postfix = "PD/Line";
            break;
          default:
            postfix = ""; // or any default value
        }

        console.log("Swith ch triggered", postfix);

        return isOthers ? (
          <Input disabled className="w-full" />
        ) : (
          <div className="flex items-center">
            <InputNumber
              min={0}
              value={text}
              onChange={(value) => handleInputChange(index, "unit", value)}
              className="w-full"
            />
            <span className="ml-2" style={{ width: 50 }}>
              {postfix}
            </span>
          </div>
        );
      },
    },

    {
      title: "Man Days",
      dataIndex: "man_days",
      render: (text, record, index) => {
        const isOthers = record.outletId === "others";
        return isOthers ? (
          <Input disabled className="w-full" />
        ) : (
          <InputNumber
            disa
            min={0}
            value={text}
            onChange={(value) => handleInputChange(index, "man_days", value)}
            className="w-full"
          />
        );
      },
    },
    {
      title: "QTY",
      dataIndex: "quantity",
      render: (text, record, index) => (
        <InputNumber
          min={0}
          value={text}
          onChange={(value) => handleInputChange(index, "quantity", value)}
          className="w-full"
        />
      ),
    },
    {
      title: "Unit Cost(₹) ",
      dataIndex: "unit_cost",
      render: (text, record, index) => (
        <InputNumber
          min={0}
          value={text}
          onChange={(value) => handleInputChange(index, "unit_cost", value)}
          className="w-full"
        />
      ),
    },
    {
      title: "Amount(₹)",
      dataIndex: "amount",
      render: (text) =>
        text.toLocaleString("en-IN", {
          style: "currency",
          currency: "INR",
        }),
    },

    {
      title: "Action",
      dataIndex: "action",
      render: (_, __, index) => (
        <Button
          onClick={() => removeItem(index)}
          type="link"
          danger
          icon={<DeleteOutlined />}
        />
      ),
    },
  ];

  const handleOk = () => {
    setShowSendMailModal(false);
  };

  return (
    <>
      <Modal
        visible={visible}
        onCancel={handleCancel}
        footer={null}
        width={1000}
        style={{ padding: "0 !important" }}
        className="acc-modal"
      >
        <Spin spinning={isFetching}>
          <Form layout="vertical" onFinish={handleSubmit} form={form}>
            <div
              className="text-center align-middle font-medium text-xl title-div bg-blue-50 p-7"
              style={{ boxShadow: "0 4px 2px -2px lightgrey" }}
            >
              Generate Proposal
            </div>
            <div
              className="px-8 pt-4 pb-8"
              style={{ backgroundColor: "#F6FAFB" }}
            >
              <div className="text-center font-medium text-xl mb-5 rounded-md">
                Document Preview
              </div>
              <div className="flex space-x-4">
                <Form.Item
                  label="FBO name (Business Name)"
                  name="fbo_name"
                  className="flex-1"
                  rules={[
                    {
                      required: true,
                      message: "Please input the business name!",
                    },
                  ]}
                >
                  <Input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </Form.Item>

                <Form.Item
                  label="Proposal date"
                  className="flex-1"
                  name="proposal_date"
                  rules={[
                    {
                      required: true,
                      message: "Please select the Proposal Date!",
                    },
                  ]}
                >
                  <DatePicker
                    format="DD/MM/YYYY"
                    className="w-full"
                    onChange={(date) => {
                      // Ensure the date is being set correctly in the form
                      form.setFieldValue("proposal_date", date);
                    }}
                  />
                </Form.Item>

                {/* <Form.Item label="Proposal date" className="flex-1" size="large">
                  <DatePicker className="w-full" value={proposal_date} disabled />
                </Form.Item> */}
                <Form.Item
                  label="Proposal number"
                  name="proposal_number"
                  className="flex-1"
                >
                  <Input
                    placeholder="Auto Generated"
                    className="w-full p-2 border border-gray-300 rounded"
                    readOnly
                  />
                </Form.Item>
              </div>
              <Form.Item label="Address">
                <Input.Group>
                  <Form.Item
                    name={["address", "line1"]}
                    rules={[
                      {
                        required: true,
                        message: "Please input the address line 1!",
                      },
                    ]}
                  >
                    <Input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </Form.Item>
                  <Form.Item name={["address", "line2"]}>
                    <Input
                      type="text"
                      className="w-full p-2 border border-gray-300 rounded"
                    />
                  </Form.Item>
                </Input.Group>
              </Form.Item>
              <div className="flex space-x-4">
                <Form.Item
                  label="Pincode"
                  name="pincode"
                  className="flex-1"
                  rules={[
                    { required: true, message: "Please input the pincode!" },
                  ]}
                >
                  <Input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </Form.Item>
                <Form.Item
                  label="GST Number"
                  name="gst_number"
                  className="flex-1"
                  rules={[
                    { required: true, message: "Please input the GST number!" },
                  ]}
                >
                  <Input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </Form.Item>
              </div>
              <div className="flex space-x-4">
                <Form.Item
                  label="Contact Person Name"
                  name="contact_person"
                  className="flex-1"
                  rules={[
                    {
                      required: true,
                      message: "Please input the contact person name!",
                    },
                  ]}
                >
                  <Input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </Form.Item>
                <Form.Item
                  label="Contact Person Number"
                  name="phone"
                  className="flex-1"
                  rules={[
                    {
                      required: true,
                      message: "Please input the contact person number!",
                    },
                  ]}
                >
                  <Input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                </Form.Item>
              </div>
              <Form.Item
                name="representative"
                label="Representative"
                rules={[
                  { required: true, message: "Please select Representative!" },
                ]}
              >
                <Select placeholder="Select Representative">
                  {representaive.map((representaive) => (
                    <Option key={representaive._id} value={representaive._id}>
                      {representaive.userName}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              <div className="my-4">
                <h3 className="text-lg font-semibold mb-2">Items table</h3>
                <Table
                  dataSource={outletItem}
                  columns={columns}
                  pagination={false}

                />
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                >
                  + Add New Row
                </button>
              </div>
              <div className="my-4 p-4 border rounded w-1/2 ml-auto bg-gray-50">
                <div className="flex justify-between items-center">
                  <div className="text-sm font-medium">Sub Total:</div>
                  <div className="text-sm font-medium">
                    {subTotal.toLocaleString("en-IN", {
                      style: "currency",
                      currency: "INR",
                    })}
                  </div>
                </div>

                {sameState ? (
                  <>
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium">SGST (9%):</div>
                      <div className="text-sm font-medium">
                        {sgst.toLocaleString("en-IN", {
                          style: "currency",
                          currency: "INR",
                        })}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium">CGST (9%):</div>
                      <div className="text-sm font-medium">
                        {cgst.toLocaleString("en-IN", {
                          style: "currency",
                          currency: "INR",
                        })}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium">IGST (18%):</div>
                    <div className="text-sm font-medium">
                      {igst.toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="text-lg font-bold">Total:</div>
                  <div className="text-lg font-bold">
                    {total.toLocaleString("en-IN", {
                      style: "currency",
                      currency: "INR",
                    })}
                  </div>
                </div>
              </div>

              <div className="text-center mt-4">
                <button
                  className="bg-buttonModalColor px-4 py-2 text-white rounded"
                  htmlType="submit"  loading={loading}
                >
                  Generate
                </button>
              </div>
            </div>
          </Form>
        </Spin>
      </Modal>

      <GenreateSuccessSendMailTableModal
        onClose={() => setShowSendMailModal(false)}
        id={prosposalId}
        onOk={handleOk}
        title="Generate Proposal"
        name="proposal"
        route="generateProposal"
        visible={showSendMailModal}
        buttonTitle="Go to Proposal"
      />
    </>
  );
};

export default GenerateProposalModal;
