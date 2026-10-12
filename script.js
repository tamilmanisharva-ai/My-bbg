window.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById("arenaCanvas");
    const ctx = canvas.getContext("2d");

    // UI Document nodes
    const setupPanel = document.getElementById("setup-panel");
    const gameUi = document.getElementById("game-ui");
    const btnStart = document.getElementById("btn-start");
    const btnMenu = document.getElementById("btn-menu");
    const statusAlert = document.getElementById("status-alert");
    const cooldownTimer = document.getElementById("cooldown-timer");

    // Physics Tuning Config constants
    const GRAVITY = 0.55;
    const HORIZONTAL_FRICTION = 0.84;
    const BASE_SPEED = 0.85;
    const TAGGER_SPEED_MULTIPLIER = 1.18; // Tagger runs ~18% faster
    const JUMP_FORCE = -11.5;

    // Platform Map Presets
    const maps = [
        // Map 1: Split Level Pillars
        [
            { x: 0, y: 470, w: 900, h: 30 }, // Floor floor baseline
            { x: 100, y: 360, w: 200, h: 20 },
            { x: 600, y: 360, w: 200, h: 20 },
            { x: 350, y: 260, w: 200, h: 20 },
            { x: 150, y: 160, w: 150, h: 20 },
            { x: 600, y: 160, w: 150, h: 20 }
        ],
        // Map 2: Dual Sky-High Shelves
        [
            { x: 0, y: 470, w: 900, h: 30 },
            { x: 50, y: 350, w: 320, h: 20 },
            { x: 530, y: 350, w: 320, h: 20 },
            { x: 250, y: 220, w: 400, h: 20 },
            { x: 400, y: 110, w: 100, h: 20 }
        ],
        // Map 3: Central Grid Matrix
        [
            { x: 0, y: 470, w: 900, h: 30 },
            { x: 300, y: 370, w: 300, h: 20 },
            { x: 50, y: 270, w: 200, h: 20 },
            { x: 650, y: 270, w: 200, h: 20 },
            { x: 220, y: 170, w: 460, h: 20 }
        ]
    ];

    // Engine loop runtime execution states
    let activePlatforms = maps[0];
    let isMatchRunning = false;
    let doubleJumpAllowed = false;
    let tagCooldownTimeLeft = 0; // Milliseconds calculation tracking frame
    let lastTime = 0;

    // Control Mapping System Arrays
    const inputState = {};

    // Entity Model Layout Structures
    class Player {
        constructor(x, y, radius, controls, color, isTagger) {
            this.startX = x;
            this.startY = y;
            this.x = x;
            this.y = y;
            this.radius = radius;
            this.vx = 0;
            this.vy = 0;
            this.controls = controls; // { left, right, up } string keys map matrix
            this.color = color;
            this.isTagger = isTagger;
            this.scores = 0;
            this.isGrounded = false;
            this.jumpsUsed = 0;
            this.upKeyWasReleased = true;
        }

        reset(x, y, isTagger) {
            this.x = x;
            this.y = y;
            this.vx = 0;
            this.vy = 0;
            this.isTagger = isTagger;
            this.jumpsUsed = 0;
            this.isGrounded = false;
        }

        update() {
            // Determine active acceleration values based on tag status speed buff rules
            const currentAcc = BASE_SPEED * (this.isTagger ? TAGGER_SPEED_MULTIPLIER : 1.0);

            // Left/Right movement processing loop
            if (inputState[this.controls.left]) this.vx -= currentAcc;
            if (inputState[this.controls.right]) this.vx += currentAcc;

            // Apply friction physics values over time ticks
            this.vx *= HORIZONTAL_FRICTION;

            // Apply global environmental downward gravity acceleration drop calculations
            this.vy += GRAVITY;

            // Handle jumping input state changes
            if (inputState[this.controls.up]) {
                if (this.upKeyWasReleased) {
                    const maxJumpsAllowed = doubleJumpAllowed ? 2 : 1;
                    if (this.isGrounded || this.jumpsUsed < maxJumpsAllowed) {
                        this.vy = JUMP_FORCE;
                        this.jumpsUsed++;
                        this.isGrounded = false;
                    }
                    this.upKeyWasReleased = false; // Require release key before allowing repeat action
                }
            } else {
                this.upKeyWasReleased = true;
            }

            // Commit velocity movements to structural matrix layout locations
            this.x += this.vx;
            this.y += this.vy;

            // Run platform floor geometry boundary check iterations
            this.isGrounded = false;
            activePlatforms.forEach(p => {
                // Verify horizontal overlap margins inside platform widths bounds check
                if (this.x + this.radius > p.x && this.x - this.radius < p.x + p.w) {
                    // Check if player foot vector intercepts top rim surface from above line
                    if (this.vy >= 0 && this.y + this.radius >= p.y && this.y + this.radius - this.vy <= p.y + 12) {
                        this.y = p.y - this.radius;
                        this.vy = 0;
                        this.isGrounded = true;
                        this.jumpsUsed = 0; // Clear dynamic jumps counters back to initial zero metrics
                    }
                }
            });

            // Standard lateral screen wall wrap limits security parameter logic loops
            if (this.x - this.radius < 0) { this.x = this.radius; this.vx = 0; }
            if (this.x + this.radius > canvas.width) { this.x = canvas.width - this.radius; this.vx = 0; }
        }

        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.color;
            ctx.fill();

            // Render a distinct glowing border style if current entity is designated as the active seeker
            if (this.isTagger) {
                ctx.lineWidth = 4;
                ctx.strokeStyle = "#ffffff";
                ctx.stroke();

                // Draw tracking Crown indicator layout label text
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 12px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("TAGGER", this.x, this.y - this.radius - 8);
            }
            ctx.closePath();
        }
    }

    // Initialize player objects
    const p1 = new Player(150, 400, 20, { left: "KeyA", right: "KeyD", up: "KeyW" }, "#00ffcc", true);
    const p2 = new Player(750, 400, 20, { left: "ArrowLeft", right: "ArrowRight", up: "ArrowUp" }, "#ff0055", false);

    // Event Bindings setup UI handling modules
    window.addEventListener("keydown", e => inputState[e.code] = true);
    window.addEventListener("keyup", e => inputState[e.code] = false);

    btnStart.onclick = () => {
        // Collect DOM customization value parameters maps configuration items
        p1.color = document.getElementById("p1-color").value;
        p2.color = document.getElementById("p2-color").value;
        activePlatforms = maps[parseInt(document.getElementById("map-select").value)];
        doubleJumpAllowed = document.getElementById("double-jump-toggle").checked;

        // Reset runtime values
        p1.reset(150, 400, true);
        p2.reset(750, 400, false);
        p1.scores = 0;
        p2.scores = 0;
        tagCooldownTimeLeft = 0;

        document.getElementById("p1-score").textContent = "0";
        document.getElementById("p2-score").textContent = "0";
        statusAlert.textContent = "MATCH ACTIVE - RUN!";
        statusAlert.style.color = "#fbbf24";
        cooldownTimer.textContent = "READY";
        cooldownTimer.style.borderColor = "#10b981";
        cooldownTimer.style.color = "#10b981";
        cooldownTimer.style.background = "rgba(16, 185, 129, 0.1)";

        setupPanel.style.display = "none";
        gameUi.style.display = "block";

        isMatchRunning = true;
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    };

    btnMenu.onclick = () => {
        isMatchRunning = false;
        gameUi.style.display = "none";
        setupPanel.style.display = "block";
    };

    function processTagSwap() {
        // Swap core role variables mapping values arrays parameters
        p1.isTagger = !p1.isTagger;
        p2.isTagger = !p2.isTagger;

        // Increment score counters for the player who managed to hand off the tag status role to their opponent
        if (p2.isTagger) {
            p1.scores++;
            document.getElementById("p1-score").textContent = p1.scores;
            statusAlert.textContent = "PLAYER 1 TAGGED PLAYER 2!";
        } else {
            p2.scores++;
            document.getElementById("p2-score").textContent = p2.scores;
            statusAlert.textContent = "PLAYER 2 TAGGED PLAYER 1!";
        }

        statusAlert.style.color = "#f43f5e";
        tagCooldownTimeLeft = 3000; // Trigger the required 3-second absolute immunity frame timer freeze loop
    }

    function gameLoop(timestamp) {
        if (!isMatchRunning) return;

        const deltaTime = timestamp - lastTime;
        lastTime = timestamp;

        // Process active freeze tracking loops clock countdown logic metrics parameters
        if (tagCooldownTimeLeft > 0) {
            tagCooldownTimeLeft -= deltaTime;
            if (tagCooldownTimeLeft <= 0) {
                tagCooldownTimeLeft = 0;
                statusAlert.textContent = "MATCH RESUMED - FLEE!";
                statusAlert.style.color = "#10b981";
                cooldownTimer.textContent = "READY";
                cooldownTimer.style.borderColor = "#10b981";
                cooldownTimer.style.color = "#10b981";
                cooldownTimer.style.background = "rgba(16, 185, 129, 0.1)";
            } else {
                cooldownTimer.textContent = `IMMUNITY: ${Math.ceil(tagCooldownTimeLeft / 1000)}s`;
                cooldownTimer.style.borderColor = "#ef4444";
                cooldownTimer.style.color = "#ef4444";
