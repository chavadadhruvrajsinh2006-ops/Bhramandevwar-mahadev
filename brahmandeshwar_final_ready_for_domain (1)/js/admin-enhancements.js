/* Brahmandeshwar admin enhancements - preserves original design and embedded images. */
(function(){
  const KEY_HASH = '1e5eaf48e1f596f93166e6007a8b43f7b90f61c9cf5eebb708e3cce5e412143a';
  let securityUnlocked = false;
  let pendingDarshanFile = null;
  let pendingPujariFile = null;
  let editingPujariId = null;

  async function sha256(text){
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  async function verifySecurityKey(){
    const input=document.getElementById('securityKey');
    const status=document.getElementById('securityKeyStatus');
    if(!input) return false;
    const ok=(await sha256(input.value.trim()))===KEY_HASH;
    securityUnlocked=ok;
    if(status){ status.textContent=ok?'✓ સુરક્ષા કી સાચી છે. ફેરફાર કરી શકાય છે.':'✕ સુરક્ષા કી ખોટી છે.'; status.style.color=ok?'#2b6b45':'#9b3028'; }
    if(ok) input.value='';
    return ok;
  }
  async function requireKey(){
    if(securityUnlocked) return true;
    const v=prompt('ફેરફાર કરવા માટે સુરક્ષા કી દાખલ કરો:');
    if(!v){ showToast('સુરક્ષા કી જરૂરી છે.','error'); return false; }
    if((await sha256(v.trim()))!==KEY_HASH){ showToast('સુરક્ષા કી ખોટી છે. ફેરફાર અટકાવ્યો.','error'); return false; }
    securityUnlocked=true; showToast('સુરક્ષા કી ચકાસાઈ.','success'); return true;
  }

  function uploadPreview(file, previewId, promptId, zoneId){
    if(!file || !file.type.startsWith('image/')){ showToast('કૃપા કરી ઇમેજ ફાઇલ પસંદ કરો.','error'); return; }
    const r=new FileReader(); r.onload=e=>{
      const p=document.getElementById(previewId), q=document.getElementById(promptId), z=document.getElementById(zoneId);
      if(p){p.src=e.target.result;p.style.display='block';} if(q) q.style.display='none'; if(z) z.classList.add('has-image');
    }; r.readAsDataURL(file);
  }
  window.handleDarshanFileSelect=function(e){ pendingDarshanFile=e.target.files?.[0]||null; if(pendingDarshanFile) uploadPreview(pendingDarshanFile,'darshanUploadPreview','darshanUploadPrompt','darshanDropzone'); };
  window.handlePujariFileSelect=function(e){ pendingPujariFile=e.target.files?.[0]||null; if(pendingPujariFile) uploadPreview(pendingPujariFile,'pujariUploadPreview','pujariUploadPrompt','pujariDropzone'); };

  async function uploadImage(file, folder){
    const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'');
    const path=`${folder}/${crypto.randomUUID()}.${ext||'jpg'}`;
    const {error}=await window.supabaseClient.storage.from('temple-images').upload(path,file,{upsert:false,contentType:file.type||'image/jpeg'});
    if(error) throw error;
    const {data}=window.supabaseClient.storage.from('temple-images').getPublicUrl(path);
    return {path,url:data.publicUrl};
  }

  async function currentAdmin(){
    const {data:{user}}=await window.supabaseClient.auth.getUser();
    if(!user) throw new Error('LOGIN_REQUIRED');
    const {data:profile}=await window.supabaseClient.from('profiles').select('role').eq('id',user.id).single();
    if(profile?.role!=='admin') throw new Error('ADMIN_REQUIRED');
    return user;
  }

  // Today's Darshan: upload a file directly, save it, and automatically add it to gallery.
  window.saveDarshan=async function(){
    if(!(await requireKey())) return;
    try{
      await currentAdmin();
      const date=document.getElementById('darshanDateInput').value;
      const title=document.getElementById('darshanTitle').value.trim()||'આજના દર્શન';
      const description=document.getElementById('darshanDesc').value.trim();
      if(!date){showToast('તારીખ પસંદ કરો.','error');return;}
      let imageUrl=document.getElementById('darshanImage').value; let imagePath=null;
      if(pendingDarshanFile){ const up=await uploadImage(pendingDarshanFile,'darshan'); imageUrl=up.url; imagePath=up.path; }
      if(!imageUrl){showToast('ફોટો અપલોડ કરો.','error');return;}
      const {data:existing}=await window.supabaseClient.from('darshan').select('id').eq('darshan_date',date).maybeSingle();
      let row;
      if(existing){ const r=await window.supabaseClient.from('darshan').update({title,description,image_url:imageUrl,image_path:imagePath||undefined,published:true,updated_at:new Date().toISOString()}).eq('id',existing.id).select().single(); if(r.error)throw r.error; row=r.data; }
      else{ const r=await window.supabaseClient.from('darshan').insert({darshan_date:date,title,description,image_url:imageUrl,image_path:imagePath,published:true}).select().single(); if(r.error)throw r.error; row=r.data; }
      // Add the same image to Gallery automatically.
      const gr=await window.supabaseClient.from('gallery').insert({title:title||'આજના દર્શન',description:description||'આજના દિવ્ય દર્શન',category:'darshan',image_url:imageUrl,image_path:imagePath,published:true,sort_order:0});
      if(gr.error) console.warn('Gallery auto-sync failed:',gr.error);
      DATA.darshan={date,title,description,image:imageUrl}; pendingDarshanFile=null;
      document.getElementById('darshanImage').value=imageUrl;
      document.getElementById('darshanPreviewImg').src=imageUrl; document.getElementById('darshanPreviewTitle').textContent=title; document.getElementById('darshanPreviewDesc').textContent=description;
      document.getElementById('darshanFullImg').src=imageUrl;
      if(window.renderGallery) await window.renderGallery('all');
      showToast('આજના દર્શન સાચવાયા અને ગેલેરીમાં પણ ઉમેરાયા.','success');
    }catch(e){console.error(e);showToast('દર્શન સાચવવામાં ભૂલ થઈ.','error');}
  };

  // Fully editable pujari editor.
  window.clearPujariForm=function(){
    editingPujariId=null; ['pujariName','pujariRole','pujariDescription','pujariExperience','pujariResponsibilities','pujariImage'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
    pendingPujariFile=null; const p=document.getElementById('pujariUploadPreview'),q=document.getElementById('pujariUploadPrompt'),z=document.getElementById('pujariDropzone'); if(p){p.src='';p.style.display='none';} if(q)q.style.display='flex'; if(z)z.classList.remove('has-image');
  };
  window.editPujari=async function(idOrIndex){
    let p=DATA.pujaris.find(x=>String(x.id)===String(idOrIndex)); if(!p && DATA.pujaris[idOrIndex]) p=DATA.pujaris[idOrIndex]; if(!p)return;
    editingPujariId=p.id; document.getElementById('pujariName').value=p.name||''; document.getElementById('pujariRole').value=p.role||''; document.getElementById('pujariDescription').value=p.description||''; document.getElementById('pujariExperience').value=p.experience||''; document.getElementById('pujariResponsibilities').value=p.responsibilities||''; document.getElementById('pujariImage').value=p.image||'';
    const pr=document.getElementById('pujariUploadPreview'), pp=document.getElementById('pujariUploadPrompt'); if(pr&&p.image){pr.src=p.image;pr.style.display='block';} if(pp)pp.style.display=p.image?'none':'flex';
    showAdminSection('pujaris');
  };
  window.savePujari=async function(){
    if(!(await requireKey()))return;
    try{ await currentAdmin();
      const name=document.getElementById('pujariName').value.trim(); if(!name){showToast('પૂજારીનું નામ જરૂરી છે.','error');return;}
      let imageUrl=document.getElementById('pujariImage').value; let imagePath=null;
      if(pendingPujariFile){const up=await uploadImage(pendingPujariFile,'pujaris');imageUrl=up.url;imagePath=up.path;}
      const payload={name,role:document.getElementById('pujariRole').value.trim(),description:document.getElementById('pujariDescription').value.trim(),experience:document.getElementById('pujariExperience').value.trim(),responsibilities:document.getElementById('pujariResponsibilities').value.trim(),image_url:imageUrl,image_path:imagePath,published:true};
      let saved;
      if(editingPujariId && String(editingPujariId).includes('-')){const r=await window.supabaseClient.from('pujaris').update(payload).eq('id',editingPujariId).select().single();if(r.error)throw r.error;saved=r.data;}
      else if(editingPujariId){const local=DATA.pujaris.find(x=>String(x.id)===String(editingPujariId)); if(local?.dbId){const r=await window.supabaseClient.from('pujaris').update(payload).eq('id',local.dbId).select().single();if(r.error)throw r.error;saved=r.data;} else {const r=await window.supabaseClient.from('pujaris').insert(payload).select().single();if(r.error)throw r.error;saved=r.data;}}
      else{const r=await window.supabaseClient.from('pujaris').insert(payload).select().single();if(r.error)throw r.error;saved=r.data;}
      const normalized={id:saved.id,dbId:saved.id,name:saved.name,role:saved.role,image:saved.image_url,description:saved.description,experience:saved.experience,responsibilities:saved.responsibilities};
      const idx=DATA.pujaris.findIndex(x=>String(x.id)===String(editingPujariId)||String(x.dbId)===String(editingPujariId)); if(idx>=0) DATA.pujaris[idx]=normalized; else DATA.pujaris.push(normalized);
      clearPujariForm(); renderPujaris(); updateAdminStats(); showToast('પૂજારીની સંપૂર્ણ માહિતી સાચવાઈ.','success');
    }catch(e){console.error(e);showToast('પૂજારી સાચવવામાં ભૂલ થઈ.','error');}
  };
  window.deletePujari=async function(id){ if(!(await requireKey()))return; try{await currentAdmin(); const p=DATA.pujaris.find(x=>String(x.id)===String(id)||String(x.dbId)===String(id)); if(!p)return; const dbid=p.dbId||((String(p.id).includes('-'))?p.id:null); if(dbid){const r=await window.supabaseClient.from('pujaris').delete().eq('id',dbid);if(r.error)throw r.error;} DATA.pujaris=DATA.pujaris.filter(x=>String(x.id)!==String(id)&&String(x.dbId)!==String(id)); renderPujaris();updateAdminStats();showToast('પૂજારી કાઢી નાખ્યો.','success');}catch(e){console.error(e);showToast('પૂજારી કાઢી નાખવામાં ભૂલ.','error');} };

  window.deleteGallery=async function(idOrIndex){
    if(!(await requireKey())) return;
    try{ await currentAdmin();
      let g=DATA.gallery.find(x=>String(x.id)===String(idOrIndex)||String(x.dbId)===String(idOrIndex));
      if(!g && DATA.gallery[idOrIndex]) g=DATA.gallery[idOrIndex];
      if(!g) return;
      const dbid=g.dbId || ((String(g.id).includes('-'))?g.id:null);
      if(dbid){ const r=await window.supabaseClient.from('gallery').delete().eq('id',dbid); if(r.error) throw r.error; }
      if(g.image_path){ await window.supabaseClient.storage.from('temple-images').remove([g.image_path]).catch(()=>{}); }
      DATA.gallery=DATA.gallery.filter(x=>x!==g);
      renderGallery(galleryFilter); updateAdminStats(); showToast('ફોટો કાઢી નાખ્યો.','success');
    }catch(e){ console.error(e); showToast('ફોટો કાઢી નાખવામાં ભૂલ.','error'); }
  };

  // Account settings: display name + email + password, protected by the extra key.
  window.verifySecurityKey=verifySecurityKey;
  window.__requireSecurityKey=requireKey;
  window.saveAccountSettings=async function(){
    if(!(await requireKey()))return;
    try{const user=await currentAdmin(); const name=document.getElementById('accountName').value.trim(); const email=document.getElementById('accountEmail').value.trim();
      const opts={data:{...user.user_metadata,display_name:name,username:name}}; if(email && email!==user.email) opts.email=email;
      const {error}=await window.supabaseClient.auth.updateUser(opts); if(error)throw error; showToast('એકાઉન્ટ માહિતી સાચવાઈ. ઈમેલ બદલ્યા હોય તો નવા ઈમેલની પુષ્ટિ કરવી પડી શકે.','success');
    }catch(e){console.error(e);showToast('એકાઉન્ટ માહિતી બદલવામાં ભૂલ.','error');}
  };
  window.changePassword=async function(){
    if(!(await requireKey()))return; const newp=document.getElementById('newPass').value,conf=document.getElementById('newPassConfirm').value;
    if(newp.length<8){showToast('પાસવર્ડ ઓછામાં ઓછો ૮ અક્ષરનો હોવો જોઈએ.','error');return;} if(newp!==conf){showToast('પાસવર્ડ મેચ થતા નથી.','error');return;}
    try{const {error}=await window.supabaseClient.auth.updateUser({password:newp});if(error)throw error;showToast('પાસવર્ડ સફળતાપૂર્વક બદલાયો.','success');document.getElementById('newPass').value='';document.getElementById('newPassConfirm').value='';}catch(e){console.error(e);showToast('પાસવર્ડ બદલવામાં ભૂલ.','error');}
  };

  // Existing login/session should show the account name.
  async function fillAccountSettings(){try{const {data:{user}}=await window.supabaseClient.auth.getUser();if(!user)return;const n=user.user_metadata?.display_name||user.user_metadata?.username||'એડમિન'; const a=document.querySelector('.admin-header .user span');if(a)a.textContent=n; const ne=document.getElementById('accountName'),em=document.getElementById('accountEmail');if(ne)ne.value=n;if(em)em.value=user.email||'';}catch(e){}}

  function hidePujaAdmin(){
    document.querySelectorAll('[data-section="puja"]').forEach(e=>e.remove());
    const el=document.getElementById('admin-puja'); if(el) el.remove();
    const stat=document.getElementById('statSeva'); if(stat?.parentElement) stat.parentElement.remove();
    const publicNav=document.querySelector('[data-page="puja"]'); if(publicNav?.closest('li')) publicNav.closest('li').remove();
    const publicPage=document.getElementById('page-puja'); if(publicPage) publicPage.remove();
    const homePuja=document.getElementById('home-puja'); if(homePuja) homePuja.remove();
    const logout=document.getElementById('adminLogoutBtn'); if(logout){ logout.style.display='inline-flex'; logout.style.visibility='visible'; }
  }

  async function loadSupabaseContent(){
    if(!window.supabaseClient)return;
    try{
      const {data:g}=await window.supabaseClient.from('gallery').select('*').eq('published',true).order('sort_order').order('created_at',{ascending:false});
      if(g?.length){ const mapped=g.map(x=>({id:x.id,dbId:x.id,image:x.image_url,title:x.title,description:x.description||x.title,category:x.category,catLabel:x.category==='darshan'?'આજના દર્શન':(x.category==='garbhagruh'?'ગર્ભગૃહ':'સ્થાપત્ય')})); const embedded=DATA.gallery.filter(x=>!x.dbId); DATA.gallery=[...embedded,...mapped]; }
      const {data:p}=await window.supabaseClient.from('pujaris').select('*').eq('published',true).order('sort_order').order('created_at');
      if(p?.length) DATA.pujaris=p.map(x=>({id:x.id,dbId:x.id,name:x.name,role:x.role,image:x.image_url,description:x.description,experience:x.experience,responsibilities:x.responsibilities}));
      const {data:d}=await window.supabaseClient.from('darshan').select('*').eq('published',true).order('darshan_date',{ascending:false}).limit(1).maybeSingle();
      if(d) DATA.darshan={date:d.darshan_date,title:d.title,description:d.description,image:d.image_url};
      renderPujaris(); renderGallery('all'); renderDarshan(); updateAdminStats();
    }catch(e){console.warn('Supabase content load failed',e);}
  }

  const oldShow=window.showAdminSection; window.showAdminSection=function(section){ if(section==='puja')section='dashboard'; oldShow(section); if(section==='settings')fillAccountSettings(); if(section==='pujaris')renderPujaris(); };
  const oldLogout=window.handleLogout; window.handleLogout=async function(){securityUnlocked=false;document.body.classList.remove('admin-mode');const nav=document.getElementById('navbar');if(nav)nav.style.display='flex';return oldLogout();};

  document.addEventListener('DOMContentLoaded',()=>{
    hidePujaAdmin();
    setTimeout(()=>{loadSupabaseContent();fillAccountSettings();},700);
    // Drag/drop for Darshan and Pujari uploads.
    [['darshanDropzone','darshanImageFile'],['pujariDropzone','pujariImageFile']].forEach(([zoneId,inputId])=>{const z=document.getElementById(zoneId);if(!z)return;['dragenter','dragover'].forEach(ev=>z.addEventListener(ev,e=>{e.preventDefault();z.classList.add('dragover')}));['dragleave','drop'].forEach(ev=>z.addEventListener(ev,e=>{e.preventDefault();z.classList.remove('dragover')}));z.addEventListener('drop',e=>{const f=e.dataTransfer.files?.[0];if(!f)return;document.getElementById(inputId).files=e.dataTransfer.files; document.getElementById(inputId).dispatchEvent(new Event('change',{bubbles:true}));});});
  });
})();
