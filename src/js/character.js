import * as THREE from 'three';
import { scene } from './scene.js';

export let player, enemy;

class SkeletalCharacter {
    constructor(name, colorHex, isEnemy = false) {
        this.name = name;
        this.colorHex = colorHex;
        this.isEnemy = isEnemy;

        this.mesh = new THREE.Object3D();
        this.state = 'idle';
        this.animationTimer = 0;
        this.callbackOnComplete = null;
        this.bones = [];
        this.skeleton = null;
        this.skinnedMesh = null;

        this._build();
    }

    _build() {
        const segH  = 30;
        const segN  = 4;
        const height = segH * segN;   // 120
        const halfH  = height / 2;

        // ── 지오메트리 ──────────────────────────────
        const geo = new THREE.CylinderGeometry(
            this.isEnemy ? 30 : 15,
            this.isEnemy ? 40 : 20,
            height, 8, segN, false
        );

        // ── 스킨 가중치 (L6 스키닝) ─────────────────
        const pos = geo.attributes.position;
        const skinIdx = [], skinWgt = [];
        for (let i = 0; i < pos.count; i++) {
            const y = pos.getY(i);
            const normY = THREE.MathUtils.clamp((y + halfH) / height, 0, 1);
            const bi = Math.min(Math.floor(normY * segN), segN - 1);
            const w  = (normY * segN) % 1.0;
            const bi2 = Math.min(bi + 1, segN - 1);
            skinIdx.push(bi, bi2, 0, 0);
            skinWgt.push(1 - w, w, 0, 0);
        }
        geo.setAttribute('skinIndex',  new THREE.Uint16BufferAttribute(skinIdx, 4));
        geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWgt, 4));

        // ── 뼈 계층 구조 (L6 Joint Hierarchy) ───────
        let parent = new THREE.Bone();
        parent.name = `${this.name}_Root`;
        parent.position.y = -halfH;
        this.bones.push(parent);

        for (let i = 1; i < segN; i++) {
            const b = new THREE.Bone();
            b.name = `${this.name}_Joint${i}`;
            b.position.y = segH;
            parent.add(b);
            this.bones.push(b);
            parent = b;
        }

        // ── 머리 ──────────────────────────────────
        const sz = this.isEnemy ? 42 : 26;
        const headGeo = new THREE.BoxGeometry(sz, sz, sz);
        const headMat = new THREE.MeshPhongMaterial({ color: this.colorHex, flatShading: true });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 24 + sz / 2; // 목 윗부분(몸통 실린더 지오메트리 윗 경계선)에 얹히도록 위치 상향 조정
        head.castShadow = true;
        this.bones[this.bones.length - 1].add(head);

        // 안광 (Emissive Glow Eyes) 추가
        const eyeGeo = new THREE.SphereGeometry(this.isEnemy ? 4 : 2.5, 8, 8);
        const eyeMat = new THREE.MeshBasicMaterial({ color: this.isEnemy ? 0xff0044 : 0x00f2fe });
        
        // 왼쪽 눈 (로컬 +Z가 캐릭터 정면이므로 z축에 약간 오프셋)
        const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
        eyeL.position.set(-sz * 0.22, sz * 0.1, sz * 0.51);
        head.add(eyeL);
        
        // 오른쪽 눈
        const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
        eyeR.position.set(sz * 0.22, sz * 0.1, sz * 0.51);
        head.add(eyeR);

        // ── 무기 / 장식 ────────────────────────────
        if (!this.isEnemy) {
            // 플레이어: 마법검 (bone[2] 에 부착)
            const swordGeo = new THREE.BoxGeometry(7, 100, 12);
            const swordMat = new THREE.MeshPhongMaterial({ color: 0x00f2fe, emissive: 0x0033aa, flatShading: true });
            this.sword = new THREE.Mesh(swordGeo, swordMat);
            this.sword.position.set(28, 18, 0);
            this.sword.rotation.z = -Math.PI / 5;
            this.sword.castShadow = true;
            this.bones[2].add(this.sword);
        } else {
            // 적 골렘: 양쪽 어깨 구체
            const sGeo = new THREE.SphereGeometry(22, 8, 8);
            const sMat = new THREE.MeshPhongMaterial({ color: 0xff0044, emissive: 0x440011 });
            [-46, 46].forEach(x => {
                const s = new THREE.Mesh(sGeo, sMat);
                s.position.set(x, 0, 0);
                this.bones[2].add(s);
            });
        }

        // ── SkinnedMesh ────────────────────────────
        const mat = new THREE.MeshPhongMaterial({
            color: this.isEnemy ? 0xccaa44 : 0x4466aa,
            flatShading: true,
        });
        this.skinnedMesh = new THREE.SkinnedMesh(geo, mat);
        this.skinnedMesh.castShadow = true;
        this.skinnedMesh.receiveShadow = true;

        this.skeleton = new THREE.Skeleton(this.bones);
        this.skinnedMesh.add(this.bones[0]);
        this.skinnedMesh.bind(this.skeleton);
        this.mesh.add(this.skinnedMesh);

        // ── 위치 배치 ──────────────────────────────
        this.mesh.position.set(this.isEnemy ? 180 : -180, this.isEnemy ? 20 : 0, -50);
        // 기사와 보스가 카메라(화면)가 아닌 서로를 향해 자연스럽게 비스듬히 마주보도록 각도 조정
        this.mesh.rotation.y = this.isEnemy ? -Math.PI / 2.2 : Math.PI / 2.2;
        scene.add(this.mesh);
    }

    triggerAttack(onComplete) {
        this.state = 'attack';
        this.animationTimer = 0;
        this.callbackOnComplete = onComplete;
    }

    triggerDamaged() {
        this.state = 'damaged';
        this.animationTimer = 0;
    }

    update(time) {
        this.animationTimer += 0.016;

        if (this.state === 'idle') {
            // 숨쉬기 (삼각함수 정점 관절 회전)
            this.bones[1].rotation.z = Math.sin(time * 2.5) * 0.05;
            this.bones[2].rotation.x = Math.cos(time * 2.5) * 0.03;
            // 플레이어 검 떨림 (sword가 있을 때만)
            if (!this.isEnemy && this.sword) {
                this.sword.rotation.x = Math.sin(time * 5.0) * 0.04;
            }

        } else if (this.state === 'attack') {
            const dur = 0.5;
            const t = this.animationTimer / dur;

            if (t <= 0.4) {
                const a = t / 0.4;
                this.bones[1].rotation.x = this.isEnemy ? a * 0.3 : a * 0.4; // 서로를 향해 앞으로 숙이기 (Pitch)
                if (!this.isEnemy && this.sword) this.sword.rotation.z = -Math.PI/5 - a * 0.8;
            } else if (t <= 0.8) {
                const a = (t - 0.4) / 0.4;
                this.bones[1].rotation.x = this.isEnemy ? 0.3 - a * 0.75 : 0.4 - a * 0.9; // 뒤로 젖히기
                if (!this.isEnemy && this.sword) this.sword.rotation.z = -Math.PI/5 - 0.8 + a * 1.5;
            } else if (t <= 1.0) {
                const a = (t - 0.8) / 0.2;
                this.bones[1].rotation.x *= (1 - a);
                if (!this.isEnemy && this.sword) this.sword.rotation.z = THREE.MathUtils.lerp(this.sword.rotation.z, -Math.PI/5, a);
            } else {
                this.state = 'idle';
                this.bones[1].rotation.x = 0;
                if (this.callbackOnComplete) { this.callbackOnComplete(); this.callbackOnComplete = null; }
            }

        } else if (this.state === 'damaged') {
            const dur = 0.4;
            const t = this.animationTimer / dur;
            
            // 3단계 최종 보스 VoidGoliath인 경우 스케일 확대에 따른 기저 좌표 조정
            let baseX = this.isEnemy ? 180 : -180;
            
            // 피격 진동 효과 (0.3초간 Sine 진동 발생)
            const shake = t < 0.75 ? Math.sin(t * Math.PI * 10) * 16 * (1.0 - t) : 0;

            if (t <= 0.3) {
                const a = t / 0.3;
                this.mesh.position.x = baseX + (this.isEnemy ? a * 35 : -a * 35) + shake;
                this.bones[1].rotation.x = -a * 0.35; // 피격 시 뒤로 젖히기 (Pitch)
                this.skinnedMesh.material.color.setHex(0xff1111); // 선명한 피격 빨간색
            } else if (t <= 1.0) {
                const a = (t - 0.3) / 0.7;
                this.mesh.position.x = THREE.MathUtils.lerp(this.mesh.position.x, baseX, a * 0.2) + shake;
                this.bones[1].rotation.x = THREE.MathUtils.lerp(this.bones[1].rotation.x, 0, a * 0.15);
                // 기존 기저 색상(this.colorHex)으로 완벽하게 복구 (보스 스테이지별 색상 불일치 버그 해결)
                this.skinnedMesh.material.color.setHex(this.colorHex);
            } else {
                this.state = 'idle';
                this.mesh.position.x = baseX;
                this.bones[1].rotation.x = 0;
            }
        }
    }
}

export function initCharacters() {
    player = new SkeletalCharacter('PlayerKnight', 0x4169e1, false);
    enemy  = new SkeletalCharacter('AncientGolem', 0xffd700, true);
}

export function resetCharacters(stage) {
    // 기존 메쉬 씬에서 제거 및 리소스 해제
    if (player && player.mesh) {
        scene.remove(player.mesh);
        player.skinnedMesh.geometry.dispose();
        player.skinnedMesh.material.dispose();
    }
    if (enemy && enemy.mesh) {
        scene.remove(enemy.mesh);
        enemy.skinnedMesh.geometry.dispose();
        enemy.skinnedMesh.material.dispose();
    }

    player = new SkeletalCharacter('PlayerKnight', 0x4169e1, false);

    if (stage === 1) {
        enemy = new SkeletalCharacter('AncientGolem', 0xffd700, true);
    } else if (stage === 2) {
        // 2단계 강화 보스
        enemy = new SkeletalCharacter('ReinforcedGolem', 0xdc143c, true); // Crimson color
        // 스케일 키우기
        enemy.mesh.scale.set(1.4, 1.4, 1.4);
        enemy.mesh.position.y = 40; // 스케일 증대에 따라 y 높이 조정
    } else {
        // 3단계 최종 보스 (VoidGoliath)
        enemy = new SkeletalCharacter('VoidGoliath', 0x4b0082, true); // Deep Indigo
        // 스케일을 훨씬 크게 설정
        enemy.mesh.scale.set(1.8, 1.8, 1.8);
        enemy.mesh.position.y = 65; // y 높이 상향 조정
        
        // 최종 보스의 위엄을 나타내기 위한 뿔 장식 추가 (Cone Geometry)
        const hornGeo = new THREE.ConeGeometry(8, 32, 4);
        const hornMat = new THREE.MeshPhongMaterial({ color: 0xda70d6, emissive: 0x3b003b });
        [-15, 15].forEach(x => {
            const horn = new THREE.Mesh(hornGeo, hornMat);
            horn.position.set(x, 25, 0);
            horn.rotation.z = x > 0 ? -Math.PI / 6 : Math.PI / 6;
            enemy.bones[3].add(horn); // 머리 뼈(bones[3])에 부착
        });
    }

}

export function updateCharacters(time) {
    if (player) player.update(time);
    if (enemy)  enemy.update(time);
}

export function playPlayerAttack() {
    if (player) player.triggerAttack(() => { if (enemy) enemy.triggerDamaged(); });
}

export function playEnemyAttack(onComplete, isBlocked = false) {
    if (enemy) enemy.triggerAttack(() => {
        // 완전 방어한 경우 피격 리액션(몸쏠림, 빨간불, 흔들림)을 스킵함
        if (player && !isBlocked) player.triggerDamaged();
        if (onComplete) onComplete();
    });
}
