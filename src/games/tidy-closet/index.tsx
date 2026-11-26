import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { GameProps } from '../../shared/types';
import { ExitButton } from '../../shared/ExitButton';
import { getHighScore, load, save, submitScore } from '../../shared/storage';
import { Engine, type Hud } from './engine';
import { levelDef } from './sim';
import { meta } from './meta';

type Screen = 'start' | 'play' | 'clear' | 'over';

const CSS = `
.g-tidy-closet { -webkit-touch-callout: none; -webkit-user-select: none; user-select: none; -webkit-tap-highlight-color: transparent; font-family: "Fredoka", system-ui, sans-serif; color: #2b2140; }
.g-tidy-closet .tc-card { background: #fff9ef; border: 3px solid #2b2140; border-radius: 18px; box-shadow: 0 6px 0 #2b2140, 0 18px 40px rgba(0,0,0,.3); }
.g-tidy-closet .tc-btn { border: 3px solid #2b2140; border-radius: 14px; font-weight: 700; box-shadow: 0 4px 0 #2b2140; transition: transform .06s, box-shadow .06s; }
.g-tidy-closet .tc-btn:active { transform: translateY(3px); box-shadow: 0 1px 0 #2b2140; }
.g-tidy-closet .tc-hud { text-shadow: 0 2px 0 rgba(43,33,64,.6); }
@keyframes tc-pop { 0% { transform: scale(.7); opacity: 0 } 70% { transform: scale(1.04) } 100% { transform: scale(1); opacity: 1 } }
.g-tidy-closet .tc-pop { animation: tc-pop .28s ease-out both; }
@keyframes tc-star { 0% { transform: scale(0) rotate(-40deg) } 70% { transform: scale(1.25) rotate(8deg) } 100% { transform: scale(1) } }
.g-tidy-closet .tc-star { display: inline-block; animation: tc-star .4s ease-out both; }
`;

export default function Game({ onExit }: GameProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const [screen, setScreen] = useState<Screen>('start');
  const screenRef = useRef<Screen>('start');
  const [hud, setHud] = useState<Hud>({ score: 0, level: 0, dropIn: 8, dropEvery: 8 });
  const [best, setBest] = useState(() => getHighScore(meta.id));
  const [newBest, setNewBest] = useState(false);
  const [unlocked, setUnlocked] = useState(() => load<number>(meta.id, 'unlocked', 0));
  const [result, setResult] = useState({ stars: 0, bonus: 0 });
  const [muted, setMuted] = useState(() => load<boolean>(meta.id, 'muted', false));
  const [paused, setPaused] = useState(false);
  const [board, setBoard] = useState({ w: 360, h: 760, scale: 40 });

  const go = (s: Screen) => {
    screenRef.current = s;
    setScreen(s);
  };

  useEffect(() => {
    const id = 'tc-font-fredoka';
    if (!document.getElementById(id)) {
      const l = document.createElement('link');
      l.id = id;
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&display=swap';
      document.head.appendChild(l);
    }
  }, []);

  useLayoutEffect(() => {
    const eng = new Engine(canvasRef.current!, {
      onHud: setHud,
      onClear: (stars, bonus) => {
        const lv = eng.st.levelIndex;
        const starsAll = load<number[]>(meta.id, 'stars', []);
        starsAll[lv] = Math.max(starsAll[lv] ?? 0, stars);
        save(meta.id, 'stars', starsAll);
        const un = Math.max(load<number>(meta.id, 'unlocked', 0), lv + 1);
        save(meta.id, 'unlocked', un);
        setUnlocked(un);
        setResult({ stars, bonus });
        setNewBest(submitScore(meta.id, eng.st.score));
        setBest(getHighScore(meta.id));
        eng.stop();
        go('clear');
      },
      onOver: () => {
        setNewBest(submitScore(meta.id, eng.st.score));
        setBest(getHighScore(meta.id));
        eng.stop();
        go('over');
      },
    });
    eng.sfx.muted = muted;
    engineRef.current = eng;
    if (window.location.search.includes('tcdebug')) (window as unknown as { __tc: Engine }).__tc = eng;
    const fit = () => setBoard(eng.layout(wrapRef.current!.clientWidth, wrapRef.current!.clientHeight));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrapRef.current!);
    // redraw once the cartoon font has loaded
    void document.fonts?.ready.then(() => eng.render());
    return () => {
      ro.disconnect();
      eng.stop();
      eng.sfx.suspend();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden && screenRef.current === 'play') {
        engineRef.current?.pause();
        setPaused(true);
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const begin = useCallback((level: number, score: number) => {
    const eng = engineRef.current!;
    eng.sfx.unlock();
    setNewBest(false);
    setPaused(false);
    eng.startLevel(level, score);
    go('play');
  }, []);

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    save(meta.id, 'muted', m);
    if (engineRef.current) engineRef.current.sfx.muted = m;
  };

  const onDown = (e: React.PointerEvent) => {
    if (screenRef.current !== 'play') return;
    const eng = engineRef.current!;
    if (paused) {
      eng.resume();
      setPaused(false);
      return;
    }
    eng.sfx.unlock();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    eng.down(e.clientX, e.clientY);
  };
  const onMove = (e: React.PointerEvent) => {
    if (screenRef.current !== 'play' || paused) return;
    engineRef.current!.move(e.clientX, e.clientY);
  };
  const onUp = () => {
    if (screenRef.current !== 'play' || paused) return;
    engineRef.current!.up();
  };

  const hudH = Math.round(1.35 * board.scale);
  const lv = hud.level;
  const def = levelDef(lv);

  return (
    <div className="g-tidy-closet fixed inset-0 select-none overflow-hidden" style={{ background: '#b3a7d4', touchAction: 'none' }}>
      <style>{CSS}</style>
      <div
        ref={wrapRef}
        className="absolute inset-0 flex items-center justify-center"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => engineRef.current?.cancelAim()}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="relative" style={{ width: board.w, height: board.h }}>
          <canvas ref={canvasRef} className="block" />
          {/* HUD on the wardrobe's crown */}
          <div className="tc-hud absolute left-0 right-0 top-0 flex items-center justify-between px-2 text-white" style={{ height: hudH }}>
            <div onPointerDown={(e) => e.stopPropagation()}>
              <ExitButton
                onExit={onExit}
                className="!font-sans !text-[12px] !font-bold !rounded-lg !bg-[#fff9ef] !text-[#2b2140] !border-[#2b2140] shadow-[0_3px_0_#2b2140]"
              />
            </div>
            <div className="flex flex-col items-center leading-none">
              <div className="text-[22px] font-bold tabular-nums">{hud.score}</div>
              <div className="text-[11px] mt-0.5 opacity-90">
                BEST {Math.max(best, hud.score)} · LV {lv + 1}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end leading-none" aria-label={`The rod drops in ${hud.dropIn} throws`}>
                <div className="text-[10px] opacity-90">ROD DROPS IN</div>
                <div className={`text-[17px] font-bold tabular-nums ${hud.dropIn <= 2 ? 'text-[#ffd0d0]' : ''}`}>{hud.dropIn}</div>
              </div>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={toggleMute}
                aria-label={muted ? 'Sound on' : 'Mute'}
                className="w-8 h-8 rounded-lg bg-[#fff9ef] text-[#2b2140] border-2 border-[#2b2140] flex items-center justify-center text-[15px] shadow-[0_3px_0_#2b2140]"
              >
                {muted ? '🔇' : '🔊'}
              </button>
            </div>
          </div>

          {paused && screen === 'play' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="tc-card tc-pop px-8 py-6 text-center">
                <div className="text-[26px] font-bold">Paused</div>
                <div className="text-[15px] mt-1">Tap anywhere to keep tidying</div>
              </div>
            </div>
          )}

          {screen === 'start' && (
            <Overlay>
              <div className="text-[13px] font-semibold tracking-wide text-[#7a5cb0]">THE BEDROOM WARDROBE</div>
              <h1 className="text-[34px] font-bold leading-none mt-1">Tidy the Closet</h1>
              <p className="text-[16px] mt-3 leading-snug">
                Point where you want to throw and let go. Three or more of the same thing touching fold away, and anything left
                hanging from nothing falls to Rosie. Tap the basket to swap. Clear 6 in one throw to earn the bonus thong!
              </p>
              <p className="text-[14px] mt-2 opacity-80">The rod drops every few throws. Don't let the pile pass the red line.</p>
              <div className="text-[15px] mt-3">
                Best: <b>{best}</b>
              </div>
              {unlocked > 0 && (
                <button className="tc-btn mt-4 w-full py-3 text-[20px] bg-[#ffd23f]" onClick={() => begin(unlocked, 0)}>
                  CONTINUE · LEVEL {unlocked + 1}
                </button>
              )}
              <button
                className={`tc-btn w-full ${unlocked > 0 ? 'mt-3 py-2 text-[17px] bg-[#e9e0ff]' : 'mt-4 py-3 text-[22px] bg-[#ffd23f]'}`}
                onClick={() => begin(0, 0)}
              >
                {unlocked > 0 ? 'START FROM LEVEL 1' : 'PLAY'}
              </button>
              <button className="tc-btn mt-3 w-full py-2 text-[16px] bg-[#fff9ef]" onClick={onExit}>
                MAP
              </button>
            </Overlay>
          )}

          {screen === 'clear' && (
            <Overlay>
              <div className="text-[13px] font-semibold tracking-wide text-[#7a5cb0]">LEVEL {lv + 1} · {def.name.toUpperCase()}</div>
              <h2 className="text-[30px] font-bold leading-none mt-1">All folded!</h2>
              <div className="text-[40px] mt-2 leading-none" aria-label={`${result.stars} of 3 stars`}>
                {[0, 1, 2].map((i) => (
                  <span key={i} className="tc-star" style={{
                      animationDelay: `${i * 0.15}s`,
                      color: i < result.stars ? '#f5b800' : '#d9cfee',
                      WebkitTextStroke: '2px #2b2140',
                    }}>
                    ★
                  </span>
                ))}
              </div>
              <Stats score={hud.score} best={best} newBest={newBest} extra={`Tidy bonus +${result.bonus}`} />
              <button className="tc-btn mt-4 w-full py-3 text-[20px] bg-[#ffd23f]" onClick={() => begin(lv + 1, hud.score)}>
                NEXT LEVEL
              </button>
              <button className="tc-btn mt-3 w-full py-2 text-[16px] bg-[#fff9ef]" onClick={onExit}>
                MAP
              </button>
            </Overlay>
          )}

          {screen === 'over' && (
            <Overlay>
              <div className="text-[13px] font-semibold tracking-wide text-[#c0392b]">THE DOOR WON'T CLOSE</div>
              <h2 className="text-[30px] font-bold leading-none mt-1">Closet overflow!</h2>
              <div className="text-[15px] mt-2 opacity-80">Level {lv + 1}: {def.name}</div>
              <Stats score={hud.score} best={best} newBest={newBest} />
              <button className="tc-btn mt-4 w-full py-3 text-[20px] bg-[#ffd23f]" onClick={() => begin(lv, engineRef.current?.st.startScore ?? 0)}>
                RETRY LEVEL {lv + 1}
              </button>
              <button className="tc-btn mt-3 w-full py-2 text-[16px] bg-[#fff9ef]" onClick={onExit}>
                MAP
              </button>
            </Overlay>
          )}
        </div>
      </div>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[rgba(43,33,64,0.35)] px-5" onPointerDown={(e) => e.stopPropagation()}>
      <div className="tc-card tc-pop w-full max-w-[330px] px-6 py-6 text-center">{children}</div>
    </div>
  );
}

function Stats({ score, best, newBest, extra }: { score: number; best: number; newBest: boolean; extra?: string }) {
  return (
    <div className="mt-4 grid grid-cols-2 gap-2">
      <div className="rounded-xl bg-[#efe6ff] py-2">
        <div className="text-[12px] font-semibold opacity-70">SCORE</div>
        <div className="text-[26px] font-bold tabular-nums leading-tight">{score}</div>
      </div>
      <div className="rounded-xl bg-[#efe6ff] py-2">
        <div className="text-[12px] font-semibold opacity-70">{newBest ? 'NEW BEST!' : 'BEST'}</div>
        <div className={`text-[26px] font-bold tabular-nums leading-tight ${newBest ? 'text-[#c0386a]' : ''}`}>{best}</div>
      </div>
      {extra && <div className="col-span-2 text-[14px] font-semibold text-[#7a5cb0]">{extra}</div>}
    </div>
  );
}
