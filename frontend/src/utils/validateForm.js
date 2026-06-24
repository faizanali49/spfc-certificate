import { validateCnicFormat } from "./cnicUtils";

/**
 * Validates the administrative Certificate Form submission data
 * @param {Object} data - Form field values state
 * @returns {Object} errors - Validation errors mapped by field name
 */
export const validateCertificate = (data) => {
  const errors = {};

  if (!data.name?.trim()) errors.name = "Full name is required";
  
  // Maps to dynamic Father/Husband field
  if (!data.father_name?.trim()) {
    errors.father_name = data.relation_type === "Wife of" 
      ? "Husband's name is required" 
      : "Father's name is required";
  }
  
  if (!data.cnic?.trim()) {
    errors.cnic = "CNIC is required";
  } else if (!validateCnicFormat(data.cnic)) {
    errors.cnic = "Format must be XXXXX-XXXXXXX-X";
  }
  
  if (!data.contact_no?.trim()) {
    errors.contact_no = "Contact number is required";
  } else if (!/^0\d{10}$/.test(data.contact_no.replace(/\s/g, ""))) {
    errors.contact_no = "Must be 11 digits starting with 0";
  }
  
  if (!data.dob) errors.dob = "Date of birth is required";
  
  if (!data.address?.trim()) errors.address = "Address is required";
  if (!data.city?.trim()) errors.city = "City is required";
  if (!data.certificate_type) errors.certificate_type = "Certificate type is required";
  if (!data.purpose?.trim()) errors.purpose = "Purpose is required";
  if (!data.dated) errors.dated = "Issue date is required";

  return errors;
};