// scenes_16x9.jsx — Scene1 + helpers para formato 16:9 (1280x720)

const CYAN  = '#00E5E5';
const TEAL  = '#006A61';
const AMBER = '#FFC349';
const W = 1280;
const H = 720;

function Particles({ count = 24, seed = 1, color = CYAN, opacity = 0.35 }) {
  const t = useTime();
  const rng = (i) => { const s = Math.sin((i+1)*9301+seed*49297)*233280; return s-Math.floor(s); };
  const dots = [];
  for (let i = 0; i < count; i++) {
    const baseX=rng(i)*W, baseY=rng(i+100)*H, drift=rng(i+200)*40+10, speed=rng(i+300)*0.6+0.2;
    const size=rng(i+400)*2.4+0.8, phase=rng(i+500)*Math.PI*2;
    const x=baseX+Math.sin(t*speed+phase)*drift, y=baseY+Math.cos(t*speed*0.7+phase)*drift*0.6;
    const blink=0.4+0.6*(0.5+0.5*Math.sin(t*2+phase));
    dots.push(<div key={i} style={{ position:'absolute', left:x, top:y, width:size, height:size, borderRadius:'50%', background:color, opacity:opacity*blink, boxShadow:`0 0 ${size*4}px ${color}`, pointerEvents:'none' }} />);
  }
  return <>{dots}</>;
}

function SceneLabel({ num, title }) {
  return (
    <div style={{ position:'absolute', top:24, left:32, display:'flex', alignItems:'center', gap:8, fontFamily:'JetBrains Mono,monospace', fontSize:10, color:'rgba(255,255,255,0.35)', letterSpacing:'0.18em', textTransform:'uppercase', zIndex:50 }}>
      <div style={{ width:4, height:4, borderRadius:2, background:CYAN, boxShadow:`0 0 8px ${CYAN}` }} />
      <span>{String(num).padStart(2,'0')} · {title}</span>
    </div>
  );
}

function ProgressTick({ currentScene }) {
  return (
    <div style={{ position:'absolute', top:24, right:32, display:'flex', gap:4, zIndex:50 }}>
      {Array.from({length:7}).map((_,i) => (
        <div key={i} style={{ width:i===currentScene?20:8, height:2, borderRadius:1, background:i<=currentScene?CYAN:'rgba(255,255,255,0.2)', transition:'width 300ms,background 300ms' }} />
      ))}
    </div>
  );
}

function Typewriter({ text, speed=0.04, style, startDelay=0 }) {
  const { localTime } = useSprite();
  const t = Math.max(0, localTime - startDelay);
  const chars = Math.floor(t / speed);
  const visible = text.slice(0, Math.min(chars, text.length));
  return (
    <span style={style}>
      {visible}
      {chars < text.length + 4 && <span style={{ opacity:Math.sin(localTime*8)>0?1:0, color:CYAN, marginLeft:2 }}>|</span>}
    </span>
  );
}

// ─── SCENE 1 — Apertura 16:9 ────────────────────────────────────────────────
// Auto en mitad derecha, headline en mitad izquierda

function Scene1() {
  const { localTime } = useSprite();
  const fadeIn = interpolate([0,0.6],[0,1],Easing.easeOutCubic)(localTime);
  const carX = interpolate([0,2.0,2.8,5.2,5.6],[W+400,W*0.36,W*0.32,W*0.30,W+200],[Easing.easeOutCubic,Easing.easeOutQuad,Easing.linear,Easing.easeInCubic])(localTime);
  const carScale = interpolate([2.0,3.5,5.5],[1,1.06,1.1],Easing.easeInOutCubic)(localTime);

  return (
    <div style={{ position:'absolute', inset:0, background:'#000', opacity:fadeIn }}>
      <Particles count={40} seed={1} opacity={0.35} />
      <div style={{ position:'absolute', left:'52%', top:'55%', width:900, height:320, transform:'translate(-50%,-50%)', background:`radial-gradient(ellipse, ${CYAN}1a 0%, transparent 60%)`, filter:'blur(40px)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', left:carX, top:'50%', transform:`translateY(-54%) scale(${carScale})`, transformOrigin:'center' }}>
        <CarSilhouette />
      </div>
      <div style={{ position:'absolute', left:0, right:0, top:'60%', height:1, background:`linear-gradient(to right, transparent, ${CYAN}44, transparent)`, opacity:interpolate([1.2,2.2],[0,1])(localTime) }} />
      <div style={{ position:'absolute', left:80, top:'50%', transform:'translateY(-50%)', opacity:interpolate([0.6,1.4],[0,1],Easing.easeOutCubic)(localTime), maxWidth:520 }}>
        <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:11, color:CYAN, letterSpacing:'0.25em', textTransform:'uppercase', marginBottom:20, opacity:0.8 }}>— MARKETPLACE EV · CHILE</div>
        <div style={{ fontFamily:'Space Grotesk,sans-serif', fontWeight:700, fontSize:58, lineHeight:1.0, color:'#fff', letterSpacing:'-0.03em' }}>
          <Typewriter text="¿Buscas tu auto eléctrico ideal?" speed={0.038} startDelay={0.6} />
        </div>
      </div>
    </div>
  );
}

function CarSilhouette() {
  // SVG original escalado 2× para 16:9 (340×160 → 680×320)
  return (
    <svg width="680" height="320" viewBox="0 0 340 160" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="carBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1a1a" />
          <stop offset="50%" stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>
        <linearGradient id="carHighlight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#00E5E5" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#00E5E5" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="headlight" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="40%" stopColor="#00E5E5" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#00E5E5" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ground shadow */}
      <ellipse cx="170" cy="135" rx="140" ry="8" fill="#000" opacity="0.6" />
      <ellipse cx="170" cy="135" rx="100" ry="4" fill={CYAN} opacity="0.25" />

      {/* body */}
      <path
        d="M 20 110 Q 35 95 70 88 Q 90 70 130 62 Q 170 56 210 58 Q 250 62 280 80 Q 305 92 320 108 L 320 120 L 20 120 Z"
        fill="url(#carBody)" stroke="#333" strokeWidth="0.5"
      />
      {/* roof line highlight */}
      <path
        d="M 70 88 Q 90 70 130 62 Q 170 56 210 58 Q 250 62 280 80"
        fill="none" stroke="url(#carHighlight)" strokeWidth="1.5" opacity="0.7"
      />
      {/* windows */}
      <path
        d="M 95 80 Q 110 70 140 66 Q 170 62 200 64 Q 230 68 255 82 L 250 95 L 100 95 Z"
        fill="#000" stroke={CYAN} strokeWidth="0.5" opacity="0.85"
      />
      {/* side strip */}
      <line x1="50" y1="110" x2="300" y2="110" stroke={CYAN} strokeWidth="0.6" opacity="0.4" />

      {/* wheels */}
      <circle cx="75"  cy="125" r="16" fill="#0a0a0a" stroke="#444" strokeWidth="1" />
      <circle cx="75"  cy="125" r="8"  fill="#1a1a1a" stroke={CYAN} strokeWidth="0.5" opacity="0.7" />
      <circle cx="265" cy="125" r="16" fill="#0a0a0a" stroke="#444" strokeWidth="1" />
      <circle cx="265" cy="125" r="8"  fill="#1a1a1a" stroke={CYAN} strokeWidth="0.5" opacity="0.7" />

      {/* headlight */}
      <circle cx="315" cy="98" r="20" fill="url(#headlight)" />
      <circle cx="315" cy="98" r="3"  fill="#fff" />
    </svg>
  );
}
function MiniCar({ color = '#fff' }) {
  return (
    <svg width="100" height="42" viewBox="0 0 100 42">
      <path d="M 5 30 Q 12 22 26 18 Q 36 12 50 11 Q 64 12 74 18 Q 88 22 95 30 L 95 34 L 5 34 Z" fill={color} opacity="0.85"/>
      <path d="M 27 20 Q 36 15 50 14 Q 64 15 73 20 L 70 26 L 30 26 Z" fill="#000" opacity="0.5"/>
      <circle cx="24" cy="34" r="4.5" fill="#0a0a0a" stroke={color} strokeWidth="0.5"/>
      <circle cx="76" cy="34" r="4.5" fill="#0a0a0a" stroke={color} strokeWidth="0.5"/>
    </svg>
  );
}

Object.assign(window, { Scene1, Particles, SceneLabel, ProgressTick, Typewriter, MiniCar, CarSilhouette, CYAN, TEAL, AMBER, W, H });
