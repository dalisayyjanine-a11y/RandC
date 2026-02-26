import express from "express";
import { homePage } from "../controllers/homeController.js";
import { loginPage, loginUser, logoutUser } from "../controllers/authController.js";
import { adminDashboardPage, addTechnician, deleteTechnician, updateTechnicianStatus, updateTechnician, getTechnicianPassword, adminJobOrdersPage, getAllJobOrders, getAllDiagnostics, getJobOrderStats } from "../controllers/adminController.js";
import { technicianDashboardPage, jobOrderFormPage, logbookFormPage } from "../controllers/technicianController.js";
import { submitJobOrder, getTechnicianJobOrders, getAllJobOrdersAPI, getJobOrderById, updateJobOrderStatus, deleteJobOrder, getJobOrdersWithoutDiagnostics } from "../controllers/jobOrderController.js";
import { diagnosticPage, validateJobOrder, submitDiagnostic, getTechnicianDiagnostics, getDiagnosticById, updateDiagnostic, deleteDiagnostic, diagnosticListPage } from "../controllers/diagnosticController.js";
import { rtoListPage, submitRTO, getRTOById, getTechnicianRTOs, updateRTO, deleteRTO, getAllRTOs, cleanupRTOJobOrders } from "../controllers/rtoController.js";
import { submitLogbookEntry, getTechnicianLogbook, getAllLogbookEntries, getLogbookById, updateLogbook, deleteLogbook, getFinancialSummary } from "../controllers/logbookController.js";

const router = express.Router();

// Home and Auth Routes
router.get("/", homePage);
router.get("/login", loginPage);
router.post("/login", loginUser);
router.get("/logout", logoutUser);

// Admin Routes 
router.get("/admin-dashboard", adminDashboardPage);
router.get("/admin/job-orders", adminJobOrdersPage);
router.post("/add-technician", addTechnician);

// API Routes for technician management
router.delete("/api/technician/:techId", deleteTechnician);
router.post("/api/technician/:techId/status", updateTechnicianStatus);
router.put("/api/technician/:techId", updateTechnician);
router.get("/api/technician/:techId/password", getTechnicianPassword);

// API Routes for job orders
router.get("/api/admin/job-orders", getAllJobOrders);
router.get("/api/admin/diagnostics", getAllDiagnostics);
router.get("/api/admin/job-order-stats", getJobOrderStats);
router.post("/api/job-orders", submitJobOrder);
router.get("/api/job-orders/all", getAllJobOrdersAPI);
router.get("/api/job-orders", getTechnicianJobOrders);
router.get("/api/job-orders-without-diagnostics", getJobOrdersWithoutDiagnostics);
router.get("/api/job-orders/:jobOrderId", getJobOrderById);
router.put("/api/job-orders/:jobOrderId/status", updateJobOrderStatus);
router.delete("/api/job-orders/:jobOrderId", deleteJobOrder);

// Technician Routes
router.get("/technician-dashboard", technicianDashboardPage);
router.get("/job-order-form", jobOrderFormPage);

// Diagnostic Routes
router.get("/diagnostic", diagnosticPage);
router.get("/diagnostic-list", diagnosticListPage);
router.post("/api/diagnostic/validate-job-order", validateJobOrder);
router.post("/api/diagnostic/create", submitDiagnostic);
router.get("/api/diagnostic", getTechnicianDiagnostics);
router.get("/api/diagnostic/:diagnosticId", getDiagnosticById);
router.put("/api/diagnostic/:diagnosticId", updateDiagnostic);
router.delete("/api/diagnostic/:diagnosticId", deleteDiagnostic);

// RTO Routes
router.get("/rto-list", rtoListPage);
router.post("/api/rto/create", submitRTO);
router.get("/api/rto", getTechnicianRTOs);
router.get("/api/rto/:rtoId", getRTOById);
router.put("/api/rto/:rtoId", updateRTO);
router.delete("/api/rto/:rtoId", deleteRTO);
router.get("/api/admin/rtos", getAllRTOs);

// Logbook Routes
router.get("/logbook", logbookFormPage);
router.post("/api/logbook", submitLogbookEntry);
router.get("/api/logbook", getTechnicianLogbook);
router.get("/api/logbook/all", getAllLogbookEntries);
router.get("/api/logbook/:logbookId", getLogbookById);
router.put("/api/logbook/:logbookId", updateLogbook);
router.delete("/api/logbook/:logbookId", deleteLogbook);
router.get("/api/admin/financial-summary", getFinancialSummary);

export default router;
