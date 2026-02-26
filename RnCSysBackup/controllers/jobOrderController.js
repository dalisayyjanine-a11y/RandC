import { JobOrder } from "../models/jobOrderModel.js";
import { Diagnostic } from "../models/diagnosticModel.js";
import { User } from "../models/userModel.js";

// Submit a new job order
export const submitJobOrder = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized - Please login" });
    }

    const {
      customerName,
      customerNumber,
      customerAddress,
      deviceType,
      brandModel,
      generation,
      selectedProblems,
      selectedAccessories,
      signature
    } = req.body;

    // Validate required fields
    if (!customerName || !deviceType || !brandModel || !selectedProblems || selectedProblems.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields" 
      });
    }

    // Validate accessories field
    if (!selectedAccessories || selectedAccessories.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Please select at least one accessory/item brought with the device" 
      });
    }

    // Validate signature
    if (!signature) {
      return res.status(400).json({ 
        success: false, 
        message: "Digital signature is required before submitting" 
      });
    }

    // Get technician details
    const technician = await User.findById(req.session.userId);
    if (!technician || technician.role !== "technician") {
      return res.status(403).json({ 
        success: false, 
        message: "Only technicians can submit job orders" 
      });
    }

    // Create job order with real-time date and time
    const now = new Date();
    // Format: MM/DD/YYYY, HH:MM:SS AM/PM (Philippines local time)
    const submittedDate = now.toLocaleString('en-PH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    const jobOrder = await JobOrder.create({
      technicianId: req.session.userId,
      technicianName: technician.name,
      technicianEmail: technician.email,
      customerName,
      customerNumber,
      customerAddress,
      deviceType,
      brandModel,
      generation: generation || "",
      selectedProblems: Array.isArray(selectedProblems) ? selectedProblems : [selectedProblems],
      selectedAccessories: Array.isArray(selectedAccessories) ? selectedAccessories : [selectedAccessories],
      signature: signature,
      status: "Request Submitted",
      submittedDate: submittedDate,
      createdAt: now,
      updatedAt: now
    });

    res.json({ 
      success: true, 
      message: "Job order submitted successfully",
      jobOrderId: jobOrder.id,
      jobOrder: jobOrder
    });
  } catch (err) {
    console.error("Submit job order error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error submitting job order: " + err.message 
    });
  }
};

// Get job orders by technician ID
export const getTechnicianJobOrders = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized - Please login" });
    }

    const technician = await User.findById(req.session.userId);
    if (!technician || technician.role !== "technician") {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized - Technician access required" 
      });
    }

    // Get all job orders for this technician
    const jobOrders = await JobOrder.findByTechnicianId(req.session.userId);

    res.json({ 
      success: true, 
      jobOrders: jobOrders || [] 
    });
  } catch (err) {
    console.error("Get technician job orders error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error retrieving job orders" 
    });
  }
};

// Get all job orders (admin only)
export const getAllJobOrdersAPI = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized - Please login" });
    }

    const admin = await User.findById(req.session.userId);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized - Admin access required" 
      });
    }

    // Get all job orders
    const jobOrders = await JobOrder.findAll();

    res.json({ 
      success: true, 
      jobOrders: jobOrders || [] 
    });
  } catch (err) {
    console.error("Get all job orders error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error retrieving job orders" 
    });
  }
};

// Get single job order by ID
export const getJobOrderById = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized - Please login" });
    }

    const { jobOrderId } = req.params;
    const jobOrder = await JobOrder.findById(jobOrderId);

    if (!jobOrder) {
      return res.status(404).json({ 
        success: false, 
        message: "Job order not found" 
      });
    }

    // Check authorization - user must be the technician or admin
    const user = await User.findById(req.session.userId);
    if (user.role === "technician" && jobOrder.technicianId !== req.session.userId) {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized - Cannot access other technician's job orders" 
      });
    }

    res.json({ 
      success: true, 
      jobOrder: jobOrder 
    });
  } catch (err) {
    console.error("Get job order error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error retrieving job order" 
    });
  }
};

// Update job order status
export const updateJobOrderStatus = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized - Please login" });
    }

    const { jobOrderId } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ 
        success: false, 
        message: "Status is required" 
      });
    }

    const jobOrder = await JobOrder.findById(jobOrderId);
    if (!jobOrder) {
      return res.status(404).json({ 
        success: false, 
        message: "Job order not found" 
      });
    }

    // Check authorization - user must be the technician or admin
    const user = await User.findById(req.session.userId);
    if (user.role === "technician" && jobOrder.technicianId !== req.session.userId) {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized - Cannot update other technician's job orders" 
      });
    }

    // Update job order
    const updatedJobOrder = await JobOrder.update(jobOrderId, { 
      status,
      updatedAt: new Date()
    });

    // If there's a diagnostic linked to this job order, update its status too
    // Find diagnostic by jobOrderId since jobOrder.diagnosticId stores the custom diagnosticId string
    if (jobOrder.diagnosticId) {
      try {
        const linkedDiagnostic = await Diagnostic.findByJobOrderId(jobOrderId);
        if (linkedDiagnostic) {
          await Diagnostic.update(linkedDiagnostic.id, { 
            status: status,
            updatedAt: new Date()
          });
          console.log(`Diagnostic ${linkedDiagnostic.id} (${linkedDiagnostic.diagnosticId}) status updated to ${status}`);
        } else {
          console.log(`No diagnostic found for job order ${jobOrderId}`);
        }
      } catch (diagErr) {
        console.error("Error updating diagnostic status:", diagErr);
        // Continue even if diagnostic update fails - job order update was successful
      }
    }

    res.json({ 
      success: true, 
      message: "Job order status updated successfully",
      jobOrder: updatedJobOrder 
    });
  } catch (err) {
    console.error("Update job order status error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error updating job order: " + err.message 
    });
  }
};

// Get job orders without diagnostics for the current technician
export const getJobOrdersWithoutDiagnostics = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized - Please login" });
    }

    const technician = await User.findById(req.session.userId);
    if (!technician || technician.role !== "technician") {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized - Technician access required" 
      });
    }

    // Get all job orders for this technician
    const jobOrders = await JobOrder.findByTechnicianId(req.session.userId);

    // Filter only job orders without diagnostics
    const jobOrdersWithoutDiagnostics = jobOrders.filter(jo => !jo.diagnosticId);

    res.json({ 
      success: true, 
      jobOrders: jobOrdersWithoutDiagnostics || [] 
    });
  } catch (err) {
    console.error("Get job orders without diagnostics error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error retrieving job orders" 
    });
  }
};

// Delete job order
export const deleteJobOrder = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized - Please login" });
    }

    const { jobOrderId } = req.params;
    const jobOrder = await JobOrder.findById(jobOrderId);

    if (!jobOrder) {
      return res.status(404).json({ 
        success: false, 
        message: "Job order not found" 
      });
    }

    // Check authorization - user must be the technician or admin
    const user = await User.findById(req.session.userId);
    if (user.role === "technician" && jobOrder.technicianId !== req.session.userId) {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized - Cannot delete other technician's job orders" 
      });
    }

    // If there's a linked diagnostic, delete it first
    if (jobOrder.diagnosticId) {
      try {
        const linkedDiagnostic = await Diagnostic.findByJobOrderId(jobOrderId);
        if (linkedDiagnostic) {
          await Diagnostic.delete(linkedDiagnostic.id);
          console.log(`Diagnostic ${linkedDiagnostic.id} deleted along with job order ${jobOrderId}`);
        }
      } catch (diagErr) {
        console.error("Error deleting linked diagnostic:", diagErr);
        // Continue with job order deletion even if diagnostic deletion fails
      }
    }

    // Delete job order
    await JobOrder.delete(jobOrderId);

    res.json({ 
      success: true, 
      message: "Job order deleted successfully" 
    });
  } catch (err) {
    console.error("Delete job order error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error deleting job order: " + err.message 
    });
  }
};
