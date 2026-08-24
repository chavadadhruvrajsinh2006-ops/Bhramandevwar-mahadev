/* Session bridge: public UI renders first; auth state only controls the admin area. */
(function(){
 document.addEventListener("DOMContentLoaded",async()=>{try{const c=window.supabaseClient;if(!c)return;const {data:{session}}=await c.auth.getSession();if(session){const {data:p}=await c.from("profiles").select("role").eq("id",session.user.id).maybeSingle();if(p?.role==="admin" && window.isAdmin!==false){window.isAdmin=true;document.body.classList.add("admin-mode");const l=document.getElementById("adminLogin"),d=document.getElementById("adminDashboard");if(l&&d){l.style.display="none";d.style.display="block";}}}}catch(e){console.warn("Auth restore skipped",e);}});
})();
