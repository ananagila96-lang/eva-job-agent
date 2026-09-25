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
  const setter=Object.getOwnPropertyDescriptor(el.__proto__,'value')?.set;
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
