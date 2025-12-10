import * as THREE from 'three';

// 1. LA ESCENA (El Universo)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111); // Fondo oscuro estilo 'Cyberpunk'

// 2. LA CÁMARA (Nuestros Ojos)
// (FOV, Aspect Ratio, Near, Far)
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5; // Nos movemos un poco hacia atrás para ver el objeto

// 3. EL RENDERIZADOR (El Pintor)
const renderer = new THREE.WebGLRenderer({ antialias: true }); // Antialias suaviza los bordes
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement); // Inyectamos el <canvas> al HTML

// 4. EL OBJETO (La Diversión)
// Geometría: Un nudo toroidal (se ve complejo y matemático)
const geometry = new THREE.TorusKnotGeometry(10, 3, 100, 16);

// Material: Wireframe verde neón para ese look "Matrix/Hacker"
const material = new THREE.MeshBasicMaterial({ 
    color: 0x00ff00, 
    wireframe: true 
});

const torusKnot = new THREE.Mesh(geometry, material);
scene.add(torusKnot);

// 5. RESPONSIVIDAD (Para que no se deforme si cambias el tamaño de la ventana)
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 6. EL LOOP DE ANIMACIÓN (El corazón del engine)
function animate() {
    requestAnimationFrame(animate); // Llama a esta función 60 veces por segundo (aprox)

    // Aquí sucede la magia: Rotamos el objeto un poco en cada frame
    torusKnot.rotation.x += 0.01;
    torusKnot.rotation.y += 0.01;

    renderer.render(scene, camera);
}

animate();