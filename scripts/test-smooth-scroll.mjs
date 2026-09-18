/* Integration policy with simulated Lenis/browser lifecycle; visual wheel QA is separate. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
const file=new URL('../public/smooth-scroll.js',import.meta.url);
const source=fs.existsSync(file)?fs.readFileSync(file,'utf8'):'';
function setup({reduced=false,fine=true,library=true,observer=true}={}){
 const {document,window:dom}=parseHTML('<html><body><main><a href="#main">Top</a><input><div class="featured-track"></div></main><dialog></dialog><div class="quote-conversation"></div></body></html>');
 const instances=[],queries=new Map(),listeners=new Map(),observers=[];
 class Lenis {constructor(options){this.options=options;this.stopped=false;this.destroyed=false;this.calls=[];instances.push(this);} stop(){this.stopped=true;}start(){this.stopped=false;}destroy(){this.destroyed=true;}scrollTo(...args){this.calls.push(args);}}
 const browser={scrollY:320,requestAnimationFrame(){},ResizeObserver:class{},MutationObserver:class{constructor(callback){this.callback=callback;observers.push(this);}observe(){}disconnect(){}},matchMedia(query){if(!queries.has(query)){const q={matches:query.includes('reduced-motion')?reduced:fine,callbacks:[],addEventListener(_,fn){this.callbacks.push(fn);},set(value){this.matches=value;this.callbacks.forEach(fn=>fn());}};queries.set(query,q);}return queries.get(query);},addEventListener(type,fn){listeners.set(type,[...(listeners.get(type)||[]),fn]);}};
 if(library)browser.Lenis=Lenis;
 if(!observer)delete browser.ResizeObserver;
 vm.runInNewContext(source,{window:browser,document,URL},{filename:'smooth-scroll.js'});
 return {document,browser,instances,queries,last:()=>instances.at(-1),mutate(){observers.forEach(o=>o.callback());},emit(type){(listeners.get(type)||[]).forEach(fn=>fn());},event(target,type,props={}){const event=new dom.Event(type,{bubbles:true,cancelable:true});Object.assign(event,props);target.dispatchEvent(event);return event;},media(query,value){queries.get(query).set(value);}};
}
let passed=0,failed=0;
function test(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(error){failed++;console.error('FAIL '+name+'\n'+error.stack);}}
test('Desktop gets real wheel smoothing while touch and native anchor behavior remain available',()=>{
 const e=setup();assert.equal(e.instances.length,1,'Wheel smoothing must actually initialize');
 const o=e.last().options;assert.equal(o.smoothWheel,true);assert.equal(o.syncTouch,false);assert.equal(o.autoRaf,true);assert.equal(o.anchors,false);
 assert.ok(o.lerp>=.08&&o.lerp<=.15,'Brief, responsive easing');assert.equal(o.allowNestedScroll,true);
 assert.equal(o.virtualScroll({event:{shiftKey:true},deltaX:0,deltaY:100}),false);
 assert.equal(o.virtualScroll({event:{},deltaX:100,deltaY:1}),false);
 assert.equal(o.virtualScroll({event:{},deltaX:0,deltaY:100}),true);
});
test('Reduced motion and coarse pointers stay native and preferences work live',()=>{
 const e=setup({reduced:true});assert.equal(e.instances.length,0);
 e.media('(prefers-reduced-motion: reduce)',false);assert.equal(e.instances.length,1);
 e.media('(prefers-reduced-motion: reduce)',true);assert.equal(e.last().destroyed,true);
 e.media('(prefers-reduced-motion: reduce)',false);assert.equal(e.instances.length,2);
 e.media('(pointer: fine)',false);assert.equal(e.last().destroyed,true);
 const touch=setup({fine:false});assert.equal(touch.instances.length,0);
});
test('Dialogs stop background inertia and restore scrolling on close',()=>{
 const e=setup();e.document.body.classList.add('modal-open');e.mutate();assert.equal(e.last().stopped,true);
 e.document.body.classList.remove('modal-open');e.mutate();assert.equal(e.last().stopped,false);
 e.document.querySelector('dialog').setAttribute('open','');e.mutate();assert.equal(e.last().stopped,true);
 e.document.querySelector('dialog').removeAttribute('open');e.mutate();assert.equal(e.last().stopped,false);
 e.document.body.classList.add('gallery-open');e.mutate();assert.equal(e.last().stopped,true);
 assert.equal(e.last().options.prevent(e.document.querySelector('.quote-conversation')),true);
 assert.equal(e.last().options.prevent(e.document.querySelector('main')),false);
});
test('Keyboard and anchors can interrupt inertia without canceling native navigation',()=>{
 const e=setup(),event=e.event(e.document.body,'keydown',{key:'PageDown'});assert.equal(event.defaultPrevented,false);assert.equal(e.last().calls.length,1);assert.equal(e.last().calls[0][0],320);assert.equal(e.last().calls[0][1].immediate,true);
 e.event(e.document.querySelector('input'),'keydown',{key:'ArrowDown'});assert.equal(e.last().calls.length,1);
 e.event(e.document.querySelector('a'),'click');assert.equal(e.last().calls.length,2);
});
test('Page restoration creates one fresh instance; missing optional APIs leave native scroll',()=>{
 const e=setup();e.emit('pageshow');assert.equal(e.instances.length,1);e.emit('pagehide');assert.equal(e.last().destroyed,true);e.emit('pageshow');assert.equal(e.instances.length,2);
 assert.equal(setup({library:false}).instances.length,0);assert.equal(setup({observer:false}).instances.length,0);
});
console.log(`${passed} smooth scroll checks passed; ${failed} failed.`);if(failed)process.exitCode=1;
