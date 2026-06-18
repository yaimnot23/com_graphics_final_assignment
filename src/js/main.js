import * as THREE from 'three';
import { initScene, scene, camera, renderer, triggerSpellLight, spawnHitParticles, updateParticles, spawnDefenseParticles, spawnShieldBlockEffect, spawnProjectile, updateProjectiles, updateFloatingDust, updateDecors } from './scene.js';

import { initDeck, drawCard, updateCards, cardsInHand, cardGroup, resetDeck, drawPile, discardPile, startingDeck, refreshHandCardTextures } from './card.js';
import { initCharacters, updateCharacters, player, enemy, playPlayerAttack, playEnemyAttack, resetCharacters } from './character.js';
import { initBVH, checkCollision, checkSphereCollision } from './collision.js';
import { initGIProbes, updateGIProbes, setGISpellEffect } from './gi_renderer.js';


// ─── 게임 상태 ─────────────────────────────────────────
export const gameState = {
    mana: 3, maxMana: 3,
    playerHP: 80, maxPlayerHP: 80,
    playerShield: 0,
    enemyHP: 120, maxEnemyHP: 120,
    turn: 'player',
    debugMode: false,
    stage: 1
};

// ─── 유물(Relic) & 강화 카드(Upgraded Card) 데이터 정의 ─────
const defaultStartingDeck = [
    { name: "화염구 (Fireball)", cost: 1, damage: 20, block: 0, type: 'attack', colorHex: 0xff4500, desc: "적에게 20의 화염 피해를 줍니다." },
    { name: "화염구 (Fireball)", cost: 1, damage: 20, block: 0, type: 'attack', colorHex: 0xff4500, desc: "적에게 20의 화염 피해를 줍니다." },
    { name: "화염구 (Fireball)", cost: 1, damage: 20, block: 0, type: 'attack', colorHex: 0xff4500, desc: "적에게 20의 화염 피해를 줍니다." },
    { name: "얼음 송곳 (Ice Spike)", cost: 1, damage: 15, block: 0, type: 'attack', colorHex: 0x00bfff, desc: "적에게 15의 냉기 피해를 줍니다." },
    { name: "얼음 송곳 (Ice Spike)", cost: 1, damage: 15, block: 0, type: 'attack', colorHex: 0x00bfff, desc: "적에게 15의 냉기 피해를 줍니다." },
    { name: "붕괴 (Disintegrate)", cost: 2, damage: 45, block: 0, type: 'attack', colorHex: 0x9400d3, desc: "에너지를 집중해 적에게 45의 파괴 피해를 줍니다." },
    { name: "굳건한 방어", cost: 1, damage: 0, block: 15, type: 'defense', colorHex: 0x50c878, desc: "보호막을 15 얻습니다. (1턴 동안 유지)" },
    { name: "굳건한 방어", cost: 1, damage: 0, block: 15, type: 'defense', colorHex: 0x50c878, desc: "보호막을 15 얻습니다. (1턴 동안 유지)" },
    { name: "굳건한 방어", cost: 1, damage: 0, block: 15, type: 'defense', colorHex: 0x50c878, desc: "보호막을 15 얻습니다. (1턴 동안 유지)" },
    { name: "마법 장벽", cost: 2, damage: 0, block: 30, type: 'defense', colorHex: 0x967bb6, desc: "마력 장벽으로 보호막을 30 얻습니다." },
    { name: "마력 충전 (Recharge)", cost: 0, damage: 0, block: 0, type: 'utility', colorHex: 0xffd700, energyGain: 2, desc: "에너지를 2 얻습니다." },
    { name: "영감 (Inspiration)", cost: 1, damage: 0, block: 0, type: 'utility', colorHex: 0x00ff7f, drawCount: 2, desc: "카드를 2장 드로우합니다." }
];

const upgradedCards = [
    { name: "지옥불 (Hellfire)", cost: 1, damage: 35, block: 0, type: 'attack', colorHex: 0xff0000, desc: "적에게 35의 강력한 화염 피해를 줍니다." },
    { name: "절대 방어 (Absolute Defense)", cost: 1, damage: 0, block: 25, type: 'defense', colorHex: 0xadff2f, desc: "보호막을 25 얻습니다." },
    { name: "시간 왜곡 (Time Warp)", cost: 1, damage: 0, block: 0, type: 'utility', colorHex: 0x40e0d0, drawCount: 3, desc: "카드를 3장 드로우합니다." },
    { name: "우주의 흐름 (Cosmic Flow)", cost: 0, damage: 0, block: 0, type: 'utility', colorHex: 0xff8c00, energyGain: 3, desc: "에너지를 3 얻습니다." },
    { name: "빛의 수호검 (Holy Blade)", cost: 2, damage: 60, block: 10, type: 'attack', colorHex: 0xffffff, desc: "적에게 60의 큰 피해를 주고 보호막을 10 얻습니다." }
];

const relicsList = [
    { id: 'light_jewel', name: '💎 빛의 보석', desc: '전투 시작 시 에너지를 +1 추가 획득합니다.', icon: '💎' },
    { id: 'wind_feather', name: '🪶 바람의 깃털', desc: '전투 시작 시 카드를 2장 추가로 드로우합니다.', icon: '🪶' },
    { id: 'guardian_shield', name: '🛡️ 수호자의 방패', desc: '전투 시작 시 보호막 20을 얻습니다.', icon: '🛡️' },
    { id: 'life_stone', name: '❤️ 생명의 돌', desc: '최대 체력이 20 증가하며, 매 전투 시작 시 체력을 100% 회복합니다.', icon: '❤️' },
    { id: 'fire_heart', name: '🔥 불꽃의 심장', desc: '모든 공격 카드의 피해량이 5 증가합니다.', icon: '🔥' }
];

export let playerRelics = [];


const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isDraggingCard = false;
let selectedCard = null;

// 카메라 이동 및 이펙트 변수
let cameraShake = 0;
const baseCamZ = 600;
const camTarget = new THREE.Vector3(0, 350, baseCamZ);
const keysDown = {};

export function triggerCameraImpact(shakeIntensity = 18, zoomDelta = -120) {
    cameraShake = shakeIntensity;
    camTarget.z = baseCamZ + zoomDelta; // 일시적 줌인

    // 0.25초 후 원래 줌 위치로 복원 (줌아웃)
    setTimeout(() => {
        camTarget.z = baseCamZ;
    }, 250);
    const flash = document.getElementById("flash-overlay");
    if (flash) {
        flash.classList.add("flash");
        setTimeout(() => {
            flash.classList.remove("flash");
        }, 60);
    }
}

// ─── 초기화 ────────────────────────────────────────────
function init() {

    initScene('world');
    initCharacters();
    initDeck();
    initBVH(enemy.mesh);
    initGIProbes();

    // 첫 패 3장 드로우
    for (let i = 0; i < 3; i++) drawCard();

    // UI
    document.getElementById('end-turn-btn').addEventListener('click', endPlayerTurn);
    document.getElementById('deck-btn').addEventListener('click', toggleDeckModal);
    document.getElementById('close-deck-btn').addEventListener('click', toggleDeckModal);

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('dblclick', onDoubleClick); // 더블 클릭 카드 즉시 사용 리스너
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);


    // 초기 UI 동기화
    window.updateDeckUI();
    updateUI();

    animate();
}

function toggleDeckModal() {
    const modal = document.getElementById('deck-modal');
    modal.classList.toggle('hidden');
    if (!modal.classList.contains('hidden')) {
        window.updateDeckUI();
    }
}

window.updateDeckUI = function () {
    const totalCount = drawPile.length + discardPile.length + cardsInHand.length;

    const countEl = document.getElementById("deck-btn-count");
    const drawEl = document.getElementById("draw-count");
    const discardEl = document.getElementById("discard-count");

    if (countEl) countEl.innerText = totalCount;
    if (drawEl) drawEl.innerText = drawPile.length;
    if (discardEl) discardEl.innerText = discardPile.length;

    // Render cards in modal
    const container = document.getElementById("deck-list-container");
    if (container) {
        container.innerHTML = "";
        startingDeck.forEach(card => {
            const cardEl = document.createElement("div");
            cardEl.className = "mini-card";
            cardEl.style.borderColor = "#" + card.colorHex.toString(16).padStart(6, '0');

            cardEl.innerHTML = `
                <div class="mini-card-cost">${card.cost}</div>
                <div class="mini-card-name">${card.name}</div>
                <div class="mini-card-desc">${card.desc}</div>
            `;
            container.appendChild(cardEl);
        });
    }
};


// ─── 애니메이션 루프 ──────────────────────────────────
function animate() {
    requestAnimationFrame(animate);
    const time = performance.now() * 0.001;

    updateCharacters(time);
    updateCards(mouse, isDraggingCard, selectedCard);
    updateProjectiles(checkSphereCollision); // 투사체 비행 및 실시간 BVH 구체 충돌 연동
    updateGIProbes();
    updateParticles(); // 3D 파티클 좌표 및 라이프타임 업데이트
    updateFloatingDust(); // 에테르 부유 먼지 업데이트
    updateDecors(); // 외곽 크리스탈 부유 및 회전 업데이트
    _updateCamera();

    renderer.render(scene, camera);
}


// ─── 카메라 이동 (WASD) ───────────────────────────────
function _updateCamera() {
    const spd = 6;
    if (keysDown['w']) camTarget.y += spd;
    if (keysDown['s']) camTarget.y -= spd;
    if (keysDown['a']) camTarget.x -= spd;
    if (keysDown['d']) camTarget.x += spd;
    camTarget.y = THREE.MathUtils.clamp(camTarget.y, 80, 700);
    camTarget.x = THREE.MathUtils.clamp(camTarget.x, -400, 400);

    // 타겟 지점으로 뷰 행렬 선형 보간 이동
    camera.position.lerp(camTarget, 0.06);

    // 피격/타격 카메라 흔들림 노이즈(Shake) 추가
    if (cameraShake > 0.1) {
        camera.position.x += (Math.random() - 0.5) * cameraShake;
        camera.position.y += (Math.random() - 0.5) * cameraShake;
        camera.position.z += (Math.random() - 0.5) * cameraShake;
        cameraShake *= 0.88; // 매 프레임 감쇄
    }

    camera.lookAt(0, -30, 0);
}


// ─── 턴 종료 ──────────────────────────────────────────
function endPlayerTurn() {
    if (gameState.turn !== 'player' || gameState.playerHP <= 0 || gameState.enemyHP <= 0) return;
    gameState.turn = 'enemy';
    _msg('보스의 턴입니다! 적의 공격이 시작됩니다.');
    document.getElementById('end-turn-btn').disabled = true;

    setTimeout(() => {
        const rawDamage = gameState.stage === 1 ? 15 : (gameState.stage === 2 ? 25 : 35); // 3단계 보스는 데미지 35
        const isBlocked = gameState.playerShield >= rawDamage;

        playEnemyAttack(() => {
            // 실드 흡수 연산
            let finalDamage = rawDamage;
            if (gameState.playerShield > 0) {
                if (gameState.playerShield >= finalDamage) {
                    gameState.playerShield -= finalDamage;
                    finalDamage = 0;
                } else {
                    finalDamage -= gameState.playerShield;
                    gameState.playerShield = 0;
                }
            }

            gameState.playerHP = Math.max(0, gameState.playerHP - finalDamage);

            if (isBlocked) {
                // 완전 방어 이펙트 활성화 (대미지 0) - 약한 카메라 흔들림만 적용하고 방패 홀로그램 소환
                triggerCameraImpact(4, -20);
                if (player && player.mesh) {
                    spawnShieldBlockEffect(player.mesh.position);
                }
            } else {
                // 관통 피격 리액션 및 카메라 쉐이크 & 붉은색 파티클 방출 효과
                triggerCameraImpact(24, -90);
                if (player && player.mesh) {
                    const hitPos = new THREE.Vector3().copy(player.mesh.position);
                    hitPos.y += 40; // 기사의 가슴 위치
                    spawnHitParticles(hitPos, 0xff1111);
                }
            }

            // 내 턴이 돌아오기 전에 실드는 0으로 리셋됨 (방어는 1턴만 지속)
            gameState.playerShield = 0;
            updateUI();

            if (gameState.playerHP <= 0) {
                _msg('패배했습니다…');
                showGameOverModal();
            } else {
                gameState.turn = 'player';
                gameState.mana = gameState.maxMana;
                document.getElementById('end-turn-btn').disabled = false;
                _msg('당신의 턴입니다! 카드를 사용해 적을 공격하세요!');

                // 손패 드로우 로직: 
                // "턴마다 최소 3장의 카드를 가지고 있게 하고, 혹시나 3장 이상의 카드를 가지고 있을 시에는 턴마다 1장 추가"
                const currentCount = cardsInHand.length;
                if (currentCount < 3) {
                    const drawNeeded = 3 - currentCount;
                    for (let i = 0; i < drawNeeded; i++) {
                        drawCard();
                    }
                } else {
                    drawCard(); // 3장 이상이면 1장만 추가
                }

                updateUI();
            }
        }, isBlocked);
    }, 800);
}

// ─── 카드 실행 ───────────────────────────────────────
export function updateUI() {
    document.getElementById("current-mana").innerText = gameState.mana;
    document.getElementById("player-hp-val").innerText = gameState.playerHP;
    document.getElementById("player-max-hp-val").innerText = gameState.maxPlayerHP;
    document.getElementById("enemy-hp-val").innerText = gameState.enemyHP;
    document.getElementById("enemy-max-hp-val").innerText = gameState.maxEnemyHP;

    // 실드 표시 제어
    const shieldDisp = document.getElementById("player-shield-display");
    const shieldVal = document.getElementById("player-shield-val");
    if (gameState.playerShield > 0) {
        shieldDisp.style.display = "inline";
        shieldVal.innerText = gameState.playerShield;
    } else {
        shieldDisp.style.display = "none";
    }

    const pp = (gameState.playerHP / gameState.maxPlayerHP) * 100;
    const ep = (gameState.enemyHP / gameState.maxEnemyHP) * 100;
    document.getElementById("player-hp").style.width = pp + "%";
    document.getElementById("enemy-hp").style.width = ep + "%";

    // 스테이지 및 보스 텍스트 정보 업데이트
    if (gameState.stage === 1) {
        document.getElementById("stage-title").innerText = "STAGE 1 - 빛의 신전 유적 (Temple of Light)";
        document.getElementById("enemy-name").innerText = "BOSS (ANCIENT GOLEM)";
    } else if (gameState.stage === 2) {
        document.getElementById("stage-title").innerText = "STAGE 2 - 혼돈의 대성당 (Chaos Cathedral)";
        document.getElementById("enemy-name").innerText = "BOSS (REINFORCED GOLEM)";
    } else {
        document.getElementById("stage-title").innerText = "STAGE 3 - 종말의 심연 (Abyss of Doom)";
        document.getElementById("enemy-name").innerText = "FINAL BOSS (VOID GOLIATH)";
    }

}

function _msg(txt) { document.getElementById('system-message').innerText = txt; }

// ─── 결과 모달 노출 제어 ──────────────────────────────────
function showStageClearModal() {
    const modal = document.getElementById('game-modal');
    const title = document.getElementById('modal-title');
    const desc = document.getElementById('modal-desc');
    const btnGroup = document.getElementById('modal-buttons');

    title.innerText = "STAGE CLEAR!";
    desc.innerText = `${gameState.stage}단계 보스를 처치하였습니다. 다음 여정을 준비하십시오.`;

    btnGroup.innerHTML = '';

    // 다음 단계 버튼 (1단계, 2단계 클리어 시에만 노출)
    if (gameState.stage < 3) {
        const nextBtn = document.createElement('button');
        nextBtn.className = "modal-btn primary";
        nextBtn.innerText = "다음 단계";
        nextBtn.onclick = () => startStage(gameState.stage + 1);
        btnGroup.appendChild(nextBtn);
    } else {
        desc.innerText = "모든 스테이지를 정복하셨습니다! 당신은 위대한 빛의 수호자입니다! 축하합니다!";
    }


    // 처음부터 버튼
    const restartBtn = document.createElement('button');
    restartBtn.className = "modal-btn secondary";
    restartBtn.innerText = "처음부터";
    restartBtn.onclick = () => startStage(1);
    btnGroup.appendChild(restartBtn);

    modal.classList.remove('hidden');
}

function showGameOverModal() {
    const modal = document.getElementById('game-modal');
    const title = document.getElementById('modal-title');
    const desc = document.getElementById('modal-desc');
    const btnGroup = document.getElementById('modal-buttons');

    title.innerText = "YOU DIED";
    desc.innerText = "플레이어의 생명력이 모두 다했습니다.";

    btnGroup.innerHTML = '';

    // 다시하기 버튼 (현재 단계 재도전)
    const retryBtn = document.createElement('button');
    retryBtn.className = "modal-btn primary";
    retryBtn.innerText = "다시하기";
    retryBtn.onclick = () => startStage(gameState.stage);
    btnGroup.appendChild(retryBtn);

    // 처음으로 버튼 (1단계로 돌아가기)
    const startOverBtn = document.createElement('button');
    startOverBtn.className = "modal-btn secondary";
    startOverBtn.innerText = "처음으로";
    startOverBtn.onclick = () => startStage(1);
    btnGroup.appendChild(startOverBtn);

    modal.classList.remove('hidden');
}

// ─── 스테이지 설정 및 세션 초기화 ────────────────────────────────
function startStage(stageNum) {
    document.getElementById('game-modal').classList.add('hidden');

    gameState.stage = stageNum;
    gameState.playerHP = gameState.maxPlayerHP;
    gameState.mana = gameState.maxMana;
    gameState.turn = 'player';

    // 1단계 시작 시 덱 및 유물 리셋
    if (stageNum === 1) {
        playerRelics.length = 0; // 참조 주소 유지를 위해 length = 0 사용
        gameState.maxPlayerHP = 80;
        gameState.playerHP = 80;
        startingDeck.length = 0;
        startingDeck.push(...defaultStartingDeck);
        updateRelicsUI();
        refreshHandCardTextures();
    }

    if (stageNum === 1) {
        gameState.enemyHP = 120;
        gameState.maxEnemyHP = 120;
    } else if (stageNum === 2) {
        gameState.enemyHP = 200; // 2단계 보스는 HP 200
        gameState.maxEnemyHP = 200;
    } else {
        gameState.enemyHP = 320; // 3단계 보스는 HP 320
        gameState.maxEnemyHP = 320;
    }


    // [유물 발동] 생명의 돌 (체력 100% 회복)
    if (playerRelics.some(r => r.id === 'life_stone')) {
        gameState.playerHP = gameState.maxPlayerHP;
    }

    // [유물 발동] 빛의 보석 (전투 시작 시 에너지 +1)
    if (playerRelics.some(r => r.id === 'light_jewel')) {
        gameState.mana += 1;
    }

    // [유물 발동] 수호자의 방패 (전투 시작 시 보호막 20)
    gameState.playerShield = playerRelics.some(r => r.id === 'guardian_shield') ? 20 : 0;

    // 캐릭터 재생성
    resetCharacters(stageNum);

    // BVH 재바인딩
    initBVH(enemy.mesh);

    // 손패 씬 제거 및 드로우 덱 완전 리셋
    while (cardsInHand.length > 0) {
        const card = cardsInHand[0];
        cardGroup.remove(card.mesh);
        card.mesh.geometry.dispose();
        card.mat.dispose();
        cardsInHand.shift();
    }
    resetDeck();

    // [유물 발동] 바람의 깃털 (전투 시작 시 카드 2장 추가 드로우)
    const startingDrawCount = 3 + (playerRelics.some(r => r.id === 'wind_feather') ? 2 : 0);
    for (let i = 0; i < startingDrawCount; i++) {
        drawCard();
    }

    document.getElementById('end-turn-btn').disabled = false;
    _msg('당신의 턴입니다! 카드를 사용해 적을 공격하세요!');
    updateUI();
    updateRelicsUI();
    refreshHandCardTextures(); // 유물 상태가 적용된 상태에서 카드를 새로 그립니다.
}

function updateRelicsUI() {
    const list = document.getElementById("relics-list");
    if (!list) return;
    list.innerHTML = "";
    playerRelics.forEach(relic => {
        const div = document.createElement("div");
        div.className = "relic-item-ui";
        div.setAttribute("title", `${relic.name}: ${relic.desc}`); // 마우스 호버 시 툴팁 표시
        div.style.cursor = "help"; // 마우스 커서를 물음표(?) 등으로 유도하기 위해 도움말 커서 지정
        div.onclick = () => {
            alert(`${relic.name}\n\n효과: ${relic.desc}`);
        };
        div.innerHTML = `
            <div class="relic-name-ui">${relic.name}</div>
            <div class="relic-desc-ui">${relic.desc}</div>
        `;
        list.appendChild(div);
    });
}



// ─── 카드 실행 ─────────────────────────────────────────
// ─── 카드 실행 ─────────────────────────────────────────
function executeCard(card) {
    if (gameState.mana < card.cost) {
        _msg('에너지가 부족합니다!');
        return false;
    }

    gameState.mana -= card.cost;

    if (card.type === 'attack') {
        playPlayerAttack();

        // 3D 마법 투사체 발사 (L3 실시간 BVH 구체 충돌 연동)
        if (player && player.mesh && enemy && enemy.mesh) {
            const startPos = new THREE.Vector3().copy(player.mesh.position);
            const targetPos = new THREE.Vector3().copy(enemy.mesh.position);

            spawnProjectile(startPos, targetPos, card.colorHex, (hitWorldPos) => {
                // 충돌 콜백: 투사체가 적의 MeshBVH에 충돌한 프레임에 실행됨
                const damageBonus = playerRelics.some(r => r.id === 'fire_heart') ? 5 : 0;
                gameState.enemyHP = Math.max(0, gameState.enemyHP - (card.damage + damageBonus));

                // 적 피격 애니메이션 트리거
                if (enemy) enemy.triggerDamaged();

                // 카메라 충격 및 타격 파티클 폭발
                triggerCameraImpact(18, -120);
                spawnHitParticles(hitWorldPos, card.colorHex);

                updateUI();

                // 보스 사망 여부 판정
                if (gameState.enemyHP <= 0) {
                    _msg('보스를 물리쳤습니다!');
                    setTimeout(() => {
                        if (gameState.stage < 3) {
                            triggerRewardPhase();
                        } else {
                            showStageClearModal();
                        }
                    }, 800);
                }
            });
        }
    } else if (card.type === 'defense') {
        gameState.playerShield += card.block;
        // 방어 카드 전용 이펙트 (플레이어 기사 주변에 솟구치는 파티클 효과)
        if (player && player.mesh) {
            spawnDefenseParticles(player.mesh.position, card.colorHex);
        }
    } else if (card.type === 'utility') {
        if (card.energyGain) {
            gameState.mana += card.energyGain;
        }
        if (card.drawCount) {
            for (let i = 0; i < card.drawCount; i++) {
                drawCard();
            }
        }
    }

    // 스펠 라이트 및 GI 이펙트 방출
    triggerSpellLight(card.colorHex);
    setGISpellEffect(card.colorHex);

    updateUI();

    return true;
}


// ─── 마우스 이벤트 ────────────────────────────────────
function onMouseMove(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
}

function onMouseDown(e) {
    if (gameState.turn !== 'player' || gameState.playerHP <= 0 || gameState.enemyHP <= 0) return;

    // 카드는 camera의 자식이므로 camera 좌표계 기준으로 Raycasting
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(cardGroup.children, true);
    if (hits.length > 0) {
        // 메쉬 또는 부모에서 card 인스턴스 추출
        let obj = hits[0].object;
        while (obj && !obj.userData.card) obj = obj.parent;
        if (obj && obj.userData.card) {
            selectedCard = obj.userData.card;
            isDraggingCard = true;
            selectedCard.onDragStart();
        }
    }
}

function onMouseUp(e) {
    if (!isDraggingCard || !selectedCard) return;
    isDraggingCard = false;

    raycaster.setFromCamera(mouse, camera);
    const hit = checkCollision(raycaster);

    // 카드 사용 분기: 적 메쉬 충돌(기존) 또는 화면의 위쪽 절반 방향으로 드래그 릴리즈했을 때(mouse.y > 0)
    const playRequested = hit || (mouse.y > 0.0);

    if (playRequested) {
        const ok = executeCard(selectedCard);
        if (ok) selectedCard.destroy();
        else selectedCard.onDragEnd();
    } else {
        selectedCard.onDragEnd();
    }
    selectedCard = null;
}

function onDoubleClick(e) {
    if (gameState.turn !== 'player' || gameState.playerHP <= 0 || gameState.enemyHP <= 0) return;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(cardGroup.children, true);
    if (hits.length > 0) {
        let obj = hits[0].object;
        while (obj && !obj.userData.card) obj = obj.parent;
        if (obj && obj.userData.card) {
            const card = obj.userData.card;

            // 더블 클릭 시 즉시 카드 시전
            const ok = executeCard(card);
            if (ok) card.destroy();
        }
    }
}


// ─── 키보드 이벤트 ────────────────────────────────────
function onKeyDown(e) {
    keysDown[e.key.toLowerCase()] = true;

    if (e.key.toLowerCase() === 'h') {
        gameState.debugMode = !gameState.debugMode;
        _msg(gameState.debugMode ? 'DEBUG MODE ON: BVH/Axes 시각화 활성화' : '당신의 턴입니다! 카드를 사용해 적을 공격하세요!');
        scene.traverse(n => {
            if (['MeshBVHHelper', 'Box3Helper', 'AxesHelper', 'ProjectileDebugHelper'].includes(n.name))
                n.visible = gameState.debugMode;
        });
    }
}

function onKeyUp(e) { keysDown[e.key.toLowerCase()] = false; }

// ─── 보상 선택 시스템 ──────────────────────────────────
function triggerRewardPhase() {
    const modal = document.getElementById('reward-modal');
    const title = document.getElementById('reward-title');
    const desc = document.getElementById('reward-desc');
    const listContainer = document.getElementById('reward-list-container');

    modal.classList.remove('hidden');

    // Step 1: Upgraded Card Selection
    title.innerText = "🎁 보상 선택 (1/2) - 카드";
    desc.innerText = "덱에 추가할 강력한 카드를 한 장 선택하세요.";
    listContainer.innerHTML = "";

    const randCards = shuffleArray([...upgradedCards]).slice(0, 3);
    randCards.forEach(card => {
        const option = document.createElement('div');
        option.className = 'reward-card-option';
        option.style.borderColor = "#" + card.colorHex.toString(16).padStart(6, '0');

        let finalDesc = card.desc;
        const hasFireHeart = typeof playerRelics !== 'undefined' && playerRelics.some(r => r.id === 'fire_heart');
        if (hasFireHeart && card.type === 'attack') {
            finalDesc = finalDesc.replace(new RegExp(card.damage), card.damage + 5);
        }

        option.innerHTML = `
            <div class="reward-card-cost">${card.cost}</div>
            <div class="reward-card-name">${card.name}</div>
            <div class="reward-card-desc">${finalDesc}</div>
        `;
        option.onclick = () => {
            startingDeck.push(card);
            window.updateDeckUI();

            // Switch to Relic Selection
            triggerRelicRewardPhase();
        };
        listContainer.appendChild(option);
    });
}

function triggerRelicRewardPhase() {
    const title = document.getElementById('reward-title');
    const desc = document.getElementById('reward-desc');
    const listContainer = document.getElementById('reward-list-container');

    title.innerText = "🎁 보상 선택 (2/2) - 유물";
    desc.innerText = "모험에 도움이 될 유물을 한 가지 선택하세요.";
    listContainer.innerHTML = "";

    const availableRelics = relicsList.filter(r => !playerRelics.some(pr => pr.id === r.id));
    const randRelics = shuffleArray(availableRelics.length > 0 ? availableRelics : relicsList).slice(0, 3);

    randRelics.forEach(relic => {
        const option = document.createElement('div');
        option.className = 'reward-relic-option';
        option.innerHTML = `
            <div class="reward-relic-icon">${relic.icon}</div>
            <div class="reward-relic-name">${relic.name}</div>
            <div class="reward-relic-desc">${relic.desc}</div>
        `;
        option.onclick = () => {
            playerRelics.push(relic);
            if (relic.id === 'life_stone') {
                gameState.maxPlayerHP += 20;
                gameState.playerHP = gameState.maxPlayerHP;
            }
            updateRelicsUI();
            refreshHandCardTextures(); // 유물이 획득되었으므로 손패의 카드 대미지 텍스트를 즉시 리프레시

            // Close reward modal and show standard stage clear modal
            document.getElementById('reward-modal').classList.add('hidden');
            showStageClearModal();
        };
        listContainer.appendChild(option);
    });
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ─── 시작 ─────────────────────────────────────────────
window.addEventListener('load', init);

