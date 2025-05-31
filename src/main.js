// import { createNoise2D } from 'simplex-noise'; // استيراد دالة createNoise2D من مكتبة simplex-noise
// import * as THREE from 'three';

// // --- إعدادات المشهد الأساسية ---
// const scene = new THREE.Scene();
// const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000); // زيادة مدى الرؤية
// const renderer = new THREE.WebGLRenderer({ antialias: true }); // تمكين التنعيم للحصول على حواف أفضل
// renderer.setSize(window.innerWidth, window.innerHeight);
// renderer.setPixelRatio(window.devicePixelRatio); // ضبط نسبة البكسل لتحسين الجودة على شاشات Retina
// document.body.appendChild(renderer.domElement);

// // --- الأضواء ---
// const ambientLight = new THREE.AmbientLight(0x404040, 2); // ضوء خفيف عام
// scene.add(ambientLight);
// const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // ضوء اتجاهي أقوى
// directionalLight.position.set(200, 500, 200); // مصدر الضوء من الأعلى قليلاً
// directionalLight.castShadow = true; // تفعيل الظلال
// directionalLight.shadow.mapSize.width = 1024;
// directionalLight.shadow.mapSize.height = 1024;
// directionalLight.shadow.camera.near = 0.5;
// directionalLight.shadow.camera.far = 1000;
// directionalLight.shadow.camera.left = -500;
// directionalLight.shadow.camera.right = 500;
// directionalLight.shadow.camera.top = 500;
// directionalLight.shadow.camera.bottom = -500;
// scene.add(directionalLight);
// renderer.shadowMap.enabled = true; // تفعيل خرائط الظلال في Renderer

// // --- المواد ---
// const skydiverMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5, metalness: 0.1 });
// const airplaneMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.7, metalness: 0.3 });
// const parachuteMaterial = new THREE.MeshStandardMaterial({ color: 0x00ffff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }); // مظلة بلون أزرق سماوي

// // --- إنشاء الأرض (تضاريس باستخدام Simplex Noise) ---
// const terrainWidth = 1000;
// const terrainDepth = 1000;
// const terrainResolution = 128; // عدد تقسيمات الشبكة (كلما زاد الرقم، زادت التفاصيل ودقة الهبوط)
// const terrainMaxHeight = 50; // أقصى ارتفاع للتضاريس

// const terrainGeometry = new THREE.PlaneGeometry(terrainWidth, terrainDepth, terrainResolution - 1, terrainResolution - 1);
// terrainGeometry.rotateX(-Math.PI / 2); // تدوير لتكون أفقية

// // تهيئة دالة الضوضاء مرة واحدة
// const noise2D = createNoise2D();

// const vertices = terrainGeometry.attributes.position.array;

// for (let i = 0, j = 0; i < vertices.length; i++, j += 3) {
//     const x = vertices[j];
//     const z = vertices[j + 2];
//     // استخدام noise2D بدلاً من perlin.noise
//     // x / scale, z / scale للتحكم في "نعومة" التضاريس
//     const noise = noise2D(x / 75, z / 75) * 0.5 + 0.5; // الحصول على قيمة بين 0 و 1
//     vertices[j + 1] = noise * terrainMaxHeight; // ضبط الارتفاع (محور Y)
// }
// terrainGeometry.computeVertexNormals(); // إعادة حساب Normal Vectors للإضاءة الصحيحة

// const terrainMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.8, metalness: 0 }); // لون أخضر داكن
// const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
// terrain.receiveShadow = true; // الأرض تستقبل الظلال
// scene.add(terrain);

// // --- إنشاء المظلي (تمثيل بسيط كمكعب) ---
// const skydiverGeometry = new THREE.BoxGeometry(2, 2, 2);
// const skydiver = new THREE.Mesh(skydiverGeometry, skydiverMaterial);
// skydiver.castShadow = true; // المظلي يرمي ظلالًا
// scene.add(skydiver);

// // --- إنشاء المظلة (نموذج مخروطي) ---
// const parachuteGeometry = new THREE.ConeGeometry(8, 2, 32); // نصف قطر 8، ارتفاع 2
// parachuteGeometry.rotateX(Math.PI); // تدوير ليكون مفتوحًا للأسفل
// const parachute = new THREE.Mesh(parachuteGeometry, parachuteMaterial);
// parachute.visible = false; // المظلة غير مرئية في البداية
// parachute.castShadow = true;
// scene.add(parachute);

// // --- إنشاء الطائرة (تمثيل بسيط كمكعب) ---
// const airplaneGeometry = new THREE.BoxGeometry(15, 4, 4);
// const airplane = new THREE.Mesh(airplaneGeometry, airplaneMaterial);
// airplane.castShadow = true; // الطائرة ترمي ظلالًا
// scene.add(airplane);

// // --- إعدادات المحاكاة الفيزيائية ---
// const G = 9.81; // تسارع الجاذبية
// const RHO = 1.225; // كثافة الهواء
// const DT = 0.016; // خطوة زمنية صغيرة (تقريبا 1/60 ثانية)

// let skydiverMass = 75; // كتلة المظلي بالكيلوجرام
// let skydiverPosition = new THREE.Vector3(0, 500, -200); // ارتفاع أولي للطائرة والمظلي
// let skydiverVelocity = new THREE.Vector3(0, 0, 0); // السرعة الأولية
// let skydiverAcceleration = new THREE.Vector3(0, 0, 0);

// let CD_freefall = 0.7; // معامل السحب في السقوط الحر
// let A_freefall = 0.8; // مساحة المقطع العرضي في السقوط الحر
// let CD_parachute = 1.4; // معامل السحب بعد فتح المظلة
// let A_parachute = 25; // مساحة المقطع العرضي بعد فتح المظلة (مساحة المظلة)

// let windSpeed = new THREE.Vector3(5, 0, 0); // سرعة الرياح الأفقية (5 م/ث في اتجاه X)

// let isParachuteOpen = false;
// let parachuteOpenAltitude = 100; // ارتفاع فتح المظلة

// let simulationStarted = false; // هل بدأت المحاكاة (قفز المظلي)
// let airplaneFlying = true; // هل الطائرة ما زالت تطير

// // إعدادات حركة الطائرة
// const airplaneInitialPosition = new THREE.Vector3(0, 500, -200);
// const airplaneSpeed = 20; // سرعة الطائرة (م/ث)

// // **NEW:** تعريف إزاحة الكاميرا بالنسبة للمظلي
// const cameraOffset = new THREE.Vector3(0, 10, 20); // 20 متر خلف المظلي، 10 متر فوقه

// // تعيين المواقع الأولية للكائنات
// airplane.position.copy(airplaneInitialPosition);
// skydiver.position.copy(airplaneInitialPosition); // المظلي يبدأ مع الطائرة
// camera.position.copy(airplaneInitialPosition.clone().add(new THREE.Vector3(-30, 15, 0))); // كاميرا أعلى وخلف الطائرة (تتبع الطائرة في البداية)
// camera.lookAt(airplane.position); // الكاميرا تنظر إلى الطائرة في البداية

// // --- وظيفة تحديث الفيزياء ---
// function updatePhysics() {
//     if (!simulationStarted) return; // لا تحدث الفيزياء إلا بعد بدء المحاكاة

//     // تحديد معامل السحب والمساحة بناءً على حالة المظلة
//     let currentCD = isParachuteOpen ? CD_parachute : CD_freefall;
//     let currentA = isParachuteOpen ? A_parachute : A_freefall;

//     // حساب قوة مقاومة الهواء (F_d)
//     const dragMagnitude = 0.5 * RHO * skydiverVelocity.lengthSq() * currentCD * currentA;
//     const dragForce = skydiverVelocity.clone().normalize().multiplyScalar(-dragMagnitude);

//     // حساب قوة الجاذبية (F_g)
//     const gravityForce = new THREE.Vector3(0, -skydiverMass * G, 0);

//     // حساب قوة الرياح (F_w) - تبسيطها لقوة ثابتة في الاتجاه الأفقي
//     const windForceMagnitude = 0.5 * RHO * windSpeed.lengthSq() * currentCD * A_freefall;
//     const windForce = windSpeed.clone().normalize().multiplyScalar(windForceMagnitude);

//     // حساب التسارع الكلي
//     const totalForce = new THREE.Vector3();
//     totalForce.add(gravityForce);
//     totalForce.add(dragForce);
//     totalForce.add(windForce);
//     skydiverAcceleration.copy(totalForce).divideScalar(skydiverMass);

//     // تحديث السرعة
//     skydiverVelocity.add(skydiverAcceleration.clone().multiplyScalar(DT));

//     // تحديث الموضع
//     skydiverPosition.add(skydiverVelocity.clone().multiplyScalar(DT));

//     // تحديث موضع المظلي في المشهد
//     skydiver.position.copy(skydiverPosition);

//     // تحديث موضع المظلة (إذا كانت مفتوحة)
//     if (isParachuteOpen) {
//         parachute.position.copy(skydiverPosition).add(new THREE.Vector3(0, 5, 0)); // ضع المظلة فوق المظلي بقليل
//         parachute.rotation.y += 0.05; // أضف دورانًا بسيطًا للمظلة
//     }

//     // الهبوط الآمن
//     // تحقق من الاصطدام بالأرض (y <= ارتفاع الأرض عند نقطة المظلي)
//     const groundHeightAtSkydiver = getTerrainHeight(skydiverPosition.x, skydiverPosition.z);
//     if (skydiverPosition.y <= groundHeightAtSkydiver) {
//         skydiverPosition.y = groundHeightAtSkydiver; // يلامس الأرض
//         skydiverVelocity.set(0, 0, 0); // تتوقف الحركة
//         skydiverAcceleration.set(0, 0, 0);
//         simulationStarted = false; // توقف المحاكاة الفيزيائية
//         console.log("Skydiver landed safely!");
//         parachute.visible = false; // إخفاء المظلة عند الهبوط
//         skydiver.material.color.set(0x00ff00); // تغيير لون المظلي بعد الهبوط
//     }
// }

// // دالة للحصول على ارتفاع التضاريس عند نقطة معينة
// // تستخدم طريقة أقرب نقطة (nearest neighbor) وهي تبسيط
// function getTerrainHeight(x, z) {
//     const halfWidth = terrainWidth / 2;
//     const halfDepth = terrainDepth / 2;

//     // تحويل إحداثيات المشهد إلى إحداثيات الهندسة (0 إلى resolution-1)
//     const ix = Math.floor((x + halfWidth) / (terrainWidth / (terrainResolution - 1)));
//     const iz = Math.floor((z + halfDepth) / (terrainDepth / (terrainResolution - 1)));

//     // التحقق من الحدود
//     if (ix < 0 || ix >= terrainResolution || iz < 0 || iz >= terrainResolution) {
//         return 0; // خارج نطاق التضاريس، افترض ارتفاع 0
//     }

//     // حساب الفهرس (index) للوصول إلى الـ vertex الصحيح في array attributes.position
//     // PlaneGeometry ترتب Vertices بحيث تكون الصفوف أفقية (Z) والأعمدة رأسية (X)
//     // لذا يكون الفهرس: (iz * terrainResolution + ix)
//     const vertexIndex = (iz * terrainResolution + ix) * 3 + 1; // +1 لأن Y هو العنصر الثاني (j+1 في for loop)

//     if (vertexIndex < 0 || vertexIndex >= vertices.length) return 0; // حماية إضافية

//     return vertices[vertexIndex] + terrain.position.y; // إضافة إزاحة الأرض إذا كانت موجودة
// }


// // --- حلقة الرسوميات ---
// function animate() {
//     requestAnimationFrame(animate);

//     // حركة الطائرة قبل القفز
//     if (airplaneFlying) {
//         airplane.position.x += airplaneSpeed * DT; // الطائرة تتحرك في اتجاه X
//         if (!simulationStarted) { // الكاميرا تتبع الطائرة قبل القفز
//             camera.position.copy(airplane.position.clone().add(new THREE.Vector3(-30, 15, 0))); // كاميرا خلف الطائرة بمسافة معينة
//             camera.lookAt(airplane.position);
//         }
//     }

//     updatePhysics(); // تحديث الفيزياء في كل إطار

//     // تحديث موقع الكاميرا لتتبع المظلي بعد بدء المحاكاة
//     if (simulationStarted) {
//         const cameraTargetPosition = skydiver.position.clone().add(cameraOffset);
//         camera.position.copy(cameraTargetPosition);
//         camera.lookAt(skydiver.position);
//     }
    
//     renderer.render(scene, camera);
// }

// animate();

// // --- عناصر التحكم باللوحة المفاتيح ---
// document.addEventListener('keydown', (event) => {
//     // الزر 'f' للقفز (Jump)
//     if (event.key === 'f' || event.key === 'F') {
//         if (!simulationStarted) { // يمكن القفز مرة واحدة فقط
//             simulationStarted = true;
//             airplaneFlying = false; // إيقاف حركة الطائرة
//             airplane.visible = false; // إخفاء الطائرة بعد القفز
//             console.log("Skydiver jumped!");
//             // نقل المظلي من الطائرة إلى موقع القفز
//             skydiverPosition.copy(airplane.position);
//             // إعطاء المظلي سرعة أفقية أولية مساوية لسرعة الطائرة
//             skydiverVelocity.x = airplaneSpeed;
//             // المظلي يبدأ في السقوط الحر
//         }
//     }

//     // الزر 'o' لفتح المظلة (Open Parachute)
//     if (event.key === 'o' || event.key === 'O') {
//         if (simulationStarted && !isParachuteOpen) { // يمكن فتح المظلة مرة واحدة فقط بعد القفز
//             isParachuteOpen = true;
//             parachute.visible = true; // إظهار المظلة
//             skydiver.material.color.set(0x0000ff); // تغيير لون المظلي
//             console.log("Parachute opened!");
//         }
//     }
// });

// // --- التعامل مع تغيير حجم النافذة ---
// window.addEventListener('resize', () => {
//     camera.aspect = window.innerWidth / window.innerHeight;
//     camera.updateProjectionMatrix();
//     renderer.setSize(window.innerWidth, window.innerHeight);
// });
import { createNoise2D } from 'simplex-noise'; // استيراد دالة createNoise2D من مكتبة simplex-noise
import * as THREE from 'three';

// --- إعدادات المشهد الأساسية ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000); // زيادة مدى الرؤية
const renderer = new THREE.WebGLRenderer({ antialias: true }); // تمكين التنعيم للحصول على حواف أفضل
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio); // ضبط نسبة البكسل لتحسين الجودة على شاشات Retina
document.body.appendChild(renderer.domElement);

// --- الأضواء ---
const ambientLight = new THREE.AmbientLight(0x404040, 2); // ضوء خفيف عام
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5); // ضوء اتجاهي أقوى
directionalLight.position.set(200, 500, 200); // مصدر الضوء من الأعلى قليلاً
directionalLight.castShadow = true; // تفعيل الظلال
directionalLight.shadow.mapSize.width = 1024;
directionalLight.shadow.mapSize.height = 1024;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 1000;
directionalLight.shadow.camera.left = -500;
directionalLight.shadow.camera.right = 500;
directionalLight.shadow.camera.top = 500;
directionalLight.shadow.camera.bottom = -500;
scene.add(directionalLight);
renderer.shadowMap.enabled = true; // تفعيل خرائط الظلال في Renderer

// --- المواد ---
const skydiverMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5, metalness: 0.1 });
const airplaneMaterial = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, roughness: 0.7, metalness: 0.3 });
const parachuteMaterial = new THREE.MeshStandardMaterial({ color: 0x00ffff, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }); // مظلة بلون أزرق سماوي

// --- إنشاء الأرض (تضاريس باستخدام Simplex Noise) ---
const terrainWidth = 1000;
const terrainDepth = 1000;
const terrainResolution = 128; // عدد تقسيمات الشبكة (كلما زاد الرقم، زادت التفاصيل ودقة الهبوط)
const terrainMaxHeight = 50; // أقصى ارتفاع للتضاريس

const terrainGeometry = new THREE.PlaneGeometry(terrainWidth, terrainDepth, terrainResolution - 1, terrainResolution - 1);
terrainGeometry.rotateX(-Math.PI / 2); // تدوير لتكون أفقية

// تهيئة دالة الضوضاء مرة واحدة
const noise2D = createNoise2D();

const vertices = terrainGeometry.attributes.position.array;

for (let i = 0, j = 0; i < vertices.length; i++, j += 3) {
    const x = vertices[j];
    const z = vertices[j + 2];
    // استخدام noise2D بدلاً من perlin.noise
    // x / scale, z / scale للتحكم في "نعومة" التضاريس
    const noise = noise2D(x / 75, z / 75) * 0.5 + 0.5; // الحصول على قيمة بين 0 و 1
    vertices[j + 1] = noise * terrainMaxHeight; // ضبط الارتفاع (محور Y)
}
terrainGeometry.computeVertexNormals(); // إعادة حساب Normal Vectors للإضاءة الصحيحة

const terrainMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.8, metalness: 0 }); // لون أخضر داكن
const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
terrain.receiveShadow = true; // الأرض تستقبل الظلال
scene.add(terrain);

// --- إنشاء المظلي (تمثيل بسيط كمكعب) ---
const skydiverGeometry = new THREE.BoxGeometry(2, 2, 2);
const skydiver = new THREE.Mesh(skydiverGeometry, skydiverMaterial);
skydiver.castShadow = true; // المظلي يرمي ظلالًا
skydiver.visible = true; // المظلي مرئي افتراضيا
scene.add(skydiver);

// --- إنشاء المظلة (نموذج مخروطي) ---
const parachuteGeometry = new THREE.ConeGeometry(8, 2, 32); // نصف قطر 8، ارتفاع 2
parachuteGeometry.rotateX(Math.PI); // تدوير ليكون مفتوحًا للأسفل
const parachute = new THREE.Mesh(parachuteGeometry, parachuteMaterial);
parachute.visible = false; // المظلة غير مرئية في البداية
parachute.castShadow = true;
scene.add(parachute);

// --- إنشاء الطائرة (تمثيل بسيط كمكعب) ---
const airplaneGeometry = new THREE.BoxGeometry(15, 4, 4);
const airplane = new THREE.Mesh(airplaneGeometry, airplaneMaterial);
airplane.castShadow = true; // الطائرة ترمي ظلالًا
scene.add(airplane);

// --- إعدادات المحاكاة الفيزيائية ---
const G = 9.81; // تسارع الجاذبية
const RHO = 1.225; // كثافة الهواء
const DT = 0.016; // خطوة زمنية صغيرة (تقريبا 1/60 ثانية)

let skydiverMass = 75; // كتلة المظلي بالكيلوجرام
// **تعديل:** الموضع الأولي للطائرة والمظلي لبدء الحركة من اليمين (Z موجب)
let skydiverPosition = new THREE.Vector3(0, 500, 300); // ارتفاع أولي 500 متر، على اليمين عند Z=300

let skydiverVelocity = new THREE.Vector3(0, 0, 0); // السرعة الأولية
let skydiverAcceleration = new THREE.Vector3(0, 0, 0);

let CD_freefall = 0.7; // معامل السحب في السقوط الحر
let A_freefall = 0.8; // مساحة المقطع العرضي في السقوط الحر
let CD_parachute = 1.4; // معامل السحب بعد فتح المظلة
let A_parachute = 25; // مساحة المقطع العرضي بعد فتح المظلة (مساحة المظلة)

let windSpeed = new THREE.Vector3(5, 0, 0); // سرعة الرياح الأفقية (5 م/ث في اتجاه X)

let isParachuteOpen = false;
let parachuteOpenAltitude = 100; // ارتفاع فتح المظلة

let simulationStarted = false; // هل بدأت المحاكاة (قفز المظلي)
let airplaneFlying = true; // هل الطائرة ما زالت تطير

// إعدادات حركة الطائرة
// **تعديل:** الموضع الأولي للطائرة (Z موجب)
const airplaneInitialPosition = new THREE.Vector3(0, 500, 300); // تبدأ من اليمين (Z موجب)
const airplaneSpeed = 20; // سرعة الطائرة (م/ث)
let cameraLookAtAirplane = true; // للتحكم في تتبع الكاميرا للطائرة في البداية

// **تعديل:** تعريف إزاحة الكاميرا بالنسبة للمظلي
// الكاميرا خلف المظلي (في اتجاه Z الموجب) و10 متر فوقه
const cameraOffset = new THREE.Vector3(0, 10, 20); 

// تعيين المواقع الأولية للكائنات
airplane.position.copy(airplaneInitialPosition);
skydiver.position.copy(airplaneInitialPosition); // المظلي يبدأ مع الطائرة
// **تعديل:** الكاميرا الأولية لتناسب حركة الطائرة الجديدة
// الكاميرا خلف الطائرة (Z أكثر إيجابية) لتنظر إليها وهي تتحرك نحو Z السلبي
camera.position.copy(airplaneInitialPosition.clone().add(new THREE.Vector3(0, 20, 50))); 
camera.lookAt(airplane.position); // الكاميرا تنظر إلى الطائرة في البداية

// --- وظيفة تحديث الفيزياء ---
function updatePhysics() {
    if (!simulationStarted) return; // لا تحدث الفيزياء إلا بعد بدء المحاكاة

    // تحديد معامل السحب والمساحة بناءً على حالة المظلة
    let currentCD = isParachuteOpen ? CD_parachute : CD_freefall;
    let currentA = isParachuteOpen ? A_parachute : A_freefall;

    // حساب قوة مقاومة الهواء (F_d)
    const dragMagnitude = 0.5 * RHO * skydiverVelocity.lengthSq() * currentCD * currentA;
    const dragForce = skydiverVelocity.clone().normalize().multiplyScalar(-dragMagnitude);

    // حساب قوة الجاذبية (F_g)
    const gravityForce = new THREE.Vector3(0, -skydiverMass * G, 0);

    // حساب قوة الرياح (F_w) - تبسيطها لقوة ثابتة في الاتجاه الأفقي
    const windForceMagnitude = 0.5 * RHO * windSpeed.lengthSq() * currentCD * A_freefall;
    const windForce = windSpeed.clone().normalize().multiplyScalar(windForceMagnitude);

    // حساب التسارع الكلي
    const totalForce = new THREE.Vector3();
    totalForce.add(gravityForce);
    totalForce.add(dragForce);
    totalForce.add(windForce);
    skydiverAcceleration.copy(totalForce).divideScalar(skydiverMass);

    // تحديث السرعة
    skydiverVelocity.add(skydiverAcceleration.clone().multiplyScalar(DT));

    // تحديث الموضع
    skydiverPosition.add(skydiverVelocity.clone().multiplyScalar(DT));

    // تحديث موضع المظلي في المشهد
    skydiver.position.copy(skydiverPosition);

    // تحديث موضع المظلة (إذا كانت مفتوحة)
    if (isParachuteOpen) {
        parachute.position.copy(skydiverPosition).add(new THREE.Vector3(0, 5, 0)); // ضع المظلة فوق المظلي بقليل
        parachute.rotation.y += 0.05; // أضف دورانًا بسيطًا للمظلة
    }

    // الهبوط الآمن
    // تحقق من الاصطدام بالأرض (y <= ارتفاع الأرض عند نقطة المظلي)
    const groundHeightAtSkydiver = getTerrainHeight(skydiverPosition.x, skydiverPosition.z);
    if (skydiverPosition.y <= groundHeightAtSkydiver) {
        skydiverPosition.y = groundHeightAtSkydiver; // يلامس الأرض
        skydiverVelocity.set(0, 0, 0); // تتوقف الحركة
        skydiverAcceleration.set(0, 0, 0);
        simulationStarted = false; // توقف المحاكاة الفيزيائية
        console.log("Skydiver landed safely!");
        parachute.visible = false; // إخفاء المظلة عند الهبوط
        skydiver.material.color.set(0x00ff00); // تغيير لون المظلي بعد الهبوط
    }
}

// دالة للحصول على ارتفاع التضاريس عند نقطة معينة
// تستخدم طريقة أقرب نقطة (nearest neighbor) وهي تبسيط
function getTerrainHeight(x, z) {
    const halfWidth = terrainWidth / 2;
    const halfDepth = terrainDepth / 2;

    // تحويل إحداثيات المشهد إلى إحداثيات الهندسة (0 إلى resolution-1)
    const ix = Math.floor((x + halfWidth) / (terrainWidth / (terrainResolution - 1)));
    const iz = Math.floor((z + halfDepth) / (terrainDepth / (terrainResolution - 1)));

    // التحقق من الحدود
    if (ix < 0 || ix >= terrainResolution || iz < 0 || iz >= terrainResolution) {
        return 0; // خارج نطاق التضاريس، افترض ارتفاع 0
    }

    // حساب الفهرس (index) للوصول إلى الـ vertex الصحيح في array attributes.position
    const vertexIndex = (iz * terrainResolution + ix) * 3 + 1; // +1 لأن Y هو العنصر الثاني (j+1 في for loop)

    if (vertexIndex < 0 || vertexIndex >= vertices.length) return 0; // حماية إضافية

    return vertices[vertexIndex] + terrain.position.y; // إضافة إزاحة الأرض إذا كانت موجودة
}


// --- حلقة الرسوميات ---
function animate() {
    requestAnimationFrame(animate);

    // حركة الطائرة قبل القفز
    if (airplaneFlying) {
        // **تعديل:** الطائرة تتحرك في اتجاه Z السالب (من اليمين لليسار)
        airplane.position.z -= airplaneSpeed * DT; 

        // الكاميرا تتبع الطائرة قبل القفز
        if (cameraLookAtAirplane) {
            // الكاميرا خلف الطائرة (Z أكثر إيجابية) لتنظر إليها وهي تتحرك نحو Z السلبي
            camera.position.copy(airplane.position.clone().add(new THREE.Vector3(0, 15, 30))); 
            camera.lookAt(airplane.position);
        }
    }

    updatePhysics(); // تحديث الفيزياء في كل إطار

    // تحديث موقع الكاميرا لتتبع المظلي بعد بدء المحاكاة
    if (simulationStarted) {
        const cameraTargetPosition = skydiver.position.clone().add(cameraOffset);
        camera.position.copy(cameraTargetPosition);
        camera.lookAt(skydiver.position);
    }
    
    renderer.render(scene, camera);
}

animate();

// --- عناصر التحكم باللوحة المفاتيح ---
document.addEventListener('keydown', (event) => {
    // الزر 'f' للقفز (Jump)
    if (event.key === 'f' || event.key === 'F') {
        if (!simulationStarted) { // يمكن القفز مرة واحدة فقط
            simulationStarted = true;
            airplaneFlying = false; // إيقاف حركة الطائرة
            airplane.visible = false; // إخفاء الطائرة بعد القفز
            cameraLookAtAirplane = false; // الكاميرا تتوقف عن تتبع الطائرة

            console.log("Skydiver jumped!");
            // نقل المظلي من الطائرة إلى موقع القفز
            skydiverPosition.copy(airplane.position);
            // **تعديل:** المظلي يرث السرعة الأفقية للطائرة في اتجاه Z السالب
            skydiverVelocity.z = -airplaneSpeed; 
            
            // المظلي يبدأ في السقوط الحر
        }
    }

    // الزر 'o' لفتح المظلة (Open Parachute)
    if (event.key === 'o' || event.key === 'O') {
        if (simulationStarted && !isParachuteOpen) { // يمكن فتح المظلة مرة واحدة فقط بعد القفز
            isParachuteOpen = true;
            parachute.visible = true; // إظهار المظلة
            skydiver.material.color.set(0x0000ff); // تغيير لون المظلي
            console.log("Parachute opened!");
        }
    }
});

// --- التعامل مع تغيير حجم النافذة ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});