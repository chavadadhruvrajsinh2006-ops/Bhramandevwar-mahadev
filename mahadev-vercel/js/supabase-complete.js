/* Complete Supabase bridge for the original Brahmandeshwar SPA. */
(function(){
  const client = () => window.supabaseClient;
  const safe = (fn) => { try { return fn(); } catch(e) { console.warn(e); } };
  const guDate = (d) => { try { return new Date(d+'T00:00:00').toLocaleDateString('gu-IN',{day:'numeric',month:'long',year:'numeric'}); } catch(e){ return d; } };
  const normalizeCategory = c => ({'સ્થાપત્ય':'sthapatya','ગર્ભગૃહ':'garbhagruh','આજના દર્શન':'darshan'}[c] || c || 'sthapatya');
  const categoryLabel = c => ({sthapatya:'સ્થાપત્ય',garbhagruh:'ગર્ભગૃહ',darshan:'આજના દર્શન'}[c] || c || 'સ્થાપત્ય');

  async function isAdmin(){
    const c=client(); if(!c) return false;
    const {data:{user}}=await c.auth.getUser(); if(!user) return false;
    const {data:p}=await c.from('profiles').select('role').eq('id',user.id).maybeSingle();
    return p?.role==='admin';
  }
  async function adminGuard(){ if(!(await isAdmin())) throw new Error('ADMIN_REQUIRED'); }
  async function upload(file,folder){
    if(!file) return null;
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
    const path=`${folder}/${crypto.randomUUID()}.${ext}`;
    const {error}=await client().storage.from('temple-images').upload(path,file,{upsert:false,contentType:file.type||'image/jpeg'});
    if(error) throw error;
    const {data}=client().storage.from('temple-images').getPublicUrl(path);
    return {path,url:data.publicUrl};
  }
  function setInput(id,v){const e=document.getElementById(id); if(e && v!=null)e.value=v;}
  function setText(el,v){if(el)el.textContent=v||'';}

  async function loadTemple(){
    const {data}=await client().from('temple_info').select('*').eq('id',1).maybeSingle();
    if(!data) return;
    // Admin fields
    setInput('templeIntro',data.description||''); setInput('templeHistory',data.history||''); setInput('templeSignificance',data.significance||'');
    setInput('templeTimings',data.timings||''); setInput('templeAddress',data.address||''); setInput('templePhone',data.phone||''); setInput('templeEmail',data.email||''); setInput('templeMapUrl',data.map_url||'');
    const page=document.getElementById('page-contact');
    if(page){
      const vals=page.querySelectorAll('.contact-info .item .value');
      if(vals[0]) setText(vals[0],data.address); if(vals[1]) setText(vals[1],data.phone); if(vals[2]) setText(vals[2],data.timings); if(vals[3]) setText(vals[3],data.email);
      const links=page.querySelectorAll('a.btn-primary'); links.forEach(a=>{ if((a.textContent||'').includes('માર્ગદર્શન')) {a.href=data.map_url||'https://maps.app.goo.gl/m5frtUYgsR8UAwLA6'; a.target='_blank'; a.rel='noopener'; a.onclick=null;} });
    }
    // Home contact strip(s), if present.
    document.querySelectorAll('.contact-info .item .value').forEach((e,i)=>{ if(i%4===0&&data.address)setText(e,data.address); else if(i%4===1&&data.phone)setText(e,data.phone); else if(i%4===2&&data.timings)setText(e,data.timings); else if(i%4===3&&data.email)setText(e,data.email); });
    // Temple page: update content blocks by their heading text without disturbing images/layout.
    const tp=document.getElementById('page-temple');
    if(tp){
      const blocks=tp.querySelectorAll('.split-text p, .reveal p');
      const history=[...tp.querySelectorAll('h3')].find(h=>(h.textContent||'').includes('મંદિરનો ઇતિહાસ'))?.parentElement?.querySelector('p');
      const significance=[...tp.querySelectorAll('h3')].find(h=>(h.textContent||'').includes('ધાર્મિક મહત્વ'))?.parentElement?.querySelector('p');
      const timing=[...tp.querySelectorAll('h3')].find(h=>(h.textContent||'').includes('દર્શનનો સમય'))?.parentElement?.querySelector('ul');
      if(history && data.history) setText(history,data.history);
      if(significance && data.significance) setText(significance,data.significance);
      if(timing && data.timings) setText(timing,data.timings);
      const intro=[...tp.querySelectorAll('h3')].find(h=>(h.textContent||'').includes('મંદિર પરિચય'))?.parentElement?.querySelector('p');
      if(intro && data.description) setText(intro,data.description);
    }
  }

  async function loadPublic(){
    if(!client() || typeof DATA==='undefined') return;
    try{
      const [d,p,g,a,t]=await Promise.all([
        client().from('darshan').select('*').eq('published',true).order('darshan_date',{ascending:false}).limit(1).maybeSingle(),
        client().from('pujaris').select('*').eq('published',true).order('sort_order').order('created_at'),
        client().from('gallery').select('*').eq('published',true).order('sort_order').order('created_at',{ascending:false}),
        client().from('announcements').select('*').eq('published',true).order('announcement_date',{ascending:false}),
        client().from('temple_info').select('*').eq('id',1).maybeSingle()
      ]);
      if(d.data){DATA.darshan={date:d.data.darshan_date,title:d.data.title,description:d.data.description||'',image:d.data.image_url||DATA.darshan.image};}
      if(p.data?.length){DATA.pujaris=p.data.map(x=>({id:x.id,dbId:x.id,name:x.name,role:x.role||'',image:x.image_url||'',description:x.description||'',experience:x.experience||'',responsibilities:x.responsibilities||''}));}
      if(g.data?.length){const embedded=(DATA.__staticGallery||DATA.gallery||[]).filter(x=>!x.dbId); DATA.__staticGallery=embedded; DATA.gallery=embedded.concat(g.data.map(x=>({id:x.id,dbId:x.id,image:x.image_url,title:x.title,description:x.description||x.title,category:x.category,catLabel:categoryLabel(x.category)})));}
      if(a.data?.length){DATA.announcements=a.data.map(x=>({id:x.id,dbId:x.id,title:x.title,date:guDate(x.announcement_date),description:x.description||''}));}
      if(t.data) await loadTemple();
      if(typeof renderDarshan==='function') renderDarshan();
      if(typeof renderPujaris==='function') renderPujaris();
      if(typeof renderGallery==='function') renderGallery(window.galleryFilter||'all');
      if(typeof renderAnnouncements==='function') renderAnnouncements();
      if(typeof updateAdminStats==='function') updateAdminStats();
    }catch(e){console.warn('Public Supabase sync skipped:',e);}
  }

  // Gallery CRUD: direct image upload + database record.
  window.handleGalleryFileSelect=function(e){
    const file=e.target.files?.[0]; window.__pendingGalleryFile=file||null;
    const img=document.getElementById('galleryUploadPreview'), prompt=document.getElementById('galleryUploadPrompt'), zone=document.getElementById('galleryDropzone');
    if(file){const r=new FileReader();r.onload=ev=>{if(img){img.src=ev.target.result;img.style.display='block';}if(prompt)prompt.style.display='none';if(zone)zone.classList.add('has-image');};r.readAsDataURL(file);}
  };
  window.saveGallery=async function(){
    if(!(await window.__requireSecurityKey?.() ?? true)) return;
    try{await adminGuard(); const title=document.getElementById('galleryTitle')?.value.trim(); const description=document.getElementById('galleryDesc')?.value.trim()||''; const category=normalizeCategory(document.getElementById('galleryCategory')?.value); let imageUrl=document.getElementById('galleryImage')?.value.trim()||''; let imagePath=null;
      if(!title){showToast('ફોટો શીર્ષક જરૂરી છે.','error');return;} if(window.__pendingGalleryFile){const up=await upload(window.__pendingGalleryFile,'gallery');imageUrl=up.url;imagePath=up.path;} if(!imageUrl){showToast('ફોટો અપલોડ કરો.','error');return;}
      const {data,error}=await client().from('gallery').insert({title,description,category,image_url:imageUrl,image_path:imagePath,published:true,sort_order:0}).select().single(); if(error)throw error;
      DATA.gallery.push({id:data.id,dbId:data.id,image:data.image_url,title:data.title,description:data.description,category:data.category,catLabel:categoryLabel(data.category)}); renderGallery('all'); if(typeof updateAdminStats==='function')updateAdminStats(); showToast('ગેલેરી ફોટો સાચવાયો.','success');
    }catch(e){console.error(e);showToast('ગેલેરી ફોટો સાચવવામાં ભૂલ થઈ.','error');}
  };

  // Announcements CRUD.
  window.addAnnouncement=async function(){
    if(!(await window.__requireSecurityKey?.() ?? true)) return;
    try{await adminGuard(); const title=document.getElementById('announceTitle')?.value.trim(); const date=document.getElementById('announceDate')?.value; const description=document.getElementById('announceDesc')?.value.trim()||''; if(!title||!date){showToast('શીર્ષક અને તારીખ જરૂરી છે.','error');return;}
      const {data,error}=await client().from('announcements').insert({title,announcement_date:date,description,published:true}).select().single(); if(error)throw error; DATA.announcements.unshift({id:data.id,dbId:data.id,title:data.title,date:guDate(data.announcement_date),description:data.description||''}); document.getElementById('announceTitle').value='';document.getElementById('announceDate').value='';document.getElementById('announceDesc').value='';renderAnnouncements();updateAdminStats();showToast('જાહેરાત સાચવાઈ.','success');
    }catch(e){console.error(e);showToast('જાહેરાત સાચવવામાં ભૂલ થઈ.','error');}
  };
  window.deleteAnnouncement=async function(idOrIndex){
    if(!(await window.__requireSecurityKey?.() ?? true)) return;
    try{await adminGuard(); let item=DATA.announcements.find(x=>String(x.id)===String(idOrIndex)||String(x.dbId)===String(idOrIndex)); if(!item)item=DATA.announcements[idOrIndex]; if(!item)return; if(item.dbId||String(item.id).includes('-')){const id=item.dbId||item.id;const {error}=await client().from('announcements').delete().eq('id',id);if(error)throw error;} DATA.announcements=DATA.announcements.filter(x=>x!==item);renderAnnouncements();updateAdminStats();showToast('જાહેરાત કાઢી નાખી.','success');}catch(e){console.error(e);showToast('જાહેરાત કાઢી નાખવામાં ભૂલ.','error');}
  };

  // Temple info CRUD. Includes contact details and map URL.
  window.saveTempleInfo=async function(){
    if(!(await window.__requireSecurityKey?.() ?? true)) return;
    try{await adminGuard(); const payload={id:1,temple_name:'બ્રહ્માંડેશ્વર મહાદેવ મંદિર',description:document.getElementById('templeIntro')?.value.trim()||'',history:document.getElementById('templeHistory')?.value.trim()||'',significance:document.getElementById('templeSignificance')?.value.trim()||'',timings:document.getElementById('templeTimings')?.value.trim()||'',address:document.getElementById('templeAddress')?.value.trim()||'',phone:document.getElementById('templePhone')?.value.trim()||'',email:document.getElementById('templeEmail')?.value.trim()||'',map_url:document.getElementById('templeMapUrl')?.value.trim()||'https://maps.app.goo.gl/m5frtUYgsR8UAwLA6',updated_at:new Date().toISOString()}; const {error}=await client().from('temple_info').upsert(payload,{onConflict:'id'});if(error)throw error;await loadTemple();showToast('મંદિર માહિતી સાચવાઈ.','success');}catch(e){console.error(e);showToast('મંદિર માહિતી સાચવવામાં ભૂલ થઈ.','error');}
  };

  // Contact form: if a form exists, persist it. The original UI is untouched.
  function bindContact(){
    const page=document.getElementById('page-contact'); if(!page)return;
    const form=page.querySelector('form'); if(!form || form.dataset.supabaseBound)return; form.dataset.supabaseBound='1';
    form.addEventListener('submit',async e=>{e.preventDefault(); const inputs=[...form.querySelectorAll('input,textarea')]; const val=n=>inputs.find(x=>(x.name||x.id||'').toLowerCase().includes(n)); const name=val('name')?.value?.trim()||''; const email=val('email')?.value?.trim()||''; const phone=val('phone')?.value?.trim()||''; const msg=val('message')?.value?.trim()||val('msg')?.value?.trim()||''; if(!name||!msg){showToast('કૃપા કરી નામ અને સંદેશ લખો.','error');return;} const {error}=await client().from('contact_messages').insert({name,email,phone,message:msg,status:'new'}); if(error){console.error(error);showToast('સંદેશ સાચવવામાં ભૂલ થઈ.','error');return;} form.reset();showToast('તમારો સંદેશ સફળતાપૂર્વક મોકલાયો.','success');});
  }

  function addTempleAdminFields(){
    const phone=document.getElementById('templePhone'); if(!phone || document.getElementById('templeEmail'))return; const wrap=phone.parentElement; const label=document.createElement('label'); label.textContent='ઇમેઇલ'; const input=document.createElement('input');input.id='templeEmail';input.type='email';input.value='bhramandeshwarmahadev@gmail.com'; wrap.appendChild(label);wrap.appendChild(input); const label2=document.createElement('label');label2.textContent='Google Maps સ્થાન';const input2=document.createElement('input');input2.id='templeMapUrl';input2.type='url';input2.value='https://maps.app.goo.gl/m5frtUYgsR8UAwLA6';wrap.appendChild(label2);wrap.appendChild(input2);
  }

  function wireSession(){
    client()?.auth?.onAuthStateChange((_event,session)=>{ if(!session){window.isAdmin=false;document.body.classList.remove('admin-mode'); const login=document.getElementById('adminLogin'),dash=document.getElementById('adminDashboard');if(login&&dash){dash.style.display='none';login.style.display='flex';} } });
  }
  document.addEventListener('DOMContentLoaded',()=>{
    addTempleAdminFields(); bindContact(); wireSession();
    // Original content paints first; database sync follows without blocking it.
    setTimeout(()=>loadPublic(),500);
  });
  window.__loadSupabaseEverything=loadPublic;
})();
