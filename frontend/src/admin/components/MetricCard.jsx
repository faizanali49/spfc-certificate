// src/admin/components/MetricCard.jsx
const MetricCard = ({ label, value, icon, color, alert }) => (
  <div className={`metric-card metric-${color} ${alert ? "metric-alert" : ""}`}>
    <div className="metric-icon">{icon}</div>
    <div className="metric-body">
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
    </div>
    {alert && <div className="metric-badge">Needs attention</div>}
  </div>
);

export default MetricCard;
