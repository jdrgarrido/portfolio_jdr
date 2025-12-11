import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// --- Escena Three.js (Fondo vivo) ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0d0d);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 30;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
const isMobile = matchMedia('(max-width: 768px)').matches;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.25 : 1.6)); // Evita sobrecargar móviles
document.body.appendChild(renderer.domElement);

// Controles suaves (solo ligera órbita para ambient)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 18;
controls.maxDistance = 42;
controls.maxPolarAngle = Math.PI * 0.6;

// Post-proceso: bloom ligero
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.4, 0.85);
bloomPass.threshold = 0.12;
bloomPass.strength = isMobile ? 0.45 : 0.65;
bloomPass.radius = 0.8;
composer.addPass(renderPass);
composer.addPass(bloomPass);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xffffff, 1);
pointLight.position.set(20, 20, 20);
scene.add(pointLight);

const rimLight = new THREE.PointLight(0x0088ff, 2);
rimLight.position.set(-20, 10, -20);
scene.add(rimLight);

// Luz cálida que sigue al avatar
const followerLight = new THREE.PointLight(0xffb87a, 0.8, 120, 2);
followerLight.position.set(0, 5, 8);
scene.add(followerLight);

// Estrellas simples
const starGeometry = new THREE.BufferGeometry();
const starCount = 600;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    starPositions[i * 3 + 0] = (Math.random() - 0.5) * 120;
    starPositions[i * 3 + 1] = (Math.random() - 0.5) * 80;
    starPositions[i * 3 + 2] = (Math.random() - 0.5) * 120 - 10;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.25, sizeAttenuation: true, transparent: true, opacity: 0.8 });
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// Sparkles suaves
const sparkleGeometry = new THREE.BufferGeometry();
const sparkleCount = 120;
const sparklePositions = new Float32Array(sparkleCount * 3);
for (let i = 0; i < sparkleCount; i++) {
    sparklePositions[i * 3 + 0] = (Math.random() - 0.5) * 60;
    sparklePositions[i * 3 + 1] = Math.random() * 30;
    sparklePositions[i * 3 + 2] = (Math.random() - 0.5) * 60 - 12;
}
sparkleGeometry.setAttribute('position', new THREE.BufferAttribute(sparklePositions, 3));
const sparkleMaterial = new THREE.PointsMaterial({ color: 0x6aa9ff, size: 0.35, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
const sparkles = new THREE.Points(sparkleGeometry, sparkleMaterial);
scene.add(sparkles);

// Estrellas fugaces
const shootingStars = [];
let shootTimer = 0;
function spawnShootingStar() {
    const geo = new THREE.PlaneGeometry(2.2, 0.12);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.z = THREE.MathUtils.degToRad(-25 + Math.random() * 10);
    mesh.position.set(40, 18 + Math.random() * 10, -12 + Math.random() * 8);
    const speed = 18 + Math.random() * 8;
    const dir = new THREE.Vector3(-1, -0.35 - Math.random() * 0.2, -0.08).normalize().multiplyScalar(speed);
    shootingStars.push({ mesh, dir, life: 1.6 });
    scene.add(mesh);
}

// Mouse influence para rotación sutil
let mouseX = 0;
let mouseY = 0;
document.addEventListener('mousemove', (event) => {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
});

// --- Capa interactiva del avatar ---
const playfield = document.getElementById('playfield');
const avatar = document.getElementById('avatar');
const hotspots = Array.from(document.querySelectorAll('.hotspot'));
const cards = Array.from(document.querySelectorAll('.card'));
const help = document.getElementById('help');
const modal = document.getElementById('modal');
const modalTitle = modal?.querySelector('.modal-title');
const modalBody = modal?.querySelector('.modal-body');
const lightbox = document.getElementById('lightbox');
const lightboxImg = lightbox?.querySelector('.lightbox__image');
const lightboxCaption = lightbox?.querySelector('.lightbox__caption');
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, w: false, a: false, s: false, d: false };
let lastHotspot = null;

const fieldRect = playfield?.getBoundingClientRect();
const avatarPos = {
    x: fieldRect ? fieldRect.width * 0.5 : window.innerWidth * 0.5,
    y: fieldRect ? fieldRect.height * 0.62 : window.innerHeight * 0.62,
};
const baseY = avatarPos.y;
const speed = 320; // px/s
let vel = { x: 0, y: 0 };
let frameIndex = 0;
let frameTime = 0;
const frameDuration = 0.09; // seconds per frame
let lastDir = 'right';
let lastHotspotId = null;
let stepAccumulator = 0;
let activeModal = null;
let lightboxOpen = false;

const SPRITE_URL = '/img/javid_pixelart.png';

// Portales (monolitos) inspirados en la versión r3f
const portalDefs = [
    { id: '#about', x: -18, color: 0x5cf7d0 },
    { id: '#projects', x: 0, color: 0xff7be6 },
    { id: '#contact', x: 18, color: 0xffc04d },
];
const portals = [];

function createPortal({ id, x, color }) {
    const group = new THREE.Group();
    group.position.set(x * 0.7, -4, -14);

    const geo = new THREE.OctahedronGeometry(3, 0);
    const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, wireframe: true, roughness: 0.2, metalness: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.target = id;
    group.add(mesh);

    const light = new THREE.PointLight(color, 1.5, 40, 2.2);
    light.position.set(0, 6, 0);
    group.add(light);

    const ringGeo = new THREE.RingGeometry(3.2, 3.8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -5;
    group.add(ring);

    portals.push({ group, mesh, ring, target: id });
    scene.add(group);
}

portalDefs.forEach(createPortal);

async function buildSpriteSheet() {
    if (!avatar) return;
    const frames = 6;
    const img = new Image();
    img.src = SPRITE_URL;
    await img.decode();

    // Escalamos la imagen de origen para que el avatar no sea gigante
    const scale = 0.5;
    const frameWidth = Math.max(96, Math.round(img.width * scale));
    const frameHeight = Math.max(128, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = frameWidth * frames;
    canvas.height = frameHeight;
    const ctx = canvas.getContext('2d');

    // Offsets para simular paso: centro, subida, caída, cruce de pies
    const offsets = [
        { dx: 0, dy: 0 },
        { dx: 2, dy: -8 },
        { dx: 0, dy: -12 },
        { dx: -2, dy: -8 },
        { dx: 1, dy: -4 },
        { dx: -1, dy: -2 },
    ];

    for (let i = 0; i < frames; i++) {
        const { dx, dy } = offsets[i % offsets.length];
        ctx.drawImage(
            img,
            frameWidth * i + dx,
            dy,
            frameWidth,
            frameHeight
        );
    }

    const dataUrl = canvas.toDataURL('image/png');
    avatar.style.setProperty('--frames', frames);
    avatar.style.setProperty('--frame-w', `${frameWidth}px`);
    avatar.style.setProperty('--frame-h', `${frameHeight}px`);
    avatar.style.backgroundImage = `url(${dataUrl})`;
    avatar.style.backgroundSize = `${frameWidth * frames}px ${frameHeight}px`;
    avatar.dataset.frameWidth = frameWidth;
    avatar.dataset.frameHeight = frameHeight;
}

// Audio sutil al tocar nodos
let audioCtx = null;
function ensureAudioCtx() {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    } else if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function playPing() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
}

function playStep() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const baseFreq = 180;
    const jitter = Math.random() * 40 - 20;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(baseFreq + jitter, now);
    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.18);
}

function handleKey(event, isDown) {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (key in keys) {
        keys[key] = isDown;
        ensureAudioCtx();
        if (['ArrowUp', 'ArrowDown'].includes(event.key)) event.preventDefault();
    }
    // Toggle ayuda
    if (event.key === '?' && isDown && help) {
        const hidden = help.style.display === 'none';
        help.style.display = hidden ? 'block' : 'none';
    }
    if (event.code === 'Space' && lastHotspot && isDown) {
        event.preventDefault();
        openModal(lastHotspot.dataset.target);
    }
    if (event.key === 'Escape' && isDown) {
        if (lightboxOpen) closeLightbox();
        else closeModal();
    }
}

document.addEventListener('keydown', (e) => handleKey(e, true));
document.addEventListener('keyup', (e) => handleKey(e, false));
document.addEventListener('pointerdown', () => ensureAudioCtx());
if (modal) {
    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('modal__close')) {
            closeModal();
        }
    });
}

if (lightbox) {
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox || e.target.classList.contains('lightbox__close') || e.target.classList.contains('lightbox__backdrop')) {
            closeLightbox();
        }
    });
}

const captureLinks = Array.from(document.querySelectorAll('.capture-link'));
captureLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const src = link.dataset.capture || link.getAttribute('href');
        const caption = link.dataset.caption || link.textContent || '';
        openLightbox(src, caption);
    });
});
buildSpriteSheet();

function activateHotspot(hotspot) {
    const target = document.querySelector(hotspot.dataset.target);
    if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

const modalContent = {
    '#about': {
        title: 'Sobre mí',
        body: 'Ingeniero en Informática y developer que mezcla 3D, frontend y narrativa. Me gusta prototipar rápido, pulir interacción y optimizar para producción.'
    },
    '#projects': {
        title: 'Proyectos',
        body: 'Portfolio 3D gamificado, labs de animación y shaders, y tooling para builds/deploy sin dolor.'
    },
    '#contact': {
        title: 'Contacto',
        body: '¿Colaboramos? Escríbeme a juanrey.dev@gmail.com o conecta en LinkedIn.'
    },
};

function openModal(targetId) {
    if (!modal || !modalTitle || !modalBody) return;
    const data = modalContent[targetId];
    if (!data) return;
    modalTitle.textContent = data.title;
    modalBody.textContent = data.body;
    modal.classList.add('visible');
    activeModal = targetId;
}

function closeModal() {
    if (!modal) return;
    modal.classList.remove('visible');
    activeModal = null;
}

function openLightbox(src, caption) {
    if (!lightbox || !lightboxImg || !lightboxCaption) return;
    lightboxImg.src = src;
    lightboxImg.alt = caption || 'Captura';
    lightboxCaption.textContent = caption || '';
    lightbox.classList.add('visible');
    lightbox.setAttribute('aria-hidden', 'false');
    lightboxOpen = true;
}

function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('visible');
    lightbox.setAttribute('aria-hidden', 'true');
    lightboxOpen = false;
}

function updateAvatar(delta) {
    if (!avatar || !playfield) return;

    let dx = 0;
    let dy = 0;
    if (keys.ArrowLeft || keys.a) dx -= 1;
    if (keys.ArrowRight || keys.d) dx += 1;
    // Bloqueamos movimiento vertical
    dy = 0;

    // Input normalizado
    if (dx !== 0 || dy !== 0) {
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;
    }

    // Aplicamos aceleración y freno suave
    const accel = 900;
    const damping = 6;
    vel.x += dx * accel * delta;
    vel.y = 0; // sin movimiento vertical
    vel.x -= vel.x * damping * delta;

    // Magnitud limitada
    const maxSpeed = speed;
    const mag = Math.hypot(vel.x, vel.y);
    if (mag > maxSpeed) {
        vel.x = (vel.x / mag) * maxSpeed;
        vel.y = (vel.y / mag) * maxSpeed;
    }

    avatarPos.x += vel.x * delta;
    avatarPos.y = baseY;

    const moving = Math.hypot(vel.x, vel.y) > 5;
    avatar.classList.toggle('walking', moving);

    if (moving) {
        frameTime += delta;
        stepAccumulator += delta;
        if (frameTime >= frameDuration) {
            frameTime = 0;
            frameIndex = (frameIndex + 1) % parseInt(avatar.dataset.frames || 6, 10);
        }
        // Pasos cada ~0.32s para que suene natural
        if (stepAccumulator >= 0.32) {
            stepAccumulator = 0;
            playStep();
        }
        if (vel.x < -2) lastDir = 'left';
        if (vel.x > 2) lastDir = 'right';
    } else {
        frameIndex = 0;
        stepAccumulator = 0;
    }

    const padding = 40;
    const rect = playfield.getBoundingClientRect();
    avatarPos.x = Math.max(padding, Math.min(rect.width - padding, avatarPos.x));
    avatarPos.y = baseY;

    const tilt = Math.max(-6, Math.min(6, vel.x * 0.02));
    avatar.style.transform = `translate(${avatarPos.x}px, ${avatarPos.y}px) translate(-50%, -50%) scaleX(${lastDir === 'left' ? -1 : 1}) rotate(${tilt}deg)`;
    const frameWidth = parseInt(avatar.dataset.frameWidth || 128, 10);
    const frames = parseInt(avatar.dataset.frames || 6, 10);
    const offsetX = -(frameIndex * frameWidth);
    avatar.style.backgroundPosition = `${offsetX}px 0px`;
    checkHotspots();
}

function checkHotspots() {
    if (!avatar) return;
    const ar = avatar.getBoundingClientRect();
    // Ampliamos hitbox para que sea más fácil activar el nodo
    const avatarRect = {
        left: ar.left - 10,
        right: ar.right + 10,
        top: ar.top - 10,
        bottom: ar.bottom + 10,
    };
    lastHotspot = null;

    let enteredId = null;

    hotspots.forEach((h) => {
        const rect = h.getBoundingClientRect();
        const overlap = !(
            rect.right < avatarRect.left ||
            rect.left > avatarRect.right ||
            rect.bottom < avatarRect.top ||
            rect.top > avatarRect.bottom
        );
        h.classList.toggle('active', overlap);
        if (overlap) {
            lastHotspot = h;
            enteredId = h.dataset.target;
        }
    });

    // Resaltar cards vinculadas
    cards.forEach((card) => {
        card.classList.toggle('active', `#${card.id}` === enteredId);
    });

    if (enteredId && enteredId !== lastHotspotId) {
        ensureAudioCtx();
        playPing();
        lastHotspotId = enteredId;
    }
    if (!enteredId) {
        lastHotspotId = null;
    }
}

// --- Responsividad ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    const mobile = matchMedia('(max-width: 768px)').matches;
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.6));
    composer.setSize(window.innerWidth, window.innerHeight);

    if (playfield) {
        const rect = playfield.getBoundingClientRect();
        const padding = 40;
        avatarPos.x = Math.max(padding, Math.min(rect.width - padding, avatarPos.x));
        avatarPos.y = Math.max(padding, Math.min(rect.height - padding, avatarPos.y));
    }
});

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    if (document.hidden) return; // Pausa si la pestaña está oculta
    const delta = clock.getDelta();

    // Suave deriva del campo de estrellas
    stars.rotation.y += 0.0006;
    sparkles.rotation.y -= 0.0004;

    // Estrellas fugaces
    shootTimer -= delta;
    if (shootTimer <= 0) {
        spawnShootingStar();
        shootTimer = 4 + Math.random() * 5;
    }

    for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        s.mesh.position.addScaledVector(s.dir, delta);
        s.life -= delta;
        s.mesh.material.opacity = Math.max(0, s.life / 1.6);
        if (s.life <= 0) {
            scene.remove(s.mesh);
            shootingStars.splice(i, 1);
        }
    }

    rimLight.position.x = -20 + Math.sin(clock.elapsedTime * 0.5) * 6;
    rimLight.position.y = 10 + Math.cos(clock.elapsedTime * 0.4) * 2;

    // Animación de portales
    portals.forEach(({ group, mesh, ring }) => {
        const t = clock.elapsedTime;
        group.position.y = -4 + Math.sin(t * 0.8) * 0.8;
        mesh.rotation.y += 0.01;
        ring.rotation.z += 0.004;
    });

    controls.update();

    // Luz cálida sigue al avatar en Z cercano
    followerLight.position.lerp(new THREE.Vector3(avatarPos.x * 0.02 - 10, 4, 8), 0.08);

    updateAvatar(delta);
    composer.render();
}

animate();