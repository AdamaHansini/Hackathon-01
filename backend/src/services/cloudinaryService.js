const cloudinaryPkg = require('cloudinary').v2;
const { Readable } = require('stream');

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} buffer     - File buffer from Multer
 * @param {Object} options    - Cloudinary upload options
 * @returns {Promise<{url, publicId}>}
 */
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      folder: 'lostlink',
      resource_type: 'image',
      quality: 'auto',
      fetch_format: 'auto',
      ...options,
    };

    const uploadStream = cloudinaryPkg.uploader.upload_stream(
      defaultOptions,
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    const readable = new Readable();
    readable._read = () => {};
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
};

/**
 * Upload item post image to Cloudinary
 */
const uploadItemImage = async (buffer, postId) => {
  return uploadToCloudinary(buffer, {
    folder: `lostlink/items/${postId}`,
    transformation: [
      { width: 1200, height: 900, crop: 'limit' },
      { quality: 'auto:good' },
    ],
  });
};

/**
 * Upload user avatar to Cloudinary
 */
const uploadAvatarImage = async (buffer, userId) => {
  return uploadToCloudinary(buffer, {
    folder: `lostlink/avatars`,
    public_id: `avatar_${userId}`,
    overwrite: true,
    transformation: [
      { width: 300, height: 300, crop: 'fill', gravity: 'face' },
      { quality: 'auto:good' },
    ],
  });
};

/**
 * Delete an image from Cloudinary by public_id
 */
const deleteFromCloudinary = async (publicId) => {
  if (!publicId) return;
  try {
    await cloudinaryPkg.uploader.destroy(publicId);
  } catch (err) {
    console.error(`⚠️  Cloudinary delete failed for ${publicId}:`, err.message);
  }
};

/**
 * Delete multiple images from Cloudinary
 */
const deleteManyFromCloudinary = async (publicIds) => {
  if (!publicIds || publicIds.length === 0) return;
  await Promise.allSettled(publicIds.map(deleteFromCloudinary));
};

module.exports = {
  uploadToCloudinary,
  uploadItemImage,
  uploadAvatarImage,
  deleteFromCloudinary,
  deleteManyFromCloudinary,
};
