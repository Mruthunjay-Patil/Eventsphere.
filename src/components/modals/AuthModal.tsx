import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, X, Store, UserRound, MailCheck, ArrowLeft, LoaderCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { api, authToken } from '../../services/api';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, authMode, setAuthMode, authRole, loginUser, registerUser, vendorCategories } = useApp();
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'password'|'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [form, setForm] = useState({ name: '', businessName: '', email: '', phone: '', password: '', city: 'Bangalore', categoryId: '' });
  const register = authMode === 'register'; const vendor = authRole === 'vendor';
  useEffect(() => { if (isAuthModalOpen) { setShowPassword(false); setError(''); setMode('password'); setOtpSent(false); setOtp(''); setResendSeconds(0); setForm({ name:'',businessName:'',email:'',phone:'',password:'',city:'Bangalore',categoryId:'' }); } }, [isAuthModalOpen, authMode, authRole]);
  useEffect(() => { if (resendSeconds <= 0) return; const timer = window.setInterval(() => setResendSeconds(v => Math.max(0, v - 1)), 1000); return () => window.clearInterval(timer); }, [resendSeconds]);
  useEffect(() => {
    if (!isAuthModalOpen || register || vendor || mode !== 'password') return;
    const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
    if (!clientId || !googleButtonRef.current) return;
    let cancelled = false;
    const render = () => {
      const google = (window as any).google;
      if (cancelled || !google?.accounts?.id || !googleButtonRef.current) return;
      google.accounts.id.initialize({ client_id: clientId, callback: async (response: any) => {
        if (!response?.credential) return;
        setBusy(true); setError('');
        try {
          const result = await api.loginWithGoogle(response.credential);
          authToken.set(result.token);
          window.location.href = '/?view=home';
        } catch (e: any) { setError(e.message || 'Google sign-in failed.'); }
        finally { setBusy(false); }
      } });
      google.accounts.id.renderButton(googleButtonRef.current, { theme: 'outline', size: 'large', shape: 'rectangular', text: 'continue_with', width: Math.min(340, googleButtonRef.current.clientWidth || 340) });
    };
    if ((window as any).google?.accounts?.id) render();
    else {
      let script = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');
      if (!script) { script = document.createElement('script'); script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true; script.dataset.googleIdentity = 'true'; document.head.appendChild(script); }
      script.addEventListener('load', render);
      const pending = script;
      return () => { cancelled = true; pending.removeEventListener('load', render); };
    }
    return () => { cancelled = true; };
  }, [isAuthModalOpen, register, vendor, mode]);
  if (!isAuthModalOpen) return null;
  const update=(key:string,value:string)=>setForm(p=>({...p,[key]:value}));
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{if(register) await registerUser({...form,password:form.password || undefined,role:authRole,categoryId:form.categoryId||vendorCategories[0]?.id});else await loginUser({email:form.email,password:form.password,role:authRole});}catch(e:any){setError(e.message || 'Unable to continue. Please try again.')}finally{setBusy(false)}};
  const requestOtp=async()=>{ if(!form.email.trim()){setError('Enter your email address first.');return;} setBusy(true);setError('');try{const result=await api.requestEmailOtp(form.email);setOtpSent(true);setOtp('');setResendSeconds(result.resendAfter||60);}catch(e:any){setError(e.message||'Could not request a code.')}finally{setBusy(false)} };
  const verifyOtp=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{const result=await api.verifyEmailOtp(form.email,otp);if(result.user.role!==authRole){throw new Error(`This account is registered as a ${result.user.role}.`)}authToken.set(result.token);window.location.href=`/?view=${result.user.role==='vendor'?'vendor-portal':'home'}`;}catch(e:any){setError(e.message||'The code could not be verified.')}finally{setBusy(false)}};
  return <div className="eventsphere-auth-backdrop fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-3 sm:p-4" onMouseDown={e=>{if(e.target===e.currentTarget)closeAuthModal()}}>
    <div className="eventsphere-auth-card my-auto max-h-[94dvh] w-full max-w-[430px] overflow-y-auto rounded-[24px] border border-stone-200 bg-white text-stone-900 shadow-2xl">
      <div className="sticky top-0 z-10 flex items-start justify-between border-b border-stone-100 bg-white px-6 pb-3 pt-5"><div><div className="text-[11px] font-bold uppercase tracking-[.2em] text-[#ef4563]">EventSphere</div><h2 className="mt-1 text-2xl font-bold">{otpSent?'Verify your email':register?(vendor?'Create your vendor account':'Create your account'):(vendor?'Vendor login':'Welcome back')}</h2></div><button aria-label="Close login" onClick={closeAuthModal} className="rounded-full p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-900"><X/></button></div>
      <div className="px-6 pt-3 pb-1 text-xs text-stone-500 flex items-center gap-2">{vendor?<Store className="w-4 h-4 text-[#ef4563]"/>:<UserRound className="w-4 h-4 text-[#ef4563]"/>}{vendor?'Vendor account':'Customer account'}</div>
      {error&&<div role="alert" className="mx-6 mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
      {otpSent&&!register ? <form onSubmit={verifyOtp} className="space-y-4 p-6 pt-4"><p className="text-sm leading-6 text-stone-600">If an eligible account exists for <b>{form.email}</b>, a six-digit code has been sent. The code expires in five minutes.</p><input required inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="Enter 6-digit code" className="auth-field text-center text-xl tracking-[.4em]"/><button disabled={busy||otp.length!==6} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ef4563] py-3.5 font-bold text-white disabled:opacity-50">{busy&&<LoaderCircle className="h-4 w-4 animate-spin"/>}{busy?'Verifying…':'Verify and login'}</button><div className="flex items-center justify-between text-sm"><button type="button" onClick={()=>{setOtpSent(false);setOtp('');setError('')}} className="flex items-center gap-1 text-stone-500 hover:text-stone-800"><ArrowLeft className="h-4 w-4"/> Change email</button><button type="button" disabled={busy||resendSeconds>0} onClick={requestOtp} className="font-semibold text-[#ef4563] disabled:text-stone-400">{resendSeconds>0?`Resend in ${resendSeconds}s`:'Resend code'}</button></div></form> : <form ref={formRef} onSubmit={submit} className="space-y-4 p-6 pt-3">
        {register&&<input required value={form.name} onChange={e=>update('name',e.target.value)} placeholder="Full name" autoComplete="name" className="auth-field"/>}
        {register&&vendor&&<input required value={form.businessName} onChange={e=>update('businessName',e.target.value)} placeholder="Business / vendor name" className="auth-field"/>}
        <input required type="email" value={form.email} onChange={e=>update('email',e.target.value)} placeholder="Email address" autoComplete="email" className="auth-field"/>
        {register&&<input required value={form.phone} onChange={e=>update('phone',e.target.value)} placeholder="Mobile number" className="auth-field"/>}
        {register&&vendor&&<select required value={form.categoryId} onChange={e=>update('categoryId',e.target.value)} className="auth-field bg-white"><option value="">Select primary service category</option>{vendorCategories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>}
        {register&&<input required value={form.city} onChange={e=>update('city',e.target.value)} placeholder="City" className="auth-field"/>}
        {(register ? vendor : mode==='password')&&<div className="relative"><input required={vendor||!register} minLength={register&&!vendor?0:8} type={showPassword?'text':'password'} value={form.password} onChange={e=>update('password',e.target.value)} placeholder={register&&!vendor?'Password (optional for customers)':'Password'} autoComplete={register?'new-password':'current-password'} className="auth-field pr-12"/><button type="button" aria-label={showPassword?'Hide password':'Show password'} onClick={()=>setShowPassword(v=>!v)} className="absolute right-4 top-3.5 text-stone-500">{showPassword?<EyeOff className="h-5 w-5"/>:<Eye className="h-5 w-5"/>}</button></div>}
        {!register&&mode==='otp' ? <button type="button" disabled={busy} onClick={requestOtp} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#ef4563] py-3.5 font-bold text-white hover:bg-[#df3655] disabled:opacity-50">{busy&&<LoaderCircle className="h-4 w-4 animate-spin"/>}{busy?'Sending code…':'Send email OTP'}</button> : <button disabled={busy} className="w-full rounded-xl bg-[#ef4563] py-3.5 font-bold text-white hover:bg-[#df3655] disabled:opacity-50">{busy?'Please wait…':register?(vendor?'Create vendor account':'Create account'):'Login'}</button>}
        {!register&&<>
          <button type="button" disabled={busy} onClick={()=>{setMode(mode==='otp'?'password':'otp');setOtpSent(false);setError('')}} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#F04468]/35 py-3 font-semibold text-[#78283F] hover:bg-[#FFF0F3]"><MailCheck className="h-4 w-4"/>{mode==='otp'?'Use email + password':'Login with Email OTP'}</button>
          {!vendor&&mode==='password'&&<><div className="flex items-center gap-3 text-xs text-stone-400"><span className="h-px flex-1 bg-stone-200"/>OR<span className="h-px flex-1 bg-stone-200"/></div><div ref={googleButtonRef} className="flex min-h-[42px] justify-center"/><p className="text-center text-[11px] text-stone-400">Google sign-in is available for customer accounts only.</p></>}
        </>}
        <p className="text-center text-sm text-stone-500">{register?'Already have an account?':'New to EventSphere?'} <button type="button" onClick={()=>{setAuthMode(register?'login':'register');setMode('password');setOtpSent(false);setError('')}} className="font-bold text-[#ef4563]">{register?'Login':'Create account'}</button></p>
      </form>}
    </div>
  </div>;
};
