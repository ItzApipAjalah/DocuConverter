const path = require('path');
const fs = require('fs').promises;
const { processConversion } = require('../services/convertService');

const handleConversion = async (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).send('No files uploaded.');
    }

    const conversionType = req.params.type;
    const options = req.body.options || '';

    // For single file operations, just take the first file. For merge, pass all files.
    let inputPath = req.files[0].path;
    let originalName = req.files[0].originalname;

    if (conversionType === 'merge-pdf' || conversionType === 'image-to-pdf') {
        originalName = conversionType === 'merge-pdf' ? 'Merged_Document.pdf' : 'Images_Converted.pdf';
    }

    let outputPath = null;

    try {
        console.log(`Starting conversion: ${conversionType} for file(s) ${originalName}`);

        // Process the file(s)
        outputPath = await processConversion(conversionType, req.files, options);

        // Generate formatted file name: RANDOMID_AMWP_ORIGINALNAME.ext
        const randomId = Math.random().toString(36).substring(2, 10).toUpperCase();
        const originalNameWithoutExt = path.parse(originalName).name;
        const parsedOutput = path.parse(outputPath);
        const newFileName = `${randomId}_AMWP_${originalNameWithoutExt}${parsedOutput.ext}`;

        // Save the file with the randomId name to keep it safe from collisions
        const finalPath = path.join(path.dirname(outputPath), `${randomId}${parsedOutput.ext}`);
        await fs.rename(outputPath, finalPath);

        // Save a metadata JSON file to keep track of it
        const metadata = {
            id: randomId,
            filename: newFileName,
            createdAt: Date.now(),
            path: finalPath
        };
        await fs.writeFile(path.join(path.dirname(outputPath), `${randomId}.json`), JSON.stringify(metadata));

        // Clean up input file(s)
        try {
            for (const f of req.files) {
                await fs.unlink(f.path).catch(e => console.error(e));
            }
        } catch (cleanupErr) {
            console.error('Error cleaning up input file:', cleanupErr);
        }

        // Return JSON instead of downloading directly
        const protocol = req.protocol;
        const host = req.get('host');
        const downloadUrl = `${protocol}://${host}/api/download/${randomId}`;

        res.json({
            success: true,
            id: randomId,
            filename: newFileName,
            downloadUrl: downloadUrl
        });

    } catch (error) {
        console.error('Conversion Error:', error);
        res.status(500).json({ success: false, message: 'An error occurred during conversion.' });

        // Clean up input file on error
        try {
            for (const f of req.files) {
                await fs.unlink(f.path).catch(e => console.error(e));
            }
            if (outputPath) {
                await fs.unlink(outputPath);
            }
        } catch (cleanupErr) {
            console.error('Error cleaning up input file:', cleanupErr);
        }
    }
};

const getFileInfo = async (req, res) => {
    const { id } = req.params;
    try {
        const metadataPath = path.join(__dirname, '../../uploads', `${id}.json`);
        const data = await fs.readFile(metadataPath, 'utf8');
        const metadata = JSON.parse(data);
        const protocol = req.protocol;
        const host = req.get('host');
        const downloadUrl = `${protocol}://${host}/api/download/${id}`;

        res.json({
            success: true,
            file: {
                id: metadata.id,
                filename: metadata.filename,
                downloadUrl: downloadUrl
            }
        });
    } catch (error) {
        res.status(404).json({ success: false, message: 'File not found or expired.' });
    }
};

const downloadFile = async (req, res) => {
    const { id } = req.params;
    try {
        const metadataPath = path.join(__dirname, '../../uploads', `${id}.json`);
        const data = await fs.readFile(metadataPath, 'utf8');
        const metadata = JSON.parse(data);

        res.download(metadata.path, metadata.filename, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
                if (!res.headersSent) {
                    res.status(500).send('Error downloading file.');
                }
            }
        });
    } catch (error) {
        res.status(404).send('File not found or expired.');
    }
};

module.exports = {
    handleConversion,
    getFileInfo,
    downloadFile
};
