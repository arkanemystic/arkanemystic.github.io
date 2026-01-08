/**
 * Cloudinary Photo Fetcher for Retro OS Portfolio
 * 
 * This module provides functions to fetch and display photos from Cloudinary
 * in your retro OS-themed portfolio.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a Cloudinary account at https://cloudinary.com
 * 2. Get your Cloud Name from the Cloudinary Dashboard
 * 3. Generate an API Key and API Secret (keep these private!)
 * 4. Update the config below with your credentials
 * 5. Upload photos to a specific folder (e.g., "portfolio-photos")
 */

// ==================== CONFIGURATION ====================
const CLOUDINARY_CONFIG = {
    cloudName: 'dqpl3a9gb',
    apiKey: '844889519648982',
    apiSecret: 'tbwpS8nDGhJ5ywth4wSbFca7h6Q',
    folder: 'photos',
    maxResults: 30,
    useSignedUrl: false
};

/**
 * Fetch photos from Cloudinary using the Admin API
 * Note: For security, use this server-side only, or set up a backend proxy
 */
async function fetchPhotosFromCloudinary() {
    const { cloudName, apiKey, apiSecret, folder, maxResults } = CLOUDINARY_CONFIG;

    // Validate configuration
    if (cloudName === 'YOUR_CLOUD_NAME' || apiKey === 'YOUR_API_KEY') {
        console.error('❌ Cloudinary credentials not configured. Update cloudinary-config.js');
        return [];
    }

    try {
        // Create Basic Auth header
        const authHeader = 'Basic ' + btoa(`${apiKey}:${apiSecret}`);

        // Fetch resources from Cloudinary
        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/resources/image?prefix=${folder}&max_results=${maxResults}&type=upload`,
            {
                method: 'GET',
                headers: {
                    'Authorization': authHeader
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Cloudinary API error: ${response.status}`);
        }

        const data = await response.json();
        return data.resources || [];

    } catch (error) {
        console.error('Error fetching from Cloudinary:', error);
        return [];
    }
}

/**
 * Fetch photos using Cloudinary's Client-side API (limited functionality)
 * Alternative: Use this if server-side is not available
 */
async function fetchPhotosClientSide(tagOrFolder) {
    const { cloudName, maxResults } = CLOUDINARY_CONFIG;

    try {
        // This uses Cloudinary's search endpoint (requires paid plans or specific setup)
        // For free tier, use the widget or build a server-side endpoint
        const response = await fetch(
            `https://res.cloudinary.com/${cloudName}/image/list/${tagOrFolder}.json`
        );

        if (!response.ok) {
            throw new Error('Client-side fetch not available');
        }

        const data = await response.json();
        return data.resources || [];

    } catch (error) {
        console.warn('Client-side fetch failed. Use server-side endpoint instead.');
        return [];
    }
}

/**
 * Alternative: Build a simple JSON list and upload to your repo
 * This is the easiest method for static sites
 */
async function fetchPhotosFromLocalJSON() {
    try {
        const response = await fetch('/photos-manifest.json');
        const data = await response.json();
        return data.photos || [];
    } catch (error) {
        console.error('Could not load photos manifest:', error);
        return [];
    }
}

/**
 * Format a date for display
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Render photos in the retro OS feed
 */
function renderPhotos(photos, containerId = 'photos-feed') {
    const container = document.getElementById(containerId);
    
    if (!container) {
        console.error('Photos container not found');
        return;
    }

    if (!photos || photos.length === 0) {
        container.innerHTML = '<div class="photos-loading">No photos available</div>';
        return;
    }

    // Sort by date (newest first)
    photos.sort((a, b) => {
        const dateA = new Date(a.created_at || a.date || 0);
        const dateB = new Date(b.created_at || b.date || 0);
        return dateB - dateA;
    });

    // Clear container
    container.innerHTML = '';

    // Render each photo
    photos.forEach(photo => {
        const photoItem = document.createElement('div');
        photoItem.className = 'photo-item';

        const imageUrl = photo.secure_url || photo.url;
        const dateStr = formatDate(photo.created_at || photo.date || new Date());

        photoItem.innerHTML = `
            <img src="${imageUrl}" alt="Photo" class="photo-image" loading="lazy">
            <div class="photo-date">${dateStr}</div>
        `;

        container.appendChild(photoItem);
    });

    // Hide loading indicator
    const loadingDiv = document.getElementById('photos-loading');
    if (loadingDiv) {
        loadingDiv.style.display = 'none';
    }
}

/**
 * Initialize the photos module
 */
async function initializePhotos(method = 'api') {
    const photosWindow = document.getElementById('photos-window');
    
    if (!photosWindow) {
        console.warn('Photos window not found');
        return;
    }

    let photos = [];

    // Choose fetching method
    if (method === 'api') {
        photos = await fetchPhotosFromCloudinary();
    } else if (method === 'local-json') {
        photos = await fetchPhotosFromLocalJSON();
    } else if (method === 'client-side') {
        photos = await fetchPhotosClientSide(CLOUDINARY_CONFIG.folder);
    }

    renderPhotos(photos);
}

// Auto-initialize when photos window is opened
if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-tab="photos"]');
        if (target && !window.photosInitialized) {
            window.photosInitialized = true;
            initializePhotos('api'); // Change to 'local-json' if using JSON method
        }
    });
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fetchPhotosFromCloudinary,
        fetchPhotosClientSide,
        fetchPhotosFromLocalJSON,
        renderPhotos,
        initializePhotos,
        CLOUDINARY_CONFIG
    };
}
