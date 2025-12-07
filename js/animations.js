// animations.js - Enhanced scroll animations for Tima Sara Hotel

// Register ScrollTrigger plugin
gsap.registerPlugin(ScrollTrigger);

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {

    // ==================================
    // FADE IN ON SCROLL - Room Cards, Dining Cards, Experience Cards
    // ==================================
    gsap.utils.toArray('.room-detail-card, .experience-card, .dining-card').forEach(card => {
        gsap.fromTo(card, 
            {
                opacity: 0,
                y: 80,
                scale: 0.95
            },
            {
                scrollTrigger: {
                    trigger: card,
                    start: 'top 90%',
                    end: 'top 60%',
                    toggleActions: 'play none none reverse',
                    // markers: true  // Uncomment to see trigger points
                },
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 1.2,
                ease: 'power3.out'
            }
        );
    });

    // ==================================
    // STAGGERED GALLERY ANIMATIONS
    // ==================================
    if (document.querySelector('.gallery-grid')) {
        gsap.fromTo('.gallery-item',
            {
                opacity: 0,
                y: 60,
                scale: 0.9
            },
            {
                scrollTrigger: {
                    trigger: '.gallery-grid',
                    start: 'top 80%'
                },
                opacity: 1,
                y: 0,
                scale: 1,
                stagger: 0.1,
                duration: 0.8,
                ease: 'back.out(1.2)'
            }
        );
    }

    // ==================================
    // FADE IN FEATURE CARDS (Homepage)
    // ==================================
    gsap.utils.toArray('.home-feature-card').forEach((card, index) => {
        gsap.fromTo(card,
            {
                opacity: 0,
                y: 100,
                scale: 0.9
            },
            {
                scrollTrigger: {
                    trigger: card,
                    start: 'top 85%',
                    toggleActions: 'play none none reverse'
                },
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 1,
                delay: index * 0.2,
                ease: 'power3.out'
            }
        );
    });

    // ==================================
    // HERO PARALLAX EFFECT
    // ==================================
    if (document.querySelector('.hero-homepage')) {
        gsap.to('.hero-homepage', {
            scrollTrigger: {
                trigger: '.hero-homepage',
                start: 'top top',
                end: 'bottom top',
                scrub: 2
            },
            backgroundPositionY: '40%',
            ease: 'none'
        });
    }

    // ==================================
    // PAGE HERO PARALLAX (Internal pages)
    // ==================================
    if (document.querySelector('.page-hero')) {
        gsap.to('.page-hero', {
            scrollTrigger: {
                trigger: '.page-hero',
                start: 'top top',
                end: 'bottom top',
                scrub: 1.5
            },
            backgroundPositionY: '60%',
            ease: 'none'
        });
    }

    // ==================================
    // CONTACT CARDS ANIMATION
    // ==================================
    gsap.utils.toArray('.contact-card').forEach((card, index) => {
        gsap.fromTo(card,
            {
                opacity: 0,
                y: 50,
                rotateX: -15
            },
            {
                scrollTrigger: {
                    trigger: card,
                    start: 'top 85%'
                },
                opacity: 1,
                y: 0,
                rotateX: 0,
                duration: 0.9,
                delay: index * 0.2,
                ease: 'power2.out'
            }
        );
    });

    // ==================================
    // SECTION HEADINGS FADE IN
    // ==================================
    gsap.utils.toArray('.rooms-intro, .dining-intro, .experiences-intro, .gallery-intro').forEach(intro => {
        gsap.fromTo(intro,
            {
                opacity: 0,
                y: 40
            },
            {
                scrollTrigger: {
                    trigger: intro,
                    start: 'top 85%'
                },
                opacity: 1,
                y: 0,
                duration: 1,
                ease: 'power2.out'
            }
        );
    });

    // ==================================
    // BOOKING SUMMARY STICKY ANIMATION
    // ==================================
    if (document.querySelector('.booking-summary')) {
        gsap.fromTo('.booking-summary',
            {
                opacity: 0,
                x: 80,
                scale: 0.95
            },
            {
                scrollTrigger: {
                    trigger: '.booking-summary',
                    start: 'top 80%'
                },
                opacity: 1,
                x: 0,
                scale: 1,
                duration: 1.2,
                ease: 'power3.out'
            }
        );
    }

    console.log('🎨 GSAP Animations loaded successfully!');
    console.log('📊 Total animations:', ScrollTrigger.getAll().length);

}); // End DOMContentLoaded