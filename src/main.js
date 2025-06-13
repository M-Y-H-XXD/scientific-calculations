
// import { createNoise2D } from 'simplex-noise';
// import * as THREE from 'three';
// import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// // --- إعدادات المشهد الأساسية ---
// const scene = new THREE.Scene();
// const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
// const renderer = new THREE.WebGLRenderer({ antialias: true }); 
// renderer.setSize(window.innerWidth, window.innerHeight);
// renderer.setPixelRatio(window.devicePixelRatio);
// renderer.outputColorSpace = THREE.SRGBColorSpace;
// document.body.appendChild(renderer.domElement);

// // --- تهيئة OrbitControls ---
// const controls = new OrbitControls(camera, renderer.domElement);
// controls.enableDamping = true;
// controls.dampingFactor = 0.05;

// controls.enablePan = false;
// controls.enableZoom = true;

// controls.screenSpacePanning = false;
// controls.maxPolarAngle = Math.PI / 2;
// controls.target.set(0, 250, 0);
// controls.rotateSpeed = 0.2; // سرعة دوران الكاميرا بالماوس (تم إبطاءها)

// // --- الأضواء ---
// const ambientLight = new THREE.AmbientLight(0x404040, 2);
// scene.add(ambientLight);
// const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
// directionalLight.position.set(200, 500, 200);
// directionalLight.castShadow = true;
// directionalLight.shadow.mapSize.width = 1024;
// directionalLight.shadow.mapSize.height = 1024;
// directionalLight.shadow.camera.near = 0.5;
// directionalLight.shadow.camera.far = 1000;
// directionalLight.shadow.camera.left = -500;
// directionalLight.shadow.camera.right = 500;
// directionalLight.shadow.camera.top = 500;
// directionalLight.shadow.camera.bottom = -500;
// scene.add(directionalLight);
// renderer.shadowMap.enabled = true;

// // --- المواد ---
// const skydiverMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5, metalness: 0.1 });
// const airplaneMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.7, metalness: 0.3 });
// const parachuteMaterial = new THREE.MeshStandardMaterial({ color: 0x00ffff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });

// // --- إنشاء الأرض (تضاريس باستخدام Simplex Noise) ---
// const terrainWidth = 1000;
// const terrainDepth = 1000;
// const terrainResolution = 128; 
// const terrainMaxHeight = 50;

// const terrainGeometry = new THREE.PlaneGeometry(terrainWidth, terrainDepth, terrainResolution - 1, terrainResolution - 1);
// terrainGeometry.rotateX(-Math.PI / 2);

// const noise2D = createNoise2D();

// const vertices = terrainGeometry.attributes.position.array;

// for (let i = 0, j = 0; i < vertices.length; i++, j += 3) {
//     const x = vertices[j];
//     const z = vertices[j + 2];
//     const noise = noise2D(x / 75, z / 75) * 0.5 + 0.5;
//     vertices[j + 1] = noise * terrainMaxHeight;
// }
// terrainGeometry.computeVertexNormals();

// const terrainMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.8, metalness: 0 });
// const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
// terrain.receiveShadow = true;
// scene.add(terrain);

// // --- إنشاء المظلي (المكعب) ---
// const skydiverHeight = 2; 
// const skydiverGeometry = new THREE.BoxGeometry(2, skydiverHeight, 2); 
// const skydiver = new THREE.Mesh(skydiverGeometry, skydiverMaterial);
// skydiver.castShadow = true;
// skydiver.visible = true;
// scene.add(skydiver);

// // --- إنشاء المظلة (نموذج مخروطي) ---
// const parachuteGeometry = new THREE.ConeGeometry(8, 2, 32);
// parachuteGeometry.rotateX(Math.PI);
// const parachute = new THREE.Mesh(parachuteGeometry, parachuteMaterial);
// parachute.visible = false;
// parachute.castShadow = true;
// scene.add(parachute);

// // --- إنشاء الطائرة (تمثيل بسيط كمكعب) ---
// const airplaneGeometry = new THREE.BoxGeometry(15, 4, 4);
// const airplane = new THREE.Mesh(airplaneGeometry, airplaneMaterial);
// airplane.castShadow = true;
// scene.add(airplane);

// // --- إعدادات المحاكاة الفيزيائية ---
// const G = 9.81; 
// const RHO = 1.225; 
// const DT = 0.016; 

// let skydiverMass = 75; 
// let skydiverPosition = new THREE.Vector3();

// let skydiverVelocity = new THREE.Vector3(0, 0, 0);
// let skydiverAcceleration = new THREE.Vector3(0, 0, 0);

// let CD_freefall = 0.7; 
// let A_freefall = 0.8;
// let CD_parachute = 1.4; 
// let A_parachute = 25; 

// let windSpeed = new THREE.Vector3(5, 0, 0); 
// const MAX_WIND_SPEED_MAGNITUDE = 15; 
// const WIND_CHANGE_RATE = 0.5; // تم تعديل الاسم ليعكس التغير في السرعة لكل ضغطة

// let isParachuteOpen = false;
// let parachuteOpenAltitude = 100; 

// let simulationStarted = false;
// let airplaneFlying = true;

// // إعدادات حركة الطائرة
// const airplaneInitialPosition = new THREE.Vector3(0, 500, 300);
// const airplaneSpeed = 20;

// // تعيين المواقع الأولية للكائنات
// airplane.position.copy(airplaneInitialPosition);
// skydiver.position.copy(airplaneInitialPosition);
// skydiverPosition.copy(airplaneInitialPosition); 

// camera.position.set(0, 550, 400); 

// // --- إعادة تعريف متغيرات التحكم اليدوية بالكاميرا ---
// const cameraSpeed = 100; 
// const keyState = {
//     w: false, s: false, a: false, d: false, // تحكم بالكاميرا
//     q: false, e: false, // تحكم بالكاميرا عمودياً (الآن هي الوحيدة لارتفاع الكاميرا)
//     arrowUp: false, arrowDown: false, // تحكم باتجاه الرياح Z
//     arrowLeft: false, arrowRight: false, // تحكم باتجاه الرياح X
//     z: false, // لزيادة سرعة الرياح في الاتجاه الحالي
//     x: false  // لتقليل سرعة الرياح في الاتجاه الحالي
// };

// // --- تعريف Raycaster للتعامل مع التصادمات ---
// const raycaster = new THREE.Raycaster();
// const down = new THREE.Vector3(0, -1, 0); 

// // --- وظيفة تحديث الفيزياء ---
// function updatePhysics() {
//     if (simulationStarted) { 
//         let currentCD = isParachuteOpen ? CD_parachute : CD_freefall; 
//         let currentA = isParachuteOpen ? A_parachute : A_freefall; 

//         // --- حساب القوى المؤثرة ---

//         // 1. قوة الجاذبية
//         const gravityForce = new THREE.Vector3(0, -skydiverMass * G, 0);

//         // 2. قوة مقاومة الهواء (السحب) - محسوبة بالنسبة لسرعة المظلي بالنسبة للهواء (تتضمن الرياح)
//         const relativeAirVelocity = skydiverVelocity.clone().sub(windSpeed); 
//         const relativeSpeedSq = relativeAirVelocity.lengthSq(); 
//         const dragMagnitude = 0.5 * RHO * relativeSpeedSq * currentCD * currentA; 
//         const dragForce = relativeAirVelocity.clone().normalize().multiplyScalar(-dragMagnitude);

//         // 3. القوة المحصلة
//         const totalForce = new THREE.Vector3();
//         totalForce.add(gravityForce);
//         totalForce.add(dragForce); 

//         // حساب التسارع
//         skydiverAcceleration.copy(totalForce).divideScalar(skydiverMass);

//         // خطوة تحديث السرعة والموقع (تكامل أويلر الصريح)
//         skydiverVelocity.add(skydiverAcceleration.clone().multiplyScalar(DT));
//         skydiverPosition.add(skydiverVelocity.clone().multiplyScalar(DT));

//         // اكتشاف التصادم باستخدام Raycasting مع الأرض
//         raycaster.set(skydiverPosition, down);
//         const intersects = raycaster.intersectObject(terrain);

//         if (intersects.length > 0) {
//             const collisionPoint = intersects[0].point;
//             const groundHeightAtSkydiver = collisionPoint.y;

//             if (skydiverPosition.y - (skydiverHeight / 2) <= groundHeightAtSkydiver) {
//                 skydiverPosition.y = groundHeightAtSkydiver + (skydiverHeight / 2);
//                 skydiverVelocity.set(0, 0, 0); 
//                 skydiverAcceleration.set(0, 0, 0); 
//                 simulationStarted = false; 
//                 console.log("Skydiver landed safely!");
//                 parachute.visible = false; 
//                 skydiver.material.color.set(0x00ff00); 
//             }
//         }
        
//         skydiver.position.copy(skydiverPosition); 

//         if (isParachuteOpen) {
//             parachute.position.copy(skydiverPosition).add(new THREE.Vector3(0, 5, 0));
//             parachute.rotation.y += 0.05; 
//         }
//     }
// }

// // وظيفة لتحديث سرعة الرياح بناءً على ضغطات الأسهم
// function updateWindDirection() {
//     let windChanged = false;

//     // التحكم في اتجاه الرياح باستخدام الأسهم الأربعة (تعديل X و Z)
//     if (keyState.arrowLeft) {
//         windSpeed.x -= WIND_CHANGE_RATE;
//         windChanged = true;
//     }
//     if (keyState.arrowRight) {
//         windSpeed.x += WIND_CHANGE_RATE;
//         windChanged = true;
//     }
//     if (keyState.arrowUp) { // للتحكم في Z (نحو عمق الشاشة)
//         windSpeed.z -= WIND_CHANGE_RATE;
//         windChanged = true;
//     }
//     if (keyState.arrowDown) { // للتحكم في Z (نحو مقدمة الشاشة)
//         windSpeed.z += WIND_CHANGE_RATE;
//         windChanged = true;
//     }

//     // التحكم بقوة الرياح في الاتجاه الحالي
//     if (keyState.z) { // زيادة سرعة الرياح
//         const currentWindMagnitude = windSpeed.length();
//         if (currentWindMagnitude > 0) {
//             windSpeed.multiplyScalar((currentWindMagnitude + WIND_CHANGE_RATE) / currentWindMagnitude);
//         } else {
//             // إذا كانت الرياح صفر، ابدأها في اتجاه افتراضي (مثلاً X الموجب)
//             windSpeed.x = WIND_CHANGE_RATE;
//         }
//         windChanged = true;
//     }
//     if (keyState.x) { // تقليل سرعة الرياح
//         const currentWindMagnitude = windSpeed.length();
//         if (currentWindMagnitude > 0) {
//             windSpeed.multiplyScalar((currentWindMagnitude - WIND_CHANGE_RATE) / currentWindMagnitude);
//             if (windSpeed.lengthSq() < (WIND_CHANGE_RATE * 0.1) * (WIND_CHANGE_RATE * 0.1)) { // منع الرياح السلبية الصغيرة جداً
//                 windSpeed.set(0, 0, 0);
//             }
//         }
//         windChanged = true;
//     }

//     // الحد من سرعة الرياح القصوى للحفاظ على الواقعية
//     if (windSpeed.length() > MAX_WIND_SPEED_MAGNITUDE) {
//         windSpeed.setLength(MAX_WIND_SPEED_MAGNITUDE);
//     }

//     // إذا تغيرت الرياح، اطبع قيمة جديدة في الكونسول للمراقبة
//     if (windChanged) {
//         console.log(`Wind Speed: X=${windSpeed.x.toFixed(2)}, Z=${windSpeed.z.toFixed(2)} (Magnitude: ${windSpeed.length().toFixed(2)})`);
//     }
// }


// // دالة تحديث موضع الكاميرا 
// function updateCameraPosition() {
//     const cameraDirection = new THREE.Vector3();
//     camera.getWorldDirection(cameraDirection);

//     const right = new THREE.Vector3();
//     right.crossVectors(cameraDirection, camera.up);
//     right.normalize();

//     // التحكم في حركة الكاميرا الأفقية (W, S, A, D)
//     if (keyState.w) {
//         camera.position.addScaledVector(cameraDirection, cameraSpeed * DT);
//         controls.target.addScaledVector(cameraDirection, cameraSpeed * DT);
//     }
//     if (keyState.s) {
//         camera.position.addScaledVector(cameraDirection, -cameraSpeed * DT);
//         controls.target.addScaledVector(cameraDirection, -cameraSpeed * DT);
//     }

//     if (keyState.d) {
//         camera.position.addScaledVector(right, cameraSpeed * DT);
//         controls.target.addScaledVector(right, cameraSpeed * DT);
//     }
//     if (keyState.a) {
//         camera.position.addScaledVector(right, -cameraSpeed * DT);
//         controls.target.addScaledVector(right, -cameraSpeed * DT);
//     }

//     // التحكم في ارتفاع الكاميرا (Q, E فقط الآن)
//     if (keyState.q) { // لم تعد تستخدم arrowUp
//         camera.position.y += cameraSpeed * DT;
//         controls.target.y += cameraSpeed * DT;
//     }
//     if (keyState.e) { // لم تعد تستخدم arrowDown
//         camera.position.y -= cameraSpeed * DT;
//         controls.target.y -= cameraSpeed * DT;
//     }
// }


// // حلقة الرسوميات
// function animate() {
//     requestAnimationFrame(animate);

//     if (airplaneFlying) { 
//         airplane.position.z -= airplaneSpeed * DT;
//         if (!simulationStarted) { 
//             skydiver.position.copy(airplane.position);
//             skydiverPosition.copy(airplane.position);
//         }
//     }

//     updatePhysics(); 
//     updateWindDirection(); 

//     updateCameraPosition();
//     controls.update();
    
//     renderer.render(scene, camera);
// }

// animate();

// // عناصر التحكم باللوحة المفاتيح (مستمعي الأحداث)
// document.addEventListener('keydown', (event) => {
//     switch (event.key.toLowerCase()) {
//         case 'w': keyState.w = true; break;
//         case 's': keyState.s = true; break;
//         case 'a': keyState.a = true; break;
//         case 'd': keyState.d = true; break;
//         case 'q': keyState.q = true; break;
//         case 'e': keyState.e = true; break;
//         // تحكم الرياح باستخدام الأسهم الأربعة
//         case 'arrowleft': keyState.arrowLeft = true; break;
//         case 'arrowright': keyState.arrowRight = true; break;
//         case 'arrowup': keyState.arrowUp = true; break; 
//         case 'arrowdown': keyState.arrowDown = true; break;
//         case 'z': keyState.z = true; break; 
//         case 'x': keyState.x = true; break; 
//     }

//     // زر 'F' للقفز من الطائرة
//     if (event.key === 'f' || event.key === 'F') {
//         if (!simulationStarted) { 
//             simulationStarted = true;
//             console.log("Skydiver jumped!");
//             skydiverVelocity.z = -airplaneSpeed; 
//             skydiverVelocity.x = 0; 
//         }
//     }

//     // زر 'O' لفتح المظلة
//     if (event.key === 'o' || event.key === 'O') {
//         if (simulationStarted && !isParachuteOpen) { 
//             isParachuteOpen = true;
//             parachute.visible = true;
//             skydiver.material.color.set(0x0000ff); 
//             console.log("Parachute opened!");
//         }
//     }
// });

// document.addEventListener('keyup', (event) => {
//     switch (event.key.toLowerCase()) {
//         case 'w': keyState.w = false; break;
//         case 's': keyState.s = false; break;
//         case 'a': keyState.a = false; break;
//         case 'd': keyState.d = false; break;
//         case 'q': keyState.q = false; break;
//         case 'e': keyState.e = false; break;
//         // تحكم الرياح باستخدام الأسهم الأربعة
//         case 'arrowleft': keyState.arrowLeft = false; break;
//         case 'arrowright': keyState.arrowRight = false; break;
//         case 'arrowup': keyState.arrowUp = false; break; 
//         case 'arrowdown': keyState.arrowDown = false; break;
//         case 'z': keyState.z = false; break; 
//         case 'x': keyState.x = false; break; 
//     }
// });

// window.addEventListener('resize', () => {
//     camera.aspect = window.innerWidth / window.innerHeight;
//     camera.updateProjectionMatrix();
//     renderer.setSize(window.innerWidth, window.innerHeight);
// });
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
controls.enableDamping = true;
controls.dampingFactor = 0.05;

controls.enablePan = false;
controls.enableZoom = true;

controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;
controls.target.set(0, 250, 0);
controls.rotateSpeed = 0.2; // سرعة دوران الكاميرا بالماوس (تم إبطاءها)

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
const skydiverHeight = 2; 
const skydiverGeometry = new THREE.BoxGeometry(2, skydiverHeight, 2); 
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
const MAX_WIND_SPEED_MAGNITUDE = 15; 
const WIND_CHANGE_RATE = 0.5; 

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

camera.position.set(0, 550, 400); 

// --- إعادة تعريف متغيرات التحكم اليدوية بالكاميرا ---
const cameraSpeed = 100; 
const keyState = {
    w: false, s: false, a: false, d: false, // تحكم بالكاميرا
    q: false, e: false, // تحكم بالكاميرا عمودياً (الآن هي الوحيدة لارتفاع الكاميرا)
    arrowUp: false, arrowDown: false, // تحكم باتجاه الرياح Z
    arrowLeft: false, arrowRight: false, // تحكم باتجاه الرياح X
    z: false, // لزيادة سرعة الرياح في الاتجاه الحالي
    x: false  // لتقليل سرعة الرياح في الاتجاه الحالي
};

// --- تعريف Raycaster للتعامل مع التصادمات ---
const raycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0); 

// --- وظيفة تحديث الفيزياء ---
function updatePhysics() {
    if (simulationStarted) { 
        let currentCD = isParachuteOpen ? CD_parachute : CD_freefall; 
        let currentA = isParachuteOpen ? A_parachute : A_freefall; 

        // --- حساب القوى المؤثرة ---

        // 1. قوة الجاذبية
        const gravityForce = new THREE.Vector3(0, -skydiverMass * G, 0);

        // 2. قوة مقاومة الهواء (السحب) - محسوبة بالنسبة لسرعة المظلي بالنسبة للهواء (تتضمن الرياح)
        const relativeAirVelocity = skydiverVelocity.clone().sub(windSpeed); 
        const relativeSpeedSq = relativeAirVelocity.lengthSq(); 
        const dragMagnitude = 0.5 * RHO * relativeSpeedSq * currentCD * currentA; 
        const dragForce = relativeAirVelocity.clone().normalize().multiplyScalar(-dragMagnitude);

        // 3. القوة المحصلة
        const totalForce = new THREE.Vector3();
        totalForce.add(gravityForce);
        totalForce.add(dragForce); 

        // حساب التسارع
        skydiverAcceleration.copy(totalForce).divideScalar(skydiverMass);

        // خطوة تحديث السرعة والموقع (تكامل أويلر الصريح)
        skydiverVelocity.add(skydiverAcceleration.clone().multiplyScalar(DT));
        skydiverPosition.add(skydiverVelocity.clone().multiplyScalar(DT));

        // اكتشاف التصادم باستخدام Raycasting مع الأرض
        raycaster.set(skydiverPosition, down);
        const intersects = raycaster.intersectObject(terrain);

        if (intersects.length > 0) {
            const collisionPoint = intersects[0].point;
            const groundHeightAtSkydiver = collisionPoint.y;

            if (skydiverPosition.y - (skydiverHeight / 2) <= groundHeightAtSkydiver) {
                skydiverPosition.y = groundHeightAtSkydiver + (skydiverHeight / 2);
                skydiverVelocity.set(0, 0, 0); 
                skydiverAcceleration.set(0, 0, 0); 
                simulationStarted = false; 
                console.log("Skydiver landed safely!");
                parachute.visible = false; 
                skydiver.material.color.set(0x00ff00); 
            }
        }
        
        skydiver.position.copy(skydiverPosition); 

        if (isParachuteOpen) {
            parachute.position.copy(skydiverPosition).add(new THREE.Vector3(0, 5, 0));
            parachute.rotation.y += 0.05; 
        }
    }
}

// وظيفة لتحديث سرعة الرياح بناءً على ضغطات الأسهم
function updateWindDirection() {
    let windChanged = false;

    // التحكم في اتجاه الرياح باستخدام الأسهم الأربعة (تعديل X و Z)
    if (keyState.arrowLeft) {
        windSpeed.x -= WIND_CHANGE_RATE;
        windChanged = true;
    }
    if (keyState.arrowRight) {
        windSpeed.x += WIND_CHANGE_RATE;
        windChanged = true;
    }
    if (keyState.arrowUp) { // للتحكم في Z (نحو عمق الشاشة)
        windSpeed.z -= WIND_CHANGE_RATE;
        windChanged = true;
    }
    if (keyState.arrowDown) { // للتحكم في Z (نحو مقدمة الشاشة)
        windSpeed.z += WIND_CHANGE_RATE;
        windChanged = true;
    }

    // التحكم بقوة الرياح في الاتجاه الحالي
    if (keyState.z) { // زيادة سرعة الرياح
        const currentWindMagnitude = windSpeed.length();
        if (currentWindMagnitude > 0) {
            windSpeed.multiplyScalar((currentWindMagnitude + WIND_CHANGE_RATE) / currentWindMagnitude);
        } else {
            // إذا كانت الرياح صفر، ابدأها في اتجاه افتراضي (مثلاً X الموجب)
            windSpeed.x = WIND_CHANGE_RATE;
        }
        windChanged = true;
    }
    if (keyState.x) { // تقليل سرعة الرياح
        const currentWindMagnitude = windSpeed.length();
        if (currentWindMagnitude > 0) {
            windSpeed.multiplyScalar((currentWindMagnitude - WIND_CHANGE_RATE) / currentWindMagnitude);
            if (windSpeed.lengthSq() < (WIND_CHANGE_RATE * 0.1) * (WIND_CHANGE_RATE * 0.1)) { // منع الرياح السلبية الصغيرة جداً
                windSpeed.set(0, 0, 0);
            }
        }
        windChanged = true;
    }

    // الحد من سرعة الرياح القصوى للحفاظ على الواقعية
    if (windSpeed.length() > MAX_WIND_SPEED_MAGNITUDE) {
        windSpeed.setLength(MAX_WIND_SPEED_MAGNITUDE);
    }

    // إذا تغيرت الرياح، اطبع قيمة جديدة في الكونسول للمراقبة (للتصحيح فقط، سيتم عرضها على الشاشة الآن)
    // if (windChanged) {
    //     console.log(`Wind Speed: X=${windSpeed.x.toFixed(2)}, Z=${windSpeed.z.toFixed(2)} (Magnitude: ${windSpeed.length().toFixed(2)})`);
    // }
}


// دالة تحديث موضع الكاميرا 
function updateCameraPosition() {
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    const right = new THREE.Vector3();
    right.crossVectors(cameraDirection, camera.up);
    right.normalize();

    // التحكم في حركة الكاميرا الأفقية (W, S, A, D)
    if (keyState.w) {
        camera.position.addScaledVector(cameraDirection, cameraSpeed * DT);
        controls.target.addScaledVector(cameraDirection, cameraSpeed * DT);
    }
    if (keyState.s) {
        camera.position.addScaledVector(cameraDirection, -cameraSpeed * DT);
        controls.target.addScaledVector(cameraDirection, -cameraSpeed * DT);
    }

    if (keyState.d) {
        camera.position.addScaledVector(right, cameraSpeed * DT);
        controls.target.addScaledVector(right, cameraSpeed * DT);
    }
    if (keyState.a) {
        camera.position.addScaledVector(right, -cameraSpeed * DT);
        controls.target.addScaledVector(right, -cameraSpeed * DT);
    }

    // التحكم في ارتفاع الكاميرا (Q, E فقط الآن)
    if (keyState.q) { 
        camera.position.y += cameraSpeed * DT;
        controls.target.y += cameraSpeed * DT;
    }
    if (keyState.e) { 
        camera.position.y -= cameraSpeed * DT;
        controls.target.y -= cameraSpeed * DT;
    }
}

// NEW: وظيفة لتحديث عناصر الإحصائيات في HTML
function updateStatsDisplay() {
    // سرعة المظلي
    document.getElementById('skydiver-speed').textContent = skydiverVelocity.length().toFixed(2);

    // ارتفاع المظلي (الموضع Y)
    document.getElementById('skydiver-altitude').textContent = skydiverPosition.y.toFixed(2);

    // سرعة الرياح
    document.getElementById('wind-speed').textContent = windSpeed.length().toFixed(2);

    // اتجاه الرياح (بالدرجات)
    // نستخدم atan2 (y, x) للحصول على الزاوية. هنا لدينا Z (شمال/جنوب) و X (شرق/غرب).
    // THREE.js تستخدم X للشرق و Z للشمال.
    // atan2(y, x) يعطي زاوية من المحور X الموجب (الشرق) عكس اتجاه عقارب الساعة.
    // سنستخدم atan2(-windSpeed.z, windSpeed.x) لأن +Z هو "للأمام" في THREE.js،
    // ونريد الاتجاه الكلاسيكي (0 درجة للشمال، 90 للشرق، 180 للجنوب، 270 للغرب).
    // المحور Z في Three.js هو المحور "العميق"، فإذا كانت الرياح تتحرك في الاتجاه السالب لـ Z، فهي "نحو الشاشة" (شمال).
    // المحور X في Three.js هو المحور "العرضي"، فإذا كانت الرياح تتحرك في الاتجاه الموجب لـ X، فهي "يميناً" (شرق).
    
    // للحصول على زاوية مناسبة للبوصلة (شمال 0/360، شرق 90، جنوب 180، غرب 270)
    // نستخدم atan2(Z, X) - (Y is Z in this context)
    let angleRad = Math.atan2(windSpeed.z, windSpeed.x);
    let angleDeg = THREE.MathUtils.radToDeg(angleRad);

    // تحويل الزاوية لتكون 0-360 درجة و 0 للشمال
    // atan2 يعطي من -PI إلى PI (أي -180 إلى 180 درجة).
    // سنعدلها لتكون 0-360، ونجعل الشمال (Z سالب) هو 0 أو 360 درجة.
    // بما أن Z الموجب هو "للخلف"، Z السالب هو "للأمام".
    // لنفترض أن X يمثل الشرق/الغرب و Z يمثل الشمال/الجنوب.
    // atan2(y, x) يعطي الزاوية بالنسبة للمحور X الموجب.
    // إذا أردنا 0 للشمال (-Z)، و 90 للشرق (+X)
    
    // الحل الأكثر شيوعاً لتحديد الاتجاه من متجه 2D (x, z):
    // atan2(z, x) يعطي الزاوية من المحور X الموجب.
    // المحور X في Three.js هو شرق-غرب، والمحور Z هو شمال-جنوب.
    // لنعتبر: +X = شرق، -X = غرب، +Z = جنوب، -Z = شمال.
    
    // زاوية الرياح بالراديان بالنسبة للمحور X الموجب (الشرق)
    let windAngleRad = Math.atan2(windSpeed.z, windSpeed.x);
    // تحويل إلى درجات
    let windAngleDeg = THREE.MathUtils.radToDeg(windAngleRad);

    // تعديل الزاوية لتكون 0-360 درجة
    if (windAngleDeg < 0) {
        windAngleDeg += 360;
    }

    // الآن نريد تحويلها إلى اتجاهات بوصلة تقليدية (0/360 شمال، 90 شرق، 180 جنوب، 270 غرب)
    // بما أن +X هو شرق و +Z هو جنوب (في نظامنا، بسبب دوران PlaneGeometry)
    // 0 deg -> +X (شرق)
    // 90 deg -> +Z (جنوب)
    // 180 deg -> -X (غرب)
    // 270 deg -> -Z (شمال)

    // لتحويلها إلى 0=شمال، 90=شرق:
    // زاوية الشمال (عندما يكون windSpeed.z سالباً جداً و windSpeed.x قريباً من الصفر)
    // هي -90 درجة في atan2(z,x).
    // نضيف 90 ونعدل الدورة
    let compassAngle = (windAngleDeg + 90) % 360; // 0 شرق -> 90 جنوب -> 180 غرب -> 270 شمال -> 360 شرق
    
    // تصحيح آخر لجعل 0/360 هي الشمال الحقيقي (-Z)
    // إذا كانت الزاوية من المحور X الموجب (الشرق):
    // 0 = شرق
    // 90 = جنوب
    // 180 = غرب
    // 270 = شمال

    // لجعل الشمال 0 درجة: (360 - (windAngleDeg - 90)) % 360 
    let finalCompassAngle = (360 - (windAngleDeg - 90)) % 360; // (90 + (360 - angleDeg)) % 360


    // لتحديد الاتجاهات النصية (شمال، شمال شرق، إلخ)
    let directionText;
    if (windSpeed.lengthSq() < 0.1 * 0.1) { // إذا كانت سرعة الرياح قريبة من الصفر
        directionText = "Still";
    } else {
        const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];
        // اضبط الزاوية بحيث 0-360، حيث 0 هو الشمال
        // atan2(Y, X) في الرياضيات يعطي الزاوية من X الموجب، عكس عقارب الساعة.
        // في نظام THREE.js: +X يمين، -X يسار، +Z للخلف، -Z للأمام.
        // لنعتبر -Z هو الشمال، +X هو الشرق.
        // الزاوية_العادية = atan2(X, -Z)
        let actualAngleRad = Math.atan2(windSpeed.x, -windSpeed.z); // X هو East, -Z هو North
        let actualAngleDeg = THREE.MathUtils.radToDeg(actualAngleRad);
        if (actualAngleDeg < 0) {
            actualAngleDeg += 360;
        }
        
        const index = Math.round(actualAngleDeg / 45);
        directionText = directions[index];
    }
    
    document.getElementById('wind-direction').textContent = `${directionText} (${finalCompassAngle.toFixed(0)}°)`;
}


// حلقة الرسوميات
function animate() {
    requestAnimationFrame(animate);

    if (airplaneFlying) { 
        airplane.position.z -= airplaneSpeed * DT;
        if (!simulationStarted) { 
            skydiver.position.copy(airplane.position);
            skydiverPosition.copy(airplane.position);
        }
    }

    updatePhysics(); 
    updateWindDirection(); 

    updateCameraPosition();
    controls.update();

    // NEW: تحديث عرض الإحصائيات في كل إطار
    updateStatsDisplay(); 
    
    renderer.render(scene, camera);
}

animate();

// عناصر التحكم باللوحة المفاتيح (مستمعي الأحداث)
document.addEventListener('keydown', (event) => {
    switch (event.key.toLowerCase()) {
        case 'w': keyState.w = true; break;
        case 's': keyState.s = true; break;
        case 'a': keyState.a = true; break;
        case 'd': keyState.d = true; break;
        case 'q': keyState.q = true; break;
        case 'e': keyState.e = true; break;
        // تحكم الرياح باستخدام الأسهم الأربعة
        case 'arrowleft': keyState.arrowLeft = true; break;
        case 'arrowright': keyState.arrowRight = true; break;
        case 'arrowup': keyState.arrowUp = true; break; 
        case 'arrowdown': keyState.arrowDown = true; break;
        case 'z': keyState.z = true; break; 
        case 'x': keyState.x = true; break; 
    }

    // زر 'F' للقفز من الطائرة
    if (event.key === 'f' || event.key === 'F') {
        if (!simulationStarted) { 
            simulationStarted = true;
            console.log("Skydiver jumped!");
            skydiverVelocity.z = -airplaneSpeed; 
            skydiverVelocity.x = 0; 
        }
    }

    // زر 'O' لفتح المظلة
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
    switch (event.key.toLowerCase()) {
        case 'w': keyState.w = false; break;
        case 's': keyState.s = false; break;
        case 'a': keyState.a = false; break;
        case 'd': keyState.d = false; break;
        case 'q': keyState.q = false; break;
        case 'e': keyState.e = false; break;
        // تحكم الرياح باستخدام الأسهم الأربعة
        case 'arrowleft': keyState.arrowLeft = false; break;
        case 'arrowright': keyState.arrowRight = false; break;
        case 'arrowup': keyState.arrowUp = false; break; 
        case 'arrowdown': keyState.arrowDown = false; break;
        case 'z': keyState.z = false; break; 
        case 'x': keyState.x = false; break; 
    }
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});