// =========== IMPORT THƯ VIỆN THREE.JS ===========
import * as THREE from "https://unpkg.com/three/build/three.module.js";
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
  


// =========== KHỞI TẠO SCENE, CAMERA, RENDERER ===========
// Scene chính
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, 0.0015);

// Camera góc nhìn phối cảnh
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);
camera.position.set(0, 20, 30);
  
// Renderer WebGL (gắn canvas vào #container)
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.getElementById('container').appendChild(renderer.domElement);

// Điều khiển xoay và zoom bằng chuột 
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.1;
controls.enabled = false;
controls.target.set(0, 0, 0);
controls.enablePan = false;
controls.minDistance = 15;
controls.maxDistance = 300;
controls.zoomSpeed = 0.3;
controls.rotateSpeed = 0.3;  
controls.update();   

// Tạo 1 sprite phát sáng dạng gradient tròn
function createGlowMaterial(color, size = 555, opacity = 0.55) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
        map: texture, 
        transparent: true,
        opacity: opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    return new THREE.Sprite(material);
}    

// Vầng sáng trắng ở tâm hành tinh
const centralGlow = createGlowMaterial('rgba(255,255,255,0.8)', 250, 0.25);
centralGlow.scale.set(11, 11, 1);
scene.add(centralGlow);

// Rải ngẫu nhiên các đám tinh vân màu sắc quanh không gian
const nebulaCount = 18;
for (let i = 0; i < nebulaCount; i++) {
    const hue = Math.random() * 360;
    const color = `hsla(${hue}, 80%, 50%, 0.5)`;
    const nebula = createGlowMaterial(color, 256);
    nebula.scale.set(111, 111, 1);
    nebula.position.set(
        (Math.random() - 0.5) * 188,
        (Math.random() - 0.5) * 188,
        (Math.random() - 0.5) * 188
    );
    scene.add(nebula);
}        

// =========== THIÊN HÀ (GALAXY) ===========
// Tham số hình dạng thiên hà
const galaxyParameters = {
    count: 100000,
    arms: 6,
    radius: 100,               
    spin: 0.5, 
    randomness: 0.2,
    randomnessPower: 20,
    insideColor: new THREE.Color(0xd63ed6),
    outsideColor: new THREE.Color(0x48b8b8),
    rippleSpeed: 40.0,
    rippleWidth: 20.0,   
};  

// =========== 4 ẢNH NỔI ===========
const images = Array.from(
               {length: 10},   // Độ dài mảng = Số ảnh img${i}.png trong thư mục images 
               (_, i) => `images/img ${i+1}.png`
               );

const containers = [
    'container-img1',
    'container-img2',
    'container-img3',
    'container-img4'
];

function shuffleArray(arr) {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

window.shuffleArray = shuffleArray;

const shuffledImages = shuffleArray(images);

containers.forEach((id, index) => {
    const el = document.getElementById(id);
    if (!el) return;

    const randomImage = shuffledImages[index % shuffledImages.length];
    el.style.backgroundImage = `url('${randomImage}')`;
});

window.usedContainerImages = shuffledImages.slice(0, containers.length);
window.leftoverImages = shuffledImages.slice(containers.length);
window.fullImagePool = images;
    
    
    
// Ảnh dùng cho tất cả các cụm khung hình (trái tim, tròn, sao, mây, ...)
// Lưu ý: dùng đúng định dạng tên file "img N.png" (có khoảng trắng) giống mảng `images` ở trên,
// nếu không khớp tên file thật trong thư mục thì ảnh sẽ lỗi 404 và cụm điểm 3D (hố đen) sẽ
// không bao giờ được tạo ra — khiến bấm vào không có gì xảy ra.
const heartImages = Array.from(
                    {length: 10},   // Độ dài mảng = Số ảnh img N.png trong thư mục images 
                    (_, i) => `images/img ${i+1}.png`
                    );

// Danh sách các loại khung
const FRAME_SHAPE_POOL = ['heart',
                          'circle', 
                          'star', 
                          'diamond', 
                          'hexagon', 
                          'cloud', 
                          'flower',];

// Chế độ chọn khung hình:
// -'uniform': tất cả các cụm ảnh dùng chung 1 loại khung (VD: toàn tim, toàn tròn, toàn mây...)
// -'mixed': mỗi cụm ảnh được random 1 loại khung riêng (trộn lẫn nhiều hình dạng khác nhau)
// -'auto': mỗi lần tải trang sẽ tự random chọn 1 trong 2 chế độ 'uniform' và 'mixed'
const FRAME_SHAPE_MODE = 'auto';

// =========== CÁC HÀM VẼ HÌNH KHUNG ===========
// Hàm vẽ path cho từng loại khung, tâm tại (x, y), bán kính cơ sở r
function drawHeartPath(ctx, x, y, r) {
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + r, y - r, x + r * 1.5, y + r * 0.6, x, y + r * 1.2);
    ctx.bezierCurveTo(x - r * 1.5, y + r * 0.6, x - r, y - r, x, y);
}

function drawCirclePath(ctx, x, y, r) {
    ctx.moveTo(x + r * 1.05, y);
    ctx.arc(x, y, r * 1.05, 0, Math.PI * 2);
}

function drawStarPath(ctx, x, y, r) {
    const spikes = 5;
    const outerR = r * 1.35;
    const innerR = r * 0.58;
    let rot = (Math.PI / 2) * 3;
    const step = Math.PI / spikes;
    ctx.moveTo(x, y - outerR);
    for (let i = 0; i < spikes; i++) {
        ctx.lineTo(x + Math.cos(rot) * outerR, y + Math.sin(rot) * outerR);
        rot += step;
        ctx.lineTo(x + Math.cos(rot) * innerR, y + Math.sin(rot) * innerR);
        rot += step;
    }
    ctx.lineTo(x, y - outerR);
}

function drawDiamondPath(ctx, x, y, r) {
    const d = r * 1.35;
    ctx.moveTo(x, y - d);
    ctx.lineTo(x + d * 0.72, y);
    ctx.lineTo(x, y + d);
    ctx.lineTo(x - d * 0.72, y);
    ctx.closePath();
}

function drawHexagonPath(ctx, x, y, r) {
    const R = r * 1.15;
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const px = x + R * Math.cos(angle);
        const py = y + R * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
}

function drawCloudPath(ctx, x, y, r) {
    const s = r * 0.58;
    const blobs = [
        [x - s * 1.5, y + s * 0.35, s * 0.9],
        [x - s * 0.5, y - s * 0.4, s * 1.1],
        [x + s * 0.5, y - s * 0.5, s * 1.0],
        [x + s * 1.5, y, s * 0.85],
        [x, y + s * 0.55, s * 1.25]
    ];
    blobs.forEach(([cx, cy, cr]) => {
        ctx.moveTo(cx + cr, cy);
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
    });
}

function drawFlowerPath(ctx, x, y, r) {
    const petalR = r * 0.55;
    const dist = r * 0.62;
    const petals = 6;
    for (let i = 0; i < petals; i++) {
        const angle = ((Math.PI * 2) / petals) * i;
        const cx = x + Math.cos(angle) * dist;
        const cy = y + Math.sin(angle) * dist;
        ctx.moveTo(cx + petalR, cy);
        ctx.arc(cx, cy, petalR, 0, Math.PI * 2);
    }
    ctx.moveTo(x + petalR * 0.85, y);
    ctx.arc(x, y, petalR * 0.85, 0, Math.PI * 2);
}

// Cấu hình mỗi loại khung
const FRAME_SHAPES = {
    heart: {draw: drawHeartPath, scale: 0.65, offsetY: -0.03},
    circle: {draw: drawCirclePath, scale: 0.78, offsetY: 0},
    star: {draw: drawStarPath, scale: 0.5, offsetY: 0},
    diamond: {draw: drawDiamondPath, scale: 0.58, offsetY: 0},
    hexagon: {draw: drawHexagonPath, scale: 0.72, offsetY: 0},
    cloud: {draw: drawCloudPath, scale: 0.55, offsetY: 0.06},
    flower: {draw: drawFlowerPath, scale: 0.52, offsetY: 0},
};

// Xác định chế độ khung
function resolveFrameMode(mode) {
    if (mode === 'uniform' || mode === 'mixed') return mode;
    return Math.random() < 0.5 ? 'uniform' : 'mixed'; // 'auto' -> random giữa 2 chế độ
}

const resolvedFrameMode = resolveFrameMode(FRAME_SHAPE_MODE);
const uniformFrameShape = FRAME_SHAPE_POOL[Math.floor(Math.random() * FRAME_SHAPE_POOL.length)];

// Trả về loại khung sẽ dùng cho 1 cụm ảnh (gọi 1 lần cho mỗi cụm)
function getFrameShapeForGroup() {
    if (resolvedFrameMode === 'uniform') return uniformFrameShape;
    return FRAME_SHAPE_POOL[Math.floor(Math.random() * FRAME_SHAPE_POOL.length)];
}

window.frameShapeInfo = { mode: resolvedFrameMode, uniformShape: uniformFrameShape, pool: FRAME_SHAPE_POOL };



const textureLoader = new THREE.TextureLoader();
const numGroups = heartImages.length;

// Video riêng cho từng "hố đen" (cụm ảnh), theo đúng số lượng cụm hiện có.
// Đặt file video tương ứng vào thư mục video/ với tên: "video/planet 1.mp4", "video/planet 2.mp4", ...
const CLUSTER_VIDEOS = Array.from(
    { length: numGroups },
    (_, i) => `videos/planet ${i+1}.mp4`
);
const maxDensity = 15000;
const minDensity = 4000;
const maxGroupsForScale = 9;

// Số điểm mỗi cụm ảnh
let pointsPerGroup;      

if (numGroups <= 1) {
    pointsPerGroup = maxDensity;
} else if (numGroups >= maxGroupsForScale) {
    pointsPerGroup = minDensity;
} else {
    const t = (numGroups - 1) / (maxGroupsForScale - 1);
    pointsPerGroup = Math.floor(maxDensity * (1 - t) + minDensity * t);
}

if (pointsPerGroup * numGroups > galaxyParameters.count) {
    pointsPerGroup = Math.floor(galaxyParameters.count / numGroups);
}

// Vị trí và màu cho từng điểm của thiên hà
const positions = new Float32Array(galaxyParameters.count * 3);
const colors = new Float32Array(galaxyParameters.count * 3);
let pointIdx = 0;

for (let i = 0; i < galaxyParameters.count; i++) {
    const radius = Math.pow(Math.random(), galaxyParameters.randomnessPower) * galaxyParameters.radius;
    const branchAngle = (i % galaxyParameters.arms) / galaxyParameters.arms * Math.PI * 2;
    const spinAngle = radius * galaxyParameters.spin;

    const randomX = (Math.random() - 0.5) * galaxyParameters.randomness * radius;
    const randomY = (Math.random() - 0.5) * galaxyParameters.randomness * radius * 0.5;
    const randomZ = (Math.random() - 0.5) * galaxyParameters.randomness * radius;
    const totalAngle = branchAngle + spinAngle;

    if (radius < 30 && Math.random() < 0.7) continue;

    const i3 = pointIdx * 3;
    positions[i3] = Math.cos(totalAngle) * radius + randomX;
    positions[i3 + 1] = randomY;
    positions[i3 + 2] = Math.sin(totalAngle) * radius + randomZ;

    const mixedColor = new THREE.Color(0x6A0DAD);
    mixedColor.lerp(new THREE.Color(0x66ffff), radius / galaxyParameters.radius);
    mixedColor.multiplyScalar(1.3);
    colors[i3] = mixedColor.r;
    colors[i3 + 1] = mixedColor.g;
    colors[i3 + 2] = mixedColor.b;

    pointIdx++;
} 

// Geometry của thiên hà (chỉ giữ số điểm thực sự hợp lệ) 
const galaxyGeometry = new THREE.BufferGeometry();
galaxyGeometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(0, pointIdx * 3), 3));
galaxyGeometry.setAttribute('color', new THREE.BufferAttribute(colors.slice(0, pointIdx * 3), 3));

// Shader material cho các điểm thiên hà, có hỗ trợ hiệu ứng "gợn sóng" (ripple) lan ra từ tâm
const galaxyMaterial = new THREE.ShaderMaterial({
    uniforms: {
        uTime: { value: 0.0 },
        uSize: { value: 50.0 * renderer.getPixelRatio() },
        uRippleTime: { value: -1.0 },
        uRippleSpeed: { value: 40.0 },
        uRippleWidth: { value: 20.0 }
    },
    vertexShader: `
        uniform float uSize;
        uniform float uTime;
        uniform float uRippleTime;
        uniform float uRippleSpeed;
        uniform float uRippleWidth;

        varying vec3 vColor;

        void main() {
            vColor = color;

            vec4 modelPosition = modelMatrix * vec4(position, 1.0);

            if (uRippleTime > 0.0) {
                float rippleRadius = (uTime - uRippleTime) * uRippleSpeed;
                float particleDist = length(modelPosition.xyz);

                float strength = 1.0 - smoothstep(rippleRadius - uRippleWidth, rippleRadius + uRippleWidth, particleDist);
                strength *= smoothstep(rippleRadius + uRippleWidth, rippleRadius - uRippleWidth, particleDist);

                if (strength > 0.0) {
                    vColor += vec3(strength * 2.0);
                }
            }

            vec4 viewPosition = viewMatrix * modelPosition;
            gl_Position = projectionMatrix * viewPosition;
            gl_PointSize = uSize / -viewPosition.z;
        }
    `,
    fragmentShader: `
        varying vec3 vColor;
        void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            if (dist > 0.5) discard;

            gl_FragColor = vec4(vColor, 1.0);
        }
    `,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    vertexColors: true
});

const galaxy = new THREE.Points(galaxyGeometry, galaxyMaterial);
scene.add(galaxy);

// Vẽ 1 ảnh vào texture
function createNeonTexture(image, size, shapeKey = 'heart') {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, size, size);

    ctx.save();
    ctx.beginPath();

    const x = size / 2;
    const y = size / 2;
    const r = size / 4;

    const shapeConfig = FRAME_SHAPES[shapeKey] || FRAME_SHAPES.heart;
    shapeConfig.draw(ctx, x, y, r);

    ctx.closePath();
    ctx.clip(); 

    const scale = shapeConfig.scale;
    const drawSize = size * scale;
    const offsetX = (size - drawSize) / 2;
    const offsetY = (size - drawSize) / 2 - size * shapeConfig.offsetY;

    ctx.drawImage(image, offsetX, offsetY, drawSize, drawSize);
    ctx.restore();

    return new THREE.CanvasTexture(canvas);
}

const heartPointClouds = [];
for (let group = 0; group < numGroups; group++) {
    const groupPositions = new Float32Array(pointsPerGroup * 3);
    const groupColorsNear = new Float32Array(pointsPerGroup * 3);
    const groupColorsFar = new Float32Array(pointsPerGroup * 3);
    let validPointCount = 0;
    for (let i = 0; i < pointsPerGroup; i++) {
        const idx = validPointCount * 3;
        const globalIdx = group * pointsPerGroup + i;
        const radius = Math.pow(Math.random(), galaxyParameters.randomnessPower) * galaxyParameters.radius;
        if (radius < 30) continue;
        const branchAngle = (globalIdx % galaxyParameters.arms) / galaxyParameters.arms * Math.PI * 2;
        const spinAngle = radius * galaxyParameters.spin;
        const randomX = (Math.random() - 0.5) * galaxyParameters.randomness * radius;
        const randomY = (Math.random() - 0.5) * galaxyParameters.randomness * radius * 0.5;
        const randomZ = (Math.random() - 0.5) * galaxyParameters.randomness * radius;
        const totalAngle = branchAngle + spinAngle;
        groupPositions[idx] = Math.cos(totalAngle) * radius + randomX;
        groupPositions[idx + 1] = randomY;
        groupPositions[idx + 2] = Math.sin(totalAngle) * radius + randomZ;
  
        const colorNear = new THREE.Color(0xffffff);
        groupColorsNear[idx] = colorNear.r;
        groupColorsNear[idx + 1] = colorNear.g;
        groupColorsNear[idx + 2] = colorNear.b;

        const colorFar = galaxyParameters.insideColor.clone();
        colorFar.lerp(galaxyParameters.outsideColor, radius / galaxyParameters.radius);
        colorFar.multiplyScalar(0.7 + 0.3 * Math.random());
        groupColorsFar[idx] = colorFar.r;
        groupColorsFar[idx + 1] = colorFar.g;
        groupColorsFar[idx + 2] = colorFar.b;

        validPointCount++;
    }

    if (validPointCount === 0) continue;

    const groupGeometryNear = new THREE.BufferGeometry();
    groupGeometryNear.setAttribute('position', new THREE.BufferAttribute(groupPositions.slice(0, validPointCount * 3), 3));
    groupGeometryNear.setAttribute('color', new THREE.BufferAttribute(groupColorsNear.slice(0, validPointCount * 3), 3));

    const groupGeometryFar = new THREE.BufferGeometry();
    groupGeometryFar.setAttribute('position', new THREE.BufferAttribute(groupPositions.slice(0, validPointCount * 3), 3));
    groupGeometryFar.setAttribute('color', new THREE.BufferAttribute(groupColorsFar.slice(0, validPointCount * 3), 3));

    const posAttr = groupGeometryFar.getAttribute('position');
    let cx = 0, cy = 0, cz = 0;
    for (let i = 0; i < posAttr.count; i++) {
        cx += posAttr.getX(i);
        cy += posAttr.getY(i);
        cz += posAttr.getZ(i);
    }
    cx /= posAttr.count;
    cy /= posAttr.count;
    cz /= posAttr.count;
    groupGeometryNear.translate(-cx, -cy, -cz);
    groupGeometryFar.translate(-cx, -cy, -cz);

    const groupFrameShape = getFrameShapeForGroup();

    // Tải ảnh xong mới tạo texture và material, rồi thêm vào scene
    const img = new window.Image();
    img.crossOrigin = "Anonymous";
    img.src = heartImages[group];
    img.onerror = () => {
        console.warn(`[hố đen ${group + 1}] Không tải được ảnh "${heartImages[group]}" — kiểm tra lại tên file trong thư mục images/. Hố đen này sẽ không hiển thị/bấm được.`);
    };
    img.onload = () => {
        const neonTexture = createNeonTexture(img, 256, groupFrameShape);

        const materialNear = new THREE.PointsMaterial({
            size: 4.8,        
            map: neonTexture,
            transparent: false, 
            alphaTest: 0.2,
            depthWrite: true,
            depthTest: true,
            blending: THREE.NormalBlending,
            vertexColors: true
        });  
   
        const materialFar = new THREE.PointsMaterial({
            size: 7.8,
            map: neonTexture, 
            transparent: true,
            alphaTest: 0.2,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            vertexColors: true
        });

        const pointsObject = new THREE.Points(groupGeometryFar, materialFar);
        pointsObject.position.set(cx, cy, cz);

        pointsObject.userData.groupIndex = group;
        pointsObject.userData.materialNear = materialNear;
        pointsObject.userData.geometryNear = groupGeometryNear;
        pointsObject.userData.materialFar = materialFar;
        pointsObject.userData.geometryFar = groupGeometryFar;

        scene.add(pointsObject);
        heartPointClouds.push(pointsObject);
    };
}



// Ánh sáng môi trường chung
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

// Tạo nền sao rải ngẫu nhiên trong 1 khối lập phương lớn quanh scene
const starCount = 20000;
const starGeometry = new THREE.BufferGeometry();
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount; i++) {
    starPositions[i * 3] = (Math.random() - 0.5) * 900;
    starPositions[i * 3 + 1] = (Math.random() - 0.5) * 900;
    starPositions[i * 3 + 2] = (Math.random() - 0.5) * 900;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));

const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.7,
    transparent: true,
    opacity: 0.7,
    depthWrite: false
});

const starField = new THREE.Points(starGeometry, starMaterial);
starField.name = 'starfield';
starField.renderOrder = 999;
scene.add(starField);

// =========== TINH CẦU TRUNG TÂM ===========
// Vẽ texture bề mặt tinh cầu
function createPlanetTexture(size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(size / 2, size / 2, size / 8, size / 2, size / 2, size / 2);
    gradient.addColorStop(0.0, '#2e1a47');
    gradient.addColorStop(0.1, '#4b2e83');
    gradient.addColorStop(0.2, '#6a3fa0');
    gradient.addColorStop(0.3, '#3d5a80');
    gradient.addColorStop(0.4, '#1b3a4b');
    gradient.addColorStop(0.5, '#0f4c5c');
    gradient.addColorStop(0.6, '#2a9d8f');
    gradient.addColorStop(0.7, '#5c4d7d');
    gradient.addColorStop(0.8, '#25133f');
    gradient.addColorStop(0.9, '#3a1c5e');
    gradient.addColorStop(1.0, '#160c29');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);       
  
    const spotColors = [
                        '#7b4dab',
                        '#9b6fd1',
                        '#2a9d8f',
                        '#4fb8a8',
                        '#3d5a80',
                        '#caa14b',
                        '#e8c377',
                        '#5c3d8a',
                        '#1b3a4b',
                        '#8a5fc2',
                        '#6a3fa0',
                        ];
    // Rải các đốm màu ngẫu nhiên lên bề mặt
    for (let i = 0; i < 111; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const radius = 30 + Math.random() * 120;
        const color = spotColors[Math.floor(Math.random() * spotColors.length)];
        const spotGradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        spotGradient.addColorStop(0, color + 'cc');
        spotGradient.addColorStop(1, color + '00');
        ctx.fillStyle = spotGradient;
        ctx.fillRect(0, 0, size, size);
    }

    // Vẽ thêm các vệt mây cong mờ, giới hạn trong hình tròn của tinh cầu
    for (let i = 0; i < 11; i++) {          
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();     
        ctx.moveTo(Math.random() * size, Math.random() * size);
        ctx.bezierCurveTo(Math.random() * size, Math.random() * size, Math.random() * size, Math.random() * size, Math.random() * size, Math.random() * size);
        ctx.strokeStyle = 'rgba(120, 160, 190, ' + (0.12 + Math.random() * 0.18) + ')';
        ctx.lineWidth = 8 + Math.random() * 18;
        ctx.stroke();
    }

    // Làm mờ nhẹ toàn bộ texture cho mượt
    if (ctx.filter !== undefined) {
        ctx.filter = 'blur(2px)';
        ctx.drawImage(canvas, 0, 0);
        ctx.filter = 'none';
    }

    return new THREE.CanvasTexture(canvas);
}

const stormShader = {
    uniforms: {
        time: { value: 0.0 },
        baseTexture: { value: null }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float time;
        uniform sampler2D baseTexture;
        varying vec2 vUv;
        void main() {
            vec2 uv = vUv;
            float angle = length(uv - vec2(0.5)) * 11.0;
            float twist = sin(angle * 3.0 + time) * 0.11;
            uv.x += twist * sin(time * 0.5);
            uv.y += twist * cos(time * 0.5);
            vec4 texColor = texture2D(baseTexture, uv);
            float noise = sin(uv.x * 11.0 + time) * sin(uv.y * 11.0 + time) * 0.11;
            texColor.rgb += noise * vec3(0.65, 0.75, 0.55);
            gl_FragColor = texColor;
        }
    `
};

const planetRadius = 11;
const planetGeometry = new THREE.SphereGeometry(planetRadius, 111, 111);
const planetTexture = createPlanetTexture();
const planetMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0.0 },
        baseTexture: { value: planetTexture }
    },
    vertexShader: stormShader.vertexShader,
    fragmentShader: stormShader.fragmentShader
});

const planet = new THREE.Mesh(planetGeometry, planetMaterial);
planet.position.set(0, 0, 0);
scene.add(planet);

// Bầu khí quyển của tinh cầu
const atmosphereGeometry = new THREE.SphereGeometry(planetRadius * 1.05, 48, 48);
const atmosphereMaterial = new THREE.ShaderMaterial({
    uniforms: {
        glowColor: { value: new THREE.Color(0x9d7fe0) }
    },        
    vertexShader: `
    varying vec3 vNormal;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    } 
`,

    fragmentShader: `
    varying vec3 vNormal;
    uniform vec3 glowColor;
    void main() {
        float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        float alpha = intensity * 0.4; // giảm độ đậm để mờ hơn
gl_FragColor = vec4(glowColor, alpha);
    }
`,
    side: THREE.BackSide, // Nhìn từ bên trong
    blending: THREE.AdditiveBlending,
    transparent: true
});

const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
planet.add(atmosphere); // Thêm khí quyển làm con 

// =========== SAO BĂNG ===========
let shootingStars = [];

// Tạo sao băng
function createShootingStar() {
    const trailLength = 100;

    // Đầu sao băng
    const headGeometry = new THREE.SphereGeometry(2, 32, 32);
    const headMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);

    // Hào quang của sao băng
    const glowGeometry = new THREE.SphereGeometry(3, 32, 32);
    const glowMaterial = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 } },
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vNormal;
            uniform float time;
            void main() {
                float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                gl_FragColor = vec4(1.0, 1.0, 1.0, intensity * (0.8 + sin(time * 5.0) * 0.2));
            }
        `,
        transparent: true,   
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide 
    });   

    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    head.add(glow); 
    
    // Đuôi sao băng
    const curve = createRandomCurve();
    const trailPoints = [];
    for (let i = 0; i < trailLength; i++) {
        const progress = i / (trailLength - 1);
        trailPoints.push(curve.getPoint(progress));
    }
    const trailGeometry = new THREE.BufferGeometry().setFromPoints(trailPoints);
    const trailMaterial = new THREE.LineBasicMaterial({
        color: 0x99eaff,
        transparent: true,
        opacity: 0.7,
        linewidth: 2
    });
    const trail = new THREE.Line(trailGeometry, trailMaterial);

    const shootingStarGroup = new THREE.Group();
    shootingStarGroup.add(head);
    shootingStarGroup.add(trail);
    shootingStarGroup.userData = {
        curve: curve,
        progress: 0,
        speed: 0.001 + Math.random() * 0.001,
        life: 0,
        maxLife: 300,
        head: head,
        trail: trail,
        trailLength: trailLength,
        trailPoints: trailPoints,
    };
    scene.add(shootingStarGroup);
    shootingStars.push(shootingStarGroup);
}

// Tạo đường cong Bezier ngẫu nhiên để sao băng bay dọc theo
function createRandomCurve() {
    const points = [];
    const startPoint = new THREE.Vector3(-200 + Math.random() * 100, -100 + Math.random() * 200, -100 + Math.random() * 200);
    const endPoint = new THREE.Vector3(600 + Math.random() * 200, startPoint.y + (-100 + Math.random() * 200), startPoint.z + (-100 + Math.random() * 200));
    const controlPoint1 = new THREE.Vector3(startPoint.x + 200 + Math.random() * 100, startPoint.y + (-50 + Math.random() * 100), startPoint.z + (-50 + Math.random() * 100));
    const controlPoint2 = new THREE.Vector3(endPoint.x - 200 + Math.random() * 100, endPoint.y + (-50 + Math.random() * 100), endPoint.z + (-50 + Math.random() * 100));

    points.push(startPoint, controlPoint1, controlPoint2, endPoint);
    return new THREE.CubicBezierCurve3(startPoint, controlPoint1, controlPoint2, endPoint);
}

// Tạo vòng chứa bằng Texts quanh tinh cầu
const TEXT_SYMBOL_POOL = [
    '♡♡♡',
    '✦✦✦',
    '☆☆☆',
    '✧✧✧',
    '◇◇◇',
    '---',
    '•••',
    '❋❋❋',
    '❥❥❥'
];

const RING_TEXT_COUNT = 4;
const ringTexts = shuffleArray(TEXT_SYMBOL_POOL).slice(0, RING_TEXT_COUNT);

// Tạo vòng chứa bằng Images quanh tinh cầu
const RING_IMAGE_COUNT = 4;

function pickRingImages(count) {
    const leftover = window.leftoverImages || [];
    if (leftover.length >= count) {
        return shuffleArray(leftover).slice(0, count);
    }
    
    const pool = window.fullImagePool && window.fullImagePool.length
        ? window.fullImagePool
        : leftover;
    const shuffledPool = shuffleArray(pool);
    const combined = [...leftover, ...shuffledPool.filter(img => !leftover.includes(img))];
    return Array.from({ length: count }, (_, i) => combined[i % combined.length]);
}

const ringImages = pickRingImages(RING_IMAGE_COUNT);

// Danh sách tất cả các vòng
window.allRings = [];
window.imageRings = [];
window.textRings = [];
 
// Tạo các vòng chữ quay quanh tinh cầu
function createTextRings() {
    const numRings = ringTexts.length;
    const baseRingRadius = planetRadius * 1.1;
    const ringSpacing = 5;
 
    for (let i = 0; i < numRings; i++) {
        const text = ringTexts[i % ringTexts.length] + '   ';
        const ringRadius = baseRingRadius + i * ringSpacing;
  
        // Phân loại ký tự (CJK/Latin/khác) để điều chỉnh cỡ chữ và khoảng cách cho phù hợp
        function getCharType(char) {
            const charCode = char.charCodeAt(0);
            if ((charCode >= 0x4E00 && charCode <= 0x9FFF) ||
                (charCode >= 0x3040 && charCode <= 0x309F) ||
                (charCode >= 0x30A0 && charCode <= 0x30FF) ||
                (charCode >= 0xAC00 && charCode <= 0xD7AF)) {
                return 'cjk';
            } else if (charCode >= 0 && charCode <= 0x7F) {
                return 'latin';
            }
            return 'other';
        }

        let charCounts = { cjk: 0, latin: 0, other: 0 };
        for (let char of text) {
            charCounts[getCharType(char)]++;
        }

        const totalChars = text.length;
        const cjkRatio = charCounts.cjk / totalChars;

        let scaleParams = { fontScale: 0.75, spacingScale: 1.1 };

        if (i === 0) {
            scaleParams.fontScale = 0.55;
            scaleParams.spacingScale = 0.9;
        } else if (i === 1) {
            scaleParams.fontScale = 0.65;
            scaleParams.spacingScale = 1.0;
        }

        if (cjkRatio > 0) {
            scaleParams.fontScale *= 0.9;
            scaleParams.spacingScale *= 1.1;
        }
        
        const textureHeight = 300;  
        const fontSize = Math.max(220, 1.0 * textureHeight);  

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.font = `bold ${fontSize}px Arial, sans-serif`;
        let singleText = ringTexts[i % ringTexts.length];
        const separator = '';
        let repeatedTextSegment = singleText + separator;

        let segmentWidth = tempCtx.measureText(repeatedTextSegment).width;
        let textureWidthCircumference = 2 * Math.PI * ringRadius * 180;
        let repeatCount = Math.ceil(textureWidthCircumference / segmentWidth);

        let fullText = '';
        for (let j = 0; j < repeatCount; j++) {
            fullText += repeatedTextSegment;
        }

        let finalTextureWidth = segmentWidth * repeatCount;
        if (finalTextureWidth < 1 || !fullText) {
            fullText = repeatedTextSegment;
            finalTextureWidth = segmentWidth;
        }

        const textCanvas = document.createElement('canvas');
        textCanvas.width = Math.ceil(Math.max(1, finalTextureWidth));
        textCanvas.height = textureHeight;
        const ctx = textCanvas.getContext('2d');

        ctx.clearRect(0, 0, textCanvas.width, textureHeight);
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.fillStyle = 'white';
        ctx.textAlign = 'left'; 
        ctx.textBaseline = 'alphabetic';

        ctx.shadowColor = '#e0b3ff';
        ctx.shadowBlur = 24;
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#0077b6';
        ctx.strokeText(fullText, 0, textureHeight * 0.8);

        ctx.shadowColor = '#00ccff';
        ctx.shadowBlur = 16;
        ctx.fillText(fullText, 0, textureHeight * 0.8);

        const ringTexture = new THREE.CanvasTexture(textCanvas);
        ringTexture.wrapS = THREE.RepeatWrapping;
        ringTexture.repeat.x = finalTextureWidth / textureWidthCircumference;
        ringTexture.needsUpdate = true;

        const ringGeometry = new THREE.CylinderGeometry(ringRadius, ringRadius, 1, 128, 1, true);
        const ringMaterial = new THREE.MeshBasicMaterial({
            map: ringTexture,
            transparent: true,
            side: THREE.DoubleSide,
            alphaTest: 0.01
        });

        const textRingMesh = new THREE.Mesh(ringGeometry, ringMaterial);
        textRingMesh.position.set(0, 0, 0);
        textRingMesh.rotation.y = Math.PI / 2;

        const ringGroup = new THREE.Group();
        ringGroup.add(textRingMesh);
        ringGroup.userData = {
            ringRadius: ringRadius,
            angleOffset: 0.15 * Math.PI * 0.5,
            speed: 0.008,
            tiltSpeed: 0, rollSpeed: 0, pitchSpeed: 0,
            tiltAmplitude: Math.PI / 3, rollAmplitude: Math.PI / 6, pitchAmplitude: Math.PI / 8,
            tiltPhase: Math.PI * 2, rollPhase: Math.PI * 2, pitchPhase: Math.PI * 2,
            isTextRing: true
        };

        const initialRotationX = i / numRings * (Math.PI / 1);
        ringGroup.rotation.x = initialRotationX;
        scene.add(ringGroup);
        window.textRings.push(ringGroup);
        window.allRings.push(ringGroup);
    }
} 

// Tạo các vòng ảnh quay quanh tinh cầu
function createImageRings() {
    const numRings = ringImages.length;
    const baseRingRadius = planetRadius * 1.1;
    const ringSpacing = 5;

    const textureHeight = 300;

    for (let i = 0; i < numRings; i++) {
        const imagePath = ringImages[i % ringImages.length];
        const ringRadius = baseRingRadius + i * ringSpacing;

        const img = new Image();

        img.onload = function () {
            const imageRatio = img.width / img.height;
            const imageHeight = textureHeight;
            const imageWidth = imageHeight * imageRatio;

            const spacing = 10;
            const segmentWidth = imageWidth + spacing;

            const textureWidthCircumference =
                2 * Math.PI * ringRadius * 180;

            const repeatCount = Math.ceil(
                textureWidthCircumference / segmentWidth
            );

            const finalTextureWidth = segmentWidth * repeatCount;

            const imageCanvas = document.createElement('canvas');
            imageCanvas.width = Math.ceil(finalTextureWidth);
            imageCanvas.height = textureHeight;

            const ctx = imageCanvas.getContext('2d');

            ctx.clearRect(
                0,
                0,
                imageCanvas.width,
                imageCanvas.height
            );

            for (let j = 0; j < repeatCount; j++) {
                const x = j * segmentWidth;

                ctx.drawImage(
                    img,
                    x,
                    0,
                    imageWidth,
                    imageHeight
                );
            }

            const ringTexture =
                new THREE.CanvasTexture(imageCanvas);

            ringTexture.wrapS = THREE.RepeatWrapping;
            ringTexture.needsUpdate = true;

            const ringGeometry =
                new THREE.CylinderGeometry(
                    ringRadius,
                    ringRadius,
                    1,
                    128,
                    1,
                    true
                );

            const ringMaterial =
                new THREE.MeshBasicMaterial({
                    map: ringTexture,
                    transparent: true,
                    side: THREE.DoubleSide,
                    alphaTest: 0.01
                });

            const textRingMesh =
                new THREE.Mesh(
                    ringGeometry,
                    ringMaterial
                );

            textRingMesh.position.set(0, 0, 0);
            textRingMesh.rotation.y = Math.PI / 2;

            const ringGroup = new THREE.Group();

            ringGroup.add(textRingMesh);

            ringGroup.userData = {
                ringRadius: ringRadius,
                angleOffset: 0.15 * Math.PI * 0.5,
                speed: 0.008,

                tiltSpeed: 0,
                rollSpeed: 0,
                pitchSpeed: 0,

                tiltAmplitude: Math.PI / 3,
                rollAmplitude: Math.PI / 6,
                pitchAmplitude: Math.PI / 8,

                tiltPhase: Math.PI * 2,
                rollPhase: Math.PI * 2,
                pitchPhase: Math.PI * 2,

                isTextRing: true
            };

            const initialRotationX =
                i / numRings * Math.PI;

            ringGroup.rotation.x =
                initialRotationX;

            scene.add(ringGroup);
            window.imageRings.push(ringGroup);
            window.allRings.push(ringGroup);
        };

        img.src = imagePath;
    }
}

// Vòng hạt sáng bao quanh tinh cầu
function createGlowRing(radius, count = 350) {
    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const sizes = [];

    for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = 0;
        const z = Math.sin(angle) * radius;

        positions.push(x, y, z);
        sizes.push(5 + Math.random() * 5);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const sprite = createGlowTexture(); 
    const material = new THREE.PointsMaterial({
        map: sprite,
        size: 2,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        color: new THREE.Color('#b8a1f0'),
    }); 

    const points = new THREE.Points(geometry, material);
    const group = new THREE.Group();
    group.add(points);
    scene.add(group);
 
    // Hạt sao bay ra và biến mất
    const stars = [];
    const texture = createStarTexture2();

    // Tạo 1 hạt sao bay ra từ vòng theo hướng ly tâm
    function spawnStar() {
        const material = new THREE.SpriteMaterial({
            map: texture,
            color: 0xa8d8d8,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
 
        const sprite = new THREE.Sprite(material);
        const angle = Math.random() * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = (Math.random() - 0.5) * 2; 

        sprite.position.set(x, y, z);
        const scale = 1.5 + Math.random() * 2;  
        sprite.scale.set(scale, scale, 1); 

        const dir = new THREE.Vector3(x, y, z).normalize().multiplyScalar(0.05 + Math.random() * 0.001);

        stars.push({ sprite, velocity: dir, life: 0 });
        group.add(sprite);
    }
   
    for (let i = 0; i < 100; i++) {
        spawnStar();
    }

    // Vòng lặp riêng
    function animateRing() { 
        group.rotation.z += 0.003;

        for (let i = stars.length - 1; i >= 0; i--) {
            const s = stars[i];
            s.sprite.position.add(s.velocity);
            s.life++;
  
            const alpha = 1.0 - s.life / 100;
            s.sprite.material.opacity = Math.max(0, alpha);

            if (s.life > 100) {
                group.remove(s.sprite);
                stars.splice(i, 1);
                spawnStar();
            }
        }

        requestAnimationFrame(animateRing);
    }

    animateRing();
}

function createStarsBurstFromRing(centerRadius, starCount = 50) {
    const stars = [];
    const texture = createStarTexture();

    for (let i = 0; i < starCount; i++) {
        const material = new THREE.SpriteMaterial({
            map: texture,
            color: 0xffffff,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        const sprite = new THREE.Sprite(material);
        const scale = 3 + Math.random() * 2;
        sprite.scale.set(scale, scale, 1);

        const angle = Math.random() * Math.PI * 2;
        const x = Math.cos(angle) * centerRadius;
        const z = Math.sin(angle) * centerRadius;
        const y = (Math.random() - 0.5) * 4;

        sprite.position.set(x, y, z);

        const dir = new THREE.Vector3(x, y, z).normalize().multiplyScalar(0.5 + Math.random() * 1.5);

        stars.push({ sprite, velocity: dir, startPos: new THREE.Vector3(x, y, z), life: 0 });
        scene.add(sprite);
    }

    // Vòng lặp riêng
    function animateBurstingStars() {
        for (let star of stars) {
            star.sprite.position.add(star.velocity);
            star.life += 1;

            const dist = star.sprite.position.distanceTo(star.startPos);
            if (dist > 40 || star.life > 300) {
                star.sprite.position.copy(star.startPos);
                star.life = 0;
            }
        }

        requestAnimationFrame(animateBurstingStars);
    }

    animateBurstingStars();
}

// Texture tròn mờ dần ra ngoài
function createGlowTexture() {
    const size = 128; 
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    gradient.addColorStop(0.1, 'rgba(180, 160, 255, 0.6)');
    gradient.addColorStop(0.5, 'rgba(110, 190, 200, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
 
    const texture = new THREE.CanvasTexture(canvas);
    return texture;  
}

// Texture dùng cho chùm sao bắn tỏa
function createStarTexture() { 
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,192,255,0.8)');
    gradient.addColorStop(0.6, 'rgba(255,128,255,0.3)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return new THREE.CanvasTexture(canvas);
} 

// Texture chấm tròn nhỏ, dùng cho hạt sao bay ra từ vòng glow
function createStarTexture2() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
 
    const center = size / 2;

    ctx.beginPath();
    ctx.arc(center, center, size * 0.05, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 1)';
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
}

    

// Tạo 1 ngôi sao bay vòng tròn quanh tinh cầu 
function createFlyingStar(radius) {
    const material = new THREE.SpriteMaterial({
        map: createStarTexture(),
        color: 0xc0d8ff,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const star = new THREE.Sprite(material);
    star.scale.set(11, 11, 1);
    scene.add(star);

    function animate() {
        const time = performance.now() * 0.001;
        const angle = time * 0.6;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const y = Math.sin(time * 1.2) * 5;
        star.position.set(x, y, z);
        requestAnimationFrame(animate);
    } 
    
    animate();
}

// Gọi tạo các hiệu ứng trang trí quanh tinh cầu
createGlowRing(planetRadius * 1.4,250);  // Vòng glow
createFlyingStar(planetRadius * 1.4);
createImageRings();
createTextRings();  
createGlowRing(planetRadius * 1.5);



// =========== HỐ ĐEN VŨ TRỤ ===========
// "solid: true" là màu đơn sắc (đen/trắng)
// "glowHex" là màu thực sự dùng để phát sáng
const BLACK_HOLE_COLOR_PALETTE = [
    {hex: 0xff5c8a},   // hồng rực
    {hex: 0xffb347},   // cam vàng
    {hex: 0x4dd0e1},   // ngọc lam
    {hex: 0x7c4dff},   // tím điện
    {hex: 0x2ecc71},   // lục bảo
    {hex: 0xff4d4d},   // đỏ rực
    {hex: 0x4d7cff},   // xanh dương
    {hex: 0xffe14d},   // vàng chanh
    {hex: 0xd94dff},   // hồng tím
    {hex: 0x00e5c8},   // xanh ngọc
    {hex: 0x7ee881},   // xanh lá non
    {hex: 0xff7043},   // cam đất
    {hex: 0x1e88e5},   // xanh biển sâu
    {hex: 0x5c3d99},   // tím than
    {hex: 0xff9ecb},   // hồng phấn
    {hex: 0xffd700},   // vàng kim
    {hex: 0x26c6da},   // xanh lục lam
    {hex: 0xe91e63},   // đỏ tía
    {hex: 0x39ff14},   // xanh dạ quang
    {hex: 0xffffff, solid: true},   // trắng tinh
    {hex: 0x000000, solid: true, glowHex: 0x18122b}   // đen thui
];

// Đổi 1 THREE.Color thành chuỗi "r, g, b" (0-255) để dùng trong rgba() của canvas
function colorToRGBString(color) {
    return `${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}`;
}

// Chọn ngẫu nhiên 1 bảng phối màu cho 1 hố đen
function pickBlackHoleColorTheme(usedHexSet) {
    let pool = BLACK_HOLE_COLOR_PALETTE.filter(c => !usedHexSet.has(c.hex));
    if (pool.length === 0) pool = BLACK_HOLE_COLOR_PALETTE; // hết màu riêng -> cho phép dùng lại

    const primary = pool[Math.floor(Math.random() * pool.length)];
    usedHexSet.add(primary.hex);

    if (primary.solid) {
        // Đen và trắng
        const base = new THREE.Color(primary.glowHex !== undefined ? primary.glowHex : primary.hex);
        return {
            colorInner: base.clone().multiplyScalar(1.4),
            colorMid: base.clone(),
            colorOuter: base.clone().multiplyScalar(0.65),
            hazeColor: base.clone().multiplyScalar(0.8),
            coronaColors: [base.clone(), base.clone(), base.clone()]
        };
    }

    // Các màu khác
    const mixPool = BLACK_HOLE_COLOR_PALETTE.filter(c => !c.solid && c.hex !== primary.hex);
    const secondary = mixPool[Math.floor(Math.random() * mixPool.length)];

    const colorA = new THREE.Color(primary.hex);
    const colorB = new THREE.Color(secondary.hex);
    const colorMid = colorA.clone().lerp(colorB, 0.5);

    return {
        colorInner: colorA.clone().multiplyScalar(1.25),
        colorMid: colorMid,
        colorOuter: colorB.clone().multiplyScalar(0.95),
        hazeColor: colorMid.clone().multiplyScalar(0.65),
        coronaColors: [colorA, colorMid, colorB]
    };
}

// Bảng màu mặc định (tím-vàng-ngọc huyền bí ban đầu) - dùng cho hố đen chính
const DEFAULT_BLACK_HOLE_THEME = {
    colorInner: new THREE.Color(0xfff3c4),
    colorMid: new THREE.Color(0xb88bff),
    colorOuter: new THREE.Color(0x2ad6c9),
    hazeColor: new THREE.Color(0x3a1a5e),
    coronaColors: [
        new THREE.Color(0xfff4d2),
        new THREE.Color(0xc48cff),
        new THREE.Color(0x6ee6dc)
    ]
};

// Vẽ texture "quầng tia" (corona) răng cưa xung quanh hố đen bằng canvas 2D
function createBlackHoleCoronaTexture(colorChoicesRGB) {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const cx = size / 2, cy = size / 2;
    const baseR = size * 0.24;

    // Lớp nền phát sáng mờ, không tạo thành vòng tròn rõ nét
    const baseGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.5);
    baseGlow.addColorStop(0.00, 'rgba(255,255,255,0)');
    baseGlow.addColorStop(0.45, 'rgba(255,255,255,0)');
    baseGlow.addColorStop(0.55, `rgba(${colorChoicesRGB[1]}, 0.18)`);
    baseGlow.addColorStop(1.00, `rgba(${colorChoicesRGB[1]}, 0)`);
    ctx.fillStyle = baseGlow;
    ctx.fillRect(0, 0, size, size);

    // Các tia sáng răng cưa xé rách không gian quanh hố đen - dài ngắn,
    // rộng hẹp bất đối xứng để trông như năng lượng bị xé toạc, không đều
    const spikeCount = 46;
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < spikeCount; i++) {
        const angle = (i / spikeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.12;
        const jag = Math.random();
        const len = baseR * (0.35 + Math.pow(jag, 2.2) * 2.3); // phần lớn tia ngắn, thỉnh thoảng có tia dài vọt ra
        const width = (Math.PI * 2 / spikeCount) * (0.25 + Math.random() * 0.35);
        const innerR = baseR * (0.72 + Math.random() * 0.15);

        const grad = ctx.createLinearGradient(0, 0, Math.cos(angle) * len, Math.sin(angle) * len);
        const c = colorChoicesRGB[i % colorChoicesRGB.length];
        grad.addColorStop(0, `rgba(${c}, 0.95)`);
        grad.addColorStop(0.5, `rgba(${c}, 0.4)`);
        grad.addColorStop(1, `rgba(${c}, 0)`);

        ctx.beginPath();
        ctx.moveTo(Math.cos(angle - width / 2) * innerR, Math.sin(angle - width / 2) * innerR);
        ctx.lineTo(Math.cos(angle) * (innerR + len), Math.sin(angle) * (innerR + len));
        ctx.lineTo(Math.cos(angle + width / 2) * innerR, Math.sin(angle + width / 2) * innerR);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();
    }
    ctx.restore();

    return new THREE.CanvasTexture(canvas);
}

// Tạo 1 hố đen hoàn chỉnh tại vị trí cho trước: lõi đen tuyệt đối + quầng mờ + quầng tia + đĩa bồi tụ xoáy
function createBlackHole(position = new THREE.Vector3(-190, 65, -220), coreRadius = 22, theme = DEFAULT_BLACK_HOLE_THEME, particleCount = 11000) {
    const group = new THREE.Group();
    group.position.copy(position);

    // Lõi hố đen - khối cầu 3D tuyệt đối tối, nuốt trọn ánh sáng
    const coreGeometry = new THREE.SphereGeometry(coreRadius, 64, 64);
    const coreMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    group.add(core);

    // Quầng mờ ảo bao quanh chân trời sự kiện (event horizon haze) - màu theo theme
    const hazeGeometry = new THREE.SphereGeometry(coreRadius * 1.15, 48, 48);
    const hazeMaterial = new THREE.ShaderMaterial({
        uniforms: {
            glowColor: { value: theme.hazeColor.clone() }
        },
        vertexShader: `
            varying vec3 vNormal;
            void main() {
                vNormal = normalize(normalMatrix * normal);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vNormal;
            uniform vec3 glowColor;
            void main() {
                float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
                gl_FragColor = vec4(glowColor, intensity * 0.5);
            }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true
    });
    const haze = new THREE.Mesh(hazeGeometry, hazeMaterial);
    group.add(haze);

    // Quầng tia răng cưa - năng lượng bị xé toạc quanh hố đen, màu theo theme
    const coronaTexture = createBlackHoleCoronaTexture(theme.coronaColors.map(colorToRGBString));
    const coronaMaterial = new THREE.SpriteMaterial({
        map: coronaTexture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const corona = new THREE.Sprite(coronaMaterial);
    corona.scale.set(coreRadius * 6.2, coreRadius * 6.2, 1);
    group.add(corona);

    // Đĩa bồi tụ (accretion disk) - các cánh xoắn ốc bị hút và xoáy vào hố đen,
    // vòng trong quay nhanh hơn vòng ngoài như lực hấp dẫn thật sự
    const diskInner = coreRadius * 1.5;
    const diskOuter = coreRadius * 5.5;
    const diskPositions = new Float32Array(particleCount * 3);
    const diskColors = new Float32Array(particleCount * 3);
    const diskAngles = new Float32Array(particleCount);
    const diskRadii = new Float32Array(particleCount);

    const spiralArms = 5;
    const spiralTightness = 4.2;

    const colorInner = theme.colorInner; // màu rực rỡ gần lõi
    const colorMid = theme.colorMid;     // màu giữa
    const colorOuter = theme.colorOuter; // màu mờ ảo ở rìa

    for (let i = 0; i < particleCount; i++) {
        const t = Math.pow(Math.random(), 0.6);
        const r = diskInner + t * (diskOuter - diskInner);

        // Cánh xoắn ốc: càng gần lõi càng xoắn gấp, tạo hình xoáy rõ rệt
        const armAngle = (i % spiralArms) / spiralArms * Math.PI * 2;
        const spinAngle = spiralTightness * (1 - t) * Math.PI;
        const scatter = (Math.random() - 0.5) * (0.55 - t * 0.35);
        const angle = armAngle + spinAngle + scatter;

        const height = (Math.random() - 0.5) * (0.6 + t * 3.5) * (r / diskOuter);

        const i3 = i * 3;
        diskPositions[i3] = Math.cos(angle) * r;
        diskPositions[i3 + 1] = height;
        diskPositions[i3 + 2] = Math.sin(angle) * r;

        const mixed = t < 0.5
            ? colorInner.clone().lerp(colorMid, t * 2)
            : colorMid.clone().lerp(colorOuter, (t - 0.5) * 2);
        mixed.multiplyScalar(1.15);

        diskColors[i3] = mixed.r;
        diskColors[i3 + 1] = mixed.g;
        diskColors[i3 + 2] = mixed.b;

        diskAngles[i] = angle;
        diskRadii[i] = r;
    }

    const diskGeometry = new THREE.BufferGeometry();
    diskGeometry.setAttribute('position', new THREE.BufferAttribute(diskPositions, 3));
    diskGeometry.setAttribute('color', new THREE.BufferAttribute(diskColors, 3));
    diskGeometry.setAttribute('aAngle', new THREE.BufferAttribute(diskAngles, 1));
    diskGeometry.setAttribute('aRadius', new THREE.BufferAttribute(diskRadii, 1));

    const diskMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0.0 },
            uSize: { value: 30.0 * renderer.getPixelRatio() }
        },
        vertexShader: `
            uniform float uTime;
            uniform float uSize;
            attribute float aAngle;
            attribute float aRadius;
            varying vec3 vColor;
            void main() {
                vColor = color;
                float speed = 7.0 / sqrt(aRadius);
                float angle = aAngle + uTime * speed;
                vec3 p = vec3(cos(angle) * aRadius, position.y, sin(angle) * aRadius);
                vec4 modelPosition = modelMatrix * vec4(p, 1.0);
                vec4 viewPosition = viewMatrix * modelPosition;
                gl_Position = projectionMatrix * viewPosition;
                // Giới hạn kích thước tối thiểu/tối đa để hạt luôn nhìn rõ dù
                // camera ở rất xa (zoom nhỏ) hay rất gần, tránh vũ trụ trống trải
                float sizePx = uSize / -viewPosition.z;
                gl_PointSize = clamp(sizePx, 2.0, 60.0);
            }
        `,
        fragmentShader: `
            varying vec3 vColor;
            void main() {
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                float glow = 1.0 - dist * 2.0;
                gl_FragColor = vec4(vColor, glow);
            }
        `,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        vertexColors: true
    });

    const disk = new THREE.Points(diskGeometry, diskMaterial);
    // Random hướng nghiêng của đĩa (ngang/dọc/chéo/xiên) - mỗi hố đen 1 hướng khác nhau,
    // không cố định 1 kiểu nghiêng như trước, để không gian đa dạng và sống động hơn
    disk.rotation.x = Math.random() * Math.PI;       // từ nằm ngang đến dựng đứng
    disk.rotation.z = Math.random() * Math.PI * 2;    // xoay chéo/xiên quanh trục còn lại
    disk.rotation.y = Math.random() * Math.PI * 2;
    group.add(disk);

    // Vầng hào quang mềm bao trùm cả khu vực hố đen - màu theo theme
    const glowRGB = colorToRGBString(theme.hazeColor.clone().multiplyScalar(1.6));
    const outerGlow = createGlowMaterial(`rgba(${glowRGB}, 0.55)`, 500, 0.3);
    outerGlow.scale.set(coreRadius * 9, coreRadius * 9, 1);
    group.add(outerGlow);

    scene.add(group);

    return { group, disk, diskMaterial, corona, haze, core };
}

// Sinh vị trí rải rác ngẫu nhiên cho từng hố đen theo danh sách bán kính,
// tự tính khoảng cách an toàn dựa trên kích thước từng cặp (hố càng to càng
// cần cách xa) để không bị chồng lấn lên nhau hay lên hành tinh trung tâm
function generateBlackHolePositions(radii, minDist, maxDist, margin = 60, existing = []) {
    const placed = [...existing]; // { position, radius }
    const positions = [];

    radii.forEach((r, idx) => {
        let candidate = null;
        let attempts = 0;
        while (attempts < 500) {
            attempts++;
            const dist = minDist + Math.random() * (maxDist - minDist);
            const theta = Math.random() * Math.PI * 2;
            const y = (Math.random() - 0.5) * 220;
            const test = new THREE.Vector3(Math.cos(theta) * dist, y, Math.sin(theta) * dist);

            const ok = placed.every(p => {
                const needed = (r + p.radius) * 3.2 + margin; // 3.2 ~ bán kính quầng tia/haze so với lõi
                return test.distanceTo(p.position) > needed;
            });
            if (ok) { candidate = test; break; }
        }
        // Hết lượt thử vẫn không tìm được chỗ trống -> đẩy ra xa thêm 1 vành đai
        if (!candidate) {
            const theta = Math.random() * Math.PI * 2;
            const y = (Math.random() - 0.5) * 220;
            const dist = maxDist + idx * 180;
            candidate = new THREE.Vector3(Math.cos(theta) * dist, y, Math.sin(theta) * dist);
        }

        placed.push({ position: candidate, radius: r });
        positions.push(candidate);
    });

    return positions;
}

// Rải vài "đốm" tinh vân mờ quanh mỗi hố đen - không phải để trang trí xa xa,
// mà để khi camera zoom lại gần 1 hố đen, phía sau nó vẫn có nền màu mờ ảo
// thay vì khoảng không đen trống trải, giúp khối cầu/haze/tia sáng nổi bật rõ nét
function spawnAmbientNebulaAround(center, spread = 260, count = 6) {
    for (let i = 0; i < count; i++) {
        const hue = Math.random() * 360;
        const color = `hsla(${hue}, 70%, 55%, 0.35)`;
        const blob = createGlowMaterial(color, 256, 0.4);
        const scale = 70 + Math.random() * 90;
        blob.scale.set(scale, scale, 1);
        blob.position.set(
            center.x + (Math.random() - 0.5) * spread,
            center.y + (Math.random() - 0.5) * spread * 0.6,
            center.z + (Math.random() - 0.5) * spread
        );
        scene.add(blob);
    }
}

// Số lượng hố đen = số thiên thể trong Hệ Mặt Trời (kể cả Mặt Trời và Mặt Trăng):
// Mặt Trời + 8 hành tinh + Mặt Trăng = 10. Kích thước mỗi hố đen được quy đổi
// tương đối theo đường kính thật ngoài đời (thang log để không cái nào quá khổ),
// còn VỊ TRÍ của tất cả hố đen vẫn luôn được random ngẫu nhiên hoàn toàn.
const SOLAR_SYSTEM_BODIES = [
    { name: 'Mặt Trời',        diameterKm: 1392700 },
    { name: 'Sao Thủy',        diameterKm: 4879 },
    { name: 'Sao Kim',         diameterKm: 12104 },
    { name: 'Trái Đất',        diameterKm: 12742 },
    { name: 'Mặt Trăng',       diameterKm: 3474 },
    { name: 'Sao Hỏa',         diameterKm: 6779 },
    { name: 'Sao Mộc',         diameterKm: 139820 },
    { name: 'Sao Thổ',         diameterKm: 116460 },
    { name: 'Sao Thiên Vương', diameterKm: 50724 },
    { name: 'Sao Hải Vương',   diameterKm: 49244 },
    { name: 'Sao Diêm Vương',  diameterKm: 2377 }, // không còn được công nhận là hành tinh chính thức, nhưng vẫn cho vào vì thích :)
];

// Quy đổi đường kính thật (chênh lệch hàng trăm lần) sang bán kính hố đen
// trong khoảng [MIN_BH_RADIUS, MAX_BH_RADIUS] bằng thang log - vẫn giữ đúng
// thứ tự to nhỏ như thật (Mặt Trời to nhất, Mặt Trăng nhỏ nhất) mà không có
// khối nào phình to bất hợp lý so với phần còn lại của cảnh 3D.
const MIN_BH_RADIUS = 9;
const MAX_BH_RADIUS = 42;
const solarLogDiameters = SOLAR_SYSTEM_BODIES.map(b => Math.log10(b.diameterKm));
const solarMinLog = Math.min(...solarLogDiameters);
const solarMaxLog = Math.max(...solarLogDiameters);
const blackHoleRadii = solarLogDiameters.map(v => {
    const t = (v - solarMinLog) / (solarMaxLog - solarMinLog);
    return MIN_BH_RADIUS + t * (MAX_BH_RADIUS - MIN_BH_RADIUS);
});

const BLACK_HOLE_COUNT = SOLAR_SYSTEM_BODIES.length; // = 10
const usedBlackHoleColors = new Set();
const blackHolePositions = generateBlackHolePositions(
    blackHoleRadii, 220, 680, 70, []
);

const blackHoles = blackHolePositions.map((pos, i) => {
    const theme = pickBlackHoleColorTheme(usedBlackHoleColors);
    const radius = blackHoleRadii[i];
    // Hố đen càng lớn (tương ứng thiên thể càng to) thì đĩa bồi tụ càng dày hạt
    const particleCount = Math.round(4500 + (radius / MAX_BH_RADIUS) * 9500);
    const bh = createBlackHole(pos, radius, theme, particleCount);
    spawnAmbientNebulaAround(pos, 200 + radius * 4, 5);
    return bh;
});



 
// Cập nhật vị trí + hướng xoay từng ký tự/ảnh trong vòng chữ để luôn quay mặt về phía camera
function updateTextRingsRotation() {
    if (!window.allRings || !camera) return;

    window.allRings.forEach((ringGroup, index) => {
        ringGroup.children.forEach(child => {
            if (
                child.userData.initialAngle !== undefined
            ) {
                const angle =
                    child.userData.initialAngle +
                    ringGroup.userData.angleOffset;

                const x =
                    Math.cos(angle) *
                    child.userData.ringRadius;

                const z =
                    Math.sin(angle) *
                    child.userData.ringRadius;

                child.position.set(
                    x,
                    0,
                    z
                );

                const worldPos =
                    new THREE.Vector3();

                child.getWorldPosition(
                    worldPos
                );

                const lookAtVector =
                    new THREE.Vector3()
                        .subVectors(
                            camera.position,
                            worldPos
                        )
                        .normalize();

                const rotationY =
                    Math.atan2(
                        lookAtVector.x,
                        lookAtVector.z
                    );

                child.rotation.y =
                    rotationY;
            }
        });
    });
}

// Hoạt náo hệ vòng quanh hành tinh: xoay, nghiêng (tilt/roll/pitch), nhấp nhô và nhấp nháy độ mờ
function animatePlanetSystem() {
    if (!window.allRings) return;

    const time = Date.now() * 0.001;

    window.allRings.forEach((ringGroup, index) => {
        const userData = ringGroup.userData;

        userData.angleOffset += userData.speed;

        const tilt =
            Math.sin(
                time * userData.tiltSpeed +
                userData.tiltPhase
            ) *
            userData.tiltAmplitude;

        const roll =
            Math.cos(
                time * userData.rollSpeed +
                userData.rollPhase
            ) *
            userData.rollAmplitude;

        const pitch =
            Math.sin(
                time * userData.pitchSpeed +
                userData.pitchPhase
            ) *
            userData.pitchAmplitude;

        ringGroup.rotation.x =
            (index / window.allRings.length) *
            Math.PI +
            tilt;

        ringGroup.rotation.z = roll;

        ringGroup.rotation.y =
            userData.angleOffset +
            pitch;

        const verticalBob =
            Math.sin(
                time *
                (userData.tiltSpeed * 0.7) +
                userData.tiltPhase
            ) * 0.3;

        ringGroup.position.y =
            verticalBob;

        const pulse =
            (Math.sin(
                time * 1.5 + index
            ) + 1) / 2;

        const mesh =
            ringGroup.children[0];

        if (
            mesh &&
            mesh.material
        ) {
            mesh.material.opacity =
                0.7 + pulse * 0.3;
        }
    });
    
    updateTextRingsRotation();
}



// Vòng lặp animate
let fadeOpacity = 0.1;
let fadeInProgress = false;



// ================= GỢI Ý CHẠM VÀO HÀNH TINH (hint icon 3D) =================
let hintIcon;
let hintText;

// Tạo icon con trỏ chuột 3D để gợi ý người dùng
function createHintIcon() {
    hintIcon = new THREE.Group();
    hintIcon.name = 'hint-icon-group';
    scene.add(hintIcon);

    const cursorVisuals = new THREE.Group();

    const cursorShape = new THREE.Shape();
    const h = 1.5;
    const w = h * 0.5;

    cursorShape.moveTo(0, 0);
    cursorShape.lineTo(-w * 0.4, -h * 0.7);
    cursorShape.lineTo(-w * 0.25, -h * 0.7);
    cursorShape.lineTo(-w * 0.5, -h);
    cursorShape.lineTo(w * 0.5, -h);
    cursorShape.lineTo(w * 0.25, -h * 0.7);
    cursorShape.lineTo(w * 0.4, -h * 0.7);
    cursorShape.closePath();

    const backgroundGeometry = new THREE.ShapeGeometry(cursorShape);
    const backgroundMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    const backgroundMesh = new THREE.Mesh(backgroundGeometry, backgroundMaterial);

    const foregroundGeometry = new THREE.ShapeGeometry(cursorShape);
    const foregroundMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide
    });
    const foregroundMesh = new THREE.Mesh(foregroundGeometry, foregroundMaterial);

    foregroundMesh.scale.set(0.8, 0.8, 1);
    foregroundMesh.position.z = 0.01;

    cursorVisuals.add(backgroundMesh, foregroundMesh);
    cursorVisuals.position.y = h / 2;
    cursorVisuals.rotation.x = Math.PI / 2;

    const ringGeometry = new THREE.RingGeometry(1.8, 2.0, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.6 });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.rotation.x = Math.PI / 2;
    hintIcon.userData.ringMesh = ringMesh;

    hintIcon.add(cursorVisuals);
    hintIcon.add(ringMesh);

    hintIcon.position.set(1.5, 1.5, 15);

    hintIcon.scale.set(0.8, 0.8, 0.8);
    hintIcon.lookAt(planet.position);
    hintIcon.userData.initialPosition = hintIcon.position.clone();
}

// Hoạt náo icon gợi ý (nhấp nhô như đang được "tap") - tự ẩn khi intro đã bắt đầu
function animateHintIcon(time) {
    if (!hintIcon) return;

    if (!introStarted) {
        hintIcon.visible = true;

        const tapFrequency = 2.5;
        const tapAmplitude = 1.5;
        const tapOffset = Math.sin(time * tapFrequency) * tapAmplitude;

        const direction = new THREE.Vector3();
        hintIcon.getWorldDirection(direction);
        hintIcon.position.copy(hintIcon.userData.initialPosition).addScaledVector(direction, -tapOffset);

        const ring = hintIcon.userData.ringMesh;
        const ringScale = 1 + Math.sin(time * tapFrequency) * 0.1;
        ring.scale.set(ringScale, ringScale, 1);
        ring.material.opacity = 0.5 + Math.sin(time * tapFrequency) * 0.2;
        if (hintText) {
            hintText.visible = true;
            hintText.material.opacity = 0.7 + Math.sin(time * 3) * 0.3;
            hintText.position.y = 15 + Math.sin(time * 2) * 0.5;
            hintText.lookAt(camera.position);
        }
    } else {
        if (hintIcon) hintIcon.visible = false;

        if (hintText) hintText.visible = false;
    }
}

// ================= VÒNG LẶP ANIMATE CHÍNH (chạy mỗi frame) =================
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.001;

    animateHintIcon(time);

    controls.update();
    planet.material.uniforms.time.value = time * 0.5;

    // Cập nhật tất cả hố đen vũ trụ: đĩa bồi tụ xoáy, quầng tia xoay chậm, khối trôi huyền ảo
    if (blackHoles && blackHoles.length) {
        blackHoles.forEach(bh => {
            bh.diskMaterial.uniforms.uTime.value = time;
            bh.corona.material.rotation = time * 0.06;
            bh.group.rotation.y += 0.0004;
        });
    }

    // Tăng dần độ mờ (fade-in) khi intro đã bắt đầu (sau khi người dùng chạm vào hành tinh)
    if (fadeInProgress && fadeOpacity < 1) {
        fadeOpacity += 0.025;
        if (fadeOpacity > 1) fadeOpacity = 1;
    }

    // Trước khi bấm vào hành tinh: chỉ hiện rõ hành tinh + glow, mọi thứ khác mờ đi
    // để hướng sự chú ý của người dùng vào việc "chạm vào tinh cầu"
    if (!introStarted) {
        fadeOpacity = 0.1;
        scene.traverse(obj => {
            if (obj.name === 'starfield') {
                if (obj.points && obj.material.opacity !== undefined) {
                    obj.material.transparent = false;
                    obj.material.opacity = 1;
                }
                return;
            }
            if (obj.userData.isTextRing || (obj.parent && obj.parent.userData && obj.parent.userData.isTextRing)) {
                if (obj.material && obj.material.opacity !== undefined) {
                    obj.material.transparent = false;
                    obj.material.opacity = 1;
                }
                // Chỉ giữ màu trắng cho các vòng chữ/ảnh - KHÔNG áp dụng cho
                // toàn bộ scene, nếu không thiên hà/tinh vân sẽ mất hết màu sắc
                if (obj.material && obj.material.color) {
                    obj.material.color.set(0xffffff);
                }
            } else if (obj !== planet && obj !== centralGlow && obj !== hintIcon && obj.type !== 'Scene' && !obj.parent.isGroup) {
                 if (obj.material && obj.material.opacity !== undefined) {
                    obj.material.transparent = true;
                    obj.material.opacity = 0.1;
                }
            }
        });
        planet.visible = true;
        centralGlow.visible = true;
    } else {
        // Sau khi intro bắt đầu: dần hiện toàn bộ cảnh vũ trụ (fadeOpacity tăng dần ở trên),
        // riêng các vòng chữ/ảnh và hành tinh luôn giữ độ mờ = 1 (rõ nét hoàn toàn)
        scene.traverse(obj => {
            const isRingElement = obj.userData.isTextRing || (obj.parent && obj.parent.userData && obj.parent.userData.isTextRing);
            if (!(isRingElement || obj === planet || obj === centralGlow || obj.type === 'Scene')) {
                if (obj.material && obj.material.opacity !== undefined) {
                    obj.material.transparent = true;
                    obj.material.opacity = fadeOpacity;
                }
            } else {
                if (obj.material && obj.material.opacity !== undefined) {
                    obj.material.opacity = 1;
                    obj.material.transparent = false;
                }
                if (isRingElement && obj.material && obj.material.color) {
                    obj.material.color.set(0xffffff);
                }
            }
        });
    }

    // Cập nhật sao băng
    for (let i = shootingStars.length - 1; i >= 0; i--) {
        const star = shootingStars[i];
        star.userData.life++;

        let opacity = 1.0;
        if (star.userData.life < 30) {
            opacity = star.userData.life / 30;
        } else if (star.userData.life > star.userData.maxLife - 30) {
            opacity = (star.userData.maxLife - star.userData.life) / 30;
        }

        star.userData.progress += star.userData.speed;
        if (star.userData.progress > 1) {
            scene.remove(star);
            shootingStars.splice(i, 1);
            continue;
        }

        const currentPos = star.userData.curve.getPoint(star.userData.progress);
        star.position.copy(currentPos);
        star.userData.head.material.opacity = opacity;
        star.userData.head.children[0].material.uniforms.time.value = time;

        const trail = star.userData.trail;
        const trailPoints = star.userData.trailPoints;
        trailPoints[0].copy(currentPos);
        for (let j = 1; j < star.userData.trailLength; j++) {
            const trailProgress = Math.max(0, star.userData.progress - j * 0.01);
            trailPoints[j].copy(star.userData.curve.getPoint(trailProgress));
        }
        trail.geometry.setFromPoints(trailPoints);
        trail.material.opacity = opacity * 0.7;
    }

    if (shootingStars.length < 3 && Math.random() < 0.02) {
        createShootingStar();
    }

    // Với các nhóm điểm hình khung (trái tim/star/...): đổi sang material "Near" (nét, đục)
    // khi camera lại gần dưới 10 đơn vị, ngược lại dùng material "Far" (mờ, cộng sáng) khi ở xa
    scene.traverse(obj => {
        if (obj.isPoints && obj.userData.materialNear && obj.userData.materialFar) {
            const positionAttr = obj.geometry.getAttribute('position');
            let isClose = false;
            for (let i = 0; i < positionAttr.count; i++) {
                const worldX = positionAttr.getX(i) + obj.position.x;
                const worldY = positionAttr.getY(i) + obj.position.y;
                const worldZ = positionAttr.getZ(i) + obj.position.z;
                const distance = camera.position.distanceTo(new THREE.Vector3(worldX, worldY, worldZ));
                if (distance < 10) {
                    isClose = true;
                    break;
                }
            }
            if (isClose) {
                if (obj.material !== obj.userData.materialNear) {
                    obj.material = obj.userData.materialNear;
                    obj.geometry = obj.userData.geometryNear;
                }
            } else {
                if (obj.material !== obj.userData.materialFar) {
                    obj.material = obj.userData.materialFar;
                    obj.geometry = obj.userData.geometryFar;
                }
            }
        }
    });  

    // Cập nhật camera

    // Hành tinh luôn xoay mặt về phía camera, cập nhật hệ vòng quay quanh nó
    planet.lookAt(camera.position);
    animatePlanetSystem();

    if (starField && starField.material && starField.material.opacity !== undefined) {
        starField.material.opacity = 1.0;
        starField.material.transparent = false;
    }

    renderer.render(scene, camera);
}

// Vẽ dòng chữ gợi ý "Chạm Vào Tinh Cầu" thành 1 texture 3D đặt phía trên hành tinh
function createHintText() {
    const canvasSize = 512; 
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = canvasSize;
    const context = canvas.getContext('2d');
    const fontSize = 50; 
    const text = 'Chạm Vào Tinh Cầu';
    context.font = `bold ${fontSize}px Arial, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.shadowColor = '#ffb3de';
    context.shadowBlur = 5;
    context.lineWidth = 2;
    context.strokeStyle = 'transparent';
    context.strokeText(text, canvasSize / 2, canvasSize / 2);
    context.shadowColor = '#e0b3ff';
    context.shadowBlur = 5;
    context.lineWidth = 2;
    context.strokeStyle = 'transparent';
    context.strokeText(text, canvasSize / 2, canvasSize / 2);
    context.shadowColor = 'transparent';
    context.shadowBlur = 0;
    context.fillStyle = 'transparent';
    context.fillText(text, canvasSize / 2, canvasSize / 2);
    const textTexture = new THREE.CanvasTexture(canvas);
    textTexture.needsUpdate = true;
    const textMaterial = new THREE.MeshBasicMaterial({
        map: textTexture,
        transparent: true,
        side: THREE.DoubleSide 

    });

    const planeGeometry = new THREE.PlaneGeometry(16, 8); 
    hintText = new THREE.Mesh(planeGeometry, textMaterial);
    hintText.position.set(0, 15, 0);
    scene.add(hintText);
}    
   
// ================= KHỞI ĐỘNG & CÁC SỰ KIỆN TOÀN CỤC =================
createShootingStar();
createHintIcon();
createHintText();
// Resize cửa sổ: cập nhật lại tỉ lệ camera và kích thước renderer
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Giữ nguyên tâm nhìn hiện tại (không ép về gốc tọa độ) để không phá khung hình
    // đang focus vào một hố đen khi người dùng xoay/resize màn hình.
    controls.update();
});

// Vị trí camera "mặc định" sau khi intro kết thúc (khung cảnh ban đầu)
const DEFAULT_CAMERA_POS = new THREE.Vector3(-40, 100, 100);
const DEFAULT_LOOKAT = new THREE.Vector3(0, 0, 0);

function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Hiệu ứng chớp sáng khi "xuyên không" giữa các hố đen
function triggerWarpFlash() {
    const el = document.getElementById('warp-flash');
    if (!el) return;
    el.classList.remove('warp-flash-active');
    void el.offsetWidth; // ép reflow để animation chạy lại từ đầu
    el.classList.add('warp-flash-active');
}

// Bay camera tới 1 vị trí + hướng nhìn mới theo quỹ đạo cong (bezier bậc 2),
// kèm hiệu ứng phình FOV ở giữa chặng bay để tạo cảm giác "xuyên đường hầm không gian"
function flyCameraTo(targetCamPos, targetLookAt, duration = 2200, onComplete) {
    if (isCameraAnimating) return;
    isCameraAnimating = true;
    controls.enabled = false;
    triggerWarpFlash();

    const startPos = camera.position.clone();
    const startLookAt = controls.target.clone();
    const baseFov = camera.fov;

    // Điểm điều khiển nâng lên cao để tạo đường bay vòng cung mượt, "ảo diệu"
    const mid = startPos.clone().lerp(targetCamPos, 0.5);
    mid.y += startPos.distanceTo(targetCamPos) * 0.35 + 25;

    const t0 = performance.now();

    function step(now) {
        const t = Math.min((now - t0) / duration, 1);
        const eased = easeInOutCubic(t);

        const a = startPos.clone().lerp(mid, eased);
        const b = mid.clone().lerp(targetCamPos, eased);
        const pos = a.lerp(b, eased);
        camera.position.copy(pos);

        const lookAt = startLookAt.clone().lerp(targetLookAt, eased);
        camera.lookAt(lookAt);
        controls.target.copy(lookAt);

        const warp = Math.sin(Math.PI * t); // 0 -> 1 -> 0, đỉnh ở giữa chặng bay
        camera.fov = baseFov + warp * 28;
        camera.updateProjectionMatrix();

        if (t < 1) {
            requestAnimationFrame(step);
        } else {
            camera.fov = baseFov;
            camera.updateProjectionMatrix();
            camera.position.copy(targetCamPos);
            controls.target.copy(targetLookAt);
            controls.update();
            controls.enabled = true;
            isCameraAnimating = false;
            if (onComplete) onComplete();
        }
    }
    requestAnimationFrame(step);
}

// Mở video của 1 hố đen (hiện khung video trung tâm, tự phát, tự lặp)
function openClusterVideo(index) {
    const overlay = document.getElementById('blackhole-video-overlay');
    const videoEl = document.getElementById('blackhole-video');
    if (!overlay || !videoEl) return;

    const src = CLUSTER_VIDEOS[index] || CLUSTER_VIDEOS[0];
    if (videoEl.getAttribute('data-src') !== src) {
        videoEl.setAttribute('data-src', src);
        videoEl.src = src;
    }
    videoEl.currentTime = 0;
    videoEl.play().catch(() => {});

    overlay.classList.add('open');
}

// Đóng video hố đen (bấm ra chỗ trống) — giữ nguyên khung hình đang focus
function closeClusterVideo() {
    const overlay = document.getElementById('blackhole-video-overlay');
    const videoEl = document.getElementById('blackhole-video');
    if (overlay) overlay.classList.remove('open');
    if (videoEl) videoEl.pause();
}

// Bay tới 1 hố đen cụ thể, hố đen đó sẽ là trung tâm màn hình, rồi mở video tương ứng
function focusOnCluster(cluster, index) {
    if (isCameraAnimating) return;
    const center = cluster.position.clone();
    const offset = new THREE.Vector3(0, 14, 34); // góc nhìn chếch trên xuống, đẹp và thấy rõ cụm ảnh
    const camPos = center.clone().add(offset);

    focusedClusterIndex = index;
    flyCameraTo(camPos, center, 2200, () => {
        openClusterVideo(index);
    });
}

// Quay lại khung cảnh ban đầu (khi bấm vào hành tinh chính)
function resetToDefaultView() {
    if (isCameraAnimating) return;
    closeClusterVideo();
    if (focusedClusterIndex === null) return; // đã ở khung cảnh ban đầu, không cần bay lại
    focusedClusterIndex = null;
    flyCameraTo(DEFAULT_CAMERA_POS, DEFAULT_LOOKAT, 2200);
}

// Hoạt cảnh camera bay vào khi người dùng chạm vào hành tinh: đi qua 3 đoạn đường (thẳng ->
// vòng ra sau -> bay tới vị trí quan sát cuối), sau đó mới bật lại điều khiển chuột (controls)
function startCameraAnimation() { 
    const startPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
    const midPos1 = { x: startPos.x, y: 0, z: startPos.z };
    const midPos2 = { x: startPos.x, y: 0, z: 160 };
    const endPos = { x: -40, y: 100, z: 100 };
    const duration1 = 0.2;
    const duration2 = 0.55; 
    const duration3 = 0.4;
    let progress = 0;
    // Nội suy vị trí camera theo từng chặng (progress), có ease-in-out ở chặng cuối
    function animatePath() {
        progress += 0.001010;
        let newPos;
        if (progress < duration1) {
            let t = progress / duration1;
            newPos = {
                x: startPos.x + (midPos1.x - startPos.x) * t,
                y: startPos.y + (midPos1.y - startPos.y) * t,
                z: startPos.z + (midPos1.z - startPos.z) * t,
            };
        } else if (progress < duration1 + duration2) {
            let t = (progress - duration1) / duration2;
            newPos = {
                x: midPos1.x + (midPos2.x - midPos1.x) * t,
                y: midPos1.y + (midPos2.y - midPos1.y) * t,
                z: midPos1.z + (midPos2.z - midPos1.z) * t,
            };
        } else if (progress < duration1 + duration2 + duration3) {
            let t = (progress - duration1 - duration2) / duration3;
            let easedT = 0.5 - 0.5 * Math.cos(Math.PI * t);
            newPos = {
                x: midPos2.x + (endPos.x - midPos2.x) * easedT,
                y: midPos2.y + (endPos.y - midPos2.y) * easedT,
                z: midPos2.z + (endPos.z - midPos2.z) * easedT,
            };
        } else {
            camera.position.set(endPos.x, endPos.y, endPos.z);
            camera.lookAt(0, 0, 0);
            controls.target.set(0, 0, 0);
            controls.update();
            controls.enabled = true;
            return;
        }


        camera.position.set(newPos.x, newPos.y, newPos.z);
        camera.lookAt(0, 0, 0);
        requestAnimationFrame(animatePath);
    }
    controls.enabled = false;
    animatePath();
}

const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 6; // tăng vùng bắt trúng cho các cụm điểm (hố đen), dễ bấm/chạm trúng hơn
const mouse = new THREE.Vector2();
let introStarted = false;
let isCameraAnimating = false;
let focusedClusterIndex = null; // index cụm hố đen đang được focus, null = khung cảnh ban đầu

// Ban đầu chỉ vẽ 10% số sao nền (đỡ tốn hiệu năng lúc chưa chạm vào hành tinh),
// sau khi intro bắt đầu mới vẽ đầy đủ toàn bộ nền sao
const originalStarCount = starGeometry.getAttribute('position').count;
if (starField && starField.geometry) {
    starField.geometry.setDrawRange(0, Math.floor(originalStarCount * 0.1));
}

// Yêu cầu trình duyệt chuyển sang chế độ toàn màn hình (hỗ trợ nhiều tiền tố trình duyệt)
function requestFullScreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) {
        elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
        elem.msRequestFullscreen();
    }
}

// Xử lý khi người dùng bấm/chạm thật sự vào canvas (toạ độ clientX/clientY trên màn hình):
// - Trước khi intro bắt đầu: trúng hành tinh chính -> bắt đầu intro (bay camera, hiện đầy đủ nền sao)
// - Sau khi intro đã chạy:
//     + Trúng 1 hố đen (cụm ảnh) -> bay "xuyên không" tới đó, hố đen thành trung tâm màn hình, mở video riêng
//     + Trúng hành tinh chính -> bay về và quay lại đúng khung cảnh ban đầu
function handleSceneTap(clientX, clientY) {
    if (isCameraAnimating) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    if (!introStarted) {
        const intersects = raycaster.intersectObject(planet);
        if (intersects.length > 0) {
            introStarted = true;
            fadeInProgress = true;
            document.body.classList.add('intro-started');
            startCameraAnimation();

            if (starField && starField.geometry) {
                starField.geometry.setDrawRange(0, originalStarCount);
            }
        }
        return;
    }

    // Ưu tiên kiểm tra hành tinh chính trước: luôn đưa về khung cảnh ban đầu
    const planetHit = raycaster.intersectObject(planet);
    if (planetHit.length > 0) {
        resetToDefaultView();
        return;
    }

    if (!heartPointClouds.length) return; // các cụm hố đen chưa tải xong (hoặc tải lỗi)

    const clusterHit = raycaster.intersectObjects(heartPointClouds);
    if (clusterHit.length > 0) {
        const cluster = clusterHit[0].object;
        const index = cluster.userData.groupIndex;
        if (index !== focusedClusterIndex) {
            closeClusterVideo();
            focusOnCluster(cluster, index);
        }
    }
}

// =========== BẮT THAO TÁC "CHẠM/BẤM" THỐNG NHẤT CHO CHUỘT + CẢM ỨNG + BÚT CẢM ỨNG ===========
// Dùng Pointer Events (pointerdown/pointerup) thay vì chỉ dựa vào sự kiện 'click': trên di động,
// 'click' có thể không phát sinh đáng tin cậy khi đang có thao tác kéo xoay camera (OrbitControls)
// xen vào. Ở đây tự đo khoảng cách + thời gian giữa lúc nhấn và lúc nhả để phân biệt một cú
// "chạm/bấm" thật sự với một thao tác kéo xoay, rồi mới raycast.
let pointerDownInfo = null;
const TAP_MAX_DIST = 10;   // px — nếu ngón tay/chuột di chuyển quá khoảng này thì coi là kéo, không phải chạm
const TAP_MAX_TIME = 600;  // ms — giữ quá lâu cũng không tính là chạm nhanh

function onScenePointerDown(event) {
    pointerDownInfo = {
        x: event.clientX,
        y: event.clientY,
        time: performance.now(),
        pointerId: event.pointerId
    };
}

function onScenePointerUp(event) {
    if (!pointerDownInfo || event.pointerId !== pointerDownInfo.pointerId) return;
    const dx = event.clientX - pointerDownInfo.x;
    const dy = event.clientY - pointerDownInfo.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const elapsed = performance.now() - pointerDownInfo.time;
    pointerDownInfo = null;

    if (dist <= TAP_MAX_DIST && elapsed <= TAP_MAX_TIME) {
        handleSceneTap(event.clientX, event.clientY);
    }
}

function onScenePointerCancel() {
    pointerDownInfo = null;
}

renderer.domElement.addEventListener('pointerdown', onScenePointerDown, { passive: true });
renderer.domElement.addEventListener('pointerup', onScenePointerUp, { passive: true });
renderer.domElement.addEventListener('pointercancel', onScenePointerCancel, { passive: true });

// Bấm vào vùng nền tối xung quanh khung video (ngoài video) để thoát — không di chuyển camera
document.addEventListener('DOMContentLoaded', () => {
    const overlay = document.getElementById('blackhole-video-overlay');
    const box = document.getElementById('blackhole-video-box');
    if (overlay && box) {
        overlay.addEventListener('click', (e) => {
            if (!box.contains(e.target)) {
                closeClusterVideo();
            }
        });
    }
});

// Khởi động vòng lặp render chính
animate();

planet.name = 'main-planet';
centralGlow.name = 'main-glow';

// ================= THIẾT LẬP CHO GIAO DIỆN & ĐIỆN THOẠI =================
// Cập nhật biến CSS --vh và chiều cao #container theo đúng chiều cao thực của viewport
// (khắc phục lỗi 100vh không chính xác trên trình duyệt di động)
function setFullScreen() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    const container = document.getElementById('container');
    if (container) {
        container.style.height = `${window.innerHeight}px`;
    }
}

window.addEventListener('resize', setFullScreen);
window.addEventListener('orientationchange', () => {
    setTimeout(setFullScreen, 300);
});
setFullScreen();

// Chặn cử chỉ vuốt/pinch-zoom mặc định của trình duyệt để tránh xung đột với thao tác xoay/zoom camera
const preventDefault = event => event.preventDefault();
document.addEventListener('touchmove', preventDefault, { passive: false });
document.addEventListener('gesturestart', preventDefault, { passive: false });

const container = document.getElementById('container');
if (container) {
    container.addEventListener('touchmove', preventDefault, { passive: false });
}

// Kiểm tra hướng màn hình để hiển thị cảnh báo (chỉ áp dụng cho thiết bị cảm ứng ở chế độ dọc)
function checkOrientation() {
    const isMobilePortrait = window.innerHeight > window.innerWidth && 'ontouchstart' in window;

    if (isMobilePortrait) {
        document.body.classList.add('portrait-mode');
    } else {
        document.body.classList.remove('portrait-mode');
    }
}

window.addEventListener('DOMContentLoaded', checkOrientation);
window.addEventListener('resize', checkOrientation);
window.addEventListener('orientationchange', () => {
    setTimeout(checkOrientation, 200); 
});
