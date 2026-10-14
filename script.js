
// ============================================
// LOVE HEART ❤️
// Browser version of the original Python art
// ============================================

const canvas = document.getElementById("heartCanvas");
const ctx = canvas.getContext("2d");
const replayButton = document.getElementById("replayButton");

// Original animation settings
const SC = 21;
const OY = 20;
const DURATION = 10000;
const ANIM = 42;
const TICK = 16;
const LIFT = 34;
const GAP = 7;
const SIZES = [9, 10, 11, 12];
const FONT = "Arial, Helvetica, sans-serif";

const BG = "#060208";
const FLASH = [1.0, 0.78, 0.78];

const PHRASES = [
    "I love you",
    "Seni seviyorum",
    "Te amo",
    "Je t'aime",
    "Ich liebe dich",
    "Ti amo",
    "Eu te amo",
    "Я тебя люблю",
    "사랑해",
    "愛してる",
    "我爱你",
    "मैं तुमसे प्यार करता हूँ",
    "Σ' αγαπώ",
    "Ik hou van jou",
    "Jag älskar dig",
    "Kocham cię",
    "ฉันรักเธอ",
    "Anh yêu em",
    "Aku cinta kamu",
    "Я тебе кохаю"
];

const W = 800;
const H = 800;
const CENTER_X = W / 2;
const CENTER_Y = H / 2;

let placements = [];
let startTime = 0;
let animationFrame = null;
let randomSeed = 11;

// ============================================
// SEEDED RANDOM GENERATOR
// ============================================

function random() {
    randomSeed =
        (randomSeed * 1664525 + 1013904223) >>> 0;

    return randomSeed / 4294967296;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));

        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
}

// ============================================
// HEART MATHEMATICS
// ============================================

function heart(a) {
    const x = 16 * Math.pow(Math.sin(a), 3);

    const y =
        13 * Math.cos(a)
        - 5 * Math.cos(2 * a)
        - 2 * Math.cos(3 * a)
        - Math.cos(4 * a);

    return [
        x * SC,
        y * SC + OY
    ];
}

// ============================================
// COLOR HELPERS
// ============================================

function mix(a, b, amount) {
    return a.map(
        (value, i) =>
            value + (b[i] - value) * amount
    );
}

function dim(color, amount) {
    return color.map(value => value * amount);
}

function toHex(color) {
    return "#" + color
        .map(value =>
            Math.round(
                Math.max(0, Math.min(1, value)) * 255
            )
            .toString(16)
            .padStart(2, "0")
        )
        .join("");
}

function clamp(value) {
    return Math.max(0, Math.min(1, value));
}

const BGC = [6 / 255, 2 / 255, 8 / 255];

// ============================================
// CREATE HEART SHAPE
// ============================================

function buildHeart() {
    randomSeed = 11;

    const points = [];

    for (let i = 0; i < 720; i++) {
        points.push(
            heart(2 * Math.PI * i / 720)
        );
    }

    const edges = points.map((point, i) => [
        point,
        points[(i + 1) % points.length]
    ]);

    const ys = points.map(point => point[1]);

    const YMAX = Math.max(...ys);
    const YMIN = Math.min(...ys);
    const CY = (YMAX + YMIN) / 2;

    // Find horizontal intersections with the heart.
    function spans(y) {
        const xs = [];

        for (const [[x1, y1], [x2, y2]] of edges) {
            if (
                (y1 <= y && y < y2) ||
                (y2 <= y && y < y1)
            ) {
                xs.push(
                    x1 + (y - y1) * (x2 - x1) / (y2 - y1)
                );
            }
        }

        xs.sort((a, b) => a - b);

        const result = [];

        for (let i = 0; i + 1 < xs.length; i += 2) {
            result.push([xs[i], xs[i + 1]]);
        }

        return result;
    }

    function intersect(A, B) {
        const result = [];

        for (const a of A) {
            for (const b of B) {
                const lo = Math.max(a[0], b[0]);
                const hi = Math.min(a[1], b[1]);

                if (hi - lo > 14) {
                    result.push([lo, hi]);
                }
            }
        }

        return result;
    }

    // Cycle through phrases in shuffled order.
    let phraseList = [];
    let phraseIndex = 0;

    function nextPhrase() {
        if (phraseIndex >= phraseList.length) {
            phraseList = shuffle(PHRASES.slice());
            phraseIndex = 0;
        }

        return phraseList[phraseIndex++];
    }

    function measure(text, size) {
        ctx.font = `bold ${size}px ${FONT}`;

        return ctx.measureText(text).width;
    }

    const rowHeight = 17;
    const half = rowHeight / 2;
    const placed = [];

    // Fill the heart row by row.
    for (
        let y = YMAX - half;
        y > YMIN + half;
        y -= rowHeight
    ) {
        const rows = intersect(
            spans(y + half),
            spans(y - half)
        );

        for (const [left, right] of rows) {
            const lo = left + 4;
            const hi = right - 4;

            let current = lo + random() * 8;
            const line = [];

            while (true) {
                let fit = null;

                for (let attempt = 0; attempt < 10; attempt++) {
                    const text = nextPhrase();

                    const size =
                        SIZES[
                            Math.floor(random() * SIZES.length)
                        ];

                    const width = measure(text, size);

                    if (current + width <= hi) {
                        fit = { text, size, width };
                        break;
                    }
                }

                if (!fit) break;

                line.push({
                    x: current + fit.width / 2,
                    y,
                    text: fit.text,
                    size: fit.size,
                    width: fit.width
                });

                current += fit.width + GAP;
            }

            if (line.length === 0) continue;

            // Spread text evenly across each row.
            if (line.length > 1) {
                const last = line[line.length - 1];

                const leftover =
                    hi - (last.x + last.width / 2);

                line.forEach((item, i) => {
                    item.x += leftover * i / (line.length - 1);
                });
            } else {
                line[0].x = (lo + hi) / 2;
            }

            line.forEach((item, i) => {
                item.edge =
                    i === 0 || i === line.length - 1;

                item.rad = Math.min(
                    1,
                    Math.hypot(
                        item.x / (16 * SC),
                        (item.y - CY) / (14.5 * SC)
                    )
                );

                const wine = [0.58, 0.0, 0.09];
                const crimson = [0.90, 0.05, 0.14];
                const blood = [0.98, 0.10, 0.16];

                let color = mix(
                    wine,
                    crimson,
                    0.25 + 0.75 * item.rad
                );

                color = mix(
                    color,
                    blood,
                    random() * 0.35 +
                    (item.edge ? 0.3 : 0)
                );

                item.color = color.map(
                    value => Math.min(1, value)
                );

                item.dx = random() * 20 - 10;

                placed.push(item);
            });
        }
    }

    // Reveal the outline before filling the inside.
    const outline = placed.filter(item => item.edge);
    const inside = placed.filter(item => !item.edge);

    outline.sort(
        (a, b) =>
            Math.atan2(a.x, a.y - CY) -
            Math.atan2(b.x, b.y - CY)
    );

    inside.sort((a, b) => b.rad - a.rad);

    placements = outline.concat(inside);
}

// ============================================
// DRAW ONE ANIMATION FRAME
// ============================================

function draw(now) {
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, W, H);

    const elapsed = Math.max(0, now - startTime);

    const revealRate =
        DURATION / Math.max(1, placements.length);

    placements.forEach((item, index) => {
        const localTime = elapsed - index * revealRate;

        if (localTime < 0) return;

        const u = clamp(
            localTime / (ANIM * TICK)
        );

        // Smooth easing, similar to the Python animation.
        const eased = 1 - Math.pow(1 - u, 3);

        const x = CENTER_X + item.x +
            item.dx * (1 - eased);

        const baseY = CENTER_Y - item.y;

        const y = baseY -
            (1 - eased) * LIFT;

        const shadow = mix(
            BGC,
            dim(item.color, 0.30),
            eased
        );

        const halo = mix(
            BGC,
            dim(item.color, 0.20),
            eased * eased
        );

        const flash =
            0.75 * Math.sin(
                Math.PI * clamp((u - 0.55) / 0.45)
            );

        const mainColor = mix(
            mix(
                BGC,
                item.color,
                Math.pow(eased, 1.5)
            ),
            FLASH,
            flash
        );

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Shadow.
        ctx.font = `bold ${item.size}px ${FONT}`;
        ctx.fillStyle = toHex(shadow);

        ctx.fillText(
            item.text,
            x + 2,
            y + 3
        );

        // Soft glow.
        ctx.font = `bold ${item.size + 1}px ${FONT}`;
        ctx.fillStyle = toHex(halo);

        ctx.shadowColor = toHex(
            dim(item.color, 0.65)
        );

        ctx.shadowBlur = u >= 1 ? 4 : 0;

        ctx.fillText(item.text, x, y);

        ctx.shadowBlur = 0;

        // Main phrase.
        ctx.font = `bold ${item.size}px ${FONT}`;
        ctx.fillStyle = toHex(
            u >= 1 ? item.color : mainColor
        );

        ctx.fillText(
            item.text,
            u >= 1 ? CENTER_X + item.x : x,
            u >= 1 ? baseY : y
        );
    });

    // Gentle glowing outline after the heart forms.
    const doneAt =
        placements.length * revealRate +
        ANIM * TICK;

    if (elapsed > doneAt) {
        const pulse = (Math.sin(now / 700) + 1) / 2;

        ctx.save();

        ctx.globalAlpha = 0.06 + pulse * 0.07;
        ctx.strokeStyle = "#ff355f";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#ff174e";
        ctx.shadowBlur = 24;

        ctx.beginPath();

        for (let i = 0; i <= 240; i++) {
            const [hx, hy] =
                heart(i / 240 * Math.PI * 2);

            const px = CENTER_X + hx;
            const py = CENTER_Y - hy;

            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }

        ctx.closePath();
        ctx.stroke();
        ctx.restore();
    }

    animationFrame = requestAnimationFrame(draw);
}

// ============================================
// START OR REPLAY THE ANIMATION
// ============================================

function startAnimation() {
    if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
    }

    buildHeart();

    startTime = performance.now();

    animationFrame = requestAnimationFrame(draw);
}

replayButton.addEventListener("click", startAnimation);

// Support high-resolution displays and mobile screens.
function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();

    if (!rect.width) return;

    const dpr = Math.min(
        window.devicePixelRatio || 1,
        2
    );

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    ctx.setTransform(
        dpr, 0,
        0, dpr,
        0, 0
    );

    ctx.imageSmoothingEnabled = true;
}

window.addEventListener("resize", () => {
    resizeCanvas();
});

// Wait for fonts before measuring the phrases.
async function initialize() {
    if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
    }

    resizeCanvas();
    startAnimation();
}

initialize();
