/* Production motion logic with simulated browser APIs; this does not render CSS. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';

const source = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const fixture = `<!doctype html><html><body data-lang="en" data-page="home">
  <header class="site-header"></header><main>
  <div class="hero-heading"><h1>Places to live.</h1></div>
  <div class="hero-copy"><p>A considered approach.</p></div>
  <a class="hero-image-link"><img alt="Architecture"></a>
  <section class="page-intro"><h1>Our projects</h1><p>Selected work.</p></section>
  <button data-filter="all">All</button><button data-filter="residential">Residential</button>
  <div class="project-grid">${['residential','commercial','residential','residential'].map(category=>`<article class="project-card" data-category="${category}">Project</article>`).join('')}</div>
  </main></body></html>`;

function setup({width=1440,reduced=false,scroll=0,observe=true,raf=true}={}) {
  const {document,window}=parseHTML(fixture);
  const listeners=new Map(),media=new Map(),frames=new Map(),observers=[];
  let nextFrame=0;
  const browser={scrollY:scroll,
    addEventListener(type,listener,options){listeners.set(type,[...(listeners.get(type)||[]),{listener,options}]);},
    matchMedia(query){
      if(!media.has(query)){
        const changes=[];
        media.set(query,{matches:query.includes('min-width')?width>800:query.includes('reduced-motion')?reduced:true,
          addEventListener(type,listener){if(type==='change')changes.push(listener);},
          update(matches){this.matches=matches;changes.forEach(listener=>listener({matches}));}});
      }
      return media.get(query);
    }
  };
  if(raf){browser.requestAnimationFrame=callback=>{const id=++nextFrame;frames.set(id,callback);return id;};browser.cancelAnimationFrame=id=>frames.delete(id);}
  if(observe)browser.IntersectionObserver=class {
    constructor(callback){this.callback=callback;this.elements=new Set();observers.push(this);}
    observe(element){this.elements.add(element);}
    unobserve(element){this.elements.delete(element);}
    disconnect(){this.elements.clear();}
  };
  const location={href:'https://renarchi.com.br/en/',search:'',hash:''};
  vm.runInNewContext(source,{document,window:browser,location,URL,history:{replaceState(){}},localStorage:{getItem(){return null;},setItem(){}},setTimeout,clearTimeout},{filename:'app.js'});
  const emit=type=>(listeners.get(type)||[]).forEach(({listener})=>listener({preventDefault(){throw Error('Native scrolling must not be canceled');}}));
  return {document,browser,frames,observers,listeners,
    header:document.querySelector('.site-header'),image:document.querySelector('.hero-image-link img'),
    cards:[...document.querySelectorAll('.project-card')],
    flush(){const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback());},
    scrollTo(value){browser.scrollY=value;emit('scroll');},
    resize(value){browser.matchMedia('(min-width: 801px)').update(value>800);},
    reduce(value){browser.matchMedia('(prefers-reduced-motion: reduce)').update(value);},
    click(element){element.dispatchEvent(new window.Event('click',{bubbles:true,cancelable:true}));}
  };
}

let passed=0,failed=0;
function test(name,body){try{body();passed++;console.log(`PASS ${name}`);}catch(error){failed++;console.error(`FAIL ${name}\n${error.stack}`);}}

test('Header reflects restored scroll and batches native scroll updates into one frame',()=>{
  const e=setup({scroll:180});
  assert.equal(e.header.classList.contains('is-scrolled'),true);
  e.scrollTo(10);e.scrollTo(16);
  assert.equal(e.frames.size,1);
  assert.equal(e.header.classList.contains('is-scrolled'),true);
  e.flush();assert.equal(e.header.classList.contains('is-scrolled'),false);
  e.scrollTo(17);e.flush();assert.equal(e.header.classList.contains('is-scrolled'),true);
  assert.equal(e.frames.size,0,'No continuous animation loop');
  assert.ok(e.listeners.get('scroll').every(item=>item.options?.passive===true));
});

test('Desktop hero depth follows scrolling without exceeding twelve pixels',()=>{
  const e=setup({scroll:120});
  const shift=()=>parseFloat(e.image.style.getPropertyValue('--hero-shift'));
  assert.ok(shift()>0&&shift()<=12);
  e.scrollTo(100000);e.flush();assert.equal(shift(),12);
  e.scrollTo(-100000);e.flush();assert.equal(shift(),-12);
  e.scrollTo(0);e.flush();assert.equal(shift(),0);
});

test('Mobile and live reduced-motion changes clear depth, while header state still works',()=>{
  const e=setup({width:390,scroll:220});
  assert.equal(e.image.style.getPropertyValue('--hero-shift'),'');
  e.resize(1440);assert.ok(parseFloat(e.image.style.getPropertyValue('--hero-shift'))>0);
  e.reduce(true);assert.equal(e.image.style.getPropertyValue('--hero-shift'),'');
  e.scrollTo(0);e.flush();assert.equal(e.header.classList.contains('is-scrolled'),false);
  e.reduce(false);e.scrollTo(250);e.flush();assert.ok(parseFloat(e.image.style.getPropertyValue('--hero-shift'))>0);
  e.resize(800);assert.equal(e.image.style.getPropertyValue('--hero-shift'),'');
});

test('Preference changes cancel queued frames instead of scheduling duplicate work',()=>{
  const e=setup();
  e.scrollTo(240);assert.equal(e.frames.size,1);
  e.reduce(true);assert.equal(e.frames.size,0);
  assert.equal(e.header.classList.contains('is-scrolled'),true);
  assert.equal(e.image.style.getPropertyValue('--hero-shift'),'');
  e.scrollTo(0);assert.equal(e.frames.size,1);
  e.resize(390);assert.equal(e.frames.size,0);
  assert.equal(e.header.classList.contains('is-scrolled'),false);
});

test('Missing animation APIs leave all content visible and keep the header functional',()=>{
  const e=setup({observe:false,raf:false});
  e.scrollTo(200);assert.equal(e.header.classList.contains('is-scrolled'),true);
  assert.equal(e.image.style.getPropertyValue('--hero-shift'),'');
  assert.equal(e.document.querySelectorAll('.reveal-enter').length,0);
  assert.ok(e.cards.every(card=>!card.hidden));
});

test('Headings and copy enter only when visible, with short card staggering',()=>{
  const e=setup(),observer=e.observers[0];
  const heading=e.document.querySelector('.hero-heading h1'),text=e.document.querySelector('.hero-copy p');
  assert.ok(observer.elements.has(heading));assert.ok(observer.elements.has(text));
  assert.ok(observer.elements.has(e.document.querySelector('.page-intro h1')));
  assert.equal(e.document.querySelectorAll('.reveal-enter').length,0);
  observer.callback([{target:heading,isIntersecting:false}]);assert.equal(heading.classList.contains('reveal-enter'),false);
  observer.callback([{target:heading,isIntersecting:true},...e.cards.map(target=>({target,isIntersecting:true}))]);
  assert.equal(heading.classList.contains('reveal-enter'),true);
  assert.deepEqual(e.cards.map(card=>card.style.getPropertyValue('--reveal-delay')),['0ms','70ms','140ms','0ms']);
  assert.ok(e.cards.every(card=>!card.hidden));
  assert.equal(observer.elements.has(heading),false);
});

test('Queued intersections cannot animate filtered-out cards or prevent later discovery',()=>{
  const e=setup(),observer=e.observers[0],commercial=e.cards[1];
  e.click(e.document.querySelector('[data-filter="residential"]'));
  observer.callback([{target:commercial,isIntersecting:true}]);
  assert.equal(commercial.hidden,true);assert.equal(commercial.classList.contains('reveal-enter'),false);
  assert.equal(observer.elements.has(commercial),true);
  e.click(e.document.querySelector('[data-filter="all"]'));
  observer.callback([{target:commercial,isIntersecting:true}]);
  assert.equal(commercial.hidden,false);assert.equal(commercial.classList.contains('reveal-enter'),true);
});

test('Live motion preferences cancel entry effects without hiding or replaying content',()=>{
  const e=setup(),observer=e.observers[0],first=e.cards[0];
  observer.callback([{target:first,isIntersecting:true}]);
  e.reduce(true);
  assert.equal(first.classList.contains('reveal-enter'),false);
  assert.equal(first.style.getPropertyValue('--reveal-delay'),'');
  assert.equal(observer.elements.size,0);
  assert.ok(e.cards.every(card=>!card.hidden));
  e.reduce(false);
  assert.equal(observer.elements.has(first),false,'Already viewed content is not replayed');
  assert.equal(observer.elements.has(e.cards[1]),true);
  const initiallyReduced=setup({reduced:true});
  assert.equal(initiallyReduced.observers.length,0);
  initiallyReduced.reduce(false);assert.equal(initiallyReduced.observers.length,1);
});

console.log(`${passed} motion checks passed; ${failed} failed. Browser APIs simulated; visual rendering not verified.`);
if(failed)process.exitCode=1;
