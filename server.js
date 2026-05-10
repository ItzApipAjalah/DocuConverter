const express = require('express');
const path = require('path');
const fs = require('fs');
const convertRoutes = require('./src/routes/convertRoutes');

const app = express();
const port = 3000;

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Use the conversion routes under /api
app.use('/api', convertRoutes);

// Route for API Documentation
app.get('/docs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'docs.html'));
});

// Catch-all route to serve the frontend app for persistent URLs
app.get(/(.*)/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware (catches Multer errors like "Field name missing")
app.use((err, req, res, next) => {
    if (err instanceof require('multer').MulterError) {
        return res.status(400).json({ success: false, message: `Upload Error: ${err.message}. Make sure the form-data key is named "file".` });
    } else if (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
    next();
});

// Start the server
app.listen(port, () => {
    console.log(`Multi-format Converter app listening at http://localhost:${port}`);
    
    // Cleanup old files from uploads/ every 15 minutes
    const uploadsDir = path.join(__dirname, 'uploads');
    setInterval(() => {
        fs.readdir(uploadsDir, (err, files) => {
            if (err) return console.error('Cleanup error:', err);
            
            const now = Date.now();
            // 1 Hour = 60 * 60 * 1000 ms
            const ONE_HOUR = 60 * 60 * 1000;
            
            files.forEach(file => {
                const filePath = path.join(uploadsDir, file);
                fs.stat(filePath, (err, stats) => {
                    if (err) return;
                    if (now - stats.mtimeMs > ONE_HOUR) {
                        fs.unlink(filePath, err => {
                            if (err) console.error(`Failed to delete old file: ${file}`);
                            else console.log(`Cleaned up old file: ${file}`);
                        });
                    }
                });
            });
        });
    }, 15 * 60 * 1000); // Run every 15 minutes
});
