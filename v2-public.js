import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { getFirestore, collection, getDocs, query, where } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
const app=getApps().find(a=>a.name==='crisve-v2-public')||initializeApp(firebaseConfig,'crisve-v2-public');
const db=getFirestore(app);
const fallbackTrips=await (await fetch('./viajes-iniciales.json')).json();
let trips=fallbackTrips;
const safe=t=>String(t??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function picture(src){if(!src)return '';try{const u=new URL(src,location.href);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
function openTrip(t){document.getElementById('v2TripTitle').textContent=t.titulo;document.getElementById('v2TripDescription').textContent=t.descripcion||'';document.getElementById('v2TripMeta').textContent=[t.duracion,t.fecha,t.precio?`Desde ${t.precio} €`:''].filter(Boolean).join(' · ');document.getElementById('v2TripFeatures').textContent=t.caracteristicas||[t.duracion?`Duración: ${t.duracion}`:'',t.fecha?`Fechas: ${t.fecha}`:'',t.precio?`Precio desde: ${t.precio} €`:'',t.categoria?`Tipo de viaje: ${t.categoria}`:''].filter(Boolean).join('\n')||'Consulta las características de este viaje con Crisve Travel.';document.getElementById('v2TripRoute').textContent=t.itinerario||'Consulta con Verónica el itinerario disponible para este viaje.';document.getElementById('v2TripIncludes').textContent=t.incluye||'Solicita las condiciones y los servicios incluidos.';const im=document.getElementById('v2TripPhoto');im.src=picture(t.imagen)||'images/fondo/fondo1.jpg';im.alt=t.titulo;document.getElementById('v2TripWhatsapp').href='https://wa.me/34663584491?text='+encodeURIComponent(`Hola Crisve Travel, me gustaría información sobre ${t.titulo}`);document.getElementById('v2TripModal').hidden=false;document.body.style.overflow='hidden';}
const modal=document.getElementById('v2TripModal');function closeTrip(){modal.hidden=true;document.body.style.overflow='';}document.getElementById('v2TripClose').onclick=closeTrip;modal.addEventListener('click',e=>{if(e.target===modal)closeTrip()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeTrip()});
function renderTrips(){for(const pane of document.querySelectorAll('.tab-pane[id]')){const category=trips.filter(t=>t.publicado!==false&&t.categoria===pane.id).sort((a,b)=>(a.orden||0)-(b.orden||0));const grid=pane.querySelector('.categoria-grid');if(!grid)continue;grid.replaceChildren();for(const t of category){const card=document.createElement('div');card.className='travel-card';card.innerHTML=`<div class="card-img"></div><div class="card-content"><h3>${safe(t.titulo)}</h3><p>${safe(t.descripcion)}</p><span class="badge-days">${safe(t.duracion||'Consultar días')}</span><div><button class="btn-small" type="button">Ver itinerario →</button></div></div>`;card.querySelector('.card-img').style.backgroundImage=`url("${picture(t.imagen)}")`;card.querySelector('button').addEventListener('click',()=>openTrip(t));grid.append(card);}}}
function renderOffers(offers){const el=document.getElementById('v2OffersGrid');el.replaceChildren();if(!offers.length){el.innerHTML='<p class="v2-empty">Muy pronto publicaremos nuevas ofertas. También puedes consultarnos por WhatsApp.</p>';return;}for(const o of offers){const art=document.createElement('article');art.className='v2-offer';art.innerHTML=`${o.imagen?'<img alt="">':''}<div class="inside"><h3>${safe(o.titulo)}</h3><p>${safe(o.descripcion||'')}</p>${o.precio?`<div class="price">Desde ${safe(o.precio)} €</div>`:''}${o.fecha?`<p>${safe(o.fecha)}</p>`:''}<a target="_blank" rel="noopener">Consultar oferta →</a></div>`;if(o.imagen)art.querySelector('img').src=picture(o.imagen);art.querySelector('a').href='https://wa.me/34663584491?text='+encodeURIComponent(`Hola Crisve Travel, quiero información sobre la oferta ${o.titulo}`);el.append(art);}}
const defaultSlides=['images/espana/lanzarote.jpg','images/europa/viaje3.jpg','images/espana/menorca.jpg','images/marruecos/desde-marrakech.jpg'];
let slideIndex=0,slides=defaultSlides;
const hero=document.getElementById('v2Hero');
function showSlide(i){if(!slides.length)return;slideIndex=(i+slides.length)%slides.length;hero.style.backgroundImage=`url("${picture(slides[slideIndex])}")`;}
showSlide(0);
setInterval(()=>{if(!document.hidden&&slides.length>1)showSlide(slideIndex+1)},5200);
renderTrips();renderOffers([]);
// Firestore is read-only here; no collections are created, updated, or deleted by visitors.
try{const snap=await getDocs(query(collection(db,'viajes_v2'),where('publicado','==',true)));if(!snap.empty){trips=snap.docs.map(d=>({id:d.id,...d.data()}));renderTrips();}}catch(e){console.warn('V2: viajes iniciales de respaldo',e.code||e.message)}
try{const snap=await getDocs(query(collection(db,'ofertas_v2'),where('publicado','==',true)));renderOffers(snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.publicado===true));}catch(e){console.warn('V2: ofertas no disponibles',e.code||e.message)}
try{const snap=await getDocs(query(collection(db,'portada_v2'),where('publicado','==',true)));const images=snap.docs.map(d=>d.data()).filter(x=>x.publicado!==false&&picture(x.imagen)).sort((a,b)=>(a.orden||0)-(b.orden||0)).map(x=>x.imagen);if(images.length){slides=images;showSlide(0);}}catch(e){console.warn('V2: portada de respaldo',e.code||e.message)}

// Preview de cambios del panel: solo en este navegador de pruebas.
try {
  const local=k=>{const raw=localStorage.getItem('crisve-v2-demo-'+k);return raw===null?null:JSON.parse(raw)};
  const lv=local('viajes_v2');if(lv){trips=lv;renderTrips();}
  const lo=local('ofertas_v2');if(lo)renderOffers(lo.filter(x=>x.publicado!==false));
  const lp=local('portada_v2');if(lp){const x=lp.filter(x=>x.publicado!==false&&picture(x.imagen)).sort((a,b)=>(a.orden||0)-(b.orden||0)).map(x=>x.imagen);if(x.length){slides=x;showSlide(0)}}
} catch(e){console.warn('Previsualización local no disponible',e)}
