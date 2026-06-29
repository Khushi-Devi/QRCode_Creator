from flask import Flask, render_template, request, send_file, jsonify
import re
from io import BytesIO
from urllib.parse import quote
import base64
import os

# Try to import qrcode libraries
try:
    import qrcode
    import qrcode.image.svg
    from PIL import Image
    QR_LIBRARY = 'qrcode'
except ImportError:
    # Fallback: Create a minimal inline QR code generator
    QR_LIBRARY = 'inline'

    class SimpleQR:
        """Minimal QR code generator for demonstration"""

        @staticmethod
        def create_svg(data):
            size = 200
            svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 {size} {size}">
            <rect width="{size}" height="{size}" fill="white"/>
            <rect x="10" y="10" width="30" height="30" fill="black"/>
            <rect x="160" y="10" width="30" height="30" fill="black"/>
            <rect x="10" y="160" width="30" height="30" fill="black"/>
            <text x="50%" y="45%" text-anchor="middle" font-family="monospace" font-size="10" fill="black">
            QR Code Placeholder
            </text>
            <text x="50%" y="55%" text-anchor="middle" font-family="monospace" font-size="8" fill="gray">
            Install: pip install qrcode[pil]
            </text>
            <text x="50%" y="65%" text-anchor="middle" font-family="monospace" font-size="7" fill="gray">
            Data: {data[:30]}{'...' if len(data) > 30 else ''}
            </text>
            </svg>'''
            return svg.encode('utf-8')

        @staticmethod
        def create_png_from_svg(data):
            png_data = base64.b64decode(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
            )
            return BytesIO(png_data)

app = Flask(__name__)

# Character limits for QR code capacity
MAX_TEXT_LENGTH = 1200
MAX_URL_LENGTH = 2000

EMAIL_REGEX = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
PHONE_REGEX = re.compile(r'^\+?[0-9]{7,15}$')
WIFI_SECURITY_TYPES = {'WPA', 'WEP', 'nopass'}


def is_valid_url(url):
    """Basic URL validation"""
    url_pattern = re.compile(
        r'^https?://'
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'
        r'localhost|'
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'
        r'(?::\d+)?'
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
    return url_pattern.match(url) is not None


# ========================================
# Mode Builders
# Each builder takes a `fields` dict from the client and either returns the
# final string that gets encoded into the QR code, or raises ValueError with
# a user-facing message. This is the single source of truth for validation +
# formatting, used by both /preview and /generate so the rules never drift
# out of sync between the two routes.
# ========================================

def build_url(fields):
    value = (fields.get('value') or '').strip()
    if not value:
        raise ValueError('Please enter a URL')

    if not value.startswith(('http://', 'https://')):
        value = 'https://' + value

    if not is_valid_url(value):
        raise ValueError('Invalid URL format')

    if len(value) > MAX_URL_LENGTH:
        raise ValueError(f'URL too long (max {MAX_URL_LENGTH} characters)')

    return value


def build_text(fields):
    value = (fields.get('value') or '').strip()
    if not value:
        raise ValueError('Please enter some text')

    if len(value) > MAX_TEXT_LENGTH:
        raise ValueError(f'Text too long (max {MAX_TEXT_LENGTH} characters)')

    return value


def build_email(fields):
    address = (fields.get('address') or '').strip()
    subject = (fields.get('subject') or '').strip()
    body = (fields.get('body') or '').strip()

    if not address:
        raise ValueError('Please enter an email address')

    if not EMAIL_REGEX.match(address):
        raise ValueError('Invalid email address')

    query_parts = []
    if subject:
        query_parts.append(f'subject={quote(subject)}')
    if body:
        query_parts.append(f'body={quote(body)}')

    content = f'mailto:{address}'
    if query_parts:
        content += '?' + '&'.join(query_parts)

    if len(content) > MAX_URL_LENGTH:
        raise ValueError('Email content is too long')

    return content


def build_phone(fields):
    number = (fields.get('number') or '').strip()
    if not number:
        raise ValueError('Please enter a phone number')

    cleaned = re.sub(r'[\s\-\(\)]', '', number)

    if not PHONE_REGEX.match(cleaned):
        raise ValueError('Invalid phone number. Use digits only, optionally starting with +')

    return f'tel:{cleaned}'


def escape_wifi_value(value):
    """Escape characters that are reserved in the WIFI: QR payload spec."""
    return re.sub(r'([\\;,:"])', r'\\\1', value)


def build_wifi(fields):
    ssid = (fields.get('ssid') or '').strip()
    password = fields.get('password') or ''
    security = fields.get('security', 'WPA')
    hidden = bool(fields.get('hidden'))

    if not ssid:
        raise ValueError('Please enter a network name (SSID)')

    if len(ssid) > 32:
        raise ValueError('Network name is too long (max 32 characters)')

    if security not in WIFI_SECURITY_TYPES:
        raise ValueError('Invalid security type')

    if security != 'nopass' and not password:
        raise ValueError('Please enter a password, or set security to "No password"')

    if password and len(password) > 63:
        raise ValueError('Password is too long (max 63 characters)')

    ssid_escaped = escape_wifi_value(ssid)
    hidden_str = 'true' if hidden else 'false'

    if security == 'nopass':
        return f'WIFI:T:nopass;S:{ssid_escaped};H:{hidden_str};;'

    password_escaped = escape_wifi_value(password)
    return f'WIFI:T:{security};S:{ssid_escaped};P:{password_escaped};H:{hidden_str};;'


def build_sms(fields):
    number = (fields.get('number') or '').strip()
    body = (fields.get('body') or '').strip()

    if not number:
        raise ValueError('Please enter a phone number')

    cleaned = re.sub(r'[\s\-\(\)]', '', number)
    if not PHONE_REGEX.match(cleaned):
        raise ValueError('Invalid phone number. Use digits only, optionally starting with +')

    content = f'sms:{cleaned}'
    if body:
        if len(body) > 300:
            raise ValueError('Message is too long (max 300 characters)')
        content += f'?body={quote(body)}'

    return content


def build_location(fields):
    lat_raw = fields.get('latitude')
    lon_raw = fields.get('longitude')
    label = (fields.get('label') or '').strip()

    if lat_raw in (None, '') or lon_raw in (None, ''):
        raise ValueError('Please enter both latitude and longitude')

    try:
        lat = float(lat_raw)
        lon = float(lon_raw)
    except (TypeError, ValueError):
        raise ValueError('Latitude and longitude must be numbers')

    if not (-90 <= lat <= 90):
        raise ValueError('Latitude must be between -90 and 90')
    if not (-180 <= lon <= 180):
        raise ValueError('Longitude must be between -180 and 180')

    content = f'geo:{lat},{lon}'
    if label:
        if len(label) > 100:
            raise ValueError('Label is too long (max 100 characters)')
        content += f'?q={lat},{lon}({quote(label)})'

    return content


def escape_vcard_value(value):
    """Escape characters reserved in the vCard text format (RFC 6350)."""
    value = value.replace('\\', '\\\\')
    value = value.replace(';', '\\;')
    value = value.replace(',', '\\,')
    value = value.replace('\n', '\\n')
    return value


def build_vcard(fields):
    full_name = (fields.get('full_name') or '').strip()
    phone = (fields.get('phone') or '').strip()
    email = (fields.get('email') or '').strip()
    org = (fields.get('org') or '').strip()
    url = (fields.get('url') or '').strip()

    if not full_name:
        raise ValueError('Please enter a name')

    if not phone and not email:
        raise ValueError('Please enter a phone number or email address')

    cleaned_phone = ''
    if phone:
        cleaned_phone = re.sub(r'[\s\-\(\)]', '', phone)
        if not PHONE_REGEX.match(cleaned_phone):
            raise ValueError('Invalid phone number')

    if email and not EMAIL_REGEX.match(email):
        raise ValueError('Invalid email address')

    lines = ['BEGIN:VCARD', 'VERSION:3.0', f'FN:{escape_vcard_value(full_name)}', f'N:{escape_vcard_value(full_name)};;;']

    if cleaned_phone:
        lines.append(f'TEL:{cleaned_phone}')
    if email:
        lines.append(f'EMAIL:{escape_vcard_value(email)}')
    if org:
        lines.append(f'ORG:{escape_vcard_value(org)}')
    if url:
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        lines.append(f'URL:{escape_vcard_value(url)}')

    lines.append('END:VCARD')
    content = '\n'.join(lines)

    if len(content) > MAX_TEXT_LENGTH:
        raise ValueError('Contact card content is too long')

    return content


MODE_BUILDERS = {
    'url': build_url,
    'text': build_text,
    'email': build_email,
    'phone': build_phone,
    'wifi': build_wifi,
    'sms': build_sms,
    'location': build_location,
    'vcard': build_vcard,
}


def build_qr_content(mode, fields):
    """Single entry point used by every route that needs validated QR content."""
    builder = MODE_BUILDERS.get(mode)
    if not builder:
        raise ValueError('Invalid mode')
    return builder(fields)


# ========================================
# QR Rendering
# ========================================

def generate_qr_code_real(data, format_type='png'):
    """Generate QR code using qrcode library"""
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )

    qr.add_data(data)
    qr.make(fit=True)

    img_io = BytesIO()

    if format_type == 'svg':
        factory = qrcode.image.svg.SvgPathImage
        img = qr.make_image(image_factory=factory)
        img.save(img_io)
    else:
        img = qr.make_image(fill_color="black", back_color="white")
        img.save(img_io, 'PNG')

    img_io.seek(0)
    return img_io


def generate_qr_code_fallback(data, format_type='png'):
    """Fallback QR code generator (placeholder)"""
    svg_data = SimpleQR.create_svg(data)
    return BytesIO(svg_data)


def generate_qr_code(data, format_type='png'):
    """Generate QR code - uses available library"""
    if QR_LIBRARY == 'qrcode':
        return generate_qr_code_real(data, format_type)
    return generate_qr_code_fallback(data, format_type)


# ========================================
# Routes
# ========================================

@app.route('/')
def index():
    """Serve the main page"""
    return render_template('index.html', qr_library=QR_LIBRARY)


@app.route('/generate', methods=['POST'])
def generate():
    """Generate + download QR code endpoint"""
    try:
        data = request.json or {}
        mode = data.get('mode', 'url')
        fields = data.get('fields', {})
        format_type = data.get('format', 'png')

        try:
            content = build_qr_content(mode, fields)
        except ValueError as e:
            return jsonify({'error': str(e)}), 400

        # Fallback path only emits SVG (see generate_qr_code_fallback)
        actual_format = format_type if QR_LIBRARY == 'qrcode' else 'svg'
        qr_image = generate_qr_code(content, actual_format)
        mime_type = 'image/svg+xml' if actual_format == 'svg' else 'image/png'

        response = send_file(
            qr_image,
            mimetype=mime_type,
            as_attachment=True,
            download_name=f'qrcode.{actual_format}'
        )
        response.headers['X-Encoded-Content'] = quote(content)
        return response

    except Exception as e:
        print(f"Error in generate endpoint: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/preview', methods=['POST'])
def preview():
    """Generate QR code preview"""
    try:
        data = request.json or {}
        mode = data.get('mode', 'url')
        fields = data.get('fields', {})

        # Intentionally NOT logging `fields` here — for wifi mode it contains
        # a plaintext password, and for email/phone it's someone's contact
        # info. Logging just the mode is enough for debugging without writing
        # personal data into server logs that may persist long-term.
        print(f"Preview request - Mode: {mode}")

        try:
            content = build_qr_content(mode, fields)
        except ValueError as e:
            return jsonify({'error': str(e)}), 400

        actual_format = 'png' if QR_LIBRARY == 'qrcode' else 'svg'
        mime_type = 'image/png' if actual_format == 'png' else 'image/svg+xml'

        qr_image = generate_qr_code(content, actual_format)
        qr_content = qr_image.read()
        print(f"QR code size: {len(qr_content)} bytes")

        qr_image_final = BytesIO(qr_content)
        qr_image_final.seek(0)

        response = send_file(
            qr_image_final,
            mimetype=mime_type,
            as_attachment=False
        )
        # Let the frontend display/copy the *actual* encoded string (with
        # https:// prepended, mailto: built, WIFI: payload assembled, etc.)
        # rather than the raw text the user typed.
        response.headers['X-Encoded-Content'] = quote(content)
        return response

    except Exception as e:
        print(f"Error in preview endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/status')
def status():
    """Check QR library status"""
    return jsonify({
        'library': QR_LIBRARY,
        'message': 'QR code library loaded successfully' if QR_LIBRARY == 'qrcode' else 'Using fallback QR generator. Install qrcode and Pillow for full functionality.'
    })


if __name__ == '__main__':
    # This block only runs when you launch with `python app.py`. A production
    # WSGI server like gunicorn (gunicorn app:app) imports `app` directly and
    # never executes this at all, so debug mode here can't leak in
    # production as long as you deploy via gunicorn, not `python app.py`.
    # Default to debug OFF; opt in locally with: FLASK_DEBUG=1 python app.py
    debug_mode = os.environ.get('FLASK_DEBUG', '0') == '1'
    app.run(
        debug=debug_mode,
        host='0.0.0.0',
        port=int(os.environ.get('PORT', 5000))
    )