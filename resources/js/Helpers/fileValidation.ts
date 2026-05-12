/**
 * File validation helper
 */

const MAX_FILE_SIZE_MB = 2;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export interface FileValidationError {
  message: string;
  code: "size" | "type" | "unknown";
}

/**
 * Validate file size
 * @param file - The file to validate
 * @param maxSizeMB - Max file size in MB (default: 2MB)
 * @returns error message or null if valid
 */
export function validateFileSize(
  file: File,
  maxSizeMB: number = MAX_FILE_SIZE_MB
): FileValidationError | null {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    const actualSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      message: `Ukuran file terlalu besar. File: ${actualSizeMB}MB, Max: ${maxSizeMB}MB`,
      code: "size",
    };
  }

  return null;
}

/**
 * Validate file type
 * @param file - The file to validate
 * @param allowedTypes - Allowed MIME types or extensions
 * @returns error message or null if valid
 */
export function validateFileType(
  file: File,
  allowedTypes: string[] = ["image/jpeg", "image/png", "application/pdf"]
): FileValidationError | null {
  // Allow extension-based checks too (e.g., ".jpg", ".png")
  const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
  const isAllowedByType = allowedTypes.some((type) =>
    type.startsWith(".") ? fileExtension === type : file.type === type
  );

  if (!isAllowedByType) {
    return {
      message: `Tipe file tidak didukung. Format yang didukung: ${allowedTypes.join(", ")}`,
      code: "type",
    };
  }

  return null;
}

/**
 * Validate file (size and type)
 * @param file - The file to validate
 * @param allowedTypes - Allowed MIME types
 * @param maxSizeMB - Max file size in MB
 * @returns error message or null if valid
 */
export function validateFile(
  file: File,
  allowedTypes: string[] = ["image/jpeg", "image/png", "application/pdf"],
  maxSizeMB: number = MAX_FILE_SIZE_MB
): FileValidationError | null {
  // Check size first
  const sizeError = validateFileSize(file, maxSizeMB);
  if (sizeError) return sizeError;

  // Then check type
  const typeError = validateFileType(file, allowedTypes);
  if (typeError) return typeError;

  return null;
}

export { MAX_FILE_SIZE_MB, MAX_FILE_SIZE_BYTES };
