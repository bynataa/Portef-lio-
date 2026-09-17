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
const base = 'https://renata-architecture.netlify.app/';
const report = {
  generatedAt: new Date().toISOString(),
  methodology: 'DOM event simulation using linkedom + node:vm, and CSS AST inspection using css-tree. No browser, layout engine or screen rendering was used.',
  stubs: ['URL-resolved anchor href', 'location.assign/replace and history.replaceState', 'localStorage', 'focus tracking', 'dialog.showModal/close and fixed dialog hit-test rectangle'],
  notValidated: ['Actual visual appearance, overflow or text clipping at any viewport', 'Native dialog focus trap and Escape behavior', 'Real browser keyboard/focus behavior', 'Real contact delivery, remote service responses or production deployment'],
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
function environment(file, {query='', hash='', storage=new Map(), brokenStorage=false}={}) {
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
  for(const element of document.querySelectorAll('*')) element.focus=()=>{focused=element;};
  for(const dialog of document.querySelectorAll('dialog')) {
    dialog.showModal=()=>dialog.setAttribute('open','');
    dialog.close=()=>{dialog.removeAttribute('open');dialog.dispatchEvent(new window.Event('close'));};
    dialog.getBoundingClientRect=()=>({left:20,right:980,top:20,bottom:780});
  }
  const localStorage={
    getItem(key){if(brokenStorage)throw new Error('Storage unavailable');return storage.get(key)??null;},
    setItem(key,value){if(brokenStorage)throw new Error('Storage unavailable');storage.set(key,String(value));}
  };
  const history={replaceState(_state,_title,value){currentURL=new URL(value,currentURL);}};
  vm.runInNewContext(source,{document,localStorage,location,history,URL,console},{filename:'app.js'});
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
  return {document,window,location,storage,navigation,click,key,get focused(){return focused;}};
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
    const target=path.join(dist,decodeURIComponent(expected.pathname));
    assert.ok(fs.existsSync(target));
    const next=environment(path.relative(dist,target),{storage:env.storage,query:expected.search,hash:expected.hash});
    assert.equal(next.document.body.dataset.lang,opposite);
    assert.equal(next.document.body.dataset.page,env.document.body.dataset.page);
    assert.equal(next.document.documentElement.lang,opposite==='pt'?'pt-BR':'en');
    if(rel.includes('/projects/')) assert.equal(expected.pathname.split('/').at(-2),rel.split('/').at(-2));
  });
  if(rel.includes('projects/')) test(`${rel}: gallery opens, cycles both ways, updates alt/caption/count and closes`,()=>{
    const env=environment(rel),items=[...env.document.querySelectorAll('.gallery-item')];
    const dialog=env.document.querySelector('.lightbox');
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
  });
}

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
  assert.ok([...en.document.querySelectorAll('#main-nav a')].every(a=>new URL(a.href).pathname.startsWith('/en/')));
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
function matchesMedia(condition,width,{reduced=false}={}){
  if(condition==='print')return false;
  if(condition.includes('prefers-reduced-motion'))return reduced;
  const matches=[...condition.matchAll(/\((min|max)-width:\s*([\d.]+)px\)/g)];
  if(!matches.length)throw new Error('Unsupported static query: '+condition);
  return matches.every(([,type,limit])=>type==='max'?width<=Number(limit):width>=Number(limit));
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
