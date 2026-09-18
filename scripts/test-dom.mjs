/**
 * Reproducible DOM/logic and static CSS checks. This is NOT a browser test.
 * linkedom has no layout, painting, built-in anchor navigation, native dialog,
 * or browser focus implementation. Those APIs are explicitly stubbed below.
 * Run after npm run build: npm run test:dom
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import * as cssTree from 'css-tree';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const source = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const reportDir = process.env.QA_REPORT_DIR || path.join(root, 'analysis');
const site = JSON.parse(fs.readFileSync(path.join(root, 'src/site.json'), 'utf8'));
const ui = JSON.parse(fs.readFileSync(path.join(root, 'src/ui.json'), 'utf8'));
const projects = JSON.parse(fs.readFileSync(path.join(root, 'src/projects.json'), 'utf8')).projects;
const base = site.url.replace(/\/+$/, '') + '/';
const basePath = new URL(base).pathname;
const report = {
  generatedAt: new Date().toISOString(),
  methodology: 'DOM event simulation using linkedom + node:vm, and CSS AST inspection using css-tree. No browser, layout engine or screen rendering was used.',
  stubs: ['URL-resolved anchor href', 'location.assign/replace and history.replaceState', 'localStorage', 'focus tracking and focusin/focusout events', 'matchMedia, pointer events, deterministic timers and IntersectionObserver', 'dialog.showModal/close and fixed dialog hit-test rectangle', 'image load events, intrinsic pixel dimensions and displayed dimensions'],
  notValidated: ['Actual visual appearance, overflow or text clipping at any viewport', 'Native dialog focus trap, image loading and zoom/panning layout', 'Real browser keyboard/focus behavior', 'Real contact delivery, remote service responses or production deployment'],
  tests: [],
  css: {}
};

function test(name, body) {
  try { body(); report.tests.push({name, status:'passed'}); }
  catch (error) { report.tests.push({name, status:'failed', message:error.stack}); }
}
function htmlFiles(dir=dist) {
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry => entry.isDirectory()
    ? htmlFiles(path.join(dir,entry.name))
    : entry.name.endsWith('.html') ? [path.join(dir,entry.name)] : []);
}
function environment(file, {query='', hash='', storage=new Map(), brokenStorage=false, width=1440, pointer='fine', reduced=false, observe=false}={}) {
  const relative = path.relative(dist,path.resolve(dist,file)).split(path.sep).join('/');
  const {document,window} = parseHTML(fs.readFileSync(path.join(dist,relative),'utf8'));
  let currentURL = new URL(relative+query+hash,base), focused=null;
  const navigation=[];
  const location={
    get href(){return currentURL.href;}, get search(){return currentURL.search;}, get hash(){return currentURL.hash;},
    assign(value){currentURL=new URL(value,currentURL);navigation.push({type:'assign',href:currentURL.href});},
    replace(value){currentURL=new URL(value,currentURL);navigation.push({type:'replace',href:currentURL.href});}
  };
  // linkedom returns the literal href; browsers resolve it against document URL.
  for(const a of document.querySelectorAll('a[href]')) Object.defineProperty(a,'href',{
    get(){return new URL(a.getAttribute('href'),currentURL).href;},
    set(value){a.setAttribute('href',value);}, configurable:true
  });
  Object.defineProperty(document,'activeElement',{get:()=>focused||document.body});
  const dispatch=(element,type,properties={})=>{
    const event=new window.Event(type,{bubbles:true,cancelable:true});
    Object.assign(event,properties);element.dispatchEvent(event);return event;
  };
  for(const element of document.querySelectorAll('*')) element.focus=()=>{
    if(focused===element)return;
    const previous=focused;focused=element;
    if(previous)dispatch(previous,'focusout',{relatedTarget:element});
    dispatch(element,'focusin',{relatedTarget:previous});
  };
  const media=new Map(),windowListeners=new Map(),timers=new Map(),observations=[];
  let timerID=0;
  const matchMedia=query=>{
    if(!media.has(query)){
      const listeners=[];
      media.set(query,{matches:query.includes('min-width')?width>=801:query.includes('prefers-reduced-motion')?reduced:pointer==='fine',
        addEventListener(type,listener){if(type==='change')listeners.push(listener);},
        update(matches){this.matches=matches;listeners.forEach(listener=>listener({matches}));}});
    }
    return media.get(query);
  };
  const browser={matchMedia,addEventListener(type,listener){windowListeners.set(type,[...(windowListeners.get(type)||[]),listener]);}};
  if(observe)browser.IntersectionObserver=class {
    constructor(callback){this.callback=callback;this.elements=new Set();observations.push(this);}
    observe(element){this.elements.add(element);}
    unobserve(element){this.elements.delete(element);}
  };
  const changeHash=hash=>{currentURL.hash=hash;for(const listener of windowListeners.get('hashchange')||[])listener();};
  const flushTimers=()=>{const pending=[...timers.values()];timers.clear();pending.forEach(fn=>fn());};
  for(const dialog of document.querySelectorAll('dialog')) {
    dialog.showModal=()=>dialog.setAttribute('open','');
    dialog.close=()=>{dialog.removeAttribute('open');dialog.dispatchEvent(new window.Event('close'));};
    dialog.getBoundingClientRect=()=>({left:20,right:980,top:20,bottom:780});
  }
  const photo=document.querySelector('#lightbox-image');
  const imageState={width:0,height:0,displayWidth:0,displayHeight:0,complete:false};
  if(photo) {
    Object.defineProperties(photo,{
      naturalWidth:{get:()=>imageState.width},naturalHeight:{get:()=>imageState.height},
      clientWidth:{get:()=>imageState.displayWidth},clientHeight:{get:()=>imageState.displayHeight},
      complete:{get:()=>imageState.complete},
      src:{get:()=>photo.getAttribute('src'),set(value){photo.setAttribute('src',value);Object.assign(imageState,{width:0,height:0,complete:false});}}
    });
  }
  const loadImage=({width=1800,height=1200,displayWidth=720,displayHeight=480}={})=>{
    assert.ok(photo,'Image loading requires a project lightbox');
    Object.assign(imageState,{width,height,displayWidth,displayHeight,complete:true});
    photo.dispatchEvent(new window.Event('load'));
  };
  const localStorage={
    getItem(key){if(brokenStorage)throw new Error('Storage unavailable');return storage.get(key)??null;},
    setItem(key,value){if(brokenStorage)throw new Error('Storage unavailable');storage.set(key,String(value));}
  };
  const history={replaceState(_state,_title,value){currentURL=new URL(value,currentURL);}};
  vm.runInNewContext(source,{document,window:browser,localStorage,location,history,URL,console,
    setTimeout(callback){const id=++timerID;timers.set(id,callback);return id;},clearTimeout(id){timers.delete(id);}
  },{filename:'app.js'});
  const click=(element,{navigate=false,x=100,y=100}={})=>{
    assert.ok(element,'Click target must exist');
    const event=new window.Event('click',{bubbles:true,cancelable:true});
    Object.assign(event,{clientX:x,clientY:y});
    element.dispatchEvent(event);
    if(navigate && !event.defaultPrevented && element.closest('a'))location.assign(element.closest('a').href);
    return event;
  };
  const key=(element,key)=>{
    const event=new window.Event('keydown',{bubbles:true,cancelable:true});
    Object.defineProperty(event,'key',{value:key});element.dispatchEvent(event);return event;
  };
  return {document,window,location,storage,navigation,click,key,loadImage,dispatch,matchMedia,flushTimers,observations,changeHash,get focused(){return focused;}};
}
const visibleCards = env=>[...env.document.querySelectorAll('[data-category]')].filter(card=>!card.hidden);

test('The built JavaScript matches the tested source',()=>assert.equal(fs.readFileSync(path.join(dist,'app.js'),'utf8'),source));

for(const lang of ['pt','en']) {
  const prefix=lang==='en'?'en/':'';
  test(`${lang}: all ten projects and every category filter, counts, URL and reset`,()=>{
    const env=environment(prefix+'work/index.html',{query:'?ref=qa',hash:'#main'});
    assert.equal(visibleCards(env).length,10);
    const cards=[...env.document.querySelectorAll('[data-category]')];
    const groups=Object.fromEntries([...new Set(cards.map(c=>c.dataset.category))].map(category=>[category,cards.filter(c=>c.dataset.category===category).length]));
    for(const [category,total] of Object.entries(groups)) {
      env.click(env.document.querySelector(`[data-filter="${category}"]`));
      assert.equal(visibleCards(env).length,total);
      assert.ok(visibleCards(env).every(c=>c.dataset.category===category));
      assert.equal(env.document.querySelectorAll('[data-filter][aria-pressed="true"]').length,1);
      assert.equal(env.document.querySelector('[data-filter][aria-pressed="true"]').dataset.filter,category);
      assert.equal(env.document.querySelector('.results-count').textContent,`${total} ${env.document.querySelector('.results-count').dataset.countLabel}`);
      assert.equal(new URL(env.location.href).searchParams.get('category'),category);
      assert.equal(new URL(env.location.href).searchParams.get('ref'),'qa');
      assert.equal(env.location.hash,'#main');
    }
    env.click(env.document.querySelector('[data-filter="all"]'));
    assert.equal(visibleCards(env).length,10);
    assert.equal(new URL(env.location.href).searchParams.has('category'),false);
    report.categoryCounts=groups;
  });
  test(`${lang}: category deep-link and unknown-category fallback`,()=>{
    for(const category of Object.keys(report.categoryCounts)) {
      const env=environment(prefix+'work/index.html',{query:'?category='+category});
      assert.equal(visibleCards(env).length,report.categoryCounts[category]);
    }
    const env=environment(prefix+'work/index.html',{query:'?category=unknown'});
    assert.equal(visibleCards(env).length,10);
    assert.equal(env.document.querySelector('[data-filter="all"]').getAttribute('aria-pressed'),'true');
  });
  test(`${lang}: menu click, translated labels, nav close and Escape focus callback`,()=>{
    const env=environment(prefix+'index.html');
    const menu=env.document.querySelector('.menu-toggle'),nav=env.document.querySelector('#main-nav');
    assert.equal(menu.getAttribute('aria-label'),menu.dataset.openLabel);
    env.click(menu);
    assert.equal(menu.getAttribute('aria-expanded'),'true');
    assert.equal(menu.getAttribute('aria-label'),menu.dataset.closeLabel);
    assert.ok(nav.classList.contains('is-open'));
    env.key(env.document,'Escape');
    assert.equal(menu.getAttribute('aria-expanded'),'false');
    assert.equal(menu.getAttribute('aria-label'),menu.dataset.openLabel);
    assert.equal(env.focused,menu);
    assert.ok(!nav.classList.contains('is-open'));
    env.click(menu);env.click(nav.querySelector('a'));
    assert.equal(menu.getAttribute('aria-expanded'),'false');
    assert.ok(!nav.classList.contains('is-open'));
  });
  test(`${lang}: contextual disclosures preserve page links, translate state and close outside`,()=>{
    const env=environment(prefix+'index.html');
    const groups=[...env.document.querySelectorAll('[data-nav-group]')];
    assert.equal(groups.length,2);
    assert.ok(env.document.body.classList.contains('nav-ready'));
    assert.equal(env.document.querySelector('.menu-toggle').hidden,false);
    for(const group of groups){
      const button=group.querySelector('.nav-disclosure'),panel=group.querySelector('.nav-panel');
      assert.ok(group.querySelector('.nav-topline > a.nav-link[href]'),'The page destination remains a separate link');
      assert.equal(button.hidden,false);assert.equal(panel.hidden,true);
      assert.equal(button.getAttribute('aria-controls'),panel.id);
      env.click(button);
      assert.equal(panel.hidden,false);assert.equal(button.getAttribute('aria-expanded'),'true');
      assert.equal(button.getAttribute('aria-label'),button.dataset.closeLabel);
      assert.equal(env.document.querySelectorAll('.nav-panel:not([hidden])').length,1);
    }
    env.click(env.document.querySelector('main'));
    assert.ok(groups.every(group=>group.querySelector('.nav-panel').hidden));
    for(const group of groups){
      const button=group.querySelector('.nav-disclosure');
      assert.equal(button.getAttribute('aria-expanded'),'false');
      assert.equal(button.getAttribute('aria-label'),button.dataset.openLabel);
    }
  });
  test(`${lang}: keyboard discovery, focus retention, ArrowDown and Escape are predictable`,()=>{
    const env=environment(prefix+'index.html');
    const group=env.document.querySelector('[data-nav-group]'),link=group.querySelector('.nav-link');
    const button=group.querySelector('.nav-disclosure'),panel=group.querySelector('.nav-panel'),first=panel.querySelector('a');
    link.focus();assert.equal(panel.hidden,false,'Focusing the desktop page link reveals related destinations');
    first.focus();env.dispatch(group,'pointerleave',{pointerType:'mouse'});env.flushTimers();
    assert.equal(panel.hidden,false,'Keyboard focus inside the submenu holds it open');
    env.key(first,'Escape');
    assert.equal(panel.hidden,true);assert.equal(env.focused,button);
    env.flushTimers();assert.equal(panel.hidden,true,'Returning focus after Escape must not reopen the panel');
    env.key(button,'ArrowDown');assert.equal(panel.hidden,false);assert.equal(env.focused,first);
    env.document.querySelector('[data-set-lang="en"]').focus();
    assert.equal(panel.hidden,true,'Tabbing out closes contextual content');
  });
  test(`${lang}: hover supports cursor travel while touch uses explicit disclosure`,()=>{
    const env=environment(prefix+'index.html');
    const group=env.document.querySelector('[data-nav-group]'),panel=group.querySelector('.nav-panel');
    env.dispatch(group,'pointerenter',{pointerType:'mouse'});assert.equal(panel.hidden,false);
    env.dispatch(group,'pointerleave',{pointerType:'mouse'});assert.equal(panel.hidden,false,'No immediate disappearance across the gap');
    env.dispatch(group,'pointerenter',{pointerType:'mouse'});env.flushTimers();assert.equal(panel.hidden,false);
    env.dispatch(group,'pointerleave',{pointerType:'mouse'});env.flushTimers();assert.equal(panel.hidden,true);
    env.dispatch(group,'pointerenter',{pointerType:'touch'});assert.equal(panel.hidden,true);
    env.dispatch(group,'pointerenter',{pointerType:'mouse'});env.click(group.querySelector('.nav-disclosure'));
    assert.equal(panel.hidden,false,'Clicking a hover-open disclosure keeps it open');
    env.dispatch(group,'pointerleave',{pointerType:'mouse'});env.flushTimers();
    assert.equal(panel.hidden,false,'A clicked disclosure remains open until explicitly dismissed');
    env.click(group.querySelector('.nav-disclosure'));assert.equal(panel.hidden,true,'A second disclosure click closes it');
    const mobile=environment(prefix+'index.html',{width:390,pointer:'coarse'});
    const mobileGroup=mobile.document.querySelector('[data-nav-group]'),mobilePanel=mobileGroup.querySelector('.nav-panel');
    mobile.click(mobile.document.querySelector('.menu-toggle'));
    assert.equal(mobile.focused,mobile.document.querySelector('#main-nav .nav-link'),'Opening the mobile menu starts keyboard navigation at its first destination');
    mobile.dispatch(mobileGroup,'pointerenter',{pointerType:'mouse'});assert.equal(mobilePanel.hidden,true);
    mobileGroup.querySelector('.nav-link').focus();assert.equal(mobilePanel.hidden,true,'Touch page links do not toggle disclosure');
    mobile.click(mobileGroup.querySelector('.nav-disclosure'));assert.equal(mobilePanel.hidden,false);
    mobile.key(mobileGroup.querySelector('.nav-disclosure'),'Escape');
    assert.equal(mobilePanel.hidden,true);assert.equal(mobile.document.querySelector('.menu-toggle').getAttribute('aria-expanded'),'true');
    mobile.key(mobile.document,'Escape');
    assert.equal(mobile.document.querySelector('.menu-toggle').getAttribute('aria-expanded'),'false');
    assert.equal(mobile.focused,mobile.document.querySelector('.menu-toggle'));
    env.dispatch(group,'pointerenter',{pointerType:'mouse'});
    panel.querySelector('a').focus();env.matchMedia('(min-width: 801px)').update(false);
    assert.equal(panel.hidden,true);assert.equal(env.focused,env.document.querySelector('.menu-toggle'),'Resizing does not leave focus hidden in a closed menu');
  });
  test(`${lang}: navigation keeps no-JavaScript destinations and contextual links match real content`,()=>{
    const {document}=parseHTML(fs.readFileSync(path.join(dist,prefix+'index.html'),'utf8'));
    assert.equal(document.body.classList.contains('nav-ready'),false);
    assert.equal(document.querySelector('.menu-toggle').hidden,true);
    assert.ok([...document.querySelectorAll('.nav-disclosure')].every(button=>button.hidden));
    const primary=[...document.querySelectorAll('.nav-topline > a, #main-nav > a')];
    assert.equal(primary.length,4);
    assert.ok(primary.every(link=>link.getAttribute('href')&&!link.hidden),'All four page links remain accessible before scripts run');
    const work=[...document.querySelectorAll('#nav-work-panel a')];
    const categories=work.map(a=>new URL(a.getAttribute('href'),base+prefix+'index.html').searchParams.get('category')).filter(Boolean);
    assert.deepEqual(categories.sort(),[...new Set(projects.map(project=>project.category))].sort());
    const serviceDocument=parseHTML(fs.readFileSync(path.join(dist,prefix+'services/index.html'),'utf8')).document;
    const serviceLinks=[...document.querySelectorAll('#nav-services-panel a')].filter(link=>new URL(link.getAttribute('href'),base+prefix+'index.html').hash);
    assert.equal(serviceLinks.length,ui[lang].services.length);
    for(const link of serviceLinks){
      const target=new URL(link.getAttribute('href'),base+prefix+'index.html');
      assert.ok(serviceDocument.getElementById(target.hash.slice(1)),'Every service shortcut has a real destination');
    }
  });
}

const pages=htmlFiles().filter(file=>!file.endsWith('/404.html'));
for(const file of pages) {
  const rel=path.relative(dist,file).split(path.sep).join('/');
  test(`${rel}: language equivalence preserves query/hash and saves preference`,()=>{
    const env=environment(rel,{query:'?category=residential&ref=qa',hash:'#main'});
    const opposite=env.document.body.dataset.lang==='pt'?'en':'pt';
    const link=env.document.querySelector(`[data-set-lang="${opposite}"]`);
    const expected=new URL(link.href);expected.search=env.location.search;expected.hash=env.location.hash;
    env.click(link,{navigate:true});
    assert.equal(env.location.href,expected.href);
    assert.equal(env.storage.get('renarchi-language'),opposite);
    assert.ok(expected.pathname.startsWith(basePath));
    const target=path.join(dist,decodeURIComponent(expected.pathname.slice(basePath.length)));
    assert.ok(fs.existsSync(target));
    const next=environment(path.relative(dist,target),{storage:env.storage,query:expected.search,hash:expected.hash});
    assert.equal(next.document.body.dataset.lang,opposite);
    assert.equal(next.document.body.dataset.page,env.document.body.dataset.page);
    assert.equal(next.document.documentElement.lang,opposite==='pt'?'pt-BR':'en');
    if(rel.includes('/projects/')) assert.equal(expected.pathname.split('/').at(-2),rel.split('/').at(-2));
  });
  if(rel.includes('projects/')) {
    test(`${rel}: project shortcuts reach real sections and document deep-links expand source sheets`,()=>{
      const env=environment(rel);
      for(const id of ['overview','gallery','documents'])assert.ok(env.document.getElementById(id));
      const documents=env.document.querySelector('details.project-documents');
      assert.equal(documents.hasAttribute('open'),false);
      env.changeHash('#documents');assert.equal(documents.hasAttribute('open'),true);
      documents.removeAttribute('open');
      const shortcut=[...env.document.querySelectorAll('a[href]')].find(link=>new URL(link.href).hash==='#documents');
      assert.ok(shortcut);env.click(shortcut);assert.equal(documents.hasAttribute('open'),true);
      const deep=environment(rel,{hash:'#documents'});assert.equal(deep.document.querySelector('details.project-documents').hasAttribute('open'),true);
    });
    test(`${rel}: image and document galleries navigate independently and return focus`,()=>{
      const env=environment(rel),dialog=env.document.querySelector('.lightbox');
      const groups=[...env.document.querySelectorAll('.gallery-grid')];
      assert.equal(groups.length,2,'Separate image and source-document galleries');
      assert.ok(groups[1].closest('details.project-documents'));
      assert.equal(groups[1].closest('details').hasAttribute('open'),false,'Source documents begin collapsed');
      const sets=groups.map(group=>[...group.querySelectorAll('.gallery-item')]);
      const allSources=sets.flatMap(items=>items.map(item=>item.dataset.full));
      assert.equal(new Set(allSources).size,allSources.length,'Groups contain different images');
      for(const items of sets) {
        assert.ok(items.length>0);
        env.click(items[0]);
        assert.ok(dialog.hasAttribute('open'));
        assert.ok(env.document.body.classList.contains('gallery-open'));
        assert.equal(env.focused,dialog.querySelector('.close'));
        const check=index=>{
          assert.equal(env.document.querySelector('#lightbox-image').getAttribute('src'),items[index].dataset.full);
          assert.equal(env.document.querySelector('#lightbox-image').alt,items[index].dataset.caption);
          assert.equal(env.document.querySelector('#gallery-caption').textContent,items[index].dataset.caption);
          assert.equal(env.document.querySelector('#gallery-count').textContent,`${index+1} ${env.document.body.dataset.of} ${items.length}`);
          const original=dialog.querySelector('.lightbox-original');
          assert.equal(original.href,new URL(items[index].dataset.full,env.location.href).href);
          assert.equal(original.getAttribute('target'),'_blank');
          assert.ok(original.rel.split(/\s+/).includes('noopener'));
        };
        check(0);env.click(dialog.querySelector('.prev'));check(items.length-1);
        env.click(dialog.querySelector('.next'));check(0);
        env.key(dialog,'ArrowLeft');check(items.length-1);
        env.key(dialog,'ArrowRight');check(0);
        for(let index=1;index<items.length;index++){env.click(dialog.querySelector('.next'));check(index);}
        env.click(dialog.querySelector('.next'));check(0);
        env.click(dialog.querySelector('.close'));
        assert.ok(!dialog.hasAttribute('open'));
        assert.ok(!env.document.body.classList.contains('gallery-open'));
        assert.equal(env.focused,items[0]);
        env.click(items[items.length-1]);check(items.length-1);
        env.click(dialog,{x:0,y:0});
        assert.ok(!dialog.hasAttribute('open'));
        assert.equal(env.focused,items[items.length-1]);
      }
    });
    test(`${rel}: loaded image zoom, keyboard panning, image changes and close state`,()=>{
      const env=environment(rel),dialog=env.document.querySelector('.lightbox');
      const photo=dialog.querySelector('#lightbox-image'),viewport=dialog.querySelector('.lightbox-viewport');
      const zoom=dialog.querySelector('.lightbox-zoom'),opener=env.document.querySelector('.gallery-item');
      const t=ui[env.document.body.dataset.lang];
      assert.equal(viewport.getAttribute('tabindex'),'0');
      assert.equal(viewport.getAttribute('aria-label'),t.imageViewport);
      env.click(opener);
      assert.equal(zoom.disabled,true,'Zoom waits until the source image loads');
      env.loadImage();
      assert.equal(zoom.disabled,false);
      assert.equal(zoom.getAttribute('aria-pressed'),'false');
      assert.equal(zoom.textContent,t.zoomIn);
      env.click(zoom);
      assert.equal(zoom.getAttribute('aria-pressed'),'true');
      assert.equal(zoom.textContent,t.zoomOut);
      assert.ok(viewport.classList.contains('is-zoomed'));
      assert.equal(photo.style.getPropertyValue('--zoom-width'),'1800px','Zoom uses original pixels');
      assert.equal(env.focused,viewport);
      const current=photo.getAttribute('src');
      for(const arrow of ['ArrowLeft','ArrowRight']) {
        assert.equal(env.key(viewport,arrow).defaultPrevented,false,'Native arrow scrolling remains available');
        assert.equal(photo.getAttribute('src'),current,'Panning must not change the image');
      }
      viewport.scrollLeft=100;viewport.scrollTop=80;
      env.click(zoom);
      assert.equal(zoom.getAttribute('aria-pressed'),'false');
      assert.equal(viewport.scrollLeft,0);assert.equal(viewport.scrollTop,0);
      assert.ok(!viewport.classList.contains('is-zoomed'));
      assert.ok(!photo.style.getPropertyValue('--zoom-width'));
      env.click(zoom);env.click(dialog.querySelector('.next'));
      assert.equal(zoom.getAttribute('aria-pressed'),'false','Changing images resets zoom');
      assert.equal(zoom.disabled,true);
      assert.ok(!photo.style.getPropertyValue('--zoom-width'));
      env.loadImage({width:282,height:499,displayWidth:282,displayHeight:499});
      assert.equal(zoom.disabled,true,'Small images are not artificially enlarged');
      env.loadImage();env.click(zoom);
      env.key(viewport,'Escape');
      assert.ok(!dialog.hasAttribute('open'));
      assert.equal(zoom.getAttribute('aria-pressed'),'false');
      assert.equal(env.focused,opener);
      env.click(opener);env.loadImage();env.click(zoom);
      photo.dispatchEvent(new env.window.Event('error'));
      assert.equal(zoom.disabled,true);
      assert.equal(zoom.getAttribute('aria-pressed'),'false');
    });
    test(`${rel}: project inquiry opens the contact window with the matching reference`,()=>{
      const env=environment(rel),lang=env.document.body.dataset.lang;
      const id=rel.split('/').at(-2),project=projects.find(p=>p.id===id);
      const cta=env.document.querySelector('a.project-inquiry');
      assert.ok(cta.hasAttribute('data-contact-open'));
      assert.ok(cta.textContent.includes(ui[lang].projectInquiry));
      assert.equal(new URL(cta.href).hash,'#contact-form');
      assert.equal(env.document.querySelector('[name="Projeto"]').value,project.title[lang]);
      assert.equal(env.document.querySelector('form').getAttribute('action'),`https://formsubmit.co/${site.email}`);
    });
  }

}

for(const lang of ['pt','en']) test(`${lang}: contact guidance and prepared message are localized`,()=>{
  const env=environment((lang==='en'?'en/':'')+'contact/index.html'),t=ui[lang];
  const brief=env.document.querySelector('.contact-brief');
  assert.ok(brief);
  assert.equal(brief.querySelector('h2').textContent,t.contactBriefTitle);
  assert.ok(brief.textContent.includes(t.contactBriefText));
  assert.deepEqual([...brief.querySelectorAll('li')].map(li=>li.textContent),t.contactBriefItems);
  const whatsapp=[...env.document.querySelectorAll('a[href]')].find(a=>new URL(a.href).origin===new URL(site.whatsapp).origin);
  assert.ok(whatsapp);
  assert.equal(new URL(whatsapp.href).pathname,new URL(site.whatsapp).pathname);
  assert.equal(new URL(whatsapp.href).searchParams.get('text'),t.contactMessage);
  assert.equal(env.document.querySelector('form').getAttribute('action'),`https://formsubmit.co/${site.email}`);
});

test('A returning visitor’s English preference redirects Portuguese home and preserves URL state',()=>{
  const storage=new Map([['renarchi-language','en']]);
  const env=environment('index.html',{storage,query:'?ref=qa',hash:'#main'});
  assert.deepEqual(env.navigation,[{type:'replace',href:base+'en/index.html?ref=qa#main'}]);
});
test('Language preference survives navigation and switching back to Portuguese',()=>{
  const storage=new Map();
  const pt=environment('index.html',{storage});pt.click(pt.document.querySelector('[data-set-lang="en"]'),{navigate:true});
  assert.equal(storage.get('renarchi-language'),'en');
  const en=environment('en/index.html',{storage});
  assert.ok([...en.document.querySelectorAll('#main-nav a')].every(a=>new URL(a.href).pathname.startsWith(new URL('en/',base).pathname)));
  en.click(en.document.querySelector('[data-set-lang="pt"]'),{navigate:true});
  assert.equal(storage.get('renarchi-language'),'pt');
  const again=environment('index.html',{storage});assert.equal(again.navigation.length,0);
});
test('Unavailable localStorage does not break language controls, menus or filters',()=>{
  for(const file of ['index.html','work/index.html','en/work/index.html']) {
    const env=environment(file,{brokenStorage:true});
    env.click(env.document.querySelector('.menu-toggle'));
    assert.equal(env.document.querySelector('.menu-toggle').getAttribute('aria-expanded'),'true');
    const category=env.document.querySelector('[data-filter]:not([data-filter="all"])');
    if(category){env.click(category);assert.ok(visibleCards(env).every(c=>c.dataset.category===category.dataset.filter));}
    env.click(env.document.querySelector('[data-set-lang="en"]'),{navigate:true});
  }
});
test('Entry motion is optional, begins only on intersection and respects reduced motion',()=>{
  const plain=environment('work/index.html');
  assert.equal(plain.document.querySelectorAll('.reveal-enter').length,0);
  assert.equal(visibleCards(plain).length,10,'Content remains visible when IntersectionObserver is unavailable');
  const animated=environment('work/index.html',{observe:true});
  assert.equal(animated.observations.length,1);
  const observer=animated.observations[0],card=animated.document.querySelector('.project-card');
  assert.ok(observer.elements.has(card));assert.equal(card.hidden,false);
  assert.equal(animated.document.querySelectorAll('.reveal-enter').length,0,'Offscreen content is never pre-hidden for an animation');
  observer.callback([{target:card,isIntersecting:false}]);assert.equal(card.classList.contains('reveal-enter'),false);
  observer.callback([{target:card,isIntersecting:true}]);assert.equal(card.classList.contains('reveal-enter'),true);
  assert.equal(observer.elements.has(card),false,'Content enters once without repeated scroll effects');
  const reduced=environment('work/index.html',{observe:true,reduced:true});
  assert.equal(reduced.observations.length,0);assert.equal(visibleCards(reduced).length,10);
});

const css=fs.readFileSync(path.join(root,'public/styles.css'),'utf8'),parseErrors=[];
const ast=cssTree.parse(css,{positions:true,onParseError:error=>parseErrors.push(error.message)});
test('CSS syntax parses without recovery errors',()=>assert.deepEqual(parseErrors,[]));
const flatRules=[];
function collect(nodes,media=[]){
  for(const node of nodes){
    if(node.type==='Atrule' && node.name==='media') collect(node.block.children,[...media,cssTree.generate(node.prelude)]);
    else if(node.type==='Rule')flatRules.push({selector:cssTree.generate(node.prelude),media,declarations:[...node.block.children].filter(n=>n.type==='Declaration').map(n=>({property:n.property,value:cssTree.generate(n.value),important:n.important}))});
  }
}
collect(ast.children);
function matchesMedia(condition,width,{reduced=false,reducedTransparency=false,pointer=width>800?'fine':'coarse'}={}){
  if(condition==='print')return false;
  const motion=condition.includes('prefers-reduced-motion'),transparency=condition.includes('prefers-reduced-transparency');
  if(motion&&(condition.includes('no-preference')?reduced:!reduced))return false;
  if(transparency&&(condition.includes('no-preference')?reducedTransparency:!reducedTransparency))return false;
  const matches=[...condition.matchAll(/\((min|max)-width:\s*([\d.]+)px\)/g)];
  const inputs=[...condition.matchAll(/\((?:any-)?(hover|pointer):\s*(hover|none|fine|coarse)\)/g)];
  if(!matches.length&&!inputs.length&&!motion&&!transparency)throw new Error('Unsupported static query: '+condition);
  return matches.every(([,type,limit])=>type==='max'?width<=Number(limit):width>=Number(limit))
    && inputs.every(([,type,value])=>type==='pointer'?pointer===value:(pointer==='fine'?'hover':'none')===value);
}
function declarations(selector,width,options={}){
  const result={};
  // Exact-selector source-order inspection, not a full browser cascade engine.
  for(const rule of flatRules){
    if(rule.selector.split(',').includes(selector) && rule.media.every(m=>matchesMedia(m,width,options)))
      for(const d of rule.declarations)result[d.property]=d.value;
  }
  return result;
}
report.css={parseErrors,ruleCount:flatRules.length,methodology:'Exact-selector/source-order inspection of matching media rules. Values are specified CSS values, not computed browser layout.',viewports:[]};
for(const width of [360,390,768,1440]) {
  const props={};
  for(const selector of [':root','.menu-toggle','.main-nav','.main-nav.is-open','.project-grid','.gallery-grid','.profile-grid','.contact-grid'])props[selector]=declarations(selector,width);
  const activeQueries=[...new Set(flatRules.flatMap(r=>r.media))].filter(q=>matchesMedia(q,width));
  report.css.viewports.push({width,activeQueries,gutter:props[':root']['--gutter'],menuDisplay:props['.menu-toggle'].display,navDisplay:props['.main-nav'].display,openNavDisplay:props['.main-nav.is-open'].display||props['.main-nav'].display,columns:Object.fromEntries(['.project-grid','.gallery-grid','.profile-grid','.contact-grid'].map(s=>[s,props[s]['grid-template-columns']]))});
  test(`Static CSS at ${width}px selects expected nav and grid rules (not rendering)`,()=>{
    assert.equal(props['.menu-toggle'].display,width<=800?'inline-flex':'none');
    assert.equal(props['.main-nav'].display,width<=800?'none':'flex');
    if(width<=800)assert.equal(props['.main-nav.is-open'].display,'flex');
    if(width<=560)for(const selector of ['.project-grid','.gallery-grid','.profile-grid','.contact-grid'])assert.equal(props[selector]['grid-template-columns'],'1fr');
    if(width>560)assert.equal(props['.project-grid']['grid-template-columns'],'repeat(2,minmax(0,1fr))');
  });
}
test('Static CSS declares reduced-motion alternatives and keyboard focus indicators',()=>{
  assert.equal(declarations('html',390,{reduced:true})['scroll-behavior'],'auto');
  assert.equal(declarations('*',390,{reduced:true})['transition-duration'],'.01ms');
  assert.ok(declarations(':focus-visible',390).outline);
  assert.equal(declarations('[hidden]',390).display,'none');
  assert.equal(declarations('img',390)['max-width'],'100%');
  assert.equal(declarations('body:not(.nav-ready) .main-nav',390).display,'flex','Mobile page destinations stay available without JavaScript');
});

test('Depth and glass alternatives respect combined viewport and accessibility preferences',()=>{
  assert.match(declarations('[data-depth]>img',1440).transform,/scale\(1\.12\)/);
  assert.equal(declarations('[data-depth]>img',390).transform,undefined);
  assert.equal(declarations('[data-depth]>img',1440,{reduced:true}).transform,'none');
  assert.equal(declarations('.site-header',1440,{reducedTransparency:true})['backdrop-filter'],'none');
});

report.summary={total:report.tests.length,passed:report.tests.filter(t=>t.status==='passed').length,failed:report.tests.filter(t=>t.status==='failed').length,pages:pages.length};
fs.mkdirSync(reportDir,{recursive:true});
fs.writeFileSync(path.join(reportDir,'qa-report.json'),JSON.stringify(report,null,2)+'\n');
const md=[
  '# Relatório de validação de DOM e CSS',
  '',`Gerado em ${report.generatedAt}.`,
  '',`**${report.summary.passed}/${report.summary.total} verificações aprovadas**, cobrindo ${pages.length} páginas PT/EN.`,
  '', '## Método e alcance', '',report.methodology,
  '', 'Foram simulados os eventos JavaScript, a resolução de URLs, a navegação, o armazenamento local, o foco e a abertura/fechamento do dialog. O código de produção foi executado sem alterações dentro de node:vm.',
  '', 'As verificações de CSS identificam regras aplicáveis às larguras abaixo. Não representam screenshots, renderização nem medição de overflow.',
  '', '| Largura | Menu | Navegação fechada | Grade de projetos |', '|---|---|---|---|',
  ...report.css.viewports.map(v=>`| ${v.width}px | ${v.menuDisplay} | ${v.navDisplay} | ${v.columns['.project-grid']} |`),
  '', '## Resultado dos testes', '',...report.tests.map(t=>`- ${t.status==='passed'?'PASS':'FAIL'} — ${t.name}${t.message?'\n\n```\n'+t.message+'\n```':''}`),
  '', '## Pendências de validação em navegador real', '',...report.notValidated.map(s=>'- '+s),
  '', '## Reprodução', '', '```sh\nnpm install\nnpm run build\nnpm run test:dom\n```',
  '', 'Os relatórios ficam em analysis/qa-report.json e analysis/qa-report.md; QA_REPORT_DIR pode alterar o diretório de saída.', ''
].join('\n');
fs.writeFileSync(path.join(reportDir,'qa-report.md'),md);
console.log(JSON.stringify(report.summary));
for(const failure of report.tests.filter(t=>t.status==='failed'))console.error(failure.name+'\n'+failure.message);
if(report.summary.failed)process.exitCode=1;
