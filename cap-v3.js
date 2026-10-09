/* Cap Véto v3 — tableaux lisibles, données officielles prioritaires, scénarios explicités.
   Aucune donnée scolaire / aucun token dans les fichiers GitHub Pages. */
'use strict';
(() => {
  const GOAL = 16;
  const EPS=1e-8;
  const fmt3=(x,d=2)=>typeof x==='number'&&Number.isFinite(x)?x.toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
  const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=20;
  const esc3=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ceilGrade=x=>Math.max(0,Math.ceil((x-EPS)*100)/100);
  const SUBJECT_EXCLUDE=new Set(['EMC']); // Observation locale à confirmer par la méthode de l'établissement.
  const ED_SUBJECT_NAMES=['Physique-chimie','SVT','Maths complémentaires','Anglais','Espagnol','Histoire-géographie','Enseignement scientifique','Philosophie','EPS'];
  const order=['Physique-chimie','SVT','Maths complémentaires','Histoire-géographie','Enseignement scientifique','Anglais','Espagnol','Philosophie','EPS','EMC'];
  let coefNext=1,selected='all';
  const link=(label,hash)=>`<a class="cv-link" href="#${hash}">${esc3(label)} <span aria-hidden="true">→</span></a>`;
  const safeText=x=>esc3(x);
  function officialPeriod(s){
    const periods=Array.isArray(s?.edPeriods)?s.edPeriods:[];
    return periods.find(p=>p&&!p.isAnnual&&valid(p.studentAvg))||periods.find(p=>p&&valid(p.studentAvg))||null;
  }
  function activeRows(s){
    const groups=new Map();
    for(const g of (Array.isArray(s?.grades)?s.grades:[])){
      if(!g||!ED_SUBJECT_NAMES.includes(g.subject)||!valid(g.grade)||!Number.isFinite(g.coefficient)||g.coefficient<=0||g.coefficient>100)continue;
      const prev=groups.get(g.subject)||{subject:g.subject,sum:0,weight:0,notes:[],paired:[]};
      prev.sum+=g.grade*g.coefficient;prev.weight+=g.coefficient;prev.notes.push(g);
      if(valid(g.classAvg))prev.paired.push(g);
      groups.set(g.subject,prev);
    }
    return [...groups.values()].map(r=>({...r,mean:r.sum/r.weight,n:r.notes.length,classGap:r.paired.length?
      r.paired.reduce((a,g)=>a+(g.grade-g.classAvg)*g.coefficient,0)/r.paired.reduce((a,g)=>a+g.coefficient,0):null})).sort((a,b)=>order.indexOf(a.subject)-order.indexOf(b.subject));
  }
  function schoolContext(s){
    const rows=activeRows(s);
    const period=officialPeriod(s);
    const official=period?.studentAvg??null;
    const model=rows.length?rows.reduce((a,r)=>a+r.mean,0)/rows.length:null;
    // Exact agreement is strong evidence that the visible active subjects carry equal weight;
    // it is not proof of the school's rule for future exams/subject activation.
    const matches=official!==null&&model!==null&&Math.abs(model-official)<=0.045;
    const supportsProjection=official===null||matches;
    const base=matches?official:model;
    return {rows,period,official,model,matches,supportsProjection,base};
  }
  function requiredForSchool(ctx,subject,coef=1,goal=GOAL){
    const row=ctx.rows.find(x=>x.subject===subject);
    if(!row||ctx.base===null||!ctx.supportsProjection||!(coef>0))return null;
    const n=ctx.rows.length;
    // New overall mean assumes equal-weight active subjects, no other changes.
    const needed=row.mean+(goal-ctx.base)*n*(row.weight+coef)/coef;
    const nextAverage=g=>ctx.base+(((row.sum+g*coef)/(row.weight+coef))-row.mean)/n;
    return {subject,needed,rounded:needed>20?null:ceilGrade(needed),lowest:nextAverage(0),highest:nextAverage(20),mean:row.mean,currentW:row.weight,old:ctx.base,coef,nextAverage};
  }
  function schoolGoals(ctx){return ctx.rows.map(r=>requiredForSchool(ctx,r.subject,coefNext)).filter(Boolean);}
  function projectedBac(s){
    if(!s)return null;
    const p=projection();
    const fixed=p.parts.filter(x=>x.kind==='acquis');
    const gained=fixed.reduce((a,x)=>a+x.coef*x.value,0);
    const remaining=p.denom-fixed.reduce((a,x)=>a+x.coef,0);
    const needed=(GOAL*p.denom-gained)/remaining;
    const total=p.parts.reduce((a,x)=>a+x.coef*x.value,0);
    const exams=['pc_exam','svt_exam','philo_exam','oral_exam','eps_t'];
    const minExams=exams.map(k=>{
      const r=p.parts.find(x=>x.key===k);
      if(!r)return null;
      const t=(GOAL*p.denom-(total-r.value*r.coef))/r.coef;
      return {...r,needed:t,rounded:t>20?null:ceilGrade(t)};
    }).filter(Boolean);
    return {...p,gained,remaining,remainingMean:needed,minExams};
  }
  function bullet(subject,s){
    const period=officialPeriod(s);
    const item=period?.disciplines?.find(x=>x.subject===subject);
    return item&&valid(item.studentAvg)?item:null;
  }
  function percentileHint(){return `<span class="cv-muted">Min/max : bornes du devoir communiqué par ÉcoleDirecte. Impossible de déduire un rang exact.</span>`;}
  function valueBadge(x,units=' / 20'){return Number.isFinite(x)?`${fmt3(x)}<small>${units}</small>`:'—';}
  function head(kicker,title,description){return `<header class="cv-heading"><p class="cv-kicker">${esc3(kicker)}</p><h1>${esc3(title)}</h1>${description?`<p>${description}</p>`:''}</header>`;}
  function refNotice(ctx){
    if(ctx.official!==null)return `ÉcoleDirecte indique ${fmt3(ctx.official)}/20${ctx.period?.label?` pour « ${esc3(ctx.period.label)} »`:''}. ${ctx.matches?'La moyenne reconstituée sur les matières notées est cohérente.':'Le recalcul ne concorde pas : les seuils de moyenne générale sont suspendus.'}`;
    return `La moyenne générale officielle n’a pas encore été importée depuis ÉcoleDirecte. Le résultat ci-dessus, s’il existe, est une estimation à partir des matières notées, non une valeur officielle.`;
  }
  function gradeMessage(g){
    if(!g)return 'Pas assez de données fiables pour calculer un seuil.';
    if(g.needed>20+EPS)return 'Impossible en un seul devoir, même avec 20/20.';
    if(g.needed<=0)return 'Même 0/20 suffirait mathématiquement dans ce scénario. Ce n’est pas une note conseillée.';
    return `Pour conserver au moins ${GOAL}/20 de moyenne générale dans ce scénario.`;
  }
  function focusRows(ctx){
    return [...ctx.rows].sort((a,b)=>a.mean-b.mean).slice(0,3);
  }
  function coreIntro(ctx, bac){
    const g=schoolGoals(ctx);const validAll=g.length===ctx.rows.length&&g.length>0;
    const universal=validAll?g.reduce((a,b)=>a.needed>b.needed?a:b):null;
    const floor=universal?.rounded;
    const school=ctx.official??ctx.model;
    const displayedKind=ctx.official!==null?'Moyenne ÉcoleDirecte':'Moyenne reconstituée';
    const ratio=bac?bac.score-GOAL:null;
    return `${head('Le point aujourd’hui','Ton cap : 16 au bac','Une lecture claire de tes résultats et des notes à viser, sans multiplier les indicateurs.')}
      <div class="cv-scoreline"><section class="cv-headmetric"><span>${displayedKind}</span><strong>${valueBadge(school)}</strong><small>${ctx.official!==null?'Valeur fournie par ÉcoleDirecte':'Estimation locale · à confirmer'}</small></section>
      <section class="cv-headmetric"><span>Projection du bac</span><strong>${valueBadge(bac?.score)}</strong><small>Scénario, pas note acquise · ${bac?bac.earned+' / '+bac.denom+' coefficients acquis':''}</small></section></div>
      <p class="cv-outcome ${ratio!==null&&ratio>=0?'ok':''}">${ratio===null?'Importe ton dossier pour commencer.':ratio>=0?`À ce jour, ton scénario de bac est <strong>${fmt3(ratio)} point${ratio>=2?'s':''} au-dessus</strong> de l’objectif 16.`:`Ta projection est <strong>${fmt3(-ratio)} point(s) en dessous</strong> de l’objectif 16.`} <span>Ce n’est pas une garantie du résultat final.</span></p>
      <div class="cv-two">
        <section class="cv-emphasis"><div class="cv-overline">Prochain devoir · moyenne scolaire</div>
         <h2>${universal?universal.needed>20?'Non atteignable':`${fmt3(floor)}<span> / 20</span>`:'À calculer'}</h2>
         <p>${universal?`Plancher mathématique <strong>quelle que soit la matière déjà notée</strong> (devoir coefficient ${fmt3(coefNext,2)}), pour maintenir au moins 16 de moyenne générale ${ctx.official!==null?'dans le modèle cohérent avec ÉcoleDirecte':'dans le modèle estimé'}.`:'La formule de la moyenne générale doit d’abord être rapprochée de celle d’ÉcoleDirecte.'}</p>
         <div class="cv-quietline"><label for="cv-coef-home">Coefficient supposé du prochain devoir</label> ${coefControl('cv-coef-home')}</div>
         ${universal?`<p class="cv-driving">La matière déterminante ici : <strong>${esc3(universal.subject)}</strong>. Si le devoir a un autre coefficient, le seuil change.</p>`:''}
         ${link('Voir les seuils matière par matière','matieres')}
        </section>
        <section class="cv-simple"><div class="cv-overline">Ton objectif du bac</div>
         <h2>${valueBadge(bac?.remainingMean)}</h2><p>Moyenne pondérée à obtenir sur les <strong>${bac?.remaining??'—'} coefficients encore non acquis</strong> pour atteindre 16/20 au bac.</p>
         ${link('Voir le détail des épreuves','bac')}
        </section>
      </div>
      <section class="cv-section"><h2>Où concentrer tes efforts ?</h2>
      <p class="cv-sectionhint">Les matières les moins hautes actuellement — sans confondre importance scolaire et poids au concours vétérinaire.</p>
      <div class="cv-simplelist">${focusRows(ctx).map(x=>`<a href="#matieres" class="cv-subjectlink"><span>${esc3(x.subject)}</span><strong>${fmt3(bullet(x.subject,state)?.studentAvg??x.mean)} / 20</strong><span class="cv-arrow">→</span></a>`).join('')||'<p>Aucune évaluation importée.</p>'}</div></section>
      <div class="cv-footnote"><strong>Comment lire ces chiffres ?</strong> ${esc3(refNotice(ctx))} Un devoir isolé ne garantit pas le bac : les prochains examens et les résultats futurs restent inconnus.</div>`;
  }
  function coefControl(id){return `<select id="${id}" class="cv-select" aria-label="Coefficient supposé"><option value="0.25" ${coefNext===.25?'selected':''}>0,25</option><option value="0.5" ${coefNext===.5?'selected':''}>0,5</option><option value="1" ${coefNext===1?'selected':''}>1</option><option value="2" ${coefNext===2?'selected':''}>2</option><option value="3" ${coefNext===3?'selected':''}>3</option></select>`;}
  function targetLabel(x){
    if(!x)return '—';
    if(x.needed>20+EPS)return 'Impossible';
    if(x.needed<=0)return '0,00';
    return fmt3(x.rounded);
  }
  function subjectsPage(ctx){
    const gs=schoolGoals(ctx);
    const school=ctx.official??ctx.model;
    const universal=gs.length===ctx.rows.length&&gs.length?gs.reduce((a,b)=>a.needed>b.needed?a:b):null;
    return `${head('Concrètement','Mes matières','Pour chaque matière, la note minimale au prochain devoir pour rester sur une moyenne générale de 16 — si les autres notes restent inchangées.')}
      <div class="cv-callout"><div><span class="cv-overline">Seuil commun à toutes les matières déjà notées</span><strong>${targetLabel(universal)} ${universal?.rounded!==null?'/ 20':''}</strong></div>
      <p>${universal?`En supposant le prochain devoir de coefficient ${fmt3(coefNext,2)} et une moyenne générale reconstituée de ${fmt3(school)}. C’est le seuil le plus exigeant parmi les matières suivies.`:'Il faut d’abord importer des données cohérentes avec la moyenne ÉcoleDirecte.'}</p></div>
      <div class="cv-controls"><label for="cv-coef-matieres">Coefficient du prochain devoir : ${coefControl('cv-coef-matieres')}</label><span>${ctx.rows.length} matières avec des évaluations</span></div>
      <div class="cv-subjects">${ctx.rows.map(row=>{
        const official=bullet(row.subject,state),avg=official?.studentAvg??row.mean;
        const t=requiredForSchool(ctx,row.subject,coefNext);
        const paired=row.paired.length;
        const gap=paired?row.classGap:null;
        const lowest=row.notes.length?Math.min(...row.notes.map(g=>g.grade)):null;
        const highest=row.notes.length?Math.max(...row.notes.map(g=>g.grade)):null;
        const selectedSub=selected===row.subject;
        return `<article class="cv-subject"><button class="cv-subject-toggle" type="button" data-subject="${esc3(row.subject)}" aria-expanded="${selectedSub}">
          <span class="cv-subject-title"><strong>${esc3(row.subject)}</strong><small>${row.n} devoir${row.n>1?'s':''}</small></span>
          <span class="cv-subject-stat"><strong>${fmt3(avg)}</strong><small>moyenne ${official?'ÉcoleDirecte':'calculée'}</small></span>
          <span class="cv-subject-stat"><strong>${targetLabel(t)}</strong><small>prochain devoir minimum</small></span>
          <span class="cv-chevron">${selectedSub?'−':'+'}</span></button>
        ${selectedSub?`<div class="cv-subject-detail"><p class="cv-explain">${esc3(gradeMessage(t))} Pour <strong>ne pas faire baisser ta moyenne dans cette matière</strong>, vise au moins <strong>${fmt3(row.mean)}/20</strong> au prochain devoir. Les autres matières sont supposées inchangées ; la moyenne générale est modélisée à coefficients égaux pour les matières déjà notées.</p>
          <div class="cv-infoline"><span>Devoirs : min ${fmt3(lowest)} · max ${fmt3(highest)}</span><span>Écart moyen aux devoirs de la classe : ${gap===null?'non fourni':(gap>0?'+':'')+fmt3(gap)}</span><span>${paired}/${row.n} devoir(s) avec moyenne de groupe</span></div>
          ${renderEvaluations(row.notes)}
        </div>`:''}</article>`;}).join('')||'<p class="cv-muted">Synchronise tes notes pour afficher les matières.</p>'}</div>
      <details class="cv-details"><summary>Comprendre ce calcul et ses limites</summary><p>Ce n’est pas la plus petite note « garantissant » 16 au bac. On calcule uniquement l’effet d’un prochain devoir sur une moyenne générale estimée. Le futur coefficient du devoir est inconnu : choisis la valeur qui correspond à ton contrôle. La méthode de l’établissement et l’entrée de nouvelles matières peuvent modifier la moyenne officielle.</p>
      <p>Formule matière : <code>nouvelle moyenne = (somme des notes × coefficients + note × coefficient nouveau) / (somme des coefficients + coefficient nouveau)</code>. Nous recalculons ensuite la moyenne générale sur les matières déjà notées.</p></details>`;
  }
  function renderEvaluations(rows){
    const ordered=[...rows].sort((a,b)=>b.date.localeCompare(a.date));
    return `<div class="cv-evals"><div class="cv-eval-head"><span>Devoir</span><span>Ta note</span><span>Moyenne groupe</span><span>Minimum groupe</span><span>Maximum groupe</span></div>${ordered.map(g=>`<div class="cv-eval"><span><strong>${esc3(g.title||'Évaluation')}</strong><small>${esc3(g.date)} · coef. ${fmt3(g.coefficient,2)}</small></span><span>${fmt3(g.grade)}</span><span>${fmt3(g.classAvg)}</span><span>${fmt3(g.classMin)}</span><span>${fmt3(g.classMax)}</span></div>`).join('')}</div><p class="cv-caption">Comparaison avec les élèves du groupe évalué pour ce devoir, selon les chiffres ÉcoleDirecte disponibles. Un minimum et un maximum ne suffisent pas pour déterminer ton rang.</p>`;
  }
  function bacPage3(ctx,bac){
    if(!bac)return head('Bac 2027','Objectif mention Très bien','Importe les notes officielles pour calculer ta trajectoire.');
    const exams=bac.minExams;
    const good=bac.score>=GOAL;
    return `${head('Échéance 2027','16 au bac : le calcul','Ce qui est déjà acquis, ce qu’il reste à obtenir, et les notes à viser dans chaque épreuve.')}
      <div class="cv-scoreline"><section class="cv-headmetric"><span>Projection actuelle</span><strong>${valueBadge(bac.score)}</strong><small>${good?'Objectif atteint dans ce scénario':'Objectif non atteint dans ce scénario'}</small></section>
      <section class="cv-headmetric"><span>Seuil moyen sur le reste</span><strong>${valueBadge(bac.remainingMean)}</strong><small>Sur les ${bac.remaining} coefficients non acquis, examens compris</small></section></div>
      <div class="cv-progresshead"><strong>${bac.earned} coefficients acquis</strong><span>sur ${bac.denom} au total</span></div>
      <div class="cv-progress" role="progressbar" aria-valuenow="${bac.earned}" aria-valuemin="0" aria-valuemax="${bac.denom}"><i style="width:${(bac.earned/bac.denom)*100}%"></i></div>
      <p class="cv-sectionhint">Les coefficients acquis sont réellement fixés. Toutes les autres notes sont provisoires ou hypothétiques. La mention Très bien exige une moyenne finale d'au moins 16/20.</p>
      <section class="cv-section"><h2>À chaque épreuve, quelle note minimale ?</h2>
      <p class="cv-sectionhint">Ces notes suffiraient à atteindre 16 au total <strong>uniquement si toutes les autres hypothèses du scénario se réalisent</strong>.</p>
      <div class="cv-examlist">${exams.map(x=>`<div class="cv-exam"><span><strong>${esc3(x.label)}</strong><small>Coefficient ${x.coef} · prévision actuelle ${fmt3(x.value)}</small></span><strong>${x.needed>20?'Plus de 20':x.needed<=0?'0,00':fmt3(x.rounded)} <small>/ 20</small></strong></div>`).join('')}</div></section>
      <details class="cv-details"><summary>Voir toutes les hypothèses du bac et les modifier</summary>
      <p>Le tableau ci-dessous est le simulateur original, conservé pour vérifier les coefficients et ajuster les notes de Terminale et les examens. Chaque simulation reste locale.</p>
      <div id="cv-bac-legacy"></div><div class="cv-slot">${bacLegacy()}</div></details>
      <div class="cv-footnote"><strong>À retenir :</strong> le seuil de ${fmt3(bac.remainingMean)} sur les coefficients restants est un calcul exact à partir des notes officiellement acquises dans ton dossier. Les minima par épreuve, eux, dépendent des hypothèses choisies pour tout le reste.</div>`;
  }
  function bacLegacy(){let html='';try{html=bacPage()}catch{return '<p>Simulateur indisponible.</p>'};const p=html.indexOf('<div class="layout-grid">');return p>=0?html.slice(p):html;}
  function binCounts(list){
    const bins=[{label:'Moins de 10',low:0,up:10},{label:'10 à <14',low:10,up:14},{label:'14 à <17',low:14,up:17},{label:'17 à <18',low:17,up:18},{label:'18 à <19',low:18,up:19},{label:'19 à <20',low:19,up:20},{label:'20 exactement',low:20,up:21}];
    return bins.map(b=>({...b,n:list.filter(g=>valid(g.grade)&&g.grade>=b.low&&g.grade<b.up).length}));
  }
  function deepStats(ctx){
    const notes=ctx.rows.flatMap(r=>r.notes);const comp=notes.filter(g=>valid(g.classAvg));
    const counts=binCounts(notes),max=Math.max(1,...counts.map(x=>x.n));
    const above=comp.filter(g=>g.grade>g.classAvg).length;
    const bins=counts.map(x=>`<div class="cv-binline"><span>${x.label}</span><div class="cv-bartrack"><i style="width:${(x.n/max)*100}%"></i></div><b>${x.n}</b></div>`).join('');
    const tab=ctx.period?.disciplines?.filter(x=>valid(x.studentAvg))||[];
    return `<section class="cv-section"><h2>À quoi ressemblent tes notes ?</h2><p class="cv-sectionhint">${notes.length} évaluations enregistrées. ${comp.length?`${above} notes supérieures à la moyenne du groupe sur ${comp.length} évaluations comparables.`:'Les moyennes de groupe ne sont pas disponibles.'}</p>
      <div class="cv-chart">${bins}</div></section>
      <details class="cv-details"><summary>Plus de données sur les moyennes et la classe</summary>
      <p>Les extrema ci-dessous concernent les <strong>moyennes de matière sur la période</strong>, pas les devoirs individuels.</p>
      ${tab.length?`<div class="cv-tablewrap"><table><thead><tr><th>Matière</th><th>Moi</th><th>Groupe</th><th>Min. moyenne</th><th>Max. moyenne</th><th>Effectif signalé</th><th>Rang signalé</th></tr></thead><tbody>${tab.map(x=>`<tr><td>${esc3(x.subject)}</td><td>${fmt3(x.studentAvg)}</td><td>${fmt3(x.classAvg)}</td><td>${fmt3(x.classMin)}</td><td>${fmt3(x.classMax)}</td><td>${x.effectifReported??'—'}</td><td>${x.rankReported??'—'}</td></tr>`).join('')}</tbody></table></div>`:'<p>Relevés de période non importés depuis ÉcoleDirecte.</p>'}
      <p>Un effectif ou un rang éventuellement transmis par ÉcoleDirecte n’est pas transformé en percentile, faute de définition confirmée du groupe concerné.</p></details>`;
  }
  function followPage(ctx,bac){return `${head('Les outils utiles','Suivi et réglages','Une seule page pour la connexion, tes sauvegardes et les informations complémentaires.')}
    <div class="cv-follow-links">
      <a href="#sync"><strong>ÉcoleDirecte</strong><span>Mettre à jour les notes et la moyenne officielle</span><b>→</b></a>
      <a href="#notes"><strong>Gérer les notes</strong><span>Ajouter, modifier ou exporter tes évaluations</span><b>→</b></a>
      <a href="#env"><strong>Concours vétérinaire</strong><span>Repères des admissibles et calendrier</span><b>→</b></a>
      <a href="#calendrier"><strong>Calendrier</strong><span>Préparer les démarches ENV et Parcoursup</span><b>→</b></a>
      <a href="#donnees"><strong>Données et sources</strong><span>Comprendre les projections et sauvegarder le dossier</span><b>→</b></a>
    </div>${deepStats(ctx)}
    <div class="cv-footnote">Le site n’enregistre pas les identifiants ÉcoleDirecte ; ils sont stockés comme secrets du Worker Cloudflare. La clé d’accès personnelle est demandée à chaque session sur ce navigateur. L’import des notes nécessite encore une confirmation.</div>`;}
  function render(){
    const r=(location.hash.slice(1)||'accueil').toLowerCase();
    let view=r==='stats'?'matieres':r;
    if(!['accueil','matieres','bac','suivi','sync','notes','donnees','env','calendrier'].includes(view))view='accueil';
    const nav=['sync','notes','donnees','env','calendrier'].includes(view)?'suivi':view;
    document.querySelectorAll('[data-route]').forEach(x=>x.classList.toggle('active',x.dataset.route===nav));
    const main=document.querySelector('#main');if(!main)return;
    let content='';
    if(!state&&['accueil','matieres','bac'].includes(view)){
      content=head('Bienvenue','Un cap clair','Connecte ÉcoleDirecte pour commencer, ou importe ton ancien dossier de notes.')+emptyState()+`<div class="cv-cta">${link('Connecter ÉcoleDirecte','sync')}</div>`;
    }else{
      const ctx=schoolContext(state),bac=projectedBac(state);
      if(view==='accueil')content=coreIntro(ctx,bac);
      else if(view==='matieres')content=subjectsPage(ctx)+deepStats(ctx);
      else if(view==='bac')content=bacPage3(ctx,bac);
      else if(view==='suivi')content=followPage(ctx,bac);
      else if(view==='sync')content=window.capVetoSyncPage?.()||'<p>Connexion indisponible.</p>';
      else if(view==='notes')content=notesPage();
      else if(view==='env')content=envPage();
      else if(view==='calendrier')content=calendarPage();
      else if(view==='donnees')content=dataPage();
    }
    main.innerHTML=`<div class="cv-container">${content}</div>`;
    document.title=`Cap Véto — ${({'accueil':'Aujourd’hui','matieres':'Mes matières','bac':'Objectif bac','suivi':'Suivi','sync':'ÉcoleDirecte'})[view]||view}`;
    document.querySelector('#sidebar')?.classList.remove('open');
  }
  document.addEventListener('change', e=>{
    const id=e.target?.id;
    if(['cv-coef-home','cv-coef-matieres'].includes(id)){
      const n=Number(e.target.value);if([.25,.5,1,2,3].includes(n)){coefNext=n;render();}
    }
  });
  document.addEventListener('click',e=>{
    const toggle=e.target.closest('[data-subject]');if(!toggle)return;
    const s=toggle.getAttribute('data-subject');if(!ED_SUBJECT_NAMES.includes(s))return;
    selected=selected===s?'all':s;render();
  });
  window.CapVetoV3={render,schoolContext,requiredForSchool,projectedBac,binCounts};
  render();
})();
