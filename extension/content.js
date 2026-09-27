function evaScanJobs(){
  const cards=[...document.querySelectorAll('li.jobs-search-results__list-item,.job-card-container,[data-job-id]')];
  const seen=new Set();
  const jobs=[];
  for(const card of cards){
    const link=card.querySelector('a[href*="/jobs/view/"]');
    const title=(card.querySelector('.job-card-list__title,.job-card-container__link,strong')?.textContent||link?.textContent||'').trim();
    const company=(card.querySelector('.job-card-container__primary-description,.artdeco-entity-lockup__subtitle,.job-card-container__company-name')?.textContent||'').trim();
    const location=(card.querySelector('.job-card-container__metadata-item,.artdeco-entity-lockup__caption')?.textContent||'').trim();
    const url=link?.href?link.href.split('?')[0]:'';
    const key=url||`${company}|${title}`;
    if(!title||seen.has(key))continue;
    seen.add(key);
    jobs.push({title,company,location,url,description:`${title} ${company} ${location}`,source:'linkedin-extension'});
  }
  return jobs;
}

function evaSetValue(el,value){
  if(!el||!value)return false;
  const proto=Object.getPrototypeOf(el);
  const setter=proto&&Object.getOwnPropertyDescriptor(proto,'value')?.set;
  if(setter)setter.call(el,value);else el.value=value;
  el.dispatchEvent(new Event('input',{bubbles:true}));
  el.dispatchEvent(new Event('change',{bubbles:true}));
  return true;
}

function evaFillBasics(data){
  const inputs=[...document.querySelectorAll('input,textarea')];
  let filled=0;
  for(const el of inputs){
    const key=`${el.name||''} ${el.id||''} ${el.getAttribute('aria-label')||''} ${el.placeholder||''}`.toLowerCase();
    let value='';
    if(/e-?mail/.test(key))value=data.email||'';
    else if(/phone|telefone|mobile|celular/.test(key))value=data.phone||'';
    else if(/first.?name|nome/.test(key)&&!/company|empresa/.test(key))value=data.name||'';
    else if(/city|cidade|location|localiza/.test(key))value=data.location||'';
    if(value&&evaSetValue(el,value))filled++;
  }
  return filled;
}

function evaTargetMatches(task){
  if(task.type==='scan_jobs') return location.hostname.includes('linkedin.com') && location.pathname.startsWith('/jobs');
  if(!task.targetUrl) return true;
  try{
    const target=new URL(task.targetUrl);
    const current=new URL(location.href);
    const targetId=(target.pathname.match(/\/jobs\/view\/(\d+)/)||[])[1];
    const currentId=(current.pathname.match(/\/jobs\/view\/(\d+)/)||[])[1];
    return targetId ? targetId===currentId : current.pathname===target.pathname;
  }catch{return false;}
}

async function evaPatchTask(taskId,body){
  return fetch(`http://localhost:3000/api/agent/tasks/${taskId}`,{
    method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
  });
}

async function evaRunTask(task){
  if(!evaTargetMatches(task))return false;
  await evaPatchTask(task.id,{status:'running'});
  try{
    if(task.type==='scan_jobs'){
      const found=evaScanJobs();
      const imported=await fetch('http://localhost:3000/api/jobs/import',{
        method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(found)
      }).then(r=>r.json());
      await evaPatchTask(task.id,{status:'completed',result:{visible:found.length,imported:imported.imported||0}});
      return true;
    }

    if(task.type==='prepare_application'){
      const easyApply=[...document.querySelectorAll('button')].find(b=>/easy apply|candidatura simplificada/i.test((b.innerText||'').trim()));
      if(easyApply){easyApply.click();await new Promise(r=>setTimeout(r,1200));}
      const profile=await fetch('http://localhost:3000/api/profile').then(r=>r.json());
      const stored=await chrome.storage.local.get(['email','phone']);
      const data={name:profile.name||'',location:profile.location||'',email:stored.email||'',phone:stored.phone||''};
      const filled=evaFillBasics(data);
      await evaPatchTask(task.id,{status:'completed',result:{easyApplyClicked:!!easyApply,filled,stoppedBeforeSubmit:true}});
      return true;
    }
  }catch(err){
    await evaPatchTask(task.id,{status:'failed',result:{error:String(err?.message||err)}});
    return true;
  }
  return false;
}

async function evaPollAgent(){
  try{
    const tasks=await fetch('http://localhost:3000/api/agent/tasks').then(r=>r.json());
    for(const task of tasks){
      const handled=await evaRunTask(task);
      if(handled)break;
    }
  }catch{}
}

if(!globalThis.__evaAgentPolling){
  globalThis.__evaAgentPolling=true;
  setTimeout(evaPollAgent,800);
  setInterval(evaPollAgent,3000);
}
