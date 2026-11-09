import { PIANO_HEIGHT, FALL_SPEED, noteNameInKey } from './constants';
import { getKeyGeometry, totalColumns } from './keyMapping';
import type { Note, Particle, GameState } from './types';

/**
 * Get the color for a MIDI note — key color if in scale, otherwise muted.
 */
export function getNoteColor(
  midi: number,
  scaleNotes: number[],
  keyColor: string,
): string {
  return scaleNotes.includes(midi) ? keyColor : '#3f3f46';
}

/**
 * Draw the count-in number centered on the canvas.
 */
export function drawCountIn(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  countInNumber: number,
  keyColor: string,
) {
  if (countInNumber > 0) {
    ctx.fillStyle = keyColor;
    ctx.font = "bold 120px 'Glacial Indifference', system-ui, sans-serif";
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(countInNumber.toString(), width / 2, height / 2 - 50);
  }
}

/**
 * Draw a red vignette flash when a note is missed.
 */
function drawMissFlash(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  intensity: number,
) {
  if (intensity <= 0) return;
  ctx.save();
  ctx.globalAlpha = intensity * 0.4;

  // Edge vignette
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.3,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.7,
  );
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(1, '#ef4444');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
}

/**
 * Draw a pause overlay on the canvas.
 */
export function drawPauseOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, width, height);

  // Pause icon (two bars)
  const barWidth = 16;
  const barHeight = 60;
  const gap = 20;
  const cx = width / 2;
  const cy = height / 2 - 30;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(
    cx - gap / 2 - barWidth,
    cy - barHeight / 2,
    barWidth,
    barHeight,
  );
  ctx.fillRect(cx + gap / 2, cy - barHeight / 2, barWidth, barHeight);

  // "PAUSED" text
  ctx.fillStyle = '#a1a1aa';
  ctx.font = "600 16px 'Glacial Indifference', system-ui, sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('PAUSED', cx, cy + barHeight / 2 + 16);

  ctx.font = "400 12px 'Glacial Indifference', system-ui, sans-serif";
  ctx.fillStyle = '#71717a';
  ctx.fillText('Press Escape to resume', cx, cy + barHeight / 2 + 40);

  ctx.restore();
}

/**
 * Draw the full game frame: grid, notes, piano, particles, miss flash.
 */
export function drawGameFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  st: GameState,
  songTime: number,
  notes: Note[],
  particles: Particle[],
  activeMidiNotes: Set<number>,
) {
  const currentBeatTime = 60 / st.bpm;
  const hitY = height - PIANO_HEIGHT;

  // Hit window highlight
  const windowHeight = FALL_SPEED * 0.15 * 2; // INPUT_WINDOW * FALL_SPEED * 2
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = st.currentKeyColor;
  ctx.fillRect(0, hitY - windowHeight / 2, width, windowHeight);
  ctx.restore();

  // Beat grid lines
  const maxVisibleTime = songTime + hitY / FALL_SPEED;
  const startBeat = Math.floor(songTime / currentBeatTime);
  const endBeat = Math.ceil(maxVisibleTime / currentBeatTime);

  ctx.lineWidth = 1;
  for (let b = startBeat; b <= endBeat; b++) {
    const beatT = b * currentBeatTime;
    const y = hitY - (beatT - songTime) * FALL_SPEED;
    ctx.strokeStyle = b % 4 === 0 ? '#3f3f46' : '#27272a';
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Vertical lane lines (spans all columns, including the side buffers)
  ctx.strokeStyle = '#27272a';
  const columns = totalColumns(st.display);
  const whiteKeyWidth = width / columns;
  for (let i = 0; i <= columns; i++) {
    ctx.beginPath();
    ctx.moveTo(i * whiteKeyWidth, 0);
    ctx.lineTo(i * whiteKeyWidth, hitY);
    ctx.stroke();
  }

  // Each chord's symbol in the left margin, where its bar starts.
  ctx.save();
  ctx.font = "600 13px 'Glacial Indifference', system-ui, sans-serif";
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  for (const label of st.chordLabels) {
    const y = hitY - (label.time - songTime) * FALL_SPEED;
    if (y < 0 || y > hitY + 2) continue;
    ctx.fillStyle = 'rgba(244,244,245,0.75)';
    ctx.fillText(label.symbol, 10, y - 4);
  }
  ctx.restore();

  // Falling notes
  notes.forEach((note) => {
    const dist = (note.time - songTime) * FALL_SPEED;
    const y = hitY - dist;
    const noteHeight = note.duration * currentBeatTime * FALL_SPEED;
    const visualGap = 2;
    const h = noteHeight - visualGap;

    if (y < -h || y - h > height) return;

    const geom = getKeyGeometry(note.midi, width, st.display);
    if (!geom) return;

    let color = getNoteColor(
      note.midi,
      st.currentScaleNotes,
      st.currentKeyColor,
    );
    if (note.missed || note.lost)
      color = '#52525b'; // Brighter than before (#27272a)
    else if (note.completed) color = '#ffffff';

    ctx.fillStyle = color;
    ctx.fillRect(geom.x + 1, y - h, geom.width - 2, h);

    // Top highlight
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(geom.x + 1, y - h, geom.width - 2, 2);

    // Red border for missed/lost notes
    if (note.missed || note.lost) {
      ctx.save();
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6;
      ctx.strokeRect(geom.x + 1, y - h, geom.width - 2, h);
      ctx.restore();
    }

    // Hold beam
    if (note.isHolding) {
      ctx.save();
      const beamGrad = ctx.createLinearGradient(0, hitY, 0, y);
      beamGrad.addColorStop(0, color);
      beamGrad.addColorStop(1, 'transparent');
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = beamGrad;
      ctx.fillRect(geom.x + 2, y, geom.width - 4, hitY - y);
      ctx.restore();
    }

    // Note label
    if (!note.missed && !note.lost) {
      ctx.fillStyle = '#000';
      ctx.font = "600 12px 'Glacial Indifference', system-ui, sans-serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        noteNameInKey(note.midi, st.keyRootVal),
        geom.x + geom.width / 2,
        y - 15,
      );
    }
  });

  // Piano keyboard
  drawPiano(ctx, width, height, hitY, st, activeMidiNotes);

  // Particles
  particles.forEach((p) => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1.0;

  // Miss flash vignette
  if (st.missFlashTime > 0) {
    const elapsed = songTime - st.missFlashTime;
    const duration = 0.3;
    if (elapsed < duration) {
      const intensity = 1 - elapsed / duration;
      drawMissFlash(ctx, width, height, intensity);
    }
  }
}

function drawPiano(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  hitY: number,
  st: GameState,
  activeMidiNotes: Set<number>,
) {
  ctx.fillStyle = '#101012';
  ctx.fillRect(0, hitY, width, PIANO_HEIGHT);

  const first = st.display.low;
  const last = st.display.low + 12 * Math.ceil(st.display.whiteKeys / 7);
  const label = (
    midi: number,
    x: number,
    y: number,
    active: boolean,
    onBlack: boolean,
  ) => {
    const text = st.keyLabels[midi];
    if (!text) return;
    ctx.fillStyle = active ? '#fff' : onBlack ? '#d4d4d8' : '#a1a1aa';
    ctx.font = `bold ${onBlack ? 12 : 14}px 'Glacial Indifference', system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(text, x, y);
  };

  // White keys
  for (let i = first; i <= last; i++) {
    const geom = getKeyGeometry(i, width, st.display);
    if (geom && !geom.isBlack) {
      const isActive = activeMidiNotes.has(i);
      ctx.fillStyle = isActive
        ? getNoteColor(i, st.currentScaleNotes, st.currentKeyColor)
        : '#f4f4f5';
      ctx.fillRect(geom.x + 1, hitY, geom.width - 2, PIANO_HEIGHT);

      ctx.fillStyle = '#d4d4d8';
      ctx.fillRect(geom.x + 1, height - 10, geom.width - 2, 10);
      label(i, geom.x + geom.width / 2, height - 15, isActive, false);
    }
  }

  // Black keys
  for (let i = first; i <= last; i++) {
    const geom = getKeyGeometry(i, width, st.display);
    if (geom && geom.isBlack) {
      const isActive = activeMidiNotes.has(i);
      ctx.fillStyle = isActive
        ? getNoteColor(i, st.currentScaleNotes, st.currentKeyColor)
        : '#27272a';
      ctx.fillRect(geom.x, hitY, geom.width, PIANO_HEIGHT * 0.65);
      label(
        i,
        geom.x + geom.width / 2,
        hitY + PIANO_HEIGHT * 0.65 - 6,
        isActive,
        true,
      );
    }
  }

  // Hit line
  ctx.strokeStyle = '#52525b';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, hitY);
  ctx.lineTo(width, hitY);
  ctx.stroke();
}
