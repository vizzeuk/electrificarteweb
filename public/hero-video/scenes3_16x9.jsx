// scenes3_16x9.jsx — Scenes 5, 6, 7 para 16:9 (1280x720)

// ─── SCENE 5 — WhatsApp 16:9 ─────────────────────────────────────────────────
// Teléfono centrado con texto a la derecha

function Scene5() {
  const { localTime } = useSprite();
  const fadeIn  = interpolate([0,0.4],[0,1])(localTime);
  const fadeOut = interpolate([6,7],[1,0])(localTime);
  const phoneY  = Math.sin(localTime * 1.3) * 3;
  const phoneIn = interpolate([0.2,1],[60,0],Easing.easeOutCubic)(localTime);
  const phoneOp = interpolate([0.2,1],[0,1])(localTime);
  const notifT  = interpolate([1.8,2.4],[0,1],Easing.easeOutBack)(localTime);
  const notifVisible = localTime > 1.8;
  const shakeT  = localTime>2.4&&localTime<3.2 ? Math.sin((localTime-2.4)*40)*(1-(localTime-2.4)/0.8)*3 : 0;
  const headlineOp = interpolate([3.5,4.5,6,7],[0,1,1,0])(localTime);

  return (
    <div style={{ position:'absolute', inset:0, background:'#000', opacity:fadeIn*fadeOut }}>
      <Particles count={22} seed={5} opacity={0.25} />

      {/* Phone glow */}
      <div style={{ position:'absolute', left:'40%', top:'50%', width:360, height:500, transform:'translate(-50%,-50%)', background:`radial-gradient(ellipse, ${CYAN}2a 0%, transparent 60%)`, filter:'blur(40px)', opacity:phoneOp }} />

      {/* Phone mockup — centrado ligeramente a la izquierda */}
      <div style={{ position:'absolute', left:'calc(40% - 110px)', top:60, transform:`translateY(${phoneIn+phoneY}px) translateX(${shakeT}px)`, width:220, height:440, background:'#1a1a1a', border:'3px solid #2a2a2a', borderRadius:36, overflow:'hidden', opacity:phoneOp, boxShadow:`0 20px 60px rgba(0,0,0,0.6), 0 0 40px ${CYAN}22` }}>
        <div style={{ position:'absolute', left:'50%', top:8, transform:'translateX(-50%)', width:66, height:18, background:'#000', borderRadius:9, zIndex:2 }} />
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg,#0a1a1a 0%,#051010 100%)' }}>
          <div style={{ position:'absolute', top:14, left:18, right:18, display:'flex', justifyContent:'space-between', fontFamily:'SF Mono,monospace', fontSize:9, color:'#fff', fontWeight:600 }}>
            <span>9:41</span><span style={{ opacity:0.8 }}>●●● 76%</span>
          </div>
          <div style={{ position:'absolute', top:42, left:'50%', transform:'translateX(-50%)', opacity:0.4 }}>
            <svg width="14" height="14" viewBox="0 0 14 14">
              <rect x="3" y="6" width="8" height="6" rx="1" fill="none" stroke="#fff" strokeWidth="1"/>
              <path d="M 4.5 6 V 4.5 A 2.5 2.5 0 0 1 9.5 4.5 V 6" fill="none" stroke="#fff" strokeWidth="1"/>
            </svg>
          </div>
          <div style={{ position:'absolute', top:62, left:0, right:0, textAlign:'center', fontFamily:'Space Grotesk,sans-serif', fontSize:54, fontWeight:300, color:'#fff', letterSpacing:'-0.04em' }}>9:41</div>
          <div style={{ position:'absolute', top:118, left:0, right:0, textAlign:'center', fontFamily:'Inter,sans-serif', fontSize:10, color:'rgba(255,255,255,0.7)' }}>lunes 14 de abril</div>
        </div>
        {notifVisible && (
          <div style={{ position:'absolute', left:10, right:10, top:162, padding:10, background:'rgba(40,40,40,0.92)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderRadius:14, border:`1px solid ${CYAN}55`, transform:`translateY(${(1-notifT)*-30}px)`, opacity:notifT, boxShadow:`0 4px 20px rgba(0,0,0,0.5), 0 0 20px ${CYAN}22` }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
              <div style={{ width:18, height:18, background:CYAN, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Space Grotesk,sans-serif', fontSize:10, fontWeight:700, color:'#000' }}>E</div>
              <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, fontWeight:600, color:'#fff', display:'flex', alignItems:'center', gap:3 }}>
                Electrificarte
                <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="5" fill={CYAN}/><path d="M 2.5 5 L 4 6.5 L 7.5 3" stroke="#000" strokeWidth="1.2" fill="none" strokeLinecap="round"/></svg>
              </div>
              <div style={{ marginLeft:'auto', fontFamily:'Inter,sans-serif', fontSize:8, color:'rgba(255,255,255,0.5)' }}>ahora</div>
            </div>
            <div style={{ fontFamily:'Inter,sans-serif', fontSize:10, fontWeight:600, color:'#fff', marginBottom:3 }}>¡Tu oferta está lista!</div>
            <div style={{ fontFamily:'Inter,sans-serif', fontSize:9, color:'rgba(255,255,255,0.75)', lineHeight:1.35 }}>Encontramos una mejor oferta para tu MG ZS EV. Revísala antes que expire.</div>
          </div>
        )}
      </div>

      {/* Texto derecha */}
      <div style={{ position:'absolute', left:'calc(40% + 150px)', top:'50%', transform:'translateY(-50%)', maxWidth:420, opacity:headlineOp }}>
        <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:CYAN, letterSpacing:'0.2em', marginBottom:16, opacity:0.8 }}>— NOTIFICACIÓN</div>
        <div style={{ fontFamily:'Space Grotesk,sans-serif', fontWeight:600, fontSize:32, color:'#fff', lineHeight:1.15, letterSpacing:'-0.02em', marginBottom:20 }}>
          Te avisamos por WhatsApp<br/>
          <span style={{ color:CYAN }}>cuando tu oferta esté lista.</span>
        </div>
        <div style={{ fontFamily:'Inter,sans-serif', fontSize:14, color:'rgba(255,255,255,0.55)', lineHeight:1.6 }}>
          Entre 48 y 96 horas después de tu solicitud, recibirás una notificación directa con la mejor oferta del mercado.
        </div>
      </div>
    </div>
  );
}

// ─── SCENE 6 — Bifurcación 16:9 ──────────────────────────────────────────────
// Left/right en vez de top/bottom — más natural en pantalla ancha

function Scene6() {
  const { localTime } = useSprite();
  const fadeIn  = interpolate([0,0.4],[0,1])(localTime);
  const fadeOut = interpolate([9,10],[1,0])(localTime);

  // Divisor vertical aparece desde el centro
  const dividerH = interpolate([0.3,1.2],[0,H],Easing.easeInOutCubic)(localTime);

  // Lado izquierdo (acepta) — empieza en 1s
  const leftCheckT  = interpolate([1.0,1.8],[0,1],Easing.easeOutBack)(localTime);
  const leftTextOp  = interpolate([1.8,2.5],[0,1])(localTime);
  const coinsT      = Math.max(0, localTime - 3.0);

  // Lado derecho (rechaza) — empieza en 1.5s
  const rightXT     = interpolate([1.5,2.3],[0,1],Easing.easeOutBack)(localTime);
  const rightTextOp = interpolate([2.3,3.0],[0,1])(localTime);

  return (
    <div style={{ position:'absolute', inset:0, background:'#000', opacity:fadeIn*fadeOut }}>
      <Particles count={14} seed={6} opacity={0.18} />

      {/* Divisor vertical central */}
      <div style={{ position:'absolute', left:'50%', top:`calc(50% - ${dividerH/2}px)`, width:1, height:dividerH, background:`linear-gradient(to bottom, transparent, ${CYAN} 20%, ${CYAN} 80%, transparent)`, transform:'translateX(-0.5px)', boxShadow:`0 0 12px ${CYAN}` }} />

      {/* LADO IZQUIERDO — ACEPTA */}
      <div style={{ position:'absolute', left:0, top:0, width:'50%', height:H, padding:'60px 60px 40px 80px', boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'center' }}>
        <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:`rgba(0,229,229,0.7)`, letterSpacing:'0.2em', marginBottom:24, opacity:leftTextOp }}>→ SI ACEPTAS</div>

        {/* Check */}
        <div style={{ width:72, height:72, borderRadius:'50%', background:`${CYAN}22`, border:`2px solid ${CYAN}`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24, transform:`scale(${leftCheckT})`, boxShadow:leftCheckT>0?`0 0 30px ${CYAN}55`:'none' }}>
          <svg width="38" height="38" viewBox="0 0 38 38">
            <path d="M 9 19 L 16 26 L 29 12" stroke={CYAN} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="34" strokeDashoffset={34*(1-leftCheckT)}/>
          </svg>
        </div>

        <div style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:28, fontWeight:700, color:'#fff', letterSpacing:'-0.02em', marginBottom:8, opacity:leftTextOp }}>Aceptas la oferta.</div>

        {/* Refund box */}
        <div style={{ marginTop:24, padding:20, border:`1px solid ${CYAN}44`, borderRadius:16, background:`${CYAN}08`, opacity:interpolate([2.8,3.5],[0,1])(localTime), position:'relative', overflow:'hidden', maxWidth:380 }}>
          <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:'rgba(255,255,255,0.5)', letterSpacing:'0.15em', marginBottom:8 }}>TE DEVOLVEMOS</div>
          <div style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:44, fontWeight:700, color:CYAN, letterSpacing:'-0.03em', lineHeight:1, textShadow:`0 0 20px ${CYAN}55` }}>$19.990</div>
          <div style={{ fontFamily:'Inter,sans-serif', fontSize:13, color:'rgba(255,255,255,0.6)', marginTop:6 }}>a tu medio de pago.</div>

          {/* Monedas */}
          {coinsT>0 && [0,1,2,3,4].map(i => {
            const delay=i*0.15, t=Math.max(0,coinsT-delay);
            if (t===0) return null;
            const prog=Math.min(1,t/1.8);
            const y=interpolate([0,1],[80,-20],Easing.easeOutQuad)(prog);
            const x=30+i*48+Math.sin(t*3+i)*6;
            const op=prog<0.1?prog*10:prog>0.85?(1-prog)*6.67:1;
            return <div key={i} style={{ position:'absolute', left:x, bottom:y, width:18, height:18, borderRadius:'50%', background:`radial-gradient(circle at 30% 30%,${CYAN},${TEAL})`, boxShadow:`0 0 8px ${CYAN}`, opacity:op, transform:`rotateY(${t*360}deg)`, border:`1px solid ${CYAN}` }} />;
          })}
        </div>

        {/* Video line */}
        <div style={{ marginTop:16, display:'flex', alignItems:'center', gap:10, fontFamily:'Inter,sans-serif', fontSize:13, color:'rgba(255,255,255,0.75)', opacity:interpolate([4.5,5.2],[0,1])(localTime) }}>
          <svg width="16" height="16" viewBox="0 0 14 14">
            <rect x="1.5" y="3" width="9" height="8" rx="1.5" fill="none" stroke={CYAN} strokeWidth="1"/>
            <path d="M 10.5 6 L 12.5 5 L 12.5 9 L 10.5 8 Z" fill={CYAN}/>
          </svg>
          <span>+ Comparte tu experiencia en video.</span>
        </div>
      </div>

      {/* LADO DERECHO — RECHAZA */}
      <div style={{ position:'absolute', right:0, top:0, width:'50%', height:H, padding:'60px 80px 40px 60px', boxSizing:'border-box', display:'flex', flexDirection:'column', justifyContent:'center' }}>
        <div style={{ fontFamily:'JetBrains Mono,monospace', fontSize:10, color:'rgba(255,255,255,0.4)', letterSpacing:'0.2em', marginBottom:24, opacity:rightTextOp }}>→ SI NO TE CONVENCE</div>

        {/* X */}
        <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(255,255,255,0.05)', border:'1.5px solid rgba(255,255,255,0.3)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:24, transform:`scale(${rightXT})` }}>
          <svg width="28" height="28" viewBox="0 0 28 28">
            <path d="M 8 8 L 20 20 M 20 8 L 8 20" stroke="rgba(255,255,255,0.55)" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="34" strokeDashoffset={34*(1-rightXT)}/>
          </svg>
        </div>

        <div style={{ fontFamily:'Space Grotesk,sans-serif', fontSize:26, fontWeight:600, color:'rgba(255,255,255,0.85)', letterSpacing:'-0.02em', marginBottom:12, opacity:rightTextOp }}>No era lo que buscabas.</div>

        <div style={{ fontFamily:'Inter,sans-serif', fontSize:15, color:'rgba(255,255,255,0.55)', lineHeight:1.6, maxWidth:360, opacity:interpolate([3.2,4],[0,1])(localTime) }}>
          Sin problema. Puedes volver a cotizar cuando quieras, pagando nuevamente los $19.990.
        </div>

      </div>
    </div>
  );
}

// ─── SCENE 7 — Cierre 16:9 ───────────────────────────────────────────────────
// Logo centrado, tagline y CTA — todo en el centro con más espacio

function Scene7() {
  const { localTime } = useSprite();
  const fadeIn    = interpolate([0,0.6],[0,1])(localTime);
  const fadeToEnd = interpolate([6.8,8],[1,0])(localTime);
  const logoT     = interpolate([0.3,1.4],[0,1],Easing.easeOutCubic)(localTime);
  const logoScale = 0.85 + 0.15*logoT;
  const taglineOp = interpolate([1.6,2.4],[0,1])(localTime);
  const ctaOp     = interpolate([2.6,3.3],[0,1])(localTime);
  const pulseScale= 1 + Math.sin(localTime*3)*0.02;
  const dissolve  = interpolate([5.5,6.8],[0,1])(localTime);

  return (
    <div style={{ position:'absolute', inset:0, background:'#000', opacity:fadeIn*fadeToEnd }}>
      {!dissolve && <Particles count={30} seed={7} opacity={0.28} />}
      {dissolve>0 && <Particles count={50} seed={8} opacity={0.45*(1-dissolve)} />}

      {/* Halo central */}
      <div style={{ position:'absolute', left:'50%', top:'46%', transform:'translate(-50%,-50%)', width:600, height:600, background:`radial-gradient(circle,${CYAN}3a 0%,${CYAN}0d 30%,transparent 65%)`, filter:'blur(24px)', opacity:logoT }} />

      {/* Logo + wordmark */}
      <div style={{ position:'absolute', left:'50%', top:'40%', transform:`translate(-50%,-50%) scale(${logoScale})`, textAlign:'center', opacity:logoT }}>
        <div style={{ width:220, height:220, margin:'0 auto 8px' }}>
          <img src="/logos-electrificarte/electrificarte-logo.png" style={{ width:'100%', height:'100%', objectFit:'contain', filter:`drop-shadow(0 0 20px $${CYAN}55)` }} />
        </div>
      </div>

      {/* Tagline */}
      <div style={{ position:'absolute', left:0, right:0, top:'60%', textAlign:'center', fontFamily:'Space Grotesk,sans-serif', fontSize:24, fontWeight:500, color:'rgba(255,255,255,0.85)', lineHeight:1.25, letterSpacing:'-0.02em', opacity:taglineOp }}>
        El precio que mereces,{' '}
        <span style={{ color:CYAN, fontWeight:600 }}>sin negociar solo.</span>
      </div>

      {/* CTA */}
      <div style={{ position:'absolute', left:'50%', top:'76%', transform:`translateX(-50%) scale(${pulseScale})`, padding:'16px 40px', background:CYAN, color:'#000', fontFamily:'Space Grotesk,sans-serif', fontSize:16, fontWeight:700, borderRadius:999, letterSpacing:'-0.01em', opacity:ctaOp, boxShadow:`0 0 ${20+Math.sin(localTime*3)*8}px ${CYAN}`, whiteSpace:'nowrap' }}>
        electrificarte.com →
      </div>

      {/* Footer */}
      <div style={{ position:'absolute', left:80, right:80, bottom:36, display:'flex', justifyContent:'space-between', fontFamily:'JetBrains Mono,monospace', fontSize:10, color:'rgba(255,255,255,0.3)', letterSpacing:'0.15em', textTransform:'uppercase', opacity:ctaOp }}>
        <span>MARKETPLACE EV</span>
        <span>CHILE · 2026</span>
      </div>
    </div>
  );
}

Object.assign(window, { Scene5, Scene6, Scene7 });
