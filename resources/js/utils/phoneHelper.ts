/**
 * Sanitize Indonesian phone numbers to international format
 * Converts:
 * - 0813122xxxx → 62813122xxxx
 * - +62813122xxxx → 62813122xxxx (remove +)
 * - 62813122xxxx → 62813122xxxx (keep as is)
 */
export function sanitizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone || typeof phone !== "string") {
    return null;
  }

  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, "");

  // Remove leading +
  if (cleaned.startsWith("+")) {
    cleaned = cleaned.slice(1);
  }

  // If starts with 0, replace with 62
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  }

  // If doesn't start with 62, assume it's already international or invalid
  // Check if it looks like a valid Indonesian number
  if (!cleaned.startsWith("62")) {
    return null;
  }

  return cleaned;
}

/**
 * Build WhatsApp message URL
 * @param phoneNumber - Phone number (any format, will be sanitized)
 * @param message - Optional message text
 * @returns WhatsApp URL or null if phone is invalid
 */
export function getWhatsAppUrl(
  phoneNumber: string | null | undefined,
  message?: string
): string | null {
  const sanitized = sanitizePhoneNumber(phoneNumber);
  if (!sanitized) {
    return null;
  }

  const baseUrl = "https://wa.me/" + sanitized;

  if (message) {
    const encodedMessage = encodeURIComponent(message);
    return `${baseUrl}?text=${encodedMessage}`;
  }

  return baseUrl;
}
