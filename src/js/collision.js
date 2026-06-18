import * as THREE from 'three';
import { MeshBVH, MeshBVHHelper, acceleratedRaycast } from 'three-mesh-bvh';
import { scene } from './scene.js';

// Three.js 기본 레이캐스터를 BVH 가속 버전으로 교체 (L3 가속 충돌 구현)
THREE.Mesh.prototype.raycast = acceleratedRaycast;

let targetMesh = null;
let bvhHelper  = null;

export function initBVH(enemyRoot) {
    // 이전 스테이지의 targetMesh 및 bvhHelper 정리
    targetMesh = null;
    if (bvhHelper) {
        scene.remove(bvhHelper);
        bvhHelper = null;
    }

    // 적 오브젝트 트리에서 SkinnedMesh(몸체) 탐색
    enemyRoot.traverse(n => {
        if ((n.isSkinnedMesh || n.isMesh) && !targetMesh) {
            targetMesh = n;
        }
    });

    if (!targetMesh) { console.warn('BVH: 적 메쉬를 찾을 수 없음'); return; }

    // BoundsTree(BVH) 인덱싱 – AABB 계층 구조로 삼각형 분류 → O(log N) 탐색
    targetMesh.geometry.boundsTree = new MeshBVH(targetMesh.geometry);

    // 디버그용 BVH 시각화 Helper (H 키 토글)
    bvhHelper = new MeshBVHHelper(targetMesh);
    bvhHelper.name    = 'MeshBVHHelper';
    bvhHelper.visible = false;
    bvhHelper.color.set(0x00ff00); // 시인성이 아주 뛰어난 형광 녹색(Neon Green)으로 변경
    if (bvhHelper.material) {
        bvhHelper.material.depthTest = false;  // 캐릭터 메쉬에 묻히지 않고 화면 상단에 뚫고 보이도록 설정
        bvhHelper.material.depthWrite = false;
        bvhHelper.material.transparent = true;
        bvhHelper.material.opacity = 0.95;     // 선명하게 보이도록 투명도 설정
    }
    scene.add(bvhHelper);

    console.log('MeshBVH 인덱싱 완료:', targetMesh.name || 'enemy body');
}

// 카드 드롭 시 적과 교차 여부 판정
export function checkCollision(raycaster) {
    if (!targetMesh) return false;
    // acceleratedRaycast가 내부적으로 BoundsTree를 활용해 고속 판정
    return raycaster.intersectObject(targetMesh, true).length > 0;
}

// 투사체의 Bounding Sphere와 적 메쉬의 BVH 간의 실시간 공간 충돌 판정 (L3 BVH 실시간 교차 검사)
export function checkSphereCollision(worldSphere) {
    if (!targetMesh) return false;

    // 월드 공간의 Sphere를 적 메쉬의 로컬 공간으로 변환
    const worldToLocal = new THREE.Matrix4().copy(targetMesh.matrixWorld).invert();
    const localSphere = worldSphere.clone();
    localSphere.applyMatrix4(worldToLocal);

    // boundsTree가 구축되어 있다면 intersectsSphere를 활용해 O(log N) 수준으로 구체 충돌 검사
    if (targetMesh.geometry.boundsTree) {
        return targetMesh.geometry.boundsTree.intersectsSphere(localSphere);
    }
    return false;
}

