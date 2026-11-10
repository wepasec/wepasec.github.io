(() => {
    const canvas = document.getElementById("canvas-secret");
    const ctx = canvas.getContext("2d");
    const PHRASE = "COLLAPSE";
    const DENSITY = 0.01;
    const LETTER_DENSITY = DENSITY * 5;
    const PARTICLE_SIZE = 1.6;
    const SPEED = 20;
    const TEXT_WIDTH = 0.5;
    const FONT_FAMILY = "Arial Black, Arial, Helvetica, sans-serif";
    const SAMPLE_STEP = 1;
    const maskCanvas = document.createElement("canvas");
    const maskCtx = maskCanvas.getContext("2d");
    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles = [];
    let letterLanes = [];

    function buildLetterLanes() {
        maskCanvas.width = width;
        maskCanvas.height = height;
        maskCtx.clearRect(0, 0, width, height);
        let fontSize = height * 0.32;
        maskCtx.font = `900 ${fontSize}px ${FONT_FAMILY}`;
        let metrics = maskCtx.measureText(PHRASE);
        const targetWidth = width * TEXT_WIDTH;
        if (metrics.width > targetWidth) {
            fontSize *= targetWidth / metrics.width;
            maskCtx.font = `900 ${fontSize}px ${FONT_FAMILY}`;
        }
        metrics = maskCtx.measureText(PHRASE);
        const wordWidth = metrics.width;
        const startX = (width - wordWidth) / 2;
        const ascent = metrics.actualBoundingBoxAscent;
        const descent = metrics.actualBoundingBoxDescent;
        const baseline = height / 2 + (ascent - descent) / 2;
        maskCtx.fillStyle = "#000";
        maskCtx.textBaseline = "alphabetic";
        maskCtx.fillText(PHRASE, startX, baseline);
        const pixels = maskCtx.getImageData(0, 0, width, height).data;
        letterLanes = [];
        let cursorX = startX;
        for (const character of PHRASE) {
            const letterMetrics = maskCtx.measureText(character);
            const letterLeft = Math.floor(cursorX);
            const letterRight = Math.ceil(cursorX + letterMetrics.width);
            const top = Math.floor(baseline - ascent);
            const bottom = Math.ceil(baseline + descent);
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