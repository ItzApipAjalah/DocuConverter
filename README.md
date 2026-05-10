# DocuConvert

[English](#english) | [Bahasa Indonesia](#bahasa-indonesia)

---

<a name="english"></a>
## English Version

**DocuConvert** is a powerful, modern, and secure multi-format document conversion suite. It provides a clean Glassmorphism interface for users and a robust RESTful API for developers.

### Key Features
- **All-in-One Converter**: Convert between PDF, Word, Excel, PowerPoint, and Jupyter Notebooks (`.ipynb`).
- **Advanced PDF Tools**:
  - **Merge PDF**: Combine multiple PDFs into one.
  - **Split PDF**: Separate pages into individual files.
  - **Remove Pages**: Visually select and delete specific pages.
  - **Extract Pages**: Choose specific pages to create a new PDF.
- **Image to PDF Pro**:
  - Convert multiple JPG/PNG images.
  - **Visual Reordering**: Drag and drop or use arrows to set page order.
  - **Live Preview**: See how your PDF will look (Orientation, Page Size, Margin) before processing.
- **Modern UI/UX**: Sleek Glassmorphism design with responsive support for mobile devices.
- **Developer API**: Fully documented REST API (OpenAPI/Swagger) for seamless integration.

### Tech Stack
- **Backend**: Node.js, Express 5
- **Document Processing**: `pdf-lib`, LibreOffice (Headless), `pdf-to-excel`
- **Frontend**: Vanilla HTML5, CSS3 (Glassmorphism), JavaScript
- **Libraries**: `pdf.js` (for visual selection), `puppeteer` & `ipynb2html` (for notebook conversion)

### Installation
1. **Prerequisites**:
   - Install [Node.js](https://nodejs.org/)
   - Install [LibreOffice](https://www.libreoffice.org/) (Ensure it's in your system PATH or update the path in `src/services/convertService.js`).
2. **Clone the repo**:
   ```bash
   git clone https://github.com/ItzApipAjalah/DocuConverter.git
   cd DocuConverter
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Run the server**:
   ```bash
   npm start
   ```
   Open `http://localhost:3000` in your browser.

---

<a name="bahasa-indonesia"></a>
## Versi Bahasa Indonesia

**DocuConvert** adalah aplikasi konversi dokumen multi-format yang kuat, modern, dan aman. Menyediakan antarmuka Glassmorphism yang bersih untuk pengguna dan API RESTful yang handal untuk pengembang.

### Fitur Utama
- **Konverter All-in-One**: Konversi antara PDF, Word, Excel, PowerPoint, dan Jupyter Notebooks (`.ipynb`).
- **Alat PDF Lanjutan**:
  - **Merge PDF**: Menggabungkan beberapa PDF menjadi satu.
  - **Split PDF**: Memisahkan setiap halaman menjadi file individu.
  - **Remove Pages**: Pilih secara visual dan hapus halaman tertentu.
  - **Extract Pages**: Pilih halaman tertentu untuk membuat PDF baru.
- **Image to PDF Pro**:
  - Konversi banyak gambar JPG/PNG sekaligus.
  - **Visual Reordering**: Tarik dan lepas (Drag & drop) untuk mengatur urutan halaman.
  - **Live Preview**: Lihat tampilan PDF Anda (Orientasi, Ukuran Halaman, Margin) secara langsung sebelum diproses.
- **UI/UX Modern**: Desain Glassmorphism yang elegan dengan dukungan responsif untuk perangkat seluler.
- **API Pengembang**: Dokumentasi API REST lengkap (OpenAPI/Swagger) untuk integrasi yang mudah.

### Teknologi yang Digunakan
- **Backend**: Node.js, Express 5
- **Pemrosesan Dokumen**: `pdf-lib`, LibreOffice (Headless), `pdf-to-excel`
- **Frontend**: HTML5, CSS3 (Glassmorphism), JavaScript
- **Library**: `pdf.js` (untuk pemilihan visual), `puppeteer` & `ipynb2html` (untuk konversi notebook)

### Instalasi
1. **Prasyarat**:
   - Instal [Node.js](https://nodejs.org/)
   - Instal [LibreOffice](https://www.libreoffice.org/) (Pastikan ada di PATH sistem atau perbarui jalur di `src/services/convertService.js`).
2. **Clone repositori**:
   ```bash
   git clone https://github.com/ItzApipAjalah/DocuConverter.git
   cd DocuConverter
   ```
3. **Instal dependensi**:
   ```bash
   npm install
   ```
4. **Jalankan server**:
   ```bash
   npm start
   ```
   Buka `http://localhost:3000` di browser Anda.

---

### License
Built with love by [AMWP](https://github.com/ItzApipAjalah). Distributed under the MIT License.
