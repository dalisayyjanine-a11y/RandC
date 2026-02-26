import { RTO } from "../models/rtoModel.js";
import { Diagnostic } from "../models/diagnosticModel.js";
import { JobOrder } from "../models/jobOrderModel.js";
import { User } from "../models/userModel.js";

// Get RTO list page for technician
export const rtoListPage = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect("/login");
    }

    const technician = await User.findById(req.session.userId);
    if (!technician || technician.role !== "technician") {
      return res.redirect("/login");
    }

    res.render("rto-list", {
      technician: technician
    });
  } catch (err) {
    console.error("RTO list page error:", err);
    res.status(500).send("Error loading RTO list page");
  }
};

// Create RTO
export const submitRTO = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    const {
      diagnosticId,
      reason,
      reasonSpecify,
      estimatedAmount,
      estimatedDurationDate,
      diagnosticFee,
      cleaningFee,
      otherCharges,
      totalDue,
      deviceCondition,
      missingPartsDescription,
      customerName,
      receivedBy,
      digitalSignature,
      technicianName
    } = req.body;

    // Validate required fields
    if (!diagnosticId || !reason || !customerName || !receivedBy) {
      return res.json({ success: false, message: "Missing required fields" });
    }

    // Check if diagnostic exists
    const diagnostic = await Diagnostic.findById(diagnosticId);
    if (!diagnostic) {
      return res.json({ success: false, message: "Diagnostic not found" });
    }

    // Check ownership
    if (diagnostic.technicianId !== req.session.userId) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    // Create RTO record
    const rtoData = {
      diagnosticId,
      jobOrderId: diagnostic.jobOrderId,
      technicianId: req.session.userId,
      reason,
      reasonSpecify: reasonSpecify || null,
      estimatedAmount: estimatedAmount || null,
      estimatedDurationDate: estimatedDurationDate || null,
      serviceCharges: {
        diagnosticFee: parseFloat(diagnosticFee) || 0,
        cleaningFee: parseFloat(cleaningFee) || 0,
        otherCharges: parseFloat(otherCharges) || 0,
        totalDue: parseFloat(totalDue) || 0
      },
      deviceCondition: Array.isArray(deviceCondition) ? deviceCondition : [deviceCondition],
      missingPartsDescription: missingPartsDescription || null,
      acknowledgement: {
        customerName,
        receivedBy,
        digitalSignature: digitalSignature || null
      },
      technicianName,
      customerName: customerName,
      deviceType: diagnostic.deviceType || null,
      brandModel: diagnostic.brandModel || null,
      dateReleased: new Date()
    };

    const newRTO = await RTO.create(rtoData);

    // Update diagnostic status to RTO
    await Diagnostic.update(diagnosticId, { status: "RTO" });

    // Delete the associated Job Order if it exists
    if (diagnostic.jobOrderId) {
      try {
        await JobOrder.delete(diagnostic.jobOrderId);
        console.log("Job Order deleted successfully:", diagnostic.jobOrderId);
      } catch (err) {
        console.error("Error deleting job order:", err);
        // Continue even if job order deletion fails
      }
    }

    res.json({ success: true, message: "RTO submitted successfully", rto: newRTO });
  } catch (err) {
    console.error("Error submitting RTO:", err);
    res.json({ success: false, message: "Error submitting RTO: " + err.message });
  }
};

// Get RTO by ID
export const getRTOById = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    const { rtoId } = req.params;
    const rto = await RTO.findById(rtoId);

    if (!rto) {
      return res.json({ success: false, message: "RTO not found" });
    }

    // Check ownership
    if (rto.technicianId !== req.session.userId) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    res.json({ success: true, rto });
  } catch (err) {
    console.error("Error fetching RTO:", err);
    res.json({ success: false, message: "Error fetching RTO" });
  }
};

// Get all RTOs for technician
export const getTechnicianRTOs = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    const rtos = await RTO.findByTechnicianId(req.session.userId);
    res.json({ success: true, rtos });
  } catch (err) {
    console.error("Error fetching technician RTOs:", err);
    res.json({ success: false, message: "Error fetching RTOs" });
  }
};

// Update RTO
export const updateRTO = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    const { rtoId } = req.params;
    const rto = await RTO.findById(rtoId);

    if (!rto) {
      return res.json({ success: false, message: "RTO not found" });
    }

    // Check ownership
    if (rto.technicianId !== req.session.userId) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    const updatedRTO = await RTO.update(rtoId, req.body);
    res.json({ success: true, message: "RTO updated successfully", rto: updatedRTO });
  } catch (err) {
    console.error("Error updating RTO:", err);
    res.json({ success: false, message: "Error updating RTO" });
  }
};

// Delete RTO
export const deleteRTO = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    const { rtoId } = req.params;
    const rto = await RTO.findById(rtoId);

    if (!rto) {
      return res.json({ success: false, message: "RTO not found" });
    }

    // Check ownership
    if (rto.technicianId !== req.session.userId) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    // Update diagnostic status back to other status
    await Diagnostic.update(rto.diagnosticId, { status: "Pending" });

    await RTO.delete(rtoId);
    res.json({ success: true, message: "RTO deleted successfully" });
  } catch (err) {
    console.error("Error deleting RTO:", err);
    res.json({ success: false, message: "Error deleting RTO" });
  }
};

// Get all RTOs (Admin view)
export const getAllRTOs = async (req, res) => {
  try {
    const rtos = await RTO.findAll();
    
    // Enrich RTOs with related job order and diagnostic data
    const enrichedRTOs = await Promise.all(rtos.map(async (rto) => {
      let jobOrderData = null;
      let diagnosticData = null;

      // Fetch related job order
      if (rto.jobOrderId) {
        try {
          jobOrderData = await JobOrder.findById(rto.jobOrderId);
        } catch (err) {
          console.error("Error fetching job order:", err);
        }
      }

      // Fetch related diagnostic
      if (rto.diagnosticId) {
        try {
          diagnosticData = await Diagnostic.findById(rto.diagnosticId);
        } catch (err) {
          console.error("Error fetching diagnostic:", err);
        }
      }

      return {
        ...rto,
        jobOrderData,
        diagnosticData
      };
    }));

    res.json({ success: true, rtos: enrichedRTOs });
  } catch (err) {
    console.error("Error fetching all RTOs:", err);
    res.json({ success: false, message: "Error fetching RTOs" });
  }
};

// Cleanup existing RTOs - delete associated job orders
export const cleanupRTOJobOrders = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    const technician = await User.findById(req.session.userId);
    if (!technician || technician.role !== "technician") {
      return res.json({ success: false, message: "Unauthorized" });
    }

    // Get all RTOs for this technician
    const rtos = await RTO.findByTechnicianId(req.session.userId);
    
    let deletedCount = 0;
    for (const rto of rtos) {
      if (rto.jobOrderId) {
        try {
          // Check if job order still exists
          const jobOrder = await JobOrder.findById(rto.jobOrderId);
          if (jobOrder) {
            await JobOrder.delete(rto.jobOrderId);
            deletedCount++;
            console.log("Deleted job order:", rto.jobOrderId);
          }
        } catch (err) {
          console.error("Error deleting job order:", rto.jobOrderId, err);
        }
      }
    }

    res.json({ success: true, message: `Cleaned up ${deletedCount} job orders` });
  } catch (err) {
    console.error("Error cleaning up RTO job orders:", err);
    res.json({ success: false, message: "Error cleaning up job orders" });
  }
};
