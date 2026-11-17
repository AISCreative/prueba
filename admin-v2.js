import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, query, where, orderBy, onSnapshot, updateDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js';
import { firebaseConfig } from './firebase-config.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app), db = getFirestore(app), storage = getStorage(app);
const $ = id => document.getElementById(id);
let kind = 'viajes_v2', records = [], selected = null, authorized = false;
let reviewStatus = 'pendiente';
const reviewData = { pendiente: [], publicado: [], rechazado: [] };
let reviewUnsubs = [];
const groups = { viajes_v2: 'Viajes', ofertas_v2: 'Ofertas', portada_v2: 'Fotografías de portada' };
const fields = ['titulo','descripcion','categoria','duracion','caracteristicas','itinerario','incluye','precio','fecha','imagen','orden'];

const msg = (s, err = false) => { $('status').textContent = s; $('status').classList.toggle('error', err); };
function configureEditor() {
  const portada = kind === 'portada_v2';
  $('editTitle').textContent = portada ? 'Gestionar fotografía de portada' : 'Editar contenido';
  $('descripcion').parentElement.classList.toggle('hidden', portada);
  $('travelFields').classList.toggle('hidden', kind !== 'viajes_v2');
  $('offerFields').classList.toggle('hidden', kind !== 'ofertas_v2');
  $('imagen').parentElement.firstChild.textContent = portada ? 'Ruta o URL de la fotografía' : 'URL de la imagen';
  $('fileLabel').textContent = portada ? 'Subir fotografía de portada' : 'Subir fotografía (Firebase Storage)';
  $('newBtn').textContent = portada ? '+ Añadir fotografía' : '+ Nuevo';
}

$('loginForm').addEventListener('submit', async e => {
  e.preventDefault(); $('loginMsg').textContent = 'Entrando...';
  try { await signInWithEmailAndPassword(auth, $('email').value.trim(), $('password').value); $('loginMsg').textContent = ''; }
  catch { $('loginMsg').textContent = 'No se pudo iniciar sesión. Revisa usuario y contraseña.'; }
});
$('logout').onclick = () => signOut(auth);
onAuthStateChanged(auth, async user => {
  $('login').style.display = user ? 'none' : 'block'; $('app').style.display = user ? 'block' : 'none';
  if (user) { $('currentUser').textContent = user.email || 'Administración'; await load(); startReviewListeners(); }
  else { reviewUnsubs.forEach(fn => fn()); reviewUnsubs = []; }
});

function blank() {
  selected = null; $('editor').reset(); $('orden').value = records.length; $('publicado').checked = true;
  if (kind === 'portada_v2') $('titulo').value = 'Fotografía ' + (records.length + 1);
  $('preview').removeAttribute('src'); $('editTitle').textContent = 'Nuevo contenido'; $('deleteBtn').disabled = true; $('file').value = ''; paintList();
}
function selectRecord(id) {
  selected = id; const x = records.find(r => r.id === id); if (!x) return;
  for (const f of fields) $(f).value = x[f] ?? '';
  $('publicado').checked = x.publicado !== false; $('file').value = ''; $('preview').src = x.imagen || '';
  $('editTitle').textContent = 'Editar: ' + (x.titulo || 'Sin título'); $('deleteBtn').disabled = false; paintList();
}
function paintList() {
  $('items').replaceChildren();
  for (const x of records) { const b = document.createElement('button'); b.type = 'button'; b.className = x.id === selected ? 'selected' : ''; b.textContent = (x.publicado === false ? '◌ ' : '● ') + (x.titulo || 'Sin título'); b.onclick = () => selectRecord(x.id); $('items').append(b); }
  if (!records.length) $('items').textContent = 'Aún no hay elementos en esta colección.';
}
async function load() {
  try {
    const snap = await getDocs(collection(db, kind));
    records = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (a.orden || 0) - (b.orden || 0));
    authorized = true; msg(`Colección ${groups[kind]} cargada. ${records.length} elementos.`); blank();
    $('listTitle').textContent = groups[kind]; configureEditor();
    $('seedArea').classList.toggle('hidden', kind !== 'viajes_v2' || records.length > 0);
  } catch (e) { authorized = false; records = []; blank(); msg('No se pudo consultar esta colección: ' + (e.code || e.message), true); $('seedArea').classList.add('hidden'); }
}

function showPanel(panel) {
  const isReviews = panel === 'resenas';
  $('contentPanel').classList.toggle('hidden', isReviews);
  $('reviewsPanel').classList.toggle('hidden', !isReviews);
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('secondary', t.dataset-kind !== panel));
  if (!isReviews) { kind = panel; load(); }
}
document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => showPanel(b.dataset.kind)));
$('newBtn').onclick = blank;
$('imagen').oninput = () => { $('preview').src = $('imagen').value || ''; };
$('editor').onsubmit = async e => {
  e.preventDefault(); if (!authorized) return msg('No tienes permisos para guardar.', true);
  const b = $('saveBtn'); b.disabled = true; msg('Guardando...');
  try {
    const payload = {}; for (const f of fields) payload[f] = $(f).value.trim();
    payload.orden = Number(payload.orden) || 0; payload.precio = payload.precio ? Number(payload.precio) : ''; payload.publicado = $('publicado').checked;
    const file = $('file').files[0], id = selected || crypto.randomUUID();
    if (file) {
      if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 3*1024*1024) throw Error('Formato no permitido o fotografía mayor de 3 MB');
      const ext = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp'})[file.type];
      const storageRef = ref(storage, `crisve-v2/${kind}/${id}/${Date.now()}.${ext}`);
      await uploadBytes(storageRef, file, { contentType: file.type }); payload.imagen = await getDownloadURL(storageRef);
    }
    await setDoc(doc(db, kind, id), payload); msg('Guardado correctamente en Firebase.'); await load(); selectRecord(id);
  } catch (e) { msg('No se pudo guardar: ' + (e.code || e.message), true); }
  finally { b.disabled = false; }
};
$('deleteBtn').onclick = async () => {
  if (!selected || !confirm('¿Eliminar este elemento? Esta acción no se puede deshacer.')) return;
  try { await deleteDoc(doc(db, kind, selected)); msg('Elemento eliminado.'); await load(); }
  catch (e) { msg('No se pudo eliminar: ' + (e.code || e.message), true); }
};
$('seedBtn').onclick = async () => {
  if (kind !== 'viajes_v2' || records.length) return;
  if (!confirm('Se importarán los viajes originales a viajes_v2. ¿Continuar?')) return;
  const b = $('seedBtn'); b.disabled = true;
  try { const data = await (await fetch('./viajes-iniciales.json')).json(); let done = 0;
    for (const x of data) { const { id, ...payload } = x; await setDoc(doc(db, 'viajes_v2', id), payload); msg(`Importando ${++done}/${data.length} viajes...`); }
    await load(); msg(`Importados ${done} viajes.`);
  } catch (e) { msg('Importación parcial o fallida: ' + (e.code || e.message), true); }
  finally { b.disabled = false; }
};

// Reseñas: mismas operaciones del panel original, integradas en esta pantalla.
function startReviewListeners() {
  if (reviewUnsubs.length) return;
  for (const estado of ['pendiente','publicado','rechazado']) {
    const q = query(collection(db, 'resenas'), where('estado', '==', estado), orderBy('fechaCreacion', 'desc'));
    const unsub = onSnapshot(q, snap => {
      reviewData[estado] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      $('count' + estado[0].toUpperCase() + estado.slice(1)).textContent = reviewData[estado].length;
      if (reviewStatus === estado) renderReviews();
    }, err => { $('reviewsStatus').textContent = 'Error cargando reseñas: ' + (err.code || err.message); });
    reviewUnsubs.push(unsub);
  }
}
function escapeHtml(value) { const el = document.createElement('div'); el.textContent = value ?? ''; return el.innerHTML; }
function dateText(ts) { return ts?.toDate ? ts.toDate().toLocaleDateString('es-ES', {day:'numeric',month:'short',year:'numeric'}) : ''; }
function renderReviews() {
  const list = $('reviewList'), items = reviewData[reviewStatus]; list.replaceChildren();
  if (!items.length) { list.textContent = ({pendiente:'No hay reseñas pendientes.',publicado:'Aún no hay reseñas publicadas.',rechazado:'No hay reseñas rechazadas.'})[reviewStatus]; return; }
  for (const item of items) {
    const card = document.createElement('article'); card.className = 'review-card';
    const stars = '★'.repeat(Math.max(0, Math.min(5, Number(item.valoracion) || 0))) + '☆'.repeat(5 - Math.max(0, Math.min(5, Number(item.valoracion) || 0)));
    let actions = '';
    if (reviewStatus === 'pendiente') actions = `<button data-action="publicar" data-id="${escapeHtml(item.id)}">Publicar</button><button class="secondary" data-action="rechazar" data-id="${escapeHtml(item.id)}">Rechazar</button>`;
    else if (reviewStatus === 'publicado') actions = `<button class="secondary" data-action="pendiente" data-id="${escapeHtml(item.id)}">Quitar de publicadas</button><button class="danger" data-action="eliminar" data-id="${escapeHtml(item.id)}">Eliminar</button>`;
    else actions = `<button class="secondary" data-action="pendiente" data-id="${escapeHtml(item.id)}">Restaurar a pendiente</button><button class="danger" data-action="eliminar" data-id="${escapeHtml(item.id)}">Eliminar</button>`;
    card.innerHTML = `<div class="review-head"><strong>${escapeHtml(item.nombre || 'Anónimo')}</strong><span>${dateText(item.fechaCreacion)}</span></div><div class="review-stars">${stars}</div><p>${escapeHtml(item.mensaje || '')}</p>${item.fotoURL ? `<img class="review-photo" src="${escapeHtml(item.fotoURL)}" alt="Foto adjunta">` : ''}<div class="row review-actions">${actions}</div><label>Respuesta pública de Crisve Travel<textarea class="review-answer" maxlength="400" rows="2">${escapeHtml(item.respuesta || '')}</textarea></label><button data-action="responder" data-id="${escapeHtml(item.id)}">Guardar respuesta</button></div>`;
    list.append(card);
  }
}
document.querySelectorAll('.review-tab').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('.review-tab').forEach(t => t.classList.remove('active')); tab.classList.add('active'); reviewStatus = tab.dataset.estado; renderReviews();
}));
$('reviewList').addEventListener('click', async e => {
  const btn = e.target.closest('button[data-action]'); if (!btn) return;
  const { action, id } = btn.dataset, reviewRef = doc(db, 'resenas', id); btn.disabled = true;
  try {
    if (action === 'publicar') await updateDoc(reviewRef, { estado:'publicado', fechaPublicacion:serverTimestamp() });
    else if (action === 'rechazar') await updateDoc(reviewRef, { estado:'rechazado' });
    else if (action === 'pendiente') await updateDoc(reviewRef, { estado:'pendiente', fechaPublicacion:null });
    else if (action === 'eliminar') { if (confirm('¿Eliminar esta reseña de forma permanente?')) await deleteDoc(reviewRef); }
    else if (action === 'responder') {
      const answer = btn.closest('.review-card').querySelector('.review-answer').value.trim();
      await updateDoc(reviewRef, { respuesta:answer || null, fechaRespuesta:answer ? serverTimestamp() : null });
      $('reviewsStatus').textContent = 'Respuesta guardada.';
    }
  } catch (err) { $('reviewsStatus').textContent = 'No se pudo completar la acción: ' + (err.code || err.message); }
  finally { btn.disabled = false; }
});
