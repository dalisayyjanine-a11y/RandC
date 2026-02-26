import { db } from "./db.js";
import admin from "firebase-admin";

const rtosCollection = db.collection("rtos");

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

// Process RTO data to convert timestamps
const processRTOData = (data) => {
  if (!data) return data;
  return {
    ...data,
    createdAt: convertTimestamp(data.createdAt),
    dateReleased: data.dateReleased ? convertTimestamp(data.dateReleased) : new Date(),
    submittedDate: data.submittedDate || (data.createdAt ? formatDateTime(data.createdAt) : 'N/A')
  };
};

export const RTO = {
  async create(rtoData) {
    try {
      const now = new Date();
      const dataToSave = {
        ...rtoData,
        createdAt: now,
        dateReleased: now,
        updatedAt: now,
        status: "Pending"
      };
      const docRef = await rtosCollection.add(dataToSave);
      return { id: docRef.id, ...dataToSave };
    } catch (err) {
      console.error("Error creating RTO:", err);
      throw err;
    }
  },

  async findById(rtoId) {
    try {
      const doc = await rtosCollection.doc(rtoId).get();
      return doc.exists ? processRTOData({ id: doc.id, ...doc.data() }) : null;
    } catch (err) {
      console.error("Error finding RTO:", err);
      throw err;
    }
  },

  async findByDiagnosticId(diagnosticId) {
    try {
      const snap = await rtosCollection
        .where("diagnosticId", "==", diagnosticId)
        .limit(1)
        .get();
      return snap.empty ? null : processRTOData({ id: snap.docs[0].id, ...snap.docs[0].data() });
    } catch (err) {
      console.error("Error finding RTO by diagnostic:", err);
      throw err;
    }
  },

  async findByTechnicianId(technicianId) {
    try {
      const snap = await rtosCollection
        .where("technicianId", "==", technicianId)
        .get();
      const docs = snap.empty ? [] : snap.docs.map(doc => processRTOData({ id: doc.id, ...doc.data() }));
      return docs.sort((a, b) => {
        const dateA = a.createdAt ? convertTimestamp(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? convertTimestamp(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } catch (err) {
      console.error("Error finding RTOs by technician:", err);
      throw err;
    }
  },

  async update(rtoId, updateData) {
    try {
      const updateObj = {
        ...updateData,
        updatedAt: new Date()
      };
      await rtosCollection.doc(rtoId).update(updateObj);
      return this.findById(rtoId);
    } catch (err) {
      console.error("Error updating RTO:", err);
      throw err;
    }
  },

  async delete(rtoId) {
    try {
      await rtosCollection.doc(rtoId).delete();
      return true;
    } catch (err) {
      console.error("Error deleting RTO:", err);
      throw err;
    }
  },

  async findAll() {
    try {
      const snap = await rtosCollection.get();
      const docs = snap.empty ? [] : snap.docs.map(doc => processRTOData({ id: doc.id, ...doc.data() }));
      return docs.sort((a, b) => {
        const dateA = a.createdAt ? convertTimestamp(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? convertTimestamp(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
    } catch (err) {
      console.error("Error fetching all RTOs:", err);
      throw err;
    }
  }
};
