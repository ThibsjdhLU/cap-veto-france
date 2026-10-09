/* Cap Véto — Laboratoire statistique v2.0. Données personnelles : traitement exclusivement local. */
'use strict';
(() => {
  const SUBJECT_LIST=['Physique-chimie','SVT','Maths complémentaires','Anglais','Espagnol','Histoire-géographie','Enseignement scientifique','Philosophie','EPS','EMC'];
  const isNum = n => typeof n==='number' && Number.isFinite(n);
  const n20 = n => isNum(n) && n>=0 && n<=20;
  const round = n => isNum(n) ? Math.round(n*10000)/10000 : null;
  const clamp=(n,lo,hi)=>Math.min(hi,Math.max(lo,n));
  const fmt=(n,d=2)=>isNum(n)?n.toLocaleString('fr-FR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
  const esc = s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const valid = g => g && SUBJECT_LIST.includes(g.subject) && n20(g.grade) && isNum(g.coefficient) && g.coefficient>0 && g.coefficient<=100 && typeof g.date==='string' && /^\d{4}-\d{2}-\d{2}$/.test(g.date);
  function quantile(values,p){
    if(!values.length)return null;
    const sorted=[...values].sort((a,b)=>a-b),h=(sorted.length-1)*p,i=Math.floor(h);
    return sorted[i] + ((sorted[i+1]??sorted[i])-sorted[i])*(h-i);
  }
  function summary(input){
    const notes=input.filter(valid).map(g=>({...g})).sort((a,b)=>a.date.localeCompare(b.date)||String(a.id).localeCompare(String(b.id)));
    const n=notes.length;
    if(!n)return {n:0,notes:[],mean:null,classN:0,comparable:[]};
    const x=notes.map(g=>g.grade), w=notes.map(g=>g.coefficient),sumW=w.reduce((a,b)=>a+b,0);
    const sumWX=notes.reduce((a,g)=>a+g.grade*g.coefficient,0);
    const mean=sumWX/sumW;
    const varPop=notes.reduce((a,g)=>a+g.coefficient*(g.grade-mean)**2,0)/sumW;
    const med=quantile(x,0.5),q1=quantile(x,.25),q3=quantile(x,.75);
    const comparable=notes.filter(g=>n20(g.classAvg));
    const wc=comparable.reduce((a,g)=>a+g.coefficient,0);
    const classMean=wc?comparable.reduce((a,g)=>a+g.coefficient*g.classAvg,0)/wc:null;
    const studentComparable=wc?comparable.reduce((a,g)=>a+g.coefficient*g.grade,0)/wc:null;
    const gaps=comparable.map(g=>g.grade-g.classAvg);
    const withExtrema=notes.filter(g=>n20(g.classMin)&&n20(g.classMax)&&g.classMax>g.classMin&&g.classMin<=g.grade&&g.grade<=g.classMax);
    const normalPositions=withExtrema.map(g=>(g.grade-g.classMin)/(g.classMax-g.classMin));
    const distinctDates=new Set(notes.map(g=>g.date)).size;
    let trend=null;
    if(n>=5&&distinctDates>=5&&(Date.parse(notes.at(-1).date+'T12:00:00Z')-Date.parse(notes[0].date+'T12:00:00Z'))>=28*86400000){
      const start=Date.parse(notes[0].date+'T12:00:00Z');
      const times=notes.map(g=>(Date.parse(g.date+'T12:00:00Z')-start)/86400000);
      const tAvg=times.reduce((a,t,i)=>a+t*w[i],0)/sumW;
      const cov=times.reduce((a,t,i)=>a+w[i]*(t-tAvg)*(x[i]-mean),0)/sumW;
      const vTime=times.reduce((a,t,i)=>a+w[i]*(t-tAvg)**2,0)/sumW;
      if(vTime>0){
        const slope=cov/vTime;
        const r2=varPop>0?clamp((cov*cov)/(vTime*varPop),0,1):null;
        trend={pointsPerMonth:slope*30.4375,r2,days:times.at(-1)};
      }
    }
    const cumulative=[];let weight=0,total=0;
    for(const g of notes){weight+=g.coefficient;total+=g.grade*g.coefficient;cumulative.push({date:g.date,average:total/weight,grade:g.grade});}
    const hist=Array.from({length:10},(_,i)=>({from:i*2,to:(i+1)*2,count:x.filter(v=>v>=i*2&&(v<(i+1)*2||i===9&&v<=20)).length}));
    return {n,notes,weightedSum:sumWX,sumCoef:sumW,mean,arithmeticMean:x.reduce((a,b)=>a+b,0)/n,
      min:Math.min(...x),max:Math.max(...x),range:Math.max(...x)-Math.min(...x),median:med,q1,q3,iqr:q3-q1,
      medianAbsDeviation:quantile(x.map(t=>Math.abs(t-med)),.5),variance:varPop,sd:Math.sqrt(varPop),
      effectiveN:sumW*sumW/w.reduce((a,b)=>a+b*b,0),
      above16:x.filter(v=>v>=16).length,above18:x.filter(v=>v>=18).length,
      classN:comparable.length,comparable,classMean,studentComparable,
      gap:classMean===null?null:studentComparable-classMean,
      aboveClass:comparable.filter(g=>g.grade>g.classAvg).length,
      equalClass:comparable.filter(g=>g.grade===g.classAvg).length,
      gaps,
      boundsN:withExtrema.length,withinRange:withExtrema.length,
      normalizedPositions:normalPositions,
      trend,cumulative,hist};
  }
  function targetGrade(s,target,coefficient){
    if(!s.n || !isNum(target)||target<0||target>20||!isNum(coefficient)||coefficient<=0)return null;
    const needed=(target*(s.sumCoef+coefficient)-s.weightedSum)/coefficient;
    return {needed,feasible:needed<=20 && needed>=0, alreadySecured:needed<=0,
      minPossible:s.weightedSum/(s.sumCoef+coefficient),maxPossible:(s.weightedSum+20*coefficient)/(s.sumCoef+coefficient),
      nextAverageAt16:(s.weightedSum+16*coefficient)/(s.sumCoef+coefficient)};
  }
  const math={summary,quantile,targetGrade};
  // Pure functions for automated testing, not the school data.
  window.CapVetoMath=math;
  let filter='Toutes',target=17,nextCoef=1;
  const small=(label,value,hint='')=>`<div class="stat-metric"><div class="stat-label">${esc(label)}</div><div class="stat-val">${esc(value)}</div>${hint?`<div class="stat-hint">${esc(hint)}</div>`:''}</div>`;
  function trendPlot(s){
    if(!s.n)return '<div class="stat-muted">Aucune évaluation.</div>';
    const w=780,h=200,pad=28, minY=0,maxY=20;
    const d=s.cumulative.map((p,i)=>{const xx=pad+(w-2*pad)*(s.n===1?.5:i/(s.n-1));const yy=h-pad-(h-2*pad)*(p.average-minY)/(maxY-minY);return [xx,yy]});
    const pts=d.map(t=>t.join(',')).join(' ');
    const circles=d.map((t,i)=>`<circle cx="${t[0]}" cy="${t[1]}" r="4" fill="#5177e3"><title>${esc(s.cumulative[i].date)} : ${fmt(s.cumulative[i].average)}</title></circle>`).join('');
    const lines=[5,10,15,20].map(v=>{const y=h-pad-(h-2*pad)*v/20;return `<line x1="${pad}" x2="${w-pad}" y1="${y}" y2="${y}" stroke="#e1e7f1"/><text x="2" y="${y+4}" font-size="12" fill="#8795a9">${v}</text>`}).join('');
    return `<svg role="img" aria-label="Évolution de la moyenne pondérée cumulative, sur vingt" viewBox="0 0 ${w} ${h}" class="stat-svg">${lines}<polyline points="${pts}" fill="none" stroke="#5177e3" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>${circles}</svg>`;
  }
  function histogram(s){
    const max=Math.max(1,...s.hist.map(x=>x.count));
    return `<div class="stat-histogram">${s.hist.map(b=>`<div class="stat-bin" title="[${b.from};${b.to}${b.to===20?']':'['} : ${b.count} note(s)"><span>${b.count||''}</span><div class="stat-bin-bar" style="height:${100*b.count/max}%"></div><small>${b.from}</small></div>`).join('')}</div><div class="stat-hint">Notes individuelles (non pondérées) · intervalles de 2 points · 20 inclus dans la dernière barre</div>`;
  }
  function subjectTable(all){
    const subjects=[...new Set(all.map(g=>g.subject))].sort((a,b)=>SUBJECT_LIST.indexOf(a)-SUBJECT_LIST.indexOf(b));
    return `<div class="table-scroll"><table class="data-table"><thead><tr><th>Matière</th><th>Notes</th><th>Moy. pondérée</th><th>Min–max</th><th>Écart-type</th><th>Écart classe*</th><th>Nb comparables</th></tr></thead><tbody>${subjects.map(subject=>{const s=summary(all.filter(g=>g.subject===subject));return `<tr><td>${esc(subject)}</td><td>${s.n}</td><td><strong>${fmt(s.mean)}</strong></td><td>${fmt(s.min,1)} – ${fmt(s.max,1)}</td><td>${s.n>=2?fmt(s.sd):'—'}</td><td class="${s.gap===null?'':s.gap>=0?'stat-positive':'stat-negative'}">${s.gap===null?'—':`${s.gap>=0?'+':''}${fmt(s.gap)}`}</td><td>${s.classN}/${s.n}</td></tr>`}).join('')}</tbody></table></div><p class="stat-hint">* Écart sur les mêmes évaluations, avec les mêmes coefficients. Ce n'est pas la différence entre deux moyennes trimestrielles officielles.</p>`;
  }
  function classTable(s){
    if(!s.comparable.length)return `<p class="stat-muted">Aucune moyenne de classe disponible pour cette sélection. Réimporte les notes depuis ÉcoleDirecte pour enrichir les données.</p>`;
    return `<div class="table-scroll"><table class="data-table"><thead><tr><th>Date</th><th>Matière</th><th>Ta note</th><th>Moy. classe</th><th>Min classe</th><th>Max classe</th><th>Écart</th><th>Position dans l'étendue*</th></tr></thead><tbody>${s.comparable.slice().reverse().map(g=>{const has=n20(g.classMin)&&n20(g.classMax)&&g.classMax>g.classMin;const inRange=has&&g.grade>=g.classMin&&g.grade<=g.classMax;const position=inRange?(g.grade-g.classMin)/(g.classMax-g.classMin):null;return `<tr><td>${esc(g.date)}</td><td>${esc(g.subject)}</td><td>${fmt(g.grade,1)}</td><td>${fmt(g.classAvg,1)}</td><td>${fmt(g.classMin,1)}</td><td>${fmt(g.classMax,1)}</td><td class="${g.grade>=g.classAvg?'stat-positive':'stat-negative'}">${g.grade-g.classAvg>=0?'+':''}${fmt(g.grade-g.classAvg,1)}</td><td>${position===null?'—':`${fmt(position*100,0)} %`}</td></tr>`}).join('')}</tbody></table></div><p class="stat-hint">* (Ta note − minimum) / (maximum − minimum). <strong>Ce pourcentage n’est pas un percentile, ni un rang, ni un classement</strong>. Les extrema peuvent concerner un groupe et non toute la classe.</p>`;
  }
  function historyTable(history){
    const rows=Array.isArray(history)?history.filter(x=>x&&['Troisième','Seconde','Première','Terminale'].includes(x.year)&&n20(x.grade)):[];
    if(!rows.length)return `<p class="stat-muted">Aucune moyenne historique importée. Les bulletins de Seconde et Première permettent d'étendre la comparaison sur plusieurs années.</p>`;
    const years=['Troisième','Seconde','Première','Terminale'];
    const grouped=years.map(year=>{
      const group=rows.filter(g=>g.year===year);
      if(!group.length)return null;
      const vals=group.map(g=>g.grade),paired=group.filter(g=>n20(g.classAvg));
      const mean=vals.reduce((a,b)=>a+b,0)/group.length;
      const gap=paired.length?paired.reduce((a,g)=>a+g.grade-g.classAvg,0)/paired.length:null;
      return `<tr><td>${esc(year)}</td><td>${group.length}</td><td>${fmt(mean)}</td><td>${fmt(Math.min(...vals),1)}</td><td>${fmt(Math.max(...vals),1)}</td><td>${gap===null?'—':(gap>=0?'+':'')+fmt(gap)}</td><td>${paired.length}/${group.length}</td></tr>`;
    }).filter(Boolean);
    return `<div class="table-scroll"><table class="data-table"><thead><tr><th>Année</th><th>Moyennes connues</th><th>Moyenne simple*</th><th>Min.</th><th>Max.</th><th>Écart moyen à la classe*</th><th>Comparables</th></tr></thead><tbody>${grouped.join('')}</tbody></table></div><p class="stat-hint">* Moyenne arithmétique des moyennes de matières/périodes enregistrées. Ne constitue pas la moyenne générale officielle : les coefficients et éventuels doublons de périodes peuvent varier.</p>`;
  }
  function periodTable(periods){
    if(!Array.isArray(periods)||!periods.length)return `<p class="stat-muted">Les relevés de périodes ne sont pas encore disponibles dans ta sauvegarde. Ils apparaîtront lors d'une synchronisation avec le backend v2 si ÉcoleDirecte les fournit.</p>`;
    let rows=[];
    for(const p of periods){
      if(!p||!Array.isArray(p.disciplines))continue;
      for(const d of p.disciplines){
        if(!d||!SUBJECT_LIST.includes(d.subject))continue;
        rows.push(`<tr><td>${esc(p.label||p.code||'')}</td><td>${esc(d.subject)}</td><td>${fmt(d.studentAvg)}</td><td>${fmt(d.classAvg)}</td><td>${fmt(d.classMin)}</td><td>${fmt(d.classMax)}</td><td>${isNum(d.effectifReported)?d.effectifReported:'—'}</td><td>${isNum(d.rankReported)?d.rankReported:'—'}</td></tr>`);
      }
    }
    if(!rows.length)return `<p class="stat-muted">Pas de moyenne de matière compatible disponible dans les périodes ÉcoleDirecte.</p>`;
    return `<div class="table-scroll"><table class="data-table"><thead><tr><th>Période</th><th>Matière</th><th>Ta moyenne</th><th>Moy. classe</th><th>Min</th><th>Max</th><th>Effectif ED*</th><th>Rang ED*</th></tr></thead><tbody>${rows.join('')}</tbody></table></div><p class="stat-hint">* Valeurs communiquées par ÉcoleDirecte. Le sens de « effectif » et la portée du rang ne sont pas confirmés : ils ne sont pas utilisés pour inventer un percentile ou une probabilité d'admission.</p>`;
  }
  function renderStats(state){
    const list=Array.isArray(state?.grades)?state.grades.filter(valid):[];
    const all=summary(list);
    const selected=filter==='Toutes'?list:list.filter(g=>g.subject===filter);
    const s=summary(selected);
    const filteredOptions=['Toutes',...SUBJECT_LIST.filter(x=>list.some(g=>g.subject===x))];
    const t=filter!=='Toutes'?targetGrade(s,target,nextCoef):null;
    const statCards=s.n?[small('Moyenne pondérée',`${fmt(s.mean)}/20`,`${s.n} devoir(s) · Σ coefficients ${fmt(s.sumCoef,1)}`),small('Médiane (non pondérée)',fmt(s.median),`Q1 ${fmt(s.q1)} · Q3 ${fmt(s.q3)}`),small('Min. / max.',`${fmt(s.min,1)} / ${fmt(s.max,1)}`,`Étendue ${fmt(s.range,1)}`),small('Écart-type pondéré',s.n>=2?fmt(s.sd):'—',s.n>=2?`Variance ${fmt(s.variance)} · descriptif`:'Au moins deux notes requises'),small('Écart à la classe',s.gap===null?'—':`${s.gap>=0?'+':''}${fmt(s.gap)}`,`${s.classN}/${s.n} devoir(s) comparables`),small('Au-dessus de la classe',s.classN?`${s.aboveClass}/${s.classN}`:'—',s.classN?`${fmt(s.aboveClass/s.classN*100,0)} % des devoirs comparables`:'Information indisponible'),small('Notes ≥ 16/20',`${s.above16}/${s.n}`,`${fmt(s.above16/s.n*100,0)} % des devoirs`),small('Notes ≥ 18/20',`${s.above18}/${s.n}`,`${fmt(s.above18/s.n*100,0)} % des devoirs`)]:[small('Aucune note','—','Importe un dossier ou synchronise ÉcoleDirecte')];
    return `<div class="page-header"><div><div class="eyebrow">LABORATOIRE QUANTITATIF · V2.0</div><h1 class="page-title">Mathématiques & statistiques</h1><p class="page-desc">Mesurer la progression, la dispersion et les écarts à la classe — sans classement ni prévision inventés.</p></div></div>
    <div class="stat-filters"><label for="stat-subject">Matière</label><select id="stat-subject">${filteredOptions.map(item=>`<option value="${esc(item)}" ${item===filter?'selected':''}>${esc(item)}</option>`).join('')}</select><span class="stat-hint">${all.n} évaluation(s) au total, ${all.classN} avec moyenne de classe, ${all.notes.filter(x=>n20(x.classMin)&&n20(x.classMax)).length} avec min/max.</span></div>
    <div class="stat-metrics">${statCards.join('')}</div>
    <div class="layout-grid">
      <section class="card span-7"><h3 class="card-title">Moyenne cumulée, au fil des devoirs</h3><p class="card-sub">Après chaque nouveau devoir, sa note est pondérée par son coefficient.</p>${trendPlot(s)}<p class="stat-hint">${s.trend?`Tendance descriptive linéaire : ${s.trend.pointsPerMonth>=0?'+':''}${fmt(s.trend.pointsPerMonth)} point(s) / 30,4 jours · R² ${fmt(s.trend.r2)}. Ce n'est PAS une prévision.`:'Tendance non affichée : il faut 5 devoirs à des dates distinctes, étalés sur au moins 28 jours.'}</p></section>
      <section class="card span-5"><h3 class="card-title">Distribution de tes notes</h3>${s.n?histogram(s):'<p class="stat-muted">Aucune note</p>'}<p class="stat-hint">Quartiles interpolés (type 7) · Moyenne arithmétique : ${fmt(s.arithmeticMean)} ; IQR : ${fmt(s.iqr)} ; écart absolu médian : ${fmt(s.medianAbsDeviation)}.</p></section>
      <section class="card"><h3 class="card-title">Tableau de bord par matière</h3>${list.length?subjectTable(list):'<p class="stat-muted">Pas encore de notes.</p>'}</section>
      <section class="card"><h3 class="card-title">Trajectoire pluriannuelle · données de tes bulletins</h3>${historyTable(state?.history)}</section>
      <section class="card"><h3 class="card-title">Comparaison détaillée avec la classe — devoir par devoir</h3>${classTable(s)}</section>
      <section class="card span-6"><h3 class="card-title">Simulateur : la prochaine note nécessaire</h3><p class="card-sub">Calcul algébrique exact avec la moyenne pondérée actuelle. Le résultat suppose qu'aucune autre note n'est ajoutée entre-temps.</p>
        <div class="stat-form"><label>Objectif de moyenne (/20)<input id="stat-target" type="number" min="0" max="20" step="0.1" value="${target}"></label><label>Coefficient du prochain devoir<input id="stat-coef" type="number" min="0.01" max="100" step="0.25" value="${nextCoef}"></label></div>
        ${filter==='Toutes'?'<div class="info-strip blue">Choisis une matière pour calculer une moyenne cible cohérente.</div>':!t?'<div class="info-strip">Aucune note pour cette matière.</div>':`<div class="stat-target"><strong>${t.alreadySecured?'Objectif déjà garanti':t.needed>20?'Objectif inaccessible en un devoir':fmt(t.needed,2)+'/20'}</strong><span>${t.alreadySecured?`Même 0/20 donnerait ${fmt(t.minPossible)} de moyenne.`:t.needed>20?`Avec 20/20, la moyenne atteindrait ${fmt(t.maxPossible)}.`:`Note nécessaire pour atteindre ${fmt(target,1)}/20 au prochain devoir (coef. ${fmt(nextCoef,2)}).`}</span></div><p class="stat-hint">Si tu obtiens 16/20, nouvelle moyenne : ${fmt(t.nextAverageAt16)} / 20.</p>`}
      </section>
      <section class="card span-6"><h3 class="card-title">Précision et limites</h3><p class="method"><strong>Variance pondérée descriptive :</strong> Σ cᵢ(xᵢ−μ)² / Σ cᵢ. Ce n'est pas un estimateur d'une population externe.</p><p class="method"><strong>Taille effective des coefficients :</strong> ${s.n?fmt(s.effectiveN,2):'—'} ; indicateur mathématique de concentration des poids, <strong>pas</strong> un effectif d'élèves.</p><p class="method"><strong>Moyenne officielle ÉcoleDirecte :</strong> peut différer de notre moyenne si le logiciel applique des sous-matières, exclusions ou arrondis particuliers.</p><p class="method"><strong>Classement / percentile / loi normale :</strong> indisponibles sans distribution individuelle vérifiée ou rang officiel interprétable.</p></section>
      <section class="card"><h3 class="card-title">Moyennes et bornes officielles par période</h3>${periodTable(state?.edPeriods)}</section>
    </div>`;
  }
  window.capVetoStatsPage=renderStats;
  document.querySelector('#main')?.addEventListener('change',e=>{
    if(e.target.id==='stat-subject'){
      const v=e.target.value;if(v==='Toutes'||SUBJECT_LIST.includes(v))filter=v;
      location.hash='stats';if(typeof window.capVetoStatsRefresh==='function')window.capVetoStatsRefresh();
    }
    if(e.target.id==='stat-target'||e.target.id==='stat-coef'){
      if(e.target.id==='stat-target'){const v=Number(e.target.value);if(isNum(v)&&v>=0&&v<=20)target=v;}
      if(e.target.id==='stat-coef'){const v=Number(e.target.value);if(isNum(v)&&v>0&&v<=100)nextCoef=v;}
      if(typeof window.capVetoStatsRefresh==='function')window.capVetoStatsRefresh();
    }
  });
})();
