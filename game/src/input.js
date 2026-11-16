// Keyboard and mouse, read once per step: the rest of the game never touches a DOM event.
// Pointer lock is requested on the canvas and every look delta is flushed by name, not by event.

const SWALLOW = new Set(['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.tapped = new Set();
    this.dx = 0;
    this.dy = 0;
    this.firing = false;
    this.locked = false;
    this._bind();
  }

  _bind() {
    const canvas = this.canvas;
    addEventListener('keydown', (e) => {
      if (SWALLOW.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      this.tapped.add(e.code);
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => {
      this.keys.clear();
      this.firing = false;
    });
    addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.dx += e.movementX || 0;
      this.dy += e.movementY || 0;
    });
    addEventListener('mousedown', (e) => {
      if (e.button === 0) this.firing = true;
      if (e.button === 2) this.tapped.add('Mouse2');
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) this.firing = false;
    });
    addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
  }

  lock() {
    if (this.locked) return;
    try {
      const p = this.canvas.requestPointerLock();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch {
      // A browser without pointer lock still plays: the arrow keys steer the view.
    }
  }

  held(code) {
    return this.keys.has(code);
  }

  consume(code) {
    if (!this.tapped.has(code)) return false;
    this.tapped.delete(code);
    return true;
  }

  flushLook() {
    const look = { dx: this.dx, dy: this.dy };
    this.dx = 0;
    this.dy = 0;
    return look;
  }

  endStep() {
    this.tapped.clear();
  }
}
