import * as THREE from 'three';
import { scene, camera } from './scene.js';
import { playerRelics } from './main.js';


export let cardsInHand = [];
export let cardGroup;

export const startingDeck = [
    { name: "화염구 (Fireball)",      cost: 1, damage: 20, block: 0,  type: 'attack',  colorHex: 0xff4500, desc: "적에게 20의 화염 피해를 줍니다." },
    { name: "화염구 (Fireball)",      cost: 1, damage: 20, block: 0,  type: 'attack',  colorHex: 0xff4500, desc: "적에게 20의 화염 피해를 줍니다." },
    { name: "화염구 (Fireball)",      cost: 1, damage: 20, block: 0,  type: 'attack',  colorHex: 0xff4500, desc: "적에게 20의 화염 피해를 줍니다." },
    { name: "얼음 송곳 (Ice Spike)",  cost: 1, damage: 15, block: 0,  type: 'attack',  colorHex: 0x00bfff, desc: "적에게 15의 냉기 피해를 줍니다." },
    { name: "얼음 송곳 (Ice Spike)",  cost: 1, damage: 15, block: 0,  type: 'attack',  colorHex: 0x00bfff, desc: "적에게 15의 냉기 피해를 줍니다." },
    { name: "붕괴 (Disintegrate)",    cost: 2, damage: 45, block: 0,  type: 'attack',  colorHex: 0x9400d3, desc: "에너지를 집중해 적에게 45의 파괴 피해를 줍니다." },
    { name: "굳건한 방어",            cost: 1, damage: 0,  block: 15, type: 'defense', colorHex: 0x50c878, desc: "보호막을 15 얻습니다. (1턴 동안 유지)" },
    { name: "굳건한 방어",            cost: 1, damage: 0,  block: 15, type: 'defense', colorHex: 0x50c878, desc: "보호막을 15 얻습니다. (1턴 동안 유지)" },
    { name: "굳건한 방어",            cost: 1, damage: 0,  block: 15, type: 'defense', colorHex: 0x50c878, desc: "보호막을 15 얻습니다. (1턴 동안 유지)" },
    { name: "마법 장벽",              cost: 2, damage: 0,  block: 30, type: 'defense', colorHex: 0x967bb6, desc: "마력 장벽으로 보호막을 30 얻습니다." },
    { name: "마력 충전 (Recharge)",   cost: 0, damage: 0,  block: 0,  type: 'utility', colorHex: 0xffd700, energyGain: 2, desc: "에너지를 2 얻습니다." },
    { name: "영감 (Inspiration)",     cost: 1, damage: 0,  block: 0,  type: 'utility', colorHex: 0x00ff7f, drawCount: 2, desc: "카드를 2장 드로우합니다." }
];

export let drawPile = [];
export let discardPile = [];

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

export function resetDeck() {
    drawPile = shuffle([...startingDeck]);
    discardPile = [];
    if (typeof window.updateDeckUI === 'function') {
        window.updateDeckUI();
    }
}


// ────────────────────────────────────────────
// Canvas 텍스처 생성 (CORS-free)
// ────────────────────────────────────────────
function createCardTexture(name, cost, desc, colorHex) {
    const W = 256, H = 384;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // 배경
    ctx.fillStyle = '#1a1628';
    ctx.fillRect(0, 0, W, H);

    // 테두리
    const cs = '#' + colorHex.toString(16).padStart(6, '0');
    ctx.strokeStyle = cs;
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, W - 8, H - 8);

    // 아트 영역
    ctx.fillStyle = '#100e1a';
    ctx.fillRect(14, 14, W - 28, 158);

    // 마력 보석
    const grd = ctx.createRadialGradient(W/2, 93, 5, W/2, 93, 38);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.4, cs);
    grd.addColorStop(1, '#00000000');
    ctx.beginPath();
    ctx.arc(W/2, 93, 38, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // 마나 코스트
    ctx.beginPath();
    ctx.arc(36, 36, 22, 0, Math.PI * 2);
    ctx.fillStyle = '#00c3f9';
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cost, 36, 36);

    // 카드 이름
    ctx.font = 'bold 15px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(name, W/2, 200);

    // 구분선
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(20, 212); ctx.lineTo(W-20, 212); ctx.stroke();

    // 설명
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#b0b8cc';
    _wrapText(ctx, desc, W/2, 232, W - 40, 18);

    return new THREE.CanvasTexture(canvas);
}

function _wrapText(ctx, text, x, y, maxW, lh) {
    const words = text.split(' ');
    let line = '';
    let cy = y;
    for (const w of words) {
        const test = line + w + ' ';
        if (ctx.measureText(test).width > maxW && line !== '') {
            ctx.fillText(line.trim(), x, cy);
            line = w + ' '; cy += lh;
        } else { line = test; }
    }
    ctx.fillText(line.trim(), x, cy);
}

// ────────────────────────────────────────────
// Card 클래스
// ────────────────────────────────────────────
export class Card {
    constructor(tmpl) {
        this.template = tmpl; // original template reference
        Object.assign(this, tmpl);

        this.W = 22; this.H = 33;
        this.targetPos  = new THREE.Vector3();
        this.currentPos = new THREE.Vector3(999, 999, 999); // 화면 밖에서 시작
        this.targetQuat  = new THREE.Quaternion();
        this.currentQuat = new THREE.Quaternion();
        this.isDragging  = false;
        this._buildMesh();
    }

    _buildMesh() {
        // 정점 변형을 위해 PlaneGeometry를 세분화 (12×12)
        const geo = new THREE.PlaneGeometry(this.W, this.H, 12, 12);
        
        // 불꽃의 심장 유물 효과 적용 시 카드 설명 텍스트 데미지 수치 동적 변경
        let finalDesc = this.desc;
        const hasFireHeart = typeof playerRelics !== 'undefined' && playerRelics.some(r => r.id === 'fire_heart');
        if (hasFireHeart && this.type === 'attack') {
            finalDesc = finalDesc.replace(new RegExp(this.damage), this.damage + 5);
        }

        const tex = createCardTexture(this.name, this.cost, finalDesc, this.colorHex);

        tex.anisotropy = 16;                        // 비등방성 필터링 (L5)

        // 커스텀 ShaderMaterial – 정점 파동 변형 (L3 Vertex Shader)
        this.mat = new THREE.ShaderMaterial({
            uniforms: {
                uTex:           { value: tex },
                uTime:          { value: 0 },
                uWave:          { value: 0.0 },     // 드래그 시 휨 강도
            },
            vertexShader: `
                uniform float uTime;
                uniform float uWave;
                varying vec2  vUv;
                void main() {
                    vUv = uv;
                    vec3 p = position;
                    // 마력 펄럭임: 위쪽 정점일수록 더 크게 흔들림
                    float ratio = (p.y + ${(this.H/2).toFixed(1)}) / ${this.H.toFixed(1)};
                    p.z += sin(p.x * 0.18 + uTime * 6.0) * 1.2 * ratio;
                    // 드래그 가속도 휨
                    p.z += sin(p.x * 0.10) * uWave * 5.0;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D uTex;
                varying vec2 vUv;
                void main() {
                    gl_FragColor = texture2D(uTex, vUv);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
        });

        this.mesh = new THREE.Mesh(geo, this.mat);
        this.mesh.userData.card = this;             // 역참조
        cardGroup.add(this.mesh);
    }

    updateTexture() {
        let finalDesc = this.desc;
        const hasFireHeart = typeof playerRelics !== 'undefined' && playerRelics.some(r => r.id === 'fire_heart');
        if (hasFireHeart && this.type === 'attack') {
            finalDesc = finalDesc.replace(new RegExp(this.damage), this.damage + 5);
        }
        const tex = createCardTexture(this.name, this.cost, finalDesc, this.colorHex);
        tex.anisotropy = 16;
        if (this.mat && this.mat.uniforms && this.mat.uniforms.uTex) {
            if (this.mat.uniforms.uTex.value) {
                this.mat.uniforms.uTex.value.dispose();
            }
            this.mat.uniforms.uTex.value = tex;
        }
    }

    onDragStart()  { this.isDragging = true;  }
    onDragEnd()    { this.isDragging = false; }

    destroy() {
        cardGroup.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mat.dispose();
        
        // played/destroyed cards go to discardPile
        discardPile.push(this.template);

        const i = cardsInHand.indexOf(this);
        if (i !== -1) cardsInHand.splice(i, 1);
        realignHand();
        
        if (typeof window.updateDeckUI === 'function') {
            window.updateDeckUI();
        }
    }
}

export function refreshHandCardTextures() {
    cardsInHand.forEach(card => {
        card.updateTexture();
    });
}


// ────────────────────────────────────────────
// 덱 초기화
// ────────────────────────────────────────────
export function initDeck() {
    cardGroup = new THREE.Group();
    cardGroup.name = 'HandCardGroup';
    // camera의 자식으로 붙여 항상 화면 하단에 고정 (HUD 방식)
    camera.add(cardGroup);
    resetDeck();
}

export function drawCard() {
    if (cardsInHand.length >= 5) return;
    
    if (drawPile.length === 0) {
        if (discardPile.length === 0) {
            drawPile = shuffle([...startingDeck]);
        } else {
            drawPile = shuffle([...discardPile]);
            discardPile = [];
        }
    }
    
    const tmpl = drawPile.pop();
    const card = new Card(tmpl);
    cardsInHand.push(card);
    realignHand();
    
    if (typeof window.updateDeckUI === 'function') {
        window.updateDeckUI();
    }
}


// ────────────────────────────────────────────
// 손패 아크 행렬 수동 정렬 (L1 변환 행렬 합성)
// ────────────────────────────────────────────
function realignHand() {
    const N = cardsInHand.length;
    if (N === 0) return;

    // 카드 간격 (각도) – 최대 ±20°
    const totalArc  = Math.min((N - 1) * 0.18, 0.7); // radians
    const step = N > 1 ? totalArc / (N - 1) : 0;
    const startA = -totalArc / 2;

    // 카메라 기준 손패 기준점: NDC로 따지면 화면 하단 중앙
    // camera의 fov=45, near=1. z=-100 평면에서 y 방향 화면 크기 ≈ 100*tan(22.5°)≈41
    const CX = 0, CY = -16, CZ = -110;   // 카메라 로컬 좌표
    const R  = 140;                        // 아크 반경

    for (let i = 0; i < N; i++) {
        const card = cardsInHand[i];
        if (card.isDragging) continue;

        const a = startA + i * step;

        // ── 변환 행렬 수동 합성: T × Rz × Rx ──────────────────
        const px = CX + R * Math.sin(a);
        const py = CY + R * (Math.cos(a) - 1);   // 아크 하단 기준 정렬
        const pz = CZ + i * 0.3;                  // z-fighting 방지

        const Rz  = new THREE.Matrix4().makeRotationZ(a);
        const Rx  = new THREE.Matrix4().makeRotationX(-0.28); // 약간 뒤로 눕힘
        const T   = new THREE.Matrix4().makeTranslation(px, py, pz);

        const M = T.multiply(Rz).multiply(Rx);   // T × Rz × Rx

        card.targetPos.setFromMatrixPosition(M);
        card.targetQuat.setFromRotationMatrix(M);
    }
}

// ────────────────────────────────────────────
// 매 프레임 보간 업데이트
// ────────────────────────────────────────────
export function updateCards(mouse, isDragging, selectedCard) {
    const t = performance.now() * 0.001;

    for (const card of cardsInHand) {
        card.mat.uniforms.uTime.value = t;

        if (card.isDragging) {
            // 마우스 NDC → 카메라 앞 z=-100 평면 좌표 (간단한 선형 비례 매핑)
            const aspect = window.innerWidth / window.innerHeight;
            const hh = 100 * Math.tan(22.5 * Math.PI / 180); // half height at z=-100
            const hw = hh * aspect;
            const tx =  mouse.x * hw;
            const ty =  mouse.y * hh;
            const dragTarget = new THREE.Vector3(tx, ty, -100);

            card.currentPos.lerp(dragTarget, 0.2);
            card.mesh.position.copy(card.currentPos);

            // 드래그 중 쿼터니언 SLERP: 화면 정면을 바라보게 (Rx 약간만)
            const flatQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.1, 0, 0));
            card.currentQuat.slerp(flatQ, 0.12);
            card.mesh.quaternion.copy(card.currentQuat);

            // 드래그 속도 → 휨 강도
            const speed = card.currentPos.distanceTo(dragTarget);
            card.mat.uniforms.uWave.value = THREE.MathUtils.lerp(card.mat.uniforms.uWave.value, Math.min(speed * 0.06, 0.8), 0.15);
        } else {
            card.currentPos.lerp(card.targetPos, 0.1);
            card.mesh.position.copy(card.currentPos);
            card.currentQuat.slerp(card.targetQuat, 0.1);
            card.mesh.quaternion.copy(card.currentQuat);
            card.mat.uniforms.uWave.value = THREE.MathUtils.lerp(card.mat.uniforms.uWave.value, 0, 0.1);
        }
    }
}
