import * as THREE from 'three';

export let scene, camera, renderer;
export let ambientLight, shadowLight, spotLight;

export let boundaryDecors = [];
export let floatingDust = [];

export function initScene(containerId) {
    const W = window.innerWidth;
    const H = window.innerHeight;

    // 1. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0910);
    scene.fog = new THREE.FogExp2(0x0a0910, 0.0006);

    // 2. Camera  (fov=45, near=1, far=5000)
    camera = new THREE.PerspectiveCamera(45, W / H, 1, 5000);
    camera.position.set(0, 350, 600);
    camera.lookAt(0, -30, 0);

    // camera를 씬에 추가해야 camera의 자식(cardGroup)이 렌더링됨
    scene.add(camera);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.getElementById(containerId).appendChild(renderer.domElement);

    // 4. Lights
    _createLights();

    // 5. Floor
    _createFloor();

    // 6. Floating Dust (에테르 먼지 이펙트)
    initFloatingDust();

    // 7. Resize
    window.addEventListener('resize', () => {
        const nW = window.innerWidth, nH = window.innerHeight;
        renderer.setSize(nW, nH);
        camera.aspect = nW / nH;
        camera.updateProjectionMatrix();
    });
}

export function initFloatingDust() {
    floatingDust.forEach(d => scene.remove(d.mesh));
    floatingDust = [];

    const count = 40;
    const geo = new THREE.SphereGeometry(1.2, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
        color: 0x00f2fe,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending
    });

    for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
            (Math.random() - 0.5) * 550,
            Math.random() * 150 - 20,
            (Math.random() - 0.5) * 450
        );
        scene.add(mesh);
        floatingDust.push({
            mesh,
            speedY: Math.random() * 0.15 + 0.08,
            phase: Math.random() * Math.PI * 2,
            rangeX: Math.random() * 0.25 + 0.08
        });
    }
}

export function updateFloatingDust() {
    const time = performance.now() * 0.0015;
    floatingDust.forEach(d => {
        d.mesh.position.y += d.speedY;
        d.mesh.position.x += Math.sin(time + d.phase) * d.rangeX;
        if (d.mesh.position.y > 130) {
            d.mesh.position.y = -20;
        }
    });
}

export function updateDecors() {
    const time = performance.now() * 0.001;
    boundaryDecors.forEach((cry, idx) => {
        cry.rotation.y = time * 0.5 + idx;
        cry.rotation.x = Math.sin(time * 0.8 + idx) * 0.2;
        cry.position.y = 80 + Math.sin(time * 1.5 + idx) * 12; // 부유 운동
    });
}

function _createLights() {
    ambientLight = new THREE.HemisphereLight(0x111122, 0x050510, 0.4);
    scene.add(ambientLight);

    shadowLight = new THREE.DirectionalLight(0xffffff, 0.7);
    shadowLight.position.set(200, 500, 300);
    shadowLight.castShadow = true;
    shadowLight.shadow.mapSize.set(2048, 2048);
    shadowLight.shadow.camera.near = 100;
    shadowLight.shadow.camera.far  = 1200;
    const d = 400;
    Object.assign(shadowLight.shadow.camera, { left: -d, right: d, top: d, bottom: -d });
    scene.add(shadowLight);

    // 스킬 이펙트용 SpotLight (기본 강도=0)
    spotLight = new THREE.SpotLight(0x00f2fe, 0, 1200, Math.PI / 4, 0.5, 1.5);
    spotLight.position.set(0, 400, 200);
    spotLight.castShadow = true;
    scene.add(spotLight);
}

function _createFloor() {
    const geo = new THREE.PlaneGeometry(1200, 1200, 24, 24);
    const mat = new THREE.MeshStandardMaterial({
        color: 0x131122,
        roughness: 0.9,
        metalness: 0.1,
        flatShading: true,
    });
    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -80;
    floor.receiveShadow = true;
    scene.add(floor);

    // ── 디오라마 국경선 장식 (Arena Boundary Decors) ──
    boundaryDecors = [];
    const positions = [
        [-300, -250], [300, -250],
        [-350, 150], [350, 150]
    ];

    // 1. 고대 기둥 장식 (Columns)
    const colGeo = new THREE.CylinderGeometry(15, 20, 120, 6);
    const colMat = new THREE.MeshStandardMaterial({
        color: 0x1a182e,
        roughness: 0.85,
        flatShading: true
    });
    positions.forEach((pos, idx) => {
        const col = new THREE.Mesh(colGeo, colMat);
        col.position.set(pos[0], -20, pos[1]); // 바닥에 세움 (-80 + 60 = -20)
        col.castShadow = true;
        col.receiveShadow = true;
        scene.add(col);
    });

    // 2. 공중부유 크리스탈 장식 (Floating Crystals)
    const cryGeo = new THREE.OctahedronGeometry(18, 0);
    const cryMat = new THREE.MeshPhongMaterial({
        color: 0x00f2fe,
        emissive: 0x003344,
        flatShading: true,
        transparent: true,
        opacity: 0.85
    });
    positions.forEach((pos, idx) => {
        const cry = new THREE.Mesh(cryGeo, cryMat);
        cry.position.set(pos[0], 80, pos[1]); // 공중에 띄움
        cry.castShadow = true;
        scene.add(cry);
        boundaryDecors.push(cry);
    });
}

// 스킬 시전 시 SpotLight 강도를 올렸다 내리기
export function triggerSpellLight(colorHex, duration = 1000) {
    spotLight.color.setHex(colorHex);
    let elapsed = 0;
    const step = 16, max = 14;
    const id = setInterval(() => {
        elapsed += step;
        const half = duration / 2;
        spotLight.intensity = elapsed < half
            ? (elapsed / half) * max
            : (1 - (elapsed - half) / half) * max;
        if (elapsed >= duration) { spotLight.intensity = 0; clearInterval(id); }
    }, step);
}

// ─── 타격 파티클 시스템 ──────────────────────────────────
export const activeParticles = [];

export function spawnHitParticles(position, colorHex = 0xffa500) {
    const count = 20;
    const geo = new THREE.SphereGeometry(2.5, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 1.0
    });
    
    const group = new THREE.Group();
    for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(position);
        
        // 사방으로 뿜어지는 속도 벡터 계산 (중력 영향을 위해 위로 튀는 성향 부여)
        const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 12,
            (Math.random() - 0.2) * 14 + 5,
            (Math.random() - 0.5) * 12
        );
        
        group.add(mesh);
        activeParticles.push({
            mesh,
            vel,
            life: 1.0,
            decay: 0.02 + Math.random() * 0.03
        });
    }
    scene.add(group);
    
    // 일정 시간 후 메모리 누수 방지를 위한 리소스 처분
    setTimeout(() => {
        scene.remove(group);
        geo.dispose();
        mat.dispose();
    }, 1200);
}

export function updateParticles() {
    for (let i = activeParticles.length - 1; i >= 0; i--) {
        const p = activeParticles[i];
        p.mesh.position.add(p.vel);
        p.vel.y -= 0.45; // 중력 가속도
        p.life -= p.decay;
        p.mesh.material.opacity = Math.max(0, p.life);
        p.mesh.scale.setScalar(Math.max(0.001, p.life));
        if (p.life <= 0) {
            activeParticles.splice(i, 1);
        }
    }
}

// ─── 방어 카드 사용 시 상승 파티클 이펙트 ───────────────────
export function spawnDefenseParticles(position, colorHex = 0x50c878) {
    const count = 15;
    const geo = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    const mat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.95
    });
    
    const group = new THREE.Group();
    for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(geo, mat);
        // 플레이어 주위 원형 배치
        const angle = Math.random() * Math.PI * 2;
        const radius = 12 + Math.random() * 12;
        mesh.position.set(
            position.x + Math.cos(angle) * radius,
            position.y + Math.random() * 50 - 10,
            position.z + Math.sin(angle) * radius
        );
        
        // 상승형 속도 벡터
        const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 1.5,
            Math.random() * 2.5 + 2.0, // 위로 솟구침
            (Math.random() - 0.5) * 1.5
        );
        
        group.add(mesh);
        activeParticles.push({
            mesh,
            vel,
            life: 1.0,
            decay: 0.02 + Math.random() * 0.02
        });
    }
    scene.add(group);
    
    setTimeout(() => {
        scene.remove(group);
        geo.dispose();
        mat.dispose();
    }, 1200);
}

// ─── 완전 방어 시 방패 홀로그램 이펙트 ──────────────────────
export function spawnShieldBlockEffect(position) {
    // 플레이어 앞에 배치할 원형 쉴드 메쉬 생성
    const geo = new THREE.RingGeometry(16, 26, 6);
    const mat = new THREE.MeshBasicMaterial({
        color: 0x50c878, // 수호 초록색 빛
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide
    });
    
    const mesh = new THREE.Mesh(geo, mat);
    // 플레이어 오른쪽 (적 보스 방향) 앞부분 공중에 위치 설정
    mesh.position.set(position.x + 35, position.y + 45, position.z);
    mesh.rotation.y = Math.PI / 2; // 적을 바라보도록 90도 회전
    scene.add(mesh);
    
    // 서서히 팽창하며 사라지는 애니메이션 (setInterval)
    let life = 1.0;
    const step = 16.67;
    const intervalId = setInterval(() => {
        life -= 0.06;
        mesh.material.opacity = Math.max(0, life);
        mesh.scale.setScalar(1.0 + (1.0 - life) * 0.45);
        if (life <= 0) {
            clearInterval(intervalId);
            scene.remove(mesh);
            geo.dispose();
            mat.dispose();
        }
    }, step);
}

// ─── 3D 마법 투사체 (Projectile) 시스템 ───────────────────
export const activeProjectiles = [];

export class Projectile {
    constructor(startPos, targetPos, colorHex, onHitCallback) {
        this.startPos = startPos.clone();
        // 기사의 무기 끝 근처 높이에서 투사체 시작 설정
        this.startPos.y += 40; 
        
        this.targetPos = targetPos.clone();
        // 보스의 심장/가슴 높이 근처로 타겟 y좌표 세부 보정
        this.targetPos.y += 50; 

        this.colorHex = colorHex;
        this.onHitCallback = onHitCallback;
        this.speed = 12; // 프레임당 이동 속도
        this.radius = 6.0; // 투사체 구체 크기
        
        this.mesh = null;
        this.debugHelper = null;
        this.boundingSphere = new THREE.Sphere(this.startPos, this.radius);
        
        this._build();
    }

    _build() {
        // 투사체 메쉬
        const geo = new THREE.SphereGeometry(this.radius, 12, 12);
        const mat = new THREE.MeshBasicMaterial({
            color: this.colorHex,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });
        this.mesh = new THREE.Mesh(geo, mat);
        this.mesh.position.copy(this.startPos);
        scene.add(this.mesh);

        // 디버그용 노란색 Bounding Sphere 와이어프레임 가시화 헬퍼 (H 키 디버그 모드 대응)
        const debugGeo = new THREE.SphereGeometry(this.radius * 1.05, 8, 8);
        const debugMat = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            wireframe: true,
            transparent: true,
            opacity: 0.6,
            depthTest: false,
            depthWrite: false
        });
        this.debugHelper = new THREE.Mesh(debugGeo, debugMat);
        this.debugHelper.name = 'ProjectileDebugHelper';
        this.debugHelper.visible = false; // 기본적으론 숨김 (디버그 모드 ON 시 main.js에서 visible 처리)
        this.mesh.add(this.debugHelper);
    }

    update() {
        // 타겟 방향 벡터 계산
        const dir = new THREE.Vector3().subVectors(this.targetPos, this.mesh.position);
        const dist = dir.length();
        
        if (dist <= this.speed) {
            // 거의 도착했다면 바로 충돌 판정을 강제로 일으킴 (안전 소멸 장치)
            this.mesh.position.copy(this.targetPos);
            this.boundingSphere.center.copy(this.targetPos);
            return true; 
        } else {
            dir.normalize().multiplyScalar(this.speed);
            this.mesh.position.add(dir);
            this.boundingSphere.center.copy(this.mesh.position);
            return false;
        }
    }

    destroy() {
        if (this.mesh) {
            scene.remove(this.mesh);
            if (this.mesh.geometry) this.mesh.geometry.dispose();
            if (this.mesh.material) this.mesh.material.dispose();
            if (this.debugHelper) {
                if (this.debugHelper.geometry) this.debugHelper.geometry.dispose();
                if (this.debugHelper.material) this.debugHelper.material.dispose();
            }
        }
    }
}

export function spawnProjectile(startPos, targetPos, colorHex, onHitCallback) {
    const proj = new Projectile(startPos, targetPos, colorHex, onHitCallback);
    
    // 현재 메인 게임의 debugMode 상태를 조회하여 헬퍼 노출 여부 바로 결정
    const debugBtn = document.getElementById('system-message');
    const isDebug = debugBtn && debugBtn.innerText.includes('DEBUG MODE ON');
    if (proj.debugHelper) {
        proj.debugHelper.visible = isDebug;
    }

    activeProjectiles.push(proj);
}

export function updateProjectiles(checkCollisionFn) {
    for (let i = activeProjectiles.length - 1; i >= 0; i--) {
        const proj = activeProjectiles[i];
        const arrived = proj.update();
        
        // ── 투사체 비행 시 잔상 이펙트 (Particle Trail) 추가 ──
        if (proj.mesh && Math.random() < 0.85) {
            const trailGeo = new THREE.SphereGeometry(proj.radius * 0.5, 4, 4);
            const trailMat = new THREE.MeshBasicMaterial({
                color: proj.colorHex,
                transparent: true,
                opacity: 0.55,
                blending: THREE.AdditiveBlending
            });
            const trailMesh = new THREE.Mesh(trailGeo, trailMat);
            trailMesh.position.copy(proj.mesh.position);
            scene.add(trailMesh);
            
            // activeParticles 배열에 추가하여 매 프레임 감쇄/소멸되도록 함 (속도는 0으로 하여 그 자리에 잔상이 맺히도록 함)
            activeParticles.push({
                mesh: trailMesh,
                vel: new THREE.Vector3(0, 0, 0),
                life: 0.6,
                decay: 0.05
            });
            
            // 일정시간 후 지오메트리/머티리얼 메모리 해제
            setTimeout(() => {
                scene.remove(trailMesh);
                trailGeo.dispose();
                trailMat.dispose();
            }, 500);
        }

        // 1. MeshBVH 실시간 구체-대-메쉬 충돌 체크
        const isHit = checkCollisionFn(proj.boundingSphere);
        
        if (isHit || arrived) {
            // 충돌(Hit) 또는 목적지 도착 시 콜백 실행 및 투사체 제거
            proj.onHitCallback(proj.mesh.position);
            proj.destroy();
            activeProjectiles.splice(i, 1);
        }
    }
}



