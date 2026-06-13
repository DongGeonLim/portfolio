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
    // 초기 위치 강제 고정
    container.scrollTo({ left: window.innerWidth, behavior: 'auto' });
    vContainer.scrollTo({ top: window.innerHeight, behavior: 'auto' });
    
    updateIndicator();
    
    container.style.scrollBehavior = 'auto';
    vContainer.style.scrollBehavior = 'auto';
});

// 모바일 줌 및 더블 탭 확대 잠금
document.documentElement.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
        e.preventDefault(); // 두 손가락 이상 터치 시 무시
    }
}, { passive: false });

let lastTouchEnd = 0;
document.documentElement.addEventListener('touchend', (e) => {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault(); // 0.3초 이내 더블 탭 확대 방어
    }
    lastTouchEnd = now;
}, { passive: false });


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
    container.style.scrollBehavior = 'auto';
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

    // 축 판정 및 락 시스템 대폭 고도화
    if (!dragDirection) {
        const threshold = 6; // 판정 노이즈 방지 임계값
        const hCurrentRaw = container.scrollLeft / window.innerWidth;
        const vCurrentRaw = vContainer.scrollTop / window.innerHeight;
        const hIndex = Math.round(hCurrentRaw);
        const vIndex = Math.round(vCurrentRaw);

        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > threshold) {
            // 완벽한 센터 세로축(vIndex === 1)일 때만 가로 드래그 허용, 탑/바텀에서는 가로 이동 금지
            if (vIndex === 1 && Math.abs(vCurrentRaw - 1) < 0.1) {
                dragDirection = 'horizontal';
            } else {
                // 이벤트 죽이기
                dragDirection = 'locked'; 
            }
        } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > threshold) {
            // 가로 슬라이더가 완전히 센터(hIndex === 1)에 안착해 있을 때만 세로 드래그 허용
            if (hIndex === 1 && Math.abs(hCurrentRaw - 1) < 0.1) {
                dragDirection = 'vertical';
            } else {
                dragDirection = 'locked';
            }
        }
        return;
    }

    // 지정된 락 방향에 따른 물리 스크롤 매핑 분기 제어
    if (dragDirection === 'horizontal') {
        container.scrollLeft = scrollLeft - dx; 
    } else if (dragDirection === 'vertical') {
        vContainer.scrollTop = scrollTopV - dy;
    } else if (dragDirection === 'locked') {
        // 방향 오작동 방어 모드 동작 중일 때는 스크롤 누적을 완전히 차단
        if (e && e.cancelable) e.preventDefault();
    }
};

window.addEventListener('mousemove', (e) => handleDragMove(e.pageX, e.pageY, e));

function finishDrag() {
    if (!dragDirection || dragDirection === 'locked') {
        dragDirection = null;
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
        
        if (sV === 0 && diff > 0) {
            const topIframe = document.querySelector('#top-page iframe');
            if (topIframe) {
                const iframeDoc = topIframe.contentDocument || topIframe.contentWindow.document;
                const scrollTop = iframeDoc.documentElement.scrollTop || iframeDoc.body.scrollTop;
                const scrollHeight = iframeDoc.documentElement.scrollHeight || iframeDoc.body.scrollHeight;
                const clientHeight = iframeDoc.documentElement.clientHeight || iframeDoc.body.clientHeight;

                if (scrollTop + clientHeight >= scrollHeight - 10) {
                    vTarget = 1; 
                }
            }
        } else {
            if (diff > V_THRESHOLD) vTarget = Math.min(sV + 1, 2);
            else if (diff < -V_THRESHOLD) vTarget = Math.max(sV - 1, 0);
        }
    }

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

    if (snapTimeout) clearTimeout(snapTimeout);
    snapTimeout = setTimeout(() => {
        container.style.scrollSnapType = 'x mandatory';
        vContainer.style.scrollSnapType = 'y mandatory';
        snapTimeout = null;
    }, 700);
}

// 모든 입력(마우스/터치) 관리 섹션
const startAction = (clientX, clientY, target) => {
    if (isTransitioning) return;
    if (isUnfolded) {
        handleDragStart(clientX, clientY); 
    } else if (target.classList.contains('face')) {
        isDraggingCube = true;
        startX = clientX; startY = clientY;
        cube.classList.add('dragging');
    }
};

const moveAction = (clientX, clientY, e) => {
    if (isTransitioning) return;
    if (isUnfolded) {
        handleDragMove(clientX, clientY, e); 
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
        finishDrag(); 
    }
};

// 이벤트 연결
container.addEventListener('mousedown', (e) => startAction(e.pageX, e.pageY, e.target));
window.addEventListener('mousemove', (e) => moveAction(e.pageX, e.pageY, e));
window.addEventListener('mouseup', (e) => endAction(e.pageX, e.pageY));

window.addEventListener('mouseleave', (e) => {
    if (isPageScrolling || isVerticalScrolling || isDraggingCube) {
        endAction(e.pageX, e.pageY);
    }
});

container.addEventListener('dragstart', (e) => {
    e.preventDefault();
});

container.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    startAction(t.pageX, t.pageY, e.target);
}, {passive: false});

window.addEventListener('touchmove', (e) => {
    // 모바일 브라우저의 기본 가로/세로 네이티브 제스처 난입 완전 차단 안정화
    if (isUnfolded || isDraggingCube) {
        if (e.cancelable) e.preventDefault();
    }
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

// PC 마우스 휠 감지하여 상단 페이지에서 메인으로 복귀시키기
window.addEventListener('wheel', (e) => {
    const hIndex = Math.round(container.scrollLeft / window.innerWidth);
    const vIndex = Math.round(vContainer.scrollTop / window.innerHeight);

    if (isUnfolded && hIndex === 1 && vIndex === 0 && !isTransitioning) {
        const topIframe = document.querySelector('#top-page iframe');
        if (!topIframe) return;

        const iframeDoc = topIframe.contentDocument || topIframe.contentWindow.document;
        const iframeBody = iframeDoc.body;
        const iframeHtml = iframeDoc.documentElement;

        const scrollTop = iframeHtml.scrollTop || iframeBody.scrollTop;
        const scrollHeight = iframeHtml.scrollHeight || iframeBody.scrollHeight;
        const clientHeight = iframeHtml.clientHeight || iframeBody.clientHeight;

        if (e.deltaY > 100 && (scrollTop + clientHeight >= scrollHeight - 5)) {
            isTransitioning = true;
            
            container.style.scrollBehavior = 'auto';
            vContainer.style.scrollBehavior = 'auto';

            requestAnimationFrame(() => {
                container.scrollLeft = window.innerWidth;
                vContainer.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
                updateIndicator(1, 1);
            });

            if (snapTimeout) clearTimeout(snapTimeout);
            snapTimeout = setTimeout(() => {
                container.style.scrollSnapType = 'x mandatory';
                vContainer.style.scrollSnapType = 'y mandatory';
                snapTimeout = null;
            }, 700);
        }
    }
}, { passive: true });

// iframe 내부 이벤트를 메인 드래그 로직으로 연결
window.handleIframeStart = function(e, iframeWin) {
    const target = e.target;
    if (
        target &&
        (
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'INPUT' ||
            target.closest('.contact-form-box')
        )
    ) {
        return;
    }
    if (isTransitioning || !isUnfolded) return;
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
    const touch = e.changedTouches ? e.changedTouches[0] : (e.touches ? e.touches[0] : e);
    endAction(touch ? touch.pageX : 0, touch ? touch.pageY : 0);
};