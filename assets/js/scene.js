import * as THREE from "three";

const canvas = document.getElementById("scene");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = matchMedia("(pointer: coarse)").matches || innerWidth < 720;

let renderer;
try {
	renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: "high-performance" });
} catch {
	// No WebGL: the CSS gradient background stays as the fallback
	throw new Error("WebGL unavailable");
}
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
camera.position.set(0, 0, 6);

// Ashima 3D simplex noise
const NOISE = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-.85373472095314*r;}
float snoise(vec3 v){
	const vec2 C=vec2(1./6.,1./3.);const vec4 D=vec4(0.,.5,1.,2.);
	vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
	vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
	vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
	i=mod289(i);
	vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
	float n_=.142857142857;vec3 ns=n_*D.wyz-D.xzx;
	vec4 j=p-49.*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.*x_);
	vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.-abs(x)-abs(y);
	vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
	vec4 s0=floor(b0)*2.+1.;vec4 s1=floor(b1)*2.+1.;vec4 sh=-step(h,vec4(0.));
	vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
	vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
	vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
	p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
	vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);m=m*m;
	return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const uniforms = {
	uTime: { value: 0 },
	uPulse: { value: 10 }, // seconds since last pulse
	uPulseDir: { value: new THREE.Vector3(0, 0, 1) },
	uPointer: { value: new THREE.Vector3(0, 0, 1) },
	uHover: { value: 0 },
	uScatter: { value: 0 },
	uCalm: { value: 1 },
	uFade: { value: 1 },
	uSize: { value: renderer.getPixelRatio() * (isMobile ? 2.2 : 2.6) },
	uColorA: { value: new THREE.Color("#8b5cf6") },
	uColorB: { value: new THREE.Color("#22d3ee") },
	uColorC: { value: new THREE.Color("#fbbf24") },
};

const coreVertex = /* glsl */ `
uniform float uTime, uPulse, uHover, uSize, uScatter, uCalm;
uniform vec3 uPulseDir, uPointer;
varying float vMix;
varying float vGlow;
${NOISE}
void main(){
	vec3 n = normalize(position);
	float noise = snoise(n * 1.6 + vec3(uTime * 0.25)) * uCalm;
	float bulge = pow(max(dot(n, uPointer), 0.), 6.) * 0.35 * uHover;
	float d = acos(clamp(dot(n, uPulseDir), -1., 1.));
	float wave = sin(d * 9. - uPulse * 9.) * exp(-uPulse * 1.6) * (1. - smoothstep(uPulse * 3.2 - .4, uPulse * 3.2 + .4, d)) * 0.22;
	float rnd = fract(sin(dot(position, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
	float scatter = uScatter * (0.4 + rnd * 1.8) + uScatter * snoise(n * 3. + uTime * .4) * .5;
	vec3 p = position * (1. + noise * 0.18 + bulge + wave + scatter);
	vMix = noise * .5 + .5;
	vGlow = bulge * 2.5 + abs(wave) * 4.;
	vec4 mv = modelViewMatrix * vec4(p, 1.);
	gl_PointSize = uSize * (5. / -mv.z);
	gl_Position = projectionMatrix * mv;
}`;

const coreFragment = (points, alpha) => /* glsl */ `
uniform vec3 uColorA, uColorB, uColorC;
uniform float uFade, uScatter;
varying float vMix;
varying float vGlow;
void main(){
	${points ? "float r = length(gl_PointCoord - .5); if (r > .5) discard; float a = smoothstep(.5, .1, r);" : "float a = 1.;"}
	vec3 col = mix(uColorA, uColorB, vMix);
	col = mix(col, uColorC, clamp(vGlow, 0., 1.) * .6);
	gl_FragColor = vec4(col, a * ${alpha.toFixed(2)} * (1. + vGlow) * uFade${points ? "" : " * (1. - uScatter)"});
}`;

const material = (points, alpha) =>
	new THREE.ShaderMaterial({
		uniforms,
		vertexShader: coreVertex,
		fragmentShader: coreFragment(points, alpha),
		transparent: true,
		depthWrite: false,
		blending: THREE.AdditiveBlending,
	});

// The stage holds the core and its ring so both move together between scroll poses
const stage = new THREE.Group();
scene.add(stage);
const core = new THREE.Group();
const radius = 1.55;
const sphere = new THREE.IcosahedronGeometry(radius, isMobile ? 18 : 28);
core.add(new THREE.Points(sphere, material(true, 0.85)));
core.add(new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(radius, isMobile ? 5 : 7)), material(false, 0.14)));
stage.add(core);

// Orbiting particle ring + distant dust
function particles(count, spread, ring) {
	const pos = new Float32Array(count * 3);
	const seed = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		let x, y, z;
		if (ring) {
			const a = Math.random() * Math.PI * 2;
			const r = 2.5 + Math.pow(Math.random(), 2) * 1.6;
			x = Math.cos(a) * r;
			y = (Math.random() - 0.5) * 0.18 * r;
			z = Math.sin(a) * r;
		} else {
			const v = new THREE.Vector3().randomDirection().multiplyScalar(6 + Math.random() * spread);
			({ x, y, z } = v);
		}
		pos.set([x, y, z], i * 3);
		seed[i] = Math.random();
	}
	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
	geo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
	return new THREE.Points(
		geo,
		new THREE.ShaderMaterial({
			uniforms,
			vertexShader: /* glsl */ `
				uniform float uTime, uSize;
				attribute float seed;
				varying float vSeed;
				void main(){
					vSeed = seed;
					vec4 mv = modelViewMatrix * vec4(position, 1.);
					gl_PointSize = uSize * (0.6 + seed) * ${ring ? "4." : "6."} / -mv.z * (0.7 + 0.3 * sin(uTime * 2. + seed * 40.));
					gl_Position = projectionMatrix * mv;
				}`,
			fragmentShader: /* glsl */ `
				uniform vec3 uColorA, uColorB, uColorC;
				uniform float uFade;
				varying float vSeed;
				void main(){
					float r = length(gl_PointCoord - .5); if (r > .5) discard;
					vec3 col = vSeed > .93 ? uColorC : mix(uColorA, uColorB, vSeed);
					gl_FragColor = vec4(col, smoothstep(.5, 0., r) * ${ring ? ".75 * uFade" : ".5"});
				}`,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		})
	);
}

const ring = particles(isMobile ? 900 : 1800, 0, true);
stage.add(ring);
const dust = particles(isMobile ? 350 : 700, 14, false);
scene.add(dust);

// Tiny "kadir" labels floating inside the core; they fly out and brighten when it scatters
function kadirLabels(count) {
	const label = document.createElement("canvas");
	label.width = label.height = 256;
	const texture = new THREE.CanvasTexture(label);
	const draw = () => {
		const g = label.getContext("2d");
		g.clearRect(0, 0, 256, 256);
		g.fillStyle = "#fff";
		g.font = '700 72px "Space Grotesk", system-ui, sans-serif';
		g.textAlign = "center";
		g.textBaseline = "middle";
		g.fillText("kadir", 128, 128);
		texture.needsUpdate = true;
	};
	draw();
	document.fonts?.load('700 72px "Space Grotesk"').then(draw, () => {});

	const pos = new Float32Array(count * 3);
	const seed = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		const v = new THREE.Vector3().randomDirection().multiplyScalar(radius * (0.25 + Math.random() * 0.6));
		pos.set([v.x, v.y, v.z], i * 3);
		seed[i] = Math.random();
	}
	const geo = new THREE.BufferGeometry();
	geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
	geo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));

	return new THREE.Points(
		geo,
		new THREE.ShaderMaterial({
			uniforms: { ...uniforms, uLabel: { value: texture }, uTwinkle: { value: reduceMotion ? 0 : 1 }, uScale: { value: isMobile ? 1.5 : 1 } },
			vertexShader: /* glsl */ `
				uniform float uTime, uSize, uScatter, uTwinkle, uScale;
				attribute float seed;
				varying float vSeed;
				varying float vAlpha;
				${NOISE}
				void main(){
					vSeed = seed;
					vec3 q = position * 1.3 + uTime * .2;
					vec3 p = position + vec3(snoise(q), snoise(q + 9.), snoise(q + 19.)) * .08;
					p *= 1. + uScatter * (.8 + seed * 2.2);
					vec4 mv = modelViewMatrix * vec4(p, 1.);
					float twinkle = 1. - .3 * uTwinkle * (.5 + .5 * sin(uTime * 1.5 + seed * 50.));
					vAlpha = mix(.6, 1., uScatter) * twinkle;
					gl_PointSize = uSize * uScale * (48. + seed * 24.) * (1. + uScatter * 1.1) / -mv.z;
					gl_Position = projectionMatrix * mv;
				}`,
			fragmentShader: /* glsl */ `
				uniform sampler2D uLabel;
				uniform vec3 uColorA, uColorB, uColorC;
				uniform float uFade, uScatter;
				varying float vSeed;
				varying float vAlpha;
				void main(){
					float a = texture2D(uLabel, vec2(gl_PointCoord.x, 1. - gl_PointCoord.y)).a;
					if (a < .02) discard;
					vec3 col = vSeed > .88 ? uColorC : mix(uColorA, uColorB, vSeed);
					// Labels stay readable while scattered, even where the core is dimmed behind text
					gl_FragColor = vec4(col, a * vAlpha * mix(uFade, 1., uScatter));
				}`,
			transparent: true,
			depthWrite: false,
			blending: THREE.AdditiveBlending,
		})
	);
}

core.add(kadirLabels(isMobile ? 35 : 70));

// Input: pointer / touch / device tilt
const pointer = new THREE.Vector2();
const target = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
const hitSphere = new THREE.Sphere();
let hoverTarget = 0;

function setPointer(x, y) {
	target.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
}

function pointOnCore(ndc) {
	raycaster.setFromCamera(ndc, camera);
	const hit = raycaster.ray.intersectSphere(hitSphere, new THREE.Vector3());
	return hit ? core.worldToLocal(hit).normalize() : null;
}

addEventListener("pointermove", (e) => setPointer(e.clientX, e.clientY), { passive: true });
addEventListener("pointerdown", (e) => {
	setPointer(e.clientX, e.clientY);
	if (reduceMotion) return;
	const dir = pointOnCore(target) ?? new THREE.Vector3(0, 0, 1).applyQuaternion(core.quaternion.clone().invert());
	uniforms.uPulseDir.value.copy(dir);
	uniforms.uPulse.value = 0;
	requestTilt();
});

// The hidden terminal opening sends a pulse through the core
addEventListener("terminal:open", () => {
	if (reduceMotion) return;
	uniforms.uPulseDir.value.set(0, 0, 1).applyQuaternion(core.quaternion.clone().invert());
	uniforms.uPulse.value = 0;
});

const tilt = new THREE.Vector2();
let hasTilt = false;
function onTilt(e) {
	if (e.beta == null) return;
	hasTilt = true;
	tilt.set(THREE.MathUtils.clamp(e.gamma / 35, -1, 1), THREE.MathUtils.clamp((e.beta - 45) / 35, -1, 1));
}
let tiltRequested = false;
function requestTilt() {
	if (tiltRequested || !isMobile) return;
	tiltRequested = true;
	const DOE = window.DeviceOrientationEvent;
	if (DOE && typeof DOE.requestPermission === "function") {
		DOE.requestPermission().then((s) => s === "granted" && addEventListener("deviceorientation", onTilt)).catch(() => {});
	}
}
if (isMobile && window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission !== "function") {
	addEventListener("deviceorientation", onTilt);
}

// Layout
function resize() {
	const w = innerWidth;
	const h = innerHeight;
	renderer.setSize(w, h, false);
	camera.aspect = w / h;
	// Keep the core fully visible on narrow portrait screens
	camera.position.z = camera.aspect < 1 ? Math.min((6 / camera.aspect) * 0.8, 11) : 6;
	camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

// Scroll poses: each section[data-pose] has a target look for the stage
const POSES = {
	hero: { x: 0, y: 0, s: 1, scatter: 0, calm: 1, tilt: 0, hue: 0, fade: 1, beat: 0 },
	about: { x: 2.3, y: 0, s: 0.72, scatter: 0, calm: 0.9, tilt: 0.6, hue: 0.25, fade: 1, beat: 0 },
	experience: { x: -2.4, y: 0, s: 0.75, scatter: 0, calm: 0.35, tilt: -0.5, hue: 1, fade: 1, beat: 0 },
	projects: { x: 0, y: 2, s: 0.55, scatter: 0, calm: 0.6, tilt: 1.4, hue: 0.7, fade: 0.45, beat: 0 },
	skills: { x: 0, y: 0, s: 1.05, scatter: 1, calm: 1, tilt: 0.25, hue: 0.5, fade: 0.75, beat: 0 },
	education: { x: 2.3, y: 0.2, s: 0.65, scatter: 0.12, calm: 0.7, tilt: 0.9, hue: 0.3, fade: 1, beat: 0 },
	contact: { x: 0, y: 0, s: 0.9, scatter: 0, calm: 1.2, tilt: 0, hue: 0, fade: 1, beat: 1 },
};
const KEYS = Object.keys(POSES.hero);
const poseSections = [...document.querySelectorAll("[data-pose]")];
const pose = { ...POSES.hero };
const violet = new THREE.Color("#8b5cf6");
const blue = new THREE.Color("#3b82f6");

function poseFor(name) {
	const p = POSES[name] ?? POSES.hero;
	// On phones the text spans the full width, so the core stays centered and dims behind it
	if (!isMobile || name === "hero" || name === "contact") return p;
	return { ...p, x: 0, y: 0, s: p.s * 0.9, fade: p.fade * 0.4 };
}

function scrollTarget() {
	const y = scrollY;
	let i = 0;
	while (i < poseSections.length - 1 && poseSections[i + 1].offsetTop <= y) i++;
	const a = poseFor(poseSections[i].dataset.pose);
	const next = poseSections[i + 1];
	if (!next) return a;
	const top = poseSections[i].offsetTop;
	const f = THREE.MathUtils.smoothstep((y - top) / (next.offsetTop - top), 0.3, 1);
	const b = poseFor(next.dataset.pose);
	const out = {};
	for (const k of KEYS) out[k] = a[k] + (b[k] - a[k]) * f;
	return out;
}

// Loop
const clock = new THREE.Clock();
const speed = reduceMotion ? 0.15 : 1;
let running = true;

function frame() {
	if (!running) return;
	const dt = Math.min(clock.getDelta(), 0.05);
	const t = (uniforms.uTime.value += dt * speed);
	uniforms.uPulse.value += dt;

	const input = hasTilt ? tilt : target;
	pointer.lerp(input, 0.05);

	const goal = scrollTarget();
	for (const k of KEYS) pose[k] += (goal[k] - pose[k]) * (reduceMotion ? 1 : 0.07);
	stage.position.set(pose.x, pose.y, 0);
	stage.scale.setScalar(pose.s);
	uniforms.uScatter.value = pose.scatter;
	uniforms.uCalm.value = pose.calm;
	uniforms.uFade.value = pose.fade;
	uniforms.uColorA.value.copy(violet).lerp(blue, pose.hue);
	if (pose.beat > 0.5 && uniforms.uPulse.value > 1.8 && !reduceMotion) {
		uniforms.uPulseDir.value.set(0, 0, 1).applyQuaternion(core.quaternion.clone().invert());
		uniforms.uPulse.value = 0;
	}
	hitSphere.set(stage.position, radius * 1.15 * pose.s);

	const dir = pointOnCore(target);
	hoverTarget = dir && !hasTilt && pose.scatter < 0.3 ? 1 : 0;
	if (dir) uniforms.uPointer.value.lerp(dir, 0.15).normalize();
	uniforms.uHover.value += (hoverTarget - uniforms.uHover.value) * 0.06;

	core.rotation.y = t * 0.12;
	core.rotation.x = Math.sin(t * 0.2) * 0.15;
	ring.rotation.set(0.45 + pose.tilt * 0.6, -t * 0.05, -0.25 + pose.tilt * 0.3);
	dust.rotation.y = t * 0.01;

	camera.position.x = pointer.x * 0.6;
	camera.position.y = pointer.y * 0.4;
	camera.lookAt(0, 0, 0);

	renderer.render(scene, camera);
	requestAnimationFrame(frame);
}

document.addEventListener("visibilitychange", () => {
	running = !document.hidden;
	if (running) {
		clock.getDelta();
		requestAnimationFrame(frame);
	}
});

requestAnimationFrame(() => {
	frame();
	canvas.classList.add("is-ready");
});
