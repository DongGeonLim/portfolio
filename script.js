const cube = document.getElementById('interactiveCube');
const scene = document.getElementById('cubeScene');
const container = document.getElementById('mainContainer');
const indicator = document.getElementById('indicator');
const dots = [
    document.querySelector('.page0'), 
    document.querySelector('.page1'), 
    document.querySelector('.page2'),
    document.querySelector('.extra') // HTML에 있는 extra 점을 4번째 페이지용으로 활용
];

let isUnfolded = false;
let isDraggingCube = false;
let isPageScrolling = false;
let startX, startY, scrollStartX, scrollLeft;
let currentX = -25, currentY = -15;

const updateIndicator = () => {
    const pageIndex = Math.round(container.scrollLeft / window.innerWidth);
    dots.forEach((dot, idx) => {
        if(idx === pageIndex) dot.classList.add('active');
        else dot.classList.remove('active');
    });
};

// 새로고침 시 즉시 이동 보정
window.addEventListener('load', () => {
    // scrollTo를 사용하여 애니메이션 없이 즉시 좌표 지정
    container.scrollTo({ left: window.innerWidth, behavior: 'auto' });
    updateIndicator();
    // 이후 부드러운 스크롤을 위해 behavior 활성화 가능
    setTimeout(() => { container.style.scrollBehavior = 'smooth'; }, 100);
});

container.addEventListener('mousedown', (e) => {
    if (!isUnfolded) return; 
    isPageScrolling = true;
    container.style.scrollSnapType = 'none'; 
    container.style.scrollBehavior = 'auto';
    scrollStartX = e.pageX - container.offsetLeft;
    scrollLeft = container.scrollLeft;
});

scene.addEventListener('mousedown', (e) => {
    if (isUnfolded || !e.target.classList.contains('face')) return;
    isDraggingCube = true;
    startX = e.clientX;
    startY = e.clientY;
    cube.classList.add('dragging');
});

window.addEventListener('mousemove', (e) => {
    if (isPageScrolling) {
        const x = e.pageX - container.offsetLeft;
        const walk = (x - scrollStartX) * 1.5;
        container.scrollLeft = scrollLeft - walk;
    }
    if (isDraggingCube) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const absY = Math.abs(currentY) % 360;
        const direction = (absY > 90 && absY < 270) ? -1 : 1;
        cube.style.transform = `rotateX(${currentY - dy * 0.5}deg) rotateY(${currentX + (dx * 0.5 * direction)}deg)`;
    }
});

window.addEventListener('mouseup', (e) => {
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

// scene.addEventListener('click', ... ) 내부 로직 수정
scene.addEventListener('click', () => {
    if (isUnfolded) {
        // [접을 때]
        cube.classList.remove('unfolded');
        indicator.classList.remove('active');
        
        // 핵심: 가로/세로 모든 방향의 스크롤을 완전히 차단
        container.style.overflowX = 'hidden';
        container.style.overflowY = 'hidden'; 
        container.style.touchAction = 'none'; // 모바일 터치 액션 차단
        
        isUnfolded = false;
        setTimeout(() => {
            currentX = -25; currentY = -15;
            cube.style.transform = `rotateX(-15deg) rotateY(-25deg)`;
        }, 50); 
    } else {
        // [펼칠 때]
        currentX = 0; currentY = 0;
        cube.style.transform = `rotateX(0deg) rotateY(0deg)`;
        setTimeout(() => { 
            cube.classList.add('unfolded'); 
            indicator.classList.add('active');
            
            // 핵심: 펼쳐진 후에만 스크롤 기능을 허용
            container.style.overflowX = 'auto';
            container.style.overflowY = 'auto'; 
            container.style.touchAction = 'auto'; // 모바일 터치 액션 복구
            
            isUnfolded = true; 
        }, 100);
    }
});

container.addEventListener('scroll', updateIndicator);

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