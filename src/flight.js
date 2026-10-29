export const INITIAL_ALTITUDE = 128;
export function createFlight() {
  return { x: 0, y: INITIAL_ALTITUDE, z: 0, heading: 0, pitch: 0, bank: 0, speed: 86, throttle: 86, autopilot: true, flying: false, elapsed: 0 };
}
export function updateFlight(f, keys, dt) {
  dt = Math.min(Math.max(dt, 0), 0.05);
  f.elapsed += dt;
  const rollInput = Number(keys.has('d') || keys.has('arrowright')) - Number(keys.has('a') || keys.has('arrowleft'));
  const pitchInput = Number(keys.has('s')) - Number(keys.has('w'));
  if (f.flying && (rollInput || pitchInput || keys.has('arrowup') || keys.has('arrowdown'))) f.autopilot = false;
  if (f.flying && !f.autopilot) f.throttle = Math.min(145, Math.max(48, f.throttle + (Number(keys.has('arrowup')) - Number(keys.has('arrowdown'))) * dt * 15));
  const targetBank = f.autopilot ? Math.sin(f.elapsed * .08) * .055 : -rollInput * .6;
  const targetPitch = f.autopilot ? Math.sin(f.elapsed * .15) * .008 : pitchInput * .23;
  f.bank += (targetBank - f.bank) * (1 - Math.exp(-dt * 2.3));
  f.pitch += (targetPitch - f.pitch) * (1 - Math.exp(-dt * 1.8));
  f.speed += (f.throttle - f.speed) * (1 - Math.exp(-dt));
  f.heading += f.bank * dt * .35;
  const velocity = f.speed * .514444;
  f.x -= Math.sin(f.heading) * velocity * dt;
  f.z -= Math.cos(f.heading) * velocity * dt;
  f.y = Math.min(2400, Math.max(18, f.y + Math.sin(f.pitch) * velocity * dt));
  return f;
}
export function headingDegrees(heading) { return ((-heading * 180 / Math.PI) % 360 + 360) % 360; }
