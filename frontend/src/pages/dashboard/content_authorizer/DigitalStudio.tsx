import Studio from '@/features/digital-studio/module/Studio';
import type {StudioTransport} from '@/features/digital-studio/module/types';
import api from '@/lib/api';
import ContentAuthorizerShell from './ContentAuthorizerShell';
import {getDocument,GlobalWorkerOptions} from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
GlobalWorkerOptions.workerSrc=pdfWorker;
const transport:StudioTransport={
 async request<T>(method:string,path:string,data?:unknown):Promise<T>{
  try{return(await api.request({method,url:`/studio/v1${path}`,data})).data as T;}
  catch(error:unknown){const e=error as {response?:{data?:{error?:string}};message?:string};throw new Error(e.response?.data?.error||e.message||'Studio request failed');}
 },
 async blob(path){return(await api.get(`/studio/v1${path}`,{responseType:'blob'})).data as Blob;},
 async extractPdf(file){const task=getDocument({data:await file.arrayBuffer(),isEvalSupported:false});const pdf=await task.promise;try{if(pdf.numPages>100)throw Error('Use a PDF with 100 pages or fewer.');const pages:string[]=[];for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const text=await page.getTextContent();pages.push(text.items.map(item=>'str'in item?item.str:'').join(' '));}return pages.join('\n\n');}finally{await pdf.destroy();}}
};
export default function DigitalStudio(){return <ContentAuthorizerShell title="Digital Studio" subtitle="Plan. Create. Teach."><Studio transport={transport}/></ContentAuthorizerShell>;}
