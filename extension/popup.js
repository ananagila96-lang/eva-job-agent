const statusEl=document.getElementById('status');
const emailEl=document.getElementById('email');
const phoneEl=document.getElementById('phone');

function status(text){statusEl.textContent=text}

chrome.storage.local.get(['email','phone'],data=>{
  emailEl.value=data.email||'';
  phoneEl.value=data.phone||'';
});

document.getElementById('save').onclick=()=>{
  chrome.storage.local.set({email:emailEl.value.trim(),phone:phoneEl.value.trim()},()=>status('Dados salvos somente neste navegador.'));
};

async function activeTab(){
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  return tab;
}

async function runFunction(func,args=[]){
  const tab=await activeTab();
  const [{result}]=await chrome.scripting.executeScript({target:{tabId:tab.id},func,args});
  return result;
}

document.getElementById('scan').onclick=async()=>{
  status('Lendo vagas visiveis...');
  try{
    const tab=await activeTab();
    await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});
    const [{result:jobs}]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>evaScanJobs()});
    const res=await fetch('http://localhost:3000/api/jobs/import',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(jobs)});
    const data=await res.json();
    status(`${jobs.length} visiveis; ${data.imported} novas importadas.`);
  }catch(err){status('Falha: abra o EVA-01 local e uma pagina de vagas do LinkedIn.')}
};

document.getElementById('fill').onclick=async()=>{
  status('Preenchendo campos basicos...');
  try{
    const tab=await activeTab();
    await chrome.scripting.executeScript({target:{tabId:tab.id},files:['content.js']});
    const profile=await fetch('http://localhost:3000/api/profile').then(r=>r.json());
    const stored=await chrome.storage.local.get(['email','phone']);
    const data={name:profile.name||'',location:profile.location||'',email:stored.email||'',phone:stored.phone||''};
    const [{result:filled}]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:data=>evaFillBasics(data),args:[data]});
    status(`${filled} campo(s) preenchido(s). Revise antes de enviar.`);
  }catch(err){status('Nao foi possivel preencher esta tela.')}
};

document.getElementById('dashboard').onclick=()=>chrome.tabs.create({url:'http://localhost:3000'});
