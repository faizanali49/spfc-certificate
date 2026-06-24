// src/admin/components/DeleteModal.jsx
const DeleteModal = ({ cert, loading, onConfirm, onCancel }) => (
  <div className="modal-overlay" onClick={onCancel}>
    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
      <div className="modal-icon">🗑️</div>
      <h2>Delete Certificate?</h2>
      <p>
        You are about to permanently delete:
        <br />
        <strong>{cert.name}</strong> — <code>{cert.cert_id}</code>
      </p>
      <p className="modal-warn">
        This also removes the associated PDF from storage.
        <br />
        <strong>This action cannot be undone.</strong>
      </p>
      <div className="modal-actions">
        <button className="modal-cancel" onClick={onCancel} disabled={loading}>
          Cancel
        </button>
        <button className="modal-confirm" onClick={onConfirm} disabled={loading}>
          {loading ? "Deleting…" : "Yes, Delete"}
        </button>
      </div>
    </div>
  </div>
);

export default DeleteModal;
