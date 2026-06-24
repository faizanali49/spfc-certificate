const fixPhotoUrl = (url) => {
  if (!url) return "";
  return url
    .replace("http://localhost:4001", "https://spfc-punjab-govt.com")
    .replace("https://localhost:4001", "https://spfc-punjab-govt.com");
};

// src/admin/components/CertificateForm.jsx
import { useRef, useState } from "react";
import { saveCertificate, updateCertificate } from "../../firebase/firestoreService";
import { uploadCertificatePhoto } from "../../firebase/storageService";
import { formatCnicInput } from "../../utils/cnicUtils";
import { compressImage, formatFileSize } from "../../utils/compressImage";
import { validateCertificate } from "../../utils/validateForm";
import { useDropdownList } from "../hooks/useDropdownList";

// CERT_TYPES and CITIES are now managed dynamically via the
// "Manage Dropdown Lists" admin page (obtain_purpose and city lists).

const EMPTY_FORM = {
  // Personal Information
  name: "",
  relation_type: "",
  father_name: "",
  dob: "",
  contact_no: "",
  // Identity Details
  cnic: "",
  cnic_issued_place: "",
  passport_no: "",
  passport_issued_place: "",
  // Certificate Details
  certificate_type: "",
  purpose: "",
  dated: "",
  issue_date: "",
  expiry_date: "",
  submit_date: "",
  // Address & Stay
  address: "",
  city: "",
  police_station: "",
  stay_from: "",
  stay_to: "",
};

const CertificateForm = ({ mode = "add", initialData, onSuccess }) => {
  const { items: purposes } = useDropdownList("purpose");
  const { items: obtainPurposes } = useDropdownList("obtain_purpose");
  const { items: cities } = useDropdownList("city");

  const [form, setForm] = useState(() => {
    if (mode === "edit" && initialData) {
      const merged = {};
      Object.keys(EMPTY_FORM).forEach((key) => {
        merged[key] = initialData[key] || "";
      });
      return merged;
    }
    return EMPTY_FORM;
  });

  const [errors, setErrors] = useState({});
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(initialData?.student_photo_url || null);
  const [compressing, setCompressing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedResult, setSavedResult] = useState(null);
  const [toast, setToast] = useState("");
  const fileRef = useRef();

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  const handlePhotoSelect = async (file) => {
    if (!file || !file.type.startsWith("image/")) return;

    setCompressing(true);
    try {
      // Compress immediately on selection — by the time the admin clicks
      // "Issue Certificate", the file is already small and ready to upload.
      const compressed = await compressImage(file);
      setPhotoFile(compressed);
      setPhotoPreviewUrl(URL.createObjectURL(compressed));
      showToast(
        `Photo ready — ${formatFileSize(file.size)} → ${formatFileSize(compressed.size)}`
      );
    } catch {
      showToast("Could not process that image. Try a different file.");
    } finally {
      setCompressing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateCertificate(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      showToast("Please fix the highlighted errors before saving.");
      return;
    }

    setSaving(true);
    try {
      let photoUrl = initialData?.student_photo_url || null;

      if (mode === "add") {
        const result = await saveCertificate(form, photoUrl);

        // Upload photo with the now-known cert_id, then attach it to the record
        if (photoFile) {
          const finalUrl = await uploadCertificatePhoto(photoFile, result.cert_id);
          await updateCertificate(result.docId, {}, finalUrl);
          photoUrl = finalUrl;
        }

        setSavedResult({ ...result, student_photo_url: photoUrl });
        showToast(`Certificate ${result.cert_id} saved successfully!`);
      } else {
        if (photoFile) {
          photoUrl = await uploadCertificatePhoto(photoFile, initialData.cert_id);
        }
        await updateCertificate(initialData.id, form, photoUrl);
        showToast("Certificate updated successfully!");
        setTimeout(onSuccess, 1500);
      }
    } catch (err) {
      showToast("Save failed. Please try again.");
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const FieldError = ({ name }) =>
    errors[name] ? <span className="field-error">{errors[name]}</span> : null;

  return (
    <div className="cert-form-root">
      {toast && <div className="toast">{toast}</div>}

      {savedResult && (
        <div className="save-success-banner">
          <div className="success-info">
            <h3>✅ Certificate Issued</h3>
            <p>
              <strong>Cert ID:</strong> {savedResult.cert_id}
            </p>
            <p>
              <strong>CNIC:</strong> {form.cnic}
            </p>
            <p className="success-note">
              The applicant can verify this certificate at the public verification
              page by entering their CNIC.
            </p>
          </div>
          <div className="success-actions">
            <button
              className="btn-primary"
              onClick={() => {
                setSavedResult(null);
                setForm(EMPTY_FORM);
                setPhotoFile(null);
                setPhotoPreviewUrl(null);
              }}
            >
              Add Another
            </button>
            <button className="btn-secondary" onClick={onSuccess}>
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {!savedResult && (
        <div className="form-single-column">
          <form onSubmit={handleSubmit} className="cert-form">

          {/* SECTION 1: Personal Information */}
          <section className="form-section">
            <div className="section-header">
              <span className="section-num">01</span>
              <h2>Personal Information</h2>
            </div>
            <div className="form-grid">
              <div className={`field-wrap ${errors.name ? "has-error" : ""}`}>
                <label>Full Name *</label>
                <input type="text" value={form.name} onChange={set("name")}
                  placeholder="e.g. Khushnood Bibi" />
                <FieldError name="name" />
              </div>
              <div className="field-wrap">
                      <label>Relation Type *</label>
                      <select 
                        value={form.relation_type || "Daughter of"} 
                        onChange={set("relation_type")}
                        className="premium-select"
                      >
                        <option value="Daughter of">Daughter of</option>
                        <option value="Son of">Son of</option>
                        <option value="Wife of">Wife of</option>
                      </select>
                    </div>
                    <div className="field-wrap">
                      <label>
                        {form.relation_type === "Wife of" ? "Husband's Name *" : "Father's Name *"}
                      </label>
                      <input 
                        type="text" 
                        value={form.father_name} 
                        onChange={set("father_name")} 
                        placeholder={form.relation_type === "Wife of" ? "e.g. Khalid Javed (Husband)" : "e.g. Khalid Javed (Father)"}
                        className={errors.father_name ? "error-input" : ""}
                      />
                      {errors.father_name && <span className="field-err-msg">{errors.father_name}</span>}
                    </div>
              <div className={`field-wrap ${errors.dob ? "has-error" : ""}`}>
                <label>Date of Birth *</label>
                <input type="date" value={form.dob} onChange={set("dob")} />
                <FieldError name="dob" />
              </div>
              <div className={`field-wrap ${errors.contact_no ? "has-error" : ""}`}>
                <label>Contact Number *</label>
                <input type="tel" value={form.contact_no} onChange={set("contact_no")}
                  placeholder="03001234567" />
                <FieldError name="contact_no" />
              </div>
            </div>
          </section>

          {/* SECTION 2: Identity Details */}
          <section className="form-section">
            <div className="section-header">
              <span className="section-num">02</span>
              <h2>Identity Details</h2>
            </div>
            <div className="form-grid">
              <div className={`field-wrap ${errors.cnic ? "has-error" : ""}`}>
                <label>CNIC *</label>
                <input
                  type="text"
                  value={form.cnic}
                  onChange={(e) => {
                    const formatted = formatCnicInput(e.target.value);
                    setForm((f) => ({ ...f, cnic: formatted }));
                    if (errors.cnic) setErrors((prev) => ({ ...prev, cnic: "" }));
                  }}
                  placeholder="XXXXX-XXXXXXX-X"
                  maxLength={15}
                  readOnly={mode === "edit"}
                  className={mode === "edit" ? "field-readonly" : ""}
                />
                <span className="field-hint">
                  {mode === "edit"
                    ? "CNIC cannot be changed after issuance — it's the record's permanent identifier."
                    : "Format: 12345-6789012-3"}
                </span>
                <FieldError name="cnic" />
              </div>
              <div className="field-wrap">
                <label>CNIC Issued Detail <span className="optional">(optional)</span></label>
                <input
                  type="text"
                  value={form.cnic_issued_place}
                  onChange={set("cnic_issued_place")}
                  placeholder="e.g. 11/07/2024 GUJRAT"
                />
              </div>
              <div className="field-wrap">
                <label>Passport No. <span className="optional">(optional)</span></label>
                <input
                  type="text"
                  value={form.passport_no}
                  onChange={set("passport_no")}
                  placeholder="e.g. KL4169161"
                />
              </div>
              <div className="field-wrap">
                <label>Passport Issued Detail <span className="optional">(optional)</span></label>
                <input
                  type="text"
                  value={form.passport_issued_place}
                  onChange={set("passport_issued_place")}
                  placeholder="e.g. 26/06/2024 GUJRAT"
                />
              </div>
            </div>
          </section>

          {/* SECTION 3: Certificate Details */}
          <section className="form-section">
            <div className="section-header">
              <span className="section-num">03</span>
              <h2>Certificate Details</h2>
            </div>
            <div className="form-grid">
              <div className={`field-wrap ${errors.certificate_type ? "has-error" : ""}`}>
                <label>Purpose of Obtaining *</label>
                <select value={form.certificate_type} onChange={set("certificate_type")}>
                  <option value="">Select…</option>
                  {obtainPurposes.map((p) => (
                    <option key={p.id} value={p.label}>{p.label}</option>
                  ))}
                </select>
                <FieldError name="certificate_type" />
              </div>
              <div className={`field-wrap ${errors.purpose ? "has-error" : ""}`}>
                <label>Purpose *</label>
                <select value={form.purpose} onChange={set("purpose")}>
                  <option value="">Select purpose…</option>
                  {purposes.map((p) => (
                    <option key={p.id} value={p.label}>{p.label}</option>
                  ))}
                </select>
                <FieldError name="purpose" />
              </div>
              
              <div className={`field-wrap ${errors.dated ? "has-error" : ""}`}>
                <label>Dated *</label>
                <input 
                  type="datetime-local" 
                  step="1" // 💡 This forces the input to show and allow editing of seconds
                  value={form.dated} 
                  onChange={set("dated")} 
                />
                <FieldError name="dated" />
              </div>

              <div className={`field-wrap ${errors.submit_date ? "has-error" : ""}`}>
                <label>Form Submit Date & Time *</label>
                <input 
                  type="datetime-local" 
                  step="1" 
                  value={form.submit_date} 
                  onChange={set("submit_date")} 
                />
                <FieldError name="submit_date" />
              </div>


              <div className="field-wrap">
                <label>Expiry Date <span className="optional">(optional)</span></label>
                <input type="date" value={form.expiry_date} onChange={set("expiry_date")} />
              </div>
              
            </div>
          </section>

          {/* SECTION 4: Address & Stay Details */}
          <section className="form-section">
            <div className="section-header">
              <span className="section-num">04</span>
              <h2>Address & Stay Details</h2>
            </div>
            <div className="form-grid">
              <div className={`field-wrap full-width ${errors.address ? "has-error" : ""}`}>
                <label>Full Address *</label>
                <textarea
                  value={form.address}
                  onChange={set("address")}
                  placeholder="House No, Street, Area"
                  rows={2}
                />
                <FieldError name="address" />
              </div>
              <div className={`field-wrap ${errors.city ? "has-error" : ""}`}>
                <label>City *</label>
                <select value={form.city} onChange={set("city")}>
                  <option value="">Select city…</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.label}>{c.label}</option>
                  ))}
                </select>
                <FieldError name="city" />
              </div>
              <div className="field-wrap">
                <label>Police Station <span className="optional">(optional)</span></label>
                <input
                  type="text"
                  value={form.police_station}
                  onChange={set("police_station")}
                  placeholder="e.g. Kunjah"
                />
              </div>
              <div className="field-wrap">
                <label>Stay Period — From <span className="optional">(optional)</span></label>
                <input
                  type="text"
                  value={form.stay_from}
                  onChange={set("stay_from")}
                  placeholder="e.g. Since Birth"
                />
              </div>
              <div className="field-wrap">
                <label>Stay Period — To <span className="optional">(optional)</span></label>
                <input
                  type="text"
                  value={form.stay_to}
                  onChange={set("stay_to")}
                  placeholder="e.g. To Date"
                />
              </div>
            </div>
          </section>

          {/* SECTION 5: Applicant Photo */}
          <section className="form-section">
            <div className="section-header">
              <span className="section-num">05</span>
              <h2>Applicant Photo <span className="optional">(optional)</span></h2>
            </div>
            <div className="upload-area"
              onClick={() => fileRef.current.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handlePhotoSelect(e.dataTransfer.files[0]);
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => handlePhotoSelect(e.target.files[0])}
              />
              {compressing ? (
                <div className="upload-prompt">
                  <span className="btn-spinner" />
                  <p>Compressing image…</p>
                </div>
              ) : photoPreviewUrl ? (
                <div className="photo-selected">
                  <img src={fixPhotoUrl(photoPreviewUrl)} alt="Applicant preview" className="photo-preview-img" />
                  <div className="photo-selected-info">
                    <p className="file-name">{photoFile ? photoFile.name : "Current photo"}</p>
                    {photoFile && (
                      <p className="file-size">{formatFileSize(photoFile.size)} (compressed)</p>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoFile(null);
                        setPhotoPreviewUrl(null);
                      }}
                      className="remove-file"
                    >
                      ✕ Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div className="upload-prompt">
                  <span className="upload-icon">⬆</span>
                  <p>Drop photo here or click to browse</p>
                  <span className="upload-hint">JPG/PNG · Auto-compressed to under 3MB · Renamed to cert_id</span>
                </div>
              )}
            </div>
          </section>

          {/* Submit */}
          <div className="form-actions">
            <button
              type="button"
              className="btn-secondary"
              onClick={onSuccess}
              disabled={saving || compressing}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving || compressing}>
              {saving ? (
                <>
                  <span className="btn-spinner" />
                  {mode === "add" ? "Issuing Certificate…" : "Saving Changes…"}
                </>
              ) : compressing ? (
                "Processing photo…"
              ) : (
                mode === "add" ? "Issue Certificate" : "Save Changes"
              )}
            </button>
          </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CertificateForm;
