/* Lenis enhances mouse-wheel scrolling; touch, forms and dialogs stay native. */
(() => {
  if(!window.Lenis||!window.matchMedia||!window.ResizeObserver||!window.MutationObserver||!window.requestAnimationFrame)return;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const fine=window.matchMedia('(pointer: fine)');
  let scroller=null;
  function destroy(){scroller?.destroy();scroller=null;}
  function syncDialog(){
    if(!scroller)return;
    const locked=document.body.classList.contains('modal-open')||document.body.classList.contains('gallery-open')||document.querySelector('dialog[open]');
    if(locked)scroller.stop();else scroller.start();
  }
  function configure(){
    if(reduced.matches||!fine.matches){destroy();return;}
    if(!scroller)scroller=new window.Lenis({
      autoRaf:true,lerp:.1,smoothWheel:true,syncTouch:false,
      anchors:false,allowNestedScroll:true,stopInertiaOnNavigate:true,
      // Shift-wheel and sideways trackpad gestures belong to the project rail.
      virtualScroll:({event,deltaX,deltaY})=>!event.shiftKey&&Math.abs(deltaY)>=Math.abs(deltaX),
      prevent:node=>Boolean(node.matches?.('dialog, .contact-panel, .quote-conversation, .lightbox-viewport'))
    });
    syncDialog();
  }
  const observer=new window.MutationObserver(syncDialog);
  observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  document.querySelectorAll('dialog').forEach(dialog=>observer.observe(dialog,{attributes:true,attributeFilter:['open']}));
  // A keyboard command or link always takes over from any remaining wheel inertia.
  function cancelInertia(){scroller?.scrollTo(window.scrollY,{immediate:true});}
  document.addEventListener('keydown',event=>{
    if(event.defaultPrevented||event.target.closest?.('input, textarea, select, [contenteditable]'))return;
    if(['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key))cancelInertia();
  });
  document.addEventListener('click',event=>{if(!event.defaultPrevented&&event.target.closest?.('a[href]'))cancelInertia();});
  reduced.addEventListener?.('change',configure);
  fine.addEventListener?.('change',configure);
  window.addEventListener('pagehide',destroy);
  window.addEventListener('pageshow',configure);
  configure();
})();
