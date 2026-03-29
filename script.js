// =============================================
// INVITATION LIGHTBOX
// =============================================

function openInvitationLightbox() {
    const lb = document.getElementById('invitation-lightbox');
    if (!lb) return;
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeInvitationLightbox() {
    const lb = document.getElementById('invitation-lightbox');
    if (!lb) return;
    lb.classList.remove('active');
    document.body.style.overflow = '';
}

// Close lightbox with Escape key
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeInvitationLightbox();
});

// =============================================
// END INVITATION LIGHTBOX
// =============================================

// =============================================
// ENVELOPE OVERLAY
// =============================================

function openEnvelope() {
    const overlay  = document.getElementById('envelope-overlay');
    const wrapper  = overlay.querySelector('.envelope-wrapper');

    // Prevent double-clicks
    overlay.onclick = null;
    wrapper.style.cursor = 'default';

    // Step 1: flip closed → open
    wrapper.classList.add('opening');

    // Step 2: flip done — zoom in and hold
    setTimeout(function () {
        wrapper.classList.add('peeking');
    }, 1000);

    // Step 3: pause on open envelope, then fade out
    setTimeout(function () {
        overlay.classList.add('revealing');
    }, 3200);

    // Step 4: hide overlay and restore scrolling
    setTimeout(function () {
        overlay.classList.add('done');
        document.body.classList.remove('overlay-active');
        document.body.classList.add('site-revealed');
        window.scrollTo({ top: 0, behavior: 'auto' });
        updateNavbarState();
    }, 5400);
}

// =============================================
// END ENVELOPE OVERLAY
// =============================================

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
    const wgmBanner = document.querySelector('.wgm-banner-content');

    function prepareBanner(element, spaceMarginRight) {
        if (!element || element.dataset.duplicated === 'true') {
            return;
        }

        const content = element.innerHTML;
        // Create 3 more copies (4 total) to ensure smooth infinite scrolling
        element.innerHTML = content + content + content + content;
        element.dataset.duplicated = 'true';

        // Apply staggered animation delays to ALL characters (including duplicates)
        const allChars = element.querySelectorAll('span, img');
        allChars.forEach((char, index) => {
            char.style.animationDelay = `${-0.05 * index}s`;
            // Add extra margin to space characters for clear word separation
            if (char.tagName === 'SPAN' && char.textContent === ' ') {
                char.style.marginRight = spaceMarginRight;
            }
        });
    }

    prepareBanner(banner, '25px');
    prepareBanner(rsvpBanner, '30px');
    prepareBanner(wgmBanner, '30px');
}

// Initialize banner duplication
duplicateBannerContent();

// Dynamic per-guest dietary fields
const guestsInput = document.getElementById('guests');
if (guestsInput) {
    guestsInput.addEventListener('input', updateDietaryFields);
    guestsInput.addEventListener('change', updateDietaryFields);
}

function updateDietaryFields() {
    const container = document.getElementById('dietary-container');
    if (!container) return;
    
    // In group mode, always show single dietary field
    container.innerHTML = '<input type="text" id="dietary-guest-1" name="dietary-guest-1" placeholder="Dietary requirements or allergies (or leave blank if none)">';
}

// RSVP Form Submission
const form = document.getElementById('rsvpForm');
const formMessage = document.getElementById('formMessage');

// Stores the current group so resetFormForNextPerson can call loadGuestForm directly
let currentGroupMembers = [];

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

// Fetch all group members for a given email
async function fetchGroupMembers(email) {
    if (!email || GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_SCRIPT_URL_HERE') {
        return null;
    }
    
    try {
        const response = await fetch(`${GOOGLE_SCRIPT_URL}?action=getGroup&email=${encodeURIComponent(email)}`);
        const data = await response.json();
        return data.found ? data.group : null;
    } catch (error) {
        console.error('Error fetching group members:', error);
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
    
    // Fetch primary guest data to verify email
    const guestData = await fetchGuestData(email);
    
    if (!guestData) {
        // Guest not found
        document.querySelector('.rsvp-subtitle').innerHTML = 
            'We couldn\'t find your invitation. Please check your email link or contact us for assistance.';
        showMessage('Unable to load your invitation. Please use the link from your email or contact us.', 'error');
        return;
    }
    
    // Fetch all group members
    const groupMembers = await fetchGroupMembers(email);
    
    if (groupMembers && groupMembers.length > 1) {
        // Multiple people in group - store and show selector
        currentGroupMembers = groupMembers;
        displayGroupSelector(groupMembers);
        document.querySelector('.rsvp-subtitle').innerHTML = 
            'Select who you\'d like to RSVP for, then complete the form for that person.';
    } else {
        // Single person - load their form directly
        document.querySelector('.rsvp-subtitle').innerHTML = 
            `Welcome ${guestData.name}! Please complete your RSVP.`;
        loadGuestForm(guestData);
    }
}

// Display group member radio buttons
function displayGroupSelector(groupMembers) {
    const selectorSection = document.getElementById('group-selector-section');
    const selectorContainer = document.getElementById('group-selector');
    
    selectorContainer.innerHTML = '';
    groupMembers.forEach((member, index) => {
        const label = document.createElement('label');
        label.className = 'radio-label';
        
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'group-member';
        radio.value = member.name;
        radio.dataset.email = member.email;
        if (index === 0) radio.checked = true;
        
        const span = document.createElement('span');
        span.textContent = member.name;
        
        label.appendChild(radio);
        label.appendChild(span);
        selectorContainer.appendChild(label);
        
        // Add change listener to load form for selected member
        radio.addEventListener('change', () => {
            // Find member in group and load their data
            const selectedMember = groupMembers.find(m => m.name === radio.value);
            if (selectedMember) {
                loadGuestForm(selectedMember);
            }
        });
    });
    
    // Show selector and load first member's form
    selectorSection.style.display = 'block';
    loadGuestForm(groupMembers[0]);
}

// Load form with specific guest's data
function loadGuestForm(guestData) {
    // Set name and email (hidden)
    document.getElementById('name').value = guestData.name;
    document.getElementById('name').setAttribute('readonly', true);
    document.getElementById('name').style.backgroundColor = 'rgba(0,0,0,0.05)';
    document.getElementById('email').value = guestData.email;

    // Reset all form inputs
    document.querySelectorAll('input[name="attending"]').forEach(r => r.checked = false);
    document.querySelectorAll('input[name="events"]').forEach(c => c.checked = false);
    document.getElementById('phone').value = '';
    document.getElementById('message').value = '';

    // Reset dietary field
    updateDietaryFields();

    // Reset opacity on events and dietary sections in case they were dimmed
    const eventsField = document.querySelector('.checkbox-group')?.parentElement;
    const dietaryField = document.getElementById('dietary-section');
    if (eventsField) eventsField.style.opacity = '1';
    if (dietaryField) dietaryField.style.opacity = '1';

    // Hide any previous success/error message
    const formMessage = document.getElementById('formMessage');
    if (formMessage) formMessage.style.display = 'none';

    // Scroll to top of form
    document.getElementById('rsvpForm').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Initialize form on page load
window.addEventListener('DOMContentLoaded', () => {
    // Hide the "Number of Guests" field since we're doing individual RSVPs now
    const guestsField = document.getElementById('guests');
    if (guestsField) {
        guestsField.parentElement.style.display = 'none';
        guestsField.required = false;
        guestsField.disabled = true;
    }
    
    // Initialize dietary field
    updateDietaryFields();
    
    // Load guest data
    preFillForm();
});

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
        attendingCount: 1,  // Individual RSVP
        dietary: document.getElementById('dietary-guest-1')?.value || 'None',
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
            resetFormForNextPerson();
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
            
            // Reset form for next person after a short delay
            setTimeout(resetFormForNextPerson, 2000);
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

// Reset form to select next person in group
function resetFormForNextPerson() {
    const selectorSection = document.getElementById('group-selector-section');
    const selectorRadios = document.querySelectorAll('input[name="group-member"]');

    if (selectorSection.style.display === 'block' && selectorRadios.length > 1) {
        // Find the index of the currently selected radio
        let currentIndex = -1;
        selectorRadios.forEach((radio, i) => {
            if (radio.checked) currentIndex = i;
        });

        const nextIndex = currentIndex + 1;

        if (nextIndex < selectorRadios.length) {
            // Select the next radio button visually
            selectorRadios[nextIndex].checked = true;

            // Directly call loadGuestForm with the next member's data
            const nextMember = currentGroupMembers[nextIndex];
            if (nextMember) {
                loadGuestForm(nextMember);
            }
        } else {
            // All group members done
            showMessage('All RSVPs for your group have been submitted! Thank you!', 'success');
            selectorSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }
}

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
        const eventsField = document.querySelector('.checkbox-group')?.parentElement;
        const dietaryField = document.getElementById('dietary-section');

        if (e.target.value === 'Sorry, can\'t make it') {
            if (eventsField) eventsField.style.opacity = '0.5';
            if (dietaryField) dietaryField.style.opacity = '0.5';
            // Don't require events/dietary if not attending
            document.querySelectorAll('input[name="events"]').forEach(c => c.required = false);
        } else {
            if (eventsField) eventsField.style.opacity = '1';
            if (dietaryField) dietaryField.style.opacity = '1';
        }
    });
});

function updateNavbarState() {
    const navbar = document.querySelector('.navbar');
    const landingMenu = document.getElementById('landing-menu');
    if (!navbar || !landingMenu) return;

    const threshold = landingMenu.offsetHeight - 120;
    const currentScroll = window.pageYOffset;

    if (currentScroll > threshold) {
        navbar.classList.add('scrolled');
        navbar.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
    } else {
        navbar.classList.remove('scrolled');
        navbar.style.boxShadow = 'none';
    }
}

window.addEventListener('scroll', updateNavbarState);
window.addEventListener('resize', updateNavbarState);
window.addEventListener('load', updateNavbarState);
