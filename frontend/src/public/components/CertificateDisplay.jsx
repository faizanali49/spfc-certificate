
// Photo URLs are now correct as-stored — the server returns the right
// public URL for whatever environment it's running in (see
// PUBLIC_BASE_URL in photo-server/.env). No frontend rewriting needed.
const fixPhotoUrl = (url) => {
  if (!url) return "";
  return url
    .replace("http://localhost:4001", "https://spfc-punjab-govt.com")
    .replace("https://localhost:4001", "https://spfc-punjab-govt.com");
};

const formatDate = (val) => {
  if (!val) return "";

  if (val?.seconds) {
    return new Date(val.seconds * 1000).toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  if (typeof val === "string") {
    const d = new Date(val);

    if (!isNaN(d))
      return d.toLocaleDateString("en-PK", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
  }

  return val;
};

const getRelationAbbr = (relation) => {
  if (!relation) return "D/O";
  const rel = relation.trim().toLowerCase();
  if (rel === "son of") return "S/O";
  if (rel === "wife of") return "W/O";
  return "D/O"; 
};

const CertificateDisplay = ({ cert }) => {
  const relationLabel = cert.relation_type || "Daughter of";

  return (
    <div className="record-base-cert">
      {/* WATERMARK */}
      <div className="cert-watermark-bg" />

      {/* HEADER BLOCK */}
      <div className="brand-text-block">
        <div className="header-meta-row">
          {/* LEFT LOGO */}
          <div className="wing-logo-placeholder">
            <img 
              src="/assets/police.png"
              alt="Punjab Police Logo"
              loading="lazy"
              onError={(e) => (e.target.style.display = "none")}
            />
          </div>

          {/* CENTER TEXT */}
          <div className="brand-heading-group">
            <h1>Police Character Certificate</h1>
            <h1>Police Khidmat Markaz</h1>
            <h1>The District Police Officer, Gujrat</h1>
          </div>

          {/* RIGHT PHOTO */}
          <div className="header-right-photo">
            <div className="photo-frame">
              {cert.student_photo_url ? (
                <img
                  src={fixPhotoUrl(cert.student_photo_url)}
                  alt={cert.name || "Student"}
                  loading="lazy"
                />
              ) : (
                <div className="empty-photo">Photo</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* TRACKING BAR */}
      <div className="tracking-info-bar">
        <div className="track-id">
          PKM No: <strong className="responsive-wrap">{cert.cert_id || ""}</strong>
        </div>

        <div className="track-date">
          Dated: <strong>{cert.dated ? new Date(cert.dated).toLocaleString().replace(',', '') : "N/A"}</strong>
        </div>
      </div>

      {/* MAIN DATA GRID */}
      <div className="cert-grid-table">
        <div className="grid-row">
          <div className="grid-cell label-cell">Name</div>
          <div className="grid-cell value-cell uppercase-text responsive-wrap">
            {cert.name || ""}
          </div>
        </div>

        <div className="grid-row">
          <div className="grid-cell label-cell capitalize-text">{relationLabel}</div>
          <div className="grid-cell value-cell uppercase-text responsive-wrap">
            {cert.father_name || ""}
          </div>
        </div>

        <div className="grid-row">
          <div className="grid-cell label-cell">CNIC</div>
          <div className="grid-cell value-cell responsive-wrap">
            {cert.cnic || ""}
          </div>
        </div>

        <div className="grid-row">
          <div className="grid-cell label-cell">Contact No</div>
          <div className="grid-cell value-cell responsive-wrap">
            {cert.contact_no || ""}
          </div>
        </div>

        <div className="grid-row">
          <div className="grid-cell label-cell">Courier Address</div>
          <div className="grid-cell value-cell uppercase-text responsive-wrap">
            {cert.address || ""}
          </div>
        </div>

        <div className="grid-row">
          <div className="grid-cell label-cell">
            Purpose of Obtaining Character Certificate
          </div>
          <div className="grid-cell value-cell responsive-wrap">
            {cert.certificate_type || ""}
          </div>
        </div>

        {/* SPLIT ROW 1 */}
        <div className="grid-row split-row">
          <div className="split-half">
            <div className="grid-cell label-cell">Form Submit Date</div>
            <div className="grid-cell value-cell">
              {cert.submit_date ? new Date(cert.submit_date).toLocaleString().replace(',', '') : "N/A"}
            </div>
          </div>
          <div className="split-half">
            <div className="grid-cell label-cell">Date of Birth</div>
            <div className="grid-cell value-cell">
              {formatDate(cert.dob)}
            </div>
          </div>
        </div>

        {/* SPLIT ROW 2 */}
        <div className="grid-row split-row">
          <div className="split-half">
            <div className="grid-cell label-cell">CNIC Issued Detail</div>
            <div className="grid-cell value-cell uppercase-text responsive-wrap">
              {cert.cnic_issued_place || ""}
            </div>
          </div>
          <div className="split-half">
            <div className="grid-cell label-cell">Purpose</div>
            <div className="grid-cell value-cell responsive-wrap">
              {cert.purpose || ""}
            </div>
          </div>
        </div>

        {/* SPLIT ROW 3 */}
        <div className="grid-row split-row">
          <div className="split-half">
            <div className="grid-cell label-cell">Passport No.</div>
            <div className="grid-cell value-cell uppercase-text responsive-wrap">
              {cert.passport_no || ""}
            </div>
          </div>
          <div className="split-half">
            <div className="grid-cell label-cell">Passport Issued Detail</div>
            <div className="grid-cell value-cell uppercase-text responsive-wrap">
              {cert.passport_issued_place || ""}
            </div>
          </div>
        </div>
      </div>

      {/* STAY SECTION */}
      <div className="stay-section-title">
        <u>PLACE & PERIOD OF STAY</u>
      </div>

      <div className="stay-grid-table">
        {/* HEADER ROW */}
        <div className="stay-row header-row">
          <div className="stay-cell col-address">Address</div>
          <div className="stay-cell col-station">Police Station</div>
          <div className="stay-cell col-period">
            <div className="period-main-title">Stay Period</div>
            <div className="period-sub-split">
              <div className="sub-col">From</div>
              <div className="sub-col">To</div>
            </div>
          </div>
        </div>

        {/* DATA ROW */}
        <div className="stay-row data-row">
          <div className="stay-cell col-address">
            <div>
              <strong>Permanent: </strong>
              {cert.address || "P.O KHAS, QILADAR, TEHSIL & DISTRICT GUJRAT"}
            </div>
          </div>
          <div className="stay-cell col-station">
            {cert.police_station || "kunjah"}
          </div>
          <div className="stay-cell col-period">
            <div className="period-sub-split">
              <div className="sub-col">{cert.stay_from || "Since Birth"}</div>
              <div className="sub-col">{cert.stay_to || "To Date"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM STATUS & DISCLAIMER */}
      <div className="criminal-status-block">
        <p className="statement-intro">
          As per available record of Police Station(s), the applicant has:
        </p>

        <p className="status-alert-line">NO Record Found till date</p>
        <p className="status-alert-line">NO Criminal Record Found till date</p>

        <p className="statement-disclaimer">
          This Character Certificate document is genuine and issued to
          <strong className="uppercase-text bottom">
            {" "}
            "{cert.name || ""}"
          </strong>
          {" "}{getRelationAbbr(relationLabel)}{" "}
          <strong className="uppercase-text bottom">
            "{cert.father_name || ""}"
          </strong>
          {" "}by Punjab Police, Pakistan.
          {cert.expiry_date && (
            <>
              {" "}It will expire on{" "}
              <strong className="uppercase-text bottom">
                "{formatDate(cert.expiry_date)}"
              </strong>.
            </>
          )}
          {" "}
          This is electronic verification of the document cannot be challenged
          in The Court of Law. For detailed verification of the certificate
          please contact relevant district's Police Khidmat Markaz Incharge.
        </p>
      </div>

      
    </div>
  );
};

export default CertificateDisplay;