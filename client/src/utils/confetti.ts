const colors = ["#ff314a", "#2563eb", "#10b981", "#f59e0b", "#a855f7", "#f472b6"];

let styleInjected = false;
const ensureStyle = () => {
    if (styleInjected) return;
    const style = document.createElement("style");
    style.textContent = `
    @keyframes confetti-fall {
        0% { transform: translate3d(var(--x-start, 0), -10vh, 0) rotate(0deg); opacity: 1; }
        100% { transform: translate3d(var(--x-end, 0), 110vh, 0) rotate(720deg); opacity: 0; }
    }
    .confetti-piece {
        position: fixed;
        top: 0;
        width: 10px;
        height: 16px;
        border-radius: 3px;
        opacity: 0.9;
        pointer-events: none;
        will-change: transform;
    }
    `;
    document.head.appendChild(style);
    styleInjected = true;
};

export function fireConfettiBurst(pieces = 70) {
    if (typeof document === "undefined") return;
    ensureStyle();

    for (let i = 0; i < pieces; i++) {
        const el = document.createElement("div");
        el.className = "confetti-piece";
        const color = colors[Math.floor(Math.random() * colors.length)];
        el.style.backgroundColor = color;
        el.style.left = `${Math.random() * 100}%`;
        el.style.transform = `translate3d(0, 0, 0) rotate(${Math.random() * 360}deg)`;
        el.style.animation = `confetti-fall ${900 + Math.random() * 700}ms linear forwards`;
        el.style.setProperty("--x-start", `${(Math.random() - 0.5) * 20}vw`);
        el.style.setProperty("--x-end", `${(Math.random() - 0.5) * 30}vw`);
        document.body.appendChild(el);
        setTimeout(() => {
            el.remove();
        }, 1800);
    }
}

