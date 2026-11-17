// Solmar Bay — keyboard + mouse input in one small state object.
// WASD moves and drives, Shift runs, E enters or steals a car, F throws
// a punch, P pauses, Space brakes. A mouse drag orbits the third-person
// camera; the deltas are consumed once per frame by the camera rig, so a
// drag never applies twice. Touch: one finger drags the camera the same way.
export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.dragDX = 0;
    this.dragDY = 0;
    this.dragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.actionPressed = false; // E, edge-triggered, consumed by the player
    this.punchPressed = false; // F, edge-triggered, consumed by combat
    this.pausePressed = false; // P or Escape, edge-triggered, consumed by main
    this.anyKey = false; // first keypress dismisses the start-screen hint

    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.keys.add(event.code);
      this.anyKey = true;
      if (event.code === 'KeyE') this.actionPressed = true;
      if (event.code === 'KeyF') this.punchPressed = true;
      if (event.code === 'KeyP' || event.code === 'Escape') this.pausePressed = true;
      // Space scrolls the page in a browser, arrows move the caret: stop
      // both, so the game owns those keys while it is open.
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => this.keys.clear());

    canvas.addEventListener('mousedown', (event) => {
      this.dragging = true;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
    });
    window.addEventListener('mousemove', (event) => {
      if (!this.dragging) return;
      this.dragDX += event.clientX - this.lastX;
      this.dragDY += event.clientY - this.lastY;
      this.lastX = event.clientX;
      this.lastY = event.clientY;
    });
    window.addEventListener('mouseup', () => { this.dragging = false; });

    canvas.addEventListener('touchstart', (event) => {
      const touch = event.touches[0];
      this.dragging = true;
      this.lastX = touch.clientX;
      this.lastY = touch.clientY;
    }, { passive: true });
    canvas.addEventListener('touchmove', (event) => {
      if (!this.dragging) return;
      const touch = event.touches[0];
      this.dragDX += touch.clientX - this.lastX;
      this.dragDY += touch.clientY - this.lastY;
      this.lastX = touch.clientX;
      this.lastY = touch.clientY;
    }, { passive: true });
    canvas.addEventListener('touchend', () => { this.dragging = false; });
  }

  // Clear everything held — used on pause, so a stuck key cannot keep
  // driving the car while the pause screen is up.
  reset() {
    this.keys.clear();
    this.dragDX = 0;
    this.dragDY = 0;
    this.dragging = false;
  }

  down(code) {
    return this.keys.has(code);
  }

  // Steering / throttle axes, -1..1, shared by walking and driving.
  moveX() {
    return (this.down('KeyD') || this.down('ArrowRight') ? 1 : 0)
      - (this.down('KeyA') || this.down('ArrowLeft') ? 1 : 0);
  }

  moveY() {
    return (this.down('KeyW') || this.down('ArrowUp') ? 1 : 0)
      - (this.down('KeyS') || this.down('ArrowDown') ? 1 : 0);
  }

  running() {
    return this.down('ShiftLeft') || this.down('ShiftRight');
  }

  braking() {
    return this.down('Space');
  }

  // Hand the accumulated mouse drag to the camera, then zero it.
  consumeDrag() {
    const dx = this.dragDX;
    const dy = this.dragDY;
    this.dragDX = 0;
    this.dragDY = 0;
    return { dx, dy };
  }

  consumeAction() {
    const pressed = this.actionPressed;
    this.actionPressed = false;
    return pressed;
  }

  consumePunch() {
    const pressed = this.punchPressed;
    this.punchPressed = false;
    return pressed;
  }

  consumePause() {
    const pressed = this.pausePressed;
    this.pausePressed = false;
    return pressed;
  }
}
