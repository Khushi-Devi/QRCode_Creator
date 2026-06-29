// ========================================
// State
// ========================================
let currentMode = null;
let currentContent = '';
let lastMode = null;
let lastFields = null;

const VALID_MODES = ['url', 'text', 'email', 'phone', 'sms', 'wifi', 'location', 'vcard'];

const MODE_INPUT_IDS = {
    url: 'urlInput',
    text: 'textInput',
    email: 'emailInput',
    phone: 'phoneInput',
    sms: 'smsInput',
    wifi: 'wifiInput',
    location: 'locationInput',
    vcard: 'vcardInput'
};

const MODE_META = {
    url:      { title: 'URL QR code',          subtitle: 'Enter a link. Scanning it opens the page directly.' },
    text:     { title: 'Text QR code',         subtitle: 'Enter any message. Scanning it just displays the text.' },
    email:    { title: 'Email QR code',        subtitle: 'Scanning opens a pre-filled draft in the scanner\u2019s email app.' },
    phone:    { title: 'Phone QR code',        subtitle: 'Scanning dials the number directly.' },
    sms:      { title: 'SMS QR code',          subtitle: 'Scanning opens a pre-filled text message.' },
    wifi:     { title: 'WiFi QR code',         subtitle: 'Scanning joins the network instantly, no typing.' },
    location: { title: 'Location QR code',     subtitle: 'Scanning opens the coordinate in the scanner\u2019s map app.' },
    vcard:    { title: 'Contact Card QR code', subtitle: 'Scanning offers to save these details straight to Contacts.' }
};

// ========================================
// DOM Elements
// ========================================
const elements = {
    themeToggle: document.getElementById('themeToggle'),
    brandHome: document.getElementById('brandHome'),
    backBtn: document.getElementById('backBtn'),

    landingView: document.getElementById('landingView'),
    generatorView: document.getElementById('generatorView'),
    typeCards: document.querySelectorAll('.type-card'),

    generatorStage: document.getElementById('generatorStage'),
    generatorTitle: document.getElementById('generatorTitle'),
    generatorSubtitle: document.getElementById('generatorSubtitle'),

    urlField: document.getElementById('urlField'),
    textField: document.getElementById('textField'),
    urlCounter: document.getElementById('urlCounter'),
    textCounter: document.getElementById('textCounter'),

    emailAddress: document.getElementById('emailAddress'),
    emailSubject: document.getElementById('emailSubject'),
    emailBody: document.getElementById('emailBody'),

    phoneNumber: document.getElementById('phoneNumber'),

    smsNumber: document.getElementById('smsNumber'),
    smsBody: document.getElementById('smsBody'),

    wifiSsid: document.getElementById('wifiSsid'),
    wifiPassword: document.getElementById('wifiPassword'),
    wifiSecurity: document.getElementById('wifiSecurity'),
    wifiHidden: document.getElementById('wifiHidden'),
    wifiPasswordField: document.getElementById('wifiPasswordField'),

    locLat: document.getElementById('locLat'),
    locLon: document.getElementById('locLon'),
    locLabel: document.getElementById('locLabel'),
    useMyLocationBtn: document.getElementById('useMyLocationBtn'),

    vcardName: document.getElementById('vcardName'),
    vcardPhone: document.getElementById('vcardPhone'),
    vcardEmail: document.getElementById('vcardEmail'),
    vcardOrg: document.getElementById('vcardOrg'),
    vcardUrl: document.getElementById('vcardUrl'),

    generateBtn: document.getElementById('generateBtn'),
    errorMessage: document.getElementById('errorMessage'),
    resultDetails: document.getElementById('resultDetails'),
    resultPane: document.getElementById('resultPane'),
    qrImage: document.getElementById('qrImage'),
    encodedContent: document.getElementById('encodedContent'),
    clearBtn: document.getElementById('clearBtn'),
    downloadPNG: document.getElementById('downloadPNG'),
    downloadSVG: document.getElementById('downloadSVG'),
    copyBtn: document.getElementById('copyBtn')
};

// ========================================
// Theme
// ========================================
function initTheme() {
    let savedTheme = 'dark';
    try {
        savedTheme = localStorage.getItem('theme') || 'dark';
    } catch (e) {
        // Some browsers (strict privacy modes, certain webviews) block
        // localStorage entirely. Falling back to the default theme rather
        // than letting this throw and halt the rest of app init.
    }
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try {
        localStorage.setItem('theme', next);
    } catch (e) {
        // Theme just won't persist across visits in this case — not worth
        // breaking the toggle itself over.
    }
}

// ========================================
// View Routing (hash-based: #wifi, #email, etc.)
// ========================================
function syncFromHash() {
    const mode = window.location.hash.replace('#', '');
    if (VALID_MODES.includes(mode)) {
        showGenerator(mode);
    } else {
        showLanding();
    }
}

function showLanding() {
    elements.landingView.classList.remove('hidden');
    elements.generatorView.classList.add('hidden');
    currentMode = null;
}

function showGenerator(mode) {
    currentMode = mode;
    elements.landingView.classList.add('hidden');
    elements.generatorView.classList.remove('hidden');

    const meta = MODE_META[mode];
    elements.generatorTitle.textContent = meta.title;
    elements.generatorSubtitle.textContent = meta.subtitle;

    Object.entries(MODE_INPUT_IDS).forEach(([m, id]) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('hidden', m !== mode);
    });

    resetResult();
    hideError();
    window.scrollTo(0, 0);
}

function goTo(mode) {
    window.location.hash = mode;
}

function goHome() {
    if (window.location.hash) {
        window.location.hash = '';
    } else {
        showLanding();
    }
}

// ========================================
// Error Handling
// ========================================
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}

// ========================================
// Result State
// ========================================
function resetResult() {
    elements.resultDetails.classList.add('hidden');
    elements.resultPane.classList.add('hidden');
    elements.generatorStage.classList.remove('has-result');
    currentContent = '';
    lastMode = null;
    lastFields = null;
}

// ========================================
// Field Collection Per Mode
// ========================================
function getFieldsForMode(mode) {
    switch (mode) {
        case 'url':
            return { value: elements.urlField.value.trim() };
        case 'text':
            return { value: elements.textField.value.trim() };
        case 'email':
            return {
                address: elements.emailAddress.value.trim(),
                subject: elements.emailSubject.value.trim(),
                body: elements.emailBody.value.trim()
            };
        case 'phone':
            return { number: elements.phoneNumber.value.trim() };
        case 'sms':
            return {
                number: elements.smsNumber.value.trim(),
                body: elements.smsBody.value.trim()
            };
        case 'wifi':
            return {
                ssid: elements.wifiSsid.value.trim(),
                password: elements.wifiPassword.value,
                security: elements.wifiSecurity.value,
                hidden: elements.wifiHidden.checked
            };
        case 'location':
            return {
                latitude: elements.locLat.value.trim(),
                longitude: elements.locLon.value.trim(),
                label: elements.locLabel.value.trim()
            };
        case 'vcard':
            return {
                full_name: elements.vcardName.value.trim(),
                phone: elements.vcardPhone.value.trim(),
                email: elements.vcardEmail.value.trim(),
                org: elements.vcardOrg.value.trim(),
                url: elements.vcardUrl.value.trim()
            };
        default:
            return {};
    }
}

function hasRequiredFields(mode, fields) {
    switch (mode) {
        case 'url': return !!fields.value;
        case 'text': return !!fields.value;
        case 'email': return !!fields.address;
        case 'phone': return !!fields.number;
        case 'sms': return !!fields.number;
        case 'wifi': return !!fields.ssid && (fields.security === 'nopass' || !!fields.password);
        case 'location': return !!fields.latitude && !!fields.longitude;
        case 'vcard': return !!fields.full_name && (!!fields.phone || !!fields.email);
        default: return false;
    }
}

function getRequiredFieldsMessage(mode) {
    const messages = {
        url: 'Please enter a URL',
        text: 'Please enter some text',
        email: 'Please enter an email address',
        phone: 'Please enter a phone number',
        sms: 'Please enter a phone number',
        wifi: 'Please enter a network name and password',
        location: 'Please enter both latitude and longitude',
        vcard: 'Please enter a name and a phone number or email'
    };
    return messages[mode] || 'Please fill in the required fields';
}

// ========================================
// QR Code Generation
// ========================================
async function generateQRCode() {
    hideError();

    const fields = getFieldsForMode(currentMode);

    if (!hasRequiredFields(currentMode, fields)) {
        showError(getRequiredFieldsMessage(currentMode));
        return;
    }

    elements.generateBtn.disabled = true;
    elements.generateBtn.textContent = 'Generating...';

    try {
        const response = await fetch('/preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: currentMode, fields: fields })
        });

        if (!response.ok) {
            let errorMessage = 'Failed to generate QR code';
            try {
                const error = await response.json();
                errorMessage = error.error || errorMessage;
            } catch (e) {}
            throw new Error(errorMessage);
        }

        const encodedHeader = response.headers.get('X-Encoded-Content');
        const displayContent = encodedHeader ? decodeURIComponent(encodedHeader) : '';

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        elements.qrImage.src = imageUrl;

        elements.encodedContent.textContent = displayContent;
        elements.resultDetails.classList.remove('hidden');
        elements.resultPane.classList.remove('hidden');
        elements.generatorStage.classList.add('has-result');

        currentContent = displayContent;
        lastMode = currentMode;
        lastFields = fields;

    } catch (error) {
        showError(error.message);
    } finally {
        elements.generateBtn.disabled = false;
        elements.generateBtn.textContent = 'Generate QR Code';
    }
}

// ========================================
// Download
// ========================================
async function downloadQR(format) {
    if (!lastFields || !lastMode) return;

    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: lastMode, fields: lastFields, format: format })
        });

        if (!response.ok) throw new Error('Download failed');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qrcode.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (error) {
        showError('Failed to download QR code');
    }
}

// ========================================
// Copy
// ========================================
async function copyToClipboard() {
    if (!currentContent) return;
    try {
        await navigator.clipboard.writeText(currentContent);
        const original = elements.copyBtn.textContent;
        elements.copyBtn.textContent = 'Copied!';
        setTimeout(() => { elements.copyBtn.textContent = original; }, 1800);
    } catch (error) {
        showError('Failed to copy to clipboard');
    }
}

// ========================================
// Geolocation (Location mode)
// ========================================
function useMyLocation() {
    if (!navigator.geolocation) {
        showError('Your browser does not support geolocation');
        return;
    }

    elements.useMyLocationBtn.textContent = 'Locating...';

    navigator.geolocation.getCurrentPosition(
        (position) => {
            elements.locLat.value = position.coords.latitude.toFixed(6);
            elements.locLon.value = position.coords.longitude.toFixed(6);
            elements.useMyLocationBtn.textContent = 'Use my current location';
        },
        (error) => {
            elements.useMyLocationBtn.textContent = 'Use my current location';
            showError('Could not get your location. You can also type coordinates in manually.');
        }
    );
}

// ========================================
// Start Over (stay in same generator, clear fields + result)
// ========================================
function startOver() {
    const allInputs = document.querySelectorAll('.input-section input[type="text"], .input-section textarea');
    allInputs.forEach(el => { el.value = ''; });
    elements.wifiSecurity.value = 'WPA';
    elements.wifiHidden.checked = false;
    elements.wifiPasswordField.classList.remove('hidden');
    elements.urlCounter.textContent = '0';
    elements.textCounter.textContent = '0';
    resetResult();
    hideError();
}

// ========================================
// Event Listeners
// ========================================
function initEventListeners() {
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.brandHome.addEventListener('click', goHome);
    elements.backBtn.addEventListener('click', goHome);

    elements.typeCards.forEach(card => {
        card.addEventListener('click', () => goTo(card.dataset.mode));
    });

    elements.urlField.addEventListener('input', (e) => {
        elements.urlCounter.textContent = e.target.value.length;
    });

    elements.textField.addEventListener('input', (e) => {
        elements.textCounter.textContent = e.target.value.length;
    });

    elements.wifiSecurity.addEventListener('change', (e) => {
        elements.wifiPasswordField.classList.toggle('hidden', e.target.value === 'nopass');
    });

    elements.useMyLocationBtn.addEventListener('click', useMyLocation);

    elements.generateBtn.addEventListener('click', generateQRCode);
    elements.clearBtn.addEventListener('click', startOver);

    elements.downloadPNG.addEventListener('click', () => downloadQR('png'));
    elements.downloadSVG.addEventListener('click', () => downloadQR('svg'));
    elements.copyBtn.addEventListener('click', copyToClipboard);

    window.addEventListener('hashchange', syncFromHash);
}

// ========================================
// Init
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initEventListeners();
    syncFromHash();
});