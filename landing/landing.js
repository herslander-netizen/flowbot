const $=(s,r=document)=>r.querySelector(s),$$=(s,r=document)=>[...r.querySelectorAll(s)];
const RM=matchMedia('(prefers-reduced-motion: reduce)').matches,mob=()=>innerWidth<860;

/* ── formas: FlowBot (asterisco), Recepcionista (balão), Qualificador (estrela), Passador (avião), Guardião (coração), raio para agentes novos ── */
const arms=(n,L)=>{let d='';for(let i=0;i<n;i++){const a=-Math.PI/2+i*2*Math.PI/n;d+=`M50,52 L${(50+L*Math.cos(a)).toFixed(2)},${(52+L*Math.sin(a)).toFixed(2)} `}return d};
const starD=(()=>{let q='';for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?20:42;q+=(i?'L':'M')+(50+r*Math.cos(a)).toFixed(2)+','+(54+r*Math.sin(a)).toFixed(2)}return q+'Z'})();
const SHAPES=[
  {f:`<path d="${arms(6,36)}" fill="none" stroke="%c" stroke-width="30" stroke-linecap="round"/><circle cx="50" cy="52" r="28" fill="%c"/>`,ex:50,ey:50},
  {f:`<path d="M12,48C12,25 29,11 50,11C71,11 88,25 88,48C88,70 71,83 50,83C44,83 38,82 33,80L17,90L21,71C15,65 12,57 12,48Z" fill="%c"/>`,ex:50,ey:46},
  {f:`<path d="${starD}" fill="%c" stroke="%c" stroke-width="12" stroke-linejoin="round"/>`,ex:50,ey:54},
  {f:`<path d="M12,50 L88,18 L64,86 L48,60 Z" fill="%c" stroke="%c" stroke-width="12" stroke-linejoin="round"/>`,ex:50,ey:46},
  {f:`<path d="M50,86 C20,64 12,48 16,34 C20,20 38,16 50,30 C62,16 80,20 84,34 C88,48 80,64 50,86 Z" fill="%c" stroke="%c" stroke-width="10" stroke-linejoin="round"/>`,ex:50,ey:46},
  {f:`<path d="M58,10 L22,58 L46,58 L40,92 L78,42 L54,42 Z" fill="%c" stroke="%c" stroke-width="10" stroke-linejoin="round"/>`,ex:50,ey:48}];
const frag=(i,c)=>SHAPES[i].f.replaceAll('%c',c);
const eyeT=i=>`translate(${SHAPES[i].ex-50} ${SHAPES[i].ey-48})`;
let MID=0;
const lum=h=>{const n=parseInt(h.slice(1),16),f=c=>{c/=255;return c<=.03928?c/12.92:((c+.055)/1.055)**2.4};return .2126*f(n>>16&255)+.7152*f(n>>8&255)+.0722*f(n&255)};
const eyeFor=c=>lum(c)>.42?'#0B0B0B':'#FFFFFF';
const TEAM=[{shape:0,color:'#FF6B2C'},{shape:1,color:'#38BDF8'},{shape:2,color:'#FACC15'},{shape:3,color:'#34D399'},{shape:4,color:'#EF4444'}];
const NOVO={shape:5,color:'#A78BFA'};
const svgBot=(shape,color,eyes='dot')=>{const m='sb'+(MID++),e=eyeFor(color);return `<svg viewBox="0 0 100 100" aria-hidden="true"><defs><mask id="${m}" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">${frag(shape,'#fff')}</mask></defs><g mask="url(#${m})"><rect x="-4" y="-4" width="108" height="108" fill="${color}"/><rect x="-4" y="-4" width="108" height="108" fill="url(#botSh)"/><rect x="-4" y="-4" width="108" height="108" fill="url(#botHi)"/></g><g transform="${eyeT(shape)}">${eyes==='arc'?`<path d="M35,53q6,-14 12,0M53,53q6,-14 12,0" fill="none" stroke="${e}" stroke-width="5.6" stroke-linecap="round"/>`:`<circle cx="41" cy="48" r="4.8" fill="${e}"/><circle cx="59" cy="48" r="4.8" fill="${e}"/>`}</g></svg>`};
/* boina de patente: o desenho é sempre o mesmo, só a cor muda */
const PATENTES=[null,['branca','#F1EEE7'],['cinza','#8E939C'],['azul-marinho','#24408E'],['verde-musgo','#2F6B45'],['vinho','#8C1F3D'],['preta','#1C1C20']];
const CAP=[[46,17,-11,.8],[45,17,-11,.9],[48,20,-11,.72],[70,23,-24,.6],[34,22,-18,.56],[56,19,-14,.62]];
const mixHex=(h,t,a)=>{const p=x=>parseInt(x,16),c=[1,3,5].map(i=>p(h.substr(i,2))),d=[1,3,5].map(i=>p(t.substr(i,2)));return '#'+c.map((v,i)=>Math.round(v+(d[i]-v)*a).toString(16).padStart(2,'0')).join('')};
const BOINA_D='M-46,3 C-47,-12 -24,-22 0,-22 C26,-22 46,-13 46,0 C46,10 25,15 0,15 C-26,15 -45,12 -46,3 Z';
const boinaG=(c,shape,maskId)=>{const [x,y,r,k]=CAP[shape],rim=mixHex(c,'#000000',.28),bal=mixHex(c,'#000000',.08);
  return `<g mask="url(#${maskId})"><ellipse cx="${x+3}" cy="${y+13*k}" rx="${38*k}" ry="${6*k}" fill="#000" fill-opacity=".22" filter="url(#capBlur)" transform="rotate(${r} ${x} ${y})"/></g><g transform="translate(${x} ${y}) rotate(${r}) scale(${k})"><path d="${BOINA_D}" fill="${c}"/><path d="M-45,5 C-36,11 -16,13.5 0,13.5 C22,13.5 40,9 45.5,3 C45,10 25,15 0,15 C-26,15 -43,12 -45,5 Z" fill="${rim}" opacity=".9"/><path d="${BOINA_D}" fill="url(#botSh)"/><path d="${BOINA_D}" fill="url(#capHi)"/><path d="M3,-21.5 L3.6,-25" stroke="${rim}" stroke-width="3.4" stroke-linecap="round"/><circle cx="4" cy="-28.4" r="5.2" fill="${bal}"/><circle cx="4" cy="-28.4" r="5.2" fill="url(#botHi)"/></g>`};
$('#logoG').outerHTML=svgBot(0,'#FF6B2C','arc');
$('#phAv').innerHTML=svgBot(1,'#38BDF8');
addEventListener('scroll',()=>$('#nav').classList.toggle('lit',scrollY>40),{passive:true});

/* ── motor: posição, giro, quique, olhar ── */
const Ez={out:t=>1-Math.pow(1-t,3),inOut:t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,
  bounce:t=>{const n=7.5625,d=2.75;return t<1/d?n*t*t:t<2/d?n*(t-=1.5/d)*t+.75:t<2.5/d?n*(t-=2.25/d)*t+.9375:n*(t-=2.625/d)*t+.984375}};
const ALL=[];
class Stage{constructor(el){this.el=el;this.run=0;this.lean=false;this.bots=[];this.layer=document.createElement('div');this.layer.className='fxl';el.appendChild(this.layer)}
  add(spec){const i=ALL.length,el=document.createElement('div'),c=spec.color;el.className='fxb';el.dataset.eye='dot';el.setAttribute('aria-hidden','true');
    el.style.cssText=`--c:${c};--e:${eyeFor(c)};--bd:-${(i*1.7%4).toFixed(2)}s`;
    const m='mb'+(MID++);
    el.innerHTML=`<div class="sq"><svg viewBox="0 0 100 100"><defs><mask id="${m}" maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">${frag(spec.shape,'#fff')}</mask></defs><g mask="url(#${m})"><rect class="body" x="-4" y="-4" width="108" height="108"/><rect x="-4" y="-4" width="108" height="108" fill="url(#botSh)"/><rect x="-4" y="-4" width="108" height="108" fill="url(#botHi)"/></g><g class="ew" transform="${eyeT(spec.shape)}"><g class="eyes"><g class="e-arc"><path d="M35,53q6,-14 12,0"/><path d="M53,53q6,-14 12,0"/></g><g class="e-dot"><circle cx="41" cy="48" r="4.8"/><circle cx="59" cy="48" r="4.8"/></g><g class="e-wide"><circle cx="41" cy="47" r="6.4"/><circle cx="59" cy="47" r="6.4"/></g><g class="e-flat"><path d="M35,50h12"/><path d="M53,50h12"/></g></g></g><g class="hat"></g></svg></div>`;
    this.layer.appendChild(el);const b={el,sq:el.firstChild,x:0,y:0,sc:.5,rot:0,op:0,lean:0,st:this};el.onclick=()=>{hop(b,46);flash(b,'arc',700)};this.bots.push(b);ALL.push(b);return b}
  P(t,ax=.5,ay=0){const r=t.getBoundingClientRect(),s=this.el.getBoundingClientRect();return [r.left-s.left+r.width*ax,r.top-s.top+r.height*ay]}
  seats(card,bots,size=72){const r=card.getBoundingClientRect(),s=this.el.getBoundingClientRect(),n=bots.length,step=Math.min(size*1.08,r.width/(n+.4));
    return bots.map((b,k)=>({x:r.left-s.left+r.width/2+(k-(n-1)/2)*step,y:r.top-s.top-size/2+size*.2,sc:size/160}))}}
function apply(b){b.el.style.transform=`translate(${b.x.toFixed(1)}px,${b.y.toFixed(1)}px) translate(-50%,-50%) rotate(${(b.rot+b.lean).toFixed(2)}deg) scale(${b.sc.toFixed(4)})`;b.el.style.opacity=b.op}
const eye=(b,k)=>{b.el.dataset.eye=k};
function flash(b,k,ms){eye(b,k);setTimeout(()=>{if(b.el.dataset.eye===k)eye(b,'dot')},ms)}
function hop(b,h=40,ms=440){if(RM)return;b.sq.animate([{transform:'none'},{transform:'scale(1.13,.85)',offset:.14},{transform:`translateY(${-h}px) scale(.93,1.09)`,offset:.5},{transform:'scale(1.1,.9)',offset:.86},{transform:'none'}],{duration:ms,easing:'ease-out'})}
function squash(b,k=1){if(RM)return;b.sq.animate([{transform:'none'},{transform:`scale(${1+.2*k},${1-.22*k})`,offset:.3},{transform:`scale(${1-.05*k},${1+.07*k})`,offset:.65},{transform:'none'}],{duration:300,easing:'ease-out'})}
function tween(b,to,ms,ease=Ez.out,lift=0){const st=b.st,run=st.run,from={};for(const k in to)from[k]=b[k];
  return new Promise(res=>{const t0=performance.now();(function step(now){if(run!==st.run)return res();const t=RM?1:Math.max(0,Math.min(1,(now-t0)/ms));
    for(const k in to){const e=typeof ease==='function'?ease:(ease[k]||ease.def);b[k]=from[k]+(to[k]-from[k])*e(t)}if(lift&&'y' in to)b.y-=Math.sin(Math.PI*Ez.inOut(t))*lift;apply(b);t<1?requestAnimationFrame(step):res()})(t0)})}
const wait=ms=>new Promise(r=>setTimeout(r,RM?0:ms));
function anim(el,kf,o){return el.animate(kf,{fill:'forwards',easing:'cubic-bezier(.32,.72,0,1)',...o,duration:RM?1:o.duration,delay:RM?0:(o.delay||0)}).finished.catch(()=>{})}
function ring(st,x,y,color='#FF6B2C'){if(RM)return;const r=document.createElement('div');r.className='ring';r.style.borderColor=color;st.layer.appendChild(r);
  r.animate([{transform:`translate(${x}px,${y}px) scale(.2)`,opacity:.9},{transform:`translate(${x}px,${y}px) scale(1.6)`,opacity:0}],{duration:800,easing:'cubic-bezier(.2,.7,.2,1)'}).onfinish=()=>r.remove()}
function burst(st,x,y,n=30,power=1,cols){if(RM)return;for(let i=0;i<n;i++){const p=document.createElement('div'),c=cols?cols[i%cols.length]:TEAM[i%5].color,s=6+Math.random()*9,round=Math.random()<.5;
  p.className='bit';p.style.cssText=`width:${s}px;height:${round?s:s*.45}px;background:${c};border-radius:${round?'50%':'2px'}`;st.layer.appendChild(p);
  const a=-Math.PI/2+(Math.random()-.5)*Math.PI*1.5,v=(120+Math.random()*260)*power,dx=Math.cos(a)*v,dy=Math.sin(a)*v,rot=(Math.random()-.5)*900;
  p.animate([{transform:`translate(${x}px,${y}px) rotate(0)`,opacity:1},{transform:`translate(${x+dx*.75}px,${y+dy}px) rotate(${rot*.6}deg)`,opacity:1,offset:.45,easing:'ease-in'},{transform:`translate(${x+dx}px,${y+dy+240+Math.random()*180}px) rotate(${rot}deg)`,opacity:0}],{duration:1300+Math.random()*700,easing:'cubic-bezier(.1,.7,.3,1)'}).onfinish=()=>p.remove()}}
function say(b,text,ms=2200){const st=b.st,el=document.createElement('div');el.className='bub';el.textContent=text;st.layer.appendChild(el);
  const w=el.offsetWidth,W=st.el.clientWidth,x=Math.max(8,Math.min(W-w-8,b.x-w/2)),y=b.y-b.sc*80-el.offsetHeight-10;
  el.animate([{transform:`translate(${x}px,${y+10}px) scale(.8)`,opacity:0},{transform:`translate(${x}px,${y}px) scale(1)`,opacity:1}],{duration:RM?1:380,fill:'forwards',easing:'cubic-bezier(.34,1.56,.64,1)'});
  setTimeout(()=>{el.animate([{opacity:1},{opacity:0}],{duration:250,fill:'forwards'}).onfinish=()=>el.remove()},ms);hop(b,22,360);flash(b,'arc',ms)}
function lookAt(cx,cy,only){for(const b of only||ALL){const s=b.st.el.getBoundingClientRect(),dx=cx-(s.left+b.x),dy=cy-(s.top+b.y-b.sc*8),d=Math.hypot(dx,dy)||1,k=Math.min(1,d/170);
  b.el.style.setProperty('--lx',(dx/d*k).toFixed(2));b.el.style.setProperty('--ly',(dy/d*k).toFixed(2));const l=b.st.lean?dx/d*k*5:0;if(l!==b.lean){b.lean=l;apply(b)}}}
let typing=false;addEventListener('pointermove',e=>{if(!typing)lookAt(e.clientX,e.clientY)},{passive:true});
const seen=(el,fn,th=.3)=>{const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.disconnect();fn()}}),{threshold:th});io.observe(el)};
$$('.rv').forEach(e=>seen(e,()=>e.classList.add('on'),.2));
async function dropOn(st,bots,seats,ms=860){const W=st.el.clientWidth;bots.forEach((b,i)=>{const s=i%2?1:-1;Object.assign(b,{x:seats[i].x+s*W*.3,y:seats[i].y-380,sc:seats[i].sc,rot:s*-380,op:1});eye(b,'wide');apply(b)});
  await Promise.all(bots.map((b,i)=>(async()=>{await wait(i*120);setTimeout(()=>squash(b,1),ms*.364);await tween(b,{x:seats[i].x,y:seats[i].y,rot:0},ms,{y:Ez.bounce,def:Ez.out});eye(b,'dot')})()))}

/* ── cena 1: caem rolando, quicam no cartão e a frase nasce ── */
(()=>{const st=new Stage($('#hero')),bots=TEAM.map(s=>st.add(s)),card=$('#acc'),h1=$('#h1');
  h1.innerHTML=['Teste ','a ','conversa','<br>','antes ','do ','cliente.'].map(w=>w==='<br>'?w:`<span aria-hidden="true">${w}</span>`).join('');
  const size=()=>mob()?56:74;let seated=false;
  const reseat=()=>{if(!seated)return;st.seats(card,bots,size()).forEach((s,i)=>{Object.assign(bots[i],s);apply(bots[i])})};
  async function play(){const W=st.el.clientWidth;
    await Promise.race([wait(900),anim(card,[{opacity:0,transform:'translateY(46px) scale(.97)'},{opacity:1,transform:'none'}],{duration:640,easing:'cubic-bezier(.34,1.3,.64,1)'})]);
    card.getAnimations().forEach(a=>a.cancel());card.style.opacity=1;await wait(60);const seats=st.seats(card,bots,size());
    bots.forEach((b,i)=>{const s=i%2?1:-1;Object.assign(b,{x:seats[i].x+s*W*.42,y:-140,sc:seats[i].sc,rot:s*-460,op:1});eye(b,'wide');apply(b)});
    await Promise.all([2,0,4,1,3].map((i,n)=>(async()=>{const b=bots[i];await wait(n*150);setTimeout(()=>squash(b,1),980*.364);setTimeout(()=>squash(b,.5),980*.727);
      await tween(b,{x:seats[i].x,y:seats[i].y,rot:0},980,{y:Ez.bounce,def:Ez.out});eye(b,'dot')})()));
    seated=true;await wait(160);for(const b of bots){hop(b,46,400);flash(b,'arc',520);await wait(95)}
    anim($('.soon'),[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:500});
    $$('span',h1).forEach((s,i)=>anim(s,[{opacity:0,transform:'translateY(.5em) rotate(8deg) scale(.8)'},{opacity:1,transform:'none'}],{duration:620,delay:i*90,easing:'cubic-bezier(.34,1.56,.64,1)'}));
    const p=st.P(h1,.5,.5);setTimeout(()=>{ring(st,p[0],p[1]);burst(st,p[0],p[1],26,.8)},380);
    anim($('#hero .lead'),[{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:600,delay:560});st.lean=true}
  addEventListener('resize',reseat);(document.fonts?.ready||Promise.resolve()).then(()=>setTimeout(play,250))})();

/* ── cena 2: as frases acendem e um agente cinza fica sozinho ── */
(()=>{const st=new Stage($('#dor')),w=$('#dorW'),ps=$$('p',w),floor=$('#dorF');const lone=st.add({shape:0,color:'#4A4744'});
  const place=()=>{const p=st.P(floor,.5,.62),s=mob()?64:80;Object.assign(lone,{x:p[0],y:p[1],sc:s/160});apply(lone)};
  addEventListener('resize',place);
  seen(w,async()=>{for(const p of ps){p.classList.add('on');await wait(p.classList.contains('lead')?200:620)}
    place();lone.op=1;const y=lone.y;lone.y=y-260;eye(lone,'wide');apply(lone);setTimeout(()=>squash(lone,1),760*.364);
    await tween(lone,{y},760,{y:Ez.bounce,def:Ez.out});eye(lone,'flat');lone.st.lean=true;
    await wait(700);$('#dorT').classList.add('on');await wait(500);hop(lone,30,420);flash(lone,'arc',1800)},.35)})();

/* ── cena 3: sentam na caixa, ouvem o pedido e cada um pula para a sua raia ── */
(()=>{const st=new Stage($('#manha')),T=TEAM.slice(1,5),bots=T.map(s=>st.add(s)),[rec,qua,pas,gua]=bots;
  const comp=$('#comp'),tx=$('#compT'),lanes=[$('#l1'),$('#l2'),$('#l3')],size=()=>mob()?54:68;let mode='';
  const blocos=[['Boas-vindas','mensagem','#38BDF8'],['Tipo de vídeo','pergunta','#FACC15'],['Cidade e data','pergunta','#FACC15'],['Equipe','transferência','#34D399']];
  const MSG='Oi! Para preparar o seu orçamento: é <mark>vídeo institucional</mark>, <mark>evento</mark> ou <mark>clipe</mark>? E em qual cidade?';
  const workers=[qua,gua,pas];
  const reseat=()=>{if(mode==='comp')st.seats(comp,bots,size()).forEach((s,i)=>{Object.assign(bots[i],s);apply(bots[i])});
    if(mode==='lanes'){Object.assign(rec,st.seats(comp,[rec],size())[0]);apply(rec);workers.forEach((b,i)=>{Object.assign(b,st.seats(lanes[i],[b],size())[0]);apply(b)})}};
  async function play(){const run=++st.run;mode='';tx.textContent='';comp.classList.remove('sent');$('#again2').classList.remove('on');
    lanes.forEach(l=>{l.getAnimations().forEach(a=>a.cancel());l.style.opacity=0});$('#l1b').innerHTML='';$('#l1n').textContent='';$('#l2m').innerHTML='';
    $('#l2f').getAnimations().forEach(a=>a.cancel());$('#l3r').getAnimations().forEach(a=>a.cancel());
    $('#l3w').innerHTML=['oi','tipo','local','data','equipe'].map(d=>`<div class="day"><i></i>${d}</div>`).join('');
    const W=st.el.clientWidth,seats=st.seats(comp,bots,size());
    bots.forEach((b,i)=>{const s=i%2?1:-1;Object.assign(b,{x:seats[i].x+s*W*.3,y:seats[i].y-360,sc:seats[i].sc,rot:s*-360,op:1});eye(b,'wide');apply(b)});
    await Promise.all(bots.map((b,i)=>(async()=>{await wait(i*120);setTimeout(()=>squash(b,1),820*.364);await tween(b,{x:seats[i].x,y:seats[i].y,rot:0},820,{y:Ez.bounce,def:Ez.out});eye(b,'dot')})()));
    if(run!==st.run)return;mode='comp';st.lean=true;typing=true;
    const text='Quero um atendimento de orçamento para a minha produtora de vídeo';
    for(let i=1;i<=text.length;i++){if(run!==st.run)return;tx.textContent=text.slice(0,i);const r=tx.getBoundingClientRect();lookAt(r.right,r.top+r.height/2,bots);if(i%12===0)reseat();await wait(26+Math.random()*30)}
    typing=false;reseat();await wait(350);if(run!==st.run)return;comp.classList.add('sent');const g=st.P($('.go',comp),.5,.5);ring(st,g[0],g[1],'#F5F5F5');
    bots.forEach((b,i)=>setTimeout(()=>hop(b,34,400),i*70));await wait(520);say(rec,'Deixa com a gente.',1700);await wait(1100);if(run!==st.run)return;
    await Promise.race([wait(1300),Promise.all(lanes.map((l,i)=>anim(l,[{opacity:0,transform:'translateY(40px) scale(.96)'},{opacity:1,transform:'none'}],{duration:600,delay:i*110,easing:'cubic-bezier(.34,1.3,.64,1)'})))]);
    lanes.forEach(l=>{l.getAnimations().forEach(a=>a.cancel());l.style.opacity=1});await wait(60);if(run!==st.run)return;
    await Promise.all(workers.map((b,i)=>(async()=>{await wait(i*170);eye(b,'wide');const s=st.seats(lanes[i],[b],size())[0];await tween(b,s,720,{def:Ez.inOut},150);squash(b,.9);eye(b,'dot');ring(st,s.x,s.y+size()/2,T[[1,3,2][i]].color)})()));
    if(run!==st.run)return;mode='lanes';
    (async()=>{qua.el.classList.add('think');for(let i=0;i<blocos.length;i++){if(run!==st.run)return;const d=document.createElement('div');d.className='co';d.style.setProperty('--c',blocos[i][2]);d.innerHTML=`<i></i>${blocos[i][0]}<span>${blocos[i][1]}</span>`;$('#l1b').appendChild(d);
        anim(d,[{opacity:0,transform:'translateY(12px) scale(.94)'},{opacity:1,transform:'none'}],{duration:420,easing:'cubic-bezier(.34,1.56,.64,1)'});$('#l1n').textContent=(i+1)+(i?' blocos':' bloco');hop(qua,14,260);await wait(520)}
      qua.el.classList.remove('think');flash(qua,'arc',1500)})();
    (async()=>{await wait(700);gua.el.classList.add('think');const box=$('#l2m'),parts=MSG.split(/(<mark>.*?<\/mark>)/);let html='';
      for(const p of parts){if(p.startsWith('<mark>')){html+=p;box.innerHTML=html;hop(gua,16,260);await wait(240)}else for(const ch of p){if(run!==st.run)return;html+=ch;box.innerHTML=html;await wait(17)}}
      gua.el.classList.remove('think');flash(gua,'arc',1500);anim($('#l2f'),[{opacity:0},{opacity:1}],{duration:400})})();
    await wait(1500);const days=$$('#l3w .day');
    for(const i of [0,1,2,3]){if(run!==st.run)return;days[i].classList.add('sent');hop(pas,14,260);await wait(620)}
    if(run!==st.run)return;days[4].classList.add('win');anim($('#l3r'),[{opacity:0,transform:'translateY(10px) scale(.8)'},{opacity:1,transform:'none'}],{duration:450,easing:'cubic-bezier(.34,1.56,.64,1)'});
    const z=st.P(lanes[2],.5,.6);burst(st,z[0],z[1],34,.9,['#34D399','#FF6B2C','#F5F5F5']);hop(pas,60,560);flash(pas,'arc',2200);await wait(300);say(pas,'Pedido completo. É com vocês.',2600);
    bots.forEach((b,i)=>b!==pas&&setTimeout(()=>{hop(b,30,420);flash(b,'arc',1200)},200+i*90));await wait(1200);$('#again2').classList.add('on')}
  $('#again2').onclick=()=>play();addEventListener('resize',reseat);seen(comp,play,.6)})();

/* ── cena 4: a conversa no celular, com o Recepcionista em cima ── */
const FLUXO={inicio:'oi',nos:{
  oi:{tipo:'msg',texto:'Oi! Aqui é da Produtora Lumen. Vou adiantar algumas informações para a equipe preparar o seu orçamento.',prox:'tipo'},
  tipo:{tipo:'perg',texto:'Que tipo de vídeo você precisa?',campo:'tipo',ops:[['Institucional','cidade'],['Evento','cidade'],['Clipe musical','cidade'],['Outro tipo','livre']]},
  livre:{tipo:'perg',texto:'Pode me contar um pouco mais?',campo:'tipo',ops:[['Documentário','cidade'],['Para redes sociais','cidade'],['Treinamento','cidade']]},
  cidade:{tipo:'perg',texto:'Em qual cidade seria a gravação?',campo:'cid',ops:[['São Paulo','data'],['Rio de Janeiro','data'],['Belo Horizonte','data'],['Outra','data']]},
  data:{tipo:'perg',texto:'Para quando você está planejando?',campo:'data',ops:[['Próximo mês','fim'],['Em 2 a 3 meses','fim'],['Sem data ainda','fim']]},
  fim:{tipo:'transf',texto:'Perfeito, já tenho o que preciso. A equipe vai confirmar o orçamento com você.'}}};
(()=>{const st=new Stage($('#conversa')),host=st.add(TEAM[1]),phone=$('#phone'),msgs=$('#msgs'),ops=$('#ops'),you=$('#phYou');
  const R={tipo:[$('#rTipo'),'tipo'],cid:[$('#rCid'),'cidade'],data:[$('#rData'),'período']};const E={no:null,dados:{},fim:false,busy:false,gen:0};
  const hora=(()=>{let m=9*60+12;return()=>{m+=1;return `${String(m/60|0).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`}})();
  const place=()=>{const p=st.P(phone,.5,0),s=mob()?58:70;Object.assign(host,{x:p[0],y:p[1]-s/2+s*.2,sc:s/160});apply(host)};
  const add=(html,c)=>{const m=document.createElement('div');m.className='m '+c;m.innerHTML=html;msgs.appendChild(m);anim(m,[{opacity:0,transform:'translateY(10px) scale(.96)'},{opacity:1,transform:'none'}],{duration:380,easing:'cubic-bezier(.34,1.56,.64,1)'});msgs.scrollTop=msgs.scrollHeight;return m};
  const sum=()=>{for(const k in R){const [el,l]=R[k];el.textContent=`${l} ${E.dados[k]||'—'}`;el.classList.toggle('on',!!E.dados[k])}};
  async function digita(ms,g){const t=document.createElement('div');t.className='typing';t.innerHTML='<i></i><i></i><i></i>';msgs.appendChild(t);msgs.scrollTop=msgs.scrollHeight;host.el.classList.add('think');await wait(ms);host.el.classList.remove('think');t.remove();return g===E.gen}
  async function ir(id){const g=E.gen,no=FLUXO.nos[id];E.no=id;ops.innerHTML='';E.busy=true;
    if(!await digita(no.tipo==='msg'?800:650,g))return;add(`${no.texto}<small>bot · ${hora()}</small>`,'');hop(host,18,320);E.busy=false;
    if(no.tipo==='msg')return ir(no.prox);
    if(no.tipo==='perg'){no.ops.forEach(([l,p],i)=>{const b=document.createElement('button');b.className='op';b.textContent=l;b.onclick=()=>esc(l,p);ops.appendChild(b);
        anim(b,[{opacity:0,transform:'translateY(6px)'},{opacity:1,transform:'none'}],{duration:320,delay:i*50})});
      const h=document.createElement('button');h.className='take pulse';h.textContent='Equipe assume a conversa';h.onclick=assume;ops.appendChild(h);anim(h,[{opacity:0},{opacity:1}],{duration:400,delay:200});return}
    fecha(false)}
  function esc(l,p){if(E.busy||E.fim)return;add(`${l}<small>cliente · ${hora()}</small>`,'r');const no=FLUXO.nos[E.no];if(no.campo)E.dados[no.campo]=l;sum();ir(p)}
  function assume(){if(E.busy||E.fim)return;E.gen++;fecha(true)}
  function fecha(manual){E.fim=true;ops.innerHTML='';you.classList.add('on');
    if(manual)add('Oi! Aqui é a Marina, da equipe. Vou continuar com você daqui.<small>equipe · '+hora()+'</small>','');
    add('o bot parou · a equipe está no comando','s');
    const b=document.createElement('button');b.className='take done';b.textContent='Recomeçar a simulação';b.onclick=reset;ops.appendChild(b);
    const p=st.P(phone,.5,.4);ring(st,p[0],p[1],'#34D399');burst(st,p[0],p[1],30,.9,['#34D399','#FF6B2C','#F5F5F5']);hop(host,50,480);flash(host,'arc',1600);setTimeout(()=>say(host,manual?'Passei a vez.':'Pedido completo!',1900),500)}
  function reset(){E.gen++;Object.assign(E,{no:null,dados:{},fim:false,busy:false});msgs.innerHTML='';ops.innerHTML='';you.classList.remove('on');sum();ir(FLUXO.inicio)}
  addEventListener('resize',place);sum();
  seen(phone,async()=>{await wait(300);place();const ty=host.y;host.y=ty-300;host.rot=-200;host.op=1;eye(host,'wide');apply(host);
    setTimeout(()=>squash(host,1),860*.364);await tween(host,{y:ty,rot:0},860,{y:Ez.bounce,def:Ez.out});eye(host,'dot');st.lean=true;reset()},.35)})();

/* ── cena 5: a boina cai na cabeça a cada nível ── */
(()=>{const spec=TEAM[1],st=new Stage($('#nivel')),slot=$('#rkBot'),big=st.add(spec),hat=$('.hat',big.el),maskId=$('mask',big.el).id;
  const LV=[['Rascunho','Todo fluxo começa aqui. A primeira boina vem com o teste.'],['Primeiro teste','Rodou do oi até o fim pelo menos uma vez.'],['Ramos cobertos','Cada resposta possível foi percorrida.'],['À prova de erro','Respostas estranhas não travam a conversa.'],['Revisado','Alguém da equipe leu e aprovou os textos.'],['Ensaio geral','A equipe simulou o atendimento de ponta a ponta.'],['No ar','Pronto para o cliente. A boina preta.']];
  $('#rkS').innerHTML=LV.slice(1).map(()=>'<i></i>').join('');
  const place=()=>{const p=st.P(slot,.5,.5);Object.assign(big,{x:p[0],y:p[1],sc:slot.offsetWidth/160*.86,op:1});apply(big)};
  async function loop(){const run=st.run;place();let k=0;while(run===st.run){const [n,g]=LV[k],pt=PATENTES[k];
      $('#rkK').textContent=k?`Nível ${k} de 6 · boina ${pt[0]}`:'Rascunho · sem boina';$('#rkN').textContent=n;$('#rkG').textContent=g;
      $$('#rkS i').forEach((e,i)=>{e.classList.toggle('on',i===k-1);e.style.background=i<k?PATENTES[i+1][1]:''});
      if(pt){hat.innerHTML=boinaG(pt[1],spec.shape,maskId);hat.animate([{transform:'translateY(-120px) rotate(-30deg)',opacity:0},{transform:'translateY(-120px) rotate(-30deg)',opacity:1,offset:.05},{transform:'none',opacity:1}],{duration:RM?1:620,easing:'cubic-bezier(.34,1.56,.64,1)'});
        setTimeout(()=>{squash(big,1.1);flash(big,'arc',1100);const p=st.P(slot,.5,.2);ring(st,p[0],p[1],lum(pt[1])<.05?'#F5F5F5':pt[1]);if(k===LV.length-1)burst(st,p[0],p[1],50,1.1)},RM?0:430)}else{hat.innerHTML='';hop(big,30,420)}
      await wait(k===LV.length-1?3200:2100);k=(k+1)%LV.length}}
  addEventListener('resize',place);seen(slot,()=>{st.lean=true;loop()},.5);place();big.op=0;apply(big)})();

/* ── cena 6: o time cai nos cartões; o quinto é seu ── */
(()=>{const st=new Stage($('#time')),cards=$$('#crew .mate'),bots=[...TEAM.slice(1),NOVO].map(s=>st.add(s)),mk=bots[4];
  const size=()=>mob()?58:70;let ok=false;
  const seats=()=>cards.map((c,i)=>st.seats(c,[bots[i]],size())[0]);
  const place=()=>{if(!ok)return;seats().forEach((s,i)=>{Object.assign(bots[i],s);apply(bots[i])})};
  const COLS=['#FF6B2C','#38BDF8','#FACC15','#34D399','#EF4444','#A78BFA','#F472B6','#F5F5F5'];let cor=5,fmt=5;
  const NOMES_COR=['Laranja','Ciano','Amarelo','Verde','Vermelho','Violeta','Rosa','Branco'];
  $('#mkC').innerHTML=COLS.map((c,i)=>`<button style="--c:${c}" aria-label="${NOMES_COR[i]}" aria-pressed="${i===cor}"></button>`).join('');
  const FORMAS=[[1,'Balão'],[2,'Estrela'],[3,'Avião'],[4,'Coração'],[5,'Raio']];
  $('#mkS').innerHTML=FORMAS.map(([i,n])=>`<button aria-label="${n}" aria-pressed="${i===fmt}" data-forma="${i}"><svg viewBox="0 0 100 100">${frag(i,'currentColor')}</svg></button>`).join('');
  const paint=()=>{const c=COLS[cor];mk.el.style.setProperty('--c',c);mk.el.style.setProperty('--e',eyeFor(c));$('mask',mk.el).innerHTML=frag(fmt,'#fff');$('.ew',mk.el).setAttribute('transform',eyeT(fmt))};
  $$('#mkC button').forEach((b,i)=>b.onclick=()=>{cor=i;$$('#mkC button').forEach((x,k)=>x.setAttribute('aria-pressed',k===i));paint();squash(mk,1);flash(mk,'arc',700)});
  $$('#mkS button').forEach((b)=>b.onclick=()=>{fmt=+b.dataset.forma;$$('#mkS button').forEach((x)=>x.setAttribute('aria-pressed',x===b));paint();hop(mk,34,420);ring(st,mk.x,mk.y,COLS[cor])});
  let tm;$('#mkN').addEventListener('input',e=>{const v=e.target.value.trim();if(e.target.value.length%5===1)hop(mk,16,300);clearTimeout(tm);if(v.length>1)tm=setTimeout(()=>say(mk,`Oi, eu sou ${v}!`,1800),700)});
  addEventListener('resize',place);
  seen($('#crew'),async()=>{cards.forEach((c,i)=>anim(c,[{opacity:0,transform:'translateY(30px)'},{opacity:1,transform:'none'}],{duration:700,delay:i*70}));
    await wait(280);await dropOn(st,bots,seats());ok=true;st.lean=true;await wait(200);
    for(const b of bots){hop(b,34,380);flash(b,'arc',520);await wait(90)}
    const falas=['Eu abro a conversa.','Eu pergunto.','Eu chamo a equipe.','Eu seguro o erro.'];
    let k=0;setInterval(()=>{if(document.hidden)return;say(bots[k%4],falas[k%4],1900);k++},3400)},.3)})();

/* ── cena 7: letreiro de cartões ── */
(()=>{const A=[['Produtora Lumen','Orçamentos','Tipo de vídeo, cidade e data antes de chamar a equipe.',1,'#38BDF8','No ar','214 conversas'],['Clínica Aurora','Triagem','Especialidade e convênio antes do atendente.',4,'#F87171','Revisado','98 conversas'],['Distribuidora Norte','Vendas','Volume, prazo e região antes do vendedor.',1,'#34D399','No ar','1.402 conversas'],['Escola Ponte','Matrículas','Nível, idioma e horário antes da secretaria.',2,'#F59E0B','Ramos cobertos','61 conversas']],
  B=[['Suporte Volt','Chamados','Categoria e urgência antes do especialista.',3,'#A78BFA','No ar','3.118 conversas'],['Imobiliária Casa Clara','Visitas','Bairro, faixa e tipo antes do corretor.',5,'#F472B6','Primeiro teste','12 conversas'],['Buffet Festa Boa','Reservas','Data, convidados e cardápio antes da proposta.',1,'#FACC15','Revisado','77 conversas'],['Oficina Torque','Agenda','Modelo, defeito e dia antes do mecânico.',1,'#38BDF8','No ar','530 conversas']];
  const card=([n,k,s,sh,c,lv,q],i)=>`<article class="pass" style="--c:${c}"><div class="ps-top">flowbot<span>Nº ${String(41207+i*1733).padStart(5,'0')}</span></div><div class="ps-mid">${svgBot(sh,c)}<div><b>${n}</b><small>fluxo de ${k.toLowerCase()}</small></div></div><div class="ps-say">${s}</div><div class="ps-ft"><b>${lv}</b>${q}</div></article>`;
  const fill=(el,L)=>{const h=L.map(card).join('');el.innerHTML=h+h.replace(/<article /g,'<article aria-hidden="true" ')};fill($('#mqA'),A);fill($('#mqB'),B)})();

/* ── a conta ── */
(()=>{const brl=v=>'R$ '+Math.round(v).toLocaleString('pt-BR'),n=v=>Math.round(v).toLocaleString('pt-BR');
  const upd=()=>{const a=+$('#iA').value,b=+$('#iB').value,c=+$('#iC').value,d=+$('#iD').value;
    $('#vA').textContent=a;$('#vB').textContent=b+'%';$('#vC').textContent=c+'%';$('#vD').textContent=brl(d);
    const erradas=a*22*b/100,perdidos=erradas*c/100;$('#oA').textContent=n(erradas);$('#oB').textContent=n(perdidos);$('#oT').textContent=brl(perdidos*d)};
  $$('.calc input').forEach(i=>i.addEventListener('input',upd));upd()})();

/* ── dúvidas ── */
[['O FlowBot manda mensagens de verdade pelo WhatsApp?','Não nesta fase. A prospecção prepara rascunhos para uma pessoa revisar e copiar; nada é disparado. A simulação de conversa desta página também é local.'],
 ['Preciso saber programar?','Não. Você descreve o atendimento, ajusta os blocos e escreve os textos. As condições são escolhas, não código.'],
 ['O que acontece quando a equipe assume?','O bot para de enviar mensagens na hora e não volta a falar naquela conversa sem ordem da equipe.'],
 ['O bot passa preço para o cliente?','Não. O FlowBot coleta o pedido. Quem confirma valor e prazo é sempre uma pessoa da equipe.'],
 ['Dá para testar vários caminhos do mesmo fluxo?','Sim. Recomece a simulação quantas vezes quiser. Cada ramo percorrido conta para o nível do fluxo.'],
 ['O que já funciona hoje?','O Modo Prospecção: mapa, funil, importação e exportação CSV, notas, bloqueio de contato e rascunhos com revisão humana. Os dados ficam só no seu navegador nesta versão.'],
 ['O FlowBot é o mesmo produto que o Flow?','Não. O Flow é a plataforma de gestão para negócios de beleza. O FlowBot é o produto da Alvo Digital para prospecção, atendimento conversacional e agentes.'],
 ['Quando o Bot Studio fica pronto?','Ainda não existe. A simulação de conversa desta página mostra a ideia; o editor de fluxos é o próximo módulo.']]
 .forEach(([q,a])=>{const d=document.createElement('details'),s=document.createElement('summary'),p=document.createElement('p');s.textContent=q;p.textContent=a;d.append(s,p);$('#faq').appendChild(d)});

/* ── cena 8: o time volta e senta no último cartão ── */
(()=>{const st=new Stage($('#acesso')),bots=TEAM.map(s=>st.add(s)),card=$('#acc2'),size=()=>mob()?56:70;let ok=false;
  addEventListener('resize',()=>{if(ok)st.seats(card,bots,size()).forEach((s,i)=>{Object.assign(bots[i],s);apply(bots[i])})});
  seen(card,async()=>{await dropOn(st,bots,st.seats(card,bots,size()),900);ok=true;st.lean=true;
    for(const b of bots){hop(b,40,420);flash(b,'arc',900);await wait(90)}},.4);
  $$('a',card).forEach(a=>a.addEventListener('pointerenter',()=>bots.forEach((b,i)=>setTimeout(()=>hop(b,18,300),i*50))))})();
