import { Logbook } from "../models/logbookModel.js";
import { User } from "../models/userModel.js";

// Submit a new logbook entry
export const submitLogbookEntry = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized - Please login" });
    }

    const {
      logbookDate,
      customerName,
      itemsBought,
      cost,
      brandModel,
      signature
    } = req.body;

    // Validate required fields
    if (!logbookDate || !customerName || !itemsBought || itemsBought.length === 0 || !cost || !brandModel) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields" 
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
        message: "Only technicians can submit logbook entries" 
      });
    }

    // Create logbook entry with real-time date and time
    const now = new Date();
    // Format: MM/DD/YYYY, HH:MM:SS AM/PM
    const submittedDate = now.toLocaleString('en-PH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    const logbookEntry = await Logbook.create({
      technicianId: req.session.userId,
      technicianName: technician.name,
      technicianEmail: technician.email,
      logbookDate,
      customerName,
      itemsBought: Array.isArray(itemsBought) ? itemsBought : [itemsBought],
      cost: parseFloat(cost),
      brandModel,
      signature: signature,
      submittedDate: submittedDate,
      createdAt: now,
      updatedAt: now
    });

    res.json({ 
      success: true, 
      message: "Logbook entry submitted successfully",
      logbookId: logbookEntry.id,
      logbookEntry: logbookEntry
    });
  } catch (err) {
    console.error("Submit logbook entry error:", err);
    res.status(500).json({ 
      success: false, 
      message: "Error submitting logbook entry: " + err.message 
    });
  }
};

// Get technician logbook entries
export const getTechnicianLogbook = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const entries = await Logbook.findByTechnicianId(req.session.userId);
    res.json({ success: true, logbookEntries: entries });
  } catch (err) {
    console.error("Get technician logbook error:", err);
    res.status(500).json({ success: false, message: "Error fetching logbook: " + err.message });
  }
};

// Get all logbook entries (Admin)
export const getAllLogbookEntries = async (req, res) => {
  try {
    const entries = await Logbook.findAll();
    res.json({ success: true, logbookEntries: entries });
  } catch (err) {
    console.error("Get all logbook error:", err);
    res.status(500).json({ success: false, message: "Error fetching logbook: " + err.message });
  }
};

// Get logbook entry by ID
export const getLogbookById = async (req, res) => {
  try {
    const { logbookId } = req.params;
    const entry = await Logbook.findById(logbookId);

    if (!entry) {
      return res.status(404).json({ success: false, message: "Logbook entry not found" });
    }

    res.json({ success: true, logbookEntry: entry });
  } catch (err) {
    console.error("Get logbook by ID error:", err);
    res.status(500).json({ success: false, message: "Error fetching logbook entry: " + err.message });
  }
};

// Update logbook entry
export const updateLogbook = async (req, res) => {
  try {
    const { logbookId } = req.params;
    const { logbookDate, customerName, itemsBought, cost, brandModel } = req.body;

    const updated = await Logbook.update(logbookId, {
      logbookDate,
      customerName,
      itemsBought: Array.isArray(itemsBought) ? itemsBought : [itemsBought],
      cost: parseFloat(cost),
      brandModel
    });

    res.json({ 
      success: true, 
      message: "Logbook entry updated successfully",
      logbookEntry: updated
    });
  } catch (err) {
    console.error("Update logbook error:", err);
    res.status(500).json({ success: false, message: "Error updating logbook: " + err.message });
  }
};

// Delete logbook entry
export const deleteLogbook = async (req, res) => {
  try {
    const { logbookId } = req.params;
    await Logbook.delete(logbookId);

    res.json({ 
      success: true, 
      message: "Logbook entry deleted successfully" 
    });
  } catch (err) {
    console.error("Delete logbook error:", err);
    res.status(500).json({ success: false, message: "Error deleting logbook: " + err.message });
  }
};

// Get financial summary (Total income from all technicians)
export const getFinancialSummary = async (req, res) => {
  try {
    const allEntries = await Logbook.findAll();
    
    let totalIncome = 0;
    const technicianSummary = {};
    
    allEntries.forEach(entry => {
      const cost = entry.cost || 0;
      totalIncome += cost;
      
      if (!technicianSummary[entry.technicianId]) {
        technicianSummary[entry.technicianId] = {
          technicianName: entry.technicianName,
          technicianEmail: entry.technicianEmail,
          totalEarnings: 0,
          entriesCount: 0
        };
      }
      technicianSummary[entry.technicianId].totalEarnings += cost;
      technicianSummary[entry.technicianId].entriesCount += 1;
    });

    res.json({ 
      success: true, 
      totalIncome,
      technicianSummary: Object.values(technicianSummary),
      entriesCount: allEntries.length
    });
  } catch (err) {
    console.error("Get financial summary error:", err);
    res.status(500).json({ success: false, message: "Error fetching financial summary: " + err.message });
  }
};
