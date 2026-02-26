import { db } from "./models/db.js";
import bcrypt from "bcrypt";

console.log("🔄 Initializing Firestore collections...");

try {
  // Create users collection by verifying it exists
  const usersCollection = db.collection("users");
  const snap = await usersCollection.limit(1).get();
  
  if (snap.empty) {
    console.log("🔄 Setting up 'users' collection...");
    
    // Hash the admin password
    const hashedPassword = await bcrypt.hash("AdminReezle123", 10);
    
    // Create admin account
    await usersCollection.add({
      name: "AdminCris",
      email: "AdminCris@rnc.com",
      password: hashedPassword,
      role: "admin",
      createdAt: new Date()
    });
    
    console.log("✅ 'users' collection created!");
    console.log("✅ Default admin account created!");
    console.log("📧 Email: AdminCris@rnc.com");
    console.log("🔑 Password: AdminReezle123");
  } else {
    // Check if admin account already exists
    const adminSnap = await usersCollection.where("email", "==", "AdminCris@rnc.com").limit(1).get();
    
    if (adminSnap.empty) {
      console.log("🔄 Creating default admin account...");
      const hashedPassword = await bcrypt.hash("AdminReezle123", 10);
      
      await usersCollection.add({
        name: "AdminCris",
        email: "AdminCris@rnc.com",
        password: hashedPassword,
        role: "admin",
        createdAt: new Date()
      });
      
      console.log("✅ Default admin account created!");
      console.log("📧 Email: AdminCris@rnc.com");
      console.log("🔑 Password: AdminReezle123");
    } else {
      console.log("✅ Admin account already exists!");
    }
    
    console.log("✅ 'users' collection already exists!");
  }

  console.log("✅ Firestore initialization complete!");
  console.log("🚀 Ready to start the application with: npm start");
} catch (err) {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
} finally {
  process.exit(0);
}