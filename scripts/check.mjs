import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..'),dist=path.join(root,'dist');
const data=JSON.parse(fs.readFileSync(path.join(root,'src/projects.json'))),ui=JSON.parse(fs.readFileSync(path.join(root,'src/ui.json')));
const site=JSON.parse(fs.readFileSync(path.join(root,'src/site.json')));
const basePath=new URL(site.url).pathname.replace(/\/$/,'');
const files=[];function walk(p){for(const d of fs.readdirSync(p,{withFileTypes:true})){let f=path.join(p,d.name);d.isDirectory()?walk(f):files.push(f)}}walk(dist);
const htmls=files.filter(f=>f.endsWith('.html')),errors=[];let links=0,images=0;
const check=(v,m)=>{if(!v)errors.push(m)};
function keys(v,p=''){return Object.entries(v).flatMap(([k,x])=>x&&typeof x==='object'?keys(x,p+k+'.'):[p+k]).sort()}
assert.deepEqual(keys(ui.pt),keys(ui.en),'Both languages must have identical translation keys');
const pages=data.projects.flatMap(p=>p.pages);assert.deepEqual([...pages].sort((a,b)=>a-b),Array.from({length:35},(_,i)=>i+5),'Source pages 5–39 must be covered exactly once');
assert.equal(data.projects.length,10);
for(const f of htmls){
 const html=fs.readFileSync(f,'utf8'),label=path.relative(dist,f);
 check((html.match(/<h1\b/g)||[]).length===1,`${label}: exactly one h1`);
 check(/<html lang="(pt-BR|en)"/.test(html),`${label}: valid lang`);
 check(/<title>[^<]+<\/title>/.test(html),`${label}: page title`);
 check(!/undefined|\[object Object\]|Lorem ipsum/.test(html),`${label}: unresolved content`);
 if(!f.endsWith('404.html')){
  for(const required of ['name="description"','rel="canonical"','hreflang="pt-BR"','hreflang="en"','property="og:image"','data-set-lang="pt"','data-set-lang="en"','id="main"'])check(html.includes(required),`${label}: missing ${required}`);
 }
 for(const m of html.matchAll(/\b(?:href|src)="([^"]*)"/g)){
  const ref=m[1].replace(/&amp;/g,'&');links++;
  if(/^(?:https?:|mailto:|tel:|data:)/.test(ref))continue;
  const [target,hash]=ref.split('#'),clean=target.split('?')[0];
  let local=clean?(clean.startsWith('/')?path.join(dist,basePath&&clean.startsWith(basePath+'/')?clean.slice(basePath.length):clean):path.resolve(path.dirname(f),clean)):f;
  if(fs.existsSync(local)&&fs.statSync(local).isDirectory())local=path.join(local,'index.html');
  check(fs.existsSync(local),`${label}: broken local URL ${ref}`);
  if(hash&&local.endsWith('.html')&&fs.existsSync(local))check(fs.readFileSync(local,'utf8').includes(`id="${hash}"`),`${label}: missing anchor ${ref}`);
 }
 for(const m of html.matchAll(/<img\b[^>]*>/g)){
  if(m[0].includes('id="lightbox-image"'))continue;
  images++;check(/alt="[^"]+"/.test(m[0]),`${label}: descriptive alt`);check(/width="\d+"/.test(m[0])&&/height="\d+"/.test(m[0]),`${label}: explicit image dimensions`);
 }
 for(const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs))try{JSON.parse(m[1])}catch{errors.push(`${label}: invalid structured data`)}
}
check(!fs.readFileSync(path.join(dist,'styles.css'),'utf8').includes('{{'),'CSS duplicated braces');
for(const p of data.projects)for(const l of ['pt','en']){
 for(const field of ['title','summary','context','role','credits','location'])check(typeof p[field][l]==='string'&&p[field][l].length>0,`${p.id}: ${field}.${l}`);
 check(Array.isArray(p.solutions[l])&&p.solutions[l].length>0,`${p.id}: solutions.${l}`);
}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(JSON.stringify({status:'passed',htmlPages:htmls.length,linksChecked:links,imagesChecked:images,projects:data.projects.length,sourcePagesCovered:pages.length,translationParity:true,scope:'Static validation; not a browser rendering or real message-delivery test'},null,2));
