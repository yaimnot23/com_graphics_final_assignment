# 📝 컴퓨터그래픽스 최종 과제 현재 개발 현황 및 기술 분석 요약

본 문서는 **컴퓨터그래픽스 최종 과제**인 **3D 로그라이크 덱빌딩 카드 게임 (Slay the WebGL - Chronicles of Light & Cards)** 프로젝트의 현재까지의 개발 진행 상황, 적용된 그래픽스 기술, 소스 코드 구조 및 향후 과제를 종합적으로 정리한 보고서입니다.

---

## 1. 프로젝트 개요

* **게임 장르**: 3D 로그라이크 덱빌딩 카드 게임 (Slay the Spire 스타일)
* **개발 플랫폼**: WebGL 기반 웹 브라우저 (HTML5 / Vanilla CSS / Three.js)
* **핵심 목표**: 
  1. 강의에서 배운 3D 컴퓨터 그래픽스 핵심 이론(변환 행렬, 쿼터니언, 스키닝, BVH 충돌, GI)을 게임 핵심 기획 요소와 유기적으로 결합.
  2. 교수님의 채점 기준(기획 20, 완성도 20, GI 적용 20, 리포트 40)을 극대화하여 통과할 수 있도록 고품질의 비주얼 및 디버그 모드 제공.
  3. Git 기반 배포 및 웹 즉시 구동 기능 확보.

---

## 2. 기술 스택 및 그래픽스 기술 매핑

본 프로젝트에서 사용 중인 그래픽스 기술과 해당 소스 코드 파일의 매핑 현황입니다.

| 그래픽스 이론 및 기술 | 구현 내용 | 관련 소스 코드 |
| :--- | :--- | :--- |
| **변환 행렬 수동 합성 (Translation & Rotation Matrix)** | 드로우된 카드가 화면 하단에 부채꼴 아크(Arc) 모양으로 정렬되도록 $Translation \times Rotation(Z) \times Rotation(X)$ 행렬 직접 계산 및 적용 | [card.js](file:///Volumes/Seagate/.Spotlight-V100/kwclass/4-1/컴퓨터그래픽스/final_assignment/src/js/card.js#L186-L220) (`realignHand`) |
| **쿼터니언 구면 선형 보간 (Quaternion SLERP)** | 카드를 마우스로 드래그할 때 짐벌 락(Gimbal Lock) 없이 정면(카메라 평면)을 부드럽게 바라보도록 보간 회전 제어 | [card.js](file:///Volumes/Seagate/.Spotlight-V100/kwclass/4-1/컴퓨터그래픽스/final_assignment/src/js/card.js#L243-L246) (`updateCards` 내) |
| **정점 셰이더 변형 (Vertex Shader Deformation)** | 카드가 가만히 있을 때의 마력 펄럭임 효과와 드래그 시 가속도에 의해 휘어지는 효과를 `ShaderMaterial`의 사인(Sine) 파동 공식으로 실시간 렌더링 | [card.js](file:///Volumes/Seagate/.Spotlight-V100/kwclass/4-1/컴퓨터그래픽스/final_assignment/src/js/card.js#L114-L145) (`_buildMesh` 내 Custom Shader) |
| **스켈레탈 애니메이션 & 리깅 (Skeletal Joint & Skinning)** | CylinderGeometry의 버텍스 버퍼에 정점 가중치(Skin Weights)와 뼈(Bone) 계층 구조를 바인딩하여 걷기, 공격, 대기, 피격 시의 자연스러운 스키닝 연산 구현 | [character.js](file:///Volumes/Seagate/.Spotlight-V100/kwclass/4-1/컴퓨터그래픽스/final_assignment/src/js/character.js#L29-L114) (`SkeletalCharacter`) |
| **MeshBVH 고속 충돌 판정 (Bounding Volume Hierarchy)** | 카드 드롭 타겟팅 시 복잡도가 높은 적의 3D 바디 메쉬와 마우스 레이저 간의 충돌 판정, 그리고 시전된 **3D 마법 투사체의 Bounding Sphere를 몬스터 로컬 공간으로 역변환하여 boundsTree.intersectsSphere를 통해 매 프레임 실시간 공간 충돌 검사($O(\log N)$)**를 수행 | [collision.js](file:///Volumes/Seagate/.Spotlight-V100/kwclass/4-1/컴퓨터그래픽스/final_assignment/src/js/collision.js) |
| **실시간 글로벌 일루미네이션 프로브 그리드 (Indirect Lighting & GI)** | 전장 하단에 9개(3x1x3)의 라이팅 프로브를 설치하고, 카드(스펠) 사용 시 방출되는 에너지를 거리 제곱 역감쇄(Cosine Falloff) 및 SH(구면조화함수) 방식으로 간접광 전파 시뮬레이션 | [gi_renderer.js](file:///Volumes/Seagate/.Spotlight-V100/kwclass/4-1/컴퓨터그래픽스/final_assignment/src/js/gi_renderer.js) |
| **비등방성 필터링 및 텍스처 랩핑 (Anisotropic Filtering)** | 카드를 비스듬히 아래로 내려다보는 카메라 각도에서 카드 텍스처 및 일러스트가 흐려지는 현상(Over-blur)을 해결하기 위해 `anisotropy = 16` 강제 적용 | [card.js](file:///Volumes/Seagate/.Spotlight-V100/kwclass/4-1/컴퓨터그래픽스/final_assignment/src/js/card.js#L112) (`_buildMesh` 내) |
| **PBR 물리 재질 및 쉐이딩 (PBR Material)** | 캐릭터 및 타일 맵의 입체감을 살리는 플랫 쉐이딩(`flatShading`)과 부드러운 그림자 맵(`PCFSoftShadowMap`) 연동으로 완성도 높은 비주얼 확보 | [scene.js](file:///Volumes/Seagate/.Spotlight-V100/kwclass/4-1/컴퓨터그래픽스/final_assignment/src/js/scene.js) |
| **투사체 입자 잔상 궤적 (Particle Trail)** | 투사체 비행 경로에 Additive Blending 투명도 감쇄 잔상 구체들을 매 프레임 동적 스폰하여 화려한 비행 궤적 연출 | [scene.js](file:///Volumes/Seagate/.Spotlight-V100/kwclass/4-1/컴퓨터그래픽스/final_assignment/src/js/scene.js#L427-L457) (`updateProjectiles` 내) |
| **대기 에테르 먼지 부유 (Floating Dust)** | 3D 안개 공간 내부에 삼각함수 Sine 파동에 의해 천천히 부유하고 wrapping되는 먼지 입자 40개를 렌더링해 신비로운 분위기 연출 | [scene.js](file:///Volumes/Seagate/.Spotlight-V100/kwclass/4-1/컴퓨터그래픽스/final_assignment/src/js/scene.js#L44-L96) |
| **스켈레탈 안광 결합 (Emissive Glow Eyes)** | 캐릭터 최상단 머리 뼈(Head Bone) 노드에 발광 기본 재질(MeshBasicMaterial) 안광을 결합해 계층 변환 행렬 상속 운동 적용 | [character.js](file:///Volumes/Seagate/.Spotlight-V100/kwclass/4-1/컴퓨터그래픽스/final_assignment/src/js/character.js#L75-L89) |
| **디오라마 전장 데코 (Arena Boundary Decors)** | 전장 국경선에 저폴리곤 기둥 기하도형 및 공중부유 자전/왕복운동을 하는 마법 옥빛 크리스탈 장식을 배치하여 입체감 향상 | [scene.js](file:///Volumes/Seagate/.Spotlight-V100/kwclass/4-1/컴퓨터그래픽스/final_assignment/src/js/scene.js#L133-L177) |

---

## 3. 소스 코드 현황 및 파일별 상세 역할

### 📁 디렉토리 구조
```text
├── docs/
│   ├── requriments.md            # 교수님 요구사항 요약 및 평가 기준
│   ├── game_proposals.md         # 과제 기획 후보군 (심해 탐사, 레이서, 빛의 유적)
│   ├── slay_the_spire_design.md  # 3D 덱빌딩 게임 세부 설계서
│   └── current_state_summary.md  # [본 문서] 현재 개발 현황 및 기술 요약
├── agent/
│   └── agent_reference_summary.md # 에이전트용 그래픽스 이론 및 실습 코드 요약본
├── src/
│   ├── css/
│   │   └── main.css              # 프리미엄 다크 테마, HUD UI, 애니메이션 효과 정의
│   ├── js/
│   │   ├── main.js               # 게임 루프 관리, 카메라 제어(WASD), 마우스/키보드 이벤트 연동
│   │   ├── scene.js              # 3D 스테이지, 투사체(Projectile) 클래스, 그림자 렌더러 및 파티클 이펙트
│   │   ├── card.js               # 3D 카드 클래스 생성, Canvas 카드 텍스처 제작, 행렬 아크 배치, 셰이더 변형
│   │   ├── character.js          # 플레이어 및 3개 스테이지 보스 캐릭터의 스켈레탈 스키닝 및 모션 보간
│   │   ├── collision.js          # MeshBVH 빌드, 마우스 레이캐스팅 및 투사체 실시간 공간 구체 충돌 검사
│   │   └── gi_renderer.js        # 9개 라이팅 프로브를 활용한 간접광 전파/감쇄 시뮬레이션
│   └── index.html                # 게임 실행 및 UI 오버레이 마운팅 메인 웹페이지
└── index.html                    # src/index.html로 자동 리다이렉트하는 진입 페이지
```

### 📄 파일별 세부 분석
1. **[index.html](file:///Volumes/Seagate/.Spotlight-V100/kwclass/4-1/컴퓨터그래픽스/final_assignment/src/index.html)**:
   - UI 오버레이와 WebGL Canvas 컨테이너를 나눕니다.
   - 상단 헤더(스테이지 정보, 안내 메시지), 좌측 하단(마나 오브), 우측 하단(턴 종료 버튼), 우측 상단(HP 및 실드 스탯), 디버그 가이드, 게임 클리어/게임 오버 모달 등을 마크업하고 `importmap`을 통해 외부 라이브러리(Three.js, three-mesh-bvh)를 CDN에서 가져옵니다.
2. **[main.css](file:///Volumes/Seagate/.Spotlight-V100/kwclass/4-1/컴퓨터그래픽스/final_assignment/src/css/main.css)**:
   - 게임에 걸맞은 미래지향적이고 신비로운 분위기를 내기 위해 구글 폰트(`Orbitron`, `Inter`)와 그라데이션 컬러, 마나 오브 펄스 애니메이션, 블러 효과(`backdrop-filter`)가 들어간 세련된 다크 테마를 입혔습니다.
3. **[main.js](file:///Volumes/Seagate/.Spotlight-V100/kwclass/4-1/컴퓨터그래픽스/final_assignment/src/js/main.js)**:
   - 게임 상태(`gameState`)를 전역 관리(HP, 마나, 실드, 현재 턴, 디버그 모드, 스테이지 레벨)하고 애니메이션 루프를 제어합니다.
   - WASD 키 입력을 받아 카메라 뷰 행렬의 타겟 좌표를 갱신하고 카메라를 부드럽게 보간 이동시킵니다.
   - 마우스 드래그를 감지하여 씬 내부의 카드 오브젝트를 검출하고, 카드를 놓았을 때 적의 BVH 메쉬와의 충돌 여부를 판단합니다.
   - 적 턴이 완료되면 드로우 보완 규칙(최소 3장 드로우, 3장 이상 보유 시 1장 추가)을 수행합니다.
4. **[scene.js](file:///Volumes/Seagate/.Spotlight-V100/kwclass/4-1/컴퓨터그래픽스/final_assignment/src/js/scene.js)**:
   - 3D 세계관의 기초가 되는 `Scene`, 뷰 행렬을 수동 조작하기 위한 `PerspectiveCamera`, 안개(`FogExp2`), 그림자 활성화 렌더러를 셋팅합니다.
   - **3D 마법 투사체(`Projectile`)** 클래스를 생성하여 플레이어가 스킬을 발동할 때 기사의 위치에서부터 몬스터를 향해 비행하게 만듭니다. 디버그 모드 시 노란색 Bounding Sphere 가시화 헬퍼를 활성화합니다.
   - 바닥(Floor Plane) 및 조명(Hemisphere, Directional)을 생성하고, 스펠 공격 시 실시간 반사광 효과를 극대화하는 `SpotLight` 연출 트리거(`triggerSpellLight`)를 관리합니다.
5. **[card.js](file:///Volumes/Seagate/.Spotlight-V100/kwclass/4-1/컴퓨터그래픽스/final_assignment/src/js/card.js)**:
   - 카드의 속성(화염구, 얼음 송곳, 붕괴, 굳건한 방어, 마법 장벽) 템플릿을 정의합니다.
   - CORS 문제 없이 동적 텍스처를 구현하기 위해 Canvas context API로 마나 코스트, 테두리, 카드 이름, 구분선, 설명을 정밀 드로잉하여 텍스처화합니다.
   - 드로우 배치 시 $T \times Rz \times Rx$ 합성 행렬로 부채꼴 정렬을 수행하고, 드래그 시 좌표 매핑 및 쿼터니언 SLERP 회전 복구를 처리합니다.
   - 커스텀 버텍스 셰이더로 마력의 펄럭임 효과와 드래그 가속도 휨 현상을 사인 파동 수식으로 구현합니다.
6. **[character.js](file:///Volumes/Seagate/.Spotlight-V100/kwclass/4-1/컴퓨터그래픽스/final_assignment/src/js/character.js)**:
   - 뼈(Bone) 인덱스와 가중치를 세그먼트 y좌표에 비례하여 부드럽게 분배해 스키닝을 직접 설정합니다.
   - 대기 상태일 때는 숨쉬기 삼각함수 애니메이션, 공격 시에는 상체를 굽혔다 피는 궤적 애니메이션, 피격 시에는 뒤로 밀리며 몸체가 빨갛게 변하는 셰이딩 효과를 구현했습니다.
7. **[collision.js](file:///Volumes/Seagate/.Spotlight-V100/kwclass/4-1/컴퓨터그래픽스/final_assignment/src/js/collision.js)**:
   - 적 오브젝트를 순회하며 실제 메쉬의 지오메트리를 추출해 `MeshBVH` 트리를 빌드합니다.
   - 디버그 시각화 헬퍼(`MeshBVHHelper`)를 생성하여 'H' 키를 눌렀을 때 BVH 영역을 시각적으로 확인해 리포트에 캡쳐를 쉽게 할 수 있도록 구현했습니다.
8. **[gi_renderer.js](file:///Volumes/Seagate/.Spotlight-V100/kwclass/4-1/컴퓨터그래픽스/final_assignment/src/js/gi_renderer.js)**:
   - 전장에 3x1x3 형태로 9개의 빛 프로브를 띄우고 기본 머티리얼 컬러를 적용합니다.
   - 스펠 공격이 발동될 때 종형 곡선(Bell Curve)으로 에너지를 상승시켰다가 감쇄시킵니다.
   - 공격 원점으로부터의 거리에 비례하여 에너지 역제곱 감쇄(Cosine Falloff)를 간이 연산한 뒤, 프로브 각각의 컬러를 스펠 색상으로 블렌딩(lerp)하고 씬의 앰비언트 라이트와 동화시켜 실시간 간접광 전파 현상을 시각화합니다.

---

## 4. 진행 중이던 핵심 이슈 및 해결 완료 사항

> [!NOTE]
> ###  ✅ [완료] main.js 내 `executeCard` 함수 구현
> 이전 **[main.js:L295](file:///Volumes/Seagate/.Spotlight-V100/kwclass/4-1/컴퓨터그래픽스/final_assignment/src/js/main.js#L295)**에서 호출되던 누락된 `executeCard(selectedCard)` 함수를 성공적으로 구현하였습니다.
>
> **구현된 로직 세부 정보**:
> 1. **마나 체크 및 차감**: 카드 마나 코스트와 플레이어 마나를 대조하여 마나 부족 시 경고 알림과 함께 카드 되돌림 처리. 통과 시 마나 차감.
> 2. **카드 타입 처리**:
>    - `attack` 카드: 적 체력 차감 후 플레이어 공격 애니메이션(`playPlayerAttack()`) 트리거.
>    - `defense` 카드: 플레이어의 실드 수치 증가.
> 3. **그래픽스 연출 연동**: 스펠 시전 시 카드의 고유 컬러를 활용하여 `gi_renderer.js`의 프로브 간접광 시뮬레이션(`setGISpellEffect`) 및 `scene.js`의 `triggerSpellLight` 동적 활성화.
> 4. **종료 조건 판정**: 적 체력이 0 이하가 될 때 `showStageClearModal()`을 호출해 스테이지 클리어 연출 활성화.
> 7. **카드 시전 편의성 제스처 구현 (`main.js` - `onMouseUp` & `onDoubleClick`)**:
>    - **더블 클릭 즉시 시전**: 손패 카드를 더블 클릭(또는 터치)하면, 번거롭게 마우스로 타겟팅 드래그를 하지 않고도 해당 카드가 즉시 사용되어 몬스터에게 명중하거나 방어력이 상승합니다.
>    - **상향 드래그 릴리즈 시전**: 카드를 보스 몬스터 몸에 직접 가져다 놓지 않아도, 카드를 위쪽 방향(정수면 Horizon 기준 `mouse.y > 0.0` 영역)으로 그냥 휙 던지듯 드래그 릴리즈를 수행하면 적에게 즉각 조준 사용되도록 조작감을 향상시켰습니다.

> [!IMPORTANT]
> ### ⚔️ [신규 추가] 3D 마법 투사체 및 MeshBVH 실시간 구체 공간 충돌 판정 (가장 큰 점수 획득 포인트)
> 기존 단순 마우스 레이캐스트 판정에 머무르던 충돌 검사 로직을 개선하여, **학술적이고 시각적인 충돌 피드백을 완성**하였습니다.
> 
> 1. **3D 마법 투사체 시스템 (`scene.js`, `main.js`)**:
>    - 공격 카드 사용 시, 기사의 위치에서 마법 에너지를 지닌 3D 구체(`Projectile`)가 방출되어 몬스터를 향해 비행합니다.
>    - 투사체는 카드 본연의 속성 색상(`colorHex`)을 상속받아 렌더링됩니다.
> 2. **월드-로컬 공간 역변환 및 BVH intersectsSphere 판정 (`collision.js`, `scene.js`)**:
>    - 매 프레임 투사체의 월드 Bounding Sphere를 적 메쉬의 `matrixWorld` 역행렬을 곱해 **적 보스의 로컬 공간으로 투영**합니다.
>    - 적 보스의 `boundsTree`에서 `intersectsSphere(localSphere)`를 호출함으로써, 단순 AABB Collider 대치가 아닌 **리깅 애니메이션이 적용되는 적 메쉬의 세부 기하 삼각형들과 투사체 간의 실시간 교차를 $O(\log N)$ 성능으로 가속 판단**합니다.
> 3. **비동기 타격 체인 및 연출 연동**:
>    - 투사체가 적 메쉬의 BVH 영역과 교차하는 정확한 프레임 시점에 투사체가 파괴(Destroy)되며, 보스의 실제 체력 감산, 피격 애니메이션 트리거, 격렬한 카메라 쉐이크 및 줌인 충격, 그리고 충돌 좌표에서 사방으로 흩뿌려지는 속성 파티클 폭발이 한꺼번에 연동 작동합니다.
> 4. **H 키 디버그 모드용 투사체 바운딩 가시화**:
>    - 디버그 모드('H' 키) 작동 시, 적 보스의 초록색 BVH 상자들과 함께 **투사체를 감싸는 노란색 와이어프레임 Bounding Sphere**가 실시간으로 가시화되어 충돌 수학이 완벽히 구동되고 있음을 시각적으로 증명할 수 있습니다.

> [!TIP]
> ### 🌟 [신규 추가] 유틸리티 카드 및 대화형 덱(DECK) 뷰어 구현
> 게임성을 대폭 고도화하기 위하여 에너지 획득 카드, 드로우 카드를 추가하고 실시간으로 덱 구성을 조회할 수 있는 대화형 모달을 구현했습니다.
>
> 1. **신규 유틸리티 카드 추가 (`card.js`)**:
>    - **마력 충전 (Recharge)**: Cost 0 / 에너지 2 획득. 공격/방어 밸런스를 뒤바꿀 수 있는 고급 에너지 보급 카드.
>    - **영감 (Inspiration)**: Cost 1 / 카드 2장 즉시 드로우. 패 순환을 돕는 전략 카드.
>    - **카드 밸런싱**: 해당 유틸리티 카드들은 강력한 효과를 지니므로 시작 덱(12장)에 각각 1장씩만 희귀하게 배치하여 밸런스 유지.
> 2. **드로우/버림 덱 시스템 구현**:
>    - Slay the Spire와 동일하게 드로우 덱(`drawPile`)과 버린 카드 덱(`discardPile`)을 추적합니다. 드로우 덱이 빌 경우 버린 카드 덱이 셔플되어 드로우 덱으로 복구됩니다.
> 3. **대화형 덱 뷰어 UI 및 모달 (`index.html`, `main.css`, `main.js`)**:
>    - 화면 우측 하단에 실시간으로 현재 덱의 매수를 표시하는 `🎴 DECK (X)` 버튼 생성.
>    - 터치/클릭 시 화면 전체에 블러 코팅(`backdrop-filter`)이 적용된 고급스러운 반투명 덱 조회 모달이 띄워집니다.
>    - 모달 내에서 현재 남은 카드 수, 버려진 카드 수, 그리고 덱의 전체 카드 구성을 이펙트 테두리가 포함된 카드 형태 그리드로 싹 펼쳐서 조회할 수 있습니다.

> [!IMPORTANT]
> ### 👑 [신규 추가] 보스 처치 시 보상 선택 시스템 (강화 카드 & 유물 드래프트)
> 각 스테이지의 보스를 처치했을 때 더 강력한 덱을 빌딩하고 플레이 스타일을 다변화할 수 있는 드래프트 보상 시스템을 구현했습니다.
>
> 1. **보상 획득 흐름**:
>    - 보스의 체력이 0 이하가 되면 보상 모달이 노출됩니다.
>    - **1단계: 강화 카드 선택**: 5개의 강화 카드 후보 중 무작위 3장이 팝업되며, 1장을 선택해 마스터 덱에 영구 추가합니다.
>    - **2단계: 유물 선택**: 5개의 유물 후보 중 무작위 3장이 팝업되며, 1장을 선택해 유물 효과를 즉시 적용받습니다.
>    - 보상 선택을 완료하면 다음 스테이지 진행 버튼이 활성화됩니다.
> 2. **추가된 5개의 강화 카드 (Upgraded Cards)**:
>    - **지옥불 (Hellfire)**: Cost 1 / 피해량 35의 강력한 화염 공격.
>    - **절대 방어 (Absolute Defense)**: Cost 1 / 보호막 25 획득.
>    - **시간 왜곡 (Time Warp)**: Cost 1 / 카드 3장 즉시 드로우.
>    - **우주의 흐름 (Cosmic Flow)**: Cost 0 / 에너지 3 획득.
>    - **빛의 수호검 (Holy Blade)**: Cost 2 / 피해량 60 및 보호막 10 동시 획득.
> 3. **추가된 5개의 전설 유물 (Relics)**:
>    - **💎 빛의 보석**: 전투 시작 시 에너지 +1을 추가 획득하고 시작.
>    - **🪶 바람의 깃털**: 전투 시작 시 시작 손패 카드 2장 추가 드로우 (+2 Draw).
>    - **🛡️ 수호자의 방패**: 전투 시작 시 보호막 20을 즉시 획득하고 시작.
>    - **❤️ 생명의 돌**: 최대 체력 20 증가 및 매 전투 시작 시 체력 100% 회복.
>    - **🔥 불꽃의 심장**: 모든 공격 카드의 최종 가해 피해량 5 영구 증가.
> 4. **UI 및 연동 개선**:
>    - **유물 직관성 및 설명 확인 개선**: 기존에 좌측 `👑 RELICS` 패널에서 단순 표기되던 것에서 더 나아가, 마우스를 유물 아이템 위에 올리면 브라우저 기본 툴팁(`title` 속성)으로 상세 효과가 실시간으로 표기되도록 하였으며, 클릭 시 별도의 경고창(`alert`) 팝업을 띄워 언제든 직관적으로 상세 효과를 인게임 중간에 재확인할 수 있도록 유물 조회 편의성을 높였습니다. 마우스 커서 역시 물음표 도움말(`help`) 커서로 변경되어 식별이 매우 용이합니다.
>    - **카드 데미지 수치 동적 동기화 및 즉시 리프레시**: `🔥 불꽃의 심장` 유물을 보유했을 때, 인게임 피해 연산뿐만 아니라 **손패 카드 텍스처(HTML Canvas)에 그려진 카드 설명 내 피해량 수치(Damage Number)**도 이에 발맞춰 자동으로 +5된 상태(예: 화염구 20 ➡️ 25)로 실시간 업데이트됩니다. 유물이 획득되는 즉시 손패에 이미 쥐고 있는 카드의 텍스처까지 실시간으로 새로 리드로우(`refreshHandCardTextures()`)하며, 덱 조회 모달과 보상 카드 선택지 텍스트에서도 동기화되어 실시간 공격력 변동을 한눈에 정확하게 알 수 있습니다.


> [!TIP]
> ### 💥 [신규 추가] 역동적인 타격감 시스템 (카메라 쉐이크, 줌, 스크린 플래시 및 파티클)
> 3D WebGL 게임으로서 타격 및 피격 시 느껴지는 밋밋함을 보완하고 과제의 완성도(완성도 20점)를 극대화하기 위하여 다각적인 연출 메커니즘을 추가했습니다.
>
> 1. **임팩트 카메라 제어 (`main.js` - `triggerCameraImpact`)**:
>    - **카메라 쉐이크 (Camera Shake)**: 플레이어가 카드로 타격하거나 보스에게 피해를 입는 찰나에 뷰 행렬 연산에 무작위 흔들림 노이즈를 주입하고 매 프레임 감쇄시킵니다.
>    - **드라마틱 줌 (Dynamic Zoom)**: 타격 시 순간적으로 카메라 Z축을 당겨 줌인(Zoom-in)한 뒤, 0.25초에 걸쳐 부드럽게 원래의 화각으로 줌아웃(Zoom-out)시킵니다. (방어 카드 사용 시에는 어지러움을 방지하기 위해 줌 연출을 스킵하고 수치 상승에만 집중합니다.)
> 2. **스크린 플래시 (`index.html`, `main.css`)**:
>    - 타격 시 0.06초간 화면 전체를 하얗게 반짝여 충격을 주는 시각 장치인 `#flash-overlay` CSS 연동 구현.
> 3. **피격 반사 파티클 시스템 (`scene.js`, `main.js`)**:
>    - 타격 지점에서 20개의 3D 파티클 구체(`SphereGeometry`)를 생성하여 사방으로 분사시킵니다.
>    - 중력 가속도 연산 및 불투명도/크기 감쇄 애니메이션을 적용해 폭발적인 타격 연출을 선사합니다.
>    - 카드의 고유 색상(`colorHex`)을 상속받아 화염구는 오렌지색, 얼음송곳은 민트색 등 파티클 색상이 맞춤형으로 뿜어집니다.
> 4. **캐릭터 진동 피격 애니메이션 (`character.js`)**:
>    - 피격 시 0.3초간 Sine 진폭 감쇄 함수를 적용해 캐릭터 몸체가 격렬하게 좌우로 진동하는 애니메이션을 추가했습니다.
>    - 스키딩 복구 과정에서 발생하던 보스 스테이지별 색상 불일치 버그를 `this.colorHex` 참조를 통해 해결했습니다.
> 5. **방어 카드 전용 이펙트 (`scene.js` - `spawnDefenseParticles`)**:
>    - 방어 카드 사용 시 플레이어 기사 발밑에서 위로 솟구쳐 오르는 사각형 큐브 형태(`BoxGeometry`)의 파티클 15개를 생성하여 방어력 상승을 은유적으로 묘사합니다.
> 6. **완전 방어 쉴드 홀로그램 이펙트 (`scene.js` - `spawnShieldBlockEffect`)**:
>    - 방어가 활성화된 상태에서 보스의 공격을 맞았으나 실드가 모든 대미지를 막아내어 **체력 손실이 전혀 없는 경우(HP 감소 0)**, 플레이어 기사 앞에 동심원 형태의 **수호 초록빛 3D 쉴드 홀로그램 메쉬(`RingGeometry`)**를 띄우고 서서히 팽창시키며 사라지게 만듭니다.
>    - 이때, 기사가 입는 타격 충격이 상쇄되었으므로 카메라는 아주 가벼운 흔들림만 발생시키고 **캐릭터가 뒤로 밀리는 피격 리액션 애니메이션(`triggerDamaged`)을 완전히 스킵**해 완전 방어의 느낌을 완벽하게 살렸습니다.
>    - 만약 실드로 대미지가 전부 흡수되지 못해 **조금이라도 체력이 닳는 관통 피해**를 입으면, 기존의 모든 피격 연출(몸 쏠림, 붉은 피격 라이트, 격렬한 쉐이크, 피격 파티클)이 고스란히 발동하도록 정교한 이중 분기형 조건부 연출을 완성했습니다.
> 7. **카드 시전 편의성 제스처 구현 (`main.js` - `onMouseUp` & `onDoubleClick`)**:
>    - **더블 클릭 즉시 시전**: 손패 카드를 더블 클릭(또는 터치)하면, 번거롭게 마우스로 타겟팅 드래그를 하지 않고도 해당 카드가 즉시 사용되어 몬스터에게 명중하거나 방어력이 상승합니다.
>    - **상향 드래그 릴리즈 시전**: 카드를 보스 몬스터 몸에 직접 가져다 놓지 않아도, 카드를 위쪽 방향(정수면 Horizon 기준 `mouse.y > 0.0` 영역)으로 그냥 휙 던지듯 드래그 릴리즈를 수행하면 적에게 즉각 조준 사용되도록 조작감을 향상시켰습니다.







---

## 5. 리포트(MD) 작성을 위한 캡쳐 포인트 권장 가이드

교수님 채점 기준상 **전체 점수의 40%를 차지하는 리포트**에는 반드시 실제 구동 화면 캡쳐본이 들어가야 하므로, 아래의 포인트들을 캡쳐 및 매핑하여 설명하는 것이 좋습니다.

1. **카드 배치 행렬 (L1 Transform)**: 카드들이 부채꼴 모양으로 자연스럽게 배열된 하단 HUD 뷰 캡쳐.
2. **카드 드래그 및 회전 (L1 Quaternion)**: 카드를 마우스로 집어 올렸을 때 카메라 평면을 향해 카드가 평평하게 눕는 각도 변화 비교 캡쳐.
3. **카드 셰이더 변형 (L3 Vertex Shader)**: 카드가 펄럭이면서 물결무늬 굴곡이 발생한 미세 측면 뷰 캡쳐.
4. **MeshBVH 충돌 박스 및 투사체 Bounding Sphere (L3 BVH 실시간 충돌)**:
   - 디버그 모드('H' 키)를 켜서 몬스터 주위에 조밀하게 형성된 **초록색의 계층적 BVH 바운딩 박스 트리 구조**와 공격 시 날아가는 **투사체 주위의 노란색 Bounding Sphere 와이어프레임**이 함께 렌더링된 뷰 캡쳐.
   - 노란색 구체가 보스 몬스터의 초록색 BVH 박스에 닿는 순간의 충돌 기하학적 교차 상태 캡쳐.
5. **스켈레탈 리깅 (L6 Skinning)**: 캐릭터 메쉬 실린더의 마디와 관절 뼈대 정보 캡쳐.
6. **글로벌 일루미네이션 적용 전/후 (GI Renderer)**:
   - **적용 전 (Direct Only)**: 스킬 사용 시 직접광(`SpotLight`)만 켜졌을 때 그림자 뒤쪽이나 프로브 구체가 반응하지 않고 아주 어둡게 남아있는 상태.
   - **적용 후 (DDGI Enabled)**: 스펠 발동 중 9개의 가상 프로브 구체들이 빛을 머금고 붉거나 푸른빛으로 발광하며, 씬 전체의 앰비언트 라이트가 연동되어 벽면과 구석구석을 은은하게 밝힌 상태 비교 캡쳐.

