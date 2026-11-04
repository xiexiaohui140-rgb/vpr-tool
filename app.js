(function(){
const {RULES,evaluate,computeFO,suggestTolerance,sbar,ZONE_CN}=window.VPR;
const $=id=>document.getElementById(id);
const S={wtype:'入院体重',ne:'stable',lacTrend:'down',fbTrend:'flat',tolerance:'耐受'};
const defaults={...S};
document.querySelectorAll('.seg').forEach(g=>g.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;setSeg(g.dataset.k,b.dataset.v);}));
function setSeg(k,v){S[k]=v;if(k==='tolerance'){const r=document.getElementById('adjRow');if(r)r.style.display=v==='耐受'?'none':'flex';}document.querySelectorAll(`.seg[data-k="${k}"] button`).forEach(b=>b.classList.toggle('on',b.dataset.v===v));}
const mk=(arr,el)=>{$(el).innerHTML=arr.map(([k,t])=>`<label class="chk"><input type="checkbox" data-i="${k}">${t}</label>`).join('');};
mk(RULES.INTOL_SUSPECT,'ls');mk(RULES.INTOL_CLEAR,'lc');
document.querySelectorAll('[data-i]').forEach(c=>c.addEventListener('change',()=>{const ch={};document.querySelectorAll('[data-i]').forEach(x=>ch[x.dataset.i]=x.checked);const s=suggestTolerance(ch);$('tolSug').textContent='建议：'+s;setSeg('tolerance',s);}));
const bed=new URLSearchParams(location.search).get('bed');if(bed)$('bed').value=bed;
const num=id=>{const v=$(id).value.trim();return v===''?'':Number(v);};
function read(){return{bed:$('bed').value.trim(),weight:num('weight'),wtype:S.wtype,map:num('map'),crt:num('crt'),crtWorse:$('crtWorse').checked,ne:S.ne,lac:num('lac'),lac2h:num('lac2h'),lacTrend:S.lacTrend,fo:num('fo'),intake:num('intake'),output:num('output'),fb:num('fb'),fbTrend:S.fbTrend,ufActual:num('ufActual'),ufRx:num('ufRx'),ufAdjusted:num('ufAdjusted'),downtime:num('downtime'),tolerance:S.tolerance,nurseConcern:$('nurseConcern').checked};}
function live(){const d=read();const f=(d.intake!==''&&d.output!=='')?computeFO(d.intake,d.output,d.weight):null;$('foCalc').textContent=f!=null?`自动计算 FO = ${f}%${d.fo===''?'（将采用）':'（已直接填写，以填写值为准）'}`:'';
 $('lacCalc').textContent=(d.lac!==''&&d.lac2h>0)?`2 h 降幅 ${Math.round((d.lac2h-d.lac)/d.lac2h*1000)/10}%`:'';}
document.querySelectorAll('input').forEach(i=>i.addEventListener('input',live));
let last=null;
$('go').onclick=()=>{const d=read();
 if(!(d.weight>0)){alert('请先填写体重');return;}
 const o=evaluate(d);last={d,o};
 const z=$('zone');z.className='zone '+(o.zone||'none');
 let yelSub='灌注达标 · 液体超负荷';
 if(o.middleBand) yelSub='灌注达标 · FO 5%～<10%（REMOVE）';
 else if(o.fo!=null&&o.fo>=RULES.FO_HIGH) yelSub='灌注达标 · FO≥10%（REMOVE-H）';
 else if(o.fbPosRising) yelSub='灌注达标 · 24h正平衡上升（REMOVE）';
 const sub={red:'灌注不达标',yellow:yelSub,green:'灌注达标 · 容量稳定'};
 $('zt').textContent=o.zone?ZONE_CN[o.zone]+(o.krp?' · '+o.krp:'')+(o.ufOverride?' · PROTECT 覆盖':''):'无法分区';$('zs').textContent=o.zone?sub[o.zone]:'请填写 FO% 或累计入出量';
 if(o.zone==='red'){$('ufbig').textContent='净超滤 0 mL/h';$('ufsub').textContent='先暂停脱水；保留置换液、透析液处方';}
 else if(o.ufOverride){$('ufbig').textContent='立即下调或暂停净超滤';$('ufsub').innerHTML=`<b>PROTECT 覆盖本区方案</b><br>${o.uf.detail}；复评灌注后报告医生`;}
 else if(o.zone==='yellow'){$('ufbig').innerHTML=`起步 ${o.uf.kg} mL/kg/h<br>≈ ${o.uf.mlh} mL/h`;$('ufsub').innerHTML=`护士上限 ${o.uf.capKg} mL/kg/h ≈ ${o.uf.capMlh} mL/h（${d.weight} kg，${d.wtype}）<br>每次上调 ${RULES.UF_STEP}，目标 24 h 负平衡；超上限须医生评估`;}
 else if(o.zone==='green'){$('ufbig').textContent='净超滤维持不变';$('ufsub').textContent='不加不减；病情变化时重新分区';}
 else{$('ufbig').textContent='';$('ufsub').textContent='';}
 $('krp').textContent=o.krp||'—';
 $('krpd').textContent={KEEP:'低容量负荷：维持/观察',REMOVE:'中度容量负荷：主动去负荷','REMOVE-H':'高容量负荷：强化评估与协作，≠强制高速 UF'}[o.krp]||'';
 $('protect').style.display=o.protect?'block':'none';
 $('reps').innerHTML=(o.reports.map(r=>`<div class="rep">立即报告：${r}</div>`).join('')+o.warnings.map(r=>`<div class="warn">${r}</div>`).join(''))||'<div class="hint">暂无立即报告情形</div>';
 const a=[];
 if(o.redReasons.length)a.push('红区依据：'+o.redReasons.join('、'));
 if(o.recheck)a.push('复评：'+o.recheck);
 if(o.zone==='red'){a.push('排查可逆因素：管路受压/打折、滤器凝血报警、输液及血管活性药物通路、镇静镇痛');a.push('恢复条件：MAP ≥65 并稳定、CRT ≤3 s、乳酸呈下降趋势后，由医生评估是否低速恢复净超滤');}
 if(o.intolAction)a.push(`<b>${o.tolerance}：</b>${o.intolAction}`);
 if(o.fulfil!=null)a.push(`处方落实率 ${o.fulfil}%：${o.fulfilMsg}`);
 if(o.zone==='yellow'&&!o.ufOverride)a.push('先核查处方执行（实际/处方净超滤、停机时长、滤器寿命），落实达标仍超负荷再上调');
 $('acts').innerHTML=a.map(x=>`<li>${x}</li>`).join('');
 $('sbar').style.display='none';$('cp').style.display='none';
 $('result').style.display='block';$('result').scrollIntoView({behavior:'smooth'});};
$('sb').onclick=()=>{if(!last)return;$('sbar').value=sbar(last.d,last.o);$('sbar').style.display='block';$('cp').style.display='block';};
$('cp').onclick=async()=>{const t=$('sbar');try{await navigator.clipboard.writeText(t.value);}catch(e){t.select();document.execCommand('copy');}$('cp').textContent='已复制';setTimeout(()=>$('cp').textContent='复制',1500);};
$('rs').onclick=()=>{const b=$('bed').value;document.querySelectorAll('input').forEach(i=>i.type==='checkbox'?i.checked=false:i.value='');$('bed').value=bed||'';Object.entries(defaults).forEach(([k,v])=>setSeg(k,v));$('result').style.display='none';$('tolSug').textContent='';live();window.scrollTo(0,0);};
$('ver').textContent=`版本 ${RULES.version} · ${RULES.date}`;
if('serviceWorker' in navigator && location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js');
})();
