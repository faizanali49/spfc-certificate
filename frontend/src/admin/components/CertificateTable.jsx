// Photo URLs are now correct as-stored — the server returns the right
// public URL for whatever environment it's running in (see
// PUBLIC_BASE_URL in photo-server/.env). No frontend rewriting needed.
const fixPhotoUrl = (url) => {
  if (!url) return "";
  return url
    .replace("http://localhost:4001", "https://spfc-punjab-govt.com")
    .replace("https://localhost:4001", "https://spfc-punjab-govt.com");
};

// src/admin/components/CertificateTable.jsx
const isIncomplete = (c) => !c.student_photo_url || !c.contact_no || !c.address;

const formatDate = (val) => {
  if (!val) return "—";

  let dateObj;

  // 1. Handle Firebase Timestamp
  if (val?.seconds) {
    dateObj = new Date(val.seconds * 1000);
  } else {
    // 2. Handle standard date or ISO strings (like "2026-06-15T13:03:15")
    dateObj = new Date(val);
  }

  // Fallback if parsing fails completely
  if (isNaN(dateObj.getTime())) return val;

  // 3. Extract individual parts to assemble your exact format
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  // Convert 24-hour to 12-hour format
  let hours = dateObj.getHours();
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  const seconds = String(dateObj.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12; // The hour '0' should be '12'
  const strHours = String(hours).padStart(2, '0');

  // 4. Assemble: YYYY-MM-DD hh:mm:ss AM/PM
  return `${year}-${month}-${day} ${strHours}:${minutes}:${seconds} ${ampm}`;
};

const CertificateTable = ({ certs, loading, onEdit, onDelete }) => {
  if (loading)
    return (
      <div className="table-loading">
        <div className="spinner" />
        <p>Loading certificates…</p>
      </div>
    );

  if (certs.length === 0)
    return (
      <div className="table-empty">
        <p>No certificates found.</p>
      </div>
    );

  return (
    <div className="table-wrapper">
      <table className="cert-table">
        <thead>
          <tr>
            <th>Status</th>
            <th>Photo</th>
            <th>Cert ID</th>
            <th>Name</th>
            <th>Father's Name</th>
            <th>CNIC</th>
            <th>City</th>
            <th>Purpose</th>
            <th>Dated</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {certs.map((c) => (
            <tr key={c.id} className={isIncomplete(c) ? "row-incomplete" : ""}>
              <td>
                <span
                  className={`status-dot ${isIncomplete(c) ? "status-warn" : "status-ok"}`}
                  title={isIncomplete(c) ? "Incomplete record" : "Complete"}
                >
                  {isIncomplete(c) ? "⚠" : "✓"}
                </span>
              </td>
              <td>
                {c.student_photo_url ? (
                  <img
                    src={fixPhotoUrl(c.student_photo_url)}
                    alt={c.name}
                    className="table-photo-thumb"
                  />
                ) : (
                  <span className="no-photo-dash">—</span>
                )}
              </td>
              <td>
                <code className="cert-id">{c.cert_id}</code>
              </td>
              <td>{c.name}</td>
              <td>{c.father_name}</td>
              <td><code className="cnic-code">{c.cnic}</code></td>
              <td>{c.city || "—"}</td>
              <td>{c.purpose || "—"}</td>
              <td>{formatDate(c.dated)}</td>
              <td className="actions-cell">
                <button
                  className="action-btn edit-btn"
                  onClick={() => onEdit(c)}
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  className="action-btn del-btn"
                  onClick={() => onDelete(c)}
                  title="Delete"
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CertificateTable;