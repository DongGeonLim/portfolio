const H_THRESHOLD = 0.05; // 임계값 상수
const V_THRESHOLD = 0.03;

const cube = document.getElementById('interactiveCube');
const scene = document.getElementById('cubeScene');
const container = document.getElementById('mainContainer');
const indicator = document.getElementById('indicator');
const vContainer = document.querySelector('.v-container');

// 필수 상태 변수들 선언
let isUnfolded = false;
let isDraggingCube = false;
let isPageScrolling = false;
let isVerticalScrolling = false;
let isTransitioning = false;
let dragDirection = null; // 축 고정용 변수

let snapTimeout = null;

let scrollStartX, scrollStartY, scrollLeft, scrollTopV;
let startX, startY;
let currentX = -25, currentY = -15;

// 초기화 로직
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

// 인디케이터 및 자동 펼침
const updateIndicator = (manualH, manualV) => {
    const hCurrent = manualH !== undefined ? manualH : container.scrollLeft / window.innerWidth;
    const vCurrent = manualV !== undefined ? manualV : vContainer.scrollTop / window.innerHeight;

    const getIntentIndex = (val, threshold) => {
        const base = Math.round(val);
        const diff = val - base;
        return (Math.abs(diff) > threshold) ? (diff > 0 ? Math.ceil(val) : Math.floor(val)) : base;
    };

    const hIndex = getIntentIndex(hCurrent, H_THRESHOLD);
    const vIndex = getIntentIndex(vCurrent, V_THRESHOLD);
    
    isTransitioning = false;

    // 센터(1, 1)가 아닌 외부 이력 페이지로 완전히 들어왔다면
    // 설령 드래그 중에 잠시 접혔거나 상태가 꼬였더라도 무조건 '펼침' 상태로 리셋합니다.
    if (!(hIndex === 1 && vIndex === 1)) {
        isUnfolded = true;
        cube.classList.add('unfolded');
        indicator.classList.add('active');
        container.style.overflow = 'auto';
        vContainer.style.overflow = 'auto';
        currentX = 0; currentY = 0;
        cube.style.transform = `rotateX(0deg) rotateY(0deg)`;
    }

    const allDots = document.querySelectorAll('.dot');
    allDots.forEach(dot => dot.classList.remove('active'));

    if (hIndex === 1) {
        if (vIndex === 0) document.querySelector('.dot.top').classList.add('active');
        else if (vIndex === 2) document.querySelector('.dot.bottom').classList.add('active');
        else document.querySelector('.dot.page1').classList.add('active'); // 센터
    } else {
        const classes = ['page0', 'page1', 'page2', 'extra'];
        const dot = document.querySelector(`.dot.${classes[hIndex]}`);
        if (dot) dot.classList.add('active');
    }
};

// 통합 드래그 로직 (PC/모바일 공용)
const handleDragStart = (clientX, clientY) => {
    if (isTransitioning || !isUnfolded) return;

    if (snapTimeout) clearTimeout(snapTimeout);
    
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
    if (isTransitioning || !isUnfolded || isDraggingCube) return;
    if (!isPageScrolling && !isVerticalScrolling) return;

    const dx = clientX - scrollStartX;
    const dy = clientY - scrollStartY;

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

    if (dragDirection === 'horizontal') {
        container.scrollLeft = scrollLeft - dx; 
    } else if (dragDirection === 'vertical') {
        vContainer.scrollTop = scrollTopV - dy;
    }
};

window.addEventListener('mousemove', (e) => handleDragMove(e.pageX, e.pageY, e));

/* 애니메이션 끊김 및 순간이동 방지 로직 */

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

    // scrollTo 실행 전 다시 한번 모든 설정을 auto로 고정
    container.style.scrollBehavior = 'auto';
    vContainer.style.scrollBehavior = 'auto';

    requestAnimationFrame(() => {
        if (activeDir === 'horizontal') {
            vContainer.scrollTop = window.innerHeight;
            container.scrollTo({ left: hTarget * window.innerWidth, behavior: 'smooth' });
        } else if (activeDir === 'vertical') {
            container.scrollLeft = window.innerWidth;
            vContainer.scrollTo({ top: vTarget * window.innerHeight, behavior: 'smooth' });
        }
        updateIndicator(hTarget, vTarget);
    });

    // 타이머를 변수에 저장하여 언제든 취소 가능하게 함
    snapTimeout = setTimeout(() => {
        container.style.scrollSnapType = 'x mandatory';
        vContainer.style.scrollSnapType = 'y mandatory';
        snapTimeout = null;
    }, 700); // 애니메이션 시간을 고려해 넉넉히 0.7초 부여
}

// 모든 입력(마우스/터치) 관리 섹션

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

// 이벤트 연결
container.addEventListener('mousedown', (e) => startAction(e.pageX, e.pageY, e.target));
window.addEventListener('mousemove', (e) => moveAction(e.pageX, e.pageY, e));
window.addEventListener('mouseup', (e) => endAction(e.pageX, e.pageY));

// 마우스가 브라우저 화면 밖으로 이탈하면 안전하게 드래그 상태를 해제합니다.
window.addEventListener('mouseleave', (e) => {
    if (isPageScrolling || isVerticalScrolling || isDraggingCube) {
        endAction(e.pageX, e.pageY);
    }
});

// 우리 커스텀 드래그 로직을 방해하지 못하도록 원천 차단합니다.
container.addEventListener('dragstart', (e) => {
    e.preventDefault();
});

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

// 큐브 클릭(펼치기/접기)
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

// iframe 내부 이벤트를 메인 드래그 로직으로 연결해주는 래퍼 함수들
window.handleIframeStart = function(e, iframeWin) {
    if (isTransitioning || !isUnfolded) return;
    
    // iframe 내부 좌표를 메인 스크린 좌표 기준으로 보정
    const rect = iframeWin.frameElement.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    const pageX = touch.clientX + rect.left;
    const pageY = touch.clientY + rect.top;
    
    startAction(pageX, pageY, iframeWin.frameElement);
};

window.handleIframeMove = function(e, iframeWin) {
    if (isTransitioning || !isUnfolded || isDraggingCube) return;
    if (!isPageScrolling && !isVerticalScrolling) return;
    
    const rect = iframeWin.frameElement.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    const pageX = touch.clientX + rect.left;
    const pageY = touch.clientY + rect.top;
    
    moveAction(pageX, pageY, e);
};

window.handleIframeEnd = function(e, iframeWin) {
    // endAction은 좌표가 크게 중요하지 않으므로 그대로 전달
    const touch = e.changedTouches ? e.changedTouches[0] : (e.touches ? e.touches[0] : e);
    endAction(touch ? touch.pageX : 0, touch ? touch.pageY : 0);
};