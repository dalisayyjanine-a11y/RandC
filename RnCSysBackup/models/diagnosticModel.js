import { db } from "./db.js";
import admin from "firebase-admin";

const diagnosticsCollection = db.collection("diagnostics");

// Helper function to convert Firestore timestamp to JavaScript Date
const convertTimestamp = (timestamp) => {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (timestamp instanceof admin.firestore.Timestamp) return timestamp.toDate();
  if (typeof timestamp === 'string') return new Date(timestamp);
  if (timestamp.toDate && typeof timestamp.toDate === 'function') return timestamp.toDate();
  return new Date(timestamp);
};

// Helper function to format date as "MM/DD/YYYY, HH:MM:SS AM/PM"
const formatDateTime = (date) => {
  if (!date) return 'N/A';
  const jsDate = convertTimestamp(date);
  if (!jsDate || isNaN(jsDate.getTime())) return 'N/A';
  return jsDate.toLocaleString('en-PH', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
};

// Process diagnostic data to convert timestamps
const processDiagnosticData = (data) => {
  if (!data) return data;
  return {
    ...data,
    createdAt: convertTimestamp(data.createdAt),
    submittedDate: data.submittedDate || (data.createdAt ? formatDateTime(data.createdAt) : 'N/A')
  };
};

export const Diagnostic = {
  async create(diagnosticData) {
    try {
      const now = new Date();
      const dataToSave = {
        ...diagnosticData,
        createdAt: now,
        updatedAt: now,
        status: "Pending"
      };
      const docRef = await diagnosticsCollection.add(dataToSave);
      return { id: docRef.id, ...dataToSave };
    } catch (err) {
      console.error("Error creating diagnostic:", err);
      throw err;
    }
  },

  async findById(diagnosticId) {
    try {
      const doc = await diagnosticsCollection.doc(diagnosticId).get();
      return doc.exists ? processDiagnosticData({ id: doc.id, ...doc.data() }) : null;
    } catch (err) {
      console.error("Error finding diagnostic:", err);
      throw err;
    }
  },

  async findByJobOrderId(jobOrderId) {
    try {
      const snap = await diagnosticsCollection
        .where("jobOrderId", "==", jobOrderId)
        .limit(1)
        .get();
      return snap.empty ? null : processDiagnosticData({ id: snap.docs[0].id, ...snap.docs[0].data() });
    } catch (err) {
      console.error("Error finding diagnostic by job order:", err);
      throw err;
    }
  },

  async findByTechnicianId(technicianId) {
    try {
      const snap = await diagnosticsCollection
        .where("technicianId", "==", technicianId)
        .get();
      const docs = snap.empty ? [] : snap.docs.map(doc => processDiagnosticData({ id: doc.id, ...doc.data() }));
      return docs.sort((a, b) => {
        const dateA = a.createdAt ? convertTimestamp(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? convertTimestamp(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } catch (err) {
      console.error("Error finding diagnostics by technician:", err);
      throw err;
    }
  },

  async update(diagnosticId, updateData) {
    try {
      const updateObj = {
        ...updateData,
        updatedAt: new Date()
      };
      await diagnosticsCollection.doc(diagnosticId).update(updateObj);
      return this.findById(diagnosticId);
    } catch (err) {
      console.error("Error updating diagnostic:", err);
      throw err;
    }
  },

  async delete(diagnosticId) {
    try {
      await diagnosticsCollection.doc(diagnosticId).delete();
      return true;
    } catch (err) {
      console.error("Error deleting diagnostic:", err);
      throw err;
    }
  },

  async findAll() {
    try {
      const snap = await diagnosticsCollection.get();
      const docs = snap.empty ? [] : snap.docs.map(doc => processDiagnosticData({ id: doc.id, ...doc.data() }));
      return docs.sort((a, b) => {
        const dateA = a.createdAt ? convertTimestamp(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? convertTimestamp(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } catch (err) {
      console.error("Error fetching all diagnostics:", err);
      throw err;
    }
  }
};
