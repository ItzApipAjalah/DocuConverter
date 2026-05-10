document.addEventListener('DOMContentLoaded', async () => {
    // Initialize pdf.js worker
    if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    // Views
    const dashboardView = document.getElementById('dashboard-view');
    const uploadView = document.getElementById('upload-view');

    // Navigation
    const backBtn = document.getElementById('back-btn');
    const homeLink = document.getElementById('home-link');
    const navHome = document.getElementById('nav-home');

    // Tool details
    const toolTitle = document.getElementById('tool-title');
    const toolDescription = document.getElementById('tool-description');
    const conversionTypeInput = document.getElementById('conversion-type');

    // Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadForm = document.getElementById('upload-form');
    const fileListContainer = document.getElementById('file-list-container');
    const errorMessage = document.getElementById('error-message');
    const optionsInput = document.getElementById('options-input');
    const optionsDescription = document.getElementById('options-description');
    const pageThumbnailsContainer = document.getElementById('page-thumbnails-container');
    const proceedOptionsBtn = document.getElementById('proceed-options-btn');
    const initialState = document.getElementById('initial-state');
    const fileSelectedState = document.getElementById('file-selected-state');
    const optionsState = document.getElementById('options-state');
    const loadingState = document.getElementById('loading-state');
    const successState = document.getElementById('success-state');
    const errorState = document.getElementById('error-state');

    // Buttons
    const browseBtn = document.getElementById('browse-btn');
    const changeFileBtn = document.getElementById('change-file-btn');
    const backToFilesBtn = document.getElementById('back-to-files-btn');
    const tryAgainBtn = document.getElementById('try-again-btn');
    const convertAnotherBtn = document.getElementById('convert-another-btn');
    const downloadBtn = document.getElementById('download-btn');

    let currentFiles = [];
    let currentAcceptExtensions = '';
    let selectedPages = new Set();

    // --- Navigation Logic ---
    function showDashboard() {
        uploadView.classList.add('hidden');
        dashboardView.classList.remove('hidden');
        resetUploadState();
        history.pushState(null, '', '/');
    }

    function showUploadView(title, desc, type, acceptExt) {
        toolTitle.textContent = title;
        toolDescription.textContent = desc;
        conversionTypeInput.value = type;
        currentAcceptExtensions = acceptExt;

        if (type === 'merge-pdf' || type === 'image-to-pdf') {
            fileInput.multiple = true;
        } else {
            fileInput.multiple = false;
        }
        fileInput.accept = acceptExt;

        dashboardView.classList.add('hidden');
        uploadView.classList.remove('hidden');
        resetUploadState();
    }

    backBtn.addEventListener('click', showDashboard);
    homeLink.addEventListener('click', showDashboard);
    navHome.addEventListener('click', showDashboard);

    // Initialize tool cards
    const toolCards = document.querySelectorAll('.tool-card');
    toolCards.forEach(card => {
        card.addEventListener('click', () => {
            const title = card.querySelector('h3').textContent;
            const desc = card.querySelector('p').textContent;
            const type = card.dataset.tool;
            const accept = card.dataset.accept;
            showUploadView(title, desc, type, accept);
        });
    });

    // --- Filter Logic ---
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;

            // Update active state
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Filter tools with animation
            toolCards.forEach(card => {
                if (filter === 'all' || card.dataset.category === filter) {
                    card.style.display = 'flex';
                    setTimeout(() => card.style.opacity = '1', 10);
                } else {
                    card.style.opacity = '0';
                    setTimeout(() => card.style.display = 'none', 300);
                }
            });
        });
    });

    // --- Check Persistent URL on Load ---
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    if (pathSegments.length === 1 && pathSegments[0] !== 'index.html' && pathSegments[0] !== 'docs') {
        const fileId = pathSegments[0];
        fetch(`/api/info/${fileId}`).then(res => res.json()).then(data => {
            if (data.success) {
                dashboardView.classList.add('hidden');
                uploadView.classList.remove('hidden');
                toolTitle.textContent = 'File Ready';
                toolDescription.textContent = 'Your previously converted file is ready for download.';
                downloadBtn.href = data.file.downloadUrl;
                downloadBtn.download = data.file.filename;
                switchState(successState);
            } else {
                showDashboard();
            }
        }).catch(() => showDashboard());
    }

    // --- Upload Logic ---
    function formatBytes(bytes, decimals = 2) {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    }

    function switchState(stateElement) {
        [initialState, fileSelectedState, optionsState, loadingState, successState, errorState].forEach(el => {
            if (el) el.classList.add('hidden');
        });
        if (stateElement) stateElement.classList.remove('hidden');
    }

    function resetUploadState() {
        fileInput.value = '';
        currentFiles = [];
        optionsInput.value = '';
        selectedPages.clear();
        pageThumbnailsContainer.innerHTML = '';
        switchState(initialState);
    }

    browseBtn.addEventListener('click', () => fileInput.click());
    changeFileBtn.addEventListener('click', () => fileInput.click());
    backToFilesBtn.addEventListener('click', () => switchState(fileSelectedState));
    tryAgainBtn.addEventListener('click', () => switchState(initialState));
    convertAnotherBtn.addEventListener('click', showDashboard);

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFiles(Array.from(e.target.files));
        }
    });

    // Drag and Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            if (!loadingState.classList.contains('hidden') || !successState.classList.contains('hidden')) return;
            dropZone.classList.add('dragover');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('dragover');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        if (!loadingState.classList.contains('hidden') || !successState.classList.contains('hidden')) return;
        const dt = e.dataTransfer;
        const files = Array.from(dt.files);
        if (files.length > 0) {
            handleFiles(files);
        }
    }, false);

    function getExtension(filename) {
        return '.' + filename.split('.').pop().toLowerCase();
    }

    function handleFiles(files) {
        const acceptedExts = currentAcceptExtensions.split(',');

        let validFiles = [];
        for (let file of files) {
            const fileExt = getExtension(file.name);
            if (acceptedExts.includes(fileExt)) {
                validFiles.push(file);
            }
        }

        if (validFiles.length === 0) {
            errorMessage.textContent = `Invalid file type. Please upload file(s) with extension: ${currentAcceptExtensions}`;
            switchState(errorState);
            return;
        }

        const type = conversionTypeInput.value;
        if (type === 'merge-pdf' || type === 'image-to-pdf') {
            currentFiles = [...currentFiles, ...validFiles];
        } else {
            currentFiles = [validFiles[0]];
        }

        renderFileList();
        switchState(fileSelectedState);
    }

    function renderFileList() {
        fileListContainer.innerHTML = '';
        const type = conversionTypeInput.value;

        currentFiles.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-item';
            
            // Enable Drag and Drop reordering
            if (type === 'merge-pdf' || type === 'image-to-pdf') {
                item.draggable = true;
                item.dataset.index = index;
                
                item.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', index);
                    item.classList.add('dragging');
                });
                
                item.addEventListener('dragend', () => {
                    item.classList.remove('dragging');
                });
                
                item.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    item.classList.add('drag-over');
                });
                
                item.addEventListener('dragleave', () => {
                    item.classList.remove('drag-over');
                });
                
                item.addEventListener('drop', (e) => {
                    e.preventDefault();
                    item.classList.remove('drag-over');
                    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                    const toIndex = index;
                    
                    if (fromIndex !== toIndex) {
                        const movedItem = currentFiles.splice(fromIndex, 1)[0];
                        currentFiles.splice(toIndex, 0, movedItem);
                        renderFileList();
                    }
                });
            }

            const nameDiv = document.createElement('div');
            nameDiv.className = 'file-item-name';
            nameDiv.textContent = file.name;
            nameDiv.title = file.name;

            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'file-item-actions';

            if (type === 'merge-pdf' || type === 'image-to-pdf') {
                const upBtn = document.createElement('button');
                upBtn.type = 'button';
                upBtn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
                upBtn.onclick = (e) => { e.stopPropagation(); moveFile(index, -1); };
                upBtn.disabled = index === 0;

                const downBtn = document.createElement('button');
                downBtn.type = 'button';
                downBtn.innerHTML = '<i class="fa-solid fa-arrow-down"></i>';
                downBtn.onclick = (e) => { e.stopPropagation(); moveFile(index, 1); };
                downBtn.disabled = index === currentFiles.length - 1;

                const delBtn = document.createElement('button');
                delBtn.type = 'button';
                delBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
                delBtn.onclick = (e) => {
                    e.stopPropagation();
                    currentFiles.splice(index, 1);
                    if (currentFiles.length === 0) {
                        resetUploadState();
                    } else {
                        renderFileList();
                    }
                };

                actionsDiv.appendChild(upBtn);
                actionsDiv.appendChild(downBtn);
                actionsDiv.appendChild(delBtn);

                // Add Image Preview for Image to PDF
                if (type === 'image-to-pdf') {
                    const imgPreview = document.createElement('img');
                    imgPreview.src = URL.createObjectURL(file);
                    imgPreview.style.width = '40px';
                    imgPreview.style.height = '40px';
                    imgPreview.style.objectFit = 'cover';
                    imgPreview.style.borderRadius = '5px';
                    imgPreview.style.marginRight = '10px';
                    imgPreview.style.pointerEvents = 'none'; // Prevent image from interfering with drag
                    item.prepend(imgPreview);
                }
            } else {
                const sizeDiv = document.createElement('div');
                sizeDiv.textContent = formatBytes(file.size);
                sizeDiv.style.color = 'var(--text-secondary)';
                sizeDiv.style.fontSize = '0.9rem';
                actionsDiv.appendChild(sizeDiv);
            }

            item.appendChild(nameDiv);
            item.appendChild(actionsDiv);
            fileListContainer.appendChild(item);
        });
    }

    function updateImageToPdfPreview() {
        const previewGrid = document.getElementById('image-to-pdf-preview');
        const orientation = document.getElementById('img-orientation').value;
        const pageSize = document.getElementById('img-pagesize').value;
        const margin = document.getElementById('img-margin').value;
        
        previewGrid.innerHTML = '';
        
        currentFiles.forEach(file => {
            const page = document.createElement('div');
            page.className = `preview-page ${orientation} margin-${margin}`;
            if (pageSize === 'fit') page.classList.add('fit');
            
            const img = document.createElement('img');
            img.src = URL.createObjectURL(file);
            img.className = 'preview-img';
            
            page.appendChild(img);
            previewGrid.appendChild(page);
        });
    }

    // Attach listeners to image options for live preview
    ['img-orientation', 'img-pagesize', 'img-margin'].forEach(id => {
        document.getElementById(id).addEventListener('change', updateImageToPdfPreview);
    });

    function moveFile(index, direction) {
        const newIndex = index + direction;
        if (newIndex >= 0 && newIndex < currentFiles.length) {
            const temp = currentFiles[index];
            currentFiles[index] = currentFiles[newIndex];
            currentFiles[newIndex] = temp;
            renderFileList();
        }
    }

    async function renderPdfThumbnails(file) {
        pageThumbnailsContainer.innerHTML = '<div class="loader" style="margin:20px auto;width:30px;height:30px;"><svg viewBox="25 25 50 50"><circle r="20" cy="50" cx="50"></circle></svg></div>';
        pageThumbnailsContainer.classList.remove('hidden');
        optionsDescription.textContent = 'Loading document preview...';
        selectedPages.clear();

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            pageThumbnailsContainer.innerHTML = '';
            optionsDescription.textContent = 'Click on the pages you want to select:';

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);

                // Use a smaller scale for thumbnails
                const viewport = page.getViewport({ scale: 0.3 });
                const canvas = document.createElement('canvas');
                canvas.className = 'thumbnail-canvas';
                const ctx = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: ctx,
                    viewport: viewport
                };
                await page.render(renderContext).promise;

                const wrapper = document.createElement('div');
                wrapper.className = 'thumbnail-wrapper';
                wrapper.dataset.page = pageNum;

                const label = document.createElement('div');
                label.className = 'thumbnail-label';
                label.textContent = `Page ${pageNum}`;

                wrapper.appendChild(canvas);
                wrapper.appendChild(label);

                wrapper.addEventListener('click', () => {
                    if (selectedPages.has(pageNum)) {
                        selectedPages.delete(pageNum);
                        wrapper.classList.remove('selected');
                    } else {
                        selectedPages.add(pageNum);
                        wrapper.classList.add('selected');
                    }
                });

                pageThumbnailsContainer.appendChild(wrapper);
            }
        } catch (err) {
            console.error('Error rendering thumbnails:', err);
            pageThumbnailsContainer.innerHTML = '<p style="color:var(--error-color)">Failed to render document preview.</p>';
            optionsDescription.textContent = 'Enter page numbers manually:';
            optionsInput.type = 'text'; // Fallback to text input
            optionsInput.classList.remove('hidden');
        }
    }

    async function submitConversion() {
        if (currentFiles.length === 0) return;

        const type = conversionTypeInput.value;
        const formData = new FormData();

        currentFiles.forEach(file => {
            formData.append('file', file);
        });

        if (type === 'remove-pages' || type === 'extract-pages') {
            // Priority: Visual Selection -> Text Input Fallback
            let opts = '';
            if (selectedPages.size > 0) {
                opts = Array.from(selectedPages).sort((a, b) => a - b).join(',');
            } else {
                opts = optionsInput.value.trim();
            }

            if (!opts) {
                alert('Please select at least one page.');
                switchState(optionsState);
                return;
            }
            formData.append('options', opts);
        } else if (type === 'image-to-pdf') {
            const orientation = document.getElementById('img-orientation').value;
            const pageSize = document.getElementById('img-pagesize').value;
            const margin = document.getElementById('img-margin').value;
            formData.append('options', JSON.stringify({ orientation, pageSize, margin }));
        }

        switchState(loadingState);

        try {
            const response = await fetch(`/api/convert/${type}`, {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Server returned an error');
            }

            history.pushState(null, '', `/${data.id}`);
            downloadBtn.href = data.downloadUrl || `/api/download/${data.id}`;
            downloadBtn.download = data.filename;

            switchState(successState);

        } catch (error) {
            console.error('Conversion Error:', error);
            errorMessage.textContent = 'Failed to process document. ' + error.message;
            switchState(errorState);
        }
    }

    proceedOptionsBtn.addEventListener('click', async () => {
        const type = conversionTypeInput.value;
        const imageOptions = document.getElementById('image-to-pdf-options');
        const imagePreviewContainer = document.getElementById('image-to-pdf-preview-container');

        // Reset option visibilities
        imageOptions.classList.add('hidden');
        imagePreviewContainer.classList.add('hidden');
        optionsInput.classList.add('hidden');
        pageThumbnailsContainer.classList.add('hidden');

        if (type === 'remove-pages' || type === 'extract-pages') {
            switchState(optionsState);
            optionsDescription.textContent = 'Select pages to process:';
            await renderPdfThumbnails(currentFiles[0]);
        } else if (type === 'image-to-pdf') {
            switchState(optionsState);
            optionsDescription.textContent = 'Configure PDF output:';
            imageOptions.classList.remove('hidden');
            imagePreviewContainer.classList.remove('hidden');
            updateImageToPdfPreview();
        } else {
            // For merge, split, or regular conversions, just submit
            submitConversion();
        }
    });

    // Form Submission
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitConversion();
    });

    // --- Mobile Menu ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const nav = document.querySelector('nav');

    mobileMenuBtn.addEventListener('click', () => {
        nav.classList.toggle('active');
        const icon = mobileMenuBtn.querySelector('i');
        if (nav.classList.contains('active')) {
            icon.classList.replace('fa-bars', 'fa-xmark');
        } else {
            icon.classList.replace('fa-xmark', 'fa-bars');
        }
    });

    // Close menu when clicking a link (mobile)
    nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('active');
            mobileMenuBtn.querySelector('i').classList.replace('fa-xmark', 'fa-bars');
        });
    });
});

