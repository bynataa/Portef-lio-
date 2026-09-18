/* Integration boundaries are simulated; no messages are sent by these tests. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
const source=fs.readFileSync(new URL('../public/contact.js',import.meta.url),'utf8');
function setup({file='index.html',response={ok:true,json:async()=>({success:'true'})},valid=true,honey='',network=false}={}){
 const {document,window}=parseHTML(fs.readFileSync(new URL('../dist/'+file,import.meta.url),'utf8'));
 const form=document.querySelector('form'),status=form.querySelector('.contact-status'),button=form.querySelector('button');
 let reset=0,focused=null,requests=[],timer;
 for(const el of document.querySelectorAll('*'))el.focus=()=>{focused=el;};
 const dialog=document.querySelector('.contact-dialog');
 if(dialog){dialog.showModal=()=>dialog.setAttribute('open','');dialog.close=()=>{dialog.removeAttribute('open');dialog.dispatchEvent(new window.Event('close'));};dialog.getBoundingClientRect=()=>({left:10,right:610,top:10,bottom:790});}
 form.reportValidity=()=>valid;
 form.reset=()=>reset++;
 Object.defineProperty(form,'action',{value:form.getAttribute('action')});
 const payload={name:'Visitante de teste',email:'visitor@example.com',message:'Projeto de interiores',Solicitacao:'Pedir um orçamento',_honey:honey};
 class FormData{constructor(){return new Map(Object.entries(payload));}}
 let release;
 const gate=new Promise(resolve=>release=resolve);
 vm.runInNewContext(source,{document,FormData,URL,AbortController,location:{href:'https://renarchi.com.br/'+file},
 setTimeout:fn=>{timer=fn;return 1;},clearTimeout:()=>{},
 fetch:async(url,options)=>{requests.push({url,options});if(network==='pending'){await gate;}if(network===true)throw Error('offline');if(network==='timeout')await new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(Error('timeout'))));return response;}});
 const submit=()=>form.dispatchEvent(new window.Event('submit',{cancelable:true}));
 const tick=()=>new Promise(resolve=>setImmediate(resolve));
 return {document,window,form,status,button,dialog,submit,tick,requests,release,timeout:()=>timer(),get reset(){return reset},get focused(){return focused}};
}
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
await test('PT/EN dialog opens, closes and returns focus; inline form remains available',async()=>{
 for(const file of ['index.html','en/index.html','projects/ambrosini/index.html']){
 const e=setup({file}),opener=e.document.querySelector('[data-contact-open]');
 opener.dispatchEvent(new e.window.Event('click',{cancelable:true}));
 assert.ok(e.dialog.hasAttribute('open'));assert.equal(e.focused,e.form.querySelector('[name="name"]'));
 e.dialog.close();assert.equal(e.focused,opener);assert.ok(!e.document.body.classList.contains('modal-open'));
 }
 for(const file of ['contact/index.html','en/contact/index.html']){
 const e=setup({file});assert.equal(e.dialog,null);assert.equal(e.form.getAttribute('method'),'POST');
 assert.equal(e.form.querySelector('[name="email"]').getAttribute('type'),'email');
 for(const name of ['name','email','message'])assert.ok(e.form.querySelector(`[name="${name}"]`).hasAttribute('required'));
 }
});
await test('Successful delivery request uses the requested recipient, Reply-To and page reference',async()=>{
 for(const success of [true,'true']){
 const e=setup({response:{ok:true,json:async()=>({success})}});e.submit();await e.tick();
 assert.equal(e.requests[0].url,'https://formsubmit.co/ajax/renarchi.urb@gmail.com');
 const payload=JSON.parse(e.requests[0].options.body);
 assert.equal(payload._replyto,'visitor@example.com');assert.equal(payload._url,'https://renarchi.com.br/index.html');
 assert.ok(payload._subject.includes('Pedir um orçamento'));assert.equal(e.reset,1);
 assert.equal(e.status.dataset.state,'success');assert.equal(e.button.disabled,false);
 }
});
await test('Invalid or bot-filled forms are not sent',async()=>{
 for(const options of [{valid:false},{honey:'spam'}]){const e=setup(options);e.submit();await e.tick();assert.equal(e.requests.length,0);}
});
await test('Double submissions are blocked while awaiting the service',async()=>{
 const e=setup({network:'pending'});e.submit();e.submit();assert.equal(e.requests.length,1);
 assert.equal(e.button.disabled,true);e.release();await e.tick();assert.equal(e.button.disabled,false);
});
await test('HTTP, service, parse, network and timeout failures retain the message and allow retry',async()=>{
 for(const options of [{response:{ok:false,json:async()=>({success:true})}},{response:{ok:true,json:async()=>({success:false})}},{response:{ok:true,json:async()=>({success:'false'})}},{response:{ok:true,json:async()=>{throw Error('invalid JSON')}}},{network:true},{network:'timeout'}]){
 const e=setup(options);e.submit();if(options.network==='timeout')e.timeout();await e.tick();
 assert.equal(e.reset,0);assert.equal(e.status.dataset.state,'error');assert.equal(e.button.disabled,false);
 assert.equal(e.form.hasAttribute('aria-busy'),false);
 }
});
await test('Activation response never appears as confirmed delivery',async()=>{
 const e=setup({response:{ok:true,json:async()=>({success:true,message:'Please activate your form. Check your email.'})}});
 e.submit();await e.tick();assert.equal(e.reset,0);assert.equal(e.status.textContent,e.form.dataset.activation);
});
console.log(`${passed} contact checks passed (simulated responses; email inbox not verified).`);
