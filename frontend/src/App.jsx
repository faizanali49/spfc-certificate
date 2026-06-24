// src/App.jsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AddCertificate from "./admin/pages/AddCertificate";
import Dashboard from "./admin/pages/Dashboard";
import EditCertificate from "./admin/pages/EditCertificate";
import ManagePurposes from "./admin/pages/ManagePurposes";
import LoginPage from "./auth/LoginPage";
import ProtectedRoute from "./auth/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import VerificationPage from "./public/pages/VerificationPage";
import "./styles/global.css";

const App = () => (
  <AuthProvider>
    {/* 💡 ADDED THE FUTURE PROP HERE TO SILENCE THE WARNINGS */}
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        {/* Public — CNIC + captcha gated verification */}
        <Route
  path="/qr/publish/certificate/cHQ4anM3SEc2YmREdnVmSmk1aWhwdz09"
  element={<VerificationPage />}
/>

<Route
  path="/qr/publish/certificate"
  element={<VerificationPage />}
/>

        {/* Auth */}
        <Route path="/admin/login-34" element={<LoginPage />} />

        {/* Protected Admin */}
        <Route
          path="/admin/dashboard"
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
        />
        <Route
          path="/admin/add"
          element={<ProtectedRoute><AddCertificate /></ProtectedRoute>}
        />
        <Route
          path="/admin/edit/:id"
          element={<ProtectedRoute><EditCertificate /></ProtectedRoute>}
        />
        <Route
          path="/admin/purposes"
          element={<ProtectedRoute><ManagePurposes /></ProtectedRoute>}
        />

        {/* Fallbacks */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  </AuthProvider>
);

const NotFound = () => (
  <div style={{
    minHeight: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    fontFamily: "system-ui, sans-serif", color: "#1a3a5c", background: "#f0f4f8"
  }}>
    <h1 style={{ fontSize: "4rem", margin: 0 }}>404</h1>
    <p style={{ fontSize: "1.1rem", color: "#5a7a9a" }}>Page not found</p>
    <a href="/" style={{ marginTop: "1rem", color: "#4f8ef7" }}>Go home</a>
  </div>
);

export default App;
