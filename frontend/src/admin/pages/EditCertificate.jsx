// src/admin/pages/EditCertificate.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { getCertificateById } from "../../firebase/firestoreService";
import CertificateForm from "../components/CertificateForm";
import "../../styles/form.css";

const EditCertificate = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // If Dashboard already had this record in its loaded table (the normal
  // navigation path via the ✏️ edit button), it's passed through router
  // state — this avoids a duplicate Firestore read for data we already have.
  const passedRecord = location.state?.record;

  const [initialData, setInitialData] = useState(passedRecord || null);
  const [loading, setLoading] = useState(!passedRecord);
  const [error, setError] = useState("");

  useEffect(() => {
    if (passedRecord) return; // Already have the data — skip the read entirely.

    const fetch = async () => {
      try {
        const data = await getCertificateById(id);
        if (!data) {
          setError("Certificate not found.");
          return;
        }
        setInitialData(data);
      } catch {
        setError("Failed to load certificate.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id, passedRecord]);

  if (loading)
    return (
      <div className="form-page-root">
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading certificate…</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="form-page-root">
        <div className="error-state">
          <p>{error}</p>
          <button onClick={() => navigate("/admin/dashboard")}>← Go Back</button>
        </div>
      </div>
    );

  return (
    <div className="form-page-root">
      <div className="form-page-header">
        <button className="back-btn" onClick={() => navigate("/admin/dashboard")}>
          ← Back to Dashboard
        </button>
        <div>
          <h1>Edit Certificate</h1>
          <p>
            Editing: <strong>{initialData?.cert_id}</strong> — {initialData?.name}
          </p>
        </div>
      </div>
      <CertificateForm
        mode="edit"
        initialData={initialData}
        onSuccess={() => navigate("/admin/dashboard")}
      />
    </div>
  );
};

export default EditCertificate;
