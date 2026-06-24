// src/admin/pages/ManagePurposes.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDropdownList } from "../hooks/useDropdownList";
import {
  addDropdownItem,
  updateDropdownItem,
  deleteDropdownItem,
} from "../../firebase/firestoreService";
import "../../styles/purposes.css";

// Each tab maps to one manageable dropdown used in the certificate form.
const TABS = [
  {
    key: "purpose",
    label: "Purpose",
    description: "Shown as the 'Purpose' dropdown in the certificate form",
    placeholder: "e.g. This certificate is issued for visa processing.",
  },
  {
    key: "obtain_purpose",
    label: "Purpose of Obtaining",
    description: "Shown as 'Certificate Type / Purpose of Obtaining' on the certificate",
    placeholder: "e.g. Immigration",
  },
  {
    key: "city",
    label: "Cities",
    description: "Shown as the 'City' dropdown in the address section",
    placeholder: "e.g. Gujrat",
  },
];

const DropdownListEditor = ({ tab }) => {
  const { items, loading, refresh } = useDropdownList(tab.key);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    setSaving(true);
    setError("");
    try {
      await addDropdownItem(tab.key, newLabel.trim());
      setNewLabel("");
      await refresh(); // single necessary read to show the newly added item
    } catch {
      setError("Failed to add item. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditValue(item.label);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveEdit = async () => {
    if (!editValue.trim()) return;
    try {
      await updateDropdownItem(editingId, editValue.trim(), tab.key);
      cancelEdit();
      await refresh();
    } catch {
      setError("Failed to update item. Try again.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Remove this item? Existing certificates will keep their saved value.")) return;
    await deleteDropdownItem(id, tab.key);
    await refresh();
  };

  return (
    <div className="purposes-card">
      <p className="tab-description">{tab.description}</p>

      <div className="add-purpose-row">
        <input
          type="text"
          placeholder={tab.placeholder}
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button onClick={handleAdd} disabled={saving || !newLabel.trim()} className="add-purpose-btn">
          {saving ? "Adding…" : "+ Add"}
        </button>
      </div>
      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <div className="loading-state"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <p className="empty-state">No items yet. Add one above.</p>
      ) : (
        <ul className="purposes-list">
          {items.map((item) => (
            <li key={item.id} className="purpose-item">
              {editingId === item.id ? (
                <>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="edit-inline-input"
                    autoFocus
                  />
                  <div className="item-actions">
                    <button onClick={saveEdit} className="save-edit-btn" title="Save">✓</button>
                    <button onClick={cancelEdit} className="cancel-edit-btn" title="Cancel">✕</button>
                  </div>
                </>
              ) : (
                <>
                  <span>{item.label}</span>
                  <div className="item-actions">
                    <button
                      onClick={() => startEdit(item)}
                      className="edit-purpose-btn"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="delete-purpose-btn"
                      title="Remove"
                    >
                      ✕
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const ManagePurposes = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState(TABS[0].key);
  const currentTab = TABS.find((t) => t.key === activeTab);

  return (
    <div className="purposes-root">
      <div className="purposes-header">
        <button className="back-btn" onClick={() => navigate("/admin/dashboard")}>
          ← Back to Dashboard
        </button>
        <h1>Manage Dropdown Lists</h1>
        <p>Add, edit, or remove options shown in the certificate form dropdowns</p>
      </div>

      <div className="purposes-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`purposes-tab ${activeTab === tab.key ? "tab-active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DropdownListEditor tab={currentTab} />
    </div>
  );
};

export default ManagePurposes;
