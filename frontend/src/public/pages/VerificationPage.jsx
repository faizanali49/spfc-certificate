import { useState } from "react";
import { useParams } from "react-router-dom";
import { verifyCertificateByCnic } from "../../firebase/firestoreService";
import "../../styles/verify.css";
import { formatCnicInput, validateCnicFormat } from "../../utils/cnicUtils";
import { generateCaptcha } from "../../utils/mathCaptcha";
import CertificateDisplay from "../components/CertificateDisplay";

const VerificationPage = () => {
  useParams();

  const [cnic, setCnic] = useState("");
  const [captcha, setCaptcha] = useState(() => generateCaptcha());
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState("idle"); 
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
              
              <div className="gray-line"></div>
              
              <p className="gate-subtitle">
                CNIC Number (required)
              </p>
              
              <form onSubmit={handleSubmit} className="gate-form">
                
                {/* CNIC FIELD */}
                <div className={`gate-field ${errors.cnic ? "gate-field-error" : ""}`}>
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

                {/* CAPTCHA FIELD */}
                <div className={`gate-field ${errors.captcha ? "gate-field-error" : ""}`}>
                  <div className="captcha-row">
                    <label className="captcha-label">{captcha.question} =</label>
                    
                    <div className="captcha-input-group">
                      <input
                        type="number"
                        value={captchaAnswer}
                        onChange={(e) => setCaptchaAnswer(e.target.value)}
                        placeholder="Enter captcha result"
                        autoComplete="off"
                      />
                      <div className="refresh-captcha-btn" onClick={refreshCaptcha} role="button" tabIndex={0}>
                        <span className="captcha-btn-icon">
                          <img 
                            src={"/assets/refresh-icon.png"} 
                            alt="Refresh" 
                            className="captcha-img-icon"
                          />
                        </span>
                        <span className="captcha-btn-text">Refresh</span>
                      </div>
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
            </>
          )}
          {/* FOOTER */}
      <div className="pitb-page-footer">
        &copy; Copyright 2026 PITB
      </div>

        </div>
      </main>
    </div>
  );
};

export default VerificationPage;