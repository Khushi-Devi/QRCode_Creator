# 📱 Static QR Code Generator

A clean, professional Flask-based web application for generating static QR codes. Create QR codes for URLs and plain text that work forever, even offline.

![QR Code Generator](https://img.shields.io/badge/Flask-3.0.0-blue)
![Python](https://img.shields.io/badge/Python-3.8+-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

### 🎯 Core Functionality
- **Dual Mode Operation**
  - **URL Mode**: Generate QR codes that open web links when scanned
  - **Text Mode**: Generate QR codes that display plain text when scanned

- **Static QR Codes**
  - Encode data directly into the QR code
  - No server dependency after generation
  - Works offline forever
  - No analytics, tracking, or redirects

### 🎨 User Interface
- **Clean, Professional Design**
  - Centered card layout with neutral color palette
  - Responsive design (works on desktop and mobile)
  - Smooth animations and transitions

- **Dark Mode Support**
  - Toggle between light and dark themes
  - Preference saved locally
  - Easy on the eyes for extended use

- **Interactive Features**
  - Live character counter
  - Real-time QR preview
  - Input validation with helpful error messages
  - Clear visual feedback

### 💾 Download Options
- **PNG Format**: Perfect for sharing, printing, or embedding in documents
- **SVG Format**: Scalable vector format ideal for professional use
- **Copy Content**: Quick clipboard copy of encoded text/URL

### 🔧 Technical Features
- ISO/IEC 18004 compliant QR codes
- Automatic version selection based on input length
- Medium error correction for reliability
- Character limits optimized for performance:
  - URLs: 2000 characters max
  - Text: 1200 characters max

---

## 📖 Understanding Static QR Codes

### What Are Static QR Codes?

Static QR codes **directly encode** the destination data (URL or text) into the QR image itself. This means:

✅ **Permanent**: Once created, they work forever  
✅ **Offline**: No internet connection needed to scan  
✅ **Private**: No tracking or analytics  
✅ **Independent**: Server shutdown doesn't affect functionality  

**Example:**
```
URL: https://example.com
Static QR → Encodes "https://example.com" directly
When scanned → Opens https://example.com immediately
```

### URL QR vs Text QR

| Feature | URL Mode | Text Mode |
|---------|----------|-----------|
| **Primary Use** | Website links, social media profiles | Messages, contact info, WiFi passwords |
| **Scanner Behavior** | Opens URL in browser | Displays text or prompts action |
| **Max Length** | 2000 characters | 1200 characters |
| **Format** | Must be valid URL (http/https) | Any plain text |

### Important Note on Text QR Scanning

> ⚠️ **Scanner App Behavior**: Some QR scanner apps (especially on smartphones) may prioritize **Google Lens image search** over text decoding when scanning text-based QR codes. This does **not** affect the validity of your QR code—it's simply how some scanner apps are configured.
>
> **Recommendation**: Use dedicated QR code scanner apps or built-in camera QR readers for best results with text QR codes.

---

## 🚀 Getting Started

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

1. **Clone or download this repository**
   ```bash
   cd qr-code-generator
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

   Or install manually:
   ```bash
   pip install Flask qrcode[pil] Pillow
   ```

### Running the Application

1. **Start the Flask server**
   ```bash
   python app.py
   ```

2. **Open your browser**
   ```
   http://127.0.0.1:5000
   ```

3. **Start generating QR codes!** 🎉

---

## 📁 Project Structure

```
qr-code-generator/
│
├── app.py                 # Flask backend server
├── requirements.txt       # Python dependencies
│
├── templates/
│   └── index.html        # Main HTML template
│
├── static/
│   ├── styles.css        # CSS styling (with dark mode)
│   └── script.js         # Frontend JavaScript logic
│
└── README.md             # This file
```

---

## 🎮 Usage Guide

### Generating a URL QR Code

1. Select **URL Mode** (default)
2. Enter a website URL (e.g., `google.com` or `https://example.com`)
   - The app automatically adds `https://` if missing
3. Click **Generate QR Code**
4. Preview your QR code
5. Download as PNG or SVG, or copy the URL

### Generating a Text QR Code

1. Switch to **Text Mode**
2. Enter any plain text (max 1200 characters)
   - Examples: messages, contact info, WiFi credentials
3. Click **Generate QR Code**
4. Preview your QR code
5. Download or copy the text

### Download Formats

- **PNG**: Raster image, perfect for most uses (300x300px default)
- **SVG**: Vector image, scalable without quality loss (ideal for printing large formats)

---

## ⚙️ Technical Details

### QR Code Specifications

- **Standard**: ISO/IEC 18004
- **Version**: Auto-selected (1-40) based on data length
- **Error Correction**: Medium (M) - ~15% damage tolerance
- **Module Size**: 10 pixels per module
- **Border**: 4 modules (quiet zone)

### Character Limits

These limits ensure optimal performance and scannability:

| Data Type | Max Characters | Reason |
|-----------|---------------|--------|
| URL | 2000 | Balances between long URLs and QR complexity |
| Text | 1200 | Optimal for UTF-8 encoded text |

**Note**: Longer data = larger QR code = potentially harder to scan. These limits strike a balance between functionality and usability.

### Browser Compatibility

✅ Chrome/Edge (v90+)  
✅ Firefox (v88+)  
✅ Safari (v14+)  
✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## 🛠️ Development

### Dependencies

```txt
Flask==3.0.0          # Web framework
qrcode[pil]==7.4.2    # QR code generation
Pillow==10.1.0        # Image processing
```

### API Endpoints

**POST** `/preview`
- Generates QR code preview (PNG)
- Request body: `{ "mode": "url|text", "content": "..." }`
- Returns: PNG image

**POST** `/generate`
- Downloads QR code in requested format
- Request body: `{ "mode": "url|text", "content": "...", "format": "png|svg" }`
- Returns: File download

### Key Functions

- `generate_qr_code(data, format_type)`: Creates QR code image
- `is_valid_url(url)`: Validates URL format
- Auto-version selection based on data length

---

## 🎨 Customization

### Modifying Character Limits

Edit `app.py`:
```python
MAX_TEXT_LENGTH = 1200  # Change text limit
MAX_URL_LENGTH = 2000   # Change URL limit
```

### Changing QR Code Settings

Modify the QR instance in `app.py`:
```python
qr = qrcode.QRCode(
    version=None,  # 1-40 or None for auto
    error_correction=qrcode.constants.ERROR_CORRECT_M,  # L, M, Q, H
    box_size=10,   # Pixels per module
    border=4,      # Quiet zone width
)
```

### Theming

Colors and styles are defined in `static/styles.css` using CSS variables:
```css
:root {
    --primary: #4f46e5;        /* Main brand color */
    --bg-primary: #f5f7fa;     /* Light mode background */
    /* ... */
}

[data-theme="dark"] {
    --bg-primary: #0f172a;     /* Dark mode background */
    /* ... */
}
```

---

## 🔒 Privacy & Security

- **No Data Storage**: QR codes are generated on-demand and not saved
- **No Analytics**: Zero tracking, cookies, or user data collection
- **Client-Side Theme**: Dark mode preference stored in browser localStorage only
- **Local Operation**: Runs entirely on your machine (localhost)

---

## 🐛 Troubleshooting

### QR Code Won't Scan
- Ensure proper lighting when scanning
- Hold phone steady and at appropriate distance
- Try a different QR scanner app
- Check if input exceeds character limits

### URL Not Opening
- Verify URL includes `http://` or `https://`
- Test URL in browser before generating QR
- Some special characters may cause issues

### Text QR Shows Search Instead of Text
- This is scanner app behavior, not a QR code issue
- Use dedicated QR readers instead of Google Lens
- The QR code still contains correct data

### Application Won't Start
```bash
# Check Python version
python --version  # Should be 3.8+

# Reinstall dependencies
pip install -r requirements.txt --upgrade

# Try running with explicit host/port
python app.py
```

---

## 📝 License

This project is open source and available under the MIT License.

---

## 🙏 Acknowledgments

- Built with [Flask](https://flask.palletsprojects.com/)
- QR generation powered by [python-qrcode](https://github.com/lincolnloop/python-qrcode)
- Icons inspired by [Heroicons](https://heroicons.com/)

---

## 📧 Support

If you encounter any issues or have questions:
1. Check the troubleshooting section above
2. Review the code comments in `app.py` and `script.js`
3. Open an issue on the project repository

---

**Made with ❤️ for quick, offline QR code generation**
