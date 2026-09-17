import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const input=process.argv[2];if(!input){console.error('Usage: node scripts/import-portfolio.mjs portfolio.pdf');process.exit(1)}
const source=fs.readFileSync(input),out=path.resolve(import.meta.dirname,'../source-assets');fs.mkdirSync(out,{recursive:true});
const chunk=8*1024*1024,parts=[];
for(let offset=0,i=1;offset<source.length;offset+=chunk,i++){const name=`portfolio-renata-guimaraes.pdf.part${i}`;fs.writeFileSync(path.join(out,name),source.subarray(offset,offset+chunk));parts.push(name)}
const manifest={filename:'portfolio-renata-guimaraes.pdf',bytes:source.length,sha256:crypto.createHash('sha256').update(source).digest('hex'),parts};
fs.writeFileSync(path.join(out,'portfolio.json'),JSON.stringify(manifest,null,2)+'\n');console.log('Stored portfolio parts; SHA-256: '+manifest.sha256);
