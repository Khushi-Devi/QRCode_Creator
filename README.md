# 📱 QR Hub

A Flask-based web application for generating QR codes for 8 different real-world use cases — URLs, plain text, email drafts, phone numbers, SMS messages, WiFi networks, map locations, and contact cards. Every QR code is generated on demand and never stored.

![Flask](https://img.shields.io/badge/Flask-3.1-blue)
![Python](https://img.shields.io/badge/Python-3.8+-green)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

### 🎯 Core Functionality — 8 QR Types

| Type | What scanning it does | Format used |
|---|---|---|
| **URL** | Opens a website | Raw URL (`https://...`) |
| **Text** | Displays a plain message | Raw text |
| **Email** | Opens a pre-filled email draft | `mailto:` |
| **Phone** | Dials a number directly | `tel:` |
| **SMS** | Opens a pre-filled text message | `sms:` |
| **WiFi** | Joins a network instantly, no typing | `WIFI:` |
| **Location** | Opens a map coordinate | `geo:` |
| **Contact Card** | Saves a full contact (name, phone, email, org) straight to Contacts | `vCard` 3.0 |

Each type uses the actual standard format real phones already recognize — these are the same schemes used by `mailto:` links on websites, native "Add to Contacts" prompts, and built-in WiFi QR sharing on Android/iOS. Nothing here is a custom or proprietary format.

### 🔐 Static, Not Dynamic

QR Hub generates **static** QR codes — the destination data is encoded directly into the QR image itself, not a redirect link through a third-party service. This means:

✅ **Permanent** — once created, a code works forever, with no dependency on QR Hub staying online
✅ **Offline** — no internet connection needed to scan or decode
✅ **Private** — no tracking, analytics, or redirect logging of any kind
✅ **Independent** — taking the server down doesn't break any code you've already generated

**Example:**
```
Input:  example.com  (WiFi mode would instead take SSID + password)
Static QR → Encodes "https://example.com" directly into the QR pixels
Scan it  → Opens https://example.com immediately, no middleman server involved
```

### 🎨 User Interface

- Landing grid of all 8 QR types, each with its own illustrated card
- Light and dark themes, toggle persists across visits (`localStorage`)
- Dedicated generator screen per type, with the relevant fields only
- Live QR preview before downloading — generate, look, adjust, regenerate
- Split-screen result view (your details on the left, QR code on the right) once a code is generated
- Inline validation with specific error messages (e.g. *"Network name is too long (max 32 characters)"*, not a generic "invalid input")

### 💾 Download Options

- **PNG** — raster image, good for sharing, printing, or embedding in documents
- **SVG** — scalable vector format, no quality loss at any print size
- **Copy** — one-click clipboard copy of the exact encoded string

---

## 🚀 Getting Started

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Installation

```bash
cd qr-hub
pip install -r requirements.txt
```

Or install manually:
```bash
pip install Flask qrcode[pil] Pillow gunicorn
```

### Running the Application

```bash
python app.py
```

Then visit `http://127.0.0.1:5000` 🎉

By default, debug mode is **off**. To enable it for local development:
```bash
FLASK_DEBUG=1 python app.py
```

---

## 📁 Project Structure

```
qr-hub/
│
├── app.py                 # Flask backend — all 8 mode builders, validation, routes
├── requirements.txt       # Python dependencies
├── README.md              # This file
│
├── templates/
│   └── index.html         # Landing grid + generator view (single page)
│
└── static/
    ├── styles.css          # Light/dark theme, card grid, animations
    └── script.js           # View routing, form handling, fetch calls
```

---

## 🎮 Usage Guide

1. Pick a QR type from the landing grid (e.g. **WiFi**)
2. Fill in the relevant fields — only the fields that type needs are shown
3. Click **Generate QR Code** to preview it
4. Download as **PNG** or **SVG**, or **Copy** the exact encoded content
5. Click the logo or **← All QR types** to go back and pick a different type

### WiFi-specific note

Choose a security type (WPA/WPA2, WEP, or "No password"). If your network name or password contains `;`, `,`, `:`, or `\`, QR Hub automatically escapes those characters — you don't need to do anything special, but it's worth knowing they're handled, since unescaped versions of those characters would otherwise break the QR payload.

### Contact Card-specific note

Name is required, plus **either** a phone number **or** an email (you don't need both). Organization and website are optional. This produces a real vCard 3.0 file — the same format your phone already uses internally for every contact — so most phones will offer "Add to Contacts" directly rather than just showing raw text.

---

## ⚙️ Technical Details

### QR Code Specifications

- **Standard**: ISO/IEC 18004 (via the `qrcode` Python library)
- **Version**: Auto-selected based on data length
- **Error Correction**: Medium (M) — roughly 15% damage tolerance before a scan fails
- **Module size**: 10 pixels per module, 4-module quiet zone border

### Field Limits & Validation

| Field | Limit / Rule |
|---|---|
| URL | 2000 characters; `https://` auto-added if missing |
| Text | 1200 characters |
| Email subject/body | 200 / 500 characters (both optional) |
| Phone number | Digits only, optional leading `+`, 7–15 digits |
| SMS message | 300 characters (optional) |
| WiFi SSID | 32 characters max (matches the real WiFi spec limit) |
| WiFi password | 63 characters max (matches the real WPA spec limit) |
| Location | Latitude −90 to 90, longitude −180 to 180 |
| Contact Card | Name required; phone *or* email required; org/website optional |

These aren't arbitrary — several match the actual technical limits of the standards involved (e.g. WiFi SSID/password lengths are capped by the WiFi spec itself, not chosen by this app).

### API Endpoints

**POST** `/preview`
Generates a QR code for inline preview.
Request body: `{ "mode": "wifi", "fields": { "ssid": "...", "password": "...", "security": "WPA" } }`
Returns: PNG (or SVG, if the `qrcode` library isn't available) with an `X-Encoded-Content` header containing the exact string that was encoded.

**POST** `/generate`
Same validation as `/preview`, but forces a file download.
Request body: same shape as above, plus `"format": "png"` or `"svg"`.
Returns: file download.

**GET** `/status`
Returns which QR rendering library is active, useful for debugging deployment issues.

### Key Functions (`app.py`)

- `build_qr_content(mode, fields)` — single entry point; looks up the right builder in `MODE_BUILDERS` and returns the validated, formatted string
- `build_wifi()` / `escape_wifi_value()` — WiFi payload construction and special-character escaping
- `build_vcard()` / `escape_vcard_value()` — vCard 3.0 construction and escaping
- `generate_qr_code(data, format_type)` — renders the final string into a PNG or SVG image

---

## 🎨 Customization

### Adjusting limits

Edit the constants near the top of `app.py`:
```python
MAX_TEXT_LENGTH = 1200
MAX_URL_LENGTH = 2000
```
Per-field limits for newer modes (WiFi, SMS, vCard, etc.) are inline in their respective `build_*` functions rather than top-level constants — search for the relevant `raise ValueError(...)` line to find and adjust them.

### Changing QR rendering settings

In `generate_qr_code_real()`:
```python
qr = qrcode.QRCode(
    version=None,                                   # 1-40, or None for auto
    error_correction=qrcode.constants.ERROR_CORRECT_M,  # L, M, Q, or H
    box_size=10,                                     # pixels per module
    border=4,                                        # quiet zone width
)
```

### Theming

Both themes are CSS custom properties in `static/styles.css`:
```css
:root {
    --primary: #7b93d6;
    --bg: linear-gradient(135deg, #eef3ff 0%, #e4edfc 55%, #f7eefc 100%);
    /* ... */
}

[data-theme="dark"] {
    --bg: linear-gradient(135deg, #1c1c1f 0%, #202023 100%);
    /* ... */
}
```
Adding a 9th QR type involves four small additions, not a rewrite: one `build_*` function and one `MODE_BUILDERS` entry in `app.py`; one card + one input group in `index.html`; one `MODE_META` / `MODE_INPUT_IDS` entry in `script.js`.

---

## 🔒 Privacy & Security

- **No data storage** — every QR code is generated in memory and streamed back; nothing is written to disk or a database
- **No analytics or tracking** — zero cookies, zero third-party scripts
- **Client-side theme only** — light/dark preference lives in the browser's `localStorage`, never sent to the server
- **Debug mode is off by default** — only enabled explicitly via `FLASK_DEBUG=1`, and never active at all when run through a production server like gunicorn
- **No sensitive data in logs** — request logging intentionally avoids printing raw form fields, since WiFi passwords and contact details pass through this endpoint

---

## 🐛 Troubleshooting

### QR code won't scan
- Make sure there's good, even lighting and the camera isn't too close or too far
- Try a dedicated QR scanner app if your default camera app seems unreliable
- Check that your input wasn't silently truncated by a character limit

### WiFi QR doesn't connect
- Double-check the security type matches your actual network (WPA/WPA2 is most common; pick "No password" only for genuinely open networks)
- SSID and password are case-sensitive — exact match required

### Contact Card doesn't offer "Add to Contacts"
- Some less common QR scanner apps only show raw text instead of recognizing vCard data — try your phone's built-in camera app instead of a third-party scanner
- Make sure at least a phone number or email was provided; a name alone isn't enough to generate a valid card

### Application won't start
```bash
python --version          # should be 3.8+
pip install -r requirements.txt --upgrade
python app.py
```

### "Failed to fetch" in the browser
This usually means the browser is talking to a stale cached version of the page or an old server process that's still running, rather than a real backend error. Fully stop the server (Ctrl+C, not just closing the tab), restart it, and hard-refresh the browser (Ctrl/Cmd+Shift+R) before assuming it's a code bug.

---

## ☁️ Deploying

Designed to deploy easily on free-tier hosts like Render:
- **Build command:** `pip install -r requirements.txt`
- **Start command:** `gunicorn app:app`

HTTPS is handled automatically by the host — no certificate setup required. Note that free tiers typically spin down after a period of inactivity, causing a slow (~60s) first load after idle time.

---

## 📝 License

This project is open source and available under the MIT License.

---

## 🙏 Acknowledgments

- Built with [Flask](https://flask.palletsprojects.com/)
- QR generation powered by [python-qrcode](https://github.com/lincolnloop/python-qrcode)

---

**Made for fast, offline-friendly QR code generation — no tracking, no accounts, nothing stored.**