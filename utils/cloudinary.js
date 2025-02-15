const cloudinary = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadImage = async (file, cloudinaryFolder) =>
  new Promise((res, rej) => {
    const uploadStream = cloudinary.v2.uploader.upload_stream(
      {
        folder: cloudinaryFolder,
      },
      (err, result) => {
        if (err) rej(err);
        else res(result);
      },
    );

    uploadStream.end(file.buffer);
  });

const deleteImage = async (publicId) =>
  await cloudinary.v2.uploader.destroy(publicId);

module.exports = { uploadImage, deleteImage };
