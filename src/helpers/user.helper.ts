
const formatMobileNumber = (mobile: string): string => {
    if (!mobile) return ""; // it is optional case, coz already validated in controller

    mobile = mobile.trim();
    if (mobile.length === 0) return "";

    // Remove all spaces and non-digit characters except +
    let cleaned = mobile.replace(/\s+/g, "").replace(/[^0-9+]/g, "");

    // If it already starts with +91, return as is
    if (cleaned.startsWith("+91")) {
        return cleaned;
    }

    // If it starts with 91 (without +), add the +
    if (cleaned.startsWith("91")) {
        return `+${cleaned}`;
    }

    // If it’s just a 10-digit number, add +91
    if (/^\d{10}$/.test(cleaned)) {
        return `+91${cleaned}`;
    }

    // Fallback: return cleaned number with +91 prefix
    return `+91${cleaned.replace(/^91/, "")}`;
};



export default { formatMobileNumber };