import {
  getBook,
  putBook,
  listBooks,
  deleteBook,
  getAsset,
  putAsset
} from './reader-db.js?cache=pdf-reader-1';

import {
  parseEpub
} from './epub-parser.js?cache=archive-reader';

const MODULE='reader';
const ENTITY_TYPE='book';
const TABLE='kaoru_records';
const BUCKET='kaoru-files';
const SOURCE_PREFIX='source:';
const DELETE_QUEUE_KEY='kaoru.reader.book-delete.queue.v1';

let syncing=false;
let channel=null;

function account(){
  return window.KaoruReaderAccount||null;
}

function currentUser(){
  return account()?.currentUser?.()||null;
}

function client(){
  return account()?.getClient?.()||null;
}

function showStatus(message){
  const target=document.getElementById('readerAccountStatus');
  if(target)target.textContent=message||'';
}

function readDeleteQueue(){
  try{
    const parsed=JSON.parse(localStorage.getItem(DELETE_QUEUE_KEY)||'[]');
    return Array.isArray(parsed)?parsed:[];
  }catch(_){
    return [];
  }
}

function writeDeleteQueue(items){
  try{
    localStorage.setItem(DELETE_QUEUE_KEY,JSON.stringify(items.slice(-200)));
  }catch(_){}
}

function queueDelete(bookId,updatedAt=Date.now()){
  const user=currentUser();
  if(!user)throw new Error('Inicia sesion para eliminar de todos tus dispositivos.');

  const id=String(bookId||'');
  if(!id)throw new Error('No se pudo identificar el libro.');

  const items=readDeleteQueue().filter(item=>
    !(item.bookId===id&&item.userId===user.id)
  );

  items.push({
    bookId:id,
    userId:user.id,
    updatedAt:Number(updatedAt)||Date.now()
  });

  writeDeleteQueue(items);
}

function removeQueuedDelete(item){
  writeDeleteQueue(readDeleteQueue().filter(current=>
    !(
      current.bookId===item.bookId&&
      current.userId===item.userId&&
      Number(current.updatedAt)<=Number(item.updatedAt)
    )
  ));
}

async function requestPersistentStorage(){
  try{
    if(navigator.storage?.persist){
      await navigator.storage.persist();
    }
  }catch(_){}
}
function safePart(value,fallback='file'){
  const clean=String(value||'')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9._-]+/g,'_')
    .replace(/^_+|_+$/g,'')
    .slice(0,140);
  return clean||fallback;
}

function sourceAssetId(bookId){
  return `${SOURCE_PREFIX}${bookId}`;
}

function storagePath(book,fileName){
  const user=currentUser();
  if(!user)throw new Error('Inicia sesion para sincronizar la biblioteca.');

  return [
    user.id,
    'reader',
    'books',
    safePart(book.id,'book'),
    safePart(fileName,book.format==='pdf'?'documento.pdf':'obra.epub')
  ].join('/');
}

function arrayBufferFrom(value){
  if(value instanceof ArrayBuffer)return value;
  if(ArrayBuffer.isView(value)){
    return value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength);
  }
  return null;
}

async function storeImportedFile(file,book){
  if(!file||!book?.id)return;

  const bytes=await file.arrayBuffer();
  const format=String(book.format||'').toLowerCase()==='pdf'?'pdf':'epub';
  const fallback=format==='pdf'?'documento.pdf':'obra.epub';

  await putAsset({
    id:sourceAssetId(book.id),
    bookId:book.id,
    name:String(file.name||book.fileName||fallback),
    mime:String(file.type||book.mime||(format==='pdf'?'application/pdf':'application/epub+zip')),
    size:Number(file.size||bytes.byteLength||0),
    updatedAt:Number(book.contentUpdatedAt||Date.now()),
    bytes
  });

  if(currentUser()&&navigator.onLine){
    syncBook(book).catch(error=>{
      console.warn('Kaoru Reader upload import',error);
      showStatus('El libro quedo local y se subira cuando vuelva la conexion.');
    });
  }
}

async function sourceForBook(book){
  const source=await getAsset(sourceAssetId(book.id));
  const sourceBytes=arrayBufferFrom(source?.bytes);

  if(sourceBytes){
    return{
      bytes:sourceBytes,
      name:String(source.name||book.fileName||(book.format==='pdf'?'documento.pdf':'obra.epub')),
      mime:String(source.mime||book.mime||(book.format==='pdf'?'application/pdf':'application/epub+zip')),
      kind:'original'
    };
  }

  if(String(book.format||'').toLowerCase()==='pdf'){
    const pdf=await getAsset(`pdf:${book.id}`);
    const pdfBytes=arrayBufferFrom(pdf?.bytes);

    if(!pdfBytes)throw new Error(`No encuentro los bytes locales de ${book.title||'este PDF'}.`);

    return{
      bytes:pdfBytes,
      name:String(pdf.name||book.fileName||'documento.pdf'),
      mime:'application/pdf',
      kind:'original'
    };
  }

  const portable=new TextEncoder().encode(JSON.stringify({
    schema:'kaoru.reader.portable-epub.v1',
    book
  }));

  return{
    bytes:portable.buffer,
    name:`${safePart(book.title,'obra')}.kaoru-epub.json`,
    mime:'application/x-kaoru-epub+json',
    kind:'portable'
  };
}

function bookPayload(book,source,path){
  return{
    id:String(book.id),
    format:String(book.format||'epub'),
    title:String(book.title||'Sin titulo'),
    author:String(book.author||''),
    fileName:String(book.fileName||source.name),
    mime:String(book.mime||source.mime),
    size:Number(book.size||source.bytes.byteLength||0),
    pageCount:Number(book.pageCount||0),
    storyChapterCount:Number(book.storyChapterCount||book.chapters?.length||0),
    language:String(book.language||''),
    ao3WorkId:String(book.ao3WorkId||''),
    importedAt:Number(book.importedAt||Date.now()),
    contentUpdatedAt:Number(book.contentUpdatedAt||book.importedAt||Date.now()),
    storagePath:path,
    storageName:source.name,
    storageMime:source.mime,
    storageKind:source.kind
  };
}

async function syncBook(book){
  const api=client();
  const user=currentUser();
  if(!api||!user||!navigator.onLine||!book?.id)return null;

  const source=await sourceForBook(book);
  const path=storagePath(book,source.name);
  const blob=new Blob([source.bytes],{type:source.mime});

  showStatus(`Subiendo ${book.title||'libro'} a Storage privado...`);

  const {error:uploadError}=await api.storage
    .from(BUCKET)
    .upload(path,blob,{
      upsert:true,
      contentType:source.mime,
      cacheControl:'3600'
    });

  if(uploadError)throw uploadError;

  const payload=bookPayload(book,source,path);
  const updatedAt=Number(payload.contentUpdatedAt)||Date.now();

  const {error:recordError}=await api.rpc('kaoru_upsert_record',{
    p_module:MODULE,
    p_entity_type:ENTITY_TYPE,
    p_entity_id:String(book.id),
    p_payload:payload,
    p_client_updated_at:updatedAt,
    p_deleted:false,
    p_device_id:localStorage.getItem('kaoru.reader.device-id.v1')||'reader-device'
  });

  if(recordError)throw recordError;
  return payload;
}

async function performDelete(item){
  const api=client();
  const user=currentUser();

  if(!api||!user||!navigator.onLine)return false;
  if(item.userId!==user.id)return false;

  const id=String(item.bookId||'');
  const now=Math.max(Number(item.updatedAt)||0,Date.now());
  const device=localStorage.getItem('kaoru.reader.device-id.v1')||'reader-device';

  const {data:record,error:readError}=await api
    .from(TABLE)
    .select('entity_id,payload,client_updated_at,deleted')
    .eq('module',MODULE)
    .eq('entity_type',ENTITY_TYPE)
    .eq('entity_id',id)
    .maybeSingle();

  if(readError)throw readError;

  const path=String(record?.payload?.storagePath||'');
  if(path){
    const {error:removeError}=await api.storage.from(BUCKET).remove([path]);
    if(removeError)throw removeError;
  }

  const {error:bookError}=await api.rpc('kaoru_upsert_record',{
    p_module:MODULE,
    p_entity_type:ENTITY_TYPE,
    p_entity_id:id,
    p_payload:{},
    p_client_updated_at:now,
    p_deleted:true,
    p_device_id:device
  });
  if(bookError)throw bookError;

  const {error:progressError}=await api.rpc('kaoru_upsert_record',{
    p_module:MODULE,
    p_entity_type:'progress',
    p_entity_id:id,
    p_payload:{},
    p_client_updated_at:now,
    p_deleted:true,
    p_device_id:device
  });
  if(progressError)throw progressError;

  removeQueuedDelete(item);
  return true;
}

async function flushDeletes(){
  const user=currentUser();
  if(!user||!navigator.onLine)return 0;

  const pending=readDeleteQueue()
    .filter(item=>item.userId===user.id)
    .sort((a,b)=>Number(a.updatedAt)-Number(b.updatedAt));
  let completed=0;

  for(const item of pending){
    if(await performDelete(item))completed+=1;
  }

  return completed;
}

async function deleteEverywhere(bookId){
  const user=currentUser();
  const id=String(bookId||'');

  if(!user)throw new Error('Inicia sesion para eliminar de todos tus dispositivos.');
  if(!id)throw new Error('No se pudo identificar el libro.');

  const now=Date.now();
  queueDelete(id,now);
  await deleteBook(id);

  window.dispatchEvent(new CustomEvent('kaoru:reader-library-changed',{
    detail:{bookId:id,source:navigator.onLine?'delete':'delete-offline'}
  }));

  if(!navigator.onLine){
    showStatus('Libro eliminado aqui. La eliminacion se completara en los otros dispositivos al volver Internet.');
    return;
  }

  showStatus('Eliminando libro y progreso de Kaoru Cloud...');
  await flushDeletes();
  showStatus('Libro eliminado de todos tus dispositivos.');
}
async function downloadRemoteBook(row){
  const api=client();
  if(!api||!currentUser()||!navigator.onLine)return false;

  const payload=row?.payload||{};
  const path=String(payload.storagePath||'');
  if(!path)return false;

  showStatus(`Descargando ${payload.title||'libro'} de Kaoru Cloud...`);

  const {data,error}=await api.storage.from(BUCKET).download(path);
  if(error)throw error;

  const bytes=await data.arrayBuffer();
  let book=null;

  if(payload.storageKind==='portable'||payload.storageMime==='application/x-kaoru-epub+json'){
    const parsed=JSON.parse(new TextDecoder().decode(bytes));
    if(parsed?.schema!=='kaoru.reader.portable-epub.v1'||!parsed.book){
      throw new Error('El paquete EPUB de Kaoru no es valido.');
    }
    book=parsed.book;
  }else if(String(payload.format).toLowerCase()==='pdf'){
    book={
      id:String(payload.id||row.entity_id),
      format:'pdf',
      title:String(payload.title||'Documento PDF'),
      author:String(payload.author||''),
      fileName:String(payload.fileName||payload.storageName||'documento.pdf'),
      mime:'application/pdf',
      pageCount:Math.max(1,Number(payload.pageCount)||1),
      size:Number(payload.size||bytes.byteLength||0),
      importedAt:Number(payload.importedAt||Date.now()),
      contentUpdatedAt:Number(payload.contentUpdatedAt||row.client_updated_at||Date.now()),
      lastOpenedAt:0
    };

    await putAsset({
      id:`pdf:${book.id}`,
      name:book.fileName,
      mime:'application/pdf',
      size:bytes.byteLength,
      updatedAt:book.contentUpdatedAt,
      bytes
    });
  }else{
    const file=new File(
      [bytes],
      String(payload.fileName||payload.storageName||'obra.epub'),
      {type:String(payload.storageMime||'application/epub+zip')}
    );
    book=await parseEpub(file);
  }

  book.id=String(payload.id||row.entity_id||book.id);
  book.contentUpdatedAt=Number(payload.contentUpdatedAt||row.client_updated_at||book.contentUpdatedAt||Date.now());
  book.importedAt=Number(payload.importedAt||book.importedAt||Date.now());
  book.lastOpenedAt=Number((await getBook(book.id))?.lastOpenedAt||0);

  await putBook(book);
  await putAsset({
    id:sourceAssetId(book.id),
    bookId:book.id,
    name:String(payload.storageName||payload.fileName||'archivo'),
    mime:String(payload.storageMime||data.type||'application/octet-stream'),
    size:bytes.byteLength,
    updatedAt:book.contentUpdatedAt,
    bytes
  });

  window.dispatchEvent(new CustomEvent('kaoru:reader-library-changed',{
    detail:{bookId:book.id,source:'cloud'}
  }));

  return true;
}

async function reconcile(){
  if(syncing||!navigator.onLine)return;

  const api=client();
  const user=currentUser();
  if(!api||!user)return;

  syncing=true;
  showStatus('Sincronizando biblioteca privada...');

  try{
    await flushDeletes();

    const {data,error}=await api
      .from(TABLE)
      .select('user_id,module,entity_type,entity_id,payload,client_updated_at,device_id,deleted,server_updated_at')
      .eq('module',MODULE)
      .eq('entity_type',ENTITY_TYPE);

    if(error)throw error;

    const rows=(Array.isArray(data)?data:[])
      .filter(row=>row.user_id===user.id);
    const remote=new Map(rows.map(row=>[String(row.entity_id),row]));
    const local=await listBooks();
    const localMap=new Map(local.map(book=>[String(book.id),book]));
    const deletedIds=new Set();
    let downloaded=0;
    let uploaded=0;

    for(const row of rows){
      const id=String(row.entity_id);
      const book=localMap.get(id);
      const localTs=Number(book?.contentUpdatedAt||book?.importedAt||0);
      const remoteTs=Number(row.client_updated_at||row.payload?.contentUpdatedAt||0);

      if(row.deleted){
        if(book&&remoteTs>=localTs){
          await deleteBook(id);
          deletedIds.add(id);
          window.dispatchEvent(new CustomEvent('kaoru:reader-library-changed',{
            detail:{bookId:id,source:'delete-remote'}
          }));
        }
        continue;
      }

      if(!book||remoteTs>localTs){
        if(await downloadRemoteBook(row))downloaded+=1;
      }
    }

    for(const book of local){
      const id=String(book.id);
      if(deletedIds.has(id))continue;

      const row=remote.get(id);
      const localTs=Number(book.contentUpdatedAt||book.importedAt||0);
      const remoteTs=Number(row?.client_updated_at||row?.payload?.contentUpdatedAt||0);

      if(row?.deleted){
        if(localTs>remoteTs){
          await syncBook(book);
          uploaded+=1;
        }
        continue;
      }

      if(!row||localTs>remoteTs||!row.payload?.storagePath){
        await syncBook(book);
        uploaded+=1;
      }
    }

    showStatus(
      downloaded||uploaded
        ?`Biblioteca sincronizada: ${downloaded} descargado(s), ${uploaded} subido(s).`
        :'Biblioteca y progreso sincronizados entre dispositivos.'
    );
  }finally{
    syncing=false;
  }
}

async function stopRealtime(){
  const api=client();
  if(channel&&api){
    try{await api.removeChannel(channel);}catch(_){}
  }
  channel=null;
}

async function startRealtime(){
  await stopRealtime();

  const api=client();
  const user=currentUser();
  if(!api||!user||!navigator.onLine)return;

  channel=api
    .channel(`kaoru-reader-books-${user.id}`)
    .on(
      'postgres_changes',
      {event:'*',schema:'public',table:TABLE},
      async event=>{
        const row=event?.new&&Object.keys(event.new).length?event.new:event?.old;
        if(
          !row||
          row.user_id!==currentUser()?.id||
          row.module!==MODULE||
          row.entity_type!==ENTITY_TYPE
        )return;

        try{
          if(row.deleted){
            await deleteBook(String(row.entity_id));
            window.dispatchEvent(new CustomEvent('kaoru:reader-library-changed',{
              detail:{bookId:String(row.entity_id),source:'delete-realtime'}
            }));
            showStatus('Un libro fue eliminado en otro dispositivo.');
            return;
          }

          const local=await getBook(String(row.entity_id));
          const localTs=Number(local?.contentUpdatedAt||local?.importedAt||0);
          const remoteTs=Number(row.client_updated_at||0);
          if(!local||remoteTs>localTs)await downloadRemoteBook(row);
        }catch(error){
          console.warn('Kaoru Reader book Realtime',error);
          showStatus('No se pudo descargar un libro remoto; se reintentara.');
        }
      }
    )
    .subscribe();
}

async function activate(){
  if(!currentUser()){
    await stopRealtime();
    return;
  }
  if(!navigator.onLine)return;

  await startRealtime();
  await reconcile();
}

window.addEventListener('kaoru:reader-account',event=>{
  if(event.detail?.user){
    setTimeout(()=>activate().catch(error=>{
      console.warn('Kaoru Reader files activate',error);
      showStatus(error?.message||'No se pudo sincronizar la biblioteca privada.');
    }),0);
  }else{
    stopRealtime().catch(()=>{});
  }
});

window.addEventListener('online',()=>{
  activate().catch(error=>{
    console.warn('Kaoru Reader files online',error);
  });
});

window.addEventListener('offline',()=>{
  stopRealtime().catch(()=>{});
});

window.KaoruReaderFileCloud={
  storeImportedFile,
  syncBook,
  reconcile,
  deleteEverywhere,
  flushDeletes,
  pendingDeletes:()=>readDeleteQueue().length,
  isSignedIn:()=>Boolean(currentUser())
};

requestPersistentStorage();

account()?.ready?.().then(()=>activate()).catch(error=>{
  console.warn('Kaoru Reader files boot',error);
});