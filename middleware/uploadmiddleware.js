const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the 'uploads' directory exists, if not, create it dynamically
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Configure storage engine for multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Save all incoming files to the 'uploads' folder
        cb(null, uploadDir); 
    },
    filename: function (req, file, cb) {
        // Generate a unique filename using current timestamp and random number
        // This prevents overwriting if two files have the same name
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, uniqueSuffix + extension);
    }
});

// Initialize multer with the defined storage configuration
const upload = multer({ storage: storage });

module.exports = upload;