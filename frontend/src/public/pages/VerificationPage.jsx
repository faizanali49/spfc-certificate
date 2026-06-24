// src/public/pages/VerificationPage.jsx
//
// Public certificate verification, gated by CNIC + a simple math captcha.
// Route: /verification/certificate/:slug (the :slug is accepted for routing
// purposes / future linking, but verification itself always requires the
// visitor to type in their CNIC and solve the captcha — there is no
// QR-based or slug-based auto-lookup).
//
// COST NOTE: the actual Firestore lookup (verifyCertificateByCnic) is a
// direct getDoc() by CNIC — see firestoreService.js for details. This is
// the cheapest and fastest lookup Firestore offers, and performance does
// not degrade as the number of stored certificates grows.

import { useState } from "react";
import { useParams } from "react-router-dom";
import { verifyCertificateByCnic } from "../../firebase/firestoreService";
import "../../styles/verify.css";
import { formatCnicInput, validateCnicFormat } from "../../utils/cnicUtils";
import { generateCaptcha } from "../../utils/mathCaptcha";
import CertificateDisplay from "../components/CertificateDisplay";

const VerificationPage = () => {
  // :slug is accepted in the route but intentionally unused for lookup —
  // verification is always done via the CNIC + captcha form below.
  useParams();

  const [cnic, setCnic] = useState("");
  const [captcha, setCaptcha] = useState(() => generateCaptcha());
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); // idle | loading | found | not-found | error
  const [cert, setCert] = useState(null);

  const refreshCaptcha = () => {
    setCaptcha(generateCaptcha());
    setCaptchaAnswer("");
  };

  const resetForVerificationAgain = () => {
    setStatus("idle");
    setCert(null);
    setCnic("");
    setCaptchaAnswer("");
    refreshCaptcha();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errs = {};
    if (!cnic.trim()) {
      errs.cnic = "Please enter a CNIC.";
    } else if (!validateCnicFormat(cnic)) {
      errs.cnic = "Format must be 12345-6789012-3.";
    }
    if (!captchaAnswer.trim()) {
      errs.captcha = "Please answer the question.";
    } else if (parseInt(captchaAnswer, 10) !== captcha.answer) {
      errs.captcha = "Incorrect answer. Try again.";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      // Always give a fresh captcha after any failed attempt, including
      // wrong answers — prevents trivial repeated guessing.
      refreshCaptcha();
      return;
    }

    setErrors({});
    setStatus("loading");
    try {
      const data = await verifyCertificateByCnic(cnic);
      if (!data) {
        setStatus("not-found");
      } else {
        setCert(data);
        setStatus("found");
      }
    } catch {
      setStatus("error");
    } finally {
      refreshCaptcha();
      setCaptchaAnswer("");
    }
  };

  return (
    <div className="verify-root">

      {/* GLOBAL FIXED TOP BANNER */}
      <div className="police-khidmat-banner">
        <div className="banner-content">
          <div className="banner-logo-circle">
            <img src="/assets/punjab-police-logo.png" alt="Logo" />
          </div>
        </div>
      </div>

      <main className="verify-main">
        <div className="verify-gate-wrapper">

          {status !== "found" && (
            <div className="verify-gate-card">
              <h1 className="gate-title">Document Verification</h1>
              
{/* adding a gray line */}
<div className="gray-line"></div>
              <p className="gate-subtitle">
                CNIC Number (required)
              </p>
              <form onSubmit={handleSubmit} className="gate-form">
                <div className={`gate-field ${errors.cnic ? "gate-field-error" : ""}`}>
                  {/* <label>CNIC</label> */}
                  <input
                    type="text"
                    value={cnic}
                    onChange={(e) => {
                      setCnic(formatCnicInput(e.target.value));
                      if (errors.cnic) setErrors((prev) => ({ ...prev, cnic: "" }));
                    }}
                    placeholder="Enter CNIC No. e.g. 31202-6789890-3"
                    maxLength={15}
                    autoComplete="off"
                  />
                  {errors.cnic && <span className="gate-error-text">{errors.cnic}</span>}
                </div>

                <div className={`gate-field ${errors.captcha ? "gate-field-error" : ""}`}>
  <label>{captcha.question} =</label>
  
  {/* New flex container wrapper */}
  <div className="captcha-input-group">
    <input
      type="number"
      value={captchaAnswer}
      onChange={(e) => {
        setCaptchaAnswer(e.target.value);
      }}
      placeholder="Your answer"
      autoComplete="off"
    />
    <div className="refresh-captcha-btn" onClick={refreshCaptcha} role="button" tabIndex={0}>
  <span className="captcha-btn-icon">🔄</span>
  <span className="captcha-btn-text">Refresh</span>
</div>

  </div>

  {errors.captcha && <span className="gate-error-text">{errors.captcha}</span>}
</div>


                <button type="submit" className="gate-submit-btn" disabled={status === "loading"}>
                  {status === "loading" ? "Submit" : "Submit"}
                </button>
              </form>

              {status === "not-found" && (
                <div className="gate-result-line gate-result-error">
                  ⚠ No record found for this CNIC.
                </div>
              )}

              {status === "error" && (
                <div className="gate-result-line gate-result-error">
                  Something went wrong while checking this CNIC. Please try again.
                </div>
              )}
            </div>
          )}

          {status === "found" && cert && (
            <>
              <CertificateDisplay cert={cert} />
              {/* <button onClick={resetForVerificationAgain} className="verify-another-btn">
                ← Verify Another CNIC
              </button> */}
            </>
          )}

        </div>
      </main>
    </div>
  );
};

export default VerificationPage;
