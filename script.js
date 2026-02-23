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


const updateIndicator = () => {
    const pageIndex = Math.round(container.scrollLeft / window.innerWidth);
    const vScroll = vContainer.scrollTop;
    const vHeight = window.innerHeight;

    // 1. 모든 점의 활성화 클래스 제거
    const allDots = document.querySelectorAll('.dot');
    allDots.forEach(dot => dot.classList.remove('active'));

    // 2. 가로 위치에 따른 기본 점 식별
    const horizontalClasses = ['page0', 'page1', 'page2', 'extra'];
    
    if (pageIndex === 1) {
        // [메인 페이지] 내부 세로 위치 체크
        if (vScroll < vHeight * 0.5) {
            document.querySelector('.dot.top').classList.add('active');
        } else if (vScroll > vHeight * 1.5) {
            document.querySelector('.dot.bottom').classList.add('active');
        } else {
            document.querySelector('.dot.page1').classList.add('active');
        }
    } else {
        // [기타 페이지] 가로 위치에 맞는 점 활성화
        const targetClass = horizontalClasses[pageIndex];
        const targetDot = document.querySelector(`.dot.${targetClass}`);
        if (targetDot) targetDot.classList.add('active');
    }
};

// 1. 마우스 클릭 시작
container.addEventListener('mousedown', (e) => {
    if (!isUnfolded) return; 
    
    const pageIndex = Math.round(container.scrollLeft / window.innerWidth);

    // 공통 드래그 준비 (가로)
    isPageScrolling = true;
    container.style.scrollSnapType = 'none'; 
    container.style.scrollBehavior = 'auto';
    scrollStartX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;

    // [수정] 메인 페이지일 때만 세로 드래그도 함께 준비
    if (pageIndex === 1) {
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
    if (isVerticalScrolling) {
        /* [NEW: Vertical Drag] 세로 드래그 종료 및 스냅 보정 */
        isVerticalScrolling = false;
        vContainer.style.scrollSnapType = 'y mandatory';
        vContainer.style.scrollBehavior = 'smooth';
        
        const vPageIndex = Math.round(vContainer.scrollTop / window.innerHeight);
        vContainer.scrollTop = vPageIndex * window.innerHeight;
    }
    if (isPageScrolling) {
        isPageScrolling = false;
        container.style.scrollSnapType = 'x mandatory';
        container.style.scrollBehavior = 'smooth';
        const pageIndex = Math.round(container.scrollLeft / window.innerWidth);
        container.scrollLeft = pageIndex * window.innerWidth;
    }
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
});

scene.addEventListener('click', () => {
    if (isUnfolded) {
        // [접을 때] 가로/세로 모두 잠금
        cube.classList.remove('unfolded');
        indicator.classList.remove('active');
        container.style.overflowX = 'hidden';
        vContainer.style.overflowY = 'hidden'; // 세로 잠금 추가
        isUnfolded = false;
        setTimeout(() => {
            currentX = -25; currentY = -15;
            cube.style.transform = `rotateX(-15deg) rotateY(-25deg)`;
        }, 50); 
    } else {
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
        }, 100);
    }
});

container.addEventListener('scroll', updateIndicator);
vContainer.addEventListener('scroll', updateIndicator);

// 모바일 터치 로직 개선 (연속 회전 가능)
scene.addEventListener('touchstart', (e) => {
    if (isUnfolded || !e.target.classList.contains('face')) return;
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
    if (!isDraggingCube) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    const absY = Math.abs(currentY) % 360;
    const direction = (absY > 90 && absY < 270) ? -1 : 1;
    
    // 최종 각도 누적 저장 (모바일 튀는 현상 방지)
    currentX += dx * 0.5 * direction;
    currentY -= dy * 0.5;
    
    isDraggingCube = false;
    cube.classList.remove('dragging');
});