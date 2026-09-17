/* Progressive enhancement. All content and language routes work without JavaScript. */
(() => {
  const currentLang=document.body.dataset.lang;
  const storage={get(){try{return localStorage.getItem('renarchi-language')}catch{return null}},set(v){try{localStorage.setItem('renarchi-language',v)}catch{/* Storage may be unavailable in private/file contexts. */}}};
  const langLinks=[...document.querySelectorAll('[data-set-lang]')];
  if(document.body.dataset.page==='home' && currentLang==='pt' && storage.get()==='en'){
    const en=langLinks.find(a=>a.dataset.setLang==='en');
    if(en)location.replace(en.href+location.search+location.hash);
  }
  langLinks.forEach(a=>a.addEventListener('click',e=>{
    storage.set(a.dataset.setLang);
    const next=new URL(a.href,location.href);next.search=location.search;next.hash=location.hash;
    if(next.href!==a.href){e.preventDefault();location.assign(next.href)}
  }));
  const menu=document.querySelector('.menu-toggle'),nav=document.getElementById('main-nav');
  function setMenu(open){menu?.setAttribute('aria-expanded',String(open));menu?.setAttribute('aria-label',open?menu.dataset.closeLabel:menu.dataset.openLabel);nav?.classList.toggle('is-open',open)}
  menu?.addEventListener('click',()=>setMenu(menu.getAttribute('aria-expanded')!=='true'));
  nav?.addEventListener('click',e=>{if(e.target.closest('a'))setMenu(false)});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&menu?.getAttribute('aria-expanded')==='true'){setMenu(false);menu.focus()}});
  const filters=[...document.querySelectorAll('[data-filter]')],cards=[...document.querySelectorAll('[data-category]')],count=document.querySelector('.results-count');
  function filter(category,updateURL){
    if(!filters.some(b=>b.dataset.filter===category))category='all';
    filters.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===category)));
    cards.forEach(c=>c.hidden=category!=='all'&&c.dataset.category!==category);
    if(count)count.textContent=`${cards.filter(c=>!c.hidden).length} ${count.dataset.countLabel}`;
    if(updateURL){const url=new URL(location.href);category==='all'?url.searchParams.delete('category'):url.searchParams.set('category',category);try{history.replaceState(null,'',url)}catch{}}
  }
  filters.forEach(b=>b.addEventListener('click',()=>filter(b.dataset.filter,true)));
  if(filters.length)filter(new URL(location.href).searchParams.get('category')||'all',false);
  const gallery=[...document.querySelectorAll('.gallery-item')],dialog=document.querySelector('.lightbox');
  if(dialog){
    const photo=document.getElementById('lightbox-image'),caption=document.getElementById('gallery-caption'),position=document.getElementById('gallery-count');
    let active=0,trigger=null;
    function display(index){active=(index+gallery.length)%gallery.length;const item=gallery[active];photo.src=item.dataset.full;photo.alt=item.dataset.caption;caption.textContent=item.dataset.caption;position.textContent=`${active+1} ${document.body.dataset.of} ${gallery.length}`;}
    function close(){dialog.close()}
    gallery.forEach((item,i)=>item.addEventListener('click',()=>{trigger=item;display(i);dialog.showModal();document.body.classList.add('gallery-open');dialog.querySelector('.close').focus()}));
    dialog.querySelector('.close').addEventListener('click',close);
    dialog.querySelector('.prev').addEventListener('click',()=>display(active-1));
    dialog.querySelector('.next').addEventListener('click',()=>display(active+1));
    dialog.addEventListener('close',()=>{document.body.classList.remove('gallery-open');trigger?.focus()});
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()}});
    dialog.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();display(active-1)}if(e.key==='ArrowRight'){e.preventDefault();display(active+1)}});
  }
})();
