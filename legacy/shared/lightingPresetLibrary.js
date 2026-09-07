const FAVORITES_KEY='kaoru-lighting-favorites-v1';
const CUSTOM_KEY='kaoru-lighting-custom-presets-v1';

function readJson(key,fallback){
  try{
    const raw=localStorage.getItem(key);
    if(!raw)return fallback;
    const value=JSON.parse(raw);
    return value??fallback;
  }catch(_){
    return fallback;
  }
}

function writeJson(key,value){
  localStorage.setItem(
    key,
    JSON.stringify(value)
  );
}

function clone(value){
  return JSON.parse(
    JSON.stringify(value)
  );
}

export function favoriteLightingPresetIds(){
  const value=readJson(FAVORITES_KEY,[]);
  return Array.isArray(value)
    ?value.filter(Boolean)
    :[];
}

export function isFavoriteLightingPreset(id){
  return favoriteLightingPresetIds()
    .includes(String(id||''));
}

export function toggleFavoriteLightingPreset(id){
  const target=String(id||'');
  if(!target)return false;

  const items=new Set(
    favoriteLightingPresetIds()
  );

  if(items.has(target)){
    items.delete(target);
    writeJson(
      FAVORITES_KEY,
      [...items]
    );
    return false;
  }

  items.add(target);
  writeJson(
    FAVORITES_KEY,
    [...items]
  );
  return true;
}

export function listCustomLightingPresets(studio){
  const items=readJson(CUSTOM_KEY,[]);
  if(!Array.isArray(items))return [];

  return items
    .filter(
      item=>
        item&&
        item.studio===studio&&
        item.id&&
        item.snapshot
    )
    .sort(
      (a,b)=>
        Number(b.updatedAt||0)-
        Number(a.updatedAt||0)
    )
    .map(clone);
}

export function customLightingPresetById(
  id,
  studio
){
  return listCustomLightingPresets(studio)
    .find(
      item=>item.id===id
    )||null;
}

export function saveCustomLightingPreset({
  studio,
  name,
  description='Variante personalizada',
  snapshot
}){
  const now=Date.now();
  const safeStudio=
    String(studio||'lighting')
      .replace(/[^a-z0-9-]/gi,'-')
      .toLowerCase();

  const id=
    `user-atmo-${safeStudio}-${now.toString(36)}-${Math.random().toString(36).slice(2,7)}`;

  const record={
    id,
    studio:safeStudio,
    name:String(name||'Mi preset').trim()||'Mi preset',
    description:String(description||'Variante personalizada'),
    snapshot:clone(snapshot),
    createdAt:now,
    updatedAt:now
  };

  const items=readJson(CUSTOM_KEY,[]);
  const next=Array.isArray(items)
    ?[record,...items]
    :[record];

  writeJson(
    CUSTOM_KEY,
    next.slice(0,120)
  );

  return clone(record);
}

export function deleteCustomLightingPreset(
  id,
  studio
){
  const items=readJson(CUSTOM_KEY,[]);
  if(!Array.isArray(items))return false;

  const before=items.length;
  const next=items.filter(
    item=>!(
      item?.id===id&&
      item?.studio===studio
    )
  );

  if(next.length===before){
    return false;
  }

  writeJson(CUSTOM_KEY,next);

  const favorites=new Set(
    favoriteLightingPresetIds()
  );

  if(favorites.delete(id)){
    writeJson(
      FAVORITES_KEY,
      [...favorites]
    );
  }

  return true;
}
