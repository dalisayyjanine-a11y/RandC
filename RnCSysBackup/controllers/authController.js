import bcrypt from "bcrypt";
import { User } from "../models/userModel.js";

export const loginPage = (req, res) => res.render("login");
export const forgotPasswordPage = (req, res) => res.render("forgotpassword");

export const dashboardPage = (req, res) => {
  if (!req.session.userId) return res.redirect("/login");
  res.redirect("/admin-dashboard");
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate inputs
    if (!email || !password) {
      return res.json({ 
        success: false, 
        message: '❌ Email and password are required',
        errorType: 'validation'
      });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.json({ 
        success: false, 
        message: '🔍 No account found with this email address',
        errorType: 'email_not_found'
      });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.json({ 
        success: false, 
        message: '🔒 Password is incorrect. Please try again',
        errorType: 'password_wrong'
      });
    }

    // Check if account is blocked/inactive
    if (user.status === 'inactive') {
      return res.json({ 
        success: false, 
        message: '🚫 Your account has been blocked. Please contact the administrator.',
        errorType: 'account_blocked'
      });
    }

    const emailLower = email.toLowerCase();
    let userRole = user.role || "technician";
    
    if (emailLower.includes("admin")) {
      userRole = "admin";
    }
    
    req.session.userId = user.id;
    req.session.userRole = userRole;
    
    // Determine redirect URL based on user role
    let redirectUrl = "/admin-dashboard";
    if (userRole === "technician") {
      redirectUrl = "/technician-dashboard";
    }

    res.json({ 
      success: true, 
      message: '✨ Login successful! Redirecting...',
      redirect: redirectUrl,
      role: userRole
    });

  } catch (err) {
    console.error("Login error:", err);
    res.json({ 
      success: false, 
      message: '⚠️ Login failed. Please try again.',
      errorType: 'server_error'
    });
  }
};

export const logoutUser = (req, res) => {
  req.session.destroy((err) => {
    if (err) res.send("Logout failed");
    else res.redirect("/");
  });
};
