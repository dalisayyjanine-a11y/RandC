import { db } from "./db.js";
import admin from "firebase-admin";

const usersCollection = db.collection("users");

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

// Process user data to convert timestamps
const processUserData = (data) => {
  if (!data) return data;
  return {
    ...data,
    createdAt: convertTimestamp(data.createdAt),
    createdAtFormatted: data.createdAt ? formatDateTime(data.createdAt) : 'N/A'
  };
};

export const User = {
  async findByEmail(email) {
    const snap = await usersCollection.where("email", "==", email).limit(1).get();
    return snap.empty ? null : processUserData({ id: snap.docs[0].id, ...snap.docs[0].data() });
  },

  async findById(userId) {
    const doc = await usersCollection.doc(userId).get();
    return doc.exists ? processUserData({ id: doc.id, ...doc.data() }) : null;
  },

  async create(userData) {
    const docRef = await usersCollection.add(userData);
    return { id: docRef.id, ...userData };
  },

  async update(userId, data) {
    await usersCollection.doc(userId).update(data);
    return { id: userId, ...data };
  },

  async delete(userId) {
    await usersCollection.doc(userId).delete();
  },

  async getAllTechnicians() {
    const snap = await usersCollection.where("role", "==", "technician").get();
    return snap.docs.map(doc => processUserData({ id: doc.id, ...doc.data() }));
  },

  async getTechnicianById(techId) {
    const doc = await usersCollection.doc(techId).get();
    return doc.exists ? processUserData({ id: doc.id, ...doc.data() }) : null;
  },

  async findByRole(role) {
    const snap = await usersCollection.where("role", "==", role).get();
    return snap.empty ? [] : snap.docs.map(doc => processUserData({ id: doc.id, ...doc.data() }));
  }
};
