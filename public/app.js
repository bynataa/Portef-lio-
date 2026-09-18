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
  const browser=typeof window==='undefined'?null:window;
  const desktop=browser?.matchMedia?.('(min-width: 801px)');
  const hover=browser?.matchMedia?.('(hover: hover) and (pointer: fine)');
  const reducedMotion=browser?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const groups=[...document.querySelectorAll('[data-nav-group]')].map(element=>({
    element,button:element.querySelector('.nav-disclosure'),link:element.querySelector('.nav-link'),
    panel:element.querySelector('.nav-panel'),timer:null,suppressFocus:false,openedBy:null
  })).filter(group=>group.button&&group.panel);
  function cancelLeave(group){if(group.timer!==null){clearTimeout(group.timer);group.timer=null;}}
  function setGroup(group,open){
    cancelLeave(group);
    group.panel.hidden=!open;
    group.element.classList.toggle('is-open',open);
    group.button.setAttribute('aria-expanded',String(open));
    group.button.setAttribute('aria-label',open?group.button.dataset.closeLabel:group.button.dataset.openLabel);
    if(!open)group.openedBy=null;
  }
  function closeGroups(except){groups.forEach(group=>{if(group!==except)setGroup(group,false);});}
  function openGroup(group,reason){closeGroups(group);setGroup(group,true);group.openedBy=reason;}
  function setMenu(open){
    menu?.setAttribute('aria-expanded',String(open));
    menu?.setAttribute('aria-label',open?menu.dataset.closeLabel:menu.dataset.openLabel);
    nav?.classList.toggle('is-open',open);
    if(!open)closeGroups();
    else if(!desktop?.matches)nav?.querySelector('.nav-link')?.focus({preventScroll:true});
  }
  groups.forEach(group=>{
    group.button.addEventListener('click',()=>{
      group.suppressFocus=false;
      if(group.panel.hidden||group.openedBy==='hover')openGroup(group,'click');else setGroup(group,false);
    });
    group.element.addEventListener('pointerenter',event=>{
      cancelLeave(group);
      if(event.pointerType==='mouse'&&desktop?.matches&&hover?.matches){
        group.suppressFocus=false;if(group.panel.hidden)openGroup(group,'hover');
      }
    });
    group.element.addEventListener('pointerleave',()=>{
      cancelLeave(group);
      group.timer=setTimeout(()=>{
        group.timer=null;
        if(group.openedBy!=='click'&&!group.element.contains(document.activeElement))setGroup(group,false);
      },250);
    });
    group.element.addEventListener('focusin',event=>{
      cancelLeave(group);
      // On touch, the adjacent page link and disclosure keep their distinct actions.
      if(event.target===group.link&&desktop?.matches&&!group.suppressFocus)openGroup(group,'focus');
    });
    group.element.addEventListener('focusout',event=>{
      if(!group.element.contains(event.relatedTarget)){group.suppressFocus=false;setGroup(group,false);}
    });
    group.element.addEventListener('keydown',event=>{
      if(event.key==='ArrowDown'&&(event.target===group.button||event.target===group.link)){
        event.preventDefault();group.suppressFocus=false;openGroup(group,'keyboard');group.panel.querySelector('a')?.focus();
      }
    });
  });
  menu?.addEventListener('click',()=>setMenu(menu.getAttribute('aria-expanded')!=='true'));
  nav?.addEventListener('click',event=>{if(event.target.closest('a'))setMenu(false);});
  nav?.addEventListener('focusout',event=>{
    if(!nav.contains(event.relatedTarget)&&!menu?.contains(event.relatedTarget))setMenu(false);
  });
  document.addEventListener('click',event=>{
    if(!nav?.contains(event.target)&&!menu?.contains(event.target))setMenu(false);
  });
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    const open=groups.find(group=>!group.panel.hidden);
    if(open){
      event.preventDefault();open.suppressFocus=true;setGroup(open,false);open.button.focus();return;
    }
    if(menu?.getAttribute('aria-expanded')==='true'){event.preventDefault();setMenu(false);menu.focus();}
  });
  desktop?.addEventListener?.('change',()=>{
    const focused=document.activeElement;
    const focusWasInNav=nav?.contains(focused);
    const focusedPanel=groups.find(group=>group.panel.contains(focused));
    setMenu(false);
    if(focusWasInNav&&!desktop.matches)menu?.focus();
    else if(focusedPanel)focusedPanel.button.focus();
  });
  // Only collapse the mobile navigation after all controls are ready.
  if(menu&&nav){
    menu.hidden=false;
    groups.forEach(group=>{group.button.hidden=false;setGroup(group,false);});
    document.body.classList.add('nav-ready');
  }
  function revealDocuments(){
    if(location.hash==='#documents')document.querySelector('details.project-documents')?.setAttribute('open','');
  }
  revealDocuments();
  browser?.addEventListener?.('hashchange',revealDocuments);
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href]');
    if(!link)return;
    const destination=new URL(link.href,location.href),current=new URL(location.href);
    if(destination.pathname===current.pathname&&destination.hash==='#documents')document.querySelector('details.project-documents')?.setAttribute('open','');
  });
  if(browser?.IntersectionObserver&&!reducedMotion?.matches){
    const observer=new browser.IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        if(!reducedMotion?.matches)entry.target.classList.add('reveal-enter');
        observer.unobserve(entry.target);
      });
    },{threshold:.12});
    document.querySelectorAll('.section-head, .project-card, .about-teaser, .service-row, .timeline article').forEach(element=>observer.observe(element));
  }
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
