(() => {
    const canvas = document.getElementById("canvas-secret");
    const ctx = canvas.getContext("2d");
    const PHRASE = "COLLAPSE";
    const DENSITY = 0.007;
    const LETTER_DENSITY = DENSITY * 3.5;
    const PARTICLE_SIZE = 1.6;
    const SPEED = 20;
    const DESKTOP_LAYOUT = { lines: [PHRASE], textWidth: 0.5, textHeight: 0.32 };
    const MOBILE_LAYOUT = { lines: ["CO", "LL", "AP", "SE"], textWidth: 0.6, textHeight: 0.6 };
    const MOBILE_QUERY = window.matchMedia("(max-width: 600px)");
    const LINE_SPACING = 1.25;
    const FONT_FAMILY = "Arial Black, Arial, Helvetica, sans-serif";
    const SAMPLE_STEP = 1;
    const maskCanvas = document.createElement("canvas");
    const maskCtx = maskCanvas.getContext("2d");
    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles = [];
    let letterLanes = [];

    function currentLayout() {
        return MOBILE_QUERY.matches ? MOBILE_LAYOUT : DESKTOP_LAYOUT;
    }

    function buildLetterLanes() {
        maskCanvas.width = width;
        maskCanvas.height = height;
        maskCtx.clearRect(0, 0, width, height);
        const layout = currentLayout();
        const lines = layout.lines;
        const setFont = (size) => {
            maskCtx.font = `900 ${size}px ${FONT_FAMILY}`;
        };
        const widestLine = () => Math.max(...lines.map((line) => maskCtx.measureText(line).width));
        let fontSize = height * layout.textHeight / lines.length;
        setFont(fontSize);
        const targetWidth = width * layout.textWidth;
        const lineWidth = widestLine();
        if (lineWidth > targetWidth) {
            fontSize *= targetWidth / lineWidth;
            setFont(fontSize);
        }
        const phraseMetrics = maskCtx.measureText(PHRASE);
        const ascent = phraseMetrics.actualBoundingBoxAscent;
        const descent = phraseMetrics.actualBoundingBoxDescent;
        const lineStep = (ascent + descent) * LINE_SPACING;
        const blockHeight = lineStep * (lines.length - 1) + ascent + descent;
        const firstBaseline = (height - blockHeight) / 2 + ascent;
        maskCtx.fillStyle = "#000";
        maskCtx.textBaseline = "alphabetic";
        letterLanes = [];
        const placedLines = lines.map((line, index) => {
            const startX = (width - maskCtx.measureText(line).width) / 2;
            const baseline = firstBaseline + index * lineStep;
            maskCtx.fillText(line, startX, baseline);
            return { line, startX, baseline };
        });
        const pixels = maskCtx.getImageData(0, 0, width, height).data;
        for (const { line, startX, baseline } of placedLines) {
            collectLanes(line, startX, baseline, ascent, descent, pixels);
        }
    }

    function collectLanes(line, startX, baseline, ascent, descent, pixels) {
        let cursorX = startX;
        for (const character of line) {
            const letterMetrics = maskCtx.measureText(character);
            const letterLeft = Math.max(0, Math.floor(cursorX));
            const letterRight = Math.min(width, Math.ceil(cursorX + letterMetrics.width));
            const top = Math.max(0, Math.floor(baseline - ascent));
            const bottom = Math.min(height, Math.ceil(baseline + descent));
            for (let x = letterLeft; x < letterRight; x += SAMPLE_STEP) {
                let runStart = -1;
                for (let y = top; y < bottom; y += SAMPLE_STEP) {
                    const index = (y * width + x) * 4;
                    const inside = pixels[index + 3] > 128;
                    if (inside && runStart === -1) {
                        runStart = y;
                    }
                    if (!inside && runStart !== -1) {
                        letterLanes.push({
                            x,
                            top: runStart,
                            bottom: y
                        });
                        runStart = -1;
                    }
                }
                if (runStart !== -1) {
                    letterLanes.push({
                        x,
                        top: runStart,
                        bottom
                    });
                }
            }
            cursorX += letterMetrics.width;
        }
    }

    function randomLane() {
        if (!letterLanes.length) {
            return null;
        }
        return letterLanes[Math.floor(Math.random() * letterLanes.length)];
    }

    function createParticles() {
        particles = [];
        const backgroundCount = Math.floor(width * height * DENSITY);
        for (let i = 0; i < backgroundCount; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                lane: null
            });
        }
        const letterArea = letterLanes.reduce((area, lane) => area + (lane.bottom - lane.top), 0);
        const letterCount = Math.floor(letterArea * LETTER_DENSITY);
        for (let i = 0; i < letterCount; i++) {
            const lane = randomLane();
            if (!lane) {
                break;
            }
            particles.push({
                x: lane.x + Math.random(),
                y: lane.top + Math.random() * (lane.bottom - lane.top),
                lane
            });
        }
    }

    function resetParticle(particle) {
        if (!particle.lane) {
            particle.x = Math.random() * width;
            particle.y = -PARTICLE_SIZE;
            return;
        }
        const lane = randomLane();
        particle.lane = lane;
        particle.x = lane.x + Math.random();
        particle.y = lane.bottom;
    }

    function update(dt) {
        const movement = SPEED * dt;
        for (const particle of particles) {
            if (!particle.lane) {
                particle.y += movement;
                if (particle.y > height) {
                    resetParticle(particle);
                }
                continue;
            }
            particle.y -= movement;
            if (particle.y < particle.lane.top) {
                resetParticle(particle);
            }
        }
    }

    function draw() {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height); /* * Downward-moving particles. */
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        for (const particle of particles) {
            if (!particle.lane) {
                ctx.rect(particle.x, particle.y, PARTICLE_SIZE, PARTICLE_SIZE);
            }
        }
        ctx.fill(); /* * Black text mask hides the background particles. */
        ctx.drawImage(maskCanvas, 0, 0); /* * Upward-moving particles. */
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        for (const particle of particles) {
            if (particle.lane) {
                ctx.rect(particle.x, particle.y, PARTICLE_SIZE, PARTICLE_SIZE);
            }
        }
        ctx.fill();
    }

    function resize() {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        buildLetterLanes();
        createParticles();
    }
    let lastTime = performance.now();

    function animate(now) {
        const dt = Math.min((now - lastTime) / 1000, 0.05);
        lastTime = now;
        update(dt);
        draw();
        requestAnimationFrame(animate);
    }
    window.addEventListener("resize", resize);
    resize();
    requestAnimationFrame(animate);
})();