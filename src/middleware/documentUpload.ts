import multer from 'multer';
import { Request } from 'express';

// Configure multer to store files in memory
const storage = multer.memoryStorage();

// File filter to allow common document types
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allow common document types
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'text/plain',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/gif',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error: Error = new Error('File type not allowed. Allowed types: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, and images');
    cb(error as any, false);
  }
};

// Configure multer for documents
export const documentUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for documents
  },
});

