// game.js - Ninja vs Zombies Game Logic

// ==================== Canvas & Context ====================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// ==================== Audio System ====================
let audioCtx = null;
let musicPlaying = false;
let musicVolume = 0.3;
let masterGain = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioCtx.createGain();
        masterGain.gain.value = musicVolume;
        masterGain.connect(audioCtx.destination);
    }
}

// Background music system
const Music = {
    bpm: 140,
    currentBeat: 0,
    nextNoteTime: 0,
    timerID: null,

    // Dark ninja theme in A minor
    bassPattern: [55, 55, 55, 55, 52, 52, 52, 52, 49, 49, 49, 49, 52, 52, 55, 55], // A, G, E, G, A
    melodyPattern: [
        { note: 69, dur: 2 },  // A
        { note: 72, dur: 1 },  // C
        { note: 74, dur: 1 },  // D
        { note: 76, dur: 2 },  // E
        { note: 74, dur: 2 },  // D
        { note: 72, dur: 2 },  // C
        { note: 69, dur: 2 },  // A
        { note: 67, dur: 2 },  // G
        { note: 69, dur: 2 },  // A
    ],
    melodyIndex: 0,
    melodyCounter: 0,

    start() {
        if (musicPlaying) return;
        musicPlaying = true;
        this.currentBeat = 0;
        this.nextNoteTime = audioCtx.currentTime;
        this.melodyIndex = 0;
        this.melodyCounter = 0;
        this.schedule();
    },

    stop() {
        musicPlaying = false;
        if (this.timerID) {
            clearTimeout(this.timerID);
            this.timerID = null;
        }
    },

    midiToFreq(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    },

    schedule() {
        if (!musicPlaying) return;

        const secondsPerBeat = 60.0 / this.bpm;

        while (this.nextNoteTime < audioCtx.currentTime + 0.1) {
            this.playBeat(this.currentBeat, this.nextNoteTime);
            this.nextNoteTime += secondsPerBeat / 2; // 8th notes
            this.currentBeat = (this.currentBeat + 1) % 16;
        }

        this.timerID = setTimeout(() => this.schedule(), 25);
    },

    playBeat(beat, time) {
        // Bass on every beat
        this.playBass(this.bassPattern[beat], time);

        // Kick drum on 1 and 3
        if (beat % 4 === 0) {
            this.playKick(time);
        }

        // Snare on 2 and 4
        if (beat % 4 === 2) {
            this.playSnare(time);
        }

        // Hi-hat on every 8th note
        this.playHiHat(time, beat % 2 === 0 ? 0.08 : 0.04);

        // Melody (plays every few beats based on duration)
        if (beat % 2 === 0) {
            this.melodyCounter++;
            const currentMelody = this.melodyPattern[this.melodyIndex];
            if (this.melodyCounter >= currentMelody.dur) {
                this.melodyCounter = 0;
                this.melodyIndex = (this.melodyIndex + 1) % this.melodyPattern.length;
                this.playMelody(this.melodyPattern[this.melodyIndex].note, time);
            }
        }
    },

    playBass(midiNote, time) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(this.midiToFreq(midiNote - 12), time);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, time);

        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);

        osc.start(time);
        osc.stop(time + 0.2);
    },

    playMelody(midiNote, time) {
        const osc = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        osc.type = 'square';
        osc2.type = 'sawtooth';
        const freq = this.midiToFreq(midiNote);
        osc.frequency.setValueAtTime(freq, time);
        osc2.frequency.setValueAtTime(freq * 1.005, time); // Slight detune

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2000, time);
        filter.frequency.exponentialRampToValueAtTime(500, time + 0.3);

        gain.gain.setValueAtTime(0.12, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.35);

        osc.start(time);
        osc2.start(time);
        osc.stop(time + 0.35);
        osc2.stop(time + 0.35);
    },

    playKick(time) {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.connect(gain);
        gain.connect(masterGain);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(30, time + 0.1);

        gain.gain.setValueAtTime(0.4, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

        osc.start(time);
        osc.stop(time + 0.15);
    },

    playSnare(time) {
        // Noise for snare
        const bufferSize = audioCtx.sampleRate * 0.1;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = audioCtx.createBufferSource();
        const noiseGain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        noise.buffer = buffer;
        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(masterGain);

        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1000, time);

        noiseGain.gain.setValueAtTime(0.2, time);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        noise.start(time);
        noise.stop(time + 0.1);

        // Add body
        const osc = audioCtx.createOscillator();
        const oscGain = audioCtx.createGain();
        osc.connect(oscGain);
        oscGain.connect(masterGain);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, time);
        osc.frequency.exponentialRampToValueAtTime(100, time + 0.05);

        oscGain.gain.setValueAtTime(0.15, time);
        oscGain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

        osc.start(time);
        osc.stop(time + 0.05);
    },

    playHiHat(time, volume) {
        const bufferSize = audioCtx.sampleRate * 0.05;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = audioCtx.createBufferSource();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        noise.buffer = buffer;
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);

        filter.type = 'highpass';
        filter.frequency.setValueAtTime(8000, time);

        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.03);

        noise.start(time);
        noise.stop(time + 0.03);
    },

    setVolume(vol) {
        musicVolume = vol;
        if (masterGain) {
            masterGain.gain.value = vol;
        }
    }
};

// Sound effect functions
const SFX = {
    throw: () => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.1);
    },

    hit: () => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.15);
    },

    zombieDeath: () => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.connect(gain);
        osc2.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.4);

        osc2.type = 'square';
        osc2.frequency.setValueAtTime(180, audioCtx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.4);

        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);

        osc.start(audioCtx.currentTime);
        osc2.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.4);
        osc2.stop(audioCtx.currentTime + 0.4);
    },

    playerHurt: () => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(400, audioCtx.currentTime);
        osc.frequency.setValueAtTime(300, audioCtx.currentTime + 0.1);
        osc.frequency.setValueAtTime(200, audioCtx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.3);
    },

    jump: () => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.1);
    },

    victory: () => {
        if (!audioCtx) return;
        const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.15);

            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.15 + 0.3);

            osc.start(audioCtx.currentTime + i * 0.15);
            osc.stop(audioCtx.currentTime + i * 0.15 + 0.3);
        });
    },

    gameOver: () => {
        if (!audioCtx) return;
        const notes = [400, 350, 300, 200]; // Descending sad tones
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.2);

            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.12, audioCtx.currentTime + i * 0.2);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.2 + 0.35);

            osc.start(audioCtx.currentTime + i * 0.2);
            osc.stop(audioCtx.currentTime + i * 0.2 + 0.35);
        });
    },

    zombieHit: () => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(250, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.1);
    },

    zombieAttack: () => {
        if (!audioCtx) return;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, audioCtx.currentTime);
        osc.frequency.setValueAtTime(180, audioCtx.currentTime + 0.05);
        osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.2);

        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.2);
    },

    pickup: () => {
        if (!audioCtx) return;
        const notes = [600, 800, 1000];
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.08);

            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.15, audioCtx.currentTime + i * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.08 + 0.15);

            osc.start(audioCtx.currentTime + i * 0.08);
            osc.stop(audioCtx.currentTime + i * 0.08 + 0.15);
        });
    },

    berzerk: () => {
        if (!audioCtx) return;
        // Powerful rising arpeggio with distortion feel
        const notes = [200, 300, 400, 500, 600, 800, 1000, 1200];
        notes.forEach((freq, i) => {
            const osc = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            osc2.connect(gain);
            gain.connect(audioCtx.destination);

            osc.type = 'sawtooth';
            osc2.type = 'square';
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.05);
            osc2.frequency.setValueAtTime(freq * 1.01, audioCtx.currentTime + i * 0.05);

            gain.gain.setValueAtTime(0, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.12, audioCtx.currentTime + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + i * 0.05 + 0.2);

            osc.start(audioCtx.currentTime + i * 0.05);
            osc2.start(audioCtx.currentTime + i * 0.05);
            osc.stop(audioCtx.currentTime + i * 0.05 + 0.2);
            osc2.stop(audioCtx.currentTime + i * 0.05 + 0.2);
        });
    },

    secretBlock: () => {
        if (!audioCtx) return;
        // Classic "block hit" sound
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(800, audioCtx.currentTime);
        osc.frequency.setValueAtTime(1000, audioCtx.currentTime + 0.05);
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.15);
    },

    bossLand: () => {
        if (!audioCtx) return;
        // Deep rumbling impact sound
        const osc = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc.connect(filter);
        osc2.connect(filter);
        filter.connect(gain);
        gain.connect(audioCtx.destination);

        osc.type = 'sine';
        osc2.type = 'triangle';
        osc.frequency.setValueAtTime(80, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.5);
        osc2.frequency.setValueAtTime(60, audioCtx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(20, audioCtx.currentTime + 0.5);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, audioCtx.currentTime);

        gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

        osc.start(audioCtx.currentTime);
        osc2.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.5);
        osc2.stop(audioCtx.currentTime + 0.5);

        // Add some noise for impact
        const bufferSize = audioCtx.sampleRate * 0.2;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
        }

        const noise = audioCtx.createBufferSource();
        const noiseGain = audioCtx.createGain();
        const noiseFilter = audioCtx.createBiquadFilter();

        noise.buffer = buffer;
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(audioCtx.destination);

        noiseFilter.type = 'lowpass';
        noiseFilter.frequency.setValueAtTime(500, audioCtx.currentTime);

        noiseGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

        noise.start(audioCtx.currentTime);
        noise.stop(audioCtx.currentTime + 0.2);
    }
};

// ==================== Game State ====================
let gameRunning = false;
let player = null;
let platforms = [];
let zombies = [];
let shurikens = [];
let particles = [];
let healthPacks = [];
let secretBlocks = [];
let currentLevel = 1;
const maxLevel = 10;

// ==================== Input Handling ====================
const keys = {};
let mouseDown = false;

// ==================== Constants ====================
const GRAVITY = 0.6;
const FRICTION = 0.85;

// ==================== Game Classes ====================

// Player class
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 28;
        this.height = 40;
        this.vx = 0;
        this.vy = 0;
        this.speed = 8;
        this.jumpForce = 18;
        this.grounded = false;
        this.facingRight = true;
        this.hp = 5;
        this.maxHp = 5;
        this.invincible = false;
        this.invincibleTimer = 0;
        this.throwCooldown = 0;
        this.berzerk = false;
        this.berzerkTimer = 0;
    }

    update() {
        // Movement
        if (keys['ArrowLeft'] || keys['KeyA']) {
            this.vx = -this.speed;
            this.facingRight = false;
        } else if (keys['ArrowRight'] || keys['KeyD']) {
            this.vx = this.speed;
            this.facingRight = true;
        } else {
            this.vx *= FRICTION;
        }

        // Jump
        if ((keys['Space'] || keys['ArrowUp'] || keys['KeyW']) && this.grounded) {
            this.vy = -this.jumpForce;
            this.grounded = false;
            SFX.jump();
        }

        // Throw shuriken
        if ((keys['KeyF'] || keys['ControlLeft'] || keys['ControlRight'] || mouseDown) && this.throwCooldown <= 0) {
            this.throwShuriken();
            this.throwCooldown = 15;
        }

        // Apply gravity
        this.vy += GRAVITY;

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Platform collision
        this.grounded = false;
        for (let plat of platforms) {
            if (this.collidesWith(plat)) {
                // Landing on top
                if (this.vy > 0 && this.y + this.height - this.vy <= plat.y + 5) {
                    this.y = plat.y - this.height;
                    this.vy = 0;
                    this.grounded = true;
                }
                // Hitting from below
                else if (this.vy < 0 && this.y - this.vy >= plat.y + plat.height - 5) {
                    this.y = plat.y + plat.height;
                    this.vy = 0;
                }
                // Side collision
                else if (this.vx > 0) {
                    this.x = plat.x - this.width;
                } else if (this.vx < 0) {
                    this.x = plat.x + plat.width;
                }
            }
        }

        // Screen bounds
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

        // Fall death - die when falling into a pit
        if (this.y > canvas.height + 50) {
            this.hp = 0;
            gameOver(false);
        }

        // Timers
        if (this.throwCooldown > 0) this.throwCooldown--;
        if (this.invincibleTimer > 0) {
            this.invincibleTimer--;
            if (this.invincibleTimer <= 0) this.invincible = false;
        }
        if (this.berzerkTimer > 0) {
            this.berzerkTimer--;
            if (this.berzerkTimer <= 0) {
                this.berzerk = false;
                this.invincible = false;
            }
        }
    }

    activateBerzerk() {
        this.berzerk = true;
        this.berzerkTimer = 300; // 5 seconds at 60fps
        this.invincible = true;
        this.invincibleTimer = 0; // Berzerk controls invincibility now
        SFX.berzerk();
    }

    throwShuriken() {
        const dir = this.facingRight ? 1 : -1;
        const sx = this.facingRight ? this.x + this.width : this.x;
        shurikens.push(new Shuriken(sx, this.y + 15, dir));
        SFX.throw();
    }

    takeDamage(amount) {
        if (this.invincible) return;
        this.hp -= amount;
        this.invincible = true;
        this.invincibleTimer = 60;
        updateUI();
        SFX.playerHurt();

        // Knockback
        this.vy = -5;

        if (this.hp <= 0) {
            gameOver(false);
        }
    }

    collidesWith(obj) {
        return this.x < obj.x + obj.width &&
               this.x + this.width > obj.x &&
               this.y < obj.y + obj.height &&
               this.y + this.height > obj.y;
    }

    draw() {
        // Flicker when invincible (but not during berzerk)
        if (this.invincible && !this.berzerk && Math.floor(this.invincibleTimer / 4) % 2) return;

        const x = this.x;
        const y = this.y;

        // Berzerk glow effect
        if (this.berzerk) {
            ctx.save();
            ctx.globalAlpha = 0.4 + Math.sin(Date.now() / 50) * 0.2;
            ctx.fillStyle = '#ff4400';
            ctx.beginPath();
            ctx.ellipse(x + this.width / 2, y + this.height / 2, this.width, this.height, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        ctx.save();
        if (!this.facingRight) {
            ctx.translate(x + this.width / 2, 0);
            ctx.scale(-1, 1);
            ctx.translate(-(x + this.width / 2), 0);
        }

        // Katana (pointing in facing direction)
        ctx.fillStyle = '#a0a0b0';
        ctx.fillRect(x + 24, y + 16, 20, 3); // Blade
        ctx.fillStyle = '#c8a050';
        ctx.fillRect(x + 21, y + 14, 5, 7);  // Handle
        ctx.fillStyle = '#806030';
        ctx.fillRect(x + 20, y + 15, 2, 5);  // Pommel

        // Body (black ninja outfit)
        ctx.fillStyle = '#1e1e28';
        ctx.fillRect(x + 6, y + 18, 16, 14);

        // Head
        ctx.fillStyle = '#1e1e28';
        ctx.fillRect(x + 8, y + 6, 12, 12);

        // Headband (red)
        ctx.fillStyle = '#c83232';
        ctx.fillRect(x + 7, y + 4, 14, 4);
        // Headband tail flowing back
        ctx.fillRect(x - 2, y + 5, 10, 3);
        ctx.fillRect(x - 6, y + 7, 8, 2);

        // Eyes
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 10, y + 10, 3, 2);
        ctx.fillRect(x + 15, y + 10, 3, 2);
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 11, y + 10, 1, 2);
        ctx.fillRect(x + 16, y + 10, 1, 2);

        // Arms
        ctx.fillStyle = '#1e1e28';
        ctx.fillRect(x + 2, y + 18, 5, 10);
        ctx.fillRect(x + 21, y + 18, 5, 10);

        // Hands
        ctx.fillStyle = '#e6b496';
        ctx.fillRect(x + 2, y + 26, 4, 4);
        ctx.fillRect(x + 22, y + 26, 4, 4);

        // Legs
        ctx.fillStyle = '#1e1e28';
        ctx.fillRect(x + 7, y + 32, 6, 8);
        ctx.fillRect(x + 15, y + 32, 6, 8);

        ctx.restore();
    }
}

// Zombie class
class Zombie {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 28;
        this.height = 40;
        this.vx = 0;
        this.vy = 0;
        this.speed = 2.5;
        this.hp = 2;
        this.facingRight = true;
        this.attackCooldown = 0;
        this.grounded = false;

        // Patrol
        this.patrolDir = Math.random() > 0.5 ? 1 : -1;
        this.patrolTimer = 60 + Math.random() * 60;
    }

    // Check if there's ground ahead in the given direction
    hasGroundAhead(direction) {
        // Check a point ahead and below the zombie's feet
        const checkX = direction > 0 ? this.x + this.width + 5 : this.x - 5;
        const checkY = this.y + this.height + 10;

        for (let plat of platforms) {
            if (checkX >= plat.x && checkX <= plat.x + plat.width &&
                checkY >= plat.y && checkY <= plat.y + plat.height + 50) {
                return true;
            }
        }
        return false;
    }

    update() {
        const distToPlayer = Math.abs(this.x - player.x);
        const inRange = distToPlayer < 250;

        if (inRange && player.hp > 0) {
            // Chase player
            let desiredDir = player.x < this.x ? -1 : 1;

            // Only move if there's ground ahead (avoid falling into pits)
            if (this.grounded && !this.hasGroundAhead(desiredDir)) {
                // No ground ahead - stop or reverse
                this.vx = 0;
            } else {
                this.vx = desiredDir * this.speed;
                this.facingRight = desiredDir > 0;
            }

            // Attack if close (check both horizontal AND vertical distance)
            const verticalDist = Math.abs(this.y - player.y);
            if (distToPlayer < 35 && verticalDist < 30 && this.attackCooldown <= 0) {
                SFX.zombieAttack();
                player.takeDamage(1);
                this.attackCooldown = 60;
            }
        } else {
            // Patrol
            this.patrolTimer--;
            if (this.patrolTimer <= 0) {
                this.patrolDir *= -1;
                this.patrolTimer = 60 + Math.random() * 60;
            }

            // Check for edge before moving during patrol
            if (this.grounded && !this.hasGroundAhead(this.patrolDir)) {
                // No ground ahead - reverse patrol direction
                this.patrolDir *= -1;
                this.patrolTimer = 60 + Math.random() * 60;
            }

            this.vx = this.patrolDir * (this.speed * 0.5);
            this.facingRight = this.patrolDir > 0;
        }

        // Apply gravity
        this.vy += GRAVITY;

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Platform collision
        this.grounded = false;
        for (let plat of platforms) {
            if (this.collidesWith(plat)) {
                if (this.vy > 0 && this.y + this.height - this.vy <= plat.y + 5) {
                    this.y = plat.y - this.height;
                    this.vy = 0;
                    this.grounded = true;
                }
            }
        }

        // Screen bounds
        if (this.x < 0) { this.x = 0; this.patrolDir = 1; }
        if (this.x + this.width > canvas.width) {
            this.x = canvas.width - this.width;
            this.patrolDir = -1;
        }
        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
            this.vy = 0;
            this.grounded = true;
        }

        // Timers
        if (this.attackCooldown > 0) this.attackCooldown--;
    }

    takeDamage(amount) {
        this.hp -= amount;

        // Spawn particles
        for (let i = 0; i < 5; i++) {
            particles.push(new Particle(
                this.x + this.width / 2,
                this.y + this.height / 2,
                '#4a6b3a'
            ));
        }

        if (this.hp <= 0) {
            SFX.zombieDeath();
            return true; // Dead
        }
        SFX.zombieHit();
        return false;
    }

    collidesWith(obj) {
        return this.x < obj.x + obj.width &&
               this.x + this.width > obj.x &&
               this.y < obj.y + obj.height &&
               this.y + this.height > obj.y;
    }

    draw() {
        const x = this.x;
        const y = this.y;

        ctx.save();
        if (!this.facingRight) {
            ctx.translate(x + this.width / 2, 0);
            ctx.scale(-1, 1);
            ctx.translate(-(x + this.width / 2), 0);
        }

        // Body (torn clothes)
        ctx.fillStyle = '#503828';
        ctx.fillRect(x + 5, y + 16, 18, 16);

        // Head (green zombie skin)
        ctx.fillStyle = '#648c50';
        ctx.fillRect(x + 7, y + 4, 14, 13);

        // Darker patches
        ctx.fillStyle = '#4a6b3a';
        ctx.fillRect(x + 9, y + 6, 10, 9);

        // Eyes (uneven)
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 9, y + 8, 4, 3);
        ctx.fillRect(x + 15, y + 9, 4, 3);
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 10, y + 9, 2, 2);
        ctx.fillRect(x + 16, y + 10, 2, 2);

        // Mouth
        ctx.fillStyle = '#222';
        ctx.fillRect(x + 11, y + 13, 6, 3);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 12, y + 13, 1, 2);
        ctx.fillRect(x + 15, y + 13, 1, 2);

        // Arms (reaching)
        ctx.fillStyle = '#648c50';
        ctx.fillRect(x + 0, y + 16, 6, 12);
        ctx.fillRect(x + 22, y + 18, 6, 10);

        // Legs
        ctx.fillStyle = '#3c2820';
        ctx.fillRect(x + 6, y + 32, 7, 8);
        ctx.fillRect(x + 15, y + 32, 7, 8);

        ctx.restore();
    }
}

// Flying Zombie class
class FlyingZombie {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 28;
        this.height = 40;
        this.vx = 0;
        this.vy = 0;
        this.speed = 2;
        this.hp = 2;
        this.facingRight = true;
        this.attackCooldown = 0;
        this.wingTimer = 0;
        this.floatOffset = Math.random() * Math.PI * 2;
    }

    update() {
        const distX = player.x - this.x;
        const distY = player.y - this.y;
        const dist = Math.sqrt(distX * distX + distY * distY);

        if (dist < 400 && player.hp > 0) {
            // Fly towards player
            this.vx = (distX / dist) * this.speed;
            this.vy = (distY / dist) * this.speed;
            this.facingRight = distX > 0;

            // Attack if close
            if (dist < 40 && this.attackCooldown <= 0) {
                SFX.zombieAttack();
                player.takeDamage(1);
                this.attackCooldown = 60;
            }
        } else {
            // Hover in place with slight movement
            this.vx *= 0.95;
            this.vy = Math.sin(Date.now() / 500 + this.floatOffset) * 0.5;
        }

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Screen bounds
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
        if (this.y < 50) this.y = 50;
        if (this.y + this.height > canvas.height - 100) this.y = canvas.height - 100 - this.height;

        // Wing animation
        this.wingTimer += 0.3;

        // Timers
        if (this.attackCooldown > 0) this.attackCooldown--;
    }

    takeDamage(amount) {
        this.hp -= amount;

        for (let i = 0; i < 5; i++) {
            particles.push(new Particle(
                this.x + this.width / 2,
                this.y + this.height / 2,
                '#6a4a8a'
            ));
        }

        if (this.hp <= 0) {
            SFX.zombieDeath();
            return true;
        }
        SFX.zombieHit();
        return false;
    }

    collidesWith(obj) {
        return this.x < obj.x + obj.width &&
               this.x + this.width > obj.x &&
               this.y < obj.y + obj.height &&
               this.y + this.height > obj.y;
    }

    draw() {
        const x = this.x;
        const y = this.y;
        const wingFlap = Math.sin(this.wingTimer) * 8;

        ctx.save();
        if (!this.facingRight) {
            ctx.translate(x + this.width / 2, 0);
            ctx.scale(-1, 1);
            ctx.translate(-(x + this.width / 2), 0);
        }

        // Wings (purple, bat-like)
        ctx.fillStyle = '#5a3a7a';
        ctx.beginPath();
        ctx.moveTo(x + 14, y + 18);
        ctx.lineTo(x - 15, y + 10 + wingFlap);
        ctx.lineTo(x - 5, y + 25);
        ctx.lineTo(x + 5, y + 20);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(x + 14, y + 18);
        ctx.lineTo(x + 43, y + 10 - wingFlap);
        ctx.lineTo(x + 33, y + 25);
        ctx.lineTo(x + 23, y + 20);
        ctx.closePath();
        ctx.fill();

        // Body (purple tint)
        ctx.fillStyle = '#4a3858';
        ctx.fillRect(x + 5, y + 16, 18, 16);

        // Head (purple zombie skin)
        ctx.fillStyle = '#7a5a8a';
        ctx.fillRect(x + 7, y + 4, 14, 13);

        // Darker patches
        ctx.fillStyle = '#5a3a6a';
        ctx.fillRect(x + 9, y + 6, 10, 9);

        // Glowing red eyes
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(x + 9, y + 8, 4, 3);
        ctx.fillRect(x + 15, y + 9, 4, 3);
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(x + 10, y + 9, 2, 2);
        ctx.fillRect(x + 16, y + 10, 2, 2);

        // Mouth
        ctx.fillStyle = '#222';
        ctx.fillRect(x + 11, y + 13, 6, 3);

        // No legs, just dangling feet stubs
        ctx.fillStyle = '#3a2830';
        ctx.fillRect(x + 8, y + 32, 5, 5);
        ctx.fillRect(x + 16, y + 32, 5, 5);

        ctx.restore();
    }
}

// Giant Zombie Boss class - 3x taller, falls from sky, 10 HP
class GiantZombieBoss {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 84; // 3x wider than normal zombie (28 * 3)
        this.height = 120; // 3x taller than normal zombie (40 * 3)
        this.vx = 0;
        this.vy = 0;
        this.speed = 2;
        this.hp = 10;
        this.maxHp = 10;
        this.facingRight = true;
        this.attackCooldown = 0;
        this.grounded = false;
        this.isBoss = true;
        this.spawning = true; // Falls from sky
        this.spawnY = -150; // Start above screen
        this.walkAnimation = 0;
    }

    update() {
        this.walkAnimation += 0.1;

        // Spawning - fall from sky
        if (this.spawning) {
            this.vy += GRAVITY;
            this.y += this.vy;

            // Check if landed
            for (let plat of platforms) {
                if (this.collidesWith(plat)) {
                    if (this.vy > 0 && this.y + this.height - this.vy <= plat.y + 5) {
                        this.y = plat.y - this.height;
                        this.vy = 0;
                        this.grounded = true;
                        this.spawning = false;
                        // Ground shake effect - spawn particles
                        for (let i = 0; i < 20; i++) {
                            particles.push(new Particle(
                                this.x + Math.random() * this.width,
                                this.y + this.height,
                                '#8B4513'
                            ));
                        }
                        SFX.bossLand();
                    }
                }
            }

            // Also check ground
            if (this.y + this.height > canvas.height - 100) {
                this.y = canvas.height - 100 - this.height;
                this.vy = 0;
                this.grounded = true;
                this.spawning = false;
                for (let i = 0; i < 20; i++) {
                    particles.push(new Particle(
                        this.x + Math.random() * this.width,
                        this.y + this.height,
                        '#8B4513'
                    ));
                }
                SFX.bossLand();
            }
            return;
        }

        // Chase player
        if (player && player.hp > 0) {
            if (player.x < this.x + this.width / 2) {
                this.vx = -this.speed;
                this.facingRight = false;
            } else {
                this.vx = this.speed;
                this.facingRight = true;
            }

            // Attack if close
            if (this.collidesWithPlayer() && this.attackCooldown <= 0) {
                // Check if player is jumping on top
                const playerBottom = player.y + player.height;
                const bossTop = this.y;
                const playerCenterX = player.x + player.width / 2;
                const onTop = playerBottom <= bossTop + 25 &&
                              playerCenterX > this.x &&
                              playerCenterX < this.x + this.width &&
                              player.vy > 0;

                if (onTop) {
                    // Player jumped on boss!
                    this.takeDamage(1);
                    player.vy = -15; // Bounce player up
                } else {
                    // Boss attacks player
                    SFX.zombieAttack();
                    player.takeDamage(2); // Boss does 2 damage!
                    this.attackCooldown = 90;
                }
            }
        }

        // Apply gravity
        this.vy += GRAVITY;

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Platform collision
        this.grounded = false;
        for (let plat of platforms) {
            if (this.collidesWith(plat)) {
                if (this.vy > 0 && this.y + this.height - this.vy <= plat.y + 5) {
                    this.y = plat.y - this.height;
                    this.vy = 0;
                    this.grounded = true;
                }
            }
        }

        // Screen bounds
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
            this.vy = 0;
            this.grounded = true;
        }

        // Timers
        if (this.attackCooldown > 0) this.attackCooldown--;
    }

    collidesWithPlayer() {
        return player.x < this.x + this.width &&
               player.x + player.width > this.x &&
               player.y < this.y + this.height &&
               player.y + player.height > this.y;
    }

    takeDamage(amount) {
        this.hp -= amount;

        // Spawn particles
        for (let i = 0; i < 12; i++) {
            particles.push(new Particle(
                this.x + this.width / 2,
                this.y + this.height / 2,
                '#4a6b3a'
            ));
        }

        if (this.hp <= 0) {
            SFX.victory();
            // Big death explosion
            for (let i = 0; i < 30; i++) {
                particles.push(new Particle(
                    this.x + Math.random() * this.width,
                    this.y + Math.random() * this.height,
                    '#648c50'
                ));
            }
            return true; // Dead
        }
        SFX.zombieHit();
        return false;
    }

    collidesWith(obj) {
        return this.x < obj.x + obj.width &&
               this.x + this.width > obj.x &&
               this.y < obj.y + obj.height &&
               this.y + this.height > obj.y;
    }

    draw() {
        const x = this.x;
        const y = this.y;
        const scale = 3; // 3x scale

        ctx.save();
        if (!this.facingRight) {
            ctx.translate(x + this.width / 2, 0);
            ctx.scale(-1, 1);
            ctx.translate(-(x + this.width / 2), 0);
        }

        // Walking animation
        const legOffset = Math.sin(this.walkAnimation) * 5;

        // Body (torn clothes) - scaled 3x
        ctx.fillStyle = '#503828';
        ctx.fillRect(x + 15, y + 48, 54, 48);

        // Head (green zombie skin) - scaled 3x
        ctx.fillStyle = '#648c50';
        ctx.fillRect(x + 21, y + 12, 42, 39);

        // Darker patches
        ctx.fillStyle = '#4a6b3a';
        ctx.fillRect(x + 27, y + 18, 30, 27);

        // Scars on face
        ctx.fillStyle = '#3a5a2a';
        ctx.fillRect(x + 30, y + 22, 3, 15);
        ctx.fillRect(x + 50, y + 28, 3, 12);

        // Eyes (uneven, angry) - scaled 3x
        ctx.fillStyle = '#ff0000'; // Red angry eyes
        ctx.fillRect(x + 27, y + 24, 12, 9);
        ctx.fillRect(x + 45, y + 27, 12, 9);
        ctx.fillStyle = '#000';
        ctx.fillRect(x + 30, y + 27, 6, 6);
        ctx.fillRect(x + 48, y + 30, 6, 6);

        // Angry eyebrows
        ctx.fillStyle = '#3a5a2a';
        ctx.fillRect(x + 25, y + 20, 15, 4);
        ctx.fillRect(x + 44, y + 22, 15, 4);

        // Mouth with teeth - scaled 3x
        ctx.fillStyle = '#222';
        ctx.fillRect(x + 33, y + 39, 18, 9);
        ctx.fillStyle = '#fff';
        ctx.fillRect(x + 35, y + 39, 4, 6);
        ctx.fillRect(x + 41, y + 39, 4, 6);
        ctx.fillRect(x + 45, y + 39, 4, 6);

        // Arms (reaching) - scaled 3x
        ctx.fillStyle = '#648c50';
        ctx.fillRect(x + 0, y + 48, 18, 36);
        ctx.fillRect(x + 66, y + 54, 18, 30);

        // Claws/hands
        ctx.fillStyle = '#4a6b3a';
        ctx.fillRect(x + 0, y + 80, 6, 12);
        ctx.fillRect(x + 6, y + 82, 6, 10);
        ctx.fillRect(x + 12, y + 80, 6, 12);
        ctx.fillRect(x + 66, y + 80, 6, 12);
        ctx.fillRect(x + 72, y + 82, 6, 10);
        ctx.fillRect(x + 78, y + 80, 6, 12);

        // Legs - scaled 3x with walking animation
        ctx.fillStyle = '#3c2820';
        ctx.fillRect(x + 18, y + 96 + legOffset, 21, 24);
        ctx.fillRect(x + 45, y + 96 - legOffset, 21, 24);

        ctx.restore();

        // Draw health bar above boss
        const barWidth = 150;
        const barHeight = 12;
        const barX = x + (this.width - barWidth) / 2;
        const barY = y - 25;

        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        // Health fill
        const healthPercent = this.hp / this.maxHp;
        ctx.fillStyle = healthPercent > 0.5 ? '#4a4' : healthPercent > 0.25 ? '#aa4' : '#a44';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

        // Border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barWidth, barHeight);

        // Boss name
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GIANT ZOMBIE', x + this.width / 2, barY - 5);
    }
}

// Spider Boss class (Level 5) - Must jump on its back 5 times to kill
class SpiderBoss {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 120;
        this.height = 60;
        this.vx = 0;
        this.vy = 0;
        this.speed = 3;
        this.hp = 10;
        this.maxHp = 10;
        this.facingRight = true;
        this.attackCooldown = 0;
        this.grounded = false;
        this.legAnimation = 0;
        this.stunned = false;
        this.stunnedTimer = 0;
        this.isBoss = true;
        this.spawning = true;
        this.hasLanded = false;
    }

    update() {
        this.legAnimation += 0.15;

        // Spawning - fall from sky
        if (this.spawning) {
            this.vy += GRAVITY;
            this.y += this.vy;

            // Check if landed
            for (let plat of platforms) {
                if (this.collidesWith(plat)) {
                    if (this.vy > 0 && this.y + this.height - this.vy <= plat.y + 5) {
                        this.y = plat.y - this.height;
                        this.vy = 0;
                        this.grounded = true;
                        this.spawning = false;
                        if (!this.hasLanded) {
                            this.hasLanded = true;
                            SFX.bossLand();
                            for (let i = 0; i < 20; i++) {
                                particles.push(new Particle(
                                    this.x + Math.random() * this.width,
                                    this.y + this.height,
                                    '#2a2a2a'
                                ));
                            }
                        }
                    }
                }
            }

            // Ground collision
            if (this.y + this.height > canvas.height - 100) {
                this.y = canvas.height - 100 - this.height;
                this.vy = 0;
                this.grounded = true;
                this.spawning = false;
                if (!this.hasLanded) {
                    this.hasLanded = true;
                    SFX.bossLand();
                    for (let i = 0; i < 20; i++) {
                        particles.push(new Particle(
                            this.x + Math.random() * this.width,
                            this.y + this.height,
                            '#2a2a2a'
                        ));
                    }
                }
            }
            return;
        }

        // If stunned, don't move
        if (this.stunned) {
            this.stunnedTimer--;
            if (this.stunnedTimer <= 0) {
                this.stunned = false;
            }
            this.vy += GRAVITY;
            this.y += this.vy;
            this.handlePlatformCollision();
            return;
        }

        const distToPlayer = Math.abs(this.x + this.width/2 - player.x);

        // Chase player
        if (player.hp > 0) {
            if (player.x < this.x + this.width/2) {
                this.vx = -this.speed;
                this.facingRight = false;
            } else {
                this.vx = this.speed;
                this.facingRight = true;
            }

            // Attack if player touches spider from the side
            if (this.collidesWithPlayer() && this.attackCooldown <= 0) {
                // Check if player is jumping on top
                const playerBottom = player.y + player.height;
                const spiderTop = this.y;
                const playerCenter = player.x + player.width / 2;
                const onTop = playerBottom <= spiderTop + 20 &&
                              playerCenter > this.x + 10 &&
                              playerCenter < this.x + this.width - 10 &&
                              player.vy > 0;

                if (onTop) {
                    // Player jumped on spider!
                    this.takeDamage(1);
                    player.vy = -15; // Bounce player up
                    this.stunned = true;
                    this.stunnedTimer = 60;
                } else {
                    // Spider attacks player
                    SFX.zombieAttack();
                    player.takeDamage(1);
                    this.attackCooldown = 60;
                }
            }
        }

        // Apply gravity
        this.vy += GRAVITY;

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        this.handlePlatformCollision();

        // Screen bounds
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;

        // Timers
        if (this.attackCooldown > 0) this.attackCooldown--;
    }

    handlePlatformCollision() {
        this.grounded = false;
        for (let plat of platforms) {
            if (this.collidesWith(plat)) {
                if (this.vy > 0 && this.y + this.height - this.vy <= plat.y + 5) {
                    this.y = plat.y - this.height;
                    this.vy = 0;
                    this.grounded = true;
                }
            }
        }
    }

    collidesWithPlayer() {
        return player.x < this.x + this.width &&
               player.x + player.width > this.x &&
               player.y < this.y + this.height &&
               player.y + player.height > this.y;
    }

    takeDamage(amount) {
        this.hp -= amount;

        // Spawn particles
        for (let i = 0; i < 10; i++) {
            particles.push(new Particle(
                this.x + this.width / 2,
                this.y + this.height / 2,
                '#2a2a2a'
            ));
        }

        if (this.hp <= 0) {
            SFX.victory();
            return true; // Dead
        }
        SFX.zombieHit();
        return false;
    }

    collidesWith(obj) {
        return this.x < obj.x + obj.width &&
               this.x + this.width > obj.x &&
               this.y < obj.y + obj.height &&
               this.y + this.height > obj.y;
    }

    draw() {
        const x = this.x;
        const y = this.y;
        const legMove = Math.sin(this.legAnimation) * 8;

        ctx.save();

        // Flash when stunned
        if (this.stunned && Math.floor(this.stunnedTimer / 4) % 2) {
            ctx.globalAlpha = 0.5;
        }

        // Draw 8 legs (4 on each side)
        ctx.fillStyle = '#1a1a1a';
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 6;

        // Left legs
        for (let i = 0; i < 4; i++) {
            const legX = x + 15 + i * 20;
            const offset = Math.sin(this.legAnimation + i * 0.5) * 8;
            ctx.beginPath();
            ctx.moveTo(legX, y + 30);
            ctx.lineTo(legX - 25, y + 20 + offset);
            ctx.lineTo(legX - 35, y + 55);
            ctx.stroke();
        }

        // Right legs
        for (let i = 0; i < 4; i++) {
            const legX = x + 25 + i * 20;
            const offset = Math.sin(this.legAnimation + i * 0.5 + Math.PI) * 8;
            ctx.beginPath();
            ctx.moveTo(legX, y + 30);
            ctx.lineTo(legX + 25, y + 20 + offset);
            ctx.lineTo(legX + 35, y + 55);
            ctx.stroke();
        }

        // Body (abdomen - large back part)
        ctx.fillStyle = '#2a2a2a';
        ctx.beginPath();
        ctx.ellipse(x + 85, y + 35, 35, 25, 0, 0, Math.PI * 2);
        ctx.fill();

        // Red hourglass marking
        ctx.fillStyle = '#cc2222';
        ctx.beginPath();
        ctx.moveTo(x + 80, y + 25);
        ctx.lineTo(x + 90, y + 35);
        ctx.lineTo(x + 80, y + 45);
        ctx.lineTo(x + 70, y + 35);
        ctx.closePath();
        ctx.fill();

        // Cephalothorax (head part)
        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.ellipse(x + 35, y + 30, 30, 22, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes (8 eyes - 2 rows)
        ctx.fillStyle = '#ff0000';
        // Top row
        ctx.beginPath();
        ctx.arc(x + 25, y + 22, 5, 0, Math.PI * 2);
        ctx.arc(x + 35, y + 20, 6, 0, Math.PI * 2);
        ctx.arc(x + 45, y + 22, 5, 0, Math.PI * 2);
        ctx.fill();
        // Bottom row
        ctx.beginPath();
        ctx.arc(x + 28, y + 32, 4, 0, Math.PI * 2);
        ctx.arc(x + 35, y + 34, 4, 0, Math.PI * 2);
        ctx.arc(x + 42, y + 32, 4, 0, Math.PI * 2);
        ctx.fill();

        // Fangs
        ctx.fillStyle = '#444';
        ctx.beginPath();
        ctx.moveTo(x + 30, y + 45);
        ctx.lineTo(x + 25, y + 58);
        ctx.lineTo(x + 32, y + 48);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x + 40, y + 45);
        ctx.lineTo(x + 45, y + 58);
        ctx.lineTo(x + 38, y + 48);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // Draw health bar above spider
        const barWidth = 100;
        const barHeight = 8;
        const barX = x + (this.width - barWidth) / 2;
        const barY = y - 20;

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#c44';
        ctx.fillRect(barX, barY, barWidth * (this.hp / this.maxHp), barHeight);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
}

// Octopus Boss class (Level 10) - Climbs under platforms and jumps between them
class OctopusBoss {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 100;
        this.height = 80;
        this.vx = 0;
        this.vy = 0;
        this.speed = 2.5;
        this.hp = 10;
        this.maxHp = 10;
        this.facingRight = true;
        this.attackCooldown = 0;
        this.tentacleAnimation = 0;
        this.state = 'spawning'; // 'spawning', 'walking', 'climbing', 'jumping'
        this.clingingPlatform = null;
        this.jumpCooldown = 0;
        this.targetPlatform = null;
        this.isBoss = true;
        this.hasLanded = false;
    }

    update() {
        this.tentacleAnimation += 0.1;

        // Spawning - fall from sky
        if (this.state === 'spawning') {
            this.vy += GRAVITY;
            this.y += this.vy;

            // Check if landed
            for (let plat of platforms) {
                if (this.collidesWith(plat)) {
                    if (this.vy > 0 && this.y + this.height - this.vy <= plat.y + 5) {
                        this.y = plat.y - this.height;
                        this.vy = 0;
                        this.state = 'walking';
                        if (!this.hasLanded) {
                            this.hasLanded = true;
                            SFX.bossLand();
                            for (let i = 0; i < 20; i++) {
                                particles.push(new Particle(
                                    this.x + Math.random() * this.width,
                                    this.y + this.height,
                                    '#6a2c8a'
                                ));
                            }
                        }
                    }
                }
            }

            // Ground collision
            if (this.y + this.height > canvas.height - 100) {
                this.y = canvas.height - 100 - this.height;
                this.vy = 0;
                this.state = 'walking';
                if (!this.hasLanded) {
                    this.hasLanded = true;
                    SFX.bossLand();
                    for (let i = 0; i < 20; i++) {
                        particles.push(new Particle(
                            this.x + Math.random() * this.width,
                            this.y + this.height,
                            '#6a2c8a'
                        ));
                    }
                }
            }
            return;
        }

        if (this.state === 'climbing') {
            this.updateClimbing();
        } else if (this.state === 'jumping') {
            this.updateJumping();
        } else {
            this.updateWalking();
        }

        // Check player collision for damage
        if (this.collidesWithPlayer() && this.attackCooldown <= 0 && player.hp > 0) {
            SFX.zombieAttack();
            player.takeDamage(1);
            this.attackCooldown = 45;
        }

        // Timers
        if (this.attackCooldown > 0) this.attackCooldown--;
        if (this.jumpCooldown > 0) this.jumpCooldown--;
    }

    updateWalking() {
        // Chase player
        if (player.hp > 0) {
            if (player.x < this.x + this.width/2) {
                this.vx = -this.speed;
                this.facingRight = false;
            } else {
                this.vx = this.speed;
                this.facingRight = true;
            }
        }

        // Apply gravity
        this.vy += GRAVITY;

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Platform collision
        let onPlatform = null;
        for (let plat of platforms) {
            if (this.collidesWith(plat)) {
                if (this.vy > 0 && this.y + this.height - this.vy <= plat.y + 5) {
                    this.y = plat.y - this.height;
                    this.vy = 0;
                    onPlatform = plat;
                }
            }
        }

        // Randomly decide to climb under a platform
        if (onPlatform && this.jumpCooldown <= 0 && Math.random() < 0.01) {
            this.startClimbing(onPlatform);
        }

        // Or jump to another platform if player is on a different level
        if (onPlatform && this.jumpCooldown <= 0 && Math.abs(player.y - this.y) > 100) {
            this.tryJumpToPlatform();
        }

        // Screen bounds
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
            this.vy = 0;
        }
    }

    startClimbing(platform) {
        this.state = 'climbing';
        this.clingingPlatform = platform;
        this.y = platform.y + platform.height;
        this.vy = 0;
    }

    updateClimbing() {
        // Move along the bottom of the platform
        if (player.hp > 0) {
            if (player.x < this.x + this.width/2) {
                this.vx = -this.speed * 0.7;
                this.facingRight = false;
            } else {
                this.vx = this.speed * 0.7;
                this.facingRight = true;
            }
        }

        this.x += this.vx;

        // Keep attached to platform bottom
        if (this.clingingPlatform) {
            this.y = this.clingingPlatform.y + this.clingingPlatform.height;

            // Check if still under platform
            if (this.x + this.width < this.clingingPlatform.x ||
                this.x > this.clingingPlatform.x + this.clingingPlatform.width) {
                // Drop off
                this.state = 'walking';
                this.clingingPlatform = null;
                this.jumpCooldown = 120;
            }

            // Randomly drop and continue walking
            if (Math.random() < 0.005) {
                this.state = 'walking';
                this.clingingPlatform = null;
                this.jumpCooldown = 120;
            }
        }
    }

    tryJumpToPlatform() {
        // Find a platform near the player
        let bestPlatform = null;
        let bestDist = Infinity;

        for (let plat of platforms) {
            const platCenterX = plat.x + plat.width / 2;
            const platCenterY = plat.y;
            const distToPlayer = Math.abs(platCenterX - player.x) + Math.abs(platCenterY - player.y);

            // Don't jump to current platform
            if (Math.abs(plat.y - this.y - this.height) < 10) continue;

            if (distToPlayer < bestDist && distToPlayer < 400) {
                bestDist = distToPlayer;
                bestPlatform = plat;
            }
        }

        if (bestPlatform && Math.random() < 0.3) {
            this.state = 'jumping';
            this.targetPlatform = bestPlatform;

            // Calculate jump velocity
            const targetX = bestPlatform.x + bestPlatform.width / 2 - this.width / 2;
            const targetY = bestPlatform.y - this.height;
            const dx = targetX - this.x;
            const dy = targetY - this.y;

            // Physics-based jump
            const jumpTime = 40;
            this.vx = dx / jumpTime;
            this.vy = -15 + (dy < 0 ? dy / 30 : 0);
            this.jumpCooldown = 180;
        }
    }

    updateJumping() {
        // Apply gravity
        this.vy += GRAVITY * 0.8;

        // Update position
        this.x += this.vx;
        this.y += this.vy;

        // Check platform landing
        for (let plat of platforms) {
            if (this.collidesWith(plat)) {
                if (this.vy > 0 && this.y + this.height - this.vy <= plat.y + 10) {
                    this.y = plat.y - this.height;
                    this.vy = 0;
                    this.vx = 0;
                    this.state = 'walking';
                    this.targetPlatform = null;
                }
            }
        }

        // Ground collision
        if (this.y + this.height > canvas.height) {
            this.y = canvas.height - this.height;
            this.vy = 0;
            this.vx = 0;
            this.state = 'walking';
            this.targetPlatform = null;
        }

        // Screen bounds
        if (this.x < 0) this.x = 0;
        if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
    }

    collidesWithPlayer() {
        return player.x < this.x + this.width &&
               player.x + player.width > this.x &&
               player.y < this.y + this.height &&
               player.y + player.height > this.y;
    }

    takeDamage(amount) {
        this.hp -= amount;

        // Spawn particles (ink splatter)
        for (let i = 0; i < 8; i++) {
            particles.push(new Particle(
                this.x + this.width / 2,
                this.y + this.height / 2,
                '#1a0a2e'
            ));
        }

        if (this.hp <= 0) {
            SFX.victory();
            return true;
        }
        SFX.zombieHit();
        return false;
    }

    collidesWith(obj) {
        return this.x < obj.x + obj.width &&
               this.x + this.width > obj.x &&
               this.y < obj.y + obj.height &&
               this.y + this.height > obj.y;
    }

    draw() {
        const x = this.x;
        const y = this.y;
        const isClimbing = this.state === 'climbing';

        ctx.save();

        if (isClimbing) {
            // Flip vertically when climbing under platform
            ctx.translate(0, y + this.height / 2);
            ctx.scale(1, -1);
            ctx.translate(0, -(y + this.height / 2));
        }

        // Draw tentacles (8 tentacles)
        const tentacleColors = ['#6a2c8a', '#5a1c7a', '#7a3c9a', '#4a0c6a'];
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI - Math.PI / 2;
            const baseX = x + 50 + Math.cos(angle) * 30;
            const baseY = y + 60;
            const wave = Math.sin(this.tentacleAnimation + i * 0.8) * 15;
            const wave2 = Math.cos(this.tentacleAnimation * 1.3 + i * 0.5) * 10;

            ctx.strokeStyle = tentacleColors[i % 4];
            ctx.lineWidth = 10 - i * 0.5;
            ctx.lineCap = 'round';

            ctx.beginPath();
            ctx.moveTo(baseX, baseY);
            ctx.quadraticCurveTo(
                baseX + wave, baseY + 30,
                baseX + wave2, baseY + 50
            );
            ctx.quadraticCurveTo(
                baseX + wave * 0.5, baseY + 70,
                baseX + wave, baseY + 80
            );
            ctx.stroke();

            // Suckers
            ctx.fillStyle = '#d8b8e8';
            for (let j = 1; j < 4; j++) {
                const suckerY = baseY + j * 20;
                const suckerX = baseX + Math.sin(this.tentacleAnimation + i * 0.8 + j * 0.3) * (15 - j * 3);
                ctx.beginPath();
                ctx.arc(suckerX, suckerY, 4 - j * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Main body (mantle)
        ctx.fillStyle = '#8a4caa';
        ctx.beginPath();
        ctx.ellipse(x + 50, y + 35, 45, 35, 0, 0, Math.PI * 2);
        ctx.fill();

        // Body pattern
        ctx.fillStyle = '#6a2c8a';
        ctx.beginPath();
        ctx.ellipse(x + 50, y + 30, 30, 20, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(x + 30, y + 35, 12, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 70, y + 35, 12, 15, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pupils (follow player)
        const pupilOffsetX = Math.sign(player.x - (x + 50)) * 4;
        const pupilOffsetY = Math.sign(player.y - (y + 35)) * 3;
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.ellipse(x + 30 + pupilOffsetX, y + 35 + pupilOffsetY, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x + 70 + pupilOffsetX, y + 35 + pupilOffsetY, 6, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Angry eyebrows when attacking
        if (this.attackCooldown > 30) {
            ctx.strokeStyle = '#4a0c6a';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(x + 20, y + 20);
            ctx.lineTo(x + 40, y + 25);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x + 80, y + 20);
            ctx.lineTo(x + 60, y + 25);
            ctx.stroke();
        }

        ctx.restore();

        // Draw health bar above octopus
        const barWidth = 100;
        const barHeight = 8;
        const barX = x + (this.width - barWidth) / 2;
        const barY = (isClimbing ? y + this.height + 10 : y - 20);

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#8a4caa';
        ctx.fillRect(barX, barY, barWidth * (this.hp / this.maxHp), barHeight);
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
    }
}

// Shuriken class
class Shuriken {
    constructor(x, y, dir) {
        this.x = x;
        this.y = y;
        this.width = 14;
        this.height = 14;
        this.speed = 18;
        this.dir = dir;
        this.rotation = 0;
    }

    update() {
        this.x += this.speed * this.dir;
        this.rotation += 0.4;

        // Check collision with zombies
        for (let i = zombies.length - 1; i >= 0; i--) {
            if (this.collidesWith(zombies[i])) {
                if (zombies[i].takeDamage(1)) {
                    // Zombie died
                    for (let j = 0; j < 10; j++) {
                        particles.push(new Particle(
                            zombies[i].x + zombies[i].width / 2,
                            zombies[i].y + zombies[i].height / 2,
                            '#648c50'
                        ));
                    }
                    zombies.splice(i, 1);
                    updateUI();
                }
                return true; // Remove shuriken
            }
        }

        // Check platform collision
        for (let plat of platforms) {
            if (this.collidesWith(plat)) {
                // Spark particles
                for (let i = 0; i < 3; i++) {
                    particles.push(new Particle(this.x, this.y, '#ccc'));
                }
                SFX.hit();
                return true;
            }
        }

        // Out of bounds
        if (this.x < -20 || this.x > canvas.width + 20) {
            return true;
        }

        return false;
    }

    collidesWith(obj) {
        return this.x < obj.x + obj.width &&
               this.x + this.width > obj.x &&
               this.y < obj.y + obj.height &&
               this.y + this.height > obj.y;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);

        // Draw 4-pointed star
        ctx.fillStyle = '#b4b4be';
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const angle = (i * Math.PI / 2) - Math.PI / 2;
            const outerX = Math.cos(angle) * 7;
            const outerY = Math.sin(angle) * 7;
            const innerAngle = angle + Math.PI / 4;
            const innerX = Math.cos(innerAngle) * 3;
            const innerY = Math.sin(innerAngle) * 3;

            if (i === 0) ctx.moveTo(outerX, outerY);
            else ctx.lineTo(outerX, outerY);
            ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
        ctx.fill();

        // Center
        ctx.fillStyle = '#787888';
        ctx.beginPath();
        ctx.arc(0, 0, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// Particle class
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6 - 2;
        this.life = 30;
        this.color = color;
        this.size = 3 + Math.random() * 3;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.2;
        this.life--;
        return this.life <= 0;
    }

    draw() {
        ctx.globalAlpha = this.life / 30;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size/2, this.y - this.size/2, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

// HealthPack class
class HealthPack {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 24;
        this.bobOffset = Math.random() * Math.PI * 2;
    }

    update() {
        // Check collision with player
        if (player && this.collidesWith(player)) {
            if (player.hp < player.maxHp) {
                player.hp++;
                updateUI();
                SFX.pickup();
                // Spawn particles
                for (let i = 0; i < 8; i++) {
                    particles.push(new Particle(
                        this.x + this.width / 2,
                        this.y + this.height / 2,
                        '#4f4'
                    ));
                }
                return true; // Remove health pack
            }
        }
        return false;
    }

    collidesWith(obj) {
        return this.x < obj.x + obj.width &&
               this.x + this.width > obj.x &&
               this.y < obj.y + obj.height &&
               this.y + this.height > obj.y;
    }

    draw() {
        const bobY = Math.sin(Date.now() / 300 + this.bobOffset) * 4;
        const x = this.x;
        const y = this.y + bobY;

        // White box with red cross
        ctx.fillStyle = '#fff';
        ctx.fillRect(x, y, this.width, this.height);

        // Red border
        ctx.strokeStyle = '#c44';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, this.width, this.height);

        // Red cross
        ctx.fillStyle = '#c44';
        ctx.fillRect(x + 10, y + 4, 4, 16);  // Vertical
        ctx.fillRect(x + 4, y + 10, 16, 4);  // Horizontal

        // Glow effect
        ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 200) * 0.1;
        ctx.fillStyle = '#4f4';
        ctx.fillRect(x - 2, y - 2, this.width + 4, this.height + 4);
        ctx.globalAlpha = 1;
    }
}

// SecretBlock class - Hidden block that gives Berzerk power-up when hit from below
class SecretBlock {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.activated = false;
        this.bobOffset = Math.random() * Math.PI * 2;
        // Star properties
        this.starX = 0;
        this.starY = 0;
        this.starVY = 0;
        this.starVisible = false;
        this.starCollected = false;
    }

    update() {
        // Check if player hits from below
        if (!this.activated && player) {
            const playerTop = player.y;
            const playerBottom = player.y + player.height;
            const playerLeft = player.x;
            const playerRight = player.x + player.width;
            const blockBottom = this.y + this.height;
            const blockTop = this.y;
            const blockLeft = this.x;
            const blockRight = this.x + this.width;

            // Check horizontal overlap
            const horizontalOverlap = playerRight > blockLeft + 5 && playerLeft < blockRight - 5;

            // Player must be moving upward and their head hits the bottom of the block
            if (player.vy < 0 && horizontalOverlap &&
                playerTop <= blockBottom + 5 &&
                playerTop >= blockTop) {

                this.activated = true;
                this.starVisible = true;
                this.starX = this.x + this.width / 2;
                this.starY = this.y;
                this.starVY = -8; // Star bounces up
                player.vy = 1; // Bounce player down slightly
                SFX.secretBlock();
            }
        }

        // Animate star - bounces up then falls
        if (this.starVisible && !this.starCollected) {
            this.starVY += 0.3; // Gravity on star
            this.starY += this.starVY;

            // Check if player collects the star
            const starSize = 20;
            if (player &&
                player.x < this.starX + starSize &&
                player.x + player.width > this.starX - starSize &&
                player.y < this.starY + starSize &&
                player.y + player.height > this.starY - starSize) {

                this.starCollected = true;
                this.starVisible = false;
                player.activateBerzerk();

                // Spawn celebration particles
                for (let i = 0; i < 15; i++) {
                    particles.push(new Particle(this.starX, this.starY, '#ffd700'));
                }
            }

            // Remove star if it falls off screen
            if (this.starY > canvas.height + 50) {
                this.starVisible = false;
            }
        }

        return false; // Never remove
    }

    draw() {
        const x = this.x;
        const y = this.y;

        if (!this.activated) {
            // Draw as a brick-like block with question mark
            // Background
            ctx.fillStyle = '#8B5A2B';
            ctx.fillRect(x, y, this.width, this.height);

            // Border/outline
            ctx.strokeStyle = '#5D3A1A';
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 1, y + 1, this.width - 2, this.height - 2);

            // Inner highlight
            ctx.fillStyle = '#CD853F';
            ctx.fillRect(x + 4, y + 4, this.width - 8, this.height - 8);

            // Question mark
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('?', x + this.width / 2, y + this.height / 2);

            // Shimmer effect
            ctx.globalAlpha = 0.2 + Math.sin(Date.now() / 300 + this.bobOffset) * 0.1;
            ctx.fillStyle = '#fff';
            ctx.fillRect(x + 4, y + 4, 8, 8);
            ctx.globalAlpha = 1;
        } else {
            // Empty block after activation
            ctx.fillStyle = '#4a4a4a';
            ctx.fillRect(x, y, this.width, this.height);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 3;
            ctx.strokeRect(x + 1, y + 1, this.width - 2, this.height - 2);
            ctx.fillStyle = '#5a5a5a';
            ctx.fillRect(x + 4, y + 4, this.width - 8, this.height - 8);
        }

        // Draw bouncing star
        if (this.starVisible && !this.starCollected) {
            this.drawStar(this.starX, this.starY);
        }
    }

    drawStar(cx, cy) {
        const pulse = Math.sin(Date.now() / 100) * 0.2 + 1;
        const size = 18 * pulse;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Date.now() / 200);

        // Outer glow
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
            const outerX = Math.cos(angle) * size * 1.8;
            const outerY = Math.sin(angle) * size * 1.8;
            if (i === 0) ctx.moveTo(outerX, outerY);
            else ctx.lineTo(outerX, outerY);
            const innerAngle = angle + Math.PI / 5;
            const innerX = Math.cos(innerAngle) * size * 0.7;
            const innerY = Math.sin(innerAngle) * size * 0.7;
            ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;

        // Main star
        ctx.fillStyle = '#ffd700';
        ctx.strokeStyle = '#ff8c00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI / 5) - Math.PI / 2;
            const outerX = Math.cos(angle) * size;
            const outerY = Math.sin(angle) * size;
            if (i === 0) ctx.moveTo(outerX, outerY);
            else ctx.lineTo(outerX, outerY);
            const innerAngle = angle + Math.PI / 5;
            const innerX = Math.cos(innerAngle) * size * 0.4;
            const innerY = Math.sin(innerAngle) * size * 0.4;
            ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Center highlight
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

// Platform class
class Platform {
    constructor(x, y, width, height, isGround = false) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.isGround = isGround;
    }

    draw() {
        // Grass top
        ctx.fillStyle = '#508c3c';
        ctx.fillRect(this.x, this.y, this.width, 8);

        // Dirt
        ctx.fillStyle = '#64463c';
        ctx.fillRect(this.x, this.y + 8, this.width, this.height - 8);

        // Grass detail
        ctx.fillStyle = '#3c6e2d';
        for (let i = this.x; i < this.x + this.width; i += 12) {
            ctx.fillRect(i, this.y, 4, 6);
        }

        // Dirt detail
        ctx.fillStyle = '#503828';
        for (let i = this.x + 5; i < this.x + this.width - 10; i += 25) {
            ctx.fillRect(i, this.y + 15, 8, 6);
        }
    }
}

// ==================== Level Configuration ====================
const levels = {
    1: {
        platforms: [
            new Platform(0, 900, 1800, 100, true),
            new Platform(300, 700, 300, 40),
            new Platform(800, 600, 300, 40),
            new Platform(1300, 700, 300, 40),
        ],
        zombies: [
            { x: 1000, y: 800 },
            { x: 1500, y: 800 },
        ],
        secretBlocks: [
            { x: 600, y: 780 }
        ]
    },
    2: {
        platforms: [
            new Platform(0, 900, 1800, 100, true),
            new Platform(200, 700, 250, 40),
            new Platform(550, 550, 250, 40),
            new Platform(900, 700, 250, 40),
            new Platform(1250, 550, 250, 40),
            new Platform(1550, 400, 200, 40),
        ],
        zombies: [
            { x: 600, y: 800 },
            { x: 1000, y: 800 },
            { x: 1400, y: 800 },
            { x: 620, y: 450 },
            { x: 1320, y: 450 },
        ]
    },
    3: {
        platforms: [
            new Platform(0, 900, 1800, 100, true),
            new Platform(100, 750, 200, 40),
            new Platform(400, 600, 200, 40),
            new Platform(700, 450, 200, 40),
            new Platform(1000, 600, 200, 40),
            new Platform(1300, 450, 200, 40),
            new Platform(1550, 300, 200, 40),
        ],
        zombies: [
            { x: 500, y: 800 },
            { x: 900, y: 800 },
            { x: 1300, y: 800 },
            { x: 450, y: 500 },
            { x: 750, y: 350 },
            { x: 1350, y: 350 },
        ]
    },
    4: {
        platforms: [
            new Platform(0, 900, 600, 100, true),
            new Platform(800, 900, 400, 100, true),
            new Platform(1400, 900, 400, 100, true),
            new Platform(550, 750, 300, 40),
            new Platform(1100, 750, 300, 40),
            new Platform(200, 550, 250, 40),
            new Platform(750, 550, 300, 40),
            new Platform(1300, 550, 250, 40),
            new Platform(500, 350, 300, 40),
            new Platform(1000, 350, 300, 40),
        ],
        zombies: [
            { x: 300, y: 800 },
            { x: 950, y: 800 },
            { x: 1550, y: 800 },
            { x: 620, y: 650 },
            { x: 1170, y: 650 },
            { x: 570, y: 250 },
            { x: 1070, y: 250 },
        ]
    },
    5: {
        platforms: [
            new Platform(0, 900, 1800, 100, true),
            new Platform(0, 650, 300, 40),
            new Platform(400, 500, 300, 40),
            new Platform(800, 650, 300, 40),
            new Platform(1200, 500, 300, 40),
            new Platform(1500, 650, 300, 40),
            new Platform(200, 300, 400, 40),
            new Platform(1200, 300, 400, 40),
        ],
        zombies: [
            { x: 400, y: 800 },
            { x: 800, y: 800 },
            { x: 1200, y: 800 },
            { x: 1600, y: 800 },
            { x: 100, y: 550 },
            { x: 500, y: 400 },
        ],
        healthPacks: [
            { x: 150, y: 610 },
            { x: 550, y: 460 },
            { x: 900, y: 610 },
            { x: 1350, y: 260 },
        ],
        boss: { type: 'spider', x: 900, y: -150 }
    },
    6: {
        platforms: [
            new Platform(0, 900, 500, 100, true),
            new Platform(700, 900, 400, 100, true),
            new Platform(1300, 900, 500, 100, true),
            new Platform(450, 750, 300, 40),
            new Platform(1050, 750, 300, 40),
            new Platform(150, 550, 250, 40),
            new Platform(600, 550, 250, 40),
            new Platform(950, 550, 250, 40),
            new Platform(1400, 550, 250, 40),
            new Platform(400, 350, 300, 40),
            new Platform(1100, 350, 300, 40),
            new Platform(750, 200, 300, 40),
        ],
        zombies: [
            { x: 400, y: 800 },
            { x: 850, y: 800 },
            { x: 1500, y: 800 },
            { x: 550, y: 650 },
            { x: 1150, y: 650 },
            { x: 320, y: 450 },
            { x: 1470, y: 450 },
            { x: 600, y: 300, flying: true },
            { x: 1200, y: 300, flying: true },
        ],
        healthPacks: [
            { x: 550, y: 710 },
            { x: 700, y: 510 },
            { x: 1050, y: 510 },
            { x: 850, y: 160 },
        ]
    },
    7: {
        platforms: [
            new Platform(0, 900, 1800, 100, true),
            new Platform(100, 700, 200, 40),
            new Platform(350, 550, 200, 40),
            new Platform(600, 400, 200, 40),
            new Platform(850, 550, 200, 40),
            new Platform(1100, 400, 200, 40),
            new Platform(1350, 550, 200, 40),
            new Platform(1550, 700, 200, 40),
            new Platform(850, 200, 200, 40),
        ],
        zombies: [
            { x: 400, y: 800 },
            { x: 700, y: 800 },
            { x: 1100, y: 800 },
            { x: 1500, y: 800 },
            { x: 250, y: 600 },
            { x: 920, y: 450 },
            { x: 1420, y: 450 },
            { x: 500, y: 350, flying: true },
            { x: 900, y: 250, flying: true },
            { x: 1300, y: 350, flying: true },
        ],
        healthPacks: [
            { x: 180, y: 660 },
            { x: 430, y: 510 },
            { x: 680, y: 360 },
            { x: 1180, y: 360 },
            { x: 1630, y: 660 },
        ],
        secretBlocks: [
            { x: 500, y: 780 }
        ]
    },
    8: {
        platforms: [
            new Platform(0, 900, 400, 100, true),
            new Platform(500, 900, 300, 100, true),
            new Platform(900, 900, 300, 100, true),
            new Platform(1300, 900, 500, 100, true),
            new Platform(350, 720, 200, 40),
            new Platform(750, 720, 200, 40),
            new Platform(1150, 720, 200, 40),
            new Platform(200, 520, 250, 40),
            new Platform(550, 520, 250, 40),
            new Platform(1000, 520, 250, 40),
            new Platform(1400, 520, 250, 40),
            new Platform(400, 320, 300, 40),
            new Platform(800, 320, 300, 40),
            new Platform(1200, 320, 300, 40),
        ],
        zombies: [
            { x: 300, y: 800 },
            { x: 600, y: 800 },
            { x: 1000, y: 800 },
            { x: 1500, y: 800 },
            { x: 420, y: 620 },
            { x: 820, y: 620 },
            { x: 1220, y: 620 },
            { x: 350, y: 420 },
            { x: 1470, y: 420 },
            { x: 500, y: 200, flying: true },
            { x: 900, y: 180, flying: true },
            { x: 1300, y: 200, flying: true },
        ],
        healthPacks: [
            { x: 430, y: 680 },
            { x: 830, y: 680 },
            { x: 300, y: 480 },
            { x: 650, y: 480 },
            { x: 1100, y: 480 },
            { x: 950, y: 280 },
        ],
        secretBlocks: [
            { x: 600, y: 800 }
        ]
    },
    9: {
        platforms: [
            new Platform(0, 900, 1800, 100, true),
            new Platform(0, 700, 250, 40),
            new Platform(300, 550, 250, 40),
            new Platform(600, 400, 250, 40),
            new Platform(900, 250, 250, 40),
            new Platform(1200, 400, 250, 40),
            new Platform(1500, 550, 250, 40),
            new Platform(1550, 700, 250, 40),
            new Platform(700, 700, 400, 40),
        ],
        zombies: [
            { x: 400, y: 800 },
            { x: 600, y: 800 },
            { x: 1100, y: 800 },
            { x: 1400, y: 800 },
            { x: 180, y: 600 },
            { x: 370, y: 450 },
            { x: 1270, y: 300 },
            { x: 1570, y: 450 },
            { x: 500, y: 300, flying: true },
            { x: 800, y: 200, flying: true },
            { x: 1100, y: 250, flying: true },
            { x: 1500, y: 300, flying: true },
        ],
        healthPacks: [
            { x: 120, y: 660 },
            { x: 400, y: 510 },
            { x: 700, y: 360 },
            { x: 1000, y: 210 },
            { x: 1300, y: 360 },
            { x: 850, y: 660 },
        ],
        secretBlocks: [
            { x: 850, y: 780 }
        ]
    },
    10: {
        platforms: [
            new Platform(0, 900, 350, 100, true),
            new Platform(450, 900, 300, 100, true),
            new Platform(850, 900, 300, 100, true),
            new Platform(1250, 900, 550, 100, true),
            new Platform(300, 750, 200, 40),
            new Platform(700, 750, 200, 40),
            new Platform(1100, 750, 200, 40),
            new Platform(100, 580, 200, 40),
            new Platform(400, 580, 200, 40),
            new Platform(700, 580, 200, 40),
            new Platform(1000, 580, 200, 40),
            new Platform(1300, 580, 200, 40),
            new Platform(1550, 580, 200, 40),
            new Platform(250, 400, 250, 40),
            new Platform(600, 400, 250, 40),
            new Platform(950, 400, 250, 40),
            new Platform(1300, 400, 250, 40),
            new Platform(500, 220, 350, 40),
            new Platform(950, 220, 350, 40),
        ],
        zombies: [
            { x: 550, y: 800 },
            { x: 950, y: 800 },
            { x: 1400, y: 800 },
            { x: 1600, y: 800 },
            { x: 370, y: 650 },
            { x: 770, y: 650 },
            { x: 1170, y: 650 },
            { x: 250, y: 480 },
            { x: 1070, y: 480 },
            { x: 1620, y: 480 },
            { x: 420, y: 300 },
            { x: 1370, y: 300 },
            { x: 400, y: 200, flying: true },
            { x: 700, y: 150, flying: true },
            { x: 1100, y: 150, flying: true },
            { x: 1500, y: 200, flying: true },
        ],
        healthPacks: [
            { x: 380, y: 710 },
            { x: 780, y: 710 },
            { x: 180, y: 540 },
            { x: 480, y: 540 },
            { x: 1080, y: 540 },
            { x: 1380, y: 540 },
            { x: 700, y: 360 },
            { x: 1050, y: 360 },
        ],
        secretBlocks: [
            { x: 1000, y: 780 }
        ],
        boss: { type: 'octopus', x: 900, y: -150 }
    }
};

// ==================== Game Control Functions ====================

// Initialize game
function initGame() {
    player = new Player(100, 750);
    zombies = [];
    shurikens = [];
    particles = [];
    healthPacks = [];
    secretBlocks = [];

    const level = levels[currentLevel];
    platforms = level.platforms;

    for (let point of level.zombies) {
        if (point.flying) {
            zombies.push(new FlyingZombie(point.x, point.y));
        } else {
            zombies.push(new Zombie(point.x, point.y));
        }
    }

    // Add health packs if level has them
    if (level.healthPacks) {
        for (let point of level.healthPacks) {
            healthPacks.push(new HealthPack(point.x, point.y));
        }
    }

    // Add secret blocks if level has them
    if (level.secretBlocks) {
        for (let point of level.secretBlocks) {
            secretBlocks.push(new SecretBlock(point.x, point.y));
        }
    }

    // Add boss if level has one
    if (level.boss) {
        if (level.boss.type === 'giant') {
            zombies.push(new GiantZombieBoss(level.boss.x, level.boss.y));
        } else if (level.boss.type === 'spider') {
            zombies.push(new SpiderBoss(level.boss.x, level.boss.y));
        } else if (level.boss.type === 'octopus') {
            zombies.push(new OctopusBoss(level.boss.x, level.boss.y));
        }
    }

    updateUI();
}

// Update UI
function updateUI() {
    document.getElementById('hp').textContent = player.hp;
    document.getElementById('healthFill').style.width = (player.hp / player.maxHp * 100) + '%';
    document.getElementById('zombieCount').textContent = zombies.length;
    document.getElementById('levelNum').textContent = currentLevel;

    // Change health bar color
    const percent = player.hp / player.maxHp;
    const fill = document.getElementById('healthFill');
    if (percent > 0.5) {
        fill.style.background = 'linear-gradient(to bottom, #4f4, #2a2)';
    } else if (percent > 0.25) {
        fill.style.background = 'linear-gradient(to bottom, #ff4, #aa2)';
    } else {
        fill.style.background = 'linear-gradient(to bottom, #f44, #a22)';
    }
}

// Game over
function gameOver(won) {
    gameRunning = false;
    Music.stop();
    if (won) {
        if (currentLevel < maxLevel) {
            document.getElementById('levelComplete').classList.remove('hidden');
            document.getElementById('completedLevel').textContent = currentLevel;
        } else {
            document.getElementById('victory').classList.remove('hidden');
        }
        SFX.victory();
    } else {
        document.getElementById('gameOver').classList.remove('hidden');
        document.getElementById('deathLevel').textContent = currentLevel;
        SFX.gameOver();
    }
}

function nextLevel() {
    currentLevel++;
    document.getElementById('levelComplete').classList.add('hidden');
    initGame();
    gameRunning = true;
    Music.start();
}

function retryLevel() {
    document.getElementById('gameOver').classList.add('hidden');
    initGame();
    gameRunning = true;
    Music.start();
}

// Start game
function startGame() {
    initAudio();
    currentLevel = 1;
    document.getElementById('overlay').classList.add('hidden');
    document.getElementById('gameOver').classList.add('hidden');
    document.getElementById('victory').classList.add('hidden');
    document.getElementById('levelComplete').classList.add('hidden');
    initGame();
    gameRunning = true;
    Music.start();
}

// ==================== Rendering Functions ====================

// Draw background
function drawBackground() {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#2d2d44');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Stars (more for larger canvas)
    ctx.fillStyle = '#fff';
    const starPositions = [
        [50,30],[150,60],[280,45],[400,80],[550,35],[700,65],[850,40],[1000,70],
        [1150,30],[1300,55],[1450,45],[1600,75],[1700,35],
        [100,120],[300,100],[500,140],[750,110],[950,130],[1200,105],[1400,125],[1650,115]
    ];
    for (let [x, y] of starPositions) {
        ctx.globalAlpha = 0.5 + Math.sin(Date.now() / 500 + x) * 0.3;
        ctx.fillRect(x, y, 3, 3);
    }
    ctx.globalAlpha = 1;

    // Moon (larger and repositioned)
    ctx.fillStyle = '#e8e8d0';
    ctx.beginPath();
    ctx.arc(1600, 120, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d0d0b8';
    ctx.beginPath();
    ctx.arc(1580, 110, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(1620, 135, 10, 0, Math.PI * 2);
    ctx.fill();
}

// ==================== Game Loop ====================

function gameLoop() {
    // Draw background
    drawBackground();

    if (gameRunning && player) {
        // Update
        player.update();

        for (let zombie of zombies) {
            zombie.update();
        }

        // Check for player stomping on zombies
        if (player.vy > 0) {
            for (let i = zombies.length - 1; i >= 0; i--) {
                const zombie = zombies[i];

                // Skip bosses - they have their own stomp logic
                if (zombie.isBoss) continue;

                // Check if player is landing on top of zombie
                const playerBottom = player.y + player.height;
                const playerCenterX = player.x + player.width / 2;
                const zombieTop = zombie.y;
                const zombieLeft = zombie.x;
                const zombieRight = zombie.x + zombie.width;

                // Player must be above zombie and horizontally overlapping
                const landingOnTop = playerBottom >= zombieTop &&
                                     playerBottom <= zombieTop + 20 &&
                                     playerCenterX > zombieLeft &&
                                     playerCenterX < zombieRight;

                if (landingOnTop) {
                    // Bounce player up
                    player.vy = -12;
                    player.grounded = false;

                    // Kill the zombie instantly
                    SFX.zombieDeath();

                    // Spawn death particles
                    for (let j = 0; j < 10; j++) {
                        particles.push(new Particle(
                            zombie.x + zombie.width / 2,
                            zombie.y + zombie.height / 2,
                            zombie instanceof FlyingZombie ? '#6a4a8a' : '#648c50'
                        ));
                    }

                    zombies.splice(i, 1);
                    updateUI();
                }
            }
        }

        // Update shurikens
        for (let i = shurikens.length - 1; i >= 0; i--) {
            if (shurikens[i].update()) {
                shurikens.splice(i, 1);
            }
        }

        // Update particles
        for (let i = particles.length - 1; i >= 0; i--) {
            if (particles[i].update()) {
                particles.splice(i, 1);
            }
        }

        // Update health packs
        for (let i = healthPacks.length - 1; i >= 0; i--) {
            if (healthPacks[i].update()) {
                healthPacks.splice(i, 1);
            }
        }

        // Update secret blocks
        for (let block of secretBlocks) {
            block.update();
        }

        // Berzerk mode - kill zombies on contact
        if (player.berzerk) {
            for (let i = zombies.length - 1; i >= 0; i--) {
                const zombie = zombies[i];

                // Check collision
                if (player.x < zombie.x + zombie.width &&
                    player.x + player.width > zombie.x &&
                    player.y < zombie.y + zombie.height &&
                    player.y + player.height > zombie.y) {

                    // Kill zombie instantly (including bosses!)
                    SFX.zombieDeath();

                    // Extra particles for berzerk kills
                    for (let j = 0; j < 15; j++) {
                        particles.push(new Particle(
                            zombie.x + zombie.width / 2,
                            zombie.y + zombie.height / 2,
                            '#ff4444'
                        ));
                    }

                    zombies.splice(i, 1);
                    updateUI();
                }
            }
        }

        // Check victory
        if (zombies.length === 0) {
            gameOver(true);
        }
    }

    // Draw platforms
    for (let plat of platforms) {
        plat.draw();
    }

    // Draw game objects
    if (gameRunning || document.getElementById('gameOver').classList.contains('hidden') === false ||
        document.getElementById('victory').classList.contains('hidden') === false) {

        // Draw secret blocks
        for (let block of secretBlocks) {
            block.draw();
        }

        // Draw health packs
        for (let healthPack of healthPacks) {
            healthPack.draw();
        }

        for (let zombie of zombies) {
            zombie.draw();
        }

        for (let shuriken of shurikens) {
            shuriken.draw();
        }

        for (let particle of particles) {
            particle.draw();
        }

        if (player && player.hp > 0) {
            player.draw();
        }

        // Draw Berzerk overlay and indicator
        if (player && player.berzerk) {
            // Red overlay
            ctx.globalAlpha = 0.15 + Math.sin(Date.now() / 100) * 0.05;
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;

            // Berzerk text indicator
            ctx.save();
            ctx.font = 'bold 48px Arial';
            ctx.fillStyle = '#ff0000';
            ctx.strokeStyle = '#ffff00';
            ctx.lineWidth = 3;
            ctx.textAlign = 'center';

            // Pulsing effect
            const scale = 1 + Math.sin(Date.now() / 100) * 0.1;
            ctx.translate(canvas.width / 2, 80);
            ctx.scale(scale, scale);

            ctx.strokeText('BERZERK!', 0, 0);
            ctx.fillText('BERZERK!', 0, 0);

            // Timer bar
            ctx.restore();
            const timerWidth = 200;
            const timerHeight = 10;
            const timerX = canvas.width / 2 - timerWidth / 2;
            const timerY = 100;
            const timerPercent = player.berzerkTimer / 300;

            ctx.fillStyle = '#333';
            ctx.fillRect(timerX, timerY, timerWidth, timerHeight);
            ctx.fillStyle = '#ff4400';
            ctx.fillRect(timerX, timerY, timerWidth * timerPercent, timerHeight);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.strokeRect(timerX, timerY, timerWidth, timerHeight);
        }
    }

    requestAnimationFrame(gameLoop);
}

// ==================== Input Handlers ====================

document.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
        e.preventDefault();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

canvas.addEventListener('mousedown', (e) => {
    mouseDown = true;
});

document.addEventListener('mouseup', (e) => {
    mouseDown = false;
});

// ==================== Touch Controls ====================

// Touch state
const touchState = {
    left: false,
    right: false,
    jump: false,
    attack: false
};

// Helper function to handle touch button press
function handleTouchStart(btn, stateKey, keyCode) {
    touchState[stateKey] = true;
    keys[keyCode] = true;
    btn.classList.add('pressed');
}

// Helper function to handle touch button release
function handleTouchEnd(btn, stateKey, keyCode) {
    touchState[stateKey] = false;
    keys[keyCode] = false;
    btn.classList.remove('pressed');
}

// Initialize touch controls
function initTouchControls() {
    const btnLeft = document.getElementById('btnLeft');
    const btnRight = document.getElementById('btnRight');
    const btnJump = document.getElementById('btnJump');
    const btnAttack = document.getElementById('btnAttack');

    if (!btnLeft || !btnRight || !btnJump || !btnAttack) return;

    // Left button
    btnLeft.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleTouchStart(btnLeft, 'left', 'ArrowLeft');
    }, { passive: false });

    btnLeft.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleTouchEnd(btnLeft, 'left', 'ArrowLeft');
    }, { passive: false });

    btnLeft.addEventListener('touchcancel', (e) => {
        handleTouchEnd(btnLeft, 'left', 'ArrowLeft');
    });

    // Right button
    btnRight.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleTouchStart(btnRight, 'right', 'ArrowRight');
    }, { passive: false });

    btnRight.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleTouchEnd(btnRight, 'right', 'ArrowRight');
    }, { passive: false });

    btnRight.addEventListener('touchcancel', (e) => {
        handleTouchEnd(btnRight, 'right', 'ArrowRight');
    });

    // Jump button
    btnJump.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleTouchStart(btnJump, 'jump', 'Space');
    }, { passive: false });

    btnJump.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleTouchEnd(btnJump, 'jump', 'Space');
    }, { passive: false });

    btnJump.addEventListener('touchcancel', (e) => {
        handleTouchEnd(btnJump, 'jump', 'Space');
    });

    // Attack button
    btnAttack.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleTouchStart(btnAttack, 'attack', 'KeyF');
    }, { passive: false });

    btnAttack.addEventListener('touchend', (e) => {
        e.preventDefault();
        handleTouchEnd(btnAttack, 'attack', 'KeyF');
    }, { passive: false });

    btnAttack.addEventListener('touchcancel', (e) => {
        handleTouchEnd(btnAttack, 'attack', 'KeyF');
    });

    // Prevent canvas touch from scrolling page
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
    }, { passive: false });

    // Handle touch on canvas for attack (tap anywhere on canvas)
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            mouseDown = true;
        }
    });

    canvas.addEventListener('touchend', (e) => {
        mouseDown = false;
    });
}

// Initialize touch controls when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTouchControls);
} else {
    initTouchControls();
}

// Prevent default touch behavior on game container to avoid scroll/zoom
document.getElementById('gameContainer')?.addEventListener('touchmove', (e) => {
    if (gameRunning) {
        e.preventDefault();
    }
}, { passive: false });

// ==================== Start Game Loop ====================
gameLoop();
