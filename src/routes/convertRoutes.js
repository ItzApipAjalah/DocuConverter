const express = require('express');
const multer = require('multer');
const path = require('path');
const { handleConversion, getFileInfo, downloadFile } = require('../controllers/convertController');

const router = express.Router();

// Setup Multer to use disk storage (LibreOffice needs actual files)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads/'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Define routes
router.post('/convert/:type', upload.array('file', 20), handleConversion);
router.get('/info/:id', getFileInfo);
router.get('/download/:id', downloadFile);

module.exports = router;
