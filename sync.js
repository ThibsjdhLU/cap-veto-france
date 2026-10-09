/* Cap Véto — client sync : le token de lecture est conservé seulement en mémoire.
   Aucun identifiant ÉcoleDirecte n'est demandé sur GitHub Pages. */
'use strict';
const SYNC_ENDPOINT_KEY = 'cap-veto-ed-sync-url-v1';
const SYNC_SAFE_HOST = /^(?:[a-z0-9-]+\.)+[a-z0-9-]+\.workers\.dev$/i;
let syncApiToken='';
let syncPending=null;
let syncCached=null;
let syncStatus=null;
const syncEl = id => document.getElementById(id);
function endpoint(){return localStorage.getItem(SYNC_ENDPOINT_KEY)||'';}
function validEndpoint(s){
  try{const u=new URL(s);return u.protocol==='https:'&&SYNC_SAFE_HOST.test(u.hostname)&&!u.port&&!u.username&&!u.password&&u.pathname==='/'&&!u.search&&!u.hash?u.origin:null;}catch{return null;}
}
function syncEscape(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
window.capVetoSyncPage=()=>`<div class="page-header"><div><div class="eyebrow">CONNEXION PRIVÉE</div><h1 class="page-title">Synchronisation ÉcoleDirecte</h1><p class="page-desc">Les notes sont récupérées en ligne par Cloudflare, même lorsque ton Mac est éteint. Cap Véto les importe uniquement après ton accord.</p></div></div>
<div class="layout-grid">
  <section class="card span-7"><h3 class="card-title">Connecter mon service privé</h3><p class="card-sub">L'adresse doit être celle de TON Worker Cloudflare, et non une adresse inconnue. Tu ne saisis jamais ton mot de passe ÉcoleDirecte ici.</p>
  <form id="sync-connect"><div class="field"><label for="sync-url">Adresse du Worker</label><input id="sync-url" required type="url" value="${syncEscape(endpoint())}" placeholder="https://cap-veto-ed-sync.xxx.workers.dev" autocomplete="url"></div>
  <div class="field" style="margin-top:14px"><label for="sync-key">Clé privée d'accès Cap Véto (pas ÉcoleDirecte)</label><input id="sync-key" type="password" placeholder="Clé secrète configurée sur Cloudflare" autocomplete="off" value="" required></div>
  <div class="form-actions"><button type="submit" class="btn primary">Se connecter et vérifier</button><button type="button" class="btn" id="sync-disconnect">Déconnecter</button></div></form>
  <div id="sync-feedback" class="info-strip blue" style="margin-top:14px">${syncApiToken?'Connexion configurée pour cette session.':'Aucune clé enregistrée dans le site : saisis-la à chaque nouvelle session.'}</div>
  </section>
  <section class="card span-5"><h3 class="card-title">Statut des mises à jour</h3><p class="card-sub">Le Worker interroge ÉcoleDirecte environ toutes les 6 heures.</p><div id="sync-status" class="info-strip">${syncStatus?syncEscape(syncStatus.ok?`Dernière récupération : ${syncStatus.updatedAt||'inconnue'}`:syncStatus.message||syncStatus.code):'Connexion non vérifiée.'}</div><div class="form-actions"><button class="btn" id="sync-refresh">Actualiser l'état</button><button class="btn" id="sync-now">Demander une récupération</button></div><p class="method">Cloudflare conserve une copie privée des notes normalisées. Aucune synchronisation ne fonctionne tant que le backend et ses secrets ne sont pas configurés.</p></section>
  <section class="card"><h3 class="card-title">Prévisualiser les notes</h3><div id="sync-preview"><p class="muted">Connecte le Worker puis utilise le bouton de prévisualisation. L'import ne modifie ni tes notes officielles de Première, ni tes simulations personnelles.</p></div><div class="form-actions"><button class="btn primary" id="sync-load">Prévisualiser les dernières notes</button><button class="btn" id="sync-apply" disabled>Importer les notes affichées</button></div><div class="side-note">Au premier import, Cap Véto propose de remplacer les notes de Terminale déjà saisies pour éviter tout double comptage. Une sauvegarde locale est créée avant remplacement. Aux imports suivants, les notes ÉcoleDirecte seront mises à jour par identifiant stable.</div></section>
</div>`;
async function api(path,method='GET'){
  const url=validEndpoint(endpoint());if(!url||!syncApiToken)throw Error('Connecte ton Worker avec ta clé privée.');
  let res;
  try{res=await fetch(`${url}${path}`,{method,headers:{Authorization:`Bearer ${syncApiToken}`},cache:'no-store',referrerPolicy:'no-referrer'});}catch{throw Error('Le Worker est inaccessible ou son CORS est mal configuré.');}
  let obj;try{obj=await res.json();}catch{throw Error('La réponse du Worker n’est pas du JSON.');}
  if(!res.ok)throw Error(res.status===401?'Clé d’accès refusée.':obj.message||obj.error||`Service indisponible (HTTP ${res.status}).`);
  return obj;
}
function showSyncFeedback(str){let el=syncEl('sync-feedback');if(el)el.textContent=str;}
async function fetchSyncStatus(){syncStatus=await api('/api/status');const el=syncEl('sync-status');if(el)el.textContent=syncStatus.ok?`Réussi : ${syncStatus.count} notes · ${new Date(syncStatus.updatedAt).toLocaleString('fr-FR')}`:`${syncStatus.code} — ${syncStatus.message||'En attente du premier lancement.'}`;}
function renderPreview(snapshot){
  if(snapshot.schema!=='cap-veto-ed-notes-v1'||!Array.isArray(snapshot.grades)||snapshot.grades.length>2000)throw Error('Format de synchronisation invalide.');
  const existing=state?.grades||[];const edCount=existing.filter(g=>g.id?.startsWith('ed-')).length,manualCount=existing.length-edCount;
  const rows=snapshot.grades.slice(-20).map(g=>`<tr><td>${syncEscape(g.date)}</td><td>${syncEscape(g.subject)}</td><td>${syncEscape(g.grade)}</td><td>${syncEscape(g.coefficient)}</td></tr>`).join('');
  const box=syncEl('sync-preview');if(box)box.innerHTML=`<p><strong>${snapshot.grades.length} évaluations</strong> sur l'année ${syncEscape(snapshot.schoolYear)}. Dernière collecte : ${syncEscape(new Date(snapshot.updatedAt).toLocaleString('fr-FR'))}.</p><p class="method">${manualCount?`${manualCount} note(s) manuelle(s) actuellement enregistrée(s). Leur remplacement sera proposé avant le premier import.`:'Aucune évaluation manuelle non liée à ÉcoleDirecte.'} ${edCount} évaluation(s) déjà synchronisée(s).</p><div class="table-scroll"><table class="data-table"><thead><tr><th>Date</th><th>Matière</th><th>Note</th><th>Coef.</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  syncPending=snapshot;if(syncEl('sync-apply'))syncEl('sync-apply').disabled=false;
}
function applyRemote(){
  if(!syncPending||!Array.isArray(syncPending.grades))return;
  const incoming=syncPending.grades;
  if(!incoming.every(g=>g&&/^(ed-\d{4}-\d{4}-\d{1,16})$/.test(g.id)&&SUBJECTS.includes(g.subject)&&Number.isFinite(g.grade)&&g.grade>=0&&g.grade<=20&&Number.isFinite(g.coefficient)&&g.coefficient>0&&g.coefficient<=100&&/^\d{4}-\d{2}-\d{2}$/.test(g.date)&&(g.classAvg===null||Number.isFinite(g.classAvg)&&g.classAvg>=0&&g.classAvg<=20)))throw Error('Note invalide dans la synchronisation.');
  const all=state?.grades||[];const manual=all.filter(g=>!g.id?.startsWith('ed-'));
  // Pour le tout premier import, la date des neuf anciennes notes est artificielle :
  // un remplacement confirmé est plus fiable qu'une déduplication basée sur ces dates.
  let keepManual=manual;
  if(manual.length&&!all.some(g=>g.id?.startsWith('ed-'))){
    if(!confirm(`PREMIÈRE SYNCHRONISATION : ${incoming.length} notes ÉcoleDirecte vont remplacer tes ${manual.length} notes de Terminale saisies manuellement. Tes notes officielles et ton historique seront conservés. Vérifie que les évaluations ÉcoleDirecte sont complètes. Continuer ?`))return;
    keepManual=[];
  }else if(manual.length){
    // Une évaluation saisie manuellement plus tard peut correspondre à une note déjà synchronisée.
    // On évite les correspondances approximatives : l'utilisateur est averti d'une possible duplication.
    if(!confirm(`${manual.length} note(s) manuelle(s) subsistent. Vérifie qu'elles ne correspondent pas aux nouvelles notes ÉcoleDirecte (sinon les moyennes seraient doublées). Continuer ?`))return;
  }
  const backup=state?JSON.stringify(state):null;
  if(backup){try{localStorage.setItem('cap-veto-pre-sync-backup-v1',backup)}catch{throw Error('Impossible de sauvegarder avant l’import. Exporte ton dossier JSON puis recommence.')}}
  if(!state)state={schema:'cap-veto-france-v1',grades:[],history:[],confirmed:{},settings:{forecasts:{},historySubject:'Physique-chimie'},checks:{}};
  // Les statistiques de période restent privées dans le dossier local.
  state.edPeriods=Array.isArray(syncPending.periods)?syncPending.periods:[];
  state.grades=[...keepManual,...incoming];
  persist();syncPending=null;render();toast(`${incoming.length} notes ÉcoleDirecte importées. Bac recalculé.`);
}
document.querySelector('#main').addEventListener('submit',async e=>{
  if(e.target.id!=='sync-connect')return;e.preventDefault();
  const url=validEndpoint(syncEl('sync-url').value.trim()),key=syncEl('sync-key').value.trim();
  if(!url||key.length<32)return showSyncFeedback('URL Cloudflare Workers ou clé invalide (32 caractères minimum).');
  localStorage.setItem(SYNC_ENDPOINT_KEY,url);syncApiToken=key;
  syncEl('sync-key').value='';
  showSyncFeedback('Vérification en cours...');
  try{await fetchSyncStatus();showSyncFeedback('Worker accessible. La clé reste seulement en mémoire jusqu’à fermeture de l’onglet.');}catch(err){syncApiToken='';showSyncFeedback(err.message);}
});
document.querySelector('#main').addEventListener('click',async e=>{
  const el=e.target.closest('button');if(!el)return;
  if(el.id==='sync-disconnect'){syncApiToken='';syncPending=null;syncStatus=null;showSyncFeedback('Déconnecté de ce navigateur. Les notes déjà importées restent présentes.');}
  if(el.id==='sync-apply')try{applyRemote();}catch(err){showSyncFeedback(err.message);}
  if(el.id==='sync-refresh')try{await fetchSyncStatus()}catch(err){showSyncFeedback(err.message);}
  if(el.id==='sync-load')try{const r=await api('/api/grades');renderPreview(r);showSyncFeedback('Notes chargées, aucune modification effectuée pour le moment.');}catch(err){showSyncFeedback(err.message);}
  if(el.id==='sync-now')try{const status=await api('/api/sync','POST');syncStatus=status;showSyncFeedback('Récupération terminée. Clique sur « Prévisualiser » pour voir les notes.');await fetchSyncStatus();}catch(err){showSyncFeedback(err.message);}
});
