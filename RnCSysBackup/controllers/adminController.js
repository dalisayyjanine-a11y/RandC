import bcrypt from "bcrypt";
import { User } from "../models/userModel.js";
import { JobOrder } from "../models/jobOrderModel.js";
import { Diagnostic } from "../models/diagnosticModel.js";
import { RTO } from "../models/rtoModel.js";

// Admin Dashboard - renders the admin dashboard with technicians list
export const adminDashboardPage = async (req, res) => {
  if (!req.session.userId) return res.redirect("/login");
  
  // Get all technicians
  const technicians = await User.findByRole("technician");
  
  // Get all job orders for statistics
  const allJobOrders = await JobOrder.findAll();
  
  // Calculate job order statistics
  const jobOrderStats = {
    total: allJobOrders.length || 0,
    requestSubmitted: allJobOrders.filter(jo => jo.status === 'Request Submitted').length || 0,
    diagnostic: allJobOrders.filter(jo => jo.status === 'Diagnostic').length || 0,
    pending: allJobOrders.filter(jo => jo.status === 'Pending').length || 0,
    inProgress: allJobOrders.filter(jo => jo.status === 'In Progress').length || 0,
    checking: allJobOrders.filter(jo => jo.status === 'Checking').length || 0,
    completed: allJobOrders.filter(jo => jo.status === 'Completed').length || 0
  };
  
  // Check if there's a success message from adding technician
  const successData = req.session.technicianSuccess || {};
  
  // Clear the session data after using it
  if (req.session.technicianSuccess) {
    delete req.session.technicianSuccess;
  }
  
  res.render("admin-dashboard", {
    admin: await User.findById(req.session.userId),
    technicians: technicians || [],
    jobOrderStats: jobOrderStats,
    success: successData.success || false,
    technician: successData.technician || null,
    defaultPassword: successData.defaultPassword || ""
  });
};

export const addTechnician = async (req, res) => {
  try {
    if (!req.session.userId) return res.redirect("/login");
    
    const { name, email, phone, specialty, password } = req.body;
    
    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).send("Name is required");
    }
    if (!email || !email.trim()) {
      return res.status(400).send("Email is required");
    }
    if (!specialty || !specialty.trim()) {
      return res.status(400).send("At least one specialty is required");
    }
    
    // Check if email already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).send("Email already registered");
    }
    
    // Use admin input password or generate default if empty
    let hashedPassword;
    let finalPassword;
    
    if (password && password.trim() !== "") {
      finalPassword = password;
      hashedPassword = await bcrypt.hash(password, 10);
    } else {
      finalPassword = "Tech@123456";
      hashedPassword = await bcrypt.hash(finalPassword, 10);
    }
    
    // Handle multiple specialties (comma-separated)
    let specialties = [];
    let primarySpecialty = "";
    
    if (specialty && typeof specialty === 'string') {
      specialties = specialty.split(',').map(s => s.trim()).filter(s => s.length > 0);
      primarySpecialty = specialties[0] || "";
    }
    
    // Create technician account
    const newTechnician = await User.create({
      name,
      email,
      phone: phone || "",
      specialty: primarySpecialty,
      specialSkills: specialties.slice(1), // Additional skills beyond the first one
      password: hashedPassword,
      lastKnownPassword: finalPassword, // Store plain text password for admin display
      role: "technician",
      createdAt: new Date(),
      status: "active"
    });
    
    // Store success message and technician info in session for display
    req.session.technicianSuccess = {
      success: true,
      technician: newTechnician,
      defaultPassword: finalPassword
    };
    
    // Redirect to admin dashboard - will display success with technician info
    res.redirect("/admin-dashboard");
  } catch (err) {
    console.error("Add technician error:", err);
    res.status(500).send("Error adding technician: " + err.message);
  }
};

export const deleteTechnician = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized - Please login" });
    }
    
    const { techId } = req.params;
    
    // Verify admin
    const admin = await User.findById(req.session.userId);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized - Admin access required" });
    }
    
    // Cascade delete: Delete all connected data
    // 1. Get all job orders for this technician
    const jobOrders = await JobOrder.findByTechnicianId(techId);
    
    // 2. Delete all diagnostics and job orders
    for (const jobOrder of jobOrders) {
      // Delete diagnostics associated with this job order
      const diagnostic = await Diagnostic.findByJobOrderId(jobOrder.id);
      if (diagnostic) {
        await Diagnostic.delete(diagnostic.id);
      }
      
      // Delete the job order itself
      await JobOrder.delete(jobOrder.id);
    }
    
    // 3. Get all RTOs for this technician and delete them
    const rtos = await RTO.findByTechnicianId(techId);
    for (const rto of rtos) {
      await RTO.delete(rto.id);
    }
    
    // 4. Delete the technician user record
    await User.delete(techId);
    
    res.json({ success: true, message: "Technician and all connected data deleted successfully" });
  } catch (err) {
    console.error("Delete technician error:", err);
    res.status(500).json({ success: false, message: "Error deleting technician" });
  }
};

export const updateTechnicianStatus = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized - Please login" });
    }
    
    const { techId } = req.params;
    const { status } = req.body;
    
    // Verify admin
    const admin = await User.findById(req.session.userId);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized - Admin access required" });
    }
    
    // Update status
    await User.update(techId, { status });
    
    res.json({ success: true, message: "Technician status updated" });
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ success: false, message: "Error updating status" });
  }
};

// Get technician password (decrypted)
export const getTechnicianPassword = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized - Please login" });
    }
    
    const { techId } = req.params;
    
    // Verify admin
    const admin = await User.findById(req.session.userId);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized - Admin access required" });
    }
    
    // Get technician
    const technician = await User.findById(techId);
    if (!technician) {
      return res.status(404).json({ success: false, message: "Technician not found" });
    }
    
const displayPassword = technician.lastKnownPassword || "Tech@123456";
    res.json({ 
      success: true, 
      password: displayPassword,
      email: technician.email
    });
  } catch (err) {
    console.error("Get password error:", err);
    res.status(500).json({ success: false, message: "Error getting password" });
  }
};

// Add special skill to technician
export const addSpecialSkill = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized - Please login" });
    }
    
    const { techId } = req.params;
    const { specialSkill } = req.body;
    
    // Verify admin
    const admin = await User.findById(req.session.userId);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized - Admin access required" });
    }
    
    // Get technician
    const technician = await User.findById(techId);
    if (!technician) {
      return res.status(404).json({ success: false, message: "Technician not found" });
    }
    
    // Get existing special skills or initialize empty array
    let specialSkills = technician.specialSkills || [];
    
    // Add new skill if not already exists
    if (specialSkill && !specialSkills.includes(specialSkill)) {
      specialSkills.push(specialSkill);
    }
    
    // Update technician with new skills
    await User.update(techId, { specialSkills });
    
    res.json({ success: true, message: "Special skill added successfully", specialSkills });
  } catch (err) {
    console.error("Add special skill error:", err);
    res.status(500).json({ success: false, message: "Error adding special skill" });
  }
};

// Update technician (PUT)
export const updateTechnician = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized - Please login" });
    }
    
    const { techId } = req.params;
    const { name, email, phone, status, specialty, specialSkills, password } = req.body;
    
    console.log("=== UPDATE TECHNICIAN DEBUG ===");
    console.log("techId:", techId);
    console.log("Request body:", JSON.stringify(req.body));
    console.log("Received password:", password ? "YES (length: " + password.length + ")" : "NO");
    console.log("Password value:", JSON.stringify(password));
    
    // Verify admin
    const admin = await User.findById(req.session.userId);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized - Admin access required" });
    }
    
    // Get technician
    const technician = await User.findById(techId);
    if (!technician) {
      return res.status(404).json({ success: false, message: "Technician not found" });
    }
    
    console.log("Current technician password hash:", technician.password ? "EXISTS" : "MISSING");
    
    // Prepare update data - explicitly include all fields
    const updateData = {};
    
    // Always set these fields
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone || "";
    if (status !== undefined) updateData.status = status;
    if (specialty !== undefined) updateData.specialty = specialty || "";
    if (specialSkills !== undefined) updateData.specialSkills = Array.isArray(specialSkills) ? specialSkills : [];
    
    console.log("Update data before password:", JSON.stringify(updateData));
    
// Hash password if provided and not empty - STRICT check
    const passwordValue = req.body.password;
    const isPasswordProvided = passwordValue !== undefined && 
                               passwordValue !== null && 
                               String(passwordValue).trim().length > 0;
    
    console.log("Password check:", {
      rawValue: passwordValue,
      isProvided: isPasswordProvided,
      type: typeof passwordValue
    });
    
    if (isPasswordProvided) {
      console.log("Hashing new password...");
      const trimmedPassword = String(passwordValue).trim();
      const hashedPassword = await bcrypt.hash(trimmedPassword, 10);
      updateData.password = hashedPassword;
      // Store the plain text password for admin display purposes
      updateData.lastKnownPassword = trimmedPassword;
      console.log("Password hashed successfully!");
      console.log("New hash:", hashedPassword.substring(0, 20) + "...");
    } else {
      console.log("No password change requested - keeping existing password");
      // Don't include password in updateData if not provided
    }
    
    console.log("Final update data keys:", Object.keys(updateData));
    console.log("Final update data:", JSON.stringify(updateData));
    
    // Update technician fields
    await User.update(techId, updateData);
    
    console.log("Technician updated successfully!");
    res.json({ success: true, message: "Technician updated successfully", passwordChanged: isPasswordProvided });
  } catch (err) {
    console.error("Update technician error:", err);
    res.status(500).json({ success: false, message: "Error updating technician: " + err.message });
  }
};

// Admin Job Orders - renders all job orders from all technicians
export const adminJobOrdersPage = async (req, res) => {
  if (!req.session.userId) return res.redirect("/login");
  
  // Get all technicians for reference
  const technicians = await User.findByRole("technician");
  
  res.render("admin-job-orders", {
    admin: await User.findById(req.session.userId),
    technicians: technicians || []
  });
};

// API endpoint to get all job orders (for admin)
export const getAllJobOrders = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const admin = await User.findById(req.session.userId);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized - Admin access required" });
    }

    // Get all technicians
    const technicians = await User.findByRole("technician");
    
    // Get all job orders from the database
    const jobOrders = await JobOrder.findAll();
    
    res.json({
      success: true,
      jobOrders: jobOrders || [],
      technicians: technicians || []
    });
  } catch (err) {
    console.error("Get job orders error:", err);
    res.status(500).json({ success: false, message: "Error retrieving job orders" });
  }
};

// API endpoint to get all diagnostics (for admin)
export const getAllDiagnostics = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const admin = await User.findById(req.session.userId);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized - Admin access required" });
    }

    // Get all diagnostics from the database
    const diagnostics = await Diagnostic.findAll();
    
    // Get all technicians for mapping technician names
    const technicians = await User.findByRole("technician");
    const technicianMap = {};
    technicians.forEach(tech => {
      technicianMap[tech.id] = tech.name;
    });
    
    // Get all job orders for mapping customer/device info
    const jobOrders = await JobOrder.findAll();
    const jobOrderMap = {};
    jobOrders.forEach(jo => {
      jobOrderMap[jo.id] = jo;
    });
    
    // Enhance diagnostics with full details including technician name, job order info
    const enhancedDiagnostics = diagnostics.map(diag => {
      const jobOrder = jobOrderMap[diag.jobOrderId] || {};
      
      // Get problems from diagnostic first (stored as 'problems' when created), then fall back to job order
      // The diagnostic stores problems as 'problems' field from jobOrder.selectedProblems
      let problems = [];
      if (diag.problems && Array.isArray(diag.problems) && diag.problems.length > 0) {
        problems = diag.problems;
      } else if (jobOrder.selectedProblems && Array.isArray(jobOrder.selectedProblems) && jobOrder.selectedProblems.length > 0) {
        problems = jobOrder.selectedProblems;
      } else if (jobOrder.problems && Array.isArray(jobOrder.problems) && jobOrder.problems.length > 0) {
        problems = jobOrder.problems;
      }
      
      // Determine the display ID - prioritize diagnosticId (readable format like DIA-...)
      // Fall back to the Firestore document id
      const finalDiagnosticId = diag.diagnosticId || diag.id || 'N/A';
      
      return {
        ...diag,
        // Use diagnosticId for display (the readable ID like DIA-...)
        displayId: finalDiagnosticId,
        // Also include raw diagnosticId for debugging
        diagnosticId: diag.diagnosticId || '',
        // Include the document ID explicitly
        docId: diag.id,
        technicianName: diag.technicianName || (diag.technicianId ? (technicianMap[diag.technicianId] || 'N/A') : 'N/A'),
        customerName: diag.customerName || jobOrder.customerName || 'N/A',
        customerNumber: diag.customerNumber || jobOrder.customerNumber || 'N/A',
        customerAddress: diag.customerAddress || jobOrder.customerAddress || 'N/A',
        deviceType: diag.deviceType || jobOrder.deviceType || 'N/A',
        brandModel: diag.brandModel || jobOrder.brandModel || 'N/A',
        // Use problems array
        selectedProblems: problems,
        // Include full diagnostic details
        images: diag.images || [],
        videoData: diag.videoData || null,
        materials: diag.materials || [],
        notes: diag.notes || '',
        estimatedCost: diag.estimatedCost || 0,
        estimatedDurationDate: diag.estimatedDurationDate || 'N/A'
      };
    });
    
    res.json({
      success: true,
      diagnostics: enhancedDiagnostics || []
    });
  } catch (err) {
    console.error("Get diagnostics error:", err);
    res.status(500).json({ success: false, message: "Error retrieving diagnostics" });
  }
};

// API endpoint to get fresh job order statistics (for real-time dashboard updates)
export const getJobOrderStats = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const admin = await User.findById(req.session.userId);
    if (!admin || admin.role !== "admin") {
      return res.status(403).json({ success: false, message: "Unauthorized - Admin access required" });
    }

    // Get all job orders from the database
    const allJobOrders = await JobOrder.findAll();
    
    // Calculate fresh statistics
    const jobOrderStats = {
      total: allJobOrders.length || 0,
      requestSubmitted: allJobOrders.filter(jo => jo.status === 'Request Submitted').length || 0,
      diagnostic: allJobOrders.filter(jo => jo.status === 'Diagnostic').length || 0,
      pending: allJobOrders.filter(jo => jo.status === 'Pending').length || 0,
      inProgress: allJobOrders.filter(jo => jo.status === 'In Progress').length || 0,
      checking: allJobOrders.filter(jo => jo.status === 'Checking').length || 0,
      completed: allJobOrders.filter(jo => jo.status === 'Completed').length || 0
    };
    
    res.json({
      success: true,
      jobOrderStats: jobOrderStats
    });
  } catch (err) {
    console.error("Get job order stats error:", err);
    res.status(500).json({ success: false, message: "Error retrieving statistics" });
  }
};

