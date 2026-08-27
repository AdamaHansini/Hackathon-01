const multer = require('multer');

// Use memory storage — files are passed to Cloudinary as buffers
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Invalid file type: ${file.mimetype}. Only JPEG, PNG, WebP, and GIF are allowed.`
      ),
      false
    );
  }
};

/**
 * Upload middleware for item images (max 5 images, 5MB each)
 */
const uploadItemImages = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5,
  },
}).array('images', 5);

/**
 * Upload middleware for user avatar (single image, 2MB)
 */
const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1,
  },
}).single('avatar');

/**
 * Wrapper that handles Multer errors gracefully
 */
const handleMulterError = (uploadFn) => {
  return (req, res, next) => {
    uploadFn(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File too large. Maximum size is 5MB per image.',
          });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: 'Too many files. Maximum 5 images per post.',
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
        });
      }
      if (err) {
        return res.status(400).json({
          success: false,
          message: err.message || 'File upload failed.',
        });
      }
      next();
    });
  };
};

module.exports = {
  uploadItemImages: handleMulterError(uploadItemImages),
  uploadAvatar: handleMulterError(uploadAvatar),
};
