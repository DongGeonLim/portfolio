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
const updateIndicator = () => {
    const hCurrent = container.scrollLeft;
    const vCurrent = vContainer.scrollTop;
    const pageIndex = Math.round(hCurrent / window.innerWidth);
    
    isTransitioning = false;

    // 메인이 아니면 강제 펼침
    if (pageIndex !== 1 && !isUnfolded) {
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

    if (pageIndex === 1) {
        if (vCurrent < window.innerHeight * 0.5) document.querySelector('.dot.top').classList.add('active');
        else if (vCurrent > window.innerHeight * 1.5) document.querySelector('.dot.bottom').classList.add('active');
        else document.querySelector('.dot.page1').classList.add('active');
    } else {
        const classes = ['page0', 'page1', 'page2', 'extra'];
        const dot = document.querySelector(`.dot.${classes[pageIndex]}`);
        if (dot) dot.classList.add('active');
    }
};

// 3. 통합 드래그 로직 (PC/모바일 공용)
// [FIXED] 드래그 시작 시 스위치를 켜서 이동을 허용합니다.
const handleDragStart = (clientX, clientY) => {
    if (isTransitioning || !isUnfolded) return;
    
    // 1. 드래그 상태 초기화
    dragDirection = null;
    isPageScrolling = true;     // 가로 이동 가능 상태로 설정
    isVerticalScrolling = true;   // 세로 이동 가능 상태로 설정
    
    scrollStartX = clientX;
    scrollStartY = clientY;
    scrollLeft = container.scrollLeft;
    scrollTopV = vContainer.scrollTop;

    // 2. 부드러운 스크롤 잠시 끄기 (드래그 반응성 향상)
    container.style.scrollBehavior = 'auto';
    vContainer.style.scrollBehavior = 'auto';
    container.style.scrollSnapType = 'none';
    vContainer.style.scrollSnapType = 'none';
};

const handleDragMove = (clientX, clientY, e) => {
    if (isTransitioning || !isUnfolded || isDraggingCube) return;

    // 마우스 버튼 체크 (끈끈이 방지)
    if (e && e.type === 'mousemove' && e.buttons !== 1) {
        if (isPageScrolling || isVerticalScrolling) finishDrag();
        return;
    }

    const dx = clientX - scrollStartX;
    const dy = clientY - scrollStartY;

    // 1. 방향 판정 및 경로 차단 게이트
    if (!dragDirection) {
        const threshold = 15;
        
        // 현재 내가 가로/세로 어디에 위치해 있는지 인덱스 확인
        const hIndex = Math.round(container.scrollLeft / window.innerWidth);
        const vIndex = Math.round(vContainer.scrollTop / window.innerHeight);

        // [경로 차단 1] 가로 이동 시도: 세로가 '정확히 중앙(1)'일 때만 허용
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
            if (vIndex === 1) { 
                dragDirection = 'horizontal';
            } else {
                return; // 중앙이 아니면 가로 드래그 무시
            }
        } 
        // [경로 차단 2] 세로 이동 시도: 가로가 '정확히 중앙(1)'일 때만 허용
        else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > threshold) {
            if (hIndex === 1) {
                dragDirection = 'vertical';
            } else {
                return; // 중앙이 아니면 세로 드래그 무시
            }
        }
        return;
    }

    // 2. 결정된 축에 따라서만 이동 실행
    if (dragDirection === 'horizontal' && isPageScrolling) {
        container.scrollLeft = scrollLeft - dx * 1.5;
    } else if (dragDirection === 'vertical' && isVerticalScrolling) {
        vContainer.scrollTop = scrollTopV - dy * 1.5;
    }
};

// --- 이벤트 리스너 연결 부분 수정 ---
window.addEventListener('mousemove', (e) => handleDragMove(e.pageX, e.pageY, e));

/* [ROOT CAUSE FIXED] 애니메이션 끊김 및 순간이동 방지 로직 */

function finishDrag() {
    // 1. 상태 변수 즉시 백업 및 초기화
    const activeDir = dragDirection;
    dragDirection = null;
    isPageScrolling = false;
    isVerticalScrolling = false;

    // 2. 임계치 및 목적지 계산 (기존 감도 유지)
    const hThreshold = 0.2;
    const vThreshold = 0.08; 
    
    const hCurrent = container.scrollLeft / window.innerWidth;
    const vCurrent = vContainer.scrollTop / window.innerHeight;

    const hTarget = (hCurrent % 1 > hThreshold) ? Math.ceil(hCurrent) : Math.floor(hCurrent);
    const vTarget = (vCurrent % 1 > vThreshold) ? Math.ceil(vCurrent) : Math.floor(vCurrent);

    // 3. [CORE] 레이아웃(overflow)을 건드리지 않고 브라우저 애니메이션만 활성화
    // scroll-behavior: smooth를 CSS가 아닌 JS 파라미터로만 제어하여 충돌을 막습니다.
    container.style.scrollBehavior = 'auto'; 
    vContainer.style.scrollBehavior = 'auto';

    // 브라우저가 이전 드래그의 'auto' 상태를 완전히 소화한 뒤 smooth를 시작하게 합니다.
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            // [반듯한 느낌의 비결] 이동 중인 축은 부드럽게(smooth), 반대 축은 미세하게 보정
            if (activeDir === 'horizontal') {
                // 가로는 부드럽게 목표로, 세로는 즉시 중앙(1)으로 정렬하여 대각선 튐 방지
                container.scrollTo({ left: hTarget * window.innerWidth, behavior: 'smooth' });
                vContainer.scrollTo({ top: window.innerHeight, behavior: 'smooth' }); 
            } 
            else if (activeDir === 'vertical') {
                // 세로는 부드럽게 목표로, 가로는 즉시 중앙(1)으로 정렬
                vContainer.scrollTo({ top: vTarget * window.innerHeight, behavior: 'smooth' });
                container.scrollTo({ left: window.innerWidth, behavior: 'smooth' });
            }
            else {
                // 드래그 방향이 확정되지 않았던 경우 (미세 클릭 등)
                container.scrollTo({ left: Math.round(hCurrent) * window.innerWidth, behavior: 'smooth' });
                vContainer.scrollTo({ top: Math.round(vCurrent) * window.innerHeight, behavior: 'smooth' });
            }
            updateIndicator();
        });
    });

    // 4. 애니메이션이 끝난 후 스냅 재활성화 (충분한 시간 부여)
    setTimeout(() => {
        if (!dragDirection) { // 다시 드래그를 시작하지 않았을 때만
            container.style.scrollSnapType = 'x mandatory';
            vContainer.style.scrollSnapType = 'y mandatory';
        }
    }, 800); 
}

// 4. 이벤트 리스너 연결 (PC/모바일 통합)
container.addEventListener('mousedown', (e) => handleDragStart(e.pageX, e.pageY));
window.addEventListener('mousemove', (e) => handleDragMove(e.pageX, e.pageY));
window.addEventListener('mouseup', finishDrag);

container.addEventListener('touchstart', (e) => {
    // 터치 시작 시 좌표 전달 (기존 로직 유지)
    handleDragStart(e.touches[0].pageX, e.touches[0].pageY);
}, {passive: false});

window.addEventListener('touchmove', (e) => {
    // [KEY FIX] 큐브가 펼쳐진 상태라면 즉시 브라우저의 기본 스크롤을 차단합니다.
    // 이래야 모바일 브라우저가 제어권을 뺏어가지 않습니다.
    if (isUnfolded) {
        e.preventDefault(); 
    }
    
    // handleDragMove에 세 번째 인자인 이벤트 객체 'e'를 반드시 넘겨줍니다.
    handleDragMove(e.touches[0].pageX, e.touches[0].pageY, e);
}, {passive: false});

window.addEventListener('touchend', () => {
    finishDrag(); //
});

// 5. 큐브 클릭 및 회전 (기존 로직 유지)
scene.addEventListener('mousedown', (e) => {
    if (isUnfolded || !e.target.classList.contains('face')) return;
    isDraggingCube = true;
    startX = e.clientX; startY = e.clientY;
    cube.classList.add('dragging');
});

window.addEventListener('mousemove', (e) => {
    if (!isDraggingCube) return;
    const dx = e.clientX - startX; const dy = e.clientY - startY;
    const absY = Math.abs(currentY) % 360;
    const direction = (absY > 90 && absY < 270) ? -1 : 1;
    cube.style.transform = `rotateX(${currentY - dy * 0.5}deg) rotateY(${currentX + (dx * 0.5 * direction)}deg)`;
});

window.addEventListener('mouseup', (e) => {
    if (!isDraggingCube) return;
    const dx = e.clientX - startX; const dy = e.clientY - startY;
    const absY = Math.abs(currentY) % 360;
    const direction = (absY > 90 && absY < 270) ? -1 : 1;
    currentX += dx * 0.5 * direction; currentY -= dy * 0.5;
    isDraggingCube = false; cube.classList.remove('dragging');
});

scene.addEventListener('click', (e) => {
    if (isTransitioning) return;
    e.stopPropagation();
    if (isUnfolded) {
        isTransitioning = true;
        cube.classList.remove('unfolded');
        indicator.classList.remove('active');
        container.style.overflowX = 'hidden';
        vContainer.style.overflowY = 'hidden';
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
            container.style.overflowX = 'auto';
            vContainer.style.overflowY = 'auto';
            isUnfolded = true; 
            isTransitioning = false;
        }, 200);
    }
});