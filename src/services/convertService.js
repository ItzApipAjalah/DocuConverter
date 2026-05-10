const { exec } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const puppeteer = require('puppeteer');
const ipynb2html = require('ipynb2html');
const { JSDOM } = require('jsdom');
const pdf2excel = require('pdf-to-excel');
const os = require('os');
const { PDFDocument } = require('pdf-lib');
const AdmZip = require('adm-zip');

const LIBREOFFICE_PATH = os.platform() === 'win32'
    ? '"C:\\Program Files\\LibreOffice\\program\\soffice.exe"'
    : 'soffice';

// --- METADATA HELPERS ---
const setPdfMetadata = async (filePath) => {
    try {
        const pdfBytes = await fs.readFile(filePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        pdfDoc.setAuthor('AMWP');
        pdfDoc.setCreationDate(new Date());
        pdfDoc.setModificationDate(new Date());
        const modifiedBytes = await pdfDoc.save();
        await fs.writeFile(filePath, modifiedBytes);
    } catch (err) {
        console.error('Error setting PDF metadata:', err);
    }
};

const setOfficeMetadata = async (filePath) => {
    return new Promise((resolve) => {
        try {
            const zip = new AdmZip(filePath);
            const corePropsPath = 'docProps/core.xml';
            let coreXml = zip.readAsText(corePropsPath);
            if (coreXml) {
                const now = new Date().toISOString();

                if (coreXml.includes('<dc:creator>')) {
                    coreXml = coreXml.replace(/<dc:creator>.*?<\/dc:creator>/g, `<dc:creator>AMWP</dc:creator>`);
                } else {
                    coreXml = coreXml.replace('</cp:coreProperties>', `  <dc:creator>AMWP</dc:creator>\n</cp:coreProperties>`);
                }

                if (coreXml.includes('<cp:lastModifiedBy>')) {
                    coreXml = coreXml.replace(/<cp:lastModifiedBy>.*?<\/cp:lastModifiedBy>/g, `<cp:lastModifiedBy>AMWP</cp:lastModifiedBy>`);
                } else {
                    coreXml = coreXml.replace('</cp:coreProperties>', `  <cp:lastModifiedBy>AMWP</cp:lastModifiedBy>\n</cp:coreProperties>`);
                }

                if (coreXml.includes('<dcterms:created')) {
                    coreXml = coreXml.replace(/(<dcterms:created[^>]*>).*?(<\/dcterms:created>)/g, `$1${now}$2`);
                }

                if (coreXml.includes('<dcterms:modified')) {
                    coreXml = coreXml.replace(/(<dcterms:modified[^>]*>).*?(<\/dcterms:modified>)/g, `$1${now}$2`);
                }

                zip.updateFile(corePropsPath, Buffer.from(coreXml, 'utf8'));
                zip.writeZip(filePath);
            }
            resolve();
        } catch (error) {
            console.error('Error setting Office metadata:', error);
            resolve();
        }
    });
};

const injectMetadata = async (filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.pdf') {
        await setPdfMetadata(filePath);
    } else if (ext === '.docx' || ext === '.xlsx' || ext === '.pptx') {
        await setOfficeMetadata(filePath);
    }
};

// --- CONVERSION LOGIC ---
const convertWithLibreOffice = (inputPath, outputExt, infilter = null) => {
    return new Promise((resolve, reject) => {
        const outDir = path.dirname(inputPath);
        let command = `${LIBREOFFICE_PATH} --headless`;

        if (infilter) {
            command += ` --infilter="${infilter}"`;
        }

        command += ` --convert-to ${outputExt} "${inputPath}" --outdir "${outDir}"`;

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`LibreOffice Error: ${error.message}`);
                return reject(error);
            }
            const parsedPath = path.parse(inputPath);
            const outputPath = path.join(outDir, `${parsedPath.name}.${outputExt}`);
            resolve(outputPath);
        });
    });
};

const convertIpynbToPdf = async (inputPath) => {
    const outDir = path.dirname(inputPath);
    const parsedPath = path.parse(inputPath);
    const outputPath = path.join(outDir, `${parsedPath.name}.pdf`);

    const notebookStr = await fs.readFile(inputPath, 'utf8');
    const notebookObj = JSON.parse(notebookStr);

    const render = ipynb2html.createRenderer(new JSDOM().window.document);
    const element = render(notebookObj);

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Notebook</title>
            <style>
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    padding: 20px;
                    max-width: 1000px;
                    margin: 0 auto;
                }
                pre {
                    background-color: #f4f4f4;
                    padding: 10px;
                    border-radius: 5px;
                    white-space: pre-wrap;
                    word-wrap: break-word;
                }
                img {
                    max-width: 100%;
                    height: auto;
                }
                .nb-cell { margin-bottom: 20px; }
                .nb-input {
                    background-color: #f8f9fa;
                    border: 1px solid #e9ecef;
                    border-radius: 4px;
                    padding: 10px;
                }
                .nb-output { padding: 10px; }
            </style>
        </head>
        <body>
            ${element.outerHTML}
        </body>
        </html>
    `;

    const browserOptions = {
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
    if (os.platform() === 'linux') {
        browserOptions.executablePath = '/usr/bin/chromium-browser';
    }
    const browser = await puppeteer.launch(browserOptions);
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 0 });

    await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
    });

    await browser.close();
    return outputPath;
};

const convertPdfToExcel = async (inputPath) => {
    const outDir = path.dirname(inputPath);
    const parsedPath = path.parse(inputPath);
    const outputPath = path.join(outDir, `${parsedPath.name}.xlsx`);

    try {
        await pdf2excel.genXlsx(inputPath, outputPath);
        return outputPath;
    } catch (error) {
        console.error('PDF to Excel Error:', error);
        throw error;
    }
};

function parsePageOptions(optionsStr, totalPages) {
    const pages = new Set();
    const parts = optionsStr.split(',');
    for (let part of parts) {
        part = part.trim();
        if (!part) continue;
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(n => parseInt(n.trim(), 10));
            if (!isNaN(start) && !isNaN(end) && start <= end) {
                for (let i = start; i <= end; i++) {
                    if (i >= 1 && i <= totalPages) pages.add(i - 1);
                }
            }
        } else {
            const num = parseInt(part, 10);
            if (!isNaN(num) && num >= 1 && num <= totalPages) {
                pages.add(num - 1);
            }
        }
    }
    return Array.from(pages).sort((a, b) => a - b);
}

const mergePdfs = async (inputFiles) => {
    const mergedPdf = await PDFDocument.create();
    for (const file of inputFiles) {
        const pdfBytes = await fs.readFile(file.path);
        const pdf = await PDFDocument.load(pdfBytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    const outDir = path.dirname(inputFiles[0].path);
    const outputPath = path.join(outDir, `Merged_${Date.now()}.pdf`);
    const mergedBytes = await mergedPdf.save();
    await fs.writeFile(outputPath, mergedBytes);
    return outputPath;
};

const removePages = async (inputPath, optionsStr) => {
    const pdfBytes = await fs.readFile(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const totalPages = pdfDoc.getPageCount();

    const pagesToRemove = parsePageOptions(optionsStr, totalPages);

    // Remove in reverse order so indices don't shift
    for (let i = pagesToRemove.length - 1; i >= 0; i--) {
        pdfDoc.removePage(pagesToRemove[i]);
    }

    const parsedPath = path.parse(inputPath);
    const outputPath = path.join(parsedPath.dir, `${parsedPath.name}_removed.pdf`);
    const modifiedBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, modifiedBytes);
    return outputPath;
};

const extractPages = async (inputPath, optionsStr) => {
    const pdfBytes = await fs.readFile(inputPath);
    const sourcePdf = await PDFDocument.load(pdfBytes);
    const totalPages = sourcePdf.getPageCount();

    const pagesToExtract = parsePageOptions(optionsStr, totalPages);

    const newPdf = await PDFDocument.create();
    const copiedPages = await newPdf.copyPages(sourcePdf, pagesToExtract);
    copiedPages.forEach((page) => newPdf.addPage(page));

    const parsedPath = path.parse(inputPath);
    const outputPath = path.join(parsedPath.dir, `${parsedPath.name}_extracted.pdf`);
    const modifiedBytes = await newPdf.save();
    await fs.writeFile(outputPath, modifiedBytes);
    return outputPath;
};

const splitPdf = async (inputPath) => {
    const pdfBytes = await fs.readFile(inputPath);
    const sourcePdf = await PDFDocument.load(pdfBytes);
    const totalPages = sourcePdf.getPageCount();
    const parsedPath = path.parse(inputPath);

    const zip = new AdmZip();

    for (let i = 0; i < totalPages; i++) {
        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(sourcePdf, [i]);
        newPdf.addPage(copiedPage);
        const newPdfBytes = await newPdf.save();
        zip.addFile(`${parsedPath.name}_page_${i + 1}.pdf`, Buffer.from(newPdfBytes));
    }

    const outputPath = path.join(parsedPath.dir, `${parsedPath.name}_split.zip`);
    zip.writeZip(outputPath);
    return outputPath;
};

const imagesToPdf = async (inputFiles, optionsStr) => {
    const pdfDoc = await PDFDocument.create();
    let options = {};
    try {
        options = JSON.parse(optionsStr || '{}');
    } catch (e) {
        options = { orientation: 'portrait', pageSize: 'fit', margin: 'none' };
    }
    
    const marginSize = options.margin === 'small' ? 20 : (options.margin === 'big' ? 50 : 0);
    const isA4 = options.pageSize === 'a4';
    const isLandscape = options.orientation === 'landscape';

    for (const file of inputFiles) {
        const imgBytes = await fs.readFile(file.path);
        let img;
        const ext = path.extname(file.originalname || file.path).toLowerCase();
        
        try {
            if (ext === '.jpg' || ext === '.jpeg') {
                img = await pdfDoc.embedJpg(imgBytes);
            } else if (ext === '.png') {
                img = await pdfDoc.embedPng(imgBytes);
            } else {
                continue;
            }
        } catch (err) {
            console.error(`Error embedding image ${file.path}:`, err);
            continue;
        }

        let pageWidth, pageHeight;
        if (isA4) {
            pageWidth = isLandscape ? 841.89 : 595.28;
            pageHeight = isLandscape ? 595.28 : 841.89;
        } else {
            pageWidth = img.width + (marginSize * 2);
            pageHeight = img.height + (marginSize * 2);
        }

        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        
        const availableWidth = pageWidth - (marginSize * 2);
        const availableHeight = pageHeight - (marginSize * 2);
        
        const imgDims = img.scaleToFit(availableWidth, availableHeight);
        
        page.drawImage(img, {
            x: (pageWidth - imgDims.width) / 2,
            y: (pageHeight - imgDims.height) / 2,
            width: imgDims.width,
            height: imgDims.height,
        });
    }

    const outDir = path.dirname(inputFiles[0].path);
    const outputPath = path.join(outDir, `Images_${Date.now()}.pdf`);
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);
    return outputPath;
};

const processConversion = async (type, inputFiles, optionsStr) => {
    let outputPath;
    let inputPath = inputFiles[0].path;

    switch (type) {
        case 'word-to-pdf':
        case 'excel-to-pdf':
        case 'ppt-to-pdf':
            outputPath = await convertWithLibreOffice(inputPath, 'pdf');
            break;
        case 'pdf-to-word':
            outputPath = await convertWithLibreOffice(inputPath, 'docx', 'writer_pdf_import');
            break;
        case 'pdf-to-ppt':
            outputPath = await convertWithLibreOffice(inputPath, 'pptx', 'impress_pdf_import');
            break;
        case 'pdf-to-excel':
            outputPath = await convertPdfToExcel(inputPath);
            break;
        case 'ipynb-to-pdf':
            outputPath = await convertIpynbToPdf(inputPath);
            break;
        case 'merge-pdf':
            outputPath = await mergePdfs(inputFiles);
            break;
        case 'split-pdf':
            outputPath = await splitPdf(inputPath);
            break;
        case 'remove-pages':
            outputPath = await removePages(inputPath, optionsStr);
            break;
        case 'extract-pages':
            outputPath = await extractPages(inputPath, optionsStr);
            break;
        case 'image-to-pdf':
            outputPath = await imagesToPdf(inputFiles, optionsStr);
            break;
        default:
            throw new Error('Unsupported conversion type');
    }

    // Inject Metadata
    await injectMetadata(outputPath);
    return outputPath;
};

module.exports = {
    processConversion
};
