const cube = document.getElementById('interactiveCube');
const scene = document.getElementById('cubeScene');
const container = document.getElementById('mainContainer');
const indicator = document.getElementById('indicator');
const vContainer = document.querySelector('.v-container');

const dots = [
    document.querySelector('.page0'), 
    document.querySelector('.page1'), 
    document.querySelector('.page2'),
    document.querySelector('.extra') // HTML에 있는 extra 점을 4번째 페이지용으로 활용
];

let isUnfolded = false;
let isDraggingCube = false;
let isPageScrolling = false;
let isTransitioning = false;
let isVerticalScrolling = false; // 세로 드래그 상태 관리
let scrollStartY, scrollTopV;   // 세로 시작 좌표 및 위치 저장
let startX, startY, scrollStartX, scrollLeft;
let currentX = -25, currentY = -15;

// 새로고침 시 즉시 이동 보정
window.addEventListener('load', () => {
    container.style.touchAction = 'none';
    // 가로 위치: 메인 페이지(100vw)
    container.scrollTo({ left: window.innerWidth, behavior: 'auto' });
    // 세로 위치: 메인 내부의 중앙 히어로(100vh)
    vContainer.scrollTo({ top: window.innerHeight, behavior: 'auto' });
    
    updateIndicator();
    setTimeout(() => { 
        container.style.scrollBehavior = 'smooth';
        vContainer.style.scrollBehavior = 'smooth';
    }, 100);
});


/* [MODIFIED] 인디케이터 업데이트 및 자동 펼침 로직 */
const updateIndicator = () => {
    const pageIndex = Math.round(container.scrollLeft / window.innerWidth);
    const vScroll = vContainer.scrollTop;
    const vHeight = window.innerHeight;

    // 1. [데드락 방지] 페이지 이동이 감지되면 트랜지션 잠금을 강제 해제합니다.
    isTransitioning = false;

    // 2. [자동 펼침] 메인 페이지(index 1)가 아니면 큐브를 강제로 펼침 상태로 유지합니다.
    if (pageIndex !== 1 && !isUnfolded) {
        isUnfolded = true;
        cube.classList.add('unfolded');
        indicator.classList.add('active');
        
        // 스크롤 및 터치 기능 활성화
        container.style.overflowX = 'auto';
        vContainer.style.overflowY = 'auto';
        container.style.touchAction = 'auto';
        
        // 큐브 각도 초기화
        currentX = 0; currentY = 0;
        cube.style.transform = `rotateX(0deg) rotateY(0deg)`;
    }

    // --- 인디케이터 불빛 로직 (기존 유지) ---
    const allDots = document.querySelectorAll('.dot');
    allDots.forEach(dot => dot.classList.remove('active'));

    if (pageIndex === 1) {
        if (vScroll < vHeight * 0.5) {
            document.querySelector('.dot.top').classList.add('active');
        } else if (vScroll > vHeight * 1.5) {
            document.querySelector('.dot.bottom').classList.add('active');
        } else {
            document.querySelector('.dot.page1').classList.add('active');
        }
    } else {
        const horizontalClasses = ['page0', 'page1', 'page2', 'extra'];
        const targetClass = horizontalClasses[pageIndex];
        const targetDot = document.querySelector(`.dot.${targetClass}`);
        if (targetDot) targetDot.classList.add('active');
    }
};

// 1. 마우스 클릭 시작 (드래그 준비)
container.addEventListener('mousedown', (e) => {
    if (isTransitioning || !isUnfolded) return;
    
    // 현재 가로/세로 위치를 정수로 딱 떨어뜨려 확인
    const hIndex = Math.round(container.scrollLeft / window.innerWidth);
    const vIndex = Math.round(vContainer.scrollTop / window.innerHeight);

    // [핵심] 가로 드래그 허용 조건: 오직 '메인 세로 중앙(vIndex 1)'일 때만
    if (vIndex === 1) {
        isPageScrolling = true;
        container.style.scrollSnapType = 'none'; 
        container.style.scrollBehavior = 'auto';
        scrollStartX = e.pageX - container.offsetLeft;
        scrollLeft = container.scrollLeft;
    }

    // [핵심] 세로 드래그 허용 조건: 오직 '메인 가로 중앙(hIndex 1)'일 때만
    if (hIndex === 1) {
        isVerticalScrolling = true;
        vContainer.style.scrollSnapType = 'none';
        vContainer.style.scrollBehavior = 'auto';
        scrollStartY = e.pageY - vContainer.offsetTop;
        scrollTopV = vContainer.scrollTop;
    }
});

scene.addEventListener('mousedown', (e) => {
    if (isUnfolded || !e.target.classList.contains('face')) return;
    isDraggingCube = true;
    startX = e.clientX;
    startY = e.clientY;
    cube.classList.add('dragging');
});

window.addEventListener('mousemove', (e) => {
    // 세로 드래그 (메인 페이지에서만 작동)
    if (isVerticalScrolling) {
        const y = e.pageY - vContainer.offsetTop;
        const walkY = (y - scrollStartY) * 1.5;
        vContainer.scrollTop = scrollTopV - walkY;
    }

    // 가로 드래그 (어느 페이지에서든 작동)
    if (isPageScrolling) {
        const x = e.pageX - container.offsetLeft;
        const walk = (x - scrollStartX) * 1.5;
        container.scrollLeft = scrollLeft - walk;
    }

    // 큐브 회전 (기존 유지)
    if (isDraggingCube) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const absY = Math.abs(currentY) % 360;
        const direction = (absY > 90 && absY < 270) ? -1 : 1;
        cube.style.transform = `rotateX(${currentY - dy * 0.5}deg) rotateY(${currentX + (dx * 0.5 * direction)}deg)`;
    }
});

window.addEventListener('mouseup', (e) => {
    // 1. 큐브 회전 종료 로직: 이건 좌표 계산이 필요해서 따로 뺍니다.
    if (isDraggingCube) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const absY = Math.abs(currentY) % 360;
        const direction = (absY > 90 && absY < 270) ? -1 : 1;
        currentX += dx * 0.5 * direction;
        currentY -= dy * 0.5;
        isDraggingCube = false;
        cube.classList.remove('dragging');
    }

    // 2. 페이지 드래그 종료 로직: 공통 함수로 호출합니다.
    if (isVerticalScrolling || isPageScrolling) {
        finishDrag(); 
    }
});

scene.addEventListener('click', (e) => {
    if (isTransitioning) return;
    e.stopPropagation();

    if (isUnfolded) {
        isTransitioning = true;
        // [접을 때] 가로/세로 모두 잠금
        cube.classList.remove('unfolded');
        indicator.classList.remove('active');
        container.style.overflowX = 'hidden';
        vContainer.style.overflowY = 'hidden'; // 세로 잠금 추가
        isUnfolded = false;
        setTimeout(() => {
            currentX = -25; currentY = -15;
            cube.style.transform = `rotateX(-15deg) rotateY(-25deg)`;
            isTransitioning = false;
        }, 100); 
    } else {
        isTransitioning = true;
        // [펼칠 때] 가로/세로 모두 해제
        currentX = 0; currentY = 0;
        cube.style.transform = `rotateX(0deg) rotateY(0deg)`;
        setTimeout(() => { 
            cube.classList.add('unfolded'); 
            indicator.classList.add('active');
            container.style.overflowX = 'auto';
            vContainer.style.overflowY = 'auto'; // 세로 해제 추가
            container.style.touchAction = 'auto';
            isUnfolded = true; 
            isTransitioning = false;
        }, 200);
    }
});

container.addEventListener('scroll', updateIndicator);
vContainer.addEventListener('scroll', updateIndicator);

// 모바일 터치 로직 개선 (연속 회전 가능)
scene.addEventListener('touchstart', (e) => {
    if (isTransitioning || isUnfolded || !e.target.classList.contains('face')) return;
    isDraggingCube = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    cube.classList.add('dragging');
}, { passive: true });

window.addEventListener('touchmove', (e) => {
    if (!isDraggingCube) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    const absY = Math.abs(currentY) % 360;
    const direction = (absY > 90 && absY < 270) ? -1 : 1;
    cube.style.transform = `rotateX(${currentY - dy * 0.5}deg) rotateY(${currentX + (dx * 0.5 * direction)}deg)`;
}, { passive: true });

window.addEventListener('touchend', (e) => {
    // 1. 큐브 회전 종료 로직 (기존 로직 유지)
    if (isDraggingCube) {
        const dx = e.changedTouches[0].clientX - startX;
        const dy = e.changedTouches[0].clientY - startY;
        const absY = Math.abs(currentY) % 360;
        const direction = (absY > 90 && absY < 270) ? -1 : 1;
        
        currentX += dx * 0.5 * direction;
        currentY -= dy * 0.5;
        
        isDraggingCube = false;
        cube.classList.remove('dragging');
    }

    // 2. 페이지 드래그 종료 로직 (공통 함수 호출)
    // 모바일에서 손을 뗐을 때 페이지가 중간에 걸리지 않게 확실히 고정합니다.
    if (isVerticalScrolling || isPageScrolling) {
        finishDrag(); // [CALL]
    }
});

/* script.js - 기존 변수 하단에 추가 */

// [MODIFIED] 드래그 시작 통합 함수
const handleDragStart = (clientX, clientY) => {
    if (isTransitioning || !isUnfolded) return;
    
    const hIndex = Math.round(container.scrollLeft / window.innerWidth);
    const vIndex = Math.round(vContainer.scrollTop / window.innerHeight);

    // 가로 드래그: 오직 세로 중앙(1)일 때만 허용
    if (vIndex === 1) {
        isPageScrolling = true;
        scrollStartX = clientX;
        scrollLeft = container.scrollLeft;
        container.style.scrollBehavior = 'auto';
    }

    // 세로 드래그: 오직 가로 중앙(1)일 때만 허용
    if (hIndex === 1) {
        isVerticalScrolling = true;
        scrollStartY = clientY;
        scrollTopV = vContainer.scrollTop;
        vContainer.style.scrollBehavior = 'auto';
    }
};

// [MODIFIED] 드래그 이동 통합 함수
const handleDragMove = (clientX, clientY) => {
    if (isVerticalScrolling) {
        // 배율을 1.2에서 1.5~1.8 정도로 높이면 더 적게 움직여도 화면이 휙휙 따라옵니다.
        const walkY = (clientY - scrollStartY) * 1.6; 
        vContainer.scrollTop = scrollTopV - walkY;
    }
    if (isPageScrolling) {
        const walkX = (clientX - scrollStartX) * 1.6;
        container.scrollLeft = scrollLeft - walkX;
    }
};

// --- 모바일 터치 이벤트 추가 (가장 중요) ---
// { passive: false }를 통해 브라우저의 기본 스크롤을 완전히 죽입니다.
container.addEventListener('touchstart', (e) => {
    const touch = e.touches[0];
    handleDragStart(touch.pageX, touch.pageY);
}, { passive: false });

window.addEventListener('touchmove', (e) => {
    if (!isPageScrolling && !isVerticalScrolling) return;
    e.preventDefault(); // [CORE] 모바일에서 화면이 같이 움직이는 것 방지
    const touch = e.touches[0];
    handleDragMove(touch.pageX, touch.pageY);
}, { passive: false });

window.addEventListener('touchend', () => {
    if (isVerticalScrolling || isPageScrolling) {
        // 기존 mouseup 로직의 스냅 기능을 함수로 만들어 재사용 권장
        finishDrag(); 
    }
});

function finishDrag() {
    isPageScrolling = false;
    isVerticalScrolling = false;
    
    // 즉시 스냅 대신 부드러운 스크롤 옵션을 활성화합니다.
    container.style.scrollBehavior = 'smooth';
    vContainer.style.scrollBehavior = 'smooth';

    // 민감도 조정 로직: 50%가 아니라 20%만 넘겨도 페이지가 넘어가도록 판정 기준을 낮춥니다.
    const threshold = 0.2; // 20% 임계값
    
    const hCurrent = container.scrollLeft / window.innerWidth;
    const vCurrent = vContainer.scrollTop / window.innerHeight;

    // 현재 인덱스 대비 얼마나 움직였는지 계산하여 다음 페이지 판정
    const hIndex = (hCurrent % 1 > threshold) ? Math.ceil(hCurrent) : Math.floor(hCurrent);
    const vIndex = (vCurrent % 1 > threshold) ? Math.ceil(vCurrent) : Math.floor(vCurrent);

    // [핵심] scrollTo 대신 smooth 옵션을 명시하여 애니메이션을 보여줍니다.
    container.scrollTo({ 
        left: hIndex * window.innerWidth, 
        behavior: 'smooth' 
    });
    vContainer.scrollTo({ 
        top: vIndex * window.innerHeight, 
        behavior: 'smooth' 
    });
    
    updateIndicator();

    // 애니메이션이 끝난 후 다시 behavior를 auto로 돌려 드래그 시 끊김을 방지합니다.
    setTimeout(() => {
        container.style.scrollBehavior = 'auto';
        vContainer.style.scrollBehavior = 'auto';
    }, 500); 
}