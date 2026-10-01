import type { NextFunction, Request, Response } from "express";
import multer from "multer";

export const SAFE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

/** Extension chosen by us from an allow-list, never from client-supplied text. */
export function safeExtension(mimeType: string) {
  return EXTENSIONS[mimeType] ?? "bin";
}

export function isSafeImageType(mimeType: string) {
  return (SAFE_IMAGE_TYPES as readonly string[]).includes(mimeType);
}

/** Checks that the file's leading bytes match its declared type. */
export function matchesSignature(buffer: Buffer, mimeType: string) {
  const startsWith = (...bytes: number[]) => bytes.every((byte, index) => buffer[index] === byte);
  switch (mimeType) {
    case "image/jpeg": return startsWith(0xff, 0xd8, 0xff);
    case "image/png": return startsWith(0x89, 0x50, 0x4e, 0x47);
    case "image/gif": return buffer.subarray(0, 4).toString("ascii") === "GIF8";
    case "image/webp": return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
    case "application/pdf": return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
    case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return startsWith(0x50, 0x4b);
    default: return false;
  }
}

/** Runs after multer: rejects files whose content does not match their declared type. */
export function verifyUploadedFile(req: Request, res: Response, next: NextFunction) {
  if (req.file && !matchesSignature(req.file.buffer, req.file.mimetype)) {
    res.status(400).json({ error: "File content does not match its type" });
    return;
  }
  next();
}

/** Maps multer failures to proper client errors instead of a blanket 500. */
export function uploadErrorHandler(error: unknown, _req: Request, res: Response, next: NextFunction) {
  if (error instanceof multer.MulterError) {
    res.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: error.code === "LIMIT_FILE_SIZE" ? "File is too large" : error.message });
    return;
  }
  if (error instanceof Error && /^(Only image|Use a )/.test(error.message)) {
    res.status(400).json({ error: error.message });
    return;
  }
  next(error);
}
