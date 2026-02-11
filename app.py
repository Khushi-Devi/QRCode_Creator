from flask import Flask, render_template, request, send_file, jsonify, Response
import re
from io import BytesIO
import base64

# Try to import qrcode libraries
try:
    import qrcode
    import qrcode.image.svg
    from PIL import Image
    QR_LIBRARY = 'qrcode'
except ImportError:
    # Fallback: Create a minimal inline QR code generator
    QR_LIBRARY = 'inline'
    
    # Simple QR Code implementation for basic functionality
    class SimpleQR:
        """Minimal QR code generator for demonstration"""
        
        @staticmethod
        def create_svg(data):
            """Create a simple SVG QR code representation"""
            # This is a placeholder - in production, use proper QR library
            size = 200
            
            # Create simple grid pattern (this is simplified - not a real QR)
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
            """Create a simple PNG placeholder"""
            # Since we don't have PIL, we'll return base64 encoded minimal PNG
            # This is a 1x1 transparent PNG - just a placeholder
            png_data = base64.b64decode(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
            )
            return BytesIO(png_data)

app = Flask(__name__)

# Character limits for QR code capacity
MAX_TEXT_LENGTH = 1200
MAX_URL_LENGTH = 2000


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
    if format_type == 'svg':
        svg_data = SimpleQR.create_svg(data)
        return BytesIO(svg_data)
    else:
        # Return SVG converted to response for PNG requests
        svg_data = SimpleQR.create_svg(data)
        return BytesIO(svg_data)


def generate_qr_code(data, format_type='png'):
    """Generate QR code - uses available library"""
    if QR_LIBRARY == 'qrcode':
        return generate_qr_code_real(data, format_type)
    else:
        return generate_qr_code_fallback(data, format_type)


@app.route('/')
def index():
    """Serve the main page"""
    return render_template('index.html', qr_library=QR_LIBRARY)


@app.route('/generate', methods=['POST'])
def generate():
    """Generate QR code endpoint"""
    try:
        data = request.json
        mode = data.get('mode', 'url')
        content = data.get('content', '').strip()
        format_type = data.get('format', 'png')
        
        if not content:
            return jsonify({'error': 'Content cannot be empty'}), 400
        
        if mode == 'url':
            if not content.startswith(('http://', 'https://')):
                content = 'https://' + content
            
            if not is_valid_url(content):
                return jsonify({'error': 'Invalid URL format'}), 400
            
            if len(content) > MAX_URL_LENGTH:
                return jsonify({'error': f'URL too long (max {MAX_URL_LENGTH} characters)'}), 400
        
        elif mode == 'text':
            if len(content) > MAX_TEXT_LENGTH:
                return jsonify({'error': f'Text too long (max {MAX_TEXT_LENGTH} characters)'}), 400
        
        else:
            return jsonify({'error': 'Invalid mode'}), 400
        
        qr_image = generate_qr_code(content, format_type)
        
        mime_type = 'image/svg+xml' if format_type == 'svg' else 'image/png'
        
        return send_file(
            qr_image,
            mimetype=mime_type,
            as_attachment=True,
            download_name=f'qrcode.{format_type}'
        )
    
    except Exception as e:
        print(f"Error in generate endpoint: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/preview', methods=['POST'])
def preview():
    """Generate QR code preview - FIXED VERSION"""
    try:
        data = request.json
        mode = data.get('mode', 'url')
        content = data.get('content', '').strip()
        
        print(f"Preview request - Mode: {mode}, Content: {content[:50]}...")
        
        if not content:
            return jsonify({'error': 'Content cannot be empty'}), 400
        
        if mode == 'url':
            if not content.startswith(('http://', 'https://')):
                content = 'https://' + content
            
            if not is_valid_url(content):
                return jsonify({'error': 'Invalid URL format'}), 400
            
            if len(content) > MAX_URL_LENGTH:
                return jsonify({'error': f'URL too long (max {MAX_URL_LENGTH} characters)'}), 400
        
        elif mode == 'text':
            if len(content) > MAX_TEXT_LENGTH:
                return jsonify({'error': f'Text too long (max {MAX_TEXT_LENGTH} characters)'}), 400
        
        # Generate QR code
        if QR_LIBRARY == 'qrcode':
            print("Using qrcode library")
            qr_image = generate_qr_code(content, 'png')
            mime_type = 'image/png'
        else:
            print("Using fallback - returning SVG")
            # For fallback, return SVG instead of PNG
            qr_image = generate_qr_code(content, 'svg')
            mime_type = 'image/svg+xml'
        
        print(f"Sending response with MIME type: {mime_type}")
        
        # Read the content to check size
        qr_content = qr_image.read()
        print(f"QR code size: {len(qr_content)} bytes")
        
        # Create a new BytesIO with the content
        qr_image_final = BytesIO(qr_content)
        qr_image_final.seek(0)
        
        return send_file(
            qr_image_final,
            mimetype=mime_type,
            as_attachment=False
        )
    
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
    print(f"\n{'='*60}")
    print(f"  🚀 Static QR Code Generator")
    print(f"{'='*60}")
    print(f"  QR Library: {QR_LIBRARY}")
    if QR_LIBRARY == 'inline':
        print(f"  ⚠️  Note: Using fallback QR generator (SVG placeholders)")
        print(f"  💡 Tip: Install 'qrcode' and 'Pillow' for real QR codes:")
        print(f"      pip install qrcode[pil] Pillow")
    print(f"{'='*60}")
    print(f"  🌐 Server running at: http://127.0.0.1:5000")
    print(f"  📱 Open in your browser to start generating QR codes")
    print(f"{'='*60}\n")
    
    app.run(debug=True, host='127.0.0.1', port=5000)