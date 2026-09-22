import fs from "node:fs";
import path from "node:path";

const ROOT=process.cwd();
const IGNORE=new Set(["NODE_ENV","CI","NEXT_TELEMETRY_DISABLED","CI_ENV_CONTRACT_STRICT","VERCEL","VERCEL_ENV","VERCEL_URL","VERCEL_REGION","VERCEL_TARGET_ENV","VERCEL_DEPLOYMENT_ID","npm_config_user_agent","npm_config_node_gyp"]);
const roots=["src","scripts","supabase/functions","next.config.ts","playwright.config.ts","vitest.config.ts"];
const extensions=new Set([".ts",".tsx",".js",".jsx",".mjs",".cjs",".sql"]);
function filesUnder(input,out=[]){
 const full=path.join(ROOT,input);
 if(!fs.existsSync(full)) return out;
 const stat=fs.statSync(full);
 if(stat.isFile()){out.push(full);return out;}
 for(const e of fs.readdirSync(full,{withFileTypes:true})){
  if(["node_modules",".next",".git"].includes(e.name)) continue;
  const f=path.join(full,e.name);
  if(e.isDirectory()) filesUnder(path.relative(ROOT,f),out);
  else if(extensions.has(path.extname(e.name))) out.push(f);
 }
 return out;
}
const files=roots.flatMap(x=>filesUnder(x));
const used=new Map();
const re=/process\.env\.([A-Z][A-Z0-9_]*)/g;
for(const file of files){
 const body=fs.readFileSync(file,"utf8");
 for(const m of body.matchAll(re)){
  const name=m[1]; if(IGNORE.has(name)) continue;
  const list=used.get(name)??[]; list.push(path.relative(ROOT,file)); used.set(name,list);
 }
}
const example=fs.readFileSync(path.join(ROOT,".env.example"),"utf8");
const documented=new Set([...example.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map(m=>m[1]));
const missing=[...used.keys()].filter(k=>!documented.has(k)).sort();
const duplicates=[...example.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map(m=>m[1]).filter((x,i,a)=>a.indexOf(x)!==i);
console.log("=== Credi Environment Contract Audit ===");
console.log("Direct process.env variables:",used.size);
console.log("Documented in .env.example:",documented.size);
console.log("Undocumented variables:",missing.length);
for(const name of missing) console.log(`- ${name}: ${used.get(name).slice(0,5).join(", ")}`);
if(duplicates.length) throw new Error(`Duplicate environment variables: ${[...new Set(duplicates)].join(", ")}`);
if(missing.length && process.env.CI_ENV_CONTRACT_STRICT==="true") process.exit(1);
console.log(missing.length ? "Environment contract: REVIEW REQUIRED" : "Environment contract: PASSED");
