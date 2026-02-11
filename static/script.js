// ========================================
// State Management
// ========================================
let currentMode = 'url';
let currentContent = '';

// ========================================
// DOM Elements
// ========================================
const elements = {
    themeToggle: document.getElementById('themeToggle'),
    modeButtons: document.querySelectorAll('.mode-btn'),
    urlInput: document.getElementById('urlInput'),
    textInput: document.getElementById('textInput'),
    urlField: document.getElementById('urlField'),
    textField: document.getElementById('textField'),
    urlCounter: document.getElementById('urlCounter'),
    textCounter: document.getElementById('textCounter'),
    generateBtn: document.getElementById('generateBtn'),
    errorMessage: document.getElementById('errorMessage'),
    qrPreview: document.getElementById('qrPreview'),
    qrImage: document.getElementById('qrImage'),
    encodedContent: document.getElementById('encodedContent'),
    clearBtn: document.getElementById('clearBtn'),
    downloadPNG: document.getElementById('downloadPNG'),
    downloadSVG: document.getElementById('downloadSVG'),
    copyBtn: document.getElementById('copyBtn')
};

console.log('Script loaded successfully');
console.log('Elements:', elements);

// ========================================
// Theme Management
// ========================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    console.log('Theme initialized:', savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    console.log('Theme toggled to:', newTheme);
}

// ========================================
// Mode Switching
// ========================================
function switchMode(mode) {
    console.log('Switching mode to:', mode);
    currentMode = mode;
    
    // Update button states
    elements.modeButtons.forEach(btn => {
        if (btn.dataset.mode === mode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Toggle input visibility
    if (mode === 'url') {
        elements.urlInput.classList.remove('hidden');
        elements.textInput.classList.add('hidden');
    } else {
        elements.urlInput.classList.add('hidden');
        elements.textInput.classList.remove('hidden');
    }
    
    // Clear error
    hideError();
}

// ========================================
// Character Counter
// ========================================
function updateCharCounter(field, counter, current, max) {
    counter.textContent = current;
    
    // Color code based on usage
    if (current > max * 0.9) {
        counter.style.color = 'var(--error)';
    } else if (current > max * 0.75) {
        counter.style.color = 'var(--text-secondary)';
    } else {
        counter.style.color = 'var(--text-secondary)';
    }
}

// ========================================
// Error Handling
// ========================================
function showError(message) {
    console.error('Error:', message);
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}

// ========================================
// QR Code Generation
// ========================================
async function generateQRCode() {
    console.log('Generate QR Code button clicked');
    hideError();
    
    // Get content based on mode
    const content = currentMode === 'url' 
        ? elements.urlField.value.trim() 
        : elements.textField.value.trim();
    
    console.log('Current mode:', currentMode);
    console.log('Content:', content);
    
    // Validate
    if (!content) {
        showError('Please enter some content to generate a QR code');
        return;
    }
    
    // Disable button
    elements.generateBtn.disabled = true;
    elements.generateBtn.textContent = 'Generating...';
    
    try {
        console.log('Sending request to /preview endpoint...');
        
        // Call preview endpoint
        const response = await fetch('/preview', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mode: currentMode,
                content: content
            })
        });
        
        console.log('Response status:', response.status);
        console.log('Response OK:', response.ok);
        
        if (!response.ok) {
            let errorMessage = 'Failed to generate QR code';
            try {
                const error = await response.json();
                errorMessage = error.error || errorMessage;
            } catch (e) {
                console.error('Could not parse error response:', e);
            }
            throw new Error(errorMessage);
        }
        
        // Get image blob
        const blob = await response.blob();
        console.log('Blob received:', blob.type, blob.size, 'bytes');
        
        const imageUrl = URL.createObjectURL(blob);
        console.log('Image URL created:', imageUrl);
        
        // Display preview
        elements.qrImage.src = imageUrl;
        elements.qrImage.onload = function() {
            console.log('QR Image loaded successfully');
        };
        elements.qrImage.onerror = function() {
            console.error('QR Image failed to load');
            showError('Failed to load QR code image');
        };
        
        elements.encodedContent.textContent = content;
        elements.qrPreview.classList.remove('hidden');
        
        // Store current content for downloads
        currentContent = content;
        
        console.log('QR Code generated successfully');
        
        // Scroll to preview
        setTimeout(() => {
            elements.qrPreview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 100);
        
    } catch (error) {
        console.error('Generation error:', error);
        showError(error.message);
    } finally {
        // Re-enable button
        elements.generateBtn.disabled = false;
        elements.generateBtn.textContent = 'Generate QR Code';
    }
}

// ========================================
// Download Functions
// ========================================
async function downloadQR(format) {
    console.log('Download requested:', format);
    
    if (!currentContent) {
        console.warn('No content to download');
        return;
    }
    
    try {
        const response = await fetch('/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mode: currentMode,
                content: currentContent,
                format: format
            })
        });
        
        if (!response.ok) {
            throw new Error('Download failed');
        }
        
        // Download file
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `qrcode.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('Download completed:', format);
        
    } catch (error) {
        console.error('Download error:', error);
        showError('Failed to download QR code');
    }
}

// ========================================
// Copy to Clipboard
// ========================================
async function copyToClipboard() {
    if (!currentContent) return;
    
    try {
        await navigator.clipboard.writeText(currentContent);
        console.log('Content copied to clipboard');
        
        // Visual feedback
        const originalText = elements.copyBtn.innerHTML;
        elements.copyBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8L6 11L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Copied!
        `;
        elements.copyBtn.style.background = 'var(--success)';
        elements.copyBtn.style.color = 'white';
        
        setTimeout(() => {
            elements.copyBtn.innerHTML = originalText;
            elements.copyBtn.style.background = '';
            elements.copyBtn.style.color = '';
        }, 2000);
        
    } catch (error) {
        console.error('Copy error:', error);
        showError('Failed to copy to clipboard');
    }
}

// ========================================
// Clear Preview
// ========================================
function clearPreview() {
    console.log('Clearing preview');
    elements.qrPreview.classList.add('hidden');
    elements.urlField.value = '';
    elements.textField.value = '';
    currentContent = '';
    hideError();
    
    // Reset counters
    elements.urlCounter.textContent = '0';
    elements.textCounter.textContent = '0';
}

// ========================================
// Event Listeners
// ========================================
function initEventListeners() {
    console.log('Initializing event listeners...');
    
    // Theme toggle
    if (elements.themeToggle) {
        elements.themeToggle.addEventListener('click', toggleTheme);
        console.log('Theme toggle listener added');
    }
    
    // Mode switching
    elements.modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            console.log('Mode button clicked:', btn.dataset.mode);
            switchMode(btn.dataset.mode);
        });
    });
    console.log('Mode button listeners added');
    
    // Character counters
    if (elements.urlField) {
        elements.urlField.addEventListener('input', (e) => {
            updateCharCounter(
                elements.urlField,
                elements.urlCounter,
                e.target.value.length,
                2000
            );
        });
        console.log('URL field listener added');
    }
    
    if (elements.textField) {
        elements.textField.addEventListener('input', (e) => {
            updateCharCounter(
                elements.textField,
                elements.textCounter,
                e.target.value.length,
                1200
            );
        });
        console.log('Text field listener added');
    }
    
    // Generate button
    if (elements.generateBtn) {
        elements.generateBtn.addEventListener('click', () => {
            console.log('Generate button clicked (via event listener)');
            generateQRCode();
        });
        console.log('Generate button listener added');
    }
    
    // Enter key to generate
    if (elements.urlField) {
        elements.urlField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                console.log('Enter key pressed in URL field');
                generateQRCode();
            }
        });
    }
    
    // Clear button
    if (elements.clearBtn) {
        elements.clearBtn.addEventListener('click', clearPreview);
        console.log('Clear button listener added');
    }
    
    // Download buttons
    if (elements.downloadPNG) {
        elements.downloadPNG.addEventListener('click', () => downloadQR('png'));
        console.log('Download PNG listener added');
    }
    
    if (elements.downloadSVG) {
        elements.downloadSVG.addEventListener('click', () => downloadQR('svg'));
        console.log('Download SVG listener added');
    }
    
    // Copy button
    if (elements.copyBtn) {
        elements.copyBtn.addEventListener('click', copyToClipboard);
        console.log('Copy button listener added');
    }
    
    console.log('All event listeners initialized');
}

// ========================================
// Initialize App
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded - Initializing app...');
    
    try {
        initTheme();
        initEventListeners();
        
        // Set initial mode
        switchMode('url');
        
        console.log('App initialized successfully!');
        console.log('Ready to generate QR codes');
    } catch (error) {
        console.error('Initialization error:', error);
        alert('Error initializing app. Check console for details.');
    }
});

// Global error handler
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
});

console.log('Script file loaded completely');