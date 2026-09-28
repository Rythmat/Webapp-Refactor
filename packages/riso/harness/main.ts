/** Harness entry: mount whatever film is registered and wire the transport. */
import { mountFilm } from '../src/film/mount.ts';
import { pickFilm } from './films.ts';

const canvas = document.getElementById('c') as HTMLCanvasElement;
const scrub = document.getElementById('scrub') as HTMLInputElement;
const clock = document.getElementById('clock') as HTMLOutputElement;
const playpause = document.getElementById('playpause') as HTMLButtonElement;
const label = document.getElementById('label') as HTMLDivElement;

const { id, film } = pickFilm();
document.title = `riso harness — ${id}`;
const player = mountFilm(canvas, film);

scrub.max = String(film.duration);

const describe = (t: number): string => {
  const shot = film.shots?.find((s) => t >= s.start && t < s.end);
  return shot ? `${shot.id} — ${shot.action ?? ''}` : '';
};

const paint = (t: number): void => {
  scrub.value = String(t);
  clock.value = t.toFixed(2);
  label.textContent = describe(t);
};

const seek = (t: number): void => {
  player.seek(t);
  paint(t);
};

scrub.addEventListener('input', () => seek(Number(scrub.value)));
playpause.addEventListener('click', () => {
  if (player.playing) {
    player.pause();
    playpause.textContent = 'play';
  } else {
    player.play();
    playpause.textContent = 'pause';
    const follow = (): void => {
      if (!player.playing) {
        playpause.textContent = 'play';
        return;
      }
      paint(Number(clock.value));
      requestAnimationFrame(follow);
    };
    follow();
  }
});

paint(Number(new URLSearchParams(location.search).get('t')) || 0);
