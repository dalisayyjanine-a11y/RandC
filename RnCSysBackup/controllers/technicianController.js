import { User } from "../models/userModel.js";

// Technician Dashboard - renders the technician dashboard
export const technicianDashboardPage = async (req, res) => {
  if (!req.session.userId) return res.redirect("/login");
  
  // Get technician details
  const technician = await User.findById(req.session.userId);
  
  if (!technician) {
    return res.redirect("/login");
  }
  
  res.render("technician-dashboard", {
    technician: technician
  });
};

// Job Order Form - renders the job order form page
export const jobOrderFormPage = async (req, res) => {
  if (!req.session.userId) return res.redirect("/login");
  
  // Get technician details
  const technician = await User.findById(req.session.userId);
  
  if (!technician) {
    return res.redirect("/login");
  }
  
  res.render("job-order-form", {
    technician: technician
  });
};

// LogBook Form - renders the logbook form page
export const logbookFormPage = async (req, res) => {
  if (!req.session.userId) return res.redirect("/login");
  
  // Get technician details
  const technician = await User.findById(req.session.userId);
  
  if (!technician) {
    return res.redirect("/login");
  }
  
  res.render("logbook", {
    technician: technician
  });
};
