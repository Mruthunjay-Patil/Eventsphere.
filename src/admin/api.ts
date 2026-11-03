import { VendorService } from '../types';

const API = (import.meta as any).env?.VITE_API_BASE_URL || (window.location.hostname === 'localhost' && window.location.port === '3001' ? 'http://localhost:3000' : '');
async function request<T>(path:string, options:RequestInit={}):Promise<T>{
  const token=sessionStorage.getItem('eventsphere_admin_token');
  const res=await fetch(`${API}${path}`,{...options,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})}});
  const raw=await res.text(); let json:any;
  try{json=raw?JSON.parse(raw):{};}catch{throw new Error(`Server returned an invalid response (HTTP ${res.status}).`);}
  if(!res.ok||json.success===false) throw new Error(json.message||'Request failed');
  return json.data as T;
}
export const adminApi={
 login:(email:string,password:string)=>request<{user:any;token:string}>('/api/auth/login',{method:'POST',body:JSON.stringify({email,password,role:'admin'})}),
 services:(status='pending')=>request<VendorService[]>(`/api/admin/services?status=${status}`),
 approve:(id:string)=>request<VendorService>(`/api/admin/services/${id}/approve`,{method:'POST'}),
 reject:(id:string,reason:string)=>request<VendorService>(`/api/admin/services/${id}/reject`,{method:'POST',body:JSON.stringify({rejectionReason:reason})}),
 vendors:()=>request<any[]>('/api/admin/vendors'),
 vendorDetails:(id:string)=>request<any>(`/api/admin/vendors/${encodeURIComponent(id)}/details`),
 removeService:(id:string)=>request<any>(`/api/admin/services/${encodeURIComponent(id)}`,{method:'DELETE'}),

 verifyVendor:(id:string,verified:boolean)=>request<any>(`/api/admin/vendors/${id}/verify`,{method:'POST',body:JSON.stringify({status:verified?'verified':'pending'})}),
 suspendVendor:(id:string,suspended:boolean,reason?:string)=>request<any>(`/api/admin/vendors/${id}/suspend`,{method:'POST',body:JSON.stringify({suspended,reason})}),
 bookings:()=>request<any[]>('/api/bookings'),
 payments:()=>request<any[]>('/api/admin/payments'),
 customers:()=>request<any[]>('/api/admin/customers'),
 reviews:()=>request<any[]>('/api/reviews'),
 complaints:()=>request<any[]>('/api/admin/complaints'),
 updateComplaint:(id:string,status:string,adminNote='')=>request<any>(`/api/admin/complaints/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify({status,adminNote})}),
 eventCategories:()=>request<any[]>('/api/categories/events'),
 vendorCategories:()=>request<any[]>('/api/categories/vendors'),
 updateCategory:(kind:'events'|'vendors',id:string,name:string)=>request<any>(`/api/admin/categories/${kind}/${encodeURIComponent(id)}`,{method:'PUT',body:JSON.stringify({name})}),
 removeReview:(id:string)=>request<any>(`/api/admin/reviews/${id}`,{method:'DELETE'}),
 refund:(id:string)=>request<any>(`/api/admin/payments/${id}/refund`,{method:'POST'}),
 stats:()=>request<any>('/api/admin/stats')
};
