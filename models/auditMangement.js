import mongoose from "mongoose";

const auditSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    proposalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Proposal",
      required: true,
    },
    outletId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    fbo_name: {
      type: String,
      required: true,
    },
    outlet_name: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "assigned",
        "started",
        "draft",
        "modified",
        "submitted",
        "approved",
        "rejected",
         "Physical Audit Completed",
         "Documentation Work On",
         "FSSAI Portal Updated",
      ],
      default: "assigned",
    },
    started_at: {
      type: Date,
    },
    checklistCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CheckListCategory",
    },
    customer_type: {
      type: String,
      enum: ["MOU", "Non-MOU"],
    },
    assigned_date: {
      type: Date,
      default: Date.now,
    },
    physical_date: {
      type: Date,
    },
    statusHistory: [
      {
        status: {
          type: String,
          enum: [
            "assigned",
            "started",
            "draft",
            "modified",
            "submitted",
            "approved",
            "rejected",
            
            "Physical Audit Completed",
            "Documentation Work On",
            "FSSAI Portal Updated",
            
          ],
        },
        changedAt: {
          type: Date,
          default: Date.now,
        },
        comment: String, // Optional comment (e.g., for rejections)
        userId: {
          type: mongoose.Schema.Types.ObjectId, // Admin who changed status
          ref: "User",
        },
      },
    ],
    stepsStatus: {
      type: String,
      enum: [
        "Not Started",
        "Physical Audit Completed",
        "Documentation Work On",
        "FSSAI Portal Updated",
      ],
      default: "Not Started", // Default to indicate it's not started
    },

    modificationHistory: [
      {
        modifiedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    location: {
      type: String,
      required: true,
    },
    audit_number: {
      type: String,
      required: true,
    },
    proposal_number: {
      type: String,
      required: true,
    },
    fssai_number: {
      type: String,
    },

    service: {
      type: String,
      enum: [
        "TPA",
        "Hygiene Rating",
        "ER Station",
        "ER Fruit and Vegetable Market",
        "ER Hub",
        "ER Campus",
        "ER Worship Place",
      ],
      required: true,
    },
    fssai_image_url: {
      type: String,
    },
    type_of_industry: {
      type: String,
      enum: ["Catering", "Manufacturing", "Trade and Retail", "Transportation"],
    },
    vertical_of_industry: {
      type: String,
      enum: [
        "Sweet Shop",
        "Meat Retail",
        "Hub",
        "Market",
        "General Manufacturing",
        "Meat & Meat Processing",
        "Dairy Processing",
        "Catering",
        "Transportation",
        "Storage/Warehouse",
        "Institute Canteen",
        "Industrial Canteen",
        "Temple Kitchen",
      ],
    },
  },
  {
    timestamps: true,
  }
);

const AuditManagement = mongoose.model("AuditManagement", auditSchema);

export default AuditManagement;
