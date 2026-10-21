import {supabase} from './supabase';
export async function invokeFunction(name,body){
 const {data,error}=await supabase.functions.invoke(name,{body});
 if(error){let message=error.message;try{const detail=await error.context?.json();message=detail?.error||detail?.message||message}catch{}throw new Error(message)}
 if(data?.error)throw new Error(data.error);return data;
}
