import { db } from "./db.js";
import admin from "firebase-admin";

const jobOrdersCollection = db.collection("jobOrders");

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

// Process job order data to convert timestamps
const processJobOrderData = (data) => {
  if (!data) return data;
  return {
    ...data,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
    // Also keep submittedDate as formatted string for display
    submittedDate: data.submittedDate || (data.createdAt ? formatDateTime(data.createdAt) : 'N/A')
  };
};

export const JobOrder = {
  async create(jobOrderData) {
    try {
      const now = new Date();
      const dataToSave = {
        ...jobOrderData,
        createdAt: now,
        updatedAt: now
      };
      const docRef = await jobOrdersCollection.add(dataToSave);
      return { id: docRef.id, ...dataToSave };
    } catch (err) {
      console.error("Error creating job order:", err);
      throw err;
    }
  },

  async findById(jobOrderId) {
    try {
      const doc = await jobOrdersCollection.doc(jobOrderId).get();
      return doc.exists ? processJobOrderData({ id: doc.id, ...doc.data() }) : null;
    } catch (err) {
      console.error("Error finding job order:", err);
      throw err;
    }
  },

  async findByTechnicianId(technicianId) {
    try {
      const snap = await jobOrdersCollection
        .where("technicianId", "==", technicianId)
        .get();
      const docs = snap.empty ? [] : snap.docs.map(doc => processJobOrderData({ id: doc.id, ...doc.data() }));
      // Sort by createdAt in descending order (most recent first)
      return docs.sort((a, b) => {
        const dateA = a.createdAt ? convertTimestamp(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? convertTimestamp(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } catch (err) {
      console.error("Error finding job orders by technician:", err);
      throw err;
    }
  },

  async findAll() {
    try {
      const snap = await jobOrdersCollection.get();
      const docs = snap.empty ? [] : snap.docs.map(doc => processJobOrderData({ id: doc.id, ...doc.data() }));
      // Sort by createdAt in descending order (most recent first)
      return docs.sort((a, b) => {
        const dateA = a.createdAt ? convertTimestamp(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? convertTimestamp(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } catch (err) {
      console.error("Error finding all job orders:", err);
      throw err;
    }
  },

  async findByStatus(status) {
    try {
      const snap = await jobOrdersCollection
        .where("status", "==", status)
        .get();
      const docs = snap.empty ? [] : snap.docs.map(doc => processJobOrderData({ id: doc.id, ...doc.data() }));
      // Sort by createdAt in descending order (most recent first)
      return docs.sort((a, b) => {
        const dateA = a.createdAt ? convertTimestamp(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? convertTimestamp(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } catch (err) {
      console.error("Error finding job orders by status:", err);
      throw err;
    }
  },

  async update(jobOrderId, data) {
    try {
      await jobOrdersCollection.doc(jobOrderId).update({
        ...data,
        updatedAt: new Date()
      });
      return { id: jobOrderId, ...data };
    } catch (err) {
      console.error("Error updating job order:", err);
      throw err;
    }
  },

  async delete(jobOrderId) {
    try {
      await jobOrdersCollection.doc(jobOrderId).delete();
      return true;
    } catch (err) {
      console.error("Error deleting job order:", err);
      throw err;
    }
  }
};
