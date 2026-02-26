import { Diagnostic } from "../models/diagnosticModel.js";
import { JobOrder } from "../models/jobOrderModel.js";
import { User } from "../models/userModel.js";

// Get diagnostic page for technician
export const diagnosticPage = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect("/login");
    }

    const technician = await User.findById(req.session.userId);
    if (!technician || technician.role !== "technician") {
      return res.redirect("/login");
    }

    res.render("diagnostic-form", {
      technician: technician,
      success: false,
      errorMessage: ""
    });
  } catch (err) {
    console.error("Diagnostic page error:", err);
    res.status(500).send("Error loading diagnostic page");
  }
};

// Validate job order exists
export const validateJobOrder = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    const { jobOrderId } = req.body;

    // Find job order
    const jobOrder = await JobOrder.findById(jobOrderId);
    if (!jobOrder) {
      return res.json({ success: false, message: "Job Order not found" });
    }

    // Check if it belongs to the technician
    if (jobOrder.technicianId !== req.session.userId) {
      return res.json({ success: false, message: "This job order doesn't belong to you" });
    }

    // Check if diagnostic already exists
    const existingDiagnostic = await Diagnostic.findByJobOrderId(jobOrderId);
    if (existingDiagnostic) {
      return res.json({ 
        success: false, 
        message: "Diagnostic already exists for this job order",
        diagnosticId: existingDiagnostic.id 
      });
    }

    // Return job order details
    res.json({
      success: true,
      jobOrder: {
        id: jobOrder.id,
        customerName: jobOrder.customerName,
        customerAddress: jobOrder.customerAddress,
        customerNumber: jobOrder.customerNumber,
        deviceType: jobOrder.deviceType,
        brandModel: jobOrder.brandModel,
        problems: jobOrder.selectedProblems
      }
    });
  } catch (err) {
    console.error("Validate job order error:", err);
    res.json({ success: false, message: "Error validating job order" });
  }
};

// Submit diagnostic form
export const submitDiagnostic = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const {
      jobOrderId,
      images,
      videoData,
      materials,
      estimatedCost,
      estimatedDurationDate,
      notes
    } = req.body;

    // Validate required fields (videoData is now optional)
    if (!jobOrderId || !images || !estimatedCost || !estimatedDurationDate) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields"
      });
    }

    // Validate materials - at least one material required
    if (!materials || !Array.isArray(materials) || materials.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one material is required"
      });
    }

    // Validate images - at least 3 (OK if only 3, recommended 5)
    if (!Array.isArray(images) || images.length < 3) {
      return res.status(400).json({
        success: false,
        message: "At least 3 images are required (5 recommended)"
      });
    }

    // Video is optional now - no validation required

    // Get technician details
    const technician = await User.findById(req.session.userId);
    if (!technician || technician.role !== "technician") {
      return res.status(403).json({ success: false, message: "Only technicians can submit diagnostics" });
    }

    // Verify job order exists and belongs to technician
    const jobOrder = await JobOrder.findById(jobOrderId);
    if (!jobOrder || jobOrder.technicianId !== req.session.userId) {
      return res.status(403).json({ success: false, message: "Invalid job order" });
    }

    // Check if diagnostic already exists
    const existingDiagnostic = await Diagnostic.findByJobOrderId(jobOrderId);
    if (existingDiagnostic) {
      return res.status(400).json({ success: false, message: "Diagnostic already exists for this job order" });
    }

    // Generate Diagnostic ID
    const diagnosticId = `DIA-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create diagnostic
    const now = new Date();
    const submittedDate = now.toLocaleString('en-PH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    const diagnostic = await Diagnostic.create({
      diagnosticId: diagnosticId,
      jobOrderId: jobOrderId,
      technicianId: req.session.userId,
      technicianName: technician.name,
      technicianEmail: technician.email,
      customerName: jobOrder.customerName,
      customerAddress: jobOrder.customerAddress,
      customerNumber: jobOrder.customerNumber,
      deviceType: jobOrder.deviceType,
      brandModel: jobOrder.brandModel,
      problems: jobOrder.selectedProblems,
      images: images,
      videoData: videoData,
      materials: materials,
      estimatedCost: estimatedCost,
      estimatedDurationDate: estimatedDurationDate,
      notes: notes || "",
      submittedDate: submittedDate,
      status: "Pending"
    });

    // Store diagnostic info in job order
    const diagnosticHistory = jobOrder.diagnosticHistory || [];
    diagnosticHistory.push({
      diagnosticId: diagnosticId,
      submittedDate: submittedDate,
      status: "Pending",
      materialCount: materials.length,
      estimatedCost: estimatedCost
    });

    // Update job order with diagnostic ID and status
    await JobOrder.update(jobOrderId, {
      status: "Diagnostic",
      diagnosticId: diagnosticId,
      diagnosticHistory: diagnosticHistory,
      lastDiagnosticDate: submittedDate
    });

    res.json({
      success: true,
      message: "Diagnostic submitted successfully",
      diagnosticId: diagnostic.id,
      diagnostic: diagnostic
    });
  } catch (err) {
    console.error("Submit diagnostic error:", err);
    res.status(500).json({
      success: false,
      message: "Error submitting diagnostic: " + err.message
    });
  }
};

// Get technician diagnostics
export const getTechnicianDiagnostics = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const technician = await User.findById(req.session.userId);
    if (!technician || technician.role !== "technician") {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const diagnostics = await Diagnostic.findByTechnicianId(req.session.userId);
    res.json({
      success: true,
      diagnostics: diagnostics || []
    });
  } catch (err) {
    console.error("Get technician diagnostics error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving diagnostics"
    });
  }
};

// Get single diagnostic
export const getDiagnosticById = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { diagnosticId } = req.params;
    const diagnostic = await Diagnostic.findById(diagnosticId);

    if (!diagnostic) {
      return res.status(404).json({ success: false, message: "Diagnostic not found" });
    }

    // Check authorization
    const user = await User.findById(req.session.userId);
    if (user.role === "technician" && diagnostic.technicianId !== req.session.userId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    res.json({
      success: true,
      diagnostic: diagnostic
    });
  } catch (err) {
    console.error("Get diagnostic error:", err);
    res.status(500).json({
      success: false,
      message: "Error retrieving diagnostic"
    });
  }
};

// Update diagnostic
export const updateDiagnostic = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const { diagnosticId } = req.params;
    const updateData = req.body;

    const diagnostic = await Diagnostic.findById(diagnosticId);
    if (!diagnostic) {
      return res.status(404).json({ success: false, message: "Diagnostic not found" });
    }

    // Check authorization
    if (diagnostic.technicianId !== req.session.userId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Only allow updates if status is "Pending"
    if (diagnostic.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot update diagnostic after it has been reviewed"
      });
    }

    const updated = await Diagnostic.update(diagnosticId, updateData);
    res.json({
      success: true,
      diagnostic: updated
    });
  } catch (err) {
    console.error("Update diagnostic error:", err);
    res.status(500).json({
      success: false,
      message: "Error updating diagnostic"
    });
  }
};

// Delete diagnostic
export const deleteDiagnostic = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized - Please login" });
    }

    const { diagnosticId } = req.params;
    console.log("Delete diagnostic request - ID:", diagnosticId);
    console.log("Session userId:", req.session.userId);
    
    const diagnostic = await Diagnostic.findById(diagnosticId);
    console.log("Found diagnostic:", diagnostic);

    if (!diagnostic) {
      return res.status(404).json({ success: false, message: "Diagnostic not found" });
    }

    // Check authorization
    console.log("Diagnostic technicianId:", diagnostic.technicianId);
    console.log("Session userId:", req.session.userId);
    if (diagnostic.technicianId !== req.session.userId) {
      return res.status(403).json({ success: false, message: "Unauthorized - You can only delete your own diagnostics" });
    }

    // Only allow deletion if status is "Pending"
    console.log("Diagnostic status:", diagnostic.status);
    if (diagnostic.status !== "Pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete diagnostic after it has been reviewed. Current status: " + diagnostic.status
      });
    }

    // Get job order to update history
    const jobOrder = await JobOrder.findById(diagnostic.jobOrderId);
    console.log("Found job order:", jobOrder);
    
    let diagnosticHistory = jobOrder.diagnosticHistory || [];
    diagnosticHistory = diagnosticHistory.filter(d => d.diagnosticId !== diagnostic.diagnosticId);

    // Reset job order status and remove diagnostic ID
    const updateData = {
      status: "Request Submitted",
      diagnosticHistory: diagnosticHistory
    };

    // If this was the last diagnostic, clear diagnosticId
    if (jobOrder.diagnosticId === diagnostic.diagnosticId) {
      updateData.diagnosticId = null;
      updateData.lastDiagnosticDate = null;
    }

    await JobOrder.update(diagnostic.jobOrderId, updateData);
    console.log("Job order updated");
    
    await Diagnostic.delete(diagnosticId);
    console.log("Diagnostic deleted");
    
    res.json({
      success: true,
      message: "Diagnostic deleted successfully"
    });
  } catch (err) {
    console.error("Delete diagnostic error:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting diagnostic: " + err.message
    });
  }
};

// Get diagnostic list page for technician
export const diagnosticListPage = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect("/login");
    }

    const technician = await User.findById(req.session.userId);
    if (!technician || technician.role !== "technician") {
      return res.redirect("/login");
    }

    res.render("diagnostic-list", {
      technician: technician,
      success: false,
      errorMessage: ""
    });
  } catch (err) {
    console.error("Diagnostic list page error:", err);
    res.status(500).send("Error loading diagnostic list page");
  }
};
