/* ============================================
   FIROJ — 3D Portfolio | Main Script
   Three.js + GSAP + Interactivity
   ============================================ */

(() => {
    'use strict';

    // ── Utility Helpers ──
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
    const lerp = (a, b, t) => a + (b - a) * t;

    // ── State ──
    const state = {
        mouse: { x: 0, y: 0, nx: 0, ny: 0 },
        scroll: 0,
        theme: localStorage.getItem('theme') || 'dark',
        isMobile: window.innerWidth < 768,
    };

    // ────────────────────────────────────
    //  1. THREE.JS — Neural Background
    // ────────────────────────────────────

    class NeuralBackground {
        constructor() {
            this.canvas = $('#three-canvas');
            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.position.z = 30;
            this.clock = new THREE.Clock();
            this.particles = null;
            this.connections = null;
            this.heroSphere = null;
            this.init();
        }

        init() {
            this.createParticles();
            this.createHeroSphere();
            this.animate();
            window.addEventListener('resize', () => this.onResize());
        }

        createParticles() {
            const count = state.isMobile ? 300 : 800;
            const positions = new Float32Array(count * 3);
            const colors = new Float32Array(count * 3);
            const sizes = new Float32Array(count);
            const velocities = [];

            for (let i = 0; i < count; i++) {
                const i3 = i * 3;
                positions[i3] = (Math.random() - 0.5) * 80;
                positions[i3 + 1] = (Math.random() - 0.5) * 80;
                positions[i3 + 2] = (Math.random() - 0.5) * 60;

                // Navy-teal accent colors
                const mix = Math.random();
                colors[i3] = lerp(0.04, 0.39, mix);      // R
                colors[i3 + 1] = lerp(0.1, 1.0, mix);    // G
                colors[i3 + 2] = lerp(0.18, 0.85, mix);  // B

                sizes[i] = Math.random() * 2 + 0.5;

                velocities.push({
                    x: (Math.random() - 0.5) * 0.015,
                    y: (Math.random() - 0.5) * 0.015,
                    z: (Math.random() - 0.5) * 0.01,
                });
            }

            this.particleVelocities = velocities;

            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

            // Vertex shader for round particles
            const vertexShader = `
                attribute float size;
                varying vec3 vColor;
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (200.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `;
            const fragmentShader = `
                varying vec3 vColor;
                void main() {
                    float d = length(gl_PointCoord - vec2(0.5));
                    if (d > 0.5) discard;
                    float alpha = 1.0 - smoothstep(0.3, 0.5, d);
                    gl_FragColor = vec4(vColor, alpha * 0.7);
                }
            `;

            const mat = new THREE.ShaderMaterial({
                vertexShader, fragmentShader,
                vertexColors: true,
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
            });

            this.particles = new THREE.Points(geo, mat);
            this.scene.add(this.particles);

            // Connection lines
            this.createConnections(positions, count);
        }

        createConnections(positions, count) {
            const linePositions = [];
            const lineColors = [];
            const maxDist = 8;
            const maxConnections = state.isMobile ? 200 : 600;
            let connCount = 0;

            for (let i = 0; i < count && connCount < maxConnections; i++) {
                for (let j = i + 1; j < count && connCount < maxConnections; j++) {
                    const dx = positions[i * 3] - positions[j * 3];
                    const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                    const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    if (dist < maxDist) {
                        linePositions.push(
                            positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
                            positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
                        );
                        const alpha = 1 - dist / maxDist;
                        lineColors.push(0.39, 1.0, 0.85, 0.39, 1.0, 0.85);
                        connCount++;
                    }
                }
            }

            const lineGeo = new THREE.BufferGeometry();
            lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
            lineGeo.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));

            const lineMat = new THREE.LineBasicMaterial({
                vertexColors: true,
                transparent: true,
                opacity: 0.08,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });

            this.connections = new THREE.LineSegments(lineGeo, lineMat);
            this.scene.add(this.connections);
        }

        createHeroSphere() {
            const group = new THREE.Group();

            // Wireframe icosahedron (brain-like)
            const icoGeo = new THREE.IcosahedronGeometry(5, 2);
            const icoMat = new THREE.MeshBasicMaterial({
                color: 0x64ffda,
                wireframe: true,
                transparent: true,
                opacity: 0.15,
            });
            const ico = new THREE.Mesh(icoGeo, icoMat);
            group.add(ico);

            // Inner glowing sphere
            const innerGeo = new THREE.SphereGeometry(4, 32, 32);
            const innerMat = new THREE.MeshBasicMaterial({
                color: 0x0a192f,
                transparent: true,
                opacity: 0.4,
            });
            const inner = new THREE.Mesh(innerGeo, innerMat);
            group.add(inner);

            // Orbit ring 1
            const ring1Geo = new THREE.TorusGeometry(6.5, 0.04, 16, 100);
            const ring1Mat = new THREE.MeshBasicMaterial({ color: 0x64ffda, transparent: true, opacity: 0.3 });
            const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
            ring1.rotation.x = Math.PI / 3;
            group.add(ring1);

            // Orbit ring 2
            const ring2Geo = new THREE.TorusGeometry(7.5, 0.03, 16, 100);
            const ring2Mat = new THREE.MeshBasicMaterial({ color: 0x64ffda, transparent: true, opacity: 0.15 });
            const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
            ring2.rotation.x = -Math.PI / 4;
            ring2.rotation.y = Math.PI / 5;
            group.add(ring2);

            // Node dots on surface
            const nodeCount = 40;
            const nodeGeo = new THREE.SphereGeometry(0.1, 8, 8);
            const nodeMat = new THREE.MeshBasicMaterial({ color: 0x64ffda });

            for (let i = 0; i < nodeCount; i++) {
                const phi = Math.acos(2 * Math.random() - 1);
                const theta = 2 * Math.PI * Math.random();
                const r = 5;
                const node = new THREE.Mesh(nodeGeo, nodeMat.clone());
                node.position.set(
                    r * Math.sin(phi) * Math.cos(theta),
                    r * Math.sin(phi) * Math.sin(theta),
                    r * Math.cos(phi)
                );
                node.material.transparent = true;
                node.material.opacity = 0.4 + Math.random() * 0.6;
                group.add(node);
            }

            // Position the sphere to the right for desktop
            if (!state.isMobile) {
                group.position.set(12, 0, 0);
            } else {
                group.position.set(0, 8, 0);
                group.scale.set(0.7, 0.7, 0.7);
            }

            this.heroSphere = group;
            this.scene.add(group);

            // Store base opacity for scroll-based fading
            group.traverse(child => {
                if (child.material && child.material.transparent) {
                    child.userData.baseOpacity = child.material.opacity;
                }
            });
        }

        animate() {
            requestAnimationFrame(() => this.animate());
            const t = this.clock.getElapsedTime();

            // Rotate particles gently
            if (this.particles) {
                const pos = this.particles.geometry.attributes.position.array;
                const count = pos.length / 3;
                for (let i = 0; i < count; i++) {
                    pos[i * 3] += this.particleVelocities[i].x;
                    pos[i * 3 + 1] += this.particleVelocities[i].y;
                    pos[i * 3 + 2] += this.particleVelocities[i].z;

                    // Wrap around
                    if (Math.abs(pos[i * 3]) > 40) this.particleVelocities[i].x *= -1;
                    if (Math.abs(pos[i * 3 + 1]) > 40) this.particleVelocities[i].y *= -1;
                    if (Math.abs(pos[i * 3 + 2]) > 30) this.particleVelocities[i].z *= -1;
                }
                this.particles.geometry.attributes.position.needsUpdate = true;
            }

            // Animate hero sphere — fade out as user scrolls
            if (this.heroSphere) {
                this.heroSphere.rotation.y = t * 0.15;
                this.heroSphere.rotation.x = Math.sin(t * 0.1) * 0.15;

                // Respond to mouse
                const targetY = -state.mouse.ny * 0.3;
                this.heroSphere.rotation.x += (targetY - this.heroSphere.rotation.x) * 0.01;

                // Scroll-based fade and move
                const scrollY = window.scrollY;
                const heroH = window.innerHeight;
                const scrollRatio = Math.min(scrollY / (heroH * 0.6), 1);
                const opacity = 1 - scrollRatio;

                this.heroSphere.traverse(child => {
                    if (child.material && child.userData.baseOpacity !== undefined) {
                        child.material.opacity = child.userData.baseOpacity * opacity;
                    }
                });

                // Move sphere up as user scrolls
                const baseY = state.isMobile ? 8 : 0;
                this.heroSphere.position.y = baseY + scrollRatio * 15;
            }

            // Camera slight movement based on mouse
            this.camera.position.x = lerp(this.camera.position.x, state.mouse.nx * 2, 0.02);
            this.camera.position.y = lerp(this.camera.position.y, state.mouse.ny * 1, 0.02);
            this.camera.lookAt(0, 0, 0);

            this.renderer.render(this.scene, this.camera);
        }

        onResize() {
            state.isMobile = window.innerWidth < 768;
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }

    // ────────────────────────────────────
    //  2. CURSOR GLOW
    // ────────────────────────────────────

    function initCursorGlow() {
        const glow = $('#cursor-glow');
        if (state.isMobile) return;

        let raf;
        document.addEventListener('mousemove', (e) => {
            state.mouse.x = e.clientX;
            state.mouse.y = e.clientY;
            state.mouse.nx = (e.clientX / window.innerWidth) * 2 - 1;
            state.mouse.ny = -(e.clientY / window.innerHeight) * 2 + 1;

            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => {
                glow.style.left = e.clientX + 'px';
                glow.style.top = e.clientY + 'px';
                glow.style.opacity = '0.15';
            });
        });

        document.addEventListener('mouseleave', () => {
            glow.style.opacity = '0';
        });
    }

    // ────────────────────────────────────
    //  3. TYPING ANIMATION
    // ────────────────────────────────────

    function initTypingAnimation() {
        const phrases = [
            'Python | Machine Learning | Data Analysis',
            'Deep Learning | NLP | Computer Vision',
            'Pandas | NumPy | Scikit-Learn',
            'Building AI that matters.',
        ];
        const el = $('#typing-text');
        let phraseIdx = 0;
        let charIdx = 0;
        let deleting = false;

        function tick() {
            const current = phrases[phraseIdx];
            if (!deleting) {
                el.textContent = current.substring(0, charIdx + 1);
                charIdx++;
                if (charIdx === current.length) {
                    deleting = true;
                    setTimeout(tick, 2000);
                    return;
                }
                setTimeout(tick, 60);
            } else {
                el.textContent = current.substring(0, charIdx - 1);
                charIdx--;
                if (charIdx === 0) {
                    deleting = false;
                    phraseIdx = (phraseIdx + 1) % phrases.length;
                    setTimeout(tick, 400);
                    return;
                }
                setTimeout(tick, 30);
            }
        }
        setTimeout(tick, 1000);
    }

    // ────────────────────────────────────
    //  4. NAVBAR
    // ────────────────────────────────────

    function initNavbar() {
        const navbar = $('#navbar');
        const links = $$('.nav-link');
        const hamburger = $('#nav-hamburger');
        const navMenu = $('#nav-links');
        const sections = $$('.section, .hero-section');

        // Scroll shrink
        window.addEventListener('scroll', () => {
            state.scroll = window.scrollY;
            if (state.scroll > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }

            // Active link tracking
            let current = '';
            sections.forEach(sec => {
                const top = sec.offsetTop - 200;
                if (state.scroll >= top) current = sec.id;
            });

            links.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + current) {
                    link.classList.add('active');
                }
            });
        });

        // Hamburger toggle
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Close menu on link click
        links.forEach(link => {
            link.addEventListener('click', () => {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });
    }

    // ────────────────────────────────────
    //  5. THEME TOGGLE
    // ────────────────────────────────────

    function initTheme() {
        const toggle = $('#theme-toggle');
        const html = document.documentElement;

        html.setAttribute('data-theme', state.theme);

        toggle.addEventListener('click', () => {
            state.theme = state.theme === 'dark' ? 'light' : 'dark';
            html.setAttribute('data-theme', state.theme);
            localStorage.setItem('theme', state.theme);
        });
    }

    // ────────────────────────────────────
    //  6. GSAP ANIMATIONS
    // ────────────────────────────────────

    function initGSAPAnimations() {
        gsap.registerPlugin(ScrollTrigger);

        // Hero entrance
        const heroTl = gsap.timeline({ delay: 0.3 });
        heroTl
            .from('.hero-badge', { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out' })
            .from('.hero-name', { opacity: 0, y: 40, duration: 0.8, ease: 'power3.out' }, '-=0.3')
            .from('.hero-subtitle', { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out' }, '-=0.4')
            .from('.typing-wrapper', { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out' }, '-=0.3')
            .from('.hero-cta', { opacity: 0, y: 20, duration: 0.6, ease: 'power3.out' }, '-=0.3')
            .from('.hero-stats .stat-item', { opacity: 0, y: 20, duration: 0.5, stagger: 0.1, ease: 'power3.out' }, '-=0.3')
            .from('.scroll-indicator', { opacity: 0, y: 10, duration: 0.5, ease: 'power3.out' }, '-=0.2');

        // Section headers
        $$('.section-header').forEach(header => {
            gsap.from(header.children, {
                scrollTrigger: { trigger: header, start: 'top 85%', toggleActions: 'play none none none' },
                opacity: 0, y: 30, duration: 0.6, stagger: 0.15, ease: 'power3.out', clearProps: 'all'
            });
        });

        // About cards
        gsap.from('.about-card', {
            scrollTrigger: { trigger: '.about-grid', start: 'top 80%', toggleActions: 'play none none none' },
            opacity: 0, x: -40, duration: 0.8, ease: 'power3.out', clearProps: 'all'
        });

        gsap.from('.about-mini-card', {
            scrollTrigger: { trigger: '.about-cards-grid', start: 'top 80%', toggleActions: 'play none none none' },
            opacity: 0, y: 30, duration: 0.6, stagger: 0.12, ease: 'power3.out', clearProps: 'all'
        });

        // Skill cards
        gsap.from('.skill-card', {
            scrollTrigger: { trigger: '.skills-grid', start: 'top 80%', toggleActions: 'play none none none' },
            opacity: 0, y: 40, scale: 0.9, duration: 0.5, stagger: 0.06, ease: 'power3.out', clearProps: 'all'
        });

        // Project cards
        gsap.from('.project-card', {
            scrollTrigger: { trigger: '.projects-grid', start: 'top 80%', toggleActions: 'play none none none' },
            opacity: 0, y: 50, duration: 0.7, stagger: 0.15, ease: 'power3.out', clearProps: 'all'
        });

        // Timeline items
        $$('.timeline-item').forEach((item, i) => {
            gsap.from(item, {
                scrollTrigger: { trigger: item, start: 'top 85%', toggleActions: 'play none none none' },
                opacity: 0,
                x: item.dataset.side === 'left' ? -50 : 50,
                duration: 0.8,
                ease: 'power3.out',
                clearProps: 'all'
            });
        });

        // Contact section
        gsap.from('.contact-card', {
            scrollTrigger: { trigger: '.contact-grid', start: 'top 80%', toggleActions: 'play none none none' },
            opacity: 0, y: 30, duration: 0.6, stagger: 0.15, ease: 'power3.out', clearProps: 'all'
        });

        gsap.from('.contact-form', {
            scrollTrigger: { trigger: '.contact-form', start: 'top 85%', toggleActions: 'play none none none' },
            opacity: 0, x: 40, duration: 0.8, ease: 'power3.out', clearProps: 'all'
        });

        gsap.from('.social-links', {
            scrollTrigger: { trigger: '.social-links', start: 'top 90%', toggleActions: 'play none none none' },
            opacity: 0, y: 20, duration: 0.6, ease: 'power3.out', clearProps: 'all'
        });
    }

    // ────────────────────────────────────
    //  7. SKILL BARS ANIMATION
    // ────────────────────────────────────

    function initSkillBars() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const fills = entry.target.querySelectorAll('.skill-fill');
                    fills.forEach(fill => {
                        const level = fill.dataset.level;
                        setTimeout(() => {
                            fill.style.width = level + '%';
                        }, 300);
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        const grid = $('#skills-grid');
        if (grid) observer.observe(grid);
    }

    // ────────────────────────────────────
    //  8. SKILL FILTER TABS
    // ────────────────────────────────────

    function initSkillFilter() {
        const tabs = $$('.skill-tab');
        const cards = $$('.skill-card');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const cat = tab.dataset.category;
                cards.forEach(card => {
                    if (cat === 'all' || card.dataset.category === cat) {
                        card.classList.remove('hidden');
                        gsap.from(card, { opacity: 0, y: 20, scale: 0.95, duration: 0.4, ease: 'power3.out' });
                    } else {
                        card.classList.add('hidden');
                    }
                });
            });
        });
    }

    // ────────────────────────────────────
    //  9. 3D TILT EFFECT ON CARDS
    // ────────────────────────────────────

    function initTiltCards() {
        if (state.isMobile) return;

        $$('[data-tilt]').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const rect = card.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const centerX = rect.width / 2;
                const centerY = rect.height / 2;
                const rotateX = ((y - centerY) / centerY) * -6;
                const rotateY = ((x - centerX) / centerX) * 6;

                card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
                card.style.transition = 'transform 0.1s ease';
            });

            card.addEventListener('mouseleave', () => {
                card.style.transform = 'perspective(800px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
                card.style.transition = 'transform 0.5s ease';
            });
        });
    }

    // ────────────────────────────────────
    //  10. COUNTER ANIMATION
    // ────────────────────────────────────

    function initCounters() {
        const counters = $$('[data-count]');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    const target = parseInt(el.dataset.count, 10);
                    let current = 0;
                    const step = Math.max(1, Math.floor(target / 40));
                    const timer = setInterval(() => {
                        current += step;
                        if (current >= target) {
                            current = target;
                            clearInterval(timer);
                        }
                        el.textContent = current;
                    }, 40);
                    observer.unobserve(el);
                }
            });
        }, { threshold: 0.5 });

        counters.forEach(c => observer.observe(c));
    }

    // ────────────────────────────────────
    //  11. CONTACT FORM
    // ────────────────────────────────────

    function initContactForm() {
        const form = $('#contact-form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;

            btn.innerHTML = '<span>Sent! ✓</span>';
            btn.style.background = 'var(--accent)';

            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
                form.reset();
            }, 2500);
        });
    }

    // ────────────────────────────────────
    //  12. SMOOTH SCROLL
    // ────────────────────────────────────

    function initSmoothScroll() {
        $$('a[href^="#"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(link.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        });
    }

    // ────────────────────────────────────
    //  13. HOVER SOUND (OPTIONAL)
    // ────────────────────────────────────

    function initHoverFeedback() {
        // Subtle visual feedback on interactive elements
        $$('.btn-primary, .btn-secondary, .project-card, .skill-card, .social-icon, .nav-link').forEach(el => {
            el.addEventListener('mouseenter', () => {
                gsap.to(el, { scale: 1.02, duration: 0.2, ease: 'power2.out', overwrite: true });
            });
            el.addEventListener('mouseleave', () => {
                gsap.to(el, { scale: 1, duration: 0.3, ease: 'power2.out', overwrite: true });
            });
        });
    }

    // ────────────────────────────────────
    //  BOOT
    // ────────────────────────────────────

    function boot() {
        new NeuralBackground();
        initCursorGlow();
        initTypingAnimation();
        initNavbar();
        initTheme();
        initGSAPAnimations();
        initSkillBars();
        initSkillFilter();
        initTiltCards();
        initCounters();
        initContactForm();
        initSmoothScroll();
        initHoverFeedback();
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

    // Refresh ScrollTrigger after fonts/images load fully to avoid opacity 0 bugs
    window.addEventListener('load', () => {
        if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.refresh();
        }
    });

    // Handle dynamically added CSS conflict with GSAP
    gsap.config({ force3D: true, nullTargetWarn: false });
})();
