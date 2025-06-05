document.addEventListener('DOMContentLoaded', () => {
    // Eye Tracking Logic
    const leftEyePupil = document.getElementById('left-eye-pupil');
    const rightEyePupil = document.getElementById('right-eye-pupil');
    const leftEyeSclera = document.getElementById('left-eye-sclera');
    const rightEyeSclera = document.getElementById('right-eye-sclera');

    function calculatePupilTransform(scleraElement, mouseX, mouseY) {
        const scleraRect = scleraElement.getBoundingClientRect();
        const scleraCenterX = scleraRect.left + scleraRect.width / 2;
        const scleraCenterY = scleraRect.top + scleraRect.height / 2;

        const dx = mouseX - scleraCenterX;
        const dy = mouseY - scleraCenterY;

        const angle = Math.atan2(dy, dx);
        const pupilMaxMove = (scleraRect.width / 2) * 0.6;

        const pupilX = pupilMaxMove * Math.cos(angle);
        const pupilY = pupilMaxMove * Math.sin(angle);

        return `translate(${pupilX}px, ${pupilY}px)`;
    }

    function updatePupilPosition(event) {
        leftEyePupil.style.transform = calculatePupilTransform(leftEyeSclera, event.clientX, event.clientY);
        rightEyePupil.style.transform = calculatePupilTransform(rightEyeSclera, event.clientX, event.clientY);
    }

    document.addEventListener('mousemove', updatePupilPosition);

    // Initial positioning: Center pupils when the page loads before any mouse movement occurs
    leftEyePupil.style.transform = 'translate(0, 0)';
    rightEyePupil.style.transform = 'translate(0, 0)';

    // Image Gallery Logic
    const galleryContainer = document.getElementById('galleryContainer');
    const galleryGrid = document.querySelector('.gallery-grid');

    let isDragging = false;
    let startX;
    let scrollLeftStart;
    let currentVelocity = 0; // Current scrolling velocity for inertia
    let animationFrameId = null; // To hold the requestAnimationFrame ID for the main animation loop
    let lastMouseX = 0; // To calculate velocity
    let lastTime = 0; // To calculate velocity

    let hoverScrollSpeed = 8; // Pixels per frame for hover scroll
    let hoverDirection = 0; // -1 for left, 1 for right, 0 for none

    // Duplicate images to create a seamless loop effect
    const originalImages = Array.from(galleryGrid.children);
    originalImages.forEach(image => {
        galleryGrid.appendChild(image.cloneNode(true));
    });

    let originalContentWidth = 0;

    // Function to calculate originalContentWidth and update transforms
    function calculateAndApplyTransforms() {
        const firstImageCard = originalImages[0];
        if (!firstImageCard) return; // Ensure cards exist

        const computedCardStyle = getComputedStyle(firstImageCard);
        const imageCardWidth = parseFloat(computedCardStyle.width);
        const computedGridStyle = getComputedStyle(galleryGrid);
        const gap = parseFloat(computedGridStyle.gap || computedGridStyle.columnGap) || 0;

        originalContentWidth = (imageCardWidth + gap) * originalImages.length;
        // Subtract the last gap as it's not part of the total content width for looping
        originalContentWidth -= gap;

        applyVisualTransforms(); // Apply transforms immediately after recalculating
    }

    // Function to apply 3D-like visual transforms based on proximity to center
    function applyVisualTransforms() {
        const containerRect = galleryContainer.getBoundingClientRect();
        const containerCenter = containerRect.width / 2; // Center of the visible container

        const allImageCards = galleryGrid.querySelectorAll('.image-card');
        const scrollOffset = galleryGrid.scrollLeft; // Current scroll position of the grid

        allImageCards.forEach(card => {
            // Calculate the center of the card relative to the galleryGrid's *scrollable content*
            const cardCenterInScroll = card.offsetLeft + card.offsetWidth / 2;

            // Calculate the distance from the *visible center of the container*
            const distanceToCenter = Math.abs((cardCenterInScroll - scrollOffset) - containerCenter);

            // Normalize distance to a 0-1 range (0 at center, 1 at max effective distance)
            const normalizationFactor = containerRect.width / 2 + card.offsetWidth;
            const normalizedDistance = Math.min(1, distanceToCenter / normalizationFactor);

            // Apply scale: larger at center (1.15), smaller at edges (down to 0.9)
            const scaleFactor = 1.15 - (normalizedDistance * 0.25); // 1.15 - (1 * 0.25) = 0.9
            // Apply translateZ: closer at center (0px), further back at edges (up to -100px)
            const translateZValue = -normalizedDistance * 100; // Pushes back up to 100px

            // Apply blur: 0px at center, up to 2px at edges (reduced from 5px)
            const blurValue = normalizedDistance * 2; // Max blur of 2px for a subtle effect

            // Apply z-index: higher for closer images, lower for further images
            const zIndexValue = Math.round(100 - (normalizedDistance * 100));

            // Get the title element for this card
            const titleElement = card.querySelector('.image-title');
            if (titleElement) {
                // Calculate title opacity: 1 at center, 0 at edges.
                // Using a power function to make it fade out more naturally and quickly at the edges.
                // Multiplier of 3 for normalizedDistance makes it fade out completely faster.
                const titleOpacity = Math.max(0, 1 - (normalizedDistance * 3)); // Increased multiplier for faster fade-out
                titleElement.style.opacity = titleOpacity;
            }

            card.style.transform = `scale(${scaleFactor}) translateZ(${translateZValue}px)`;
            card.style.filter = `blur(${blurValue}px)`; // Apply blur filter
            card.style.zIndex = zIndexValue;
        });
    }

    // Main animation loop that handles all scrolling and visual updates
    function animateLoop() {
        if (isDragging) {
            // Dragging logic is handled directly in mousemove/touchmove
            // We just need to ensure the loop continues for visual transforms
        } else if (currentVelocity !== 0) {
            // Inertia logic
            currentVelocity *= 0.995; // Apply very less friction

            if (Math.abs(currentVelocity) < 0.1) {
                currentVelocity = 0;
            }
            galleryGrid.scrollLeft -= currentVelocity;
        } else if (hoverDirection !== 0) {
            // Hover scrolling logic
            galleryGrid.scrollLeft += hoverDirection * hoverScrollSpeed;
        }

        // Implement continuous looping for all scroll types
        // If scrolling right and passed the original content, jump back to the start of the original content
        if (galleryGrid.scrollLeft >= originalContentWidth) {
            galleryGrid.scrollLeft = 0;
        }
        // If scrolling left and passed the start of the original content, jump to the start of the duplicated content
        else if (galleryGrid.scrollLeft <= 0) {
            galleryGrid.scrollLeft = originalContentWidth;
        }

        // Apply visual transforms in every frame
        applyVisualTransforms();

        // Request the next frame if any animation is active
        if (isDragging || currentVelocity !== 0 || hoverDirection !== 0) {
            animationFrameId = requestAnimationFrame(animateLoop);
        } else {
            animationFrameId = null; // Stop the loop if nothing is animating
        }
    }

    // Function to start the main animation loop if it's not already running
    function startAnimationLoop() {
        if (!animationFrameId) {
            animationFrameId = requestAnimationFrame(animateLoop);
        }
    }

    // Event listener for mouse down (start of drag)
    galleryContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        galleryContainer.style.cursor = 'grabbing';
        startX = e.pageX - galleryContainer.offsetLeft;
        scrollLeftStart = galleryGrid.scrollLeft;
        lastMouseX = e.pageX;
        lastTime = performance.now();
        currentVelocity = 0; // Reset inertia velocity
        hoverDirection = 0; // Stop hover scroll
        startAnimationLoop(); // Ensure animation loop is running
        e.preventDefault();
    });

    // Event listener for mouse leave (stop drag if mouse leaves container, or stop hover scroll)
    galleryContainer.addEventListener('mouseleave', () => {
        if (isDragging) {
            isDragging = false;
            galleryContainer.style.cursor = 'grab';
        }
        hoverDirection = 0; // Stop hover scroll
    });

    // Event listener for mouse up (end of drag)
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            galleryContainer.style.cursor = 'grab';
        }
    });

    // Event listener for mouse move (during drag or for hover)
    document.addEventListener('mousemove', (e) => {
        const currentTime = performance.now();
        const currentMouseX = e.pageX;

        if (isDragging) {
            e.preventDefault();

            const deltaX = currentMouseX - lastMouseX;
            const deltaTime = currentTime - lastTime;

            if (deltaTime > 0) { // Avoid division by zero
                currentVelocity = deltaX / deltaTime;
            } else {
                currentVelocity = 0;
            }

            const x = currentMouseX - galleryContainer.offsetLeft;
            const walk = (x - startX);

            galleryGrid.scrollLeft = scrollLeftStart - walk;

            lastMouseX = currentMouseX;
            lastTime = currentTime;
            startAnimationLoop(); // Keep loop running during drag
        } else {
            // Not dragging, check for hover scrolling
            const rect = galleryContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const hoverZoneWidth = rect.width * 0.2; // 20% from each side

            if (x < hoverZoneWidth) {
                hoverDirection = -1; // Scroll left
                startAnimationLoop();
            } else if (x > rect.width - hoverZoneWidth) {
                hoverDirection = 1; // Scroll right
                startAnimationLoop();
            } else {
                hoverDirection = 0; // Stop hover scroll
            }
        }
    });

    // Add touch event listeners for mobile compatibility
    let touchStartX = 0;
    let touchScrollLeftStart = 0;
    let touchLastX = 0;
    let touchLastTime = 0;
    let touchVelocity = 0; // Separate velocity for touch inertia

    galleryContainer.addEventListener('touchstart', (e) => {
        isDragging = true;
        touchStartX = e.touches[0].pageX - galleryContainer.offsetLeft;
        touchScrollLeftStart = galleryGrid.scrollLeft;
        touchLastX = e.touches[0].pageX;
        touchLastTime = performance.now();
        currentVelocity = 0; // Reset mouse inertia
        touchVelocity = 0; // Reset touch inertia
        hoverDirection = 0; // Stop hover scroll
        startAnimationLoop(); // Ensure animation loop is running
        e.preventDefault();
    }, { passive: false });

    galleryContainer.addEventListener('touchend', () => {
        if (isDragging) {
            isDragging = false;
            currentVelocity = touchVelocity; // Transfer touch velocity to main velocity for inertia
        }
    });

    galleryContainer.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault();

        const currentTime = performance.now();
        const currentTouchX = e.touches[0].pageX;

        const deltaX = currentTouchX - touchLastX;
        const deltaTime = currentTime - touchLastTime;

        if (deltaTime > 0) {
            touchVelocity = deltaX / deltaTime; // Calculate touch velocity
        } else {
            touchVelocity = 0;
        }

        const x = currentTouchX - galleryContainer.offsetLeft;
        const walk = (x - touchStartX);

        galleryGrid.scrollLeft = touchScrollLeftStart - walk;

        touchLastX = currentTouchX;
        touchLastTime = currentTime;
        startAnimationLoop(); // Keep loop running during touch drag
    }, { passive: false });

    // Debounce function for resize
    function debounce(func, delay) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }

    // Recalculate and apply transforms on resize
    window.addEventListener('resize', debounce(calculateAndApplyTransforms, 200));

    // Initial setup on load
    calculateAndApplyTransforms();
    // Start the animation loop initially for any potential initial transforms
    startAnimationLoop();
});