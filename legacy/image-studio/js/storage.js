(function(){'use strict';
  const DB='kaoru-image-studio-v13',STORE='session',KEY='latest';
  function open(){return new Promise((res,rej)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)})}
  async function withStore(mode,fn){const db=await open();return new Promise((res,rej)=>{const tx=db.transaction(STORE,mode),req=fn(tx.objectStore(STORE));req.onsuccess=()=>res(req.result);req.onerror=()=>rej(req.error);tx.oncomplete=()=>db.close();tx.onerror=()=>{db.close();rej(tx.error)}})}
  function save(record){return withStore('readwrite',s=>s.put({...record,savedAt:Date.now()},KEY))}function load(){return withStore('readonly',s=>s.get(KEY))}function clear(){return withStore('readwrite',s=>s.delete(KEY))}
  window.ImageStorage={save,load,clear};
}());
