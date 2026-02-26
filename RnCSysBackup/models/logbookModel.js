import { db } from "./db.js";
import admin from "firebase-admin";

const logbookCollection = db.collection("logbook");

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

// Process logbook data to convert timestamps
const processLogbookData = (data) => {
  if (!data) return data;
  return {
    ...data,
    createdAt: convertTimestamp(data.createdAt),
    updatedAt: convertTimestamp(data.updatedAt),
    submittedDate: data.submittedDate || (data.createdAt ? formatDateTime(data.createdAt) : 'N/A')
  };
};

export const Logbook = {
  async create(logbookData) {
    try {
      const now = new Date();
      const dataToSave = {
        ...logbookData,
        createdAt: now,
        updatedAt: now
      };
      const docRef = await logbookCollection.add(dataToSave);
      return { id: docRef.id, ...dataToSave };
    } catch (err) {
      console.error("Error creating logbook entry:", err);
      throw err;
    }
  },

  async findById(logbookId) {
    try {
      const doc = await logbookCollection.doc(logbookId).get();
      return doc.exists ? processLogbookData({ id: doc.id, ...doc.data() }) : null;
    } catch (err) {
      console.error("Error finding logbook entry:", err);
      throw err;
    }
  },

  async findByTechnicianId(technicianId) {
    try {
      const snap = await logbookCollection
        .where("technicianId", "==", technicianId)
        .get();
      const docs = snap.empty ? [] : snap.docs.map(doc => processLogbookData({ id: doc.id, ...doc.data() }));
      // Sort by createdAt in descending order (most recent first)
      return docs.sort((a, b) => {
        const dateA = a.createdAt ? convertTimestamp(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? convertTimestamp(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } catch (err) {
      console.error("Error finding logbook entries by technician:", err);
      throw err;
    }
  },

  async findAll() {
    try {
      const snap = await logbookCollection.get();
      const docs = snap.empty ? [] : snap.docs.map(doc => processLogbookData({ id: doc.id, ...doc.data() }));
      // Sort by createdAt in descending order (most recent first)
      return docs.sort((a, b) => {
        const dateA = a.createdAt ? convertTimestamp(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? convertTimestamp(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } catch (err) {
      console.error("Error finding all logbook entries:", err);
      throw err;
    }
  },

  async update(logbookId, updateData) {
    try {
      const now = new Date();
      await logbookCollection.doc(logbookId).update({
        ...updateData,
        updatedAt: now
      });
      return await this.findById(logbookId);
    } catch (err) {
      console.error("Error updating logbook entry:", err);
      throw err;
    }
  },

  async delete(logbookId) {
    try {
      await logbookCollection.doc(logbookId).delete();
      return true;
    } catch (err) {
      console.error("Error deleting logbook entry:", err);
      throw err;
    }
  }
};
