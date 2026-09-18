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
  <a class="hero-image-link" data-depth="hero"><img alt="Architecture"></a>
  <figure class="project-cover"><div class="project-cover-media" data-depth="cover"><img alt="Completed project"></div><figcaption>Project credit</figcaption></figure>
  <figure class="project-cover drawing-cover"><img alt="Technical drawing"></figure>
  <section class="page-intro"><h1>Our projects</h1><p>Selected work.</p></section>
  <button data-filter="all">All</button><button data-filter="residential">Residential</button>
  <div class="project-grid">${['residential','commercial','residential','residential'].map(category=>`<article class="project-card" data-category="${category}">Project</article>`).join('')}</div>
  </main></body></html>`;

function setup({width=1440,height=800,reduced=false,scroll=0,observe=true,raf=true,mediaAPI=true,heroTop=100}={}) {
  const {document,window}=parseHTML(fixture);
  const listeners=new Map(),media=new Map(),frames=new Map(),observers=[];
  let nextFrame=0;
  const browser={scrollY:scroll,innerWidth:width,innerHeight:height,
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
  const mediaQuery=browser.matchMedia.bind(browser);
  if(!mediaAPI)delete browser.matchMedia;
  const bounds=new Map(),reads=new Map();
  document.querySelectorAll('[data-depth]').forEach(host=>{
    bounds.set(host,{top:host.dataset.depth==='hero'?heroTop:1200,height:600});
    reads.set(host,0);
    host.getBoundingClientRect=()=>{
      reads.set(host,reads.get(host)+1);
      const box=bounds.get(host);
      return {x:0,y:box.top,top:box.top,bottom:box.top+box.height,height:box.height,left:0,right:1000,width:1000};
    };
  });
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
  const hero=document.querySelector('[data-depth="hero"]'),cover=document.querySelector('[data-depth="cover"]');
  return {document,browser,frames,observers,listeners,hero,cover,reads,
    header:document.querySelector('.site-header'),image:document.querySelector('.hero-image-link img'),
    coverImage:cover.querySelector('img'),
    cards:[...document.querySelectorAll('.project-card')],
    setRect(host,top,height=600){bounds.set(host,{top,height});},
    intersect(host,isIntersecting){observers.find(observer=>observer.elements.has(host))?.callback([{target:host,isIntersecting}]);},
    flush(){const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback());},
    scrollTo(value){browser.scrollY=value;emit('scroll');},
    resize(value,newHeight=browser.innerHeight){browser.innerWidth=value;browser.innerHeight=newHeight;const query=mediaQuery('(min-width: 801px)');if(query.matches!==(value>800))query.update(value>800);emit('resize');},
    reduce(value){mediaQuery('(prefers-reduced-motion: reduce)').update(value);},
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

test('Desktop depth uses each image viewport position instead of global scroll',()=>{
  const e=setup({scroll:100000}),shift=()=>parseFloat(e.image.style.getPropertyValue('--depth-shift'));
  assert.equal(shift(),0,'Hero is centered in viewport despite restored page scroll');
  e.setRect(e.hero,-200);e.setRect(e.cover,400);
  e.scrollTo(100000);e.flush();
  assert.ok(shift()>0,'Image moves down as the host passes above viewport center');
  assert.ok(parseFloat(e.coverImage.style.getPropertyValue('--depth-shift'))<0,'A lower image has an independent negative offset');
  const position=shift();e.scrollTo(-100000);e.flush();
  assert.equal(shift(),position,'Unchanged host geometry keeps the same offset');
  assert.equal(e.hero.style.getPropertyValue('--depth-shift'),'','Only images receive transforms');
  assert.equal(e.document.querySelector('figcaption').getAttribute('style'),null,'Caption does not move');
  assert.equal(e.document.querySelector('.drawing-cover img').getAttribute('style'),null,'Technical drawings remain static');
});

test('Hero and cover stay within their individual 32px and 24px limits at viewport edges',()=>{
  const e=setup();
  for(const [host,image,limit] of [[e.hero,e.image,32],[e.cover,e.coverImage,24]]){
    e.setRect(host,799.99,800);e.scrollTo(0);e.flush();
    const entering=parseFloat(image.style.getPropertyValue('--depth-shift'));
    assert.ok(entering>=-limit&&entering<-limit+.1,`Entering offset should approach -${limit}px`);
    e.setRect(host,-799.99,800);e.scrollTo(0);e.flush();
    const leaving=parseFloat(image.style.getPropertyValue('--depth-shift'));
    assert.ok(leaving<=limit&&leaving>limit-.1,`Leaving offset should approach ${limit}px`);
  }
});

test('Short images retain enough overscan to avoid exposing their edges',()=>{
  const e=setup();
  e.setRect(e.cover,-199.99,200);e.scrollTo(200);e.flush();
  const shift=parseFloat(e.coverImage.style.getPropertyValue('--depth-shift'));
  assert.ok(shift>9.9&&shift<=10,'A 200px photograph uses at most 10px of translation');
});

test('Offscreen images receive no offsets and observed offscreen hosts skip layout reads',()=>{
  const e=setup({heroTop:900});
  assert.equal(e.image.style.getPropertyValue('--depth-shift'),'');
  assert.equal(e.coverImage.style.getPropertyValue('--depth-shift'),'');
  e.intersect(e.hero,false);e.intersect(e.cover,false);e.flush();
  const before=e.reads.get(e.hero);
  e.scrollTo(500);e.flush();
  assert.equal(e.reads.get(e.hero),before,'IntersectionObserver excludes known offscreen hosts from layout work');
  assert.equal(e.image.style.getPropertyValue('--depth-shift'),'');
  e.setRect(e.hero,-200);e.intersect(e.hero,true);e.flush();
  assert.ok(parseFloat(e.image.style.getPropertyValue('--depth-shift'))>0,'Entering the viewport resumes depth');
  e.setRect(e.hero,-700);e.intersect(e.hero,false);e.flush();
  const last=e.image.style.getPropertyValue('--depth-shift');
  e.scrollTo(1500);e.flush();assert.equal(e.image.style.getPropertyValue('--depth-shift'),last);
});

test('Scroll bursts measure moving images only once per animation frame',()=>{
  const e=setup(),before=e.reads.get(e.hero);
  e.setRect(e.hero,-200);e.scrollTo(120);e.scrollTo(240);e.scrollTo(360);
  assert.equal(e.frames.size,1);assert.equal(e.reads.get(e.hero),before);
  e.flush();assert.equal(e.reads.get(e.hero),before+1);assert.equal(e.frames.size,0);
});

test('Mobile and live reduced-motion changes clear depth, while header state still works',()=>{
  const e=setup({width:390,scroll:220});
  e.setRect(e.hero,-200);e.setRect(e.cover,-100);
  assert.equal(e.image.style.getPropertyValue('--depth-shift'),'');
  e.resize(1440);e.flush();assert.ok(parseFloat(e.image.style.getPropertyValue('--depth-shift'))>0);
  assert.ok(parseFloat(e.coverImage.style.getPropertyValue('--depth-shift'))>0);
  e.reduce(true);assert.equal(e.image.style.getPropertyValue('--depth-shift'),'');assert.equal(e.coverImage.style.getPropertyValue('--depth-shift'),'');
  e.scrollTo(0);e.flush();assert.equal(e.header.classList.contains('is-scrolled'),false);
  e.reduce(false);e.scrollTo(250);e.flush();assert.ok(parseFloat(e.image.style.getPropertyValue('--depth-shift'))>0);
  e.resize(800);assert.equal(e.image.style.getPropertyValue('--depth-shift'),'');
  e.flush();assert.equal(e.coverImage.style.getPropertyValue('--depth-shift'),'');
  e.resize(801);e.flush();assert.ok(parseFloat(e.image.style.getPropertyValue('--depth-shift'))>0);
});

test('Desktop resize recalculates viewport geometry without requiring another scroll',()=>{
  const e=setup();
  assert.equal(parseFloat(e.image.style.getPropertyValue('--depth-shift')),0);
  e.resize(1440,1200);e.flush();
  assert.ok(parseFloat(e.image.style.getPropertyValue('--depth-shift'))>0);
});

test('Preference changes cancel queued frames instead of scheduling duplicate work',()=>{
  const e=setup();
  e.scrollTo(240);assert.equal(e.frames.size,1);
  e.reduce(true);assert.equal(e.frames.size,0);
  assert.equal(e.header.classList.contains('is-scrolled'),true);
  assert.equal(e.image.style.getPropertyValue('--depth-shift'),'');
  e.scrollTo(0);assert.equal(e.frames.size,1);
  e.resize(390);e.flush();assert.equal(e.frames.size,0);
  assert.equal(e.header.classList.contains('is-scrolled'),false);
});

test('Missing animation APIs leave all content visible and keep the header functional',()=>{
  const e=setup({observe:false,raf:false});
  e.scrollTo(200);assert.equal(e.header.classList.contains('is-scrolled'),true);
  assert.equal(e.image.style.getPropertyValue('--depth-shift'),'');
  assert.equal(e.document.querySelectorAll('.reveal-enter').length,0);
  assert.ok(e.cards.every(card=>!card.hidden));
});

test('Missing IntersectionObserver still updates visible depth through native scroll',()=>{
  const e=setup({observe:false});
  e.setRect(e.hero,-200);e.scrollTo(200);e.flush();
  assert.ok(parseFloat(e.image.style.getPropertyValue('--depth-shift'))>0);
  assert.equal(e.document.querySelectorAll('.reveal-enter').length,0);
});

test('Missing media queries safely leaves depth disabled',()=>{
  const e=setup({mediaAPI:false});e.scrollTo(200);e.flush();
  assert.equal(e.image.style.getPropertyValue('--depth-shift'),'');
  assert.equal(e.header.classList.contains('is-scrolled'),true);
});

test('Unavailable or invalid geometry never breaks scrolling or writes invalid offsets',()=>{
  const e=setup({heroTop:900});
  for(const measure of [undefined,()=>undefined,()=>({top:0,bottom:0,height:0}),()=>({top:NaN,bottom:100,height:100})]){
    e.hero.getBoundingClientRect=measure;
    e.scrollTo(250);e.flush();
    assert.equal(e.header.classList.contains('is-scrolled'),true);
    assert.equal(e.image.style.getPropertyValue('--depth-shift'),'');
    assert.equal(e.frames.size,0);
  }
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
  initiallyReduced.reduce(false);assert.ok(initiallyReduced.observers.some(item=>item.elements.has(initiallyReduced.cards[0])));
});

console.log(`${passed} motion checks passed; ${failed} failed. Browser APIs simulated; visual rendering not verified.`);
if(failed)process.exitCode=1;
