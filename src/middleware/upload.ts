import multer from 'multer';

// Store uploaded files in memory; we forward the buffer to Cloudinary
const storage = multer.memoryStorage();

// Only allow image mime types
const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    const error = new Error('Only image files are allowed!');
    cb(error, false);
  }
};

// 5MB per image cap to avoid oversized uploads
export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

