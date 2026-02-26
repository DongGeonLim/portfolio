const H_THRESHOLD = 0.05; // 임계값 상수
const V_THRESHOLD = 0.03;

const cube = document.getElementById('interactiveCube');
const scene = document.getElementById('cubeScene');
const container = document.getElementById('mainContainer');
const indicator = document.getElementById('indicator');
const vContainer = document.querySelector('.v-container');

// [FIX] 필수 상태 변수들 선언
let isUnfolded = false;
let isDraggingCube = false;
let isPageScrolling = false;
let isVerticalScrolling = false;
let isTransitioning = false;
let dragDirection = null; // [IMPORTANT] 축 고정용 변수

let snapTimeout = null;

let scrollStartX, scrollStartY, scrollLeft, scrollTopV;
let startX, startY;
let currentX = -25, currentY = -15;

// 1. 초기화 로직
window.addEventListener('load', () => {
    container.style.touchAction = 'none';
    // 초기 위치 강제 고정 (애니메이션 없이)
    container.scrollTo({ left: window.innerWidth, behavior: 'auto' });
    vContainer.scrollTo({ top: window.innerHeight, behavior: 'auto' });
    
    updateIndicator();
    
    // 첫 로딩 후 드래그 모션을 위해 behavior는 auto로 유지 (finishDrag에서 제어)
    container.style.scrollBehavior = 'auto';
    vContainer.style.scrollBehavior = 'auto';
});

// 2. 인디케이터 및 자동 펼침
const updateIndicator = (manualH, manualV) => {
    // 수동 입력이 없으면 현재 스크롤 위치를 기반으로 계산
    const hCurrent = manualH !== undefined ? manualH : container.scrollLeft / window.innerWidth;
    const vCurrent = manualV !== undefined ? manualV : vContainer.scrollTop / window.innerHeight;

    // [CORE] 자석 효과와 동일한 '의도 파악' 함수
    const getIntentIndex = (val, threshold) => {
        const base = Math.round(val);
        const diff = val - base;
        // 임계값보다 많이 움직였다면 진행 방향의 인덱스를, 아니면 원래 인덱스 반환
        return (Math.abs(diff) > threshold) ? (diff > 0 ? Math.ceil(val) : Math.floor(val)) : base;
    };

    const hIndex = getIntentIndex(hCurrent, H_THRESHOLD);
    const vIndex = getIntentIndex(vCurrent, V_THRESHOLD);
    
    isTransitioning = false;

    // 메인 페이지가 아닐 때 큐브 펼침 유지
    if (hIndex !== 1 && !isUnfolded) {
        isUnfolded = true;
        cube.classList.add('unfolded');
        indicator.classList.add('active');
        container.style.overflowX = 'auto';
        vContainer.style.overflowY = 'auto';
        currentX = 0; currentY = 0;
        cube.style.transform = `rotateX(0deg) rotateY(0deg)`;
    }

    const allDots = document.querySelectorAll('.dot');
    allDots.forEach(dot => dot.classList.remove('active'));

    // [개선된 판정] hIndex와 vIndex를 기준으로 도트 활성화
    if (hIndex === 1) {
        if (vIndex === 0) document.querySelector('.dot.top').classList.add('active');
        else if (vIndex === 2) document.querySelector('.dot.bottom').classList.add('active');
        else document.querySelector('.dot.page1').classList.add('active');
    } else {
        const classes = ['page0', 'page1', 'page2', 'extra'];
        const dot = document.querySelector(`.dot.${classes[hIndex]}`);
        if (dot) dot.classList.add('active');
    }
};

// 3. 통합 드래그 로직 (PC/모바일 공용)
// [FIXED] 드래그 시작 시 스위치를 켜서 이동을 허용합니다.
const handleDragStart = (clientX, clientY) => {
    if (isTransitioning || !isUnfolded) return;
    
    // [KEY FIX 1] 새로운 드래그 시작 시, 이전의 모든 타이머와 애니메이션을 강제 종료!
    if (snapTimeout) clearTimeout(snapTimeout);
    
    // 브라우저의 자석 기능을 완전히 '물리적'으로 끕니다.
    container.style.scrollSnapType = 'none';
    vContainer.style.scrollSnapType = 'none';
    container.style.scrollBehavior = 'auto'; // smooth 애니메이션 즉시 중단
    vContainer.style.scrollBehavior = 'auto';
    
    dragDirection = null;
    isPageScrolling = true;
    isVerticalScrolling = true;
    
    scrollStartX = clientX;
    scrollStartY = clientY;
    scrollLeft = container.scrollLeft;
    scrollTopV = vContainer.scrollTop;
};

const handleDragMove = (clientX, clientY, e) => {
    // 1. 드래그 권한 확인 (불필요한 버튼 체크 삭제)
    if (isTransitioning || !isUnfolded || isDraggingCube) return;
    if (!isPageScrolling && !isVerticalScrolling) return;

    const dx = clientX - scrollStartX;
    const dy = clientY - scrollStartY;

    // 2. 방향 판정 게이트 (작가님이 만족하신 축 고정 로직 유지)
    if (!dragDirection) {
        const threshold = 5;
        const hIndex = Math.round(container.scrollLeft / window.innerWidth);
        const vIndex = Math.round(vContainer.scrollTop / window.innerHeight);

        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
            if (vIndex === 1) dragDirection = 'horizontal';
        } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > threshold) {
            if (hIndex === 1) dragDirection = 'vertical';
        }
        return;
    }

    // 3. [1:1 추적] 배율 없이 사용자의 손가락을 정확히 따라갑니다.
    if (dragDirection === 'horizontal') {
        container.scrollLeft = scrollLeft - dx; 
    } else if (dragDirection === 'vertical') {
        vContainer.scrollTop = scrollTopV - dy;
    }
};

// --- 이벤트 리스너 연결 부분 수정 ---
window.addEventListener('mousemove', (e) => handleDragMove(e.pageX, e.pageY, e));

/* [ROOT CAUSE FIXED] 애니메이션 끊김 및 순간이동 방지 로직 */

function finishDrag() {
    if (!dragDirection) {
        isPageScrolling = false; isVerticalScrolling = false;
        return;
    }

    const activeDir = dragDirection;
    dragDirection = null;
    isPageScrolling = false;
    isVerticalScrolling = false;

    const sH = Math.round(scrollLeft / window.innerWidth);
    const sV = Math.round(scrollTopV / window.innerHeight);
    const hCurrent = container.scrollLeft / window.innerWidth;
    const vCurrent = vContainer.scrollTop / window.innerHeight;

    let hTarget = sH;
    let vTarget = sV;

    if (activeDir === 'horizontal') {
        const diff = hCurrent - sH;
        if (diff > H_THRESHOLD) hTarget = Math.min(sH + 1, 3);
        else if (diff < -H_THRESHOLD) hTarget = Math.max(sH - 1, 0);
    } else if (activeDir === 'vertical') {
        const diff = vCurrent - sV;
        if (diff > V_THRESHOLD) vTarget = Math.min(sV + 1, 2);
        else if (diff < -V_THRESHOLD) vTarget = Math.max(sV - 1, 0);
    }

    // [KEY FIX 2] scrollTo 실행 전 다시 한번 모든 설정을 auto로 고정
    container.style.scrollBehavior = 'auto';
    vContainer.style.scrollBehavior = 'auto';

    requestAnimationFrame(() => {
        if (activeDir === 'horizontal') {
            vContainer.scrollTop = window.innerHeight;
            // JS의 behavior: 'smooth' 하나만 믿고 갑니다.
            container.scrollTo({ left: hTarget * window.innerWidth, behavior: 'smooth' });
        } else if (activeDir === 'vertical') {
            container.scrollLeft = window.innerWidth;
            vContainer.scrollTo({ top: vTarget * window.innerHeight, behavior: 'smooth' });
        }
        updateIndicator(hTarget, vTarget);
    });

    // [KEY FIX 3] 타이머를 변수에 저장하여 언제든 취소 가능하게 함
    snapTimeout = setTimeout(() => {
        container.style.scrollSnapType = 'x mandatory';
        vContainer.style.scrollSnapType = 'y mandatory';
        snapTimeout = null;
    }, 700); // 애니메이션 시간을 고려해 넉넉히 0.7초 부여
}

// [4 & 5 통합] 모든 입력(마우스/터치) 관리 섹션

const startAction = (clientX, clientY, target) => {
    if (isTransitioning) return;
    if (isUnfolded) {
        handleDragStart(clientX, clientY); //
    } else if (target.classList.contains('face')) {
        isDraggingCube = true;
        startX = clientX; startY = clientY;
        cube.classList.add('dragging');
    }
};

const moveAction = (clientX, clientY, e) => {
    if (isTransitioning) return;
    if (isUnfolded) {
        handleDragMove(clientX, clientY, e); //
    } else if (isDraggingCube) {
        const dx = clientX - startX; const dy = clientY - startY;
        const absY = Math.abs(currentY) % 360;
        const direction = (absY > 90 && absY < 270) ? -1 : 1;
        cube.style.transform = `rotateX(${currentY - dy * 0.5}deg) rotateY(${currentX + (dx * 0.5 * direction)}deg)`;
    }
};

const endAction = (clientX, clientY) => {
    if (isDraggingCube) {
        const dx = clientX - startX; const dy = clientY - startY;
        const absY = Math.abs(currentY) % 360;
        const direction = (absY > 90 && absY < 270) ? -1 : 1;
        currentX += dx * 0.5 * direction; currentY -= dy * 0.5;
        isDraggingCube = false; cube.classList.remove('dragging');
    }
    if (isPageScrolling || isVerticalScrolling) {
        finishDrag(); //
    }
};

// --- 이벤트 연결 (중복 제거) ---
container.addEventListener('mousedown', (e) => startAction(e.pageX, e.pageY, e.target));
window.addEventListener('mousemove', (e) => moveAction(e.pageX, e.pageY, e));
window.addEventListener('mouseup', (e) => endAction(e.pageX, e.pageY));

container.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    startAction(t.pageX, t.pageY, e.target);
}, {passive: false});

window.addEventListener('touchmove', (e) => {
    if (isUnfolded || isDraggingCube) e.preventDefault();
    const t = e.touches[0];
    moveAction(t.pageX, t.pageY, e);
}, {passive: false});

window.addEventListener('touchend', (e) => {
    const t = e.changedTouches[0] || e.touches[0];
    if (t) endAction(t.pageX, t.pageY);
});

// 3. 큐브 클릭(펼치기/접기) - 작가님 기존 로직 유지
scene.addEventListener('click', (e) => {
    if (isTransitioning) return;
    e.stopPropagation();
    if (isUnfolded) {
        isTransitioning = true;
        cube.classList.remove('unfolded');
        indicator.classList.remove('active');
        container.style.overflow = 'hidden';
        vContainer.style.overflow = 'hidden';
        isUnfolded = false;
        setTimeout(() => {
            currentX = -25; currentY = -15;
            cube.style.transform = `rotateX(-15deg) rotateY(-25deg)`;
            isTransitioning = false;
        }, 100); 
    } else {
        isTransitioning = true;
        currentX = 0; currentY = 0;
        cube.style.transform = `rotateX(0deg) rotateY(0deg)`;
        setTimeout(() => { 
            cube.classList.add('unfolded'); 
            indicator.classList.add('active');
            container.style.overflow = 'auto';
            vContainer.style.overflow = 'auto';
            isUnfolded = true; 
            isTransitioning = false;
        }, 200);
    }
});