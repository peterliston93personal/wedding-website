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

let mobileWgmLoopFrameId = null;
let mobileWgmLoopResizeTimer = null;

function initMobileWgmBannerLoop() {
    if (mobileWgmLoopFrameId) {
        cancelAnimationFrame(mobileWgmLoopFrameId);
        mobileWgmLoopFrameId = null;
    }

    if (!window.matchMedia('(max-width: 768px)').matches) {
        return;
    }

    const svg = document.querySelector('.wgm-wave-svg--mobile');
    const loop = svg ? svg.querySelector('.wgm-mobile-loop') : null;
    const path = svg ? svg.querySelector('#wgm-flow-text-path-mobile') : null;
    const template = loop ? loop.querySelector('.wgm-mobile-loop-segment') : null;

    if (!svg || !loop || !path || !template) {
        return;
    }

    const extraSegments = Array.from(loop.querySelectorAll('.wgm-mobile-loop-segment')).slice(1);
    extraSegments.forEach(segment => segment.remove());

    const templateTextPath = template.querySelector('textPath');
    if (!templateTextPath) {
        return;
    }

    templateTextPath.setAttribute('startOffset', '0');

    // Compensate for non-uniform scaling from preserveAspectRatio="none".
    // The viewBox is 1200×180 but the SVG renders at a much narrower width on mobile,
    // causing characters to appear horizontally squished. Scale the text group to correct this.
    const svgRect = svg.getBoundingClientRect();
    if (svgRect.width > 0 && svgRect.height > 0) {
        const compensation = (svgRect.height / 180) / (svgRect.width / 1200);
        loop.setAttribute('transform', `scale(${compensation}, 1)`);
    }

    let pathLength = 0;
    let segmentLength = 0;

    try {
        pathLength = path.getTotalLength();
        segmentLength = template.getComputedTextLength();
    } catch (error) {
        return;
    }

    if (!pathLength || !segmentLength) {
        return;
    }

    const gap = Math.max(segmentLength * 0.32, 60);
    const cycleLength = segmentLength + gap;
    const copiesNeeded = Math.max(4, Math.ceil((pathLength + cycleLength) / cycleLength) + 1);
    const segments = [template];

    for (let index = 1; index < copiesNeeded; index++) {
        const clone = template.cloneNode(true);
        loop.appendChild(clone);
        segments.push(clone);
    }

    const unitsPerSecond = (220 / 2.1) * 2;
    let lastTimestamp = performance.now();
    let offset = 0;

    function tick(timestamp) {
        const deltaSeconds = (timestamp - lastTimestamp) / 1000;
        lastTimestamp = timestamp;
        offset = (offset + unitsPerSecond * deltaSeconds) % cycleLength;

        segments.forEach((segment, index) => {
            const textPath = segment.querySelector('textPath');
            if (!textPath) {
                return;
            }
            textPath.setAttribute('startOffset', `${index * cycleLength - offset}`);
        });

        mobileWgmLoopFrameId = requestAnimationFrame(tick);
    }

    mobileWgmLoopFrameId = requestAnimationFrame(tick);
}

if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(initMobileWgmBannerLoop);
} else {
    window.addEventListener('load', initMobileWgmBannerLoop);
}

window.addEventListener('resize', function () {
    clearTimeout(mobileWgmLoopResizeTimer);
    mobileWgmLoopResizeTimer = setTimeout(initMobileWgmBannerLoop, 150);
});

function scrollToFaqAfterSubmit() {
    const faqSection = document.getElementById('faq');
    if (!faqSection) return;

    // Let the success message render before moving focus down the page.
    setTimeout(() => {
        faqSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 1400);
}

// RSVP Form Submission
const form = document.getElementById('rsvpForm');
const formMessage = document.getElementById('formMessage');
const rsvpSubtitle = document.querySelector('.rsvp-subtitle');
const guestBlocksContainer = document.getElementById('guest-blocks');
const partyOverview = document.getElementById('party-overview');
const partyTitle = document.getElementById('party-title');
const partyProgress = document.getElementById('party-progress');
const sharedMessageInput = document.getElementById('message');
const submitButton = form ? form.querySelector('.submit-button') : null;

let currentPartyMembers = [];
let partyResponses = {};
let primaryInviteEmail = '';
let sharedPartyMessage = '';
let formMessageTimerId = null;

const RSVP_ATTENDING_YES = 'Yes, I\'ll be there!';
const RSVP_ATTENDING_NO = 'Sorry, can\'t make it';
const RSVP_EVENTS = [
    'Friday Ceremony & Reception',
    'Saturday Recovery Swim',
    'Saturday Day Two @ Caseys'
];

// Configuration for Google Sheets
// INSTRUCTIONS: Replace this URL with your Google Apps Script Web App URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzZOb2ZWvr20H8X5W427ZCj604U9t_tl7422f0vSn-7tdSpDJFp54m6hkVQwCHmae5O/exec';

if (submitButton) {
    submitButton.disabled = true;
}

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

function escapeHtml(value) {
    return String(value || '').replace(/[&<>'"]/g, (character) => {
        const entities = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        };

        return entities[character] || character;
    });
}

function createGuestResponse(member) {
    return {
        name: member.name,
        email: member.email,
        attending: '',
        dietary: '',
        events: []
    };
}

function normalizeGuest(member, index) {
    return {
        key: `guest-${index}`,
        name: member.name,
        email: member.email || '',
        partySize: member.partySize || 1,
        groupId: member.groupId || ''
    };
}

function setEmptyGuestState(message) {
    if (guestBlocksContainer) {
        guestBlocksContainer.innerHTML = '';

        const emptyState = document.createElement('div');
        emptyState.className = 'guest-blocks-empty';
        emptyState.textContent = message;
        guestBlocksContainer.appendChild(emptyState);
    }

    if (partyOverview) {
        partyOverview.hidden = true;
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Submit RSVP';
    }
}

function hideMessage() {
    if (!formMessage) return;

    formMessage.style.display = 'none';

    if (formMessageTimerId) {
        clearTimeout(formMessageTimerId);
        formMessageTimerId = null;
    }
}

function getGuestResponse(guestKey) {
    return partyResponses[guestKey] || null;
}

function isGuestReady(response) {
    return Boolean(response && response.attending);
}

function getReadyGuestCount() {
    return currentPartyMembers.filter((member) => isGuestReady(getGuestResponse(member.key))).length;
}

function updatePartyOverview() {
    if (!partyOverview || !partyTitle || !partyProgress) return;

    if (!currentPartyMembers.length) {
        partyOverview.hidden = true;
        return;
    }

    partyOverview.hidden = false;

    if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = currentPartyMembers.length > 1 ? 'Submit Party RSVP' : 'Submit RSVP';
    }

    if (currentPartyMembers.length === 1) {
        const onlyGuest = currentPartyMembers[0];

        partyTitle.textContent = onlyGuest.name;
        partyProgress.textContent = isGuestReady(getGuestResponse(onlyGuest.key))
            ? 'Everything looks ready. You only need to submit once.'
            : 'Choose whether you can make it below, then submit once when you are ready.';
        return;
    }

    const readyGuestCount = getReadyGuestCount();
    partyTitle.textContent = `Reply for ${currentPartyMembers.length} guests`;
    partyProgress.textContent = readyGuestCount === currentPartyMembers.length
        ? 'All guest responses are ready. You only need to submit once.'
        : `${readyGuestCount} of ${currentPartyMembers.length} guests responded so far. Choose an attendance response for each guest, then submit once.`;
}

function buildEventOptionsMarkup(member, response) {
    return RSVP_EVENTS.map((eventName) => {
        const safeEventName = escapeHtml(eventName);
        const isChecked = response.events.includes(eventName) ? 'checked' : '';

        return `
            <label class="checkbox-label">
                <input type="checkbox" name="events-${member.key}" value="${safeEventName}" data-guest-key="${member.key}" data-field="events" ${isChecked}>
                <span>${safeEventName}</span>
            </label>
        `;
    }).join('');
}

function buildGuestCardMarkup(member, index, totalGuests) {
    const response = getGuestResponse(member.key) || createGuestResponse(member);
    const isDeclining = response.attending === RSVP_ATTENDING_NO;
    const isReady = isGuestReady(response);
    const statusLabel = isDeclining ? 'Not attending' : isReady ? 'Ready' : 'Response needed';
    const guestLabel = totalGuests > 1 ? `Guest ${index + 1} of ${totalGuests}` : 'Your invitation';
    const safeName = escapeHtml(member.name);
    const safeDietary = escapeHtml(response.dietary);
    const safeYes = escapeHtml(RSVP_ATTENDING_YES);
    const safeNo = escapeHtml(RSVP_ATTENDING_NO);

    return `
        <article class="guest-card ${isReady ? 'is-complete' : 'is-pending'} ${isDeclining ? 'is-declined' : ''}" data-guest-key="${member.key}">
            <div class="guest-card-header">
                <div>
                    <p class="guest-card-eyebrow">${guestLabel}</p>
                    <h3 class="guest-card-name">${safeName}</h3>
                </div>
                <span class="guest-card-status">${statusLabel}</span>
            </div>

            <div class="form-group guest-card-attending-group">
                <label>Will ${safeName} be attending? *</label>
                <div class="radio-group">
                    <label class="radio-label">
                        <input type="radio" name="attending-${member.key}" value="${safeYes}" data-guest-key="${member.key}" data-field="attending" ${response.attending === RSVP_ATTENDING_YES ? 'checked' : ''}>
                        <span>Yes, I'll be there!</span>
                    </label>
                    <label class="radio-label">
                        <input type="radio" name="attending-${member.key}" value="${safeNo}" data-guest-key="${member.key}" data-field="attending" ${response.attending === RSVP_ATTENDING_NO ? 'checked' : ''}>
                        <span>Sorry, can't make it</span>
                    </label>
                </div>
            </div>

            <div class="guest-card-extra-fields" ${isDeclining ? 'hidden' : ''}>
                <div class="form-group">
                    <label>Which events will ${safeName} attend?</label>
                    <div class="checkbox-group guest-card-events">
                        ${buildEventOptionsMarkup(member, response)}
                    </div>
                </div>

                <div class="form-group guest-card-dietary-group">
                    <label for="${member.key}-dietary">Dietary Requirements &amp; Allergens</label>
                    <input type="text" id="${member.key}-dietary" name="dietary-${member.key}" value="${safeDietary}" placeholder="Dietary requirements or allergies (or leave blank if none)" data-guest-key="${member.key}" data-field="dietary">
                    <p class="form-helper">Leave blank if there is nothing to note for this guest.</p>
                </div>
            </div>

            <p class="guest-card-decline-note" ${isDeclining ? '' : 'hidden'}>No extra details needed for this guest.</p>
        </article>
    `;
}

function renderGuestBlocks() {
    if (!guestBlocksContainer) return;

    if (!currentPartyMembers.length) {
        setEmptyGuestState('Open your personalized invite link to load the RSVP form.');
        return;
    }

    guestBlocksContainer.innerHTML = currentPartyMembers
        .map((member, index) => buildGuestCardMarkup(member, index, currentPartyMembers.length))
        .join('');

    updatePartyOverview();
}

function clearGuestDetailInputs(card) {
    if (!card) return;

    card.querySelectorAll('input[data-field="events"]').forEach((checkbox) => {
        checkbox.checked = false;
    });

    const dietaryInput = card.querySelector('input[data-field="dietary"]');
    if (dietaryInput) {
        dietaryInput.value = '';
    }
}

function syncGuestCardState(guestKey) {
    if (!guestBlocksContainer) return;

    const card = guestBlocksContainer.querySelector(`[data-guest-key="${guestKey}"]`);
    if (!card) return;

    const response = getGuestResponse(guestKey);
    const isDeclining = response && response.attending === RSVP_ATTENDING_NO;
    const isReady = isGuestReady(response);
    const status = card.querySelector('.guest-card-status');
    const extraFields = card.querySelector('.guest-card-extra-fields');
    const declineNote = card.querySelector('.guest-card-decline-note');

    card.classList.toggle('is-complete', isReady);
    card.classList.toggle('is-pending', !isReady);
    card.classList.toggle('is-declined', Boolean(isDeclining));
    card.classList.remove('needs-response');

    if (status) {
        status.textContent = isDeclining ? 'Not attending' : isReady ? 'Ready' : 'Response needed';
    }

    if (extraFields) {
        extraFields.hidden = Boolean(isDeclining);
    }

    if (declineNote) {
        declineNote.hidden = !isDeclining;
    }

    updatePartyOverview();
}

function resetPartyState(partyMembers) {
    currentPartyMembers = partyMembers.map((member, index) => normalizeGuest(member, index));
    partyResponses = {};
    sharedPartyMessage = '';

    currentPartyMembers.forEach((member) => {
        partyResponses[member.key] = createGuestResponse(member);
    });

    if (sharedMessageInput) {
        sharedMessageInput.value = '';
    }

    hideMessage();
    renderGuestBlocks();
}

// Pre-fill form with guest data
async function preFillForm() {
    const email = getEmailFromURL();
    primaryInviteEmail = email || '';
    
    if (!email) {
        // No email in URL - show message
        rsvpSubtitle.innerHTML = 
            'Please use the personalized link from your invitation email. <br>Or contact us if you need assistance.';
        setEmptyGuestState('Open the personalized link from your invitation email to load the RSVP form.');
        return;
    }
    
    // Show loading state
    rsvpSubtitle.textContent = 'Loading your invitation...';
    setEmptyGuestState('Loading your invitation...');
    
    // Fetch primary guest data to verify email
    const guestData = await fetchGuestData(email);
    
    if (!guestData) {
        // Guest not found
        rsvpSubtitle.textContent = 
            'We couldn\'t find your invitation. Please check your email link or contact us for assistance.';
        showMessage('Unable to load your invitation. Please use the link from your email or contact us.', 'error');
        setEmptyGuestState('We could not load your invitation. Please use the link from your email or contact us.');
        return;
    }
    
    // Fetch all group members
    const groupMembers = await fetchGroupMembers(email);
    const partyMembers = groupMembers && groupMembers.length ? groupMembers : [guestData];
    resetPartyState(partyMembers);
    
    if (partyMembers.length > 1) {
        rsvpSubtitle.textContent =
            'Please reply for each guest below. You only need to click submit once.';
    } else {
        rsvpSubtitle.textContent =
            `Welcome ${guestData.name}! Please complete your RSVP.`;
    }
}

// Initialize form on page load
window.addEventListener('DOMContentLoaded', () => {
    setEmptyGuestState('Loading your invitation...');
    preFillForm();
});

function validatePartyForm() {
    if (!currentPartyMembers.length) {
        showMessage('Please open your personalized invite link to RSVP.', 'error');
        return false;
    }

    const missingMembers = currentPartyMembers.filter((member) => !isGuestReady(getGuestResponse(member.key)));

    if (!missingMembers.length) {
        return true;
    }

    missingMembers.forEach((member) => {
        const card = guestBlocksContainer ? guestBlocksContainer.querySelector(`[data-guest-key="${member.key}"]`) : null;
        if (card) {
            card.classList.add('needs-response');
        }
    });

    const validationMessage = missingMembers.length === 1
        ? `Please choose an attendance response for ${missingMembers[0].name}.`
        : 'Please choose an attendance response for each guest before submitting.';

    showMessage(validationMessage, 'error');

    const firstMissingCard = guestBlocksContainer ? guestBlocksContainer.querySelector('.guest-card.needs-response') : null;
    if (firstMissingCard) {
        firstMissingCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return false;
}

function buildSingleGuestPayload(member, response, sharedMessage, timestamp) {
    const isAttending = response.attending === RSVP_ATTENDING_YES;

    return {
        action: 'updateRSVP',
        timestamp,
        groupId: member.groupId || '',
        email: member.email,
        name: member.name,
        phone: 'Not provided',
        attending: response.attending,
        attendingCount: isAttending ? 1 : 0,
        dietary: isAttending ? (response.dietary.trim() || 'None') : 'Not attending',
        events: isAttending ? (response.events.join(', ') || 'None selected') : 'Not attending',
        message: sharedMessage
    };
}

function buildPartyPayload() {
    const timestamp = new Date().toISOString();
    const sharedMessage = sharedMessageInput && sharedMessageInput.value.trim() ? sharedMessageInput.value.trim() : 'No message';
    sharedPartyMessage = sharedMessageInput ? sharedMessageInput.value : '';

    if (currentPartyMembers.length === 1) {
        const member = currentPartyMembers[0];
        return buildSingleGuestPayload(member, getGuestResponse(member.key), sharedMessage, timestamp);
    }

    return {
        action: 'updateGroupRSVP',
        timestamp,
        primaryEmail: primaryInviteEmail,
        groupId: currentPartyMembers[0] ? currentPartyMembers[0].groupId || '' : '',
        partySize: currentPartyMembers.length,
        sharedMessage,
        guests: currentPartyMembers.map((member) => buildSingleGuestPayload(member, getGuestResponse(member.key), sharedMessage, timestamp))
    };
}

function getSuccessMessage(payload) {
    const guests = payload.action === 'updateGroupRSVP' ? payload.guests : [payload];
    const attendingGuests = guests.filter((guest) => guest.attending === RSVP_ATTENDING_YES).length;

    if (attendingGuests === guests.length) {
        return guests.length > 1
            ? 'Thank you for your RSVP! We cannot wait to celebrate with all of you.'
            : 'Thank you for your RSVP! We cannot wait to celebrate with you.';
    }

    if (attendingGuests === 0) {
        return 'Thank you for your RSVP! We will miss you but thanks for letting us know.';
    }

    return 'Thank you for your RSVP! Your party responses have been recorded.';
}

function showMessage(message, type) {
    if (!formMessage) return;

    if (formMessageTimerId) {
        clearTimeout(formMessageTimerId);
    }

    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
    formMessage.style.display = 'block';
    
    // Scroll to message
    formMessage.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    // Hide message after 10 seconds
    formMessageTimerId = setTimeout(() => {
        formMessage.style.display = 'none';
        formMessageTimerId = null;
    }, 10000);
}

if (form) {
    form.addEventListener('change', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement)) return;

        const guestKey = target.dataset.guestKey;
        const field = target.dataset.field;
        if (!guestKey || !field) return;

        const response = getGuestResponse(guestKey);
        if (!response) return;

        if (field === 'attending') {
            response.attending = target.value;

            if (response.attending === RSVP_ATTENDING_NO) {
                response.events = [];
                response.dietary = '';
                clearGuestDetailInputs(target.closest('.guest-card'));
            }

            syncGuestCardState(guestKey);
            hideMessage();
            return;
        }

        if (field === 'events') {
            const guestCard = target.closest('.guest-card');
            response.events = guestCard
                ? Array.from(guestCard.querySelectorAll('input[data-field="events"]:checked')).map((checkbox) => checkbox.value)
                : [];
            hideMessage();
        }
    });

    form.addEventListener('input', (event) => {
        const target = event.target;

        if (target === sharedMessageInput) {
            sharedPartyMessage = sharedMessageInput.value;
            hideMessage();
            return;
        }

        if (!(target instanceof HTMLInputElement)) return;

        const guestKey = target.dataset.guestKey;
        const field = target.dataset.field;
        if (!guestKey || field !== 'dietary') return;

        const response = getGuestResponse(guestKey);
        if (!response) return;

        response.dietary = target.value;
        hideMessage();
    });

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        if (!validatePartyForm()) {
            return;
        }

        const payload = buildPartyPayload();

        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = 'Submitting...';
        }

        try {
            if (GOOGLE_SCRIPT_URL === 'YOUR_GOOGLE_SCRIPT_URL_HERE') {
                console.log('RSVP Data:', payload);
                showMessage('Thank you for your RSVP! Your response has been recorded. (Note: Google Sheets integration still needs to be set up.)', 'success');
                scrollToFaqAfterSubmit();
            } else {
                await fetch(GOOGLE_SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    headers: {
                        'Content-Type': 'text/plain;charset=utf-8'
                    },
                    body: JSON.stringify(payload)
                });

                showMessage(getSuccessMessage(payload), 'success');
                scrollToFaqAfterSubmit();
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            showMessage('Oops! There was an error submitting your RSVP. Please try again or contact us directly.', 'error');
        } finally {
            updatePartyOverview();
        }
    });
}

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
