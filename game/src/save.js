// Solmar Bay — save and load, in the browser's localStorage.
// What is kept: the cash, how many jobs are done, where Dax stands and
// how hot the heat is. The game writes a save when a job pays out and
// every fifteen seconds of play; the menu offers Continue when a save
// exists. A save from another version of the game is ignored, never
// trusted blindly.
import { CONFIG } from './config.js';

const SAVE_VERSION = 1;

export function readSave() {
  try {
    const raw = window.localStorage.getItem(CONFIG.saveKey);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== SAVE_VERSION) return null;
    if (typeof data.money !== 'number' || typeof data.missionIndex !== 'number') return null;
    if (!data.player || typeof data.player.x !== 'number' || typeof data.player.z !== 'number') return null;
    return {
      money: Math.max(0, Math.floor(data.money)),
      missionIndex: Math.max(0, Math.min(5, Math.floor(data.missionIndex))),
      player: { x: data.player.x, z: data.player.z },
      wanted: Math.max(0, Math.min(5, Math.floor(data.wanted || 0))),
      savedAt: data.savedAt || 0,
    };
  } catch {
    return null; // storage off or a broken save: start fresh
  }
}

export function writeSave(world) {
  try {
    const data = {
      version: SAVE_VERSION,
      money: Math.floor(world.money),
      missionIndex: world.missions.index,
      player: { x: world.player.position.x, z: world.player.position.z },
      wanted: world.police.wanted,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(CONFIG.saveKey, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(CONFIG.saveKey);
  } catch {
    // Nothing to clear when storage is off.
  }
}
