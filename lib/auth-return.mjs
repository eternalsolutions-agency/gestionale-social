const destinations=new Set(['/workspace','/team','/abbonamento','/approvazioni','/campagne','/report']);
export function authReturnPath(value,origin){try{const target=new URL(value||'/workspace',origin);if(target.origin===origin&&!target.username&&!target.password&&destinations.has(target.pathname))return target.pathname+target.search}catch{}return '/workspace'}
