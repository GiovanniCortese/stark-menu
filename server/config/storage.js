const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

// Configurazione Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Storage per Immagini (salva su Cloudinary)
const storage = new CloudinaryStorage({ 
    cloudinary: cloudinary, 
    params: { folder: 'menu-app' } 
});
const upload = multer({ storage: storage });

// Storage per File Temporanei (Excel/Buffer)
const uploadFile = multer({ storage: multer.memoryStorage() });

module.exports = { cloudinary, upload, uploadFile };