import * as THREE from 'three';
import { scene, ambientLight } from './scene.js';

export let giProbeGroup;
let probes = [];

// 스킬 시전 시 전역 조명 변화 상태
let spellActive = false;
let spellColor = new THREE.Color(0x000000);
let spellMaxDuration = 1000;
let spellTimer = 0;
let baseAmbientIntensity = 0.4;

export function initGIProbes() {
    giProbeGroup = new THREE.Group();
    giProbeGroup.name = "GIProbeGroup";
    scene.add(giProbeGroup);

    // 1. 디오라마 전장 하단 영역에 3 x 1 x 3 형태의 9개 라이팅 프로브 그리드 배치
    const xs = [-250, 0, 250];
    const zs = [-150, 0, 150];
    const posY = -30; // 바닥 평면(-80)보다 약간 위에 배치하여 주변 3D 캐릭터에 간접광 투사

    for (let x of xs) {
        for (let z of zs) {
            // 프로브용 지오메트리 (디버그 시각화용 작은 구체)
            const geo = new THREE.SphereGeometry(6, 16, 16);
            
            // 빛을 스스로 머금고 뿜는 형태를 위해 MeshBasicMaterial 사용
            const mat = new THREE.MeshBasicMaterial({
                color: 0x222233,
                transparent: true,
                opacity: 0.8
            });
            
            const probeMesh = new THREE.Mesh(geo, mat);
            probeMesh.position.set(x, posY, z);
            probeMesh.name = "GIProbe";
            probeMesh.visible = false; // 기본 숨김, H 키로 토글

            giProbeGroup.add(probeMesh);

            // 프로브 개별 상태 캐시 저장
            probes.push({
                mesh: probeMesh,
                baseColor: new THREE.Color(0x222233),
                currentColor: new THREE.Color(0x222233),
                worldPos: new THREE.Vector3(x, posY, z)
            });
        }
    }
    console.log("9개 글로벌 일루미네이션 프로브 그리드 인덱싱 완료.");
}

// 스킬 발동 시 마나 및 광원 에너지 동기화 (main.js에서 호출)
export function setGISpellEffect(colorHex, duration = 1200) {
    spellActive = true;
    spellColor.setHex(colorHex);
    spellMaxDuration = duration;
    spellTimer = 0;
}

// 매 프레임 main.js 애니메이션 룹에서 호출되어 간접광 전파 시뮬레이션 연산 수행
export function updateGIProbes() {
    const timeStep = 16.67; // ms (대략 60fps)
    let spellIntensity = 0;

    if (spellActive) {
        spellTimer += timeStep;
        
        // 종 모양 곡선(Bell curve)으로 스펠 라이트 강도 계산
        const halfDuration = spellMaxDuration / 2;
        if (spellTimer < halfDuration) {
            spellIntensity = spellTimer / halfDuration;
        } else if (spellTimer < spellMaxDuration) {
            spellIntensity = 1 - (spellTimer - halfDuration) / halfDuration;
        } else {
            spellActive = false;
            spellIntensity = 0;
        }
    }

    // 1. 프로브 그리드의 간접광 누적 및 컬러 연산
    for (let p of probes) {
        if (spellIntensity > 0) {
            // 마법 원점(0, 50, 0: 전장 중앙 공중)에서 각 프로브까지의 거리를 계산해 거리 감쇄 적용 (Cosine Falloff)
            const spellOrigin = new THREE.Vector3(0, 50, 0);
            const dist = p.worldPos.distanceTo(spellOrigin);
            
            // 거리 역제곱 감쇄 공식을 간이 시뮬레이션하여 에너지 가중치 획득
            const falloff = 1.0 / (1.0 + 0.000025 * dist * dist);
            const giContribution = spellIntensity * falloff;

            // 프로브의 반사광 색상 = 기본 어두운 컬러 + (스펠 색상 * 기여 가중치) (SH 난반사 에너지 누적)
            p.currentColor.copy(p.baseColor).lerp(spellColor, giContribution * 1.5);
            
            // 프로브 구체 자체의 발광 색상 변경
            p.mesh.material.color.copy(p.currentColor);
        } else {
            // 평상시에는 은은한 어두운 기저 조명 색으로 회귀
            p.currentColor.lerp(p.baseColor, 0.08);
            p.mesh.material.color.copy(p.currentColor);
        }
    }

    // 2. 앰비언트 라이트(Ambient Light) 연동 및 대기 안개(Fog) 색상 동화 (Atmospheric GI)
    if (spellIntensity > 0) {
        // 간접광(GI)이 씬 전체를 은은하게 지배하도록 앰비언트 라이트의 감도를 마법 색상에 맞춰 상승시킴
        const currentAmbientColor = new THREE.Color(0x111122);
        currentAmbientColor.lerp(spellColor, spellIntensity * 0.4);
        ambientLight.color.copy(currentAmbientColor);
        ambientLight.intensity = baseAmbientIntensity + (spellIntensity * 0.3);

        // 안개 색상도 간접광에 물들여 공간감 극대화
        if (scene && scene.fog) {
            const fogColor = new THREE.Color(0x0a0910).lerp(spellColor, spellIntensity * 0.15);
            scene.fog.color.copy(fogColor);
        }
    } else {
        // 평상시 세팅으로 부드럽게 복구
        const targetAmbientColor = new THREE.Color(0x111122);
        ambientLight.color.lerp(targetAmbientColor, 0.08);
        ambientLight.intensity = THREE.MathUtils.lerp(ambientLight.intensity, baseAmbientIntensity, 0.08);

        if (scene && scene.fog) {
            const baseFogColor = new THREE.Color(0x0a0910);
            scene.fog.color.lerp(baseFogColor, 0.08);
        }
    }
}
