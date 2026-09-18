/* Native-scroll carousel behavior. Geometry/scroll APIs are simulated, not rendered. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

const sourceURL=new URL('../public/carousel.js',import.meta.url);
const source=fs.existsSync(sourceURL)?fs.readFileSync(sourceURL,'utf8'):'';
function setup({width=620,cardWidth=300,gap=20,inset=0,count=4,lang='pt',reduced=false,apis=true,incomplete=false,smoothAsync=false}={}){
  const copy=lang==='pt'?['Projeto','de','Ir para o projeto']:['Project','of','Go to project'];
  const {document,window}=parseHTML(`<!doctype html><html><body>
    <section class="featured" data-carousel data-carousel-item-label="${copy[0]}" data-carousel-of="${copy[1]}" data-carousel-go-label="${copy[2]}">
    <div class="carousel-stage"><div class="project-grid" data-carousel-track id="featured-projects" tabindex="0" role="group">
    ${Array.from({length:count},(_,i)=>`<article class="project-card"><a href="/projects/${i+1}/">Project ${i+1}</a></article>`).join('')}</div>
    <div data-carousel-controls hidden><div class="carousel-side-controls"><button data-carousel-prev>Previous</button>${incomplete?'':'<button data-carousel-next>Next</button>'}</div><div class="carousel-progress"><div data-carousel-dots></div><span data-carousel-status aria-live="polite" aria-atomic="true"></span></div></div></div>
    </section></body></html>`);
  const section=document.querySelector('[data-carousel]'),track=section.querySelector('[data-carousel-track]'),cards=[...track.children];
  const dimensions={width,cardWidth,gap};let scrollLeft=0,id=0,activeElement=document.body;
  const calls=[],frames=new Map(),listeners=new Map(),observers=[],changes=[];
  Object.defineProperties(track,{
    clientWidth:{get:()=>dimensions.width},clientLeft:{get:()=>0},
    scrollWidth:{get:()=>Math.max(dimensions.width,inset*2+count*dimensions.cardWidth+Math.max(0,count-1)*dimensions.gap)},
    scrollLeft:{get:()=>scrollLeft,set:v=>{scrollLeft=Math.max(0,Math.min(track.scrollWidth-track.clientWidth,v));}}
  });
  track.getBoundingClientRect=()=>({left:20,right:20+dimensions.width,width:dimensions.width});
  cards.forEach((card,i)=>{card.getBoundingClientRect=()=>({left:20+inset+i*(dimensions.cardWidth+dimensions.gap)-scrollLeft,right:20+inset+i*(dimensions.cardWidth+dimensions.gap)-scrollLeft+dimensions.cardWidth,width:dimensions.cardWidth});});
  const dispatch=(element,type,props={})=>{const event=new window.Event(type,{bubbles:true,cancelable:true});Object.assign(event,props);element.dispatchEvent(event);return event;};
  Object.defineProperty(document,'activeElement',{get:()=>activeElement});
  window.HTMLElement.prototype.focus=function(){activeElement=this;dispatch(this,'focusin');};
  if(apis)track.scrollTo=options=>{calls.push(options);if(smoothAsync&&options.behavior==='smooth')return;track.scrollLeft=options.left;dispatch(track,'scroll');};
  const media={matches:reduced,addEventListener(type,fn){if(type==='change')changes.push(fn);}};
  const browser={addEventListener(type,fn,options){listeners.set(type,[...(listeners.get(type)||[]),{fn,options}]);}};
  if(apis){
    browser.matchMedia=()=>media;
    browser.requestAnimationFrame=fn=>{const next=++id;frames.set(next,fn);return next;};
    browser.ResizeObserver=class {constructor(fn){this.fn=fn;this.elements=[];observers.push(this);}observe(element){this.elements.push(element);}};
  }
  vm.runInNewContext(source,{document,window:browser,console},{filename:'carousel.js'});
  return {document,section,track,cards,calls,frames,observers,
    get dots(){return [...section.querySelectorAll('[data-carousel-dots] button')];},
    get status(){return section.querySelector('[data-carousel-status]').textContent;},
    prev:section.querySelector('[data-carousel-prev]'),next:section.querySelector('[data-carousel-next]'),
    controls:section.querySelector('[data-carousel-controls]'),
    click(el){return dispatch(el,'click');},key(el,key){return dispatch(el,'keydown',{key});},
    focus(el){el.focus();},get focused(){return activeElement;},
    flush(){const queued=[...frames.values()];frames.clear();queued.forEach(fn=>fn());},
    nativeScroll(value){track.scrollLeft=value;dispatch(track,'scroll');},
    resize(next){Object.assign(dimensions,next);if(observers.length)observers.forEach(o=>o.fn([]));else (listeners.get('resize')||[]).forEach(({fn})=>fn());},
    motion(value){media.matches=value;changes.forEach(fn=>fn({matches:value}));}
  };
}
let passed=0,failed=0;
function test(name,body){try{body();passed++;console.log(`PASS ${name}`);}catch(error){failed++;console.error(`FAIL ${name}\n${error.stack}`);}}

test('Desktop controls expose unique reachable positions and stop at both bounds',()=>{
  const e=setup();
  assert.equal(e.section.classList.contains('is-carousel-ready'),true);
  assert.equal(e.controls.hidden,false);
  assert.equal(e.dots.length,3,'The final clamped position must not be duplicated');
  assert.equal(e.prev.disabled,true);assert.equal(e.next.disabled,false);
  assert.equal(e.status,'Projeto 1–2 de 4');
  e.click(e.next);e.flush();assert.equal(e.track.scrollLeft,320);assert.equal(e.status,'Projeto 2–3 de 4');
  e.click(e.next);e.flush();assert.equal(e.track.scrollLeft,640);assert.equal(e.next.disabled,true);
  assert.equal(e.status,'Projeto 3–4 de 4');
  e.click(e.prev);e.flush();assert.equal(e.track.scrollLeft,320);
  e.click(e.dots[0]);e.flush();assert.equal(e.track.scrollLeft,0);assert.equal(e.prev.disabled,true);
  assert.equal(e.dots[0].getAttribute('aria-current'),'true');
  assert.equal(e.dots[2].getAttribute('aria-label'),'Ir para o projeto 3');
  assert.ok(e.dots.every(dot=>dot.getAttribute('type')==='button'));
});

test('Scrollbar and swipe scroll update status without issuing a programmatic scroll',()=>{
  const e=setup();
  e.nativeScroll(80);e.nativeScroll(320);
  assert.equal(e.frames.size,1,'Native scroll events are batched');
  e.flush();assert.equal(e.status,'Projeto 2–3 de 4');
  assert.equal(e.dots[1].getAttribute('aria-current'),'true');
  assert.equal(e.calls.length,0);
  e.nativeScroll(640);e.flush();assert.equal(e.next.disabled,true);
});

test('Mobile dots cover every card and status excludes the next-card preview',()=>{
  const e=setup({width:360,cardWidth:316,gap:20,lang:'en'});
  assert.equal(e.dots.length,4);assert.equal(e.status,'Project 1 of 4');
  e.click(e.dots[3]);e.flush();assert.equal(e.track.scrollLeft,964);
  assert.equal(e.status,'Project 4 of 4');assert.equal(e.next.disabled,true);
  assert.equal(e.dots[3].getAttribute('aria-label'),'Go to project 4');
});

test('Arrow/Home/End navigation is confined to the focused track',()=>{
  const e=setup();
  assert.equal(e.key(e.track,'ArrowRight').defaultPrevented,true);e.flush();assert.equal(e.track.scrollLeft,320);
  e.key(e.track,'End');e.flush();assert.equal(e.track.scrollLeft,640);
  e.key(e.track,'Home');e.flush();assert.equal(e.track.scrollLeft,0);
  e.key(e.track,'ArrowLeft');e.flush();assert.equal(e.track.scrollLeft,0);
  assert.equal(e.key(e.track,'ArrowDown').defaultPrevented,false);
  assert.equal(e.key(e.cards[0].querySelector('a'),'ArrowRight').defaultPrevented,false);
  assert.equal(e.track.scrollLeft,0);
  assert.equal(e.click(e.cards[0].querySelector('a')).defaultPrevented,false);
  assert.equal(e.cards[0].querySelector('a').hasAttribute('tabindex'),false);
});

test('Keyboard focus reveals hidden cards with the least necessary horizontal movement',()=>{
  const e=setup();
  e.focus(e.cards[2].querySelector('a'));e.flush();assert.equal(e.track.scrollLeft,320);
  assert.equal(e.calls.at(-1).behavior,'instant');
  e.focus(e.cards[3].querySelector('a'));e.flush();assert.equal(e.track.scrollLeft,640);
  e.focus(e.cards[0].querySelector('a'));e.flush();assert.equal(e.track.scrollLeft,0);
});

test('Resize recalculates dots and visible range without stale bounds',()=>{
  const e=setup();
  e.resize({width:360,cardWidth:316});e.flush();assert.equal(e.dots.length,4);assert.equal(e.status,'Projeto 1 de 4');
  e.click(e.dots[3]);e.flush();assert.equal(e.track.scrollLeft,964);
  e.resize({width:620,cardWidth:300});e.flush();assert.equal(e.dots.length,3);
  assert.equal(e.track.scrollLeft,640);assert.equal(e.status,'Projeto 3–4 de 4');
  e.resize({width:1500});e.flush();assert.equal(e.controls.hidden,true);assert.equal(e.status,'Projeto 1–4 de 4');
});

test('Resizing preserves keyboard focus when a dot or all controls disappear',()=>{
  const e=setup({width:360,cardWidth:316});
  e.focus(e.dots[3]);e.resize({width:620,cardWidth:300});e.flush();
  assert.equal(e.focused===e.dots[2],true,'Move focus from a removed dot to its surviving neighbor');
  e.focus(e.next);e.resize({width:1500});e.flush();
  assert.equal(e.controls.hidden,true);assert.equal(e.focused===e.track,true,'Move focus out of hidden controls');
});

test('Track padding does not introduce an unreachable or duplicate final dot',()=>{
  const e=setup({width:620,cardWidth:290,gap:32,inset:4});
  assert.equal(e.dots.length,3);assert.equal(e.status,'Projeto 1–2 de 4');
  e.click(e.dots[2]);e.flush();assert.equal(e.track.scrollLeft,644);
  assert.equal(e.status,'Projeto 3–4 de 4');assert.equal(e.next.disabled,true);
});

test('Repeated navigation during smooth scrolling advances the pending destination',()=>{
  const e=setup({smoothAsync:true});
  e.click(e.next);e.click(e.next);
  assert.equal(e.calls[0].left,320);assert.equal(e.calls[1].left,640);
  e.nativeScroll(640);e.flush();assert.equal(e.next.disabled,true);
  assert.equal(e.status,'Projeto 3–4 de 4');
});

test('Reduced motion is respected initially and when the preference changes',()=>{
  const e=setup({reduced:true});
  e.click(e.next);e.flush();assert.ok(e.calls.at(-1),'Navigation should issue a native scroll');assert.equal(e.calls.at(-1).behavior,'instant');
  e.motion(false);e.click(e.next);e.flush();assert.equal(e.calls.at(-1).behavior,'smooth');
  e.motion(true);assert.equal(e.calls.at(-1).behavior,'instant','Stop any in-flight smooth scroll');
  e.click(e.prev);e.flush();assert.equal(e.calls.at(-1).behavior,'instant');
});

test('Absent optional browser APIs fall back to native positions and window resize',()=>{
  const e=setup({apis:false});
  assert.equal(e.section.classList.contains('is-carousel-ready'),true);
  e.click(e.next);assert.equal(e.track.scrollLeft,320);assert.equal(e.status,'Projeto 2–3 de 4');
  e.nativeScroll(640);assert.equal(e.next.disabled,true);
  e.resize({width:360,cardWidth:316});assert.equal(e.dots.length,4);
});

test('Incomplete controls or an empty track leave progressive fallback untouched',()=>{
  for(const e of [setup({incomplete:true}),setup({count:0})]){
    assert.equal(e.section.classList.contains('is-carousel-ready'),false);
    assert.equal(e.controls.hidden,true);assert.equal(e.calls.length,0);
  }
});

console.log(`${passed} carousel checks passed; ${failed} failed. Geometry and scroll APIs simulated; no visual rendering.`);
if(failed)process.exitCode=1;
