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
  const galleryItems=[...document.querySelectorAll('.gallery-item')],dialog=document.querySelector('.lightbox');
  if(dialog){
    const photo=document.getElementById('lightbox-image'),caption=document.getElementById('gallery-caption'),position=document.getElementById('gallery-count');
    const viewport=dialog.querySelector('.lightbox-viewport'),zoom=dialog.querySelector('.lightbox-zoom'),original=dialog.querySelector('.lightbox-original');
    let gallery=[],active=0,trigger=null,zoomed=false;
    function setZoom(enabled){
      zoomed=Boolean(enabled&&viewport&&photo.naturalWidth);
      viewport?.classList.toggle('is-zoomed',zoomed);
      if(zoomed)photo.style.setProperty('--zoom-width',`${photo.naturalWidth}px`);
      else photo.style.removeProperty('--zoom-width');
      if(zoom){zoom.setAttribute('aria-pressed',String(zoomed));zoom.textContent=zoomed?zoom.dataset.zoomOut:zoom.dataset.zoomIn;}
      if(viewport){viewport.scrollLeft=0;viewport.scrollTop=0;if(zoomed)viewport.focus();}
    }
    function updateZoom(){
      if(!zoom)return;
      // Display original pixels; low-resolution photographs are never enlarged artificially.
      zoom.disabled=!photo.naturalWidth||(!zoomed&&photo.clientWidth>0&&photo.naturalWidth<=photo.clientWidth+1&&photo.naturalHeight<=photo.clientHeight+1);
    }
    function display(index){
      if(!gallery.length)return;
      active=(index+gallery.length)%gallery.length;
      const item=gallery[active];
      setZoom(false);
      if(zoom)zoom.disabled=true;
      photo.src=item.dataset.full;
      photo.alt=item.dataset.caption;
      caption.textContent=item.dataset.caption;
      position.textContent=`${active+1} ${document.body.dataset.of} ${gallery.length}`;
      if(original)original.href=item.dataset.full;
      if(photo.complete)updateZoom();
    }
    function close(){dialog.close()}
    galleryItems.forEach(item=>item.addEventListener('click',()=>{
      trigger=item;
      const group=item.closest('.gallery-grid');
      gallery=group?[...group.querySelectorAll('.gallery-item')]:[item];
      display(gallery.indexOf(item));
      dialog.showModal();
      document.body.classList.add('gallery-open');
      dialog.querySelector('.close').focus();
      if(photo.complete)updateZoom();
    }));
    photo.addEventListener('load',updateZoom);
    photo.addEventListener('error',()=>{setZoom(false);if(zoom)zoom.disabled=true;});
    zoom?.addEventListener('click',()=>{setZoom(!zoomed);updateZoom();});
    dialog.querySelector('.close').addEventListener('click',close);
    dialog.querySelector('.prev').addEventListener('click',()=>display(active-1));
    dialog.querySelector('.next').addEventListener('click',()=>display(active+1));
    dialog.addEventListener('close',()=>{setZoom(false);document.body.classList.remove('gallery-open');trigger?.focus()});
    dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()}});
    dialog.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();close();return;}
      // Arrow keys pan a zoomed image using the viewport's native scrolling.
      if(zoomed&&viewport?.contains(e.target))return;
      if(e.key==='ArrowLeft'){e.preventDefault();display(active-1)}
      if(e.key==='ArrowRight'){e.preventDefault();display(active+1)}
    });
  }
})();
