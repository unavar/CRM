import React from "react";
import { EnvironmentOutlined, CalendarOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

const AuditCard = ({
  status,
  auditorName,
  fboName,
  outletName,
  location,
  date,
  proposalNumber,
  auditNumber,
  id,
  route,
  customer_type,
  service,
}) => {
  const navigate = useNavigate();

  // Normalize service label
  const displayService = service === "Hygiene Rating" ? "HR" : service;

  // Navigation handler
  const handleClick = () => {
    navigate(`/${route}/audit-form/${id}`);
  };

  // Dynamic status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case "assigned":
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "submitted":
      case "approved":
        return "bg-green-100 text-green-800";
      case "modified":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Dynamic border based on customer type
  const getBorderColor = (type) => {
    switch (type) {
      case "MOU":
        return "border-green-500";
      case "Non-MOU":
        return "border-blue-500";
      default:
        return "border-gray-300";
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`p-4 w-full md:w-72 bg-white shadow-lg rounded-lg cursor-pointer 
        hover:shadow-xl transition-shadow duration-200 border ${getBorderColor(customer_type)}`}
    >
      {/* Status Badge */}
      <span className={`px-2 py-1 text-sm font-semibold rounded ${getStatusColor(status)}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>

      {/* Auditor & Service */}
      <div className="mt-2 text-sm text-gray-500">
        <div>Assigned to {auditorName}</div>
        <div>Service: {displayService}</div>
      </div>

      {/* FBO Name */}
      <h3 className="text-md font-bold mt-2 truncate">{fboName}</h3>

      {/* Outlet Name */}
      <p className="text-gray-500 font-medium text-sm truncate">{outletName}</p>

      {/* Location */}
      <div className="flex items-center mt-4 truncate">
        <EnvironmentOutlined className="text-gray-500 mr-2 shrink-0" />
        <span className="text-black text-sm truncate">{location}</span>
      </div>

      {/* Proposal Number */}
      {proposalNumber && (
        <div className="mt-2 text-gray-500 text-sm">#{proposalNumber}</div>
      )}

      {/* Date & Audit Number */}
      <div className="flex justify-between items-center mt-2">
        <div className="flex items-center">
          <CalendarOutlined className="text-gray-500 mr-2" />
          <span className="text-black text-sm">{date}</span>
        </div>
        <span className="font-semibold text-sm">Audit no. {auditNumber}</span>
      </div>
    </div>
  );
};

export default AuditCard;
