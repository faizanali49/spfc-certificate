// src/admin/pages/AddCertificate.jsx
import { useNavigate } from "react-router-dom";
import CertificateForm from "../components/CertificateForm";
import "../../styles/form.css";

const AddCertificate = () => {
  const navigate = useNavigate();

  return (
    <div className="form-page-root">
      <div className="form-page-header">
        <button className="back-btn" onClick={() => navigate("/admin/dashboard")}>
          ← Back to Dashboard
        </button>
        <div>
          <h1>New Certificate</h1>
          <p>Fill all required fields to issue a verified academic certificate</p>
        </div>
      </div>
      <CertificateForm
        mode="add"
        onSuccess={() => navigate("/admin/dashboard")}
      />
    </div>
  );
};

export default AddCertificate;
