import { createNoise2D } from 'simplex-noise';
import * as THREE from 'three';
import { PMREMGenerator } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

console.log("Value of PMREMGenerator:", PMREMGenerator);

// --- إعدادات المشهد الأساسية ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x3674B5, 0.0003); // لون الضباب، وكثافة الضباب
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.3;
document.body.appendChild(renderer.domElement);

// --- تهيئة OrbitControls ---
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enablePan = false;
controls.enableZoom = true;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;
controls.target.set(0, 500, 0);
controls.rotateSpeed = 0.2;

// --- الأضواء (قللت الشدة لأن الـ environment map ستوفر إضاءة) ---
const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
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

// --- إعداد Environment Map من ملف HDR ---
const pmremGenerator = new PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

new RGBELoader()
    .setPath('/assets/hdri/')
    .load('overcast_soil_puresky_4k.hdr', function (texture) {
        const envMap = pmremGenerator.fromEquirectangular(texture).texture;
        scene.environment = envMap;
        scene.background = envMap;
        texture.dispose();
        pmremGenerator.dispose();
        console.log("HDR environment map loaded and applied!");
    },
    function (xhr) {
        console.log('HDR ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
        console.error('An error occurred while loading the HDR environment map:', error);
    }
);
// --- إنشاء الأرض (تضاريس باستخدام Simplex Noise) ---
const terrainWidth = 10000;
const terrainDepth = 10000;
// --- تهيئة محمل الأنسجة وإعداداتها ---
const textureLoader = new THREE.TextureLoader();

const terrainBaseColorMap = textureLoader.load('/assets/textures/rocky_terrain_02_diff_2k.jpg');
const terrainNormalMap = textureLoader.load('/assets/textures/rocky_terrain_02_nor_gl_2k.png');
const terrainRoughnessMap = textureLoader.load('/assets/textures/rocky_terrain_02_rough_2k.png');
const terrainAOMap = textureLoader.load('/assets/textures/rocky_terrain_02_ao_2k.png'); // إضافة Ambient Occlusion Map

const repeatFactor = 500; // ***** هذه القيمة هي التي ستتحكم في حجم تكرار Texture *****

terrainBaseColorMap.wrapS = THREE.RepeatWrapping;
terrainBaseColorMap.wrapT = THREE.RepeatWrapping;
terrainBaseColorMap.repeat.set(terrainWidth / repeatFactor, terrainDepth / repeatFactor);

terrainNormalMap.wrapS = THREE.RepeatWrapping;
terrainNormalMap.wrapT = THREE.RepeatWrapping;
terrainNormalMap.repeat.set(terrainWidth / repeatFactor, terrainDepth / repeatFactor);

terrainRoughnessMap.wrapS = THREE.RepeatWrapping;
terrainRoughnessMap.wrapT = THREE.RepeatWrapping;
terrainRoughnessMap.repeat.set(terrainWidth / repeatFactor, terrainDepth / repeatFactor);

terrainAOMap.wrapS = THREE.RepeatWrapping;
terrainAOMap.wrapT = THREE.RepeatWrapping;
terrainAOMap.repeat.set(terrainWidth / repeatFactor, terrainDepth / repeatFactor);

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

const terrainMaterial = new THREE.MeshStandardMaterial({
    map: terrainBaseColorMap,
    normalMap: terrainNormalMap,
    roughnessMap: terrainRoughnessMap,
    aoMap: terrainAOMap,
});

terrainMaterial.aoMapIntensity = 1.0;

const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
terrain.receiveShadow = true;
scene.add(terrain);

// --- المتغيرات للموديلات التي سيتم تحميلها ---
let skydiverVisualGroup = null; // الحاوية البصرية للمظلي
let loadedSkydiverModel = null;
let airplane = null;
let parachute = null; // سيشير إلى LoadedParachuteModel (هذا المتغير أصبح غير ضروري لأنه لدينا loadedParachuteModel مباشرة)

let loadedHelicopterModel = null;
let loadedParachuteModel = null;

function attachParachuteToSkydiver() {
    if (loadedSkydiverModel && loadedParachuteModel) {
        if (!loadedSkydiverModel.children.includes(loadedParachuteModel)) {
            loadedSkydiverModel.add(loadedParachuteModel);
            console.log("Parachute attached to Skydiver model via helper function.");
        }
        
        loadedParachuteModel.position.set(0, -375, 180); // جرب هذه القيم الدقيقة جدًا
        loadedParachuteModel.rotation.x = -Math.PI; // دوران عادة ما يكون ضرورياً
        loadedParachuteModel.rotation.y = 0 ; // دوران إضافي قد تحتاجه
        loadedParachuteModel.rotation.z = Math.PI; // لضبط الانحراف

        loadedParachuteModel.visible = false; // ابدأ دائماً والمظلة غير مرئية
    }
}


// --- تحميل نموذج GLTF للمظلي ---
const skydiverLoader = new GLTFLoader();
skydiverLoader.load(
    '/assets/skydiver_model/scene.gltf',
    function (gltf) {
        loadedSkydiverModel = gltf.scene;

        skydiverVisualGroup = new THREE.Object3D();
        skydiverVisualGroup.add(loadedSkydiverModel);

        loadedSkydiverModel.position.y = -20;
        loadedSkydiverModel.position.z = -10;
        loadedSkydiverModel.scale.set(0.1, 0.1, 0.1);
        
        loadedSkydiverModel.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        scene.add(skydiverVisualGroup);

        skydiverVisualGroup.position.copy(airplaneInitialPosition);
        skydiverPosition.copy(airplaneInitialPosition);

        console.log("Skydiver GLTF model loaded and grouped successfully!");
        attachParachuteToSkydiver();
    },
    function (xhr) {
        console.log('Skydiver ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
        console.error('An error occurred while loading the skydiver GLTF model:', error);
    }
);

// --- تحميل نموذج GLTF للمروحية (الطائرة) ---
const honda_haLoader = new GLTFLoader();
honda_haLoader.load(
    '/assets/honda_ha/scene.gltf',
    function (gltf) {
        loadedHelicopterModel = gltf.scene;
        loadedHelicopterModel.scale.set(1, 1, 1);
        loadedHelicopterModel.rotation.y = -Math.PI/2;

        loadedHelicopterModel.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        airplane = loadedHelicopterModel;
        scene.add(airplane);
        airplane.position.copy(airplaneInitialPosition);

        console.log("Helicopter GLTF model loaded successfully!");
    },
    function (xhr) {
        console.log('Helicopter ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
        console.error('An error occurred while loading the honda_ha GLTF model:', error);
    }
);

// --- تحميل نموذج GLTF للمظلة ---
const parachuteLoader = new GLTFLoader();
parachuteLoader.load(
    '/assets/parachute/scene.gltf',
    function (gltf) {
        loadedParachuteModel = gltf.scene;
        loadedParachuteModel.scale.set(4250, 4250, 4250);

        loadedParachuteModel.traverse((node) => {
            if (node.isMesh) {
                node.castShadow = true;
                node.receiveShadow = true;
            }
        });

        parachute = loadedParachuteModel; // هذا المتغير يشير الآن إلى النموذج الفعلي للمظلة
        attachParachuteToSkydiver();
        console.log("Parachute GLTF model loaded successfully!");
    },
    function (xhr) {
        console.log('Parachute ' + (xhr.loaded / xhr.total * 100) + '% loaded');
    },
    function (error) {
        console.error('An error occurred while loading the parachute GLTF model:', error);
    }
);

// --- إعدادات المحاكاة الفيزيائية ---
const G = 9.81;
const RHO = 1.225;
const DT = 0.016; // Fixed timestep

const MAX_SKYDIVER_TILT_ANGLE = Math.PI / 8; // أقصى زاوية ميلان (22.5 درجة)
const WIND_TILT_SENSITIVITY = 0.01; // مدى حساسية المظلي للرياح (كلما زادت القيمة زاد الميلان)
const TILT_LERP_FACTOR = 0.05; // عامل التنعيم لعودة المظلي لوضعه الطبيعي (أو للاستجابة)

let skydiverMass = 100;
let skydiverPosition = new THREE.Vector3(); // هذا هو متجه الموضع الفيزيائي
let skydiverVelocity = new THREE.Vector3(0, 0, 0);
let skydiverAcceleration = new THREE.Vector3(0, 0, 0);

let CD_freefall = 0.7;
let A_freefall = 0.8;
let CD_parachute = 1.4;
let A_parachute = 25;

let windSpeed = new THREE.Vector3(5, 0, 0);
const MAX_WIND_SPEED_MAGNITUDE = 35;
const WIND_CHANGE_RATE = 0.5;

let isParachuteOpen = false;
let parachuteOpenAltitude = 100;

let hasLanded = false; // جديد: لتتبع ما إذا كان المظلي قد هبط على الأرض
let simulationStarted = false;

// هذا هو المكان الصحيح لتعريف skydiverCollisionOffset - يجب أن يكون مرة واحدة فقط هنا.
const skydiverCollisionOffset = 30; // قم بتعديل هذه القيمة يدويًا لاحقًا إذا لزم الأمر

// ===== إضافة متغيرات للتباطؤ التدريجي للمظلة =====
let isParachuteOpening = false;
let parachuteOpeningProgress = 0;
const PARACHUTE_OPENING_DURATION = 1.5;

// إعدادات حركة الطائرة
const airplaneInitialPosition = new THREE.Vector3(0, 500, 300);
const airplaneSpeed = 60;

camera.position.set(0, 550, 400);

// --- إعادة تعريف متغيرات التحكم اليدوية بالكاميرا ---
const cameraSpeed = 100;
const keyState = {
    w: false, s: false, a: false, d: false,
    q: false, e: false,
    arrowUp: false, arrowDown: false,
    arrowLeft: false, arrowRight: false,
    z: false,
    x: false
};

// --- تعريف Raycaster للتعامل مع التصادمات ---
const raycaster = new THREE.Raycaster();
const down = new THREE.Vector3(0, -1, 0);

// --- وظيفة تحديث الفيزياء ---
function updatePhysics() {
    // لا تقم بتحديث الفيزياء إذا لم تبدأ المحاكاة أو إذا كان المظلي قد هبط
    if (!skydiverVisualGroup || !simulationStarted || hasLanded) return; // ***** تم التعديل هنا *****

    // تحديث تقدم فتح المظلة
    if (isParachuteOpening) {
        parachuteOpeningProgress += DT / PARACHUTE_OPENING_DURATION;
        if (parachuteOpeningProgress >= 1) {
            parachuteOpeningProgress = 1;
            isParachuteOpening = false;
            isParachuteOpen = true;
            console.log("Parachute opened fully!");
        }
    }

    // حساب قيم CD و A بناءً على حالة المظلة
    let currentCD;
    let currentA;

    if (isParachuteOpen) {
        currentCD = CD_parachute;
        currentA = A_parachute;
    } else if (isParachuteOpening) {
        currentCD = CD_freefall + (CD_parachute - CD_freefall) * parachuteOpeningProgress;
        currentA = A_freefall + (A_parachute - A_freefall) * parachuteOpeningProgress;
    } else {
        currentCD = CD_freefall;
        currentA = A_freefall;
    }

    const gravityForce = new THREE.Vector3(0, -skydiverMass * G, 0);
    const relativeAirVelocity = skydiverVelocity.clone().sub(windSpeed);
    const relativeSpeedSq = relativeAirVelocity.lengthSq();
    const dragMagnitude = 0.5 * RHO * relativeSpeedSq * currentCD * currentA;
    const dragForce = relativeAirVelocity.clone().normalize().multiplyScalar(-dragMagnitude);

    const totalForce = new THREE.Vector3();
    totalForce.add(gravityForce);
    totalForce.add(dragForce);

    skydiverAcceleration.copy(totalForce).divideScalar(skydiverMass);
    skydiverVelocity.add(skydiverAcceleration.clone().multiplyScalar(DT));
    skydiverPosition.add(skydiverVelocity.clone().multiplyScalar(DT));

    raycaster.set(skydiverPosition, down);
    const intersects = raycaster.intersectObject(terrain);

    if (intersects.length > 0) {
        const collisionPoint = intersects[0].point;
        const groundHeightAtSkydiver = collisionPoint.y;

        // ***** تأكد أن skydiverCollisionOffset معرّف في النطاق العام (وقد فعلنا ذلك الآن) *****
        if (skydiverPosition.y - skydiverCollisionOffset <= groundHeightAtSkydiver) {
            skydiverPosition.y = groundHeightAtSkydiver + skydiverCollisionOffset;
            skydiverVelocity.set(0, 0, 0);
            skydiverAcceleration.set(0, 0, 0);
            simulationStarted = false; // توقف المحاكاة الفيزيائية
            hasLanded = true; // تعيين حالة الهبوط
            console.log("Skydiver landed safely!");

            if (skydiverVisualGroup) {
                skydiverVisualGroup.rotation.set(0, 0, 0); // إعادة تعيين دوران المظلي لوضع الوقوف
            }

            if (loadedParachuteModel) {
                loadedParachuteModel.visible = false; // ***** المظلة تختفي عند الهبوط *****
            }
        }
    }
}

// وظيفة لتحديث سرعة الرياح بناءً على ضغطات الأسهم
function updateWindDirection() {
    // يمكن التحكم في الرياح حتى لو كان المظلي على الأرض، ولكن لن تؤثر عليه
    let windChanged = false;

    if (keyState.arrowLeft) {
        windSpeed.x -= WIND_CHANGE_RATE;
        windChanged = true;
    }
    if (keyState.arrowRight) {
        windSpeed.x += WIND_CHANGE_RATE;
        windChanged = true;
    }
    if (keyState.arrowUp) {
        windSpeed.z -= WIND_CHANGE_RATE;
        windChanged = true;
    }
    if (keyState.arrowDown) {
        windSpeed.z += WIND_CHANGE_RATE;
        windChanged = true;
    }

    if (keyState.z) {
        const currentWindMagnitude = windSpeed.length();
        if (currentWindMagnitude > 0) {
            windSpeed.multiplyScalar((currentWindMagnitude + WIND_CHANGE_RATE) / currentWindMagnitude);
        } else {
            windSpeed.x = WIND_CHANGE_RATE;
        }
        windChanged = true;
    }
    if (keyState.x) {
        const currentWindMagnitude = windSpeed.length();
        if (currentWindMagnitude > 0) {
            windSpeed.multiplyScalar((currentWindMagnitude - WIND_CHANGE_RATE) / currentWindMagnitude);
            if (windSpeed.lengthSq() < (WIND_CHANGE_RATE * 0.1) * (WIND_CHANGE_RATE * 0.1)) {
                windSpeed.set(0, 0, 0);
            }
        }
        windChanged = true;
    }

    if (windSpeed.length() > MAX_WIND_SPEED_MAGNITUDE) {
        windSpeed.setLength(MAX_WIND_SPEED_MAGNITUDE);
    }
}

// دالة تحديث موضع الكاميرا
function updateCameraPosition() {
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    const right = new THREE.Vector3();
    right.crossVectors(cameraDirection, camera.up);
    right.normalize();

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

    if (keyState.q) {
        camera.position.y += cameraSpeed * DT;
        controls.target.y += cameraSpeed * DT;
    }
    if (keyState.e) {
        camera.position.y -= cameraSpeed * DT;
        controls.target.y -= cameraSpeed * DT;
    }
}

// وظيفة لتحديث عناصر الإحصائيات في HTML
function updateStatsDisplay() {
    document.getElementById('skydiver-speed').textContent = skydiverVelocity.length().toFixed(2);
    document.getElementById('skydiver-altitude').textContent = skydiverPosition.y.toFixed(2);
    document.getElementById('wind-speed').textContent = windSpeed.length().toFixed(2);

    let directionText;
    let finalCompassAngle = 0;

    if (windSpeed.lengthSq() < 0.1 * 0.1) {
        directionText = "Still";
    } else {
        const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];
        let actualAngleRad = Math.atan2(windSpeed.x, -windSpeed.z);
        let actualAngleDeg = THREE.MathUtils.radToDeg(actualAngleRad);
        if (actualAngleDeg < 0) {
            actualAngleDeg += 360;
        }
        finalCompassAngle = actualAngleDeg;
        const index = Math.round(actualAngleDeg / 45);
        directionText = directions[index];
    }
    document.getElementById('wind-direction').textContent = `${directionText} (${finalCompassAngle.toFixed(0)}°)`;
}

function updateSkydiverRotationBasedOnWind() {
    // ***** جديد: لا تقم بتدوير المظلي إذا لم يكن في المحاكاة أو إذا هبط *****
    if (!skydiverVisualGroup || !simulationStarted || hasLanded) {
        // يمكنك هنا إعادة تعيين الدوران إلى صفر إذا أردت التأكد من أنه يقف مستقيماً
        if (skydiverVisualGroup && hasLanded) {
            skydiverVisualGroup.rotation.set(0,0,0);
        }
        return; 
    }

    const currentWindDirection = new THREE.Vector2(windSpeed.x, windSpeed.z);
    const windMagnitude = currentWindDirection.length();

    if (windMagnitude > 0.1) {
        let tiltAmount = THREE.MathUtils.mapLinear(windMagnitude, 0, MAX_WIND_SPEED_MAGNITUDE, 0, MAX_SKYDIVER_TILT_ANGLE);
        
        const targetRotationX = THREE.MathUtils.clamp(windSpeed.z * WIND_TILT_SENSITIVITY, -MAX_SKYDIVER_TILT_ANGLE, MAX_SKYDIVER_TILT_ANGLE);
        skydiverVisualGroup.rotation.x = THREE.MathUtils.lerp(skydiverVisualGroup.rotation.x, targetRotationX, TILT_LERP_FACTOR);

        const targetRotationZ = THREE.MathUtils.clamp(-windSpeed.x * WIND_TILT_SENSITIVITY, -MAX_SKYDIVER_TILT_ANGLE, MAX_SKYDIVER_TILT_ANGLE);
        skydiverVisualGroup.rotation.z = THREE.MathUtils.lerp(skydiverVisualGroup.rotation.z, targetRotationZ, TILT_LERP_FACTOR);
    } else {
        skydiverVisualGroup.rotation.x = THREE.MathUtils.lerp(skydiverVisualGroup.rotation.x, 0, TILT_LERP_FACTOR);
        skydiverVisualGroup.rotation.z = THREE.MathUtils.lerp(skydiverVisualGroup.rotation.z, 0, TILT_LERP_FACTOR);
    }
}

// حلقة الرسوميات
function animate() {
    requestAnimationFrame(animate);

    if (airplane) {
        airplane.position.z -= airplaneSpeed * DT;
    }

    // المظلي يتبع الطائرة فقط إذا لم تبدأ المحاكاة ولم يهبط بعد
    if (!simulationStarted && !hasLanded && skydiverVisualGroup && airplane) {
        skydiverVisualGroup.position.copy(airplane.position);
        skydiverPosition.copy(airplane.position);
    }

    updatePhysics(); // ستتوقف هذه الدالة عن تحديث الفيزياء عندما hasLanded = true
    updateWindDirection(); // هذه يمكن أن تستمر في العمل لتغيير الرياح عالمياً
    updateSkydiverRotationBasedOnWind(); // تم التعديل ليتوقف الدوران عند الهبوط

    updateCameraPosition();
    controls.update();
    updateStatsDisplay();

    // بعد تحديث الفيزياء، قم بتحديث موقع المجموعة البصرية (لا تزال تعمل حتى بعد الهبوط لتحديث الموضع الثابت)
    if (skydiverVisualGroup) {
        skydiverVisualGroup.position.copy(skydiverPosition);
    }
    
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
        case 'arrowleft': keyState.arrowLeft = true; break;
        case 'arrowright': keyState.arrowRight = true; break;
        case 'arrowup': keyState.arrowUp = true; break;
        case 'arrowdown': keyState.arrowDown = true; break;
        case 'z': keyState.z = true; break;
        case 'x': keyState.x = true; break;
    }

    // زر 'F' للقفز من الطائرة
    if (event.key === 'f' || event.key === 'F') {
        // اسمح بالقفز فقط إذا لم تكن المحاكاة قيد التشغيل (مما يعني أن المظلي إما مع الطائرة أو قد هبط)
        if (!simulationStarted) {
            if (skydiverVisualGroup && airplane) {
                // ***** جديد: إعادة تعيين جميع حالات المحاكاة لبدء قفزة جديدة *****
                simulationStarted = true;
                hasLanded = false; // يجب أن لا يكون قد هبط بعد
                isParachuteOpen = false; // المظلة ليست مفتوحة
                isParachuteOpening = false; // المظلة ليست في طور الفتح
                parachuteOpeningProgress = 0; // إعادة ضبط تقدم الفتح

                // تأكد أن المظلي مرئي ومظلته غير مرئية مبدئيًا
                // skydiverVisualGroup.visible = true; // عادة ما يكون مرئيا بالفعل، لكن للتأكد
                if (loadedParachuteModel) {
                    loadedParachuteModel.visible = false; // المظلة غير مرئية في البداية
                    // يمكنك أيضاً إعادة ضبط مقياس المظلة هنا إذا كنت تغيرها عند الفتح
                    // loadedParachuteModel.scale.set(4250, 4250, 4250); 
                    
                    // أعد المظلة إلى المظلي إذا كانت قد انفصلت لأي سبب (عادة لا تحتاج إذا كان طفلاً للمظلي)
                    if (!loadedSkydiverModel.children.includes(loadedParachuteModel)) {
                         loadedSkydiverModel.add(loadedParachuteModel);
                    }
                    // أعد ضبط موضع المظلة بالنسبة للمظلي إذا لزم الأمر
                    loadedParachuteModel.position.set(0, -375, 180);
                    loadedParachuteModel.rotation.x = -Math.PI;
                    loadedParachuteModel.rotation.y = 0;
                    loadedParachuteModel.rotation.z = Math.PI;
                }

                // وضع المظلي في مكان الطائرة
                skydiverPosition.copy(airplane.position);
                skydiverVisualGroup.position.copy(airplane.position); // تأكد أن المجموعة البصرية تحدثت أيضًا
                skydiverVelocity.set(0, 0, 0); // إعادة ضبط السرعة
                skydiverAcceleration.set(0, 0, 0); // إعادة ضبط التسارع

                // إعادة ضبط دوران المظلي لوضع الطيران (عادة يكون مستقيماً)
                // هذا ضروري لعدم بدء القفزة التالية بميلان غريب
                if (skydiverVisualGroup) {
                    skydiverVisualGroup.rotation.set(0, 0, 0);
                    // إذا كان لنموذجك دوران افتراضي للوقوف داخل skydiverVisualGroup
                }

                console.log("Skydiver jumped!");
                skydiverVelocity.z = -airplaneSpeed; // أعطه سرعة أولية متجهة للخلف مع الطائرة
                skydiverVelocity.x = 0;
            } else {
                console.warn("Skydiver or Airplane model not loaded yet. Please wait.");
            }
        }
    }

    // ===== تعديل منطق زر 'O' لفتح المظلة تدريجياً =====
    if (event.key === 'o' || event.key === 'O') {
        if (simulationStarted && !isParachuteOpen && !isParachuteOpening) {
            if (loadedParachuteModel) {
                isParachuteOpening = true;
                parachuteOpeningProgress = 0;
                loadedParachuteModel.visible = true; // اجعل المظلة مرئية عند بدء الفتح
                console.log("Parachute opening initiated!");
            } else {
                console.warn("Parachute model not loaded yet. Please wait.");
            }
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