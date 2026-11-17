
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { getAuth,signInWithEmailAndPassword,onAuthStateChanged,signOut } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { getFirestore,collection,getDocs,doc,setDoc,deleteDoc } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { getStorage,ref,uploadBytes,getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js';
import { firebaseConfig } from './firebase-config.js';

const app=initializeApp(firebaseConfig);
const auth=getAuth(app),db=getFirestore(app),storage=getStorage(app);
const $=id=>document.getElementById(id);
let kind='viajes_v2',records=[],selected=null,authorized=false;

const groups={
  viajes_v2:'Viajes',
  ofertas_v2:'Ofertas',
  portada_v2:'Fotografías de portada'
};

function configureEditor(){
  const portada=kind==='portada_v2';
  $('editTitle').textContent=portada?'Gestionar fotografía de portada':'Editar contenido';
  $('titulo').parentElement.firstChild.textContent=portada?'Nombre interno de la fotografía':'Título';
  $('descripcion').parentElement.classList.toggle('hidden',portada);
  $('travelFields').classList.toggle('hidden',kind!=='viajes_v2');
  $('offerFields').classList.toggle('hidden',kind!=='ofertas_v2');
  $('imagen').parentElement.firstChild.textContent=portada?'Ruta o URL de la fotografía':'URL de la imagen';
  $('file').parentElement.firstChild.textContent=portada?'Subir fotografía de portada':'Subir fotografía (Firebase Storage)';
  $('newBtn').textContent=portada?'+ Añadir fotografía':'+ Nuevo';
}

const msg=(s,err=false)=>{
  const e=$('status');
  e.textContent=s;
  e.classList.toggle('error',err);
};

$('loginForm').onsubmit=async e=>{
  e.preventDefault();
  $('loginMsg').textContent='Entrando...';
  try{
    await signInWithEmailAndPassword(auth,$('email').value.trim(),$('password').value);
    $('loginMsg').textContent='';
  }catch(e){
    $('loginMsg').textContent='No se pudo iniciar sesión. Revisa usuario y contraseña.';
  }
};

$('logout').onclick=()=>signOut(auth);

onAuthStateChanged(auth,async user=>{
  $('login').style.display=user?'none':'block';
  $('app').style.display=user?'block':'none';
  if(user){
    $('currentUser').textContent=user.email || 'Administración';
    msg('Comprobando permisos de la colección V2...');
    await load();
  }
});

const fields=[
  'titulo','descripcion','categoria','duracion',
  'caracteristicas','itinerario','incluye',
  'precio','fecha','imagen','orden'
];

function blank(){
  selected=null;
  $('editor').reset();
  $('orden').value=records.length;
  $('publicado').checked=true;
  if(kind==='portada_v2')$('titulo').value='Fotografía '+(records.length+1);
  $('preview').removeAttribute('src');
  $('editTitle').textContent='Nuevo contenido';
  $('deleteBtn').disabled=true;
  $('file').value='';
  paintList();
}

function selectRecord(id){
  selected=id;
  const x=records.find(r=>r.id===id);
  if(!x)return;
  for(const f of fields)$(f).value=x[f]??'';
  $('publicado').checked=x.publicado!==false;
  $('file').value='';
  $('preview').src=x.imagen||'';
  $('editTitle').textContent='Editar: '+(x.titulo||'Sin título');
  $('deleteBtn').disabled=false;
  paintList();
}

function paintList(){
  $('items').replaceChildren();
  for(const x of records){
    const b=document.createElement('button');
    b.type='button';
    b.className=x.id===selected?'selected':'';
    b.textContent=(x.publicado===false?'◌ ':'● ')+(x.titulo||'Sin título');
    b.onclick=()=>selectRecord(x.id);
    $('items').append(b);
  }
  if(!records.length)$('items').textContent='Aún no hay elementos en esta colección.';
}

async function load(){
  try{
    const snap=await getDocs(collection(db,kind));
    records=snap.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>(a.orden||0)-(b.orden||0));
    authorized=true;
    msg(`Colección ${groups[kind]} cargada. ${records.length} elementos. Recuerda que leer no garantiza permisos de escritura.`);
    blank();
    $('listTitle').textContent=groups[kind];
    configureEditor();
    $('seedArea').classList.toggle('hidden',kind!=='viajes_v2'||records.length>0);
  }catch(e){
    authorized=false;
    records=[];
    blank();
    msg('No hay permisos para consultar la colección. Publica primero las reglas V2 seguras. Detalle: '+(e.code||e.message),true);
    $('seedArea').classList.add('hidden');
  }
}

for(const b of document.querySelectorAll('.tab')){
  b.onclick=()=>{
    kind=b.dataset.kind;
    for(const t of document.querySelectorAll('.tab'))t.classList.toggle('secondary',t!==b);
    load();
  };
}

$('newBtn').onclick=blank;
$('imagen').oninput=()=>{$('preview').src=$('imagen').value||''};

$('editor').onsubmit=async e=>{
  e.preventDefault();
  if(!authorized)return msg('Primero debes tener permisos de lectura.',true);
  const b=$('saveBtn');
  b.disabled=true;
  msg('Guardando...');
  try{
    const payload={};
    for(const f of fields)payload[f]=$(f).value.trim();
    payload.orden=Number(payload.orden)||0;
    payload.precio=payload.precio?Number(payload.precio):'';
    payload.publicado=$('publicado').checked;
    const file=$('file').files[0];
    const id=selected||crypto.randomUUID();
    if(file){
      if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>3*1024*1024)
        throw Error('Formato no permitido o fotografía mayor de 3 MB');
      const extension=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'})[file.type];
      const storageRef=ref(storage,`crisve-v2/${kind}/${id}/${Date.now()}.${extension}`);
      await uploadBytes(storageRef,file,{contentType:file.type});
      payload.imagen=await getDownloadURL(storageRef);
    }
    await setDoc(doc(db,kind,id),payload);
    msg('Guardado correctamente en Firebase.');
    await load();
    selectRecord(id);
  }catch(e){
    msg('No se pudo guardar: '+(e.code||e.message)+'. Revisa las reglas y la configuración Firebase.',true);
  }finally{
    b.disabled=false;
  }
};

$('deleteBtn').onclick=async()=>{
  if(!selected||!confirm('¿Eliminar este elemento? Esta acción no se puede deshacer.'))return;
  try{
    await deleteDoc(doc(db,kind,selected));
    msg('Elemento eliminado.');
    await load();
  }catch(e){
    msg('No se pudo eliminar: '+(e.code||e.message),true);
  }
};

$('seedBtn').onclick=async()=>{
  if(kind!=='viajes_v2'||records.length)return;
  if(!confirm('Se importarán 41 viajes originales a viajes_v2. No se modificarán las reseñas ni la web oficial. ¿Continuar?'))return;
  const b=$('seedBtn');
  b.disabled=true;
  try{
    const data=await(await fetch('./viajes-iniciales.json')).json();
    let done=0;
    for(const x of data){
      const {id,...payload}=x;
      await setDoc(doc(db,'viajes_v2',id),payload);
      done++;
      msg(`Importando ${done}/${data.length} viajes...`);
    }
    await load();
    msg(`Importados ${done} viajes. Comprueba la web pública.`);
  }catch(e){
    msg('Importación parcial o fallida: '+(e.code||e.message)+'. Revisa los permisos antes de reintentar.',true);
  }finally{
    b.disabled=false;
  }
};
