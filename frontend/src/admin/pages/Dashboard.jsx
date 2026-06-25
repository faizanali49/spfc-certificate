// src/admin/pages/Dashboard.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminLogout } from "../../firebase/authService";
import { deleteCertificate } from "../../firebase/firestoreService";
import { deleteCertificatePhoto } from "../../firebase/storageService";
import "../../styles/dashboard.css";
import CertificateTable from "../components/CertificateTable";
import DeleteModal from "../components/DeleteModal";
import MetricCard from "../components/MetricCard";
import { useCertificates } from "../hooks/useCertificates";
import { useDropdownList } from "../hooks/useDropdownList";

const Dashboard = () => {
  const navigate = useNavigate();
  const { items: cityOptions } = useDropdownList("city"); // already cached, 0 extra reads in practice
  const {
    rows,
    loading,
    pageIndex,
    hasMore,
    goNext,
    goPrev,
    filterCity,
    setFilterCity,
    metrics,
    refresh,
    cnicSearch,
    setCnicSearch,
    searchResult,
    searching,
    runCnicSearch,
    clearSearch,
    pageSize,
  } = useCertificates();

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
      // Cache was invalidated inside deleteCertificate(). refresh() reloads
      // ONLY the current page (pageSize reads) + metrics (2 aggregation
      // reads) — never the whole collection.
      await refresh();
      setDeleteTarget(null);
    } catch (err) {
      alert("Delete failed. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  // While a CNIC search is active, show that single result instead of the
  // paginated table. Searching is a separate mode, not a filter on rows.
  const isSearchActive = searchResult !== undefined;
  const tableRows = isSearchActive ? (searchResult ? [searchResult] : []) : rows;

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

        {/* Metrics — both are 1-read aggregation queries, not a full scan.
            "Incomplete Records" was removed: computing it cheaply needs
            either a full collection scan (defeats the purpose) or a
            denormalized `incomplete: true/false` field written at save
            time, which firestoreService.js does not currently maintain.
            Add that field on write if you want this metric back. */}
        <div className="metrics-row">
          <MetricCard label="Total Certificates" value={metrics.total} icon="📄" color="blue" />
          <MetricCard label="Added This Week" value={metrics.recentCount} icon="🕐" color="green" />
        </div>

        {/* CNIC-only search (exact match, 1 read) + city filter (paginated) */}
        <div className="search-bar">
          <div className="search-input-wrap">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search by exact CNIC, e.g. 12345-6789012-3"
              value={cnicSearch}
              onChange={(e) => setCnicSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runCnicSearch()}
            />
            {cnicSearch && (
              <button className="clear-search" onClick={clearSearch}>
                ✕
              </button>
            )}
          </div>
          <button className="add-btn" onClick={runCnicSearch} disabled={searching || !cnicSearch.trim()}>
            {searching ? "Searching…" : "Search"}
          </button>
        </div>

        {isSearchActive && (
          <p className="search-status-note">
            {searchResult
              ? "Showing the matching record for this CNIC."
              : "No record found for this CNIC."}{" "}
            <button className="link-btn" onClick={clearSearch}>
              Clear search and return to the list
            </button>
          </p>
        )}

        {!isSearchActive && (
          <div className="city-filter-row">
            <select
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              className="city-filter"
            >
              <option value="">All Cities</option>
              {cityOptions.map((c) => (
                <option key={c.id} value={c.label}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Table */}
        <CertificateTable
          certs={tableRows}
          loading={loading && !isSearchActive}
          onEdit={(cert) => navigate(`/admin/edit/${cert.id}`, { state: { record: cert } })}
          onDelete={(cert) => setDeleteTarget(cert)}
        />

        {/* Pagination controls — only shown when not searching */}
        {!isSearchActive && (
          <div className="pagination-row">
            <button onClick={goPrev} disabled={pageIndex === 0 || loading}>
              ← Previous
            </button>
            <span className="page-indicator">
              Page {pageIndex + 1} · {rows.length} of up to {pageSize} shown
            </span>
            <button onClick={goNext} disabled={!hasMore || loading}>
              Next →
            </button>
          </div>
        )}
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