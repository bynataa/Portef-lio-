import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
const root=path.resolve(import.meta.dirname,'..'),dist=path.join(root,'dist');
const data=JSON.parse(fs.readFileSync(path.join(root,'src/projects.json'))),ui=JSON.parse(fs.readFileSync(path.join(root,'src/ui.json')));
const site=JSON.parse(fs.readFileSync(path.join(root,'src/site.json')));
const galleries=JSON.parse(fs.readFileSync(path.join(root,'src/galleries.json')));
const assets=JSON.parse(fs.readFileSync(path.join(root,'public/assets/assets-manifest.json')));
const basePath=new URL(site.url).pathname.replace(/\/$/,'');
const files=[];function walk(p){for(const d of fs.readdirSync(p,{withFileTypes:true})){let f=path.join(p,d.name);d.isDirectory()?walk(f):files.push(f)}}walk(dist);
const htmls=files.filter(f=>f.endsWith('.html')),errors=[];let links=0,images=0;
const check=(v,m)=>{if(!v)errors.push(m)};
function keys(v,p=''){return Object.entries(v).flatMap(([k,x])=>x&&typeof x==='object'?keys(x,p+k+'.'):[p+k]).sort()}
assert.deepEqual(keys(ui.pt),keys(ui.en),'Both languages must have identical translation keys');
const pages=data.projects.flatMap(p=>p.pages);assert.deepEqual([...pages].sort((a,b)=>a-b),Array.from({length:35},(_,i)=>i+5),'Source pages 5–39 must be covered exactly once');
assert.equal(data.projects.length,10);
assert.deepEqual(Object.keys(galleries).sort(),data.projects.map(p=>p.id).sort(),'Every project has a curated image gallery');
let galleryImages=0;
for(const project of data.projects){
 const names=galleries[project.id];
 check(Array.isArray(names)&&names.length>0,`${project.id}: gallery must not be empty`);
 if(!Array.isArray(names))continue;
 check(new Set(names).size===names.length,`${project.id}: gallery must not duplicate images`);
 for(const name of names){
  galleryImages++;
  const image=assets.images[name];
  check(Boolean(image),`${project.id}: unknown gallery asset ${name}`);
  if(!image)continue;
  check(!/^full-page-render/.test(image.sourceKind),`${project.id}: complete source sheets belong in documents`);
  check(fs.existsSync(path.join(dist,image.src.replace(/^\//,''))),`${project.id}: missing gallery asset ${name}`);
  check(project.pages.includes(image.sourcePage),`${project.id}: gallery image ${name} comes from this project`);
  for(const lang of ['pt','en']){
   check(typeof image.caption?.[lang]==='string'&&image.caption[lang].trim().length>15,`${name}: descriptive ${lang} caption`);
   check(!/imagem original do portf[oó]lio|original (?:image|portfolio image)|prancha original do portf[oó]lio|original portfolio board/i.test(image.caption?.[lang]||''),`${name}: generic caption ${lang}`);
  }
 }
}

for(const f of htmls){
 const html=fs.readFileSync(f,'utf8'),label=path.relative(dist,f);
 check((html.match(/<h1\b/g)||[]).length===1,`${label}: exactly one h1`);
 check(/<html lang="(pt-BR|en)"/.test(html),`${label}: valid lang`);
 check(/<title>[^<]+<\/title>/.test(html),`${label}: page title`);
 check(!/undefined|\[object Object\]|Lorem ipsum/.test(html),`${label}: unresolved content`);
 if(!f.endsWith('404.html')){
  for(const required of ['name="description"','rel="canonical"','hreflang="pt-BR"','hreflang="en"','property="og:image"','data-set-lang="pt"','data-set-lang="en"','id="main"'])check(html.includes(required),`${label}: missing ${required}`);
 }
 for(const m of html.matchAll(/\b(?:href|src|data-full)="([^"]*)"/g)){
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
 if(label.split(path.sep).includes('projects')){
  const {document}=parseHTML(html),id=path.basename(path.dirname(f)),project=data.projects.find(p=>p.id===id);
  const lang=document.body.dataset.lang;
  const principal=document.querySelector('.gallery-grid:not(.documents-grid)'),documents=document.querySelector('details.project-documents .documents-grid');
  check(Boolean(principal)&&Boolean(documents),`${label}: separate image and document galleries`);
  const expected=(galleries[id]||[]).map(name=>path.resolve(dist,assets.images[name].src.replace(/^\//,'')));
  const actual=[...(principal?.querySelectorAll('.gallery-item')||[])].map(item=>path.resolve(path.dirname(f),item.dataset.full));
  check(JSON.stringify(actual)===JSON.stringify(expected),`${label}: curated gallery images and order`);
  for(const item of principal?.querySelectorAll('.gallery-item')||[]){
   check(!/imagem original do portf[oó]lio|original (?:image|portfolio image)|prancha original do portf[oó]lio|original portfolio board/i.test(item.dataset.caption),`${label}: useful main gallery captions`);
  }
  const sheets=[...(documents?.querySelectorAll('.gallery-item')||[])];
  check(sheets.length===project.pages.length,`${label}: preserve every original source page`);
  for(const page of project.pages){
   const name=String(page).padStart(2,'0');
   check(sheets.some(item=>item.dataset.full.endsWith(`/page-${name}.webp`)&&item.querySelector('img')?.getAttribute('src').endsWith(`/thumb-${name}.webp`)),`${label}: original source page ${page} with thumbnail`);
  }
  check(document.querySelector('.project-inquiry')?.textContent.includes(ui[lang].projectInquiry),`${label}: localized project inquiry`);
 }

}
check(!fs.readFileSync(path.join(dist,'styles.css'),'utf8').includes('{{'),'CSS duplicated braces');
for(const p of data.projects)for(const l of ['pt','en']){
 for(const field of ['title','summary','context','role','credits','location'])check(typeof p[field][l]==='string'&&p[field][l].length>0,`${p.id}: ${field}.${l}`);
 check(Array.isArray(p.solutions[l])&&p.solutions[l].length>0,`${p.id}: solutions.${l}`);
}
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
console.log(JSON.stringify({status:'passed',htmlPages:htmls.length,linksChecked:links,imagesChecked:images,projects:data.projects.length,sourcePagesCovered:pages.length,curatedGalleryImages:galleryImages,translationParity:true,scope:'Static validation; not a browser rendering or real message-delivery test'},null,2));
