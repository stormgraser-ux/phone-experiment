// Particle Chaos - Interactive Physics Sandbox
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const modeLabel = document.getElementById('mode-label');
const particleCountEl = document.getElementById('particle-count');

// High DPI support
let dpr = window.devicePixelRatio || 1;
let width, height;

function resize() {
  dpr = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.scale(dpr, dpr);
}
resize();
window.addEventListener('resize', resize);

// Physics state
const particles = [];
const MAX_PARTICLES = 800;
const touches = new Map();

// Modes: attract, repel, vortex, chaos, connect
const modes = ['attract', 'repel', 'vortex', 'chaos', 'antigrav'];
let currentMode = 0;
let gravityEnabled = true;
let hueOffset = 0;

// Particle class
class Particle {
  constructor(x, y, vx = 0, vy = 0) {
    this.x = x;
    this.y = y;
    this.vx = vx + (Math.random() - 0.5) * 2;
    this.vy = vy + (Math.random() - 0.5) * 2;
    this.radius = Math.random() * 3 + 2;
    this.mass = this.radius * 0.5;
    this.hue = (Math.random() * 60 + hueOffset) % 360;
    this.life = 1;
    this.decay = 0.0003 + Math.random() * 0.0005;
    this.trail = [];
    this.maxTrail = 8;
  }

  update(dt) {
    // Store trail
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) {
      this.trail.shift();
    }

    // Apply gravity
    if (gravityEnabled) {
      this.vy += 0.15 * dt;
    }

    // Apply touch forces
    touches.forEach((touch) => {
      const dx = touch.x - this.x;
      const dy = touch.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = Math.min(500 / (dist + 10), 8);

      switch (modes[currentMode]) {
        case 'attract':
          this.vx += (dx / dist) * force * 0.08 * dt;
          this.vy += (dy / dist) * force * 0.08 * dt;
          break;
        case 'repel':
          this.vx -= (dx / dist) * force * 0.12 * dt;
          this.vy -= (dy / dist) * force * 0.12 * dt;
          break;
        case 'vortex':
          // Perpendicular force for rotation + slight attraction
          this.vx += (-dy / dist) * force * 0.06 * dt + (dx / dist) * force * 0.02 * dt;
          this.vy += (dx / dist) * force * 0.06 * dt + (dy / dist) * force * 0.02 * dt;
          break;
        case 'chaos':
          const angle = Math.sin(Date.now() * 0.003 + this.x * 0.01) * Math.PI;
          this.vx += Math.cos(angle) * force * 0.1 * dt;
          this.vy += Math.sin(angle) * force * 0.1 * dt;
          break;
        case 'antigrav':
          // Reverse gravity in touch zone
          if (dist < 150) {
            this.vy -= 0.4 * dt;
          }
          break;
      }
    });

    // Friction
    this.vx *= 0.995;
    this.vy *= 0.995;

    // Velocity limit
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > 15) {
      this.vx = (this.vx / speed) * 15;
      this.vy = (this.vy / speed) * 15;
    }

    // Update position
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Bounce off walls
    if (this.x < this.radius) {
      this.x = this.radius;
      this.vx *= -0.7;
    } else if (this.x > width - this.radius) {
      this.x = width - this.radius;
      this.vx *= -0.7;
    }
    if (this.y < this.radius) {
      this.y = this.radius;
      this.vy *= -0.7;
    } else if (this.y > height - this.radius) {
      this.y = height - this.radius;
      this.vy *= -0.6;
      this.vx *= 0.95; // Floor friction
    }

    // Decay
    this.life -= this.decay * dt;

    // Shift hue based on velocity
    this.hue = (this.hue + speed * 0.2 * dt) % 360;

    return this.life > 0;
  }

  draw() {
    // Draw trail
    if (this.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        ctx.lineTo(this.trail[i].x, this.trail[i].y);
      }
      ctx.strokeStyle = `hsla(${this.hue}, 80%, 60%, ${this.life * 0.3})`;
      ctx.lineWidth = this.radius * 0.5;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Draw particle
    const gradient = ctx.createRadialGradient(
      this.x, this.y, 0,
      this.x, this.y, this.radius * 2
    );
    gradient.addColorStop(0, `hsla(${this.hue}, 90%, 70%, ${this.life})`);
    gradient.addColorStop(0.5, `hsla(${this.hue}, 85%, 55%, ${this.life * 0.6})`);
    gradient.addColorStop(1, `hsla(${this.hue}, 80%, 40%, 0)`);

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * 2, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  }
}

// Spawn particles
function spawnParticles(x, y, count = 20, spread = true) {
  for (let i = 0; i < count && particles.length < MAX_PARTICLES; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = spread ? Math.random() * 5 : 0;
    particles.push(new Particle(
      x + (Math.random() - 0.5) * 30,
      y + (Math.random() - 0.5) * 30,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed
    ));
  }
}

// Initial particles
for (let i = 0; i < 100; i++) {
  particles.push(new Particle(
    Math.random() * width,
    Math.random() * height * 0.7
  ));
}

// Touch handling
function getTouchPos(e) {
  const rect = canvas.getBoundingClientRect();
  if (e.touches) {
    return Array.from(e.touches).map(t => ({
      id: t.identifier,
      x: t.clientX - rect.left,
      y: t.clientY - rect.top
    }));
  }
  return [{ id: 'mouse', x: e.clientX - rect.left, y: e.clientY - rect.top }];
}

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  getTouchPos(e).forEach(t => {
    touches.set(t.id, t);
    spawnParticles(t.x, t.y, 15);
  });
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  getTouchPos(e).forEach(t => {
    const prev = touches.get(t.id);
    if (prev) {
      // Spawn particles along movement
      const dx = t.x - prev.x;
      const dy = t.y - prev.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 10) {
        spawnParticles(t.x, t.y, 3, false);
      }
    }
    touches.set(t.id, t);
  });
}, { passive: false });

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  const remaining = new Set(Array.from(e.touches).map(t => t.identifier));
  [...touches.keys()].forEach(id => {
    if (!remaining.has(id)) touches.delete(id);
  });
});

// Mouse support
canvas.addEventListener('mousedown', e => {
  const pos = getTouchPos(e)[0];
  touches.set('mouse', pos);
  spawnParticles(pos.x, pos.y, 15);
});

canvas.addEventListener('mousemove', e => {
  if (touches.has('mouse')) {
    const pos = getTouchPos(e)[0];
    spawnParticles(pos.x, pos.y, 2, false);
    touches.set('mouse', pos);
  }
});

canvas.addEventListener('mouseup', () => touches.delete('mouse'));
canvas.addEventListener('mouseleave', () => touches.delete('mouse'));

// UI buttons
document.getElementById('mode-btn').addEventListener('click', () => {
  currentMode = (currentMode + 1) % modes.length;
  modeLabel.textContent = modes[currentMode].charAt(0).toUpperCase() + modes[currentMode].slice(1);
  hueOffset = (hueOffset + 60) % 360;
});

document.getElementById('spawn-btn').addEventListener('click', () => {
  for (let i = 0; i < 5; i++) {
    spawnParticles(
      Math.random() * width,
      Math.random() * height * 0.3,
      20
    );
  }
});

document.getElementById('clear-btn').addEventListener('click', () => {
  particles.length = 0;
});

const gravityBtn = document.getElementById('gravity-btn');
gravityBtn.addEventListener('click', () => {
  gravityEnabled = !gravityEnabled;
  gravityBtn.classList.toggle('active', !gravityEnabled);
  gravityBtn.textContent = gravityEnabled ? 'Gravity' : 'Float';
});

// Animation loop
let lastTime = performance.now();

function animate(currentTime) {
  const dt = Math.min((currentTime - lastTime) / 16.67, 3); // Normalize to ~60fps
  lastTime = currentTime;

  // Semi-transparent clear for motion blur effect
  ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  ctx.fillRect(0, 0, width, height);

  // Draw touch points
  touches.forEach(touch => {
    const gradient = ctx.createRadialGradient(
      touch.x, touch.y, 0,
      touch.x, touch.y, 100
    );
    const modeHue = currentMode * 72;
    gradient.addColorStop(0, `hsla(${modeHue}, 70%, 50%, 0.3)`);
    gradient.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(touch.x, touch.y, 100, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
  });

  // Update and draw particles
  for (let i = particles.length - 1; i >= 0; i--) {
    if (!particles[i].update(dt)) {
      particles.splice(i, 1);
    } else {
      particles[i].draw();
    }
  }

  // Particle count
  particleCountEl.textContent = `${particles.length} particles`;

  requestAnimationFrame(animate);
}

animate(performance.now());

// Register service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
