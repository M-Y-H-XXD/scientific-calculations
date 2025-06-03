
import { createNoise2D } from 'simplex-noise';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- إعدادات المشهد الأساسية ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// --- تهيئة OrbitControls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // لتمكين حركة كاميرا أكثر سلاسة
controls.dampingFactor = 0.05; // قوة التخميد

// <--- NEW: تعطيل التحريك والتكبير/التصغير بواسطة OrbitControls لنتحكم بها يدوياً
controls.enablePan = false; // تعطيل تحريك الكاميرا بزر الماوس الأيمن
controls.enableZoom = true; // التكبير/التصغير بعجلة الماوس (سنقوم به يدوياً)

controls.screenSpacePanning = false; // ليس له تأثير كبير بعد تعطيل enablePan
controls.maxPolarAngle = Math.PI / 2; // يمنع الكاميرا من الذهاب تحت الأرض
controls.target.set(0, 250, 0); // نقطة التركيز الأولية للدوران
controls.rotateSpeed =0.5;
// --- الأضواء ---
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
directionalLight.position.set(200, 500, 200);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 1000;
directionalLight.shadow.camera.left = -500;
directionalLight.shadow.camera.right = 500;
directionalLight.shadow.camera.top = 500;
directionalLight.shadow.camera.bottom = -500;
scene.add(directionalLight);
renderer.shadowMap.enabled = true;

// --- المواد ---
const skydiverMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5, metalness: 0.1 });
const airplaneMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.7, metalness: 0.3 });
const parachuteMaterial = new THREE.MeshStandardMaterial({ color: 0x00ffff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });

// --- إنشاء الأرض (تضاريس باستخدام Simplex Noise) ---
const terrainWidth = 1000;
const terrainDepth = 1000;
const terrainResolution = 128;
const terrainMaxHeight = 50;

const terrainGeometry = new THREE.PlaneGeometry(terrainWidth, terrainDepth, terrainResolution - 1, terrainResolution - 1);
terrainGeometry.rotateX(-Math.PI / 2);

const noise2D = createNoise2D();

const vertices = terrainGeometry.attributes.position.array;

for (let i = 0, j = 0; i < vertices.length; i++, j += 3) {
    const x = vertices[j];
    const z = vertices[j + 2];
    const noise = noise2D(x / 75, z / 75) * 0.5 + 0.5;
    vertices[j + 1] = noise * terrainMaxHeight;
}
terrainGeometry.computeVertexNormals();

const terrainMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.8, metalness: 0 });
const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
terrain.receiveShadow = true;
scene.add(terrain);

// --- إنشاء المظلي (المكعب) ---
const skydiverGeometry = new THREE.BoxGeometry(2, 2, 2);
const skydiver = new THREE.Mesh(skydiverGeometry, skydiverMaterial);
skydiver.castShadow = true;
skydiver.visible = true;
scene.add(skydiver);

// --- إنشاء المظلة (نموذج مخروطي) ---
const parachuteGeometry = new THREE.ConeGeometry(8, 2, 32);
parachuteGeometry.rotateX(Math.PI);
const parachute = new THREE.Mesh(parachuteGeometry, parachuteMaterial);
parachute.visible = false;
parachute.castShadow = true;
scene.add(parachute);

// --- إنشاء الطائرة (تمثيل بسيط كمكعب) ---
const airplaneGeometry = new THREE.BoxGeometry(15, 4, 4);
const airplane = new THREE.Mesh(airplaneGeometry, airplaneMaterial);
airplane.castShadow = true;
scene.add(airplane);

// --- إعدادات المحاكاة الفيزيائية ---
const G = 9.81;
const RHO = 1.225;
const DT = 0.016;

let skydiverMass = 75;
let skydiverPosition = new THREE.Vector3();

let skydiverVelocity = new THREE.Vector3(0, 0, 0);
let skydiverAcceleration = new THREE.Vector3(0, 0, 0);

let CD_freefall = 0.7;
let A_freefall = 0.8;
let CD_parachute = 1.4;
let A_parachute = 25;

let windSpeed = new THREE.Vector3(5, 0, 0);

let isParachuteOpen = false;
let parachuteOpenAltitude = 100;

let simulationStarted = false;
let airplaneFlying = true;

// إعدادات حركة الطائرة
const airplaneInitialPosition = new THREE.Vector3(0, 500, 300);
const airplaneSpeed = 20;

// تعيين المواقع الأولية للكائنات
airplane.position.copy(airplaneInitialPosition);
skydiver.position.copy(airplaneInitialPosition);
skydiverPosition.copy(airplaneInitialPosition); 

camera.position.set(0, 550, 400); // موضع الكاميرا الأولي

// <--- NEW: إعادة تعريف متغيرات التحكم اليدوية بالكاميرا
const cameraSpeed = 100; // سرعة حركة الكاميرا
const keyState = {
    w: false,
    s: false,
    a: false,
    d: false,
    q: false, // NEW: Q للتحرك لأعلى
    e: false, // NEW: E للتحرك لأسفل
    arrowUp: false, // يمكن إعادة استخدام هذه أو استخدام Q/E
    arrowDown: false // يمكن إعادة استخدام هذه أو استخدام Q/E
};

// --- وظيفة تحديث الفيزياء ---
function updatePhysics() {
    if (simulationStarted) { 
        let currentCD = isParachuteOpen ? CD_parachute : CD_freefall;
        let currentA = isParachuteOpen ? A_parachute : A_freefall;

        const dragMagnitude = 0.5 * RHO * skydiverVelocity.lengthSq() * currentCD * currentA;
        const dragForce = skydiverVelocity.clone().normalize().multiplyScalar(-dragMagnitude);

        const gravityForce = new THREE.Vector3(0, -skydiverMass * G, 0);

        const windForceMagnitude = 0.5 * RHO * windSpeed.lengthSq() * currentCD * A_freefall;
        const windForce = windSpeed.clone().normalize().multiplyScalar(windForceMagnitude);

        const totalForce = new THREE.Vector3();
        totalForce.add(gravityForce);
        totalForce.add(dragForce);
        totalForce.add(windForce);
        skydiverAcceleration.copy(totalForce).divideScalar(skydiverMass);

        skydiverVelocity.add(skydiverAcceleration.clone().multiplyScalar(DT));
        skydiverPosition.add(skydiverVelocity.clone().multiplyScalar(DT));

        skydiver.position.copy(skydiverPosition);

        if (isParachuteOpen) {
            parachute.position.copy(skydiverPosition).add(new THREE.Vector3(0, 5, 0));
            parachute.rotation.y += 0.05;
        }

        const groundHeightAtSkydiver = getTerrainHeight(skydiverPosition.x, skydiverPosition.z);
        if (skydiverPosition.y <= groundHeightAtSkydiver) {
            skydiverPosition.y = groundHeightAtSkydiver;
            skydiverVelocity.set(0, 0, 0);
            skydiverAcceleration.set(0, 0, 0);
            simulationStarted = false;
            console.log("Skydiver landed safely!");
            parachute.visible = false;
            skydiver.material.color.set(0x00ff00);
        }
    }
}

function getTerrainHeight(x, z) {
    const halfWidth = terrainWidth / 2;
    const halfDepth = terrainDepth / 2;

    const ix = Math.floor((x + halfWidth) / (terrainWidth / (terrainResolution - 1)));
    const iz = Math.floor((z + halfDepth) / (terrainDepth / (terrainResolution - 1)));

    if (ix < 0 || ix >= terrainResolution || iz < 0 || iz >= terrainResolution) {
        return 0;
    }

    const vertexIndex = (iz * terrainResolution + ix) * 3 + 1;

    if (vertexIndex < 0 || vertexIndex >= vertices.length) return 0;

    return vertices[vertexIndex] + terrain.position.y;
}

// <--- NEW: إعادة دالة updateCameraPosition لتتحكم في الحركة
function updateCameraPosition() {
    // الحصول على اتجاهات الكاميرا (أمام، يمين، أعلى)
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection); // الاتجاه الذي تنظر إليه الكاميرا (الأمام)

    const right = new THREE.Vector3();
    right.crossVectors(cameraDirection, camera.up); // اتجاه يمين الكاميرا
    right.normalize(); // تأكد من أنه متجه وحدة

    // الأمام/الخلف (W/S)
    if (keyState.w) {
        camera.position.addScaledVector(cameraDirection, cameraSpeed * DT);
        controls.target.addScaledVector(cameraDirection, cameraSpeed * DT); // <--- NEW: تحريك نقطة التركيز مع الكاميرا
    }
    if (keyState.s) {
        camera.position.addScaledVector(cameraDirection, -cameraSpeed * DT);
        controls.target.addScaledVector(cameraDirection, -cameraSpeed * DT); // <--- NEW: تحريك نقطة التركيز مع الكاميرا
    }

    // اليمين/اليسار (D/A)
    if (keyState.d) {
        camera.position.addScaledVector(right, cameraSpeed * DT);
        controls.target.addScaledVector(right, cameraSpeed * DT); // <--- NEW: تحريك نقطة التركيز مع الكاميرا
    }
    if (keyState.a) {
        camera.position.addScaledVector(right, -cameraSpeed * DT);
        controls.target.addScaledVector(right, -cameraSpeed * DT); // <--- NEW: تحريك نقطة التركيز مع الكاميرا
    }

    // الأعلى/الأسفل (Q/E أو ArrowUp/ArrowDown)
    if (keyState.q || keyState.arrowUp) { // يمكن استخدام Q أو السهم الأعلى
        camera.position.y += cameraSpeed * DT;
        controls.target.y += cameraSpeed * DT; // <--- NEW: تحريك نقطة التركيز مع الكاميرا
    }
    if (keyState.e || keyState.arrowDown) { // يمكن استخدام E أو السهم الأسفل
        camera.position.y -= cameraSpeed * DT;
        controls.target.y -= cameraSpeed * DT; // <--- NEW: تحريك نقطة التركيز مع الكاميرا
    }
}


// --- حلقة الرسوميات ---
function animate() {
    requestAnimationFrame(animate);

    // حركة الطائرة والمظلي قبل القفز
    if (airplaneFlying) { 
        airplane.position.z -= airplaneSpeed * DT;
        if (!simulationStarted) { 
            skydiver.position.copy(airplane.position);
            skydiverPosition.copy(airplane.position);
        }
    }

    updatePhysics();

    updateCameraPosition(); // <--- NEW: استدعاء دالة تحديث الكاميرا اليدوية
    controls.update(); // <--- مهم جداً: تحديث OrbitControls في كل إطار (بعد تحديث الموضع اليدوي)
    
    renderer.render(scene, camera);
}

animate();

// --- عناصر التحكم باللوحة المفاتيح (مستمعي الأحداث) ---
document.addEventListener('keydown', (event) => {
    // <--- NEW: إعادة قسم التحكم بالكاميرا
    switch (event.key.toLowerCase()) {
        case 'w':
            keyState.w = true;
            break;
        case 's':
            keyState.s = true;
            break;
        case 'a':
            keyState.a = true;
            break;
        case 'd':
            keyState.d = true;
            break;
        case 'q': // جديد: Q للأعلى
            keyState.q = true;
            break;
        case 'e': // جديد: E للأسفل
            keyState.e = true;
            break;
        case 'arrowup': // لا يزال يعمل
            keyState.arrowUp = true;
            break;
        case 'arrowdown': // لا يزال يعمل
            keyState.arrowDown = true;
            break;
    }

    // الزر 'f' للقفز (Jump)
    if (event.key === 'f' || event.key === 'F') {
        if (!simulationStarted) { 
            simulationStarted = true;
            // airplaneFlying = false; 
            // airplane.visible = false; 
            console.log("Skydiver jumped!");
            skydiverVelocity.z = -airplaneSpeed; 
            skydiverVelocity.x = 0; 
        }
    }

    // الزر 'o' لفتح المظلة (Open Parachute)
    if (event.key === 'o' || event.key === 'O') {
        if (simulationStarted && !isParachuteOpen) { 
            isParachuteOpen = true;
            parachute.visible = true;
            skydiver.material.color.set(0x0000ff);
            console.log("Parachute opened!");
        }
    }
});

document.addEventListener('keyup', (event) => {
    // <--- NEW: إعادة قسم التحكم بالكاميرا
    switch (event.key.toLowerCase()) {
        case 'w':
            keyState.w = false;
            break;
        case 's':
            keyState.s = false;
            break;
        case 'a':
            keyState.a = false;
            break;
        case 'd':
            keyState.d = false;
            break;
        case 'q':
            keyState.q = false;
            break;
        case 'e':
            keyState.e = false;
            break;
        case 'arrowup':
            keyState.arrowUp = false;
            break;
        case 'arrowdown':
            keyState.arrowDown = false;
            break;
    }
});


// --- التعامل مع تغيير حجم النافذة ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
