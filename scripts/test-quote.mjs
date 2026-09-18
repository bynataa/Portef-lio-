/* End-to-end intake logic with simulated delivery. No external mail is sent. */
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
const script=name=>fs.readFileSync(new URL('../public/'+name,import.meta.url),'utf8');
function setup({file='index.html',response={success:true},network=false,noFetch=false}={}){
 const {document,window}=parseHTML(fs.readFileSync(new URL('../dist/'+file,import.meta.url),'utf8'));
 const form=document.querySelector('.contact-form');
 let focused=null,requests=[],release,reset=0;
 window.HTMLElement.prototype.focus=function(){focused=this;};
 const dialog=document.querySelector('dialog.contact-dialog');
 if(dialog){dialog.showModal=()=>dialog.setAttribute('open','');dialog.close=()=>{dialog.removeAttribute('open');dialog.dispatchEvent(new window.Event('close'));};dialog.getBoundingClientRect=()=>({left:10,top:10,right:610,bottom:790});}
 form.checkValidity=form.reportValidity=()=>Boolean(form.querySelector('[name="name"]').value.trim()&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.querySelector('[name="email"]').value)&&form.querySelector('[name="message"]').value.trim());
 form.requestSubmit=()=>{if(form.checkValidity())form.dispatchEvent(new window.Event('submit',{cancelable:true}));};
 form.reset=()=>reset++;
 Object.defineProperty(form,'action',{value:form.getAttribute('action')});
 class FormData{constructor(form){return new Map([...form.querySelectorAll('input[name],textarea[name],select[name]')].map(el=>[el.name,el.tagName==='SELECT'?el.querySelectorAll('option')[el.selectedIndex||0].value:el.value]));}}
 const gate=new Promise(resolve=>release=resolve);
 const sandbox={document,URL,FormData,AbortController,location:{href:'https://renarchi.com.br/'+file},setTimeout:()=>1,clearTimeout:()=>{},fetch:noFetch?undefined:async(url,options)=>{requests.push({url,options});if(network==='pending')await gate;if(network===true)throw Error('offline');return {ok:true,json:async()=>response};}};
 vm.runInNewContext(script('contact.js'),sandbox);
 vm.runInNewContext(script('quote.js'),sandbox);
 const root=document.querySelector('.budget-assistant');
 const click=selector=>{const el=document.querySelector(selector);assert.ok(el,'Missing '+selector);el.dispatchEvent(new window.Event('click',{cancelable:true,bubbles:true}));};
 const enter=value=>{root.querySelector('.quote-answer').value=value;root.querySelector('.quote-composer').dispatchEvent(new window.Event('submit',{cancelable:true}));};
 const answer=({service='renovation',details='Reformar sala e cozinha.',skip=true}={})=>{
 click(`[data-answer="${service}"]`);click('[data-answer="house"]');enter('Jardim Primavera, Duque de Caxias, Brasil');enter(details);
 if(skip)click('.quote-skip');else enter('80 m²');
 click('[data-answer="three"]');if(skip)click('.quote-skip');else enter('R$ 80.000 a R$ 100.000');
 enter('Cliente de teste');enter('cliente@example.com');if(skip)click('.quote-skip');else enter('+55 21 99999-9999');
 };
 return {document,root,form,dialog,requests,click,enter,answer,release,tick:()=>new Promise(r=>setImmediate(r)),get reset(){return reset},get focused(){return focused}};
}
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
await test('Both languages collect a complete request, permit review, and send exactly once to the requested email',async()=>{
 for(const file of ['index.html','en/index.html','projects/ambrosini/index.html']){
 const e=setup({file,network:'pending'});e.click('[data-contact-open]');assert.ok(e.focused.hasAttribute('data-current-focus'));
 e.answer({skip:false});assert.ok(e.root.querySelector('.quote-summary'));assert.equal(e.requests.length,0,'No sending before final review');
 if(file.includes('projects/'))assert.ok(e.root.textContent.includes('Residência Ambrosini'));
 e.click('.quote-send');e.click('.quote-send');assert.equal(e.requests.length,1);assert.equal(e.root.querySelector('.quote-send').disabled,true);
 const request=e.requests[0],payload=JSON.parse(request.options.body);
 assert.equal(request.url,'https://formsubmit.co/ajax/renarchi.urb@gmail.com');assert.equal(payload._replyto,'cliente@example.com');
 for(const expected of ['Cliente de teste','80 m²','R$ 80.000 a R$ 100.000','Reformar sala e cozinha.','+55 21 99999-9999'])assert.ok(payload.message.includes(expected));
 assert.ok(payload._subject.includes(file.startsWith('en')?'Request a quote':'Pedir um orçamento'));
 e.release();await e.tick();assert.ok(e.root.querySelector('.quote-success'));assert.equal(e.root.querySelector('.quote-send'),null);assert.equal(e.reset,1);
 }
});
await test('Back, optional answers, and summary edits preserve the request; content is rendered as plain text',async()=>{
 const e=setup();e.click('[data-answer="visualization"]');e.click('[data-answer="office"]');e.enter('Rio');
 assert.ok(e.root.querySelector('.quote-question').textContent.includes('3D'));
 e.click('.quote-back');assert.equal(e.root.querySelector('.quote-answer').value,'Rio');e.enter('Niterói');
 e.enter('<img src=x onerror=alert(1)>');e.click('.quote-skip');e.click('[data-answer="planning"]');e.click('.quote-skip');e.enter('Maria');e.enter('maria@example.com');e.click('.quote-skip');
 assert.ok(e.root.textContent.includes('Não informado'));assert.equal(e.root.querySelector('img'),null);
 e.click('[aria-label="Editar: Localização"]');e.enter('São Gonçalo');assert.ok(e.root.querySelector('.quote-summary'));assert.ok(e.root.textContent.includes('São Gonçalo'));
 e.click('[data-contact-mode="message"]');assert.equal(e.root.hidden,true);e.click('[data-contact-mode="quote"]');assert.ok(e.root.textContent.includes('São Gonçalo'));
 e.click('.quote-send');await e.tick();assert.ok(JSON.parse(e.requests[0].options.body).message.includes('<img src=x onerror=alert(1)>'));
});
await test('Invalid email is rejected and typed contact details never trigger early delivery',async()=>{
 const e=setup();e.click('[data-answer="guidance"]');e.click('[data-answer="other"]');e.enter('Rio');e.enter('Preciso de orientação.');e.click('.quote-skip');e.click('[data-answer="soon"]');e.click('.quote-skip');e.enter('Paula');e.enter('email-invalido');
 assert.ok(e.root.querySelector('.quote-validation').textContent.includes('e-mail válido'));assert.equal(e.requests.length,0);
 e.enter('paula@example.com');e.click('.quote-skip');assert.ok(e.root.querySelector('.quote-summary'));assert.equal(e.requests.length,0);
});
await test('Activation and network errors preserve the review and allow retry instead of showing success',async()=>{
 for(const options of [{response:{success:true,message:'Please activate your form'}},{network:true}]){
 const e=setup(options);e.answer();e.click('.quote-send');await e.tick();
 assert.ok(e.root.querySelector('.quote-summary'));assert.equal(e.root.querySelector('.quote-send').disabled,false);assert.ok(e.root.querySelector('.quote-status').textContent.length>20);assert.equal(e.root.querySelector('.quote-success'),null);assert.equal(e.reset,0);
 e.click('.quote-send');await e.tick();assert.equal(e.requests.length,2);
 }
});
await test('Conversation nodes stay in place and drafts survive going back or changing contact mode',async()=>{
 const e=setup();const log=e.root.querySelector('.quote-conversation');
 e.click('[data-answer="renovation"]');
 const firstTurn=e.root.querySelector('[data-step="service"]');
 e.click('[data-answer="house"]');
 assert.equal(e.root.querySelector('.quote-conversation'),log);
 assert.equal(e.root.querySelector('[data-step="service"]'),firstTurn);
 const draft=e.root.querySelector('.quote-answer');draft.value='Resposta ainda não enviada';
 e.click('.quote-back');e.click('[data-answer="house"]');
 assert.equal(e.root.querySelector('.quote-answer').value,'Resposta ainda não enviada');
 e.click('[data-contact-mode="message"]');e.click('[data-contact-mode="quote"]');
 assert.equal(e.root.querySelector('.quote-answer').value,'Resposta ainda não enviada');
 assert.ok(e.root.querySelector('.quote-compose-dock .quote-composer'));
 assert.equal(e.requests.length,0);
});
await test('Without delivery APIs, the ordinary HTML form stays available',async()=>{
 const e=setup({noFetch:true});assert.equal(e.root.hidden,true);assert.equal(e.document.querySelector('.quick-message').hidden,false);assert.equal(e.document.querySelector('.contact-modes').hidden,true);
});
console.log(`${passed} quote intake checks passed; delivery service responses simulated.`);
