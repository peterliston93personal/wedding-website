// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Duplicate banner content for seamless infinite scrolling with wavy animation
function duplicateBannerContent() {
    const banner = document.querySelector('.banner');
    const rsvpBanner = document.querySelector('.rsvp-banner-content');
    
    if (banner) {
        const bannerContent = banner.innerHTML;
        // Create 3 more copies (4 total) to ensure smooth infinite scrolling
        banner.innerHTML = bannerContent + bannerContent + bannerContent + bannerContent;
        
        // Apply staggered animation delays to ALL characters (including duplicates)
        const allChars = banner.querySelectorAll('span, img');
        allChars.forEach((char, index) => {
            char.style.animationDelay = `${-0.05 * index}s`;
            // Add extra margin to space characters for clear word separation
            if (char.tagName === 'SPAN' && char.textContent === ' ') {
                char.style.marginRight = '25px';
            }
        });
    }
    
    if (rsvpBanner) {
        const rsvpContent = rsvpBanner.innerHTML;
        // Create 3 more copies (4 total) to ensure smooth infinite scrolling
        rsvpBanner.innerHTML = rsvpContent + rsvpContent + rsvpContent + rsvpContent;
        
        // Apply staggered animation delays to ALL characters (including duplicates)
        const allChars = rsvpBanner.querySelectorAll('span, img');
        allChars.forEach((char, index) => {
            char.style.animationDelay = `${-0.05 * index}s`;
            // Add extra margin to space characters for clear word separation
            if (char.tagName === 'SPAN' && char.textContent === ' ') {
                char.style.marginRight = '30px';
            }
        });
    }
}

// Initialize banner duplication
duplicateBannerContent();

// RSVP Form Submission
const form = document.getElementById('rsvpForm');
const formMessage = document.getElementById('formMessage');

// Configuration for Google Sheets
// INSTRUCTIONS: Replace this URL with your Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwziGBKceyK9n91AjYmPaX6jMr5YA_7hWKn2wPPJ2iSbfLgoagMQEv7Svp_Li-GQM8k/exec';

// Get email from URL parameter
function getEmailFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('email');
}

// Fetch guest data from Google Sheet
async function fetchGuestData(email) {
    if (!email || GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_SCRIPT_URL_HERE') {
        return null;
    }
    
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?email=${encodeURIComponent(email)}`);
        const data = await response.json();
        return data.found ? data.guest : null;
    } catch (error) {
        console.error('Error fetching guest data:', error);
        return null;
    }
}

// Pre-fill form with guest data
async function preFillForm() {
    const email = getEmailFromURL();
    
    if (!email) {
        // No email in URL - show message
        document.querySelector('.rsvp-subtitle').innerHTML = 
            'Please use the personalized link from your invitation email. <br>Or contact us if you need assistance.';
        return;
    }
    
    // Show loading state
    document.querySelector('.rsvp-subtitle').innerHTML = 'Loading your invitation...';
    
    const guestData = await fetchGuestData(email);
    
    if (guestData) {
        // Pre-fill form fields
        document.getElementById('name').value = guestData.name;
        document.getElementById('name').setAttribute('readonly', true);
        document.getElementById('email').value = guestData.email;
        document.getElementById('email').setAttribute('readonly', true);
        document.getElementById('guests').value = guestData.partySize;
        document.getElementById('guests').max = guestData.partySize;
        
        // Update subtitle
        document.querySelector('.rsvp-subtitle').innerHTML = 
            `Welcome ${guestData.name}! Please complete your RSVP for ${guestData.partySize} guest${guestData.partySize > 1 ? 's' : ''}.`;
        
        // Add visual styling to readonly fields
        document.getElementById('name').style.backgroundColor = 'rgba(0,0,0,0.05)';
        document.getElementById('email').style.backgroundColor = 'rgba(0,0,0,0.05)';
    } else {
        // Guest not found
        document.querySelector('.rsvp-subtitle').innerHTML = 
            'We couldn\'t find your invitation. Please check your email link or contact us for assistance.';
        showMessage('Unable to load your invitation. Please use the link from your email or contact us.', 'error');
    }
}

// Initialize form on page load
window.addEventListener('DOMContentLoaded', preFillForm);

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Get form data
    const formData = new FormData(form);
    const data = {
        action: 'updateRSVP',
        timestamp: new Date().toISOString(),
        email: formData.get('email'),
        name: formData.get('name'),
        phone: formData.get('phone') || 'Not provided',
        attending: formData.get('attending'),
        attendingCount: formData.get('guests'),
        dietary: formData.get('dietary') || 'None',
        events: formData.getAll('events').join(', ') || 'None selected',
        message: formData.get('message') || 'No message'
    };
    
    // Disable submit button
    const submitButton = form.querySelector('.submit-button');
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
    
    try {
        // Check if Google Script URL is configured
        if (GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_SCRIPT_URL_HERE') {
            // For testing purposes - show success message
            console.log('RSVP Data:', data);
            showMessage('Thank you for your RSVP! Your response has been recorded. (Note: Google Sheets integration needs to be set up)', 'success');
        } else {
            // Send data to Google Sheets
            const response = await fetch(GOOGLE_SCRIPT_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            // Show success message
            const attendingText = data.attending === 'Yes, I\'ll be there!' ? 
                'We can\'t wait to celebrate with you!' : 
                'We\'ll miss you but thanks for letting us know.';
            showMessage(`Thank you for your RSVP! ${attendingText}`, 'success');
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        showMessage('Oops! There was an error submitting your RSVP. Please try again or contact us directly.', 'error');
    } finally {
        // Re-enable submit button
        submitButton.disabled = false;
        submitButton.textContent = 'Submit RSVP';
    }
});

function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
    formMessage.style.display = 'block';
    
    // Scroll to message
    formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Hide message after 10 seconds
    setTimeout(() => {
        formMessage.style.display = 'none';
    }, 10000);
}

// Show/hide attending-related fields
const attendingRadios = document.querySelectorAll('input[name="attending"]');
attendingRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        const guestsField = document.getElementById('guests').parentElement;
        const eventsField = document.querySelector('.checkbox-group').parentElement;
        const dietaryField = document.getElementById('dietary').parentElement;
        
        if (e.target.value === 'Sorry, can\'t make it') {
            guestsField.style.opacity = '0.5';
            eventsField.style.opacity = '0.5';
            dietaryField.style.opacity = '0.5';
            document.getElementById('guests').required = false;
        } else {
            guestsField.style.opacity = '1';
            eventsField.style.opacity = '1';
            dietaryField.style.opacity = '1';
            document.getElementById('guests').required = true;
        }
    });
});

// Navbar background opacity on scroll
let lastScroll = 0;
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    } else {
        navbar.style.boxShadow = 'none';
    }
    
    lastScroll = currentScroll;
});
