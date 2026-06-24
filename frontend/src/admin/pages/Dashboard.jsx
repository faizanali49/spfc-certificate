// src/admin/pages/Dashboard.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCertificates } from "../hooks/useCertificates";
import { deleteCertificate } from "../../firebase/firestoreService";
import { deleteCertificatePhoto } from "../../firebase/storageService";
import { adminLogout } from "../../firebase/authService";
import MetricCard from "../components/MetricCard";
import SearchFilterBar from "../components/SearchFilterBar";
import CertificateTable from "../components/CertificateTable";
import DeleteModal from "../components/DeleteModal";
import "../../styles/dashboard.css";

const Dashboard = () => {
  const navigate = useNavigate();
  const { filtered, loading, search, setSearch, filterCity, setFilterCity, metrics, cities, refresh } =
    useCertificates();

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleLogout = async () => {
    await adminLogout();
    navigate("/admin/login");
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCertificatePhoto(deleteTarget.student_photo_url);
      await deleteCertificate(deleteTarget.id);
      // Cache was invalidated inside deleteCertificate() — this refresh()
      // performs exactly one necessary read to sync the table with the
      // real post-delete state. No extra reads happen beyond this.
      await refresh();
      setDeleteTarget(null);
    } catch (err) {
      alert("Delete failed. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="dashboard-root">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="14" stroke="#4f8ef7" strokeWidth="1.5" />
              <path d="M16 6 L18.5 12 L25 12 L20 16 L22 22 L16 18.5 L10 22 L12 16 L7 12 L13.5 12 Z"
                fill="#4f8ef7" />
            </svg>
          </div>
          <div>
            <h2>CertAdmin</h2>
            <span>Admin Panel</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <a href="/admin/dashboard" className="nav-item active">
            <span className="nav-icon">⊞</span> Dashboard
          </a>
          <a href="/admin/add" className="nav-item">
            <span className="nav-icon">＋</span> Add Certificate
          </a>
          <a href="/admin/purposes" className="nav-item">
            <span className="nav-icon">☰</span> Manage Dropdowns
          </a>
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          ⏻ Sign Out
        </button>
      </aside>

      {/* Main content */}
      <main className="dashboard-main">
        <header className="dash-header">
          <div>
            <h1>Certificate Records</h1>
            <p>Manage and verify all issued academic certificates</p>
          </div>
          <button className="add-btn" onClick={() => navigate("/admin/add")}>
            + New Certificate
          </button>
        </header>

        {/* Metrics */}
        <div className="metrics-row">
          <MetricCard
            label="Total Certificates"
            value={metrics.total}
            icon="📄"
            color="blue"
          />
          <MetricCard
            label="Incomplete Records"
            value={metrics.incomplete}
            icon="⚠️"
            color="orange"
            alert={metrics.incomplete > 0}
          />
          <MetricCard
            label="Added This Week"
            value={metrics.recentCount}
            icon="🕐"
            color="green"
          />
        </div>

        {/* Search + filter */}
        <SearchFilterBar
          search={search}
          onSearch={setSearch}
          filterCity={filterCity}
          onFilterCity={setFilterCity}
          cities={cities}
        />

        {/* Table */}
        <CertificateTable
          certs={filtered}
          loading={loading}
          onEdit={(cert) => navigate(`/admin/edit/${cert.id}`, { state: { record: cert } })}
          onDelete={(cert) => setDeleteTarget(cert)}
        />
      </main>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <DeleteModal
          cert={deleteTarget}
          loading={deleting}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
