(function(){
'use strict';

const THEME_KEY='siluetaStudioTheme';
const DB_NAME='kaoru_task_studio_db';
const DB_VERSION=1;
const COURSE_STORE='courses';
const TASK_STORE='tasks';
const FILE_STORE='files';
const SETTINGS_STORE='settings';
const FONT_DB_NAME='text_studio_fonts_db';
const FONT_STORE='fonts';
const EMBEDDED=window.parent!==window;
const COURSE_COLORS=['#7C3AED','#DB4C88','#4F7FD7','#0F9F91','#D94D7B','#7657DF','#B47722','#2F9B68'];

if(EMBEDDED)document.documentElement.classList.add('kaoru-embedded');

const $=id=>document.getElementById(id);
const els={
  pendingBadge:$('pendingBadge'),mobileHomeBtn:$('mobileHomeBtn'),cloudBtn:$('cloudBtn'),cloudBtnText:$('cloudBtnText'),cloudDot:$('cloudDot'),scheduleBtn:$('scheduleBtn'),notificationBtn:$('notificationBtn'),settingsBtn:$('settingsBtn'),themeBtn:$('themeBtn'),newTaskBtn:$('newTaskBtn'),
  courseSidebar:document.querySelector('.course-sidebar'),sideAddCourseBtn:$('sideAddCourseBtn'),closeCoursesBtn:$('closeCoursesBtn'),courseFilters:$('courseFilters'),completedFilterBtn:$('completedFilterBtn'),allCourseCount:$('allCourseCount'),completedCount:$('completedCount'),
  listTitle:$('listTitle'),listSubtitle:$('listSubtitle'),mobileCourseBtn:$('mobileCourseBtn'),pendingViewBtn:$('pendingViewBtn'),historyViewBtn:$('historyViewBtn'),historyCountInline:$('historyCountInline'),overdueCount:$('overdueCount'),todayCount:$('todayCount'),weekCount:$('weekCount'),pendingCount:$('pendingCount'),
  taskSearch:$('taskSearch'),mobileCourseChips:$('mobileCourseChips'),taskList:$('taskList'),taskEmpty:$('taskEmpty'),
  detailPane:$('detailPane'),detailEmpty:$('detailEmpty'),taskDetail:$('taskDetail'),closeDetailBtn:$('closeDetailBtn'),detailCompleteBtn:$('detailCompleteBtn'),detailCourseDot:$('detailCourseDot'),detailCourse:$('detailCourse'),detailKind:$('detailKind'),detailTitle:$('detailTitle'),detailProfessor:$('detailProfessor'),detailDue:$('detailDue'),restoreTaskBtn:$('restoreTaskBtn'),editTaskBtn:$('editTaskBtn'),deleteTaskBtn:$('deleteTaskBtn'),
  addLinkBtn:$('addLinkBtn'),addFileBtn:$('addFileBtn'),taskFileInput:$('taskFileInput'),taskDocs:$('taskDocs'),linkForm:$('linkForm'),linkLabel:$('linkLabel'),linkUrl:$('linkUrl'),cancelLinkBtn:$('cancelLinkBtn'),
  addNoteBtn:$('addNoteBtn'),richToolbar:$('richToolbar'),blockFormat:$('blockFormat'),fontSizeSelect:$('fontSizeSelect'),fontSelect:$('fontSelect'),refreshFontsBtn:$('refreshFontsBtn'),textColorInput:$('textColorInput'),highlightColorInput:$('highlightColorInput'),insertNoteImageBtn:$('insertNoteImageBtn'),noteImageInput:$('noteImageInput'),noteThread:$('noteThread'),
  scheduleModal:$('scheduleModal'),scheduleEmpty:$('scheduleEmpty'),scheduleInput:$('scheduleInput'),scheduleViewer:$('scheduleViewer'),scheduleImage:$('scheduleImage'),scheduleZoom:$('scheduleZoom'),scheduleZoomValue:$('scheduleZoomValue'),scheduleReplaceInput:$('scheduleReplaceInput'),deleteScheduleBtn:$('deleteScheduleBtn'),
  taskModal:$('taskModal'),taskModalTitle:$('taskModalTitle'),taskForm:$('taskForm'),taskTitleInput:$('taskTitleInput'),taskCourseSelect:$('taskCourseSelect'),taskKindSelect:$('taskKindSelect'),taskDueInput:$('taskDueInput'),taskTeacherPreview:$('taskTeacherPreview'),
  settingsModal:$('settingsModal'),newCourseInlineBtn:$('newCourseInlineBtn'),courseForm:$('courseForm'),courseIdInput:$('courseIdInput'),courseNameInput:$('courseNameInput'),courseColorInput:$('courseColorInput'),theoryProfessorInput:$('theoryProfessorInput'),hasLabInput:$('hasLabInput'),sameProfessorInput:$('sameProfessorInput'),labProfessorGroup:$('labProfessorGroup'),labProfessorInput:$('labProfessorInput'),courseNotesInput:$('courseNotesInput'),cancelCourseBtn:$('cancelCourseBtn'),courseSettingsList:$('courseSettingsList'),
  requestNotificationBtn:$('requestNotificationBtn'),testNotificationBtn:testNotificationBtn,notificationStatus:$('notificationStatus'),summaryIntervalSelect:$('summaryIntervalSelect'),
  cloudSignedOut:$('cloudSignedOut'),cloudSignedIn:$('cloudSignedIn'),cloudStateCard:$('cloudStateCard'),cloudStateText:$('cloudStateText'),cloudStateDetail:$('cloudStateDetail'),cloudAuthForm:$('cloudAuthForm'),cloudEmailInput:$('cloudEmailInput'),cloudPasswordInput:$('cloudPasswordInput'),cloudCreateBtn:$('cloudCreateBtn'),cloudSignOutBtn:$('cloudSignOutBtn'),cloudAuthMessage:$('cloudAuthMessage'),cloudUserEmail:$('cloudUserEmail'),cloudSyncText:$('cloudSyncText'),cloudQueueCount:$('cloudQueueCount')
};

const state={
  courses:[],tasks:[],selectedTaskId:null,courseFilter:'all',kindFilter:'all',quickFilter:'all',search:'',editingTaskId:null,
  notificationConfig:{enabled:false,intervalHours:3,thresholds:[24,3,1],lastSummaryAt:0},schedule:null,taskFonts:[],activeEditor:null,savedRange:null
};

const uid=(prefix='id')=>`${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,9)}`;
const esc=s=>String(s??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const now=()=>Date.now();
const dayMs=86400000;

function openDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(COURSE_STORE))db.createObjectStore(COURSE_STORE,{keyPath:'id'});
      if(!db.objectStoreNames.contains(TASK_STORE))db.createObjectStore(TASK_STORE,{keyPath:'id'});
      if(!db.objectStoreNames.contains(FILE_STORE))db.createObjectStore(FILE_STORE,{keyPath:'id'});
      if(!db.objectStoreNames.contains(SETTINGS_STORE))db.createObjectStore(SETTINGS_STORE,{keyPath:'key'});
    };
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function dbGetAll(store){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction(store,'readonly').objectStore(store).getAll();
    req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);
  });
}
async function dbGet(store,key){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const req=db.transaction(store,'readonly').objectStore(store).get(key);
    req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);
  });
}
function cloudEntityType(store){
  if(store===COURSE_STORE)return'course';
  if(store===TASK_STORE)return'task';
  return null;
}
async function dbPut(store,value){
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,'readwrite');
    tx.objectStore(store).put(value);
    tx.oncomplete=()=>{
      const entityType=cloudEntityType(store);
      if(entityType&&!window.__kaoruCloudApplyingRemote){
        window.KaoruTaskCloud?.queueUpsert?.(entityType,value);
      }
      resolve(value);
    };
    tx.onerror=()=>reject(tx.error);
  });
}
async function dbDelete(store,key){
  const existing=(store===COURSE_STORE||store===TASK_STORE)
    ? await dbGet(store,key).catch(()=>null)
    : null;
  const db=await openDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(store,'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete=()=>{
      const entityType=cloudEntityType(store);
      if(entityType&&!window.__kaoruCloudApplyingRemote){
        window.KaoruTaskCloud?.queueDelete?.(
          entityType,
          key,
          Math.max(Number(existing?.updatedAt||0),Date.now())
        );
      }
      resolve();
    };
    tx.onerror=()=>reject(tx.error);
  });
}
async function getSetting(key,fallback=null){const rec=await dbGet(SETTINGS_STORE,key);return rec?rec.value:fallback;}
async function setSetting(key,value){return dbPut(SETTINGS_STORE,{key,value,updatedAt:now()});}

function courseById(id){return state.courses.find(c=>c.id===id)||null;}
function taskById(id){return state.tasks.find(t=>t.id===id)||null;}
function kindName(kind){return kind==='lab'?'Laboratorio':kind==='theory'?'Teoría':'';}
function taskContext(task){
  const course=courseById(task.courseId);

  if(course){
    const professor=task.kind==='lab'
      ?(course.labProfessor||course.theoryProfessor)
      :(course.theoryProfessor||'');

    return{
      course,
      courseName:course.name,
      color:course.color||'#7C3AED',
      professor:professor||'Sin profesor registrado',
      kind:task.kind,
      personal:false,
      deletedCourse:false
    };
  }

  const intentionalPersonal=
    task.personal===true||
    (
      !task.courseId&&
      !String(task.courseNameSnapshot||'').trim()&&
      !String(task.professorSnapshot||'').trim()
    );

  if(intentionalPersonal){
    return{
      course:null,
      courseName:'',
      color:'#8B8490',
      professor:'',
      kind:'personal',
      personal:true,
      deletedCourse:false
    };
  }

  return{
    course:null,
    courseName:task.courseNameSnapshot||'Curso eliminado',
    color:task.courseColorSnapshot||'#8B8490',
    professor:task.professorSnapshot||'Sin profesor registrado',
    kind:task.kind||'theory',
    personal:false,
    deletedCourse:true
  };
}
function localDateTimeValue(value){
  if(!value)return'';const d=new Date(value);if(Number.isNaN(d.getTime()))return'';
  const pad=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function parseDue(value){if(!value)return null;const d=new Date(value);return Number.isNaN(d.getTime())?null:d.getTime();}
function dueDeadline(value){
  const due=parseDue(value);
  if(!due)return null;
  const d=new Date(due);
  /* datetime-local guarda hasta minutos: vence al final de ese minuto. */
  if(d.getSeconds()===0&&d.getMilliseconds()===0)return due+59999;
  return due;
}
function formatDue(value){
  if(!value)return'Sin fecha de entrega';const d=new Date(value);if(Number.isNaN(d.getTime()))return'Sin fecha de entrega';
  return new Intl.DateTimeFormat('es-PE',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(d);
}
function startOfToday(){const d=new Date();d.setHours(0,0,0,0);return d.getTime();}
function endOfToday(){return startOfToday()+dayMs-1;}
function dueClass(task){
  const due=dueDeadline(task.dueAt);if(!due||task.completed)return'';if(due<now())return'overdue';if(due<=endOfToday())return'today';if(due<=now()+3*dayMs)return'soon';return'';
}
function relativeDue(task){
  const due=dueDeadline(task.dueAt);
  if(!due)return'Sin plazo';
  if(task.completed)return`Completada ${task.completedAt?new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'short'}).format(new Date(task.completedAt)):''}`.trim();
  const diff=due-now();
  if(diff<0){
    const minutes=Math.max(1,Math.ceil(Math.abs(diff)/60000));
    if(minutes<60)return`Atrasada ${minutes} min`;
    const hours=Math.ceil(minutes/60);
    if(hours<24)return`Atrasada ${hours} h`;
    return`Atrasada ${Math.ceil(hours/24)} d`;
  }
  if(diff<=60000)return'Vence ahora';
  if(diff<3600000)return`En ${Math.max(1,Math.ceil(diff/60000))} min`;
  if(due<=endOfToday())return'Hoy';
  const tomorrowEnd=endOfToday()+dayMs;
  if(due<=tomorrowEnd)return'Mañana';
  return`En ${Math.ceil(diff/dayMs)} días`;
}
function noteDate(ts){return new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(ts||now()));}

function applyTheme(theme,save=false,notifyParent=false){
  const next=theme==='night'?'night':'day';document.documentElement.dataset.theme=next;els.themeBtn.textContent=next==='night'?'☀':'☾';els.themeBtn.title=next==='night'?'Modo claro':'Modo noche';
  if(save){try{localStorage.setItem(THEME_KEY,next);}catch(_){}}
  if(notifyParent&&EMBEDDED)window.parent.postMessage({type:'kaoru:theme',theme:next},'*');
}
window.StudioBridge={applyTheme:(theme)=>applyTheme(theme,false,false),readTheme:()=>document.documentElement.dataset.theme||'day'};
els.themeBtn.addEventListener('click',()=>applyTheme(document.documentElement.dataset.theme==='night'?'day':'night',true,true));

function showModal(id){const el=$(id);if(el){el.classList.remove('hidden');document.body.classList.add('modal-open');}}
function hideModal(id){const el=$(id);if(el){el.classList.add('hidden');if(!document.querySelector('.modal-overlay:not(.hidden)'))document.body.classList.remove('modal-open');}}
document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>hideModal(btn.dataset.close)));
document.querySelectorAll('.modal-overlay').forEach(modal=>modal.addEventListener('mousedown',e=>{if(e.target===modal)hideModal(modal.id);}));
document.addEventListener('keydown',e=>{if(e.key==='Escape'){const open=document.querySelector('.modal-overlay:not(.hidden)');if(open)hideModal(open.id);else if(els.detailPane.classList.contains('mobile-open'))closeMobileDetail();}});

function counts(){
  const pending=state.tasks.filter(t=>!t.completed);const completed=state.tasks.filter(t=>t.completed);const todayStart=startOfToday(),todayEnd=endOfToday();
  const overdue=pending.filter(t=>{const d=dueDeadline(t.dueAt);return d&&d<now();});
  const today=pending.filter(t=>{const d=parseDue(t.dueAt);return d&&d>=todayStart&&d<=todayEnd;});
  const week=pending.filter(t=>{const d=parseDue(t.dueAt);return d&&d>=now()&&d<=now()+7*dayMs;});
  return{pending,completed,overdue,today,week};
}
function updateCounts(){
  const c=counts();els.pendingBadge.textContent=`${c.pending.length}\u00A0pendiente${c.pending.length===1?'':'s'}`;els.pendingCount.textContent=c.pending.length;els.overdueCount.textContent=c.overdue.length;els.todayCount.textContent=c.today.length;els.weekCount.textContent=c.week.length;els.allCourseCount.textContent=c.pending.length;els.completedCount.textContent=c.completed.length;if(els.historyCountInline)els.historyCountInline.textContent=c.completed.length;
  document.title=c.pending.length?`(${c.pending.length}) Kaoru — Task Studio`:`Kaoru — Task Studio`;
  if(EMBEDDED)window.parent.postMessage({type:'kaoru:task-count',count:c.pending.length},'*');
}

function coursePendingCounts(course){
  const list=state.tasks.filter(t=>!t.completed&&t.courseId===course.id);return{all:list.length,theory:list.filter(t=>t.kind==='theory').length,lab:list.filter(t=>t.kind==='lab').length};
}
function selectCourseFilter(id){
  state.courseFilter=id;
  state.quickFilter='all';
  document.querySelectorAll('.course-filter').forEach(b=>b.classList.toggle('active',b.dataset.course===id));
  els.completedFilterBtn.classList.toggle('active',id==='completed');
  els.pendingViewBtn?.classList.toggle('active',id!=='completed');
  els.historyViewBtn?.classList.toggle('active',id==='completed');
  renderMobileCourseChips();
  renderTaskList();
  closeMobileCourses();
}
function renderCourseFilters(){
  els.courseFilters.innerHTML='';
  state.courses.forEach(course=>{
    const count=coursePendingCounts(course);const btn=document.createElement('button');btn.type='button';btn.className='course-filter';btn.dataset.course=course.id;btn.style.setProperty('--course-color',course.color||'#7C3AED');
    btn.innerHTML=`<span class="course-dot"></span><span class="course-filter-main"><strong>${esc(course.name)}</strong><span class="course-subcounts"><em>T ${count.theory}</em>${course.hasLab?`<em>L ${count.lab}</em>`:''}</span></span><b>${count.all}</b>`;
    btn.addEventListener('click',()=>selectCourseFilter(course.id));els.courseFilters.appendChild(btn);
  });
  document.querySelector('.course-filter[data-course="all"]')?.classList.toggle('active',state.courseFilter==='all');els.completedFilterBtn.classList.toggle('active',state.courseFilter==='completed');
  renderMobileCourseChips();
}
function renderMobileCourseChips(){
  els.mobileCourseChips.innerHTML='';
  const options=[{id:'all',name:'Todas'},...state.courses.map(c=>({id:c.id,name:c.name})),{id:'completed',name:'Completadas'}];
  options.forEach(o=>{const b=document.createElement('button');b.type='button';b.className='mobile-course-chip'+(state.courseFilter===o.id?' active':'');b.textContent=o.name;b.addEventListener('click',()=>selectCourseFilter(o.id));els.mobileCourseChips.appendChild(b);});
}
function filteredTasks(){
  let list=[...state.tasks];
  if(state.courseFilter==='completed')list=list.filter(t=>t.completed);else{
    list=list.filter(t=>!t.completed);if(state.courseFilter!=='all')list=list.filter(t=>t.courseId===state.courseFilter);
    if(state.kindFilter!=='all')list=list.filter(t=>t.kind===state.kindFilter);
    if(state.quickFilter==='overdue')list=list.filter(t=>{const d=parseDue(t.dueAt);return d&&d<now();});
    if(state.quickFilter==='today')list=list.filter(t=>{const d=parseDue(t.dueAt);return d&&d>=startOfToday()&&d<=endOfToday();});
    if(state.quickFilter==='week')list=list.filter(t=>{const d=parseDue(t.dueAt);return d&&d>=now()&&d<=now()+7*dayMs;});
  }
  const q=state.search.trim().toLowerCase();if(q)list=list.filter(t=>{const ctx=taskContext(t);return`${t.title} ${ctx.courseName} ${ctx.professor}`.toLowerCase().includes(q);});
  if(state.courseFilter==='completed')list.sort((a,b)=>(b.completedAt||0)-(a.completedAt||0));else list.sort((a,b)=>{const da=parseDue(a.dueAt),db=parseDue(b.dueAt);if(da==null&&db==null)return(b.createdAt||0)-(a.createdAt||0);if(da==null)return 1;if(db==null)return-1;return da-db;});
  return list;
}
function renderTaskList(){
  const list=filteredTasks();els.taskList.innerHTML='';els.taskEmpty.classList.toggle('hidden',list.length>0);
  if(state.courseFilter==='completed'){els.listTitle.textContent='Completadas';els.listSubtitle.textContent='Tus tareas terminadas más recientes.';}else if(state.quickFilter==='overdue'){els.listTitle.textContent='Atrasadas';els.listSubtitle.textContent='Primero lo que ya pasó de plazo.';}else if(state.quickFilter==='today'){els.listTitle.textContent='Para hoy';els.listSubtitle.textContent='Todo lo que vence durante el día.';}else if(state.quickFilter==='week'){els.listTitle.textContent='Próximos 7 días';els.listSubtitle.textContent='Tus entregas de esta semana.';}else{els.listTitle.textContent='Pendientes';els.listSubtitle.textContent='Lo más urgente aparece primero.';}
  list.forEach(task=>{const ctx=taskContext(task),card=document.createElement('article');card.className='task-card'+(task.id===state.selectedTaskId?' active':'')+(task.completed?' completed':'');card.style.setProperty('--course-color',ctx.color);
    const metaTop=ctx.personal
      ?''
      :`<div class="task-card-top"><span class="task-course-name">${esc(ctx.courseName)}</span><span class="task-kind">${kindName(task.kind)}</span></div>`;
    const professor=ctx.personal
      ?''
      :`<span class="task-professor">${esc(ctx.professor)}</span>`;
    card.innerHTML=`<button class="task-check" type="button" aria-label="${task.completed?'Marcar pendiente':'Completar tarea'}"></button>${metaTop}<strong class="task-card-title">${esc(task.title)}</strong><div class="task-card-bottom">${professor}<span class="task-due ${dueClass(task)}">${esc(relativeDue(task))}</span></div>`;card.querySelector('.task-check').addEventListener('click',async e=>{e.stopPropagation();await toggleComplete(task.id);});card.addEventListener('click',()=>selectTask(task.id));els.taskList.appendChild(card);
  });
  updateCounts();renderCourseFilters();
}
function selectTask(id){state.selectedTaskId=id;renderTaskList();renderDetail();if(window.matchMedia('(max-width:900px)').matches)els.detailPane.classList.add('mobile-open');}
function closeMobileDetail(){els.detailPane.classList.remove('mobile-open');}
els.closeDetailBtn.addEventListener('click',closeMobileDetail);

async function toggleComplete(id){
  const task=taskById(id);
  if(!task)return;

  const restoring=!!task.completed;
  task.completed=!task.completed;
  task.completedAt=task.completed?now():null;
  task.updatedAt=now();

  await dbPut(TASK_STORE,task);

  /*
    Si una tarea se recupera desde el Historial, vuelve inmediatamente
    a Pendientes para que quede claro que no se perdió.
  */
  if(restoring&&state.courseFilter==='completed'){
    state.courseFilter='all';
  }

  renderTaskList();
  if(state.selectedTaskId===id)renderDetail();
}

function renderDetail(){
  const task=taskById(state.selectedTaskId);if(!task){els.detailEmpty.classList.remove('hidden');els.taskDetail.classList.add('hidden');return;}
  const ctx=taskContext(task);
  els.detailEmpty.classList.add('hidden');
  els.taskDetail.classList.remove('hidden');

  els.detailCourse.textContent=ctx.courseName;
  els.detailCourseDot.style.background=ctx.color;
  els.detailKind.textContent=kindName(task.kind);
  els.detailTitle.textContent=task.title;
  els.detailProfessor.textContent=ctx.professor;

  const detailMetaLine=els.detailCourse.closest('.detail-meta-line');
  const professorLine=els.detailProfessor.closest('.professor-line');

  if(detailMetaLine)detailMetaLine.classList.toggle('hidden',ctx.personal);
  if(professorLine)professorLine.classList.toggle('hidden',ctx.personal);

  els.detailDue.textContent=`${task.completed?'Completada · ':'Entrega · '}${formatDue(task.dueAt)}`;
  els.detailDue.className='due-line '+dueClass(task);
  els.detailCompleteBtn.classList.toggle('done',!!task.completed);
  els.detailCompleteBtn.style.setProperty('--course-color',ctx.color);
  els.detailCompleteBtn.title=task.completed?'Volver a Pendientes':'Marcar como completada';
  els.detailCompleteBtn.setAttribute('aria-label',task.completed?'Volver a Pendientes':'Marcar como completada');
  els.restoreTaskBtn.classList.toggle('hidden',!task.completed);

  renderDocs(task);
  renderNoteThread(task);}
els.detailCompleteBtn.addEventListener('click',()=>state.selectedTaskId&&toggleComplete(state.selectedTaskId));els.restoreTaskBtn.addEventListener('click',()=>state.selectedTaskId&&toggleComplete(state.selectedTaskId));

function populateTaskCourseSelect(selectedId,task=null){
  const courseOptions=state.courses
    .map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`)
    .join('');

  const deletedCourse=
    task&&
    !task.personal&&
    !task.courseId&&
    String(task.courseNameSnapshot||'').trim();

  const deletedOption=deletedCourse
    ?`<option value="__deleted__">Curso eliminado · ${esc(task.courseNameSnapshot)}</option>`
    :'';

  els.taskCourseSelect.innerHTML=
    `<option value="">Sin curso</option>${deletedOption}${courseOptions}`;

  if(selectedId&&state.courses.some(c=>c.id===selectedId)){
    els.taskCourseSelect.value=selectedId;
  }else if(deletedCourse){
    els.taskCourseSelect.value='__deleted__';
  }else{
    els.taskCourseSelect.value='';
  }

  updateTaskKindOptions();
}

function updateTaskKindOptions(){
  const selected=els.taskCourseSelect.value;
  const course=courseById(selected);
  const currentTask=state.editingTaskId?taskById(state.editingTaskId):null;
  const current=els.taskKindSelect.value;
  const kindField=els.taskKindSelect.closest('.field');
  const teacherField=els.taskTeacherPreview.closest('.teacher-preview');

  if(selected==='__deleted__'){
    if(kindField)kindField.hidden=false;
    if(teacherField)teacherField.hidden=false;

    els.taskKindSelect.innerHTML=
      '<option value="theory">Teoría</option><option value="lab">Laboratorio</option>';

    els.taskKindSelect.value=
      currentTask?.kind==='lab'?'lab':'theory';

    updateTeacherPreview();
    return;
  }

  if(!course){
    els.taskKindSelect.innerHTML='<option value="personal">Sin tipo</option>';
    els.taskKindSelect.value='personal';

    if(kindField)kindField.hidden=true;
    if(teacherField)teacherField.hidden=true;

    updateTeacherPreview();
    return;
  }

  if(kindField)kindField.hidden=false;
  if(teacherField)teacherField.hidden=false;

  els.taskKindSelect.innerHTML=
    '<option value="theory">Teoría</option>'+
    (course.hasLab?'<option value="lab">Laboratorio</option>':'');

  els.taskKindSelect.value=
    (current==='lab'&&course.hasLab)?'lab':'theory';

  updateTeacherPreview();
}

function updateTeacherPreview(){
  const selected=els.taskCourseSelect.value;
  const course=courseById(selected);

  if(selected==='__deleted__'){
    const task=state.editingTaskId?taskById(state.editingTaskId):null;
    els.taskTeacherPreview.textContent=
      task?.professorSnapshot||'Sin profesor registrado';
    return;
  }

  if(!course){
    els.taskTeacherPreview.textContent='—';
    return;
  }

  els.taskTeacherPreview.textContent=
    els.taskKindSelect.value==='lab'
      ?(course.labProfessor||course.theoryProfessor||'Sin profesor registrado')
      :(course.theoryProfessor||'Sin profesor registrado');
}
function openTaskModal(task=null){
  state.editingTaskId=task?task.id:null;
  els.taskModalTitle.textContent=task?'Editar tarea':'Nueva tarea';

  const preferredCourse=
    task?.courseId||
    ((state.courseFilter!=='all'&&state.courseFilter!=='completed')
      ?state.courseFilter
      :null);

  populateTaskCourseSelect(preferredCourse,task);

  els.taskTitleInput.value=task?.title||'';

  if(els.taskCourseSelect.value==='__deleted__'){
    els.taskKindSelect.value=task?.kind==='lab'?'lab':'theory';
  }else if(courseById(els.taskCourseSelect.value)){
    els.taskKindSelect.value=task?.kind||'theory';
    updateTaskKindOptions();

    if(
      task?.kind==='lab'&&
      courseById(els.taskCourseSelect.value)?.hasLab
    ){
      els.taskKindSelect.value='lab';
    }
  }else{
    els.taskKindSelect.value='personal';
  }

  els.taskDueInput.value=localDateTimeValue(task?.dueAt||'');
  updateTeacherPreview();
  showModal('taskModal');
  setTimeout(()=>els.taskTitleInput.focus(),40);
}

els.newTaskBtn.addEventListener('click',()=>openTaskModal());els.editTaskBtn.addEventListener('click',()=>{const t=taskById(state.selectedTaskId);if(t)openTaskModal(t);});els.taskCourseSelect.addEventListener('change',updateTaskKindOptions);els.taskKindSelect.addEventListener('change',updateTeacherPreview);
els.taskForm.addEventListener('submit',async e=>{
  e.preventDefault();

  const title=els.taskTitleInput.value.trim();
  if(!title)return;

  const selected=els.taskCourseSelect.value;
  const course=courseById(selected);
  const deletedCourse=selected==='__deleted__';

  const due=
    els.taskDueInput.value
      ?new Date(els.taskDueInput.value).toISOString()
      :null;

  let task=state.editingTaskId
    ?taskById(state.editingTaskId)
    :null;

  let taskData;

  if(deletedCourse&&task){
    taskData={
      title,
      personal:false,
      courseId:null,
      courseNameSnapshot:task.courseNameSnapshot||'Curso eliminado',
      courseColorSnapshot:task.courseColorSnapshot||'#8B8490',
      professorSnapshot:task.professorSnapshot||'',
      kind:els.taskKindSelect.value==='lab'?'lab':'theory',
      dueAt:due,
      updatedAt:now()
    };
  }else if(course){
    const kind=
      els.taskKindSelect.value==='lab'&&course.hasLab
        ?'lab'
        :'theory';

    const professor=
      kind==='lab'
        ?(course.labProfessor||course.theoryProfessor)
        :(course.theoryProfessor||'');

    taskData={
      title,
      personal:false,
      courseId:course.id,
      courseNameSnapshot:course.name,
      courseColorSnapshot:course.color,
      professorSnapshot:professor||'',
      kind,
      dueAt:due,
      updatedAt:now()
    };
  }else{
    taskData={
      title,
      personal:true,
      courseId:null,
      courseNameSnapshot:'',
      courseColorSnapshot:'',
      professorSnapshot:'',
      kind:'personal',
      dueAt:due,
      updatedAt:now()
    };
  }

  if(task){
    Object.assign(task,taskData);
  }else{
    task={
      id:uid('task'),
      ...taskData,
      completed:false,
      createdAt:now(),
      notes:[],
      docs:[]
    };
    state.tasks.push(task);
  }

  await dbPut(TASK_STORE,task);
  hideModal('taskModal');
  state.selectedTaskId=task.id;
  renderTaskList();
  renderDetail();

  if(window.matchMedia('(max-width:900px)').matches){
    els.detailPane.classList.add('mobile-open');
  }
});
els.deleteTaskBtn.addEventListener('click',async()=>{
  const task=taskById(state.selectedTaskId);if(!task)return;if(!confirm(`¿Eliminar la tarea “${task.title}”? Esta acción no se puede deshacer.`))return;
  for(const doc of(task.docs||[])){
    if(doc.type==='file'&&doc.storagePath){
      window.KaoruTaskCloud?.queueStorageDelete?.(doc.storagePath);
    }
    if(doc.type==='file'&&doc.fileId){
      await dbDelete(FILE_STORE,doc.fileId).catch(()=>{});
    }
  }

  await cleanupTaskNoteImages(task);

  await dbDelete(TASK_STORE,task.id);state.tasks=state.tasks.filter(t=>t.id!==task.id);state.selectedTaskId=null;renderTaskList();renderDetail();closeMobileDetail();
});

function openSettings(startCourseForm=false){renderCourseSettings();syncNotificationUI();showModal('settingsModal');if(startCourseForm)setTimeout(()=>startNewCourse(),60);}
els.settingsBtn.addEventListener('click',()=>openSettings(false));els.sideAddCourseBtn.addEventListener('click',()=>openSettings(true));els.newCourseInlineBtn.addEventListener('click',startNewCourse);els.cancelCourseBtn.addEventListener('click',()=>els.courseForm.classList.add('hidden'));
function resetCourseForm(){els.courseIdInput.value='';els.courseNameInput.value='';els.courseColorInput.value=COURSE_COLORS[state.courses.length%COURSE_COLORS.length];els.theoryProfessorInput.value='';els.hasLabInput.checked=true;els.sameProfessorInput.checked=false;els.labProfessorInput.value='';els.courseNotesInput.value='';syncLabFields();}
function startNewCourse(){resetCourseForm();els.courseForm.classList.remove('hidden');els.courseNameInput.focus();}
function editCourse(id){const c=courseById(id);if(!c)return;els.courseIdInput.value=c.id;els.courseNameInput.value=c.name;els.courseColorInput.value=c.color||'#7C3AED';els.theoryProfessorInput.value=c.theoryProfessor||'';els.hasLabInput.checked=!!c.hasLab;els.sameProfessorInput.checked=!!c.sameProfessor;els.labProfessorInput.value=c.sameProfessor?(c.theoryProfessor||''):(c.labProfessor||'');els.courseNotesInput.value=c.generalNotes||'';syncLabFields();els.courseForm.classList.remove('hidden');els.courseNameInput.focus();}
function syncLabFields(){els.labProfessorGroup.classList.toggle('hidden',!els.hasLabInput.checked);els.labProfessorInput.disabled=!els.hasLabInput.checked||els.sameProfessorInput.checked;if(els.sameProfessorInput.checked)els.labProfessorInput.value=els.theoryProfessorInput.value;}
els.hasLabInput.addEventListener('change',syncLabFields);els.sameProfessorInput.addEventListener('change',syncLabFields);els.theoryProfessorInput.addEventListener('input',()=>{if(els.sameProfessorInput.checked)els.labProfessorInput.value=els.theoryProfessorInput.value;});
els.courseForm.addEventListener('submit',async e=>{
  e.preventDefault();const id=els.courseIdInput.value||uid('course');let c=courseById(id);const theory=els.theoryProfessorInput.value.trim();const same=els.hasLabInput.checked&&els.sameProfessorInput.checked;const data={id,name:els.courseNameInput.value.trim(),color:els.courseColorInput.value||'#7C3AED',hasLab:!!els.hasLabInput.checked,theoryProfessor:theory,sameProfessor:same,labProfessor:els.hasLabInput.checked?(same?theory:els.labProfessorInput.value.trim()):'',generalNotes:els.courseNotesInput.value.trim(),updatedAt:now()};if(!data.name)return;
  if(c)Object.assign(c,data);else{c={...data,createdAt:now()};state.courses.push(c);}await dbPut(COURSE_STORE,c);els.courseForm.classList.add('hidden');renderCourseSettings();renderTaskList();renderDetail();
});
function renderCourseSettings(){
  els.courseSettingsList.innerHTML='';if(!state.courses.length){els.courseSettingsList.innerHTML='<div class="notes-empty">Todavía no hay cursos. Agrega el primero para empezar a organizar tus tareas.</div>';return;}
  state.courses.forEach(c=>{const row=document.createElement('div');row.className='course-setting-row';row.style.setProperty('--course-color',c.color);const labText=c.hasLab?` · Lab: ${c.sameProfessor?'mismo docente':(c.labProfessor||'sin registrar')}`:' · Sin laboratorio';const noteText=(c.generalNotes||'').trim();row.innerHTML=`<span class="course-dot"></span><div class="course-setting-copy"><strong>${esc(c.name)}</strong><small>Teoría: ${esc(c.theoryProfessor||'sin registrar')}${esc(labText)}</small>${noteText?`<p class="course-note-preview">${esc(noteText)}</p>`:''}</div><div class="course-setting-actions"><button type="button" class="edit-course">Editar</button><button type="button" class="delete-course">Eliminar</button></div>`;row.querySelector('.edit-course').addEventListener('click',()=>editCourse(c.id));row.querySelector('.delete-course').addEventListener('click',()=>deleteCourse(c.id));els.courseSettingsList.appendChild(row);});
}
async function deleteCourse(id){
  const c=courseById(id);if(!c)return;const related=state.tasks.filter(t=>t.courseId===id);const extra=related.length?`\n\n${related.length} tarea(s) conservarán el nombre del curso y docente como referencia, pero quedarán fuera de la configuración del curso.`:'';const notesExtra=(c.generalNotes||'').trim()?'\n\nTambién se eliminarán las notas generales guardadas de este curso.':'';if(!confirm(`¿Estás segura de eliminar el curso “${c.name}”?${extra}${notesExtra}`))return;
  for(const t of related){const professor=t.kind==='lab'?(c.labProfessor||c.theoryProfessor):(c.theoryProfessor||'');t.courseNameSnapshot=c.name;t.courseColorSnapshot=c.color;t.professorSnapshot=professor||'';t.courseId=null;t.personal=false;t.updatedAt=now();await dbPut(TASK_STORE,t);}await dbDelete(COURSE_STORE,id);state.courses=state.courses.filter(x=>x.id!==id);if(state.courseFilter===id)state.courseFilter='all';renderCourseSettings();renderTaskList();renderDetail();
}

function renderDocs(task){
  els.taskDocs.innerHTML='';const docs=task.docs||[];if(!docs.length){els.taskDocs.innerHTML='<span class="docs-empty">Sin documentos todavía. Agrega enlaces o archivos con ＋.</span>';return;}
  docs.forEach(doc=>{const chip=document.createElement('div');chip.className='doc-chip';const icon=document.createElement('span');icon.textContent=doc.type==='file'?(doc.storagePath?'☁':'▧'):'↗';let open;if(doc.type==='link'){open=document.createElement('a');open.href=doc.url;open.target='_blank';open.rel='noopener noreferrer';open.textContent=doc.label||doc.url;}else{open=document.createElement('button');open.type='button';open.className='doc-open';open.textContent=doc.name||'Archivo';open.title=doc.storagePath?'Disponible en Kaoru Cloud':'Guardado en este dispositivo; se subirá automáticamente';open.addEventListener('click',()=>openStoredFile(doc));}const rm=document.createElement('button');rm.type='button';rm.className='doc-remove';rm.textContent='×';rm.title='Quitar';rm.addEventListener('click',()=>removeDoc(task.id,doc.id));chip.append(icon,open,rm);els.taskDocs.appendChild(chip);});
}
els.addLinkBtn.addEventListener('click',()=>{els.linkForm.classList.toggle('hidden');if(!els.linkForm.classList.contains('hidden'))els.linkLabel.focus();});els.cancelLinkBtn.addEventListener('click',()=>els.linkForm.classList.add('hidden'));
els.linkForm.addEventListener('submit',async e=>{
  e.preventDefault();const task=taskById(state.selectedTaskId);if(!task)return;let url=els.linkUrl.value.trim();try{const parsed=new URL(url);if(!/^https?:$/.test(parsed.protocol))throw new Error();url=parsed.href;}catch(_){alert('Ingresa un enlace válido que empiece con http:// o https://');return;}const label=els.linkLabel.value.trim()||url;task.docs=task.docs||[];task.docs.push({id:uid('doc'),type:'link',label,url,createdAt:now()});task.updatedAt=now();await dbPut(TASK_STORE,task);els.linkLabel.value='';els.linkUrl.value='';els.linkForm.classList.add('hidden');renderDocs(task);
});
els.addFileBtn.addEventListener('click',()=>els.taskFileInput.click());els.taskFileInput.addEventListener('change',async()=>{
  const task=taskById(state.selectedTaskId);if(!task||!els.taskFileInput.files?.length)return;task.docs=task.docs||[];
  for(const file of Array.from(els.taskFileInput.files)){
    const fileId=uid('file');
    await dbPut(FILE_STORE,{
      id:fileId,
      name:file.name,
      type:file.type||'application/octet-stream',
      size:file.size,
      blob:file,
      createdAt:now()
    });
    task.docs.push({
      id:uid('doc'),
      type:'file',
      fileId,
      name:file.name,
      mime:file.type||'',
      size:file.size,
      createdAt:now()
    });
  }
  task.updatedAt=now();
  await dbPut(TASK_STORE,task);
  els.taskFileInput.value='';
  renderDocs(task);
  syncTaskFilesToCloud().catch(err=>console.warn('Kaoru Storage upload',err));
});

async function syncTaskFilesToCloud(){
  if(
    !navigator.onLine||
    !window.KaoruTaskCloud?.currentUser?.()||
    !window.KaoruTaskCloud?.uploadTaskFile
  ){
    return{uploaded:0,pending:0};
  }

  /*
    Antes de subir cualquier cosa migramos imagenes antiguas incrustadas
    como Base64. Se convierten en Blob dentro de IndexedDB y la nota pasa
    a guardar solo un identificador liviano.
  */
  await migrateLegacyNoteImages();

  let uploaded=0;
  let pending=0;

  for(const task of state.tasks){
    let changed=false;

    for(const doc of(task.docs||[])){
      if(doc.type!=='file'||doc.storagePath||!doc.fileId)continue;

      const rec=await dbGet(FILE_STORE,doc.fileId).catch(()=>null);
      if(!rec?.blob)continue;

      try{
        const cloudFile=await window.KaoruTaskCloud.uploadTaskFile(
          task.id,
          doc.fileId,
          rec
        );

        doc.storagePath=cloudFile.path;
        doc.mime=doc.mime||cloudFile.mime||rec.type||'';
        doc.size=Number(doc.size||cloudFile.size||rec.size||0);
        doc.cloudStoredAt=now();
        changed=true;
        uploaded++;
      }catch(err){
        pending++;
        console.warn('No se pudo subir un adjunto todavía',doc.name,err);
      }
    }

    if(changed){
      task.updatedAt=now();
      await dbPut(TASK_STORE,task);
      if(state.selectedTaskId===task.id)renderDocs(task);
    }
  }

  const noteImages=await syncNoteImagesToCloud();
  uploaded+=Number(noteImages.uploaded||0);
  pending+=Number(noteImages.pending||0);

  return{uploaded,pending};
}

async function openStoredFile(doc){
  if(!doc?.fileId)return;

  let rec=await dbGet(FILE_STORE,doc.fileId).catch(()=>null);

  if(!rec?.blob&&doc.storagePath){
    if(!navigator.onLine){
      alert('Este archivo está en Kaoru Cloud, pero todavía no se descargó en este dispositivo. Conéctate a Internet para abrirlo por primera vez.');
      return;
    }

    try{
      const blob=await window.KaoruTaskCloud.downloadTaskFile(doc.storagePath);
      rec={
        id:doc.fileId,
        name:doc.name||'Archivo',
        type:doc.mime||blob.type||'application/octet-stream',
        size:Number(doc.size||blob.size||0),
        blob,
        createdAt:doc.createdAt||now(),
        cloudPath:doc.storagePath,
        cachedAt:now()
      };
      await dbPut(FILE_STORE,rec);
    }catch(err){
      alert(`No se pudo descargar el archivo desde Kaoru Cloud.\n\n${err?.message||err}`);
      return;
    }
  }

  if(!rec?.blob){
    alert('Este archivo todavía no está disponible en este dispositivo ni tiene una copia accesible en Kaoru Cloud.');
    return;
  }

  const url=URL.createObjectURL(rec.blob);
  const opened=window.open(url,'_blank','noopener');
  if(!opened){
    const link=document.createElement('a');
    link.href=url;
    link.download=rec.name||doc.name||'archivo';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  setTimeout(()=>URL.revokeObjectURL(url),60000);
}

async function removeDoc(taskId,docId){
  const task=taskById(taskId);if(!task)return;
  const doc=(task.docs||[]).find(d=>d.id===docId);
  task.docs=(task.docs||[]).filter(d=>d.id!==docId);

  if(doc?.type==='file'&&doc.storagePath){
    window.KaoruTaskCloud?.queueStorageDelete?.(doc.storagePath);
  }
  if(doc?.type==='file'&&doc.fileId){
    await dbDelete(FILE_STORE,doc.fileId).catch(()=>{});
  }

  task.updatedAt=now();
  await dbPut(TASK_STORE,task);
  renderDocs(task);
}

const noteSaveTimers=new Map();

function noteImageExtension(mime){
  const map={
    'image/jpeg':'jpg',
    'image/png':'png',
    'image/gif':'gif',
    'image/webp':'webp',
    'image/svg+xml':'svg',
    'image/avif':'avif'
  };
  return map[String(mime||'').toLowerCase()]||'img';
}

function dataUrlToBlob(dataUrl){
  const match=String(dataUrl||'').match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if(!match)throw new Error('Imagen Base64 no valida.');

  const mime=match[1]||'application/octet-stream';
  const isBase64=!!match[2];
  const payload=match[3]||'';
  const binary=isBase64
    ?atob(payload)
    :decodeURIComponent(payload);

  const bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);

  return new Blob([bytes],{type:mime});
}

function serializeNoteHtml(editor){
  const cloneEditor=editor.cloneNode(true);

  cloneEditor
    .querySelectorAll('img[data-kaoru-image-id]')
    .forEach(img=>{
      /*
        El src es solo de presentacion local. Puede ser blob: y deja de ser
        valido al cerrar la pagina. Persistimos únicamente data-kaoru-image-id.
      */
      img.removeAttribute('src');
      img.removeAttribute('data-kaoru-runtime');
    });

  return cloneEditor.innerHTML;
}

async function migrateLegacyNoteImages(){
  let changedTasks=0;

  for(const task of state.tasks){
    let taskChanged=false;

    for(const note of(task.notes||[])){
      note.images=Array.isArray(note.images)?note.images:[];
      if(typeof note.html!=='string'||!note.html.includes('data:image/'))continue;

      const template=document.createElement('template');
      template.innerHTML=note.html;

      const legacyImages=[
        ...template.content.querySelectorAll(
          'img:not([data-kaoru-image-id])'
        )
      ];

      for(const img of legacyImages){
        const src=img.getAttribute('src')||'';
        if(!/^data:image\//i.test(src))continue;

        try{
          const blob=dataUrlToBlob(src);
          const imageId=uid('noteimg');
          const ext=noteImageExtension(blob.type);
          const name=`imagen-nota-${imageId}.${ext}`;

          await dbPut(FILE_STORE,{
            id:imageId,
            kind:'note-image',
            taskId:task.id,
            noteId:note.id,
            name,
            type:blob.type||'image/png',
            size:blob.size,
            blob,
            createdAt:now()
          });

          note.images.push({
            id:imageId,
            fileId:imageId,
            name,
            mime:blob.type||'image/png',
            size:blob.size,
            createdAt:now()
          });

          img.dataset.kaoruImageId=imageId;
          img.alt=img.alt||'Imagen de nota';
          img.removeAttribute('src');

          taskChanged=true;
        }catch(err){
          console.warn('No se pudo migrar una imagen antigua de una nota',err);
        }
      }

      if(taskChanged){
        note.html=template.innerHTML;
        note.updatedAt=now();
      }
    }

    if(taskChanged){
      task.updatedAt=now();
      await dbPut(TASK_STORE,task);
      changedTasks++;
    }
  }

  return changedTasks;
}

async function hydrateNoteImages(task,note,editor){
  note.images=Array.isArray(note.images)?note.images:[];

  const imgs=[
    ...editor.querySelectorAll('img[data-kaoru-image-id]')
  ];

  for(const img of imgs){
    const imageId=img.dataset.kaoruImageId;
    const meta=note.images.find(item=>item.id===imageId);

    if(!meta){
      img.alt='Imagen de nota no disponible';
      continue;
    }

    let rec=await dbGet(FILE_STORE,meta.fileId||meta.id).catch(()=>null);

    if(
      !rec?.blob&&
      meta.storagePath&&
      navigator.onLine&&
      window.KaoruTaskCloud?.currentUser?.()&&
      window.KaoruTaskCloud?.downloadTaskFile
    ){
      try{
        const blob=await window.KaoruTaskCloud.downloadTaskFile(
          meta.storagePath
        );

        rec={
          id:meta.fileId||meta.id,
          kind:'note-image',
          taskId:task.id,
          noteId:note.id,
          name:meta.name||'imagen',
          type:meta.mime||blob.type||'image/png',
          size:Number(meta.size||blob.size||0),
          blob,
          cloudPath:meta.storagePath,
          createdAt:meta.createdAt||now(),
          cachedAt:now()
        };

        await dbPut(FILE_STORE,rec);
      }catch(err){
        console.warn('No se pudo descargar una imagen de nota',err);
      }
    }

    if(rec?.blob){
      const url=URL.createObjectURL(rec.blob);
      img.dataset.kaoruRuntime='1';
      img.src=url;
      img.addEventListener(
        'load',
        ()=>URL.revokeObjectURL(url),
        {once:true}
      );
    }else{
      img.removeAttribute('src');
      img.alt=meta.storagePath
        ?'Imagen disponible al conectarte a Internet'
        :'Imagen guardada en el dispositivo original';
    }
  }
}

async function syncNoteImagesToCloud(){
  if(
    !navigator.onLine||
    !window.KaoruTaskCloud?.currentUser?.()||
    !window.KaoruTaskCloud?.uploadNoteImage
  ){
    return{uploaded:0,pending:0};
  }

  let uploaded=0;
  let pending=0;

  for(const task of state.tasks){
    let taskChanged=false;

    for(const note of(task.notes||[])){
      note.images=Array.isArray(note.images)?note.images:[];

      for(const meta of note.images){
        if(meta.storagePath)continue;

        const rec=await dbGet(
          FILE_STORE,
          meta.fileId||meta.id
        ).catch(()=>null);

        if(!rec?.blob){
          pending++;
          continue;
        }

        try{
          const cloudImage=await window.KaoruTaskCloud.uploadNoteImage(
            task.id,
            note.id,
            meta.id,
            rec
          );

          meta.fileId=meta.fileId||meta.id;
          meta.storagePath=cloudImage.path;
          meta.name=meta.name||cloudImage.name||rec.name||'imagen';
          meta.mime=meta.mime||cloudImage.mime||rec.type||'image/png';
          meta.size=Number(meta.size||cloudImage.size||rec.size||0);
          meta.cloudStoredAt=now();

          note.updatedAt=now();
          taskChanged=true;
          uploaded++;
        }catch(err){
          pending++;
          console.warn('No se pudo subir una imagen de nota todavía',err);
        }
      }
    }

    if(taskChanged){
      task.updatedAt=now();
      await dbPut(TASK_STORE,task);
      if(state.selectedTaskId===task.id)renderNoteThread(task);
    }
  }

  return{uploaded,pending};
}

async function cleanupNoteImages(note){
  for(const meta of(note?.images||[])){
    if(meta.storagePath){
      window.KaoruTaskCloud?.queueStorageDelete?.(meta.storagePath);
    }
    await dbDelete(FILE_STORE,meta.fileId||meta.id).catch(()=>{});
  }
}

async function cleanupTaskNoteImages(task){
  for(const note of(task?.notes||[])){
    await cleanupNoteImages(note);
  }
}

async function cleanupRemovedNoteImages(note,editor){
  note.images=Array.isArray(note.images)?note.images:[];

  const activeIds=new Set(
    [...editor.querySelectorAll('img[data-kaoru-image-id]')]
      .map(img=>img.dataset.kaoruImageId)
      .filter(Boolean)
  );

  const removed=note.images.filter(meta=>!activeIds.has(meta.id));

  for(const meta of removed){
    if(meta.storagePath){
      window.KaoruTaskCloud?.queueStorageDelete?.(meta.storagePath);
    }
    await dbDelete(FILE_STORE,meta.fileId||meta.id).catch(()=>{});
  }

  if(removed.length){
    note.images=note.images.filter(meta=>activeIds.has(meta.id));
  }
}

function renderNoteThread(task){
  els.noteThread.innerHTML='';

  const notes=task.notes||[];

  if(!notes.length){
    els.noteThread.innerHTML='<div class="notes-empty">Tu hilo está vacío. Pulsa “＋ Nueva nota” para ir registrando avances, ideas o información.</div>';
    return;
  }

  notes.forEach(note=>{
    note.images=Array.isArray(note.images)?note.images:[];

    const card=document.createElement('article');
    card.className='note-card';
    card.dataset.bg=note.bg||'default';
    card.dataset.noteId=note.id;

    const head=document.createElement('div');
    head.className='note-headline';
    head.innerHTML=`<span class="note-time">${esc(noteDate(note.createdAt))}</span><span class="note-spacer"></span>`;

    const bg=document.createElement('select');
    bg.className='note-bg-select';

    [
      ['default','Normal'],
      ['lavender','Lavanda'],
      ['rose','Rosa'],
      ['blue','Azul'],
      ['mint','Menta'],
      ['sand','Crema']
    ].forEach(([v,l])=>{
      const o=document.createElement('option');
      o.value=v;
      o.textContent=l;
      if((note.bg||'default')===v)o.selected=true;
      bg.appendChild(o);
    });

    bg.addEventListener('change',async()=>{
      note.bg=bg.value;
      note.updatedAt=now();
      card.dataset.bg=note.bg;
      await dbPut(TASK_STORE,task);
    });

    const del=document.createElement('button');
    del.type='button';
    del.className='note-delete';
    del.textContent='×';
    del.title='Eliminar nota';
    del.addEventListener('click',()=>deleteNote(task.id,note.id));

    head.append(bg,del);

    const editor=document.createElement('div');
    editor.className='note-editor';
    editor.contentEditable='true';
    editor.dataset.noteId=note.id;
    editor.innerHTML=note.html||'';

    editor.addEventListener('focus',()=>{
      state.activeEditor=editor;
      saveSelection();
    });
    editor.addEventListener('keyup',saveSelection);
    editor.addEventListener('mouseup',saveSelection);
    editor.addEventListener(
      'input',
      ()=>scheduleNoteSave(task,note,editor)
    );
    editor.addEventListener(
      'blur',
      ()=>saveNoteNow(task,note,editor)
    );

    card.append(head,editor);
    els.noteThread.appendChild(card);

    hydrateNoteImages(task,note,editor).catch(err=>{
      console.warn('Kaoru note image hydrate',err);
    });
  });
}

els.addNoteBtn.addEventListener('click',async()=>{
  const task=taskById(state.selectedTaskId);
  if(!task)return;

  task.notes=task.notes||[];

  const note={
    id:uid('note'),
    html:'',
    bg:'default',
    images:[],
    createdAt:now(),
    updatedAt:now()
  };

  task.notes.push(note);
  task.updatedAt=now();

  await dbPut(TASK_STORE,task);
  renderNoteThread(task);

  setTimeout(()=>{
    const editor=els.noteThread.querySelector(
      `[data-note-id="${note.id}"].note-editor`
    );
    editor?.focus();
    editor?.scrollIntoView({behavior:'smooth',block:'center'});
  },30);
});

function scheduleNoteSave(task,note,editor){
  clearTimeout(noteSaveTimers.get(note.id));
  noteSaveTimers.set(
    note.id,
    setTimeout(()=>saveNoteNow(task,note,editor),320)
  );
}

async function saveNoteNow(task,note,editor){
  clearTimeout(noteSaveTimers.get(note.id));
  noteSaveTimers.delete(note.id);

  await cleanupRemovedNoteImages(note,editor);

  note.html=serializeNoteHtml(editor);
  note.updatedAt=now();
  task.updatedAt=now();

  await dbPut(TASK_STORE,task);
}

async function deleteNote(taskId,noteId){
  const task=taskById(taskId);
  if(!task)return;
  if(!confirm('¿Eliminar esta nota del hilo?'))return;

  const note=(task.notes||[]).find(item=>item.id===noteId);
  if(note)await cleanupNoteImages(note);

  task.notes=(task.notes||[]).filter(n=>n.id!==noteId);
  task.updatedAt=now();

  await dbPut(TASK_STORE,task);
  renderNoteThread(task);
}

function saveSelection(){
  const sel=window.getSelection();
  if(!sel||!sel.rangeCount||!state.activeEditor)return;

  const range=sel.getRangeAt(0);
  if(state.activeEditor.contains(range.commonAncestorContainer)){
    state.savedRange=range.cloneRange();
  }
}

function restoreSelection(){
  if(!state.savedRange||!state.activeEditor)return false;
  const sel=window.getSelection();
  sel.removeAllRanges();
  sel.addRange(state.savedRange);
  state.activeEditor.focus();
  return true;
}

function saveActiveEditor(){
  const task=taskById(state.selectedTaskId);
  if(!task||!state.activeEditor)return;

  const note=(task.notes||[]).find(
    n=>n.id===state.activeEditor.dataset.noteId
  );

  if(note)saveNoteNow(task,note,state.activeEditor);
}

function execRich(cmd,value=null){
  if(!state.activeEditor)return;
  restoreSelection();
  document.execCommand(cmd,false,value);
  saveSelection();
  saveActiveEditor();
}

els.richToolbar
  .querySelectorAll('button[data-cmd]')
  .forEach(btn=>{
    btn.addEventListener('mousedown',e=>e.preventDefault());
    btn.addEventListener('click',()=>execRich(btn.dataset.cmd));
  });

els.blockFormat.addEventListener(
  'change',
  ()=>execRich('formatBlock',`<${els.blockFormat.value}>`)
);

els.fontSizeSelect.addEventListener(
  'change',
  ()=>execRich('fontSize',els.fontSizeSelect.value)
);

els.fontSelect.addEventListener('change',()=>{
  if(els.fontSelect.value)execRich('fontName',els.fontSelect.value);
});

els.textColorInput.addEventListener(
  'input',
  ()=>execRich('foreColor',els.textColorInput.value)
);

els.highlightColorInput.addEventListener('input',()=>{
  if(!state.activeEditor)return;
  restoreSelection();

  try{
    document.execCommand(
      'hiliteColor',
      false,
      els.highlightColorInput.value
    );
  }catch(_){
    document.execCommand(
      'backColor',
      false,
      els.highlightColorInput.value
    );
  }

  saveSelection();
  saveActiveEditor();
});

els.insertNoteImageBtn.addEventListener(
  'mousedown',
  e=>e.preventDefault()
);

els.insertNoteImageBtn.addEventListener('click',()=>{
  if(!state.activeEditor){
    alert('Primero toca dentro de una nota.');
    return;
  }

  saveSelection();
  els.noteImageInput.click();
});

els.noteImageInput.addEventListener('change',async()=>{
  const file=els.noteImageInput.files?.[0];
  const editor=state.activeEditor;
  const task=taskById(state.selectedTaskId);

  els.noteImageInput.value='';

  if(!file||!editor||!task)return;

  if(!String(file.type||'').startsWith('image/')){
    alert('Selecciona un archivo de imagen.');
    return;
  }

  const note=(task.notes||[]).find(
    item=>item.id===editor.dataset.noteId
  );

  if(!note)return;

  note.images=Array.isArray(note.images)?note.images:[];

  const imageId=uid('noteimg');
  const ext=noteImageExtension(file.type);
  const name=file.name||`imagen-nota-${imageId}.${ext}`;

  await dbPut(FILE_STORE,{
    id:imageId,
    kind:'note-image',
    taskId:task.id,
    noteId:note.id,
    name,
    type:file.type||'image/png',
    size:file.size,
    blob:file,
    createdAt:now()
  });

  note.images.push({
    id:imageId,
    fileId:imageId,
    name,
    mime:file.type||'image/png',
    size:file.size,
    createdAt:now()
  });

  restoreSelection();

  const img=document.createElement('img');
  img.dataset.kaoruImageId=imageId;
  img.alt=name;
  img.style.maxWidth='100%';
  img.style.height='auto';

  const url=URL.createObjectURL(file);
  img.dataset.kaoruRuntime='1';
  img.src=url;
  img.addEventListener(
    'load',
    ()=>URL.revokeObjectURL(url),
    {once:true}
  );

  const sel=window.getSelection();

  if(sel&&sel.rangeCount&&editor.contains(sel.getRangeAt(0).commonAncestorContainer)){
    const range=sel.getRangeAt(0);
    range.deleteContents();
    range.insertNode(img);
    range.setStartAfter(img);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    state.savedRange=range.cloneRange();
  }else{
    editor.appendChild(img);
  }

  await saveNoteNow(task,note,editor);

  syncTaskFilesToCloud()
    .then(()=>window.KaoruTaskCloud?.flush?.())
    .catch(err=>console.warn('Kaoru note image sync',err));
});

document.addEventListener('selectionchange',()=>{
  const sel=window.getSelection();
  if(!sel||!sel.rangeCount)return;

  const node=sel.anchorNode;
  const editor=node&&
    (node.nodeType===1?node:node.parentElement)
      ?.closest?.('.note-editor');

  if(editor){
    state.activeEditor=editor;
    saveSelection();
  }
});

/* Kaoru note image viewer v1 */
let noteViewerUrl=null;
let noteViewerBlob=null;
let noteViewerMeta=null;
let noteViewerZoom=1;
let noteViewerX=0;
let noteViewerY=0;
let noteViewerDragging=false;
let noteViewerDragStart=null;
let noteViewerPinchDistance=0;
let noteViewerPinchZoom=1;
const noteViewerPointers=new Map();

function noteViewerEls(){
  return{
    modal:$('noteImageViewerModal'),
    image:$('noteImageViewerImage'),
    stage:$('noteImageViewerStage'),
    loading:$('noteImageViewerLoading'),
    zoomValue:$('noteImageZoomValue'),
    name:$('noteImageViewerName'),
    status:$('noteImageViewerStatus'),
    zoomIn:$('noteImageZoomIn'),
    zoomOut:$('noteImageZoomOut'),
    reset:$('noteImageZoomReset'),
    download:$('noteImageDownload'),
    openOriginal:$('noteImageOpenOriginal'),
    close:$('noteImageViewerClose')
  };
}

function noteViewerClamp(value,min,max){
  return Math.min(max,Math.max(min,value));
}

function noteViewerApplyTransform(){
  const view=noteViewerEls();
  if(!view.image||!view.stage)return;

  view.image.style.transform=
    `translate3d(${noteViewerX}px,${noteViewerY}px,0) scale(${noteViewerZoom})`;

  view.zoomValue.textContent=`${Math.round(noteViewerZoom*100)}%`;
  view.stage.classList.toggle('is-zoomed',noteViewerZoom>1.01);
}

function noteViewerSetZoom(next,resetPan=false){
  const old=noteViewerZoom;
  noteViewerZoom=noteViewerClamp(Number(next)||1,.25,8);

  if(resetPan||noteViewerZoom<=1){
    noteViewerX=0;
    noteViewerY=0;
  }else if(old>0){
    const ratio=noteViewerZoom/old;
    noteViewerX*=ratio;
    noteViewerY*=ratio;
  }

  noteViewerApplyTransform();
}

function noteViewerReset(){
  noteViewerZoom=1;
  noteViewerX=0;
  noteViewerY=0;
  noteViewerPointers.clear();
  noteViewerPinchDistance=0;
  noteViewerPinchZoom=1;
  noteViewerApplyTransform();
}

async function getNoteImageRecord(task,note,meta){
  const fileId=meta.fileId||meta.id;
  let rec=await dbGet(FILE_STORE,fileId).catch(()=>null);

  if(rec?.blob)return rec;

  if(!meta.storagePath){
    throw new Error('Esta imagen no tiene una copia disponible en Kaoru Cloud.');
  }

  if(!navigator.onLine){
    throw new Error('Esta imagen todavía no fue descargada en este dispositivo. Conéctate a Internet para abrirla por primera vez.');
  }

  if(!window.KaoruTaskCloud?.downloadTaskFile){
    throw new Error('Kaoru Cloud no está disponible en este momento.');
  }

  const blob=await window.KaoruTaskCloud.downloadTaskFile(meta.storagePath);

  rec={
    id:fileId,
    kind:'note-image',
    taskId:task.id,
    noteId:note.id,
    name:meta.name||'imagen',
    type:meta.mime||blob.type||'image/png',
    size:Number(meta.size||blob.size||0),
    blob,
    cloudPath:meta.storagePath,
    createdAt:meta.createdAt||now(),
    cachedAt:now()
  };

  await dbPut(FILE_STORE,rec);
  return rec;
}

function releaseNoteViewerUrl(){
  if(noteViewerUrl){
    URL.revokeObjectURL(noteViewerUrl);
    noteViewerUrl=null;
  }
}

function closeNoteImageViewer(){
  const view=noteViewerEls();

  releaseNoteViewerUrl();
  noteViewerBlob=null;
  noteViewerMeta=null;
  noteViewerDragging=false;
  noteViewerDragStart=null;
  noteViewerPointers.clear();

  if(view.image){
    view.image.removeAttribute('src');
    view.image.classList.add('hidden');
  }

  if(view.loading){
    view.loading.textContent='Preparando imagen…';
    view.loading.classList.remove('hidden');
  }

  hideModal('noteImageViewerModal');
}

async function openNoteImageViewer(imageEl){
  const imageId=imageEl?.dataset?.kaoruImageId;
  const card=imageEl?.closest?.('.note-card');
  const noteId=card?.dataset?.noteId;
  const task=taskById(state.selectedTaskId);

  if(!imageId||!noteId||!task)return;

  const note=(task.notes||[]).find(item=>item.id===noteId);
  const meta=(note?.images||[]).find(item=>item.id===imageId);

  if(!note||!meta){
    alert('No pude encontrar la información de esta imagen.');
    return;
  }

  const view=noteViewerEls();

  noteViewerReset();
  noteViewerMeta=meta;
  view.name.textContent=meta.name||'Imagen';
  view.status.textContent='Preparando imagen…';
  view.loading.textContent='Preparando imagen…';
  view.loading.classList.remove('hidden');
  view.image.classList.add('hidden');

  showModal('noteImageViewerModal');

  try{
    const rec=await getNoteImageRecord(task,note,meta);

    noteViewerBlob=rec.blob;

    releaseNoteViewerUrl();
    noteViewerUrl=URL.createObjectURL(rec.blob);

    view.image.src=noteViewerUrl;
    view.image.alt=meta.name||'Imagen ampliada';
    view.image.classList.remove('hidden');
    view.loading.classList.add('hidden');

    const size=Number(meta.size||rec.size||rec.blob.size||0);
    const sizeText=size
      ?size>=1048576
        ?`${(size/1048576).toFixed(1)} MB`
        :`${Math.max(1,Math.round(size/1024))} KB`
      :'';

    view.status.textContent=[
      sizeText,
      'Rueda o pellizca para zoom',
      'arrastra para moverte'
    ].filter(Boolean).join(' · ');
  }catch(err){
    console.warn('No se pudo abrir la imagen de la nota',err);
    view.loading.textContent=err?.message||'No se pudo abrir la imagen.';
    view.status.textContent='La imagen no está disponible en este dispositivo.';
  }
}

function downloadCurrentNoteImage(){
  if(!noteViewerBlob||!noteViewerUrl||!noteViewerMeta){
    alert('La imagen todavía no está disponible para descargar.');
    return;
  }

  const link=document.createElement('a');
  link.href=noteViewerUrl;
  link.download=noteViewerMeta.name||'imagen';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function openCurrentNoteImageOriginal(){
  if(!noteViewerBlob||!noteViewerUrl){
    alert('La imagen todavía no está disponible.');
    return;
  }

  const popup=window.open(noteViewerUrl,'_blank','noopener');

  if(!popup){
    alert('El navegador bloqueó la nueva pestaña. Puedes usar el botón Descargar.');
  }
}

function noteViewerPointerDistance(){
  const values=[...noteViewerPointers.values()];
  if(values.length<2)return 0;
  return Math.hypot(
    values[1].x-values[0].x,
    values[1].y-values[0].y
  );
}

function setupNoteImageViewer(){
  const view=noteViewerEls();
  if(!view.modal||!view.stage)return;

  els.noteThread.addEventListener('click',e=>{
    const img=e.target?.closest?.('img[data-kaoru-image-id]');
    if(!img||!els.noteThread.contains(img))return;

    e.preventDefault();
    e.stopPropagation();

    openNoteImageViewer(img).catch(err=>{
      console.warn('Kaoru note viewer',err);
    });
  });

  view.zoomIn.addEventListener(
    'click',
    ()=>noteViewerSetZoom(noteViewerZoom*1.25)
  );

  view.zoomOut.addEventListener(
    'click',
    ()=>noteViewerSetZoom(noteViewerZoom/1.25)
  );

  view.reset.addEventListener('click',noteViewerReset);
  view.download.addEventListener('click',downloadCurrentNoteImage);
  view.openOriginal.addEventListener('click',openCurrentNoteImageOriginal);
  view.close.addEventListener('click',closeNoteImageViewer);

  view.stage.addEventListener('wheel',e=>{
    if(!noteViewerBlob)return;
    e.preventDefault();

    const factor=e.deltaY<0?1.13:1/1.13;
    noteViewerSetZoom(noteViewerZoom*factor);
  },{passive:false});

  view.stage.addEventListener('dblclick',e=>{
    if(!noteViewerBlob)return;
    e.preventDefault();
    noteViewerSetZoom(noteViewerZoom>1.2?1:2.5,true);
  });

  view.stage.addEventListener('pointerdown',e=>{
    if(!noteViewerBlob)return;

    view.stage.setPointerCapture?.(e.pointerId);
    noteViewerPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});

    if(noteViewerPointers.size===1){
      noteViewerDragging=true;
      noteViewerDragStart={
        x:e.clientX,
        y:e.clientY,
        originX:noteViewerX,
        originY:noteViewerY
      };
      view.stage.classList.add('is-dragging');
    }

    if(noteViewerPointers.size===2){
      noteViewerPinchDistance=noteViewerPointerDistance();
      noteViewerPinchZoom=noteViewerZoom;
      noteViewerDragStart=null;
    }
  });

  view.stage.addEventListener('pointermove',e=>{
    if(!noteViewerPointers.has(e.pointerId))return;

    noteViewerPointers.set(e.pointerId,{x:e.clientX,y:e.clientY});

    if(noteViewerPointers.size>=2){
      const distance=noteViewerPointerDistance();

      if(noteViewerPinchDistance>0&&distance>0){
        noteViewerSetZoom(
          noteViewerPinchZoom*(distance/noteViewerPinchDistance)
        );
      }

      return;
    }

    if(
      noteViewerDragging&&
      noteViewerDragStart&&
      noteViewerZoom>1.01
    ){
      noteViewerX=
        noteViewerDragStart.originX+
        (e.clientX-noteViewerDragStart.x);

      noteViewerY=
        noteViewerDragStart.originY+
        (e.clientY-noteViewerDragStart.y);

      noteViewerApplyTransform();
    }
  });

  const endPointer=e=>{
    noteViewerPointers.delete(e.pointerId);

    if(noteViewerPointers.size<2){
      noteViewerPinchDistance=0;
      noteViewerPinchZoom=noteViewerZoom;
    }

    if(noteViewerPointers.size===1){
      const remaining=[...noteViewerPointers.values()][0];
      noteViewerDragStart={
        x:remaining.x,
        y:remaining.y,
        originX:noteViewerX,
        originY:noteViewerY
      };
    }else if(noteViewerPointers.size===0){
      noteViewerDragging=false;
      noteViewerDragStart=null;
      view.stage.classList.remove('is-dragging');
    }
  };

  view.stage.addEventListener('pointerup',endPointer);
  view.stage.addEventListener('pointercancel',endPointer);
  view.stage.addEventListener('lostpointercapture',endPointer);

  view.modal.addEventListener('mousedown',e=>{
    if(e.target===view.modal){
      setTimeout(closeNoteImageViewer,0);
    }
  });

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&noteViewerBlob){
      setTimeout(closeNoteImageViewer,0);
    }
  });
}

setupNoteImageViewer();
const loadedFontIds=new Set();
async function loadTaskFonts(){
  const base=[['system-ui','Sistema'],['Georgia','Georgia'],['"Times New Roman"','Times New Roman'],['Arial','Arial'],['Verdana','Verdana'],['"Courier New"','Courier New']];const old=els.fontSelect.value;els.fontSelect.innerHTML='<option value="">Tipografía</option>';base.forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;els.fontSelect.appendChild(o);});
  try{
    const db=await new Promise((resolve,reject)=>{const req=indexedDB.open(FONT_DB_NAME);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(FONT_STORE))req.result.createObjectStore(FONT_STORE,{keyPath:'id'});};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
    const records=await new Promise((resolve,reject)=>{const req=db.transaction(FONT_STORE,'readonly').objectStore(FONT_STORE).getAll();req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);});state.taskFonts=[];
    for(const rec of records){try{const css=`taskfont_${String(rec.id).replace(/[^a-zA-Z0-9_-]/g,'_')}`;if(!loadedFontIds.has(rec.id)){const face=new FontFace(css,rec.buffer);await face.load();document.fonts.add(face);loadedFontIds.add(rec.id);}state.taskFonts.push({id:rec.id,css,label:String(rec.fileName||'Fuente').replace(/\.[^.]+$/,'')});}catch(err){console.warn('No se pudo cargar una fuente de Text Studio',rec.fileName,err);}}
    state.taskFonts.sort((a,b)=>a.label.localeCompare(b.label,'es'));state.taskFonts.forEach(f=>{const o=document.createElement('option');o.value=f.css;o.textContent=f.label;els.fontSelect.appendChild(o);});if([...els.fontSelect.options].some(o=>o.value===old))els.fontSelect.value=old;
  }catch(err){console.warn('Biblioteca de fuentes de Text Studio no disponible todavía.',err);}
}
els.refreshFontsBtn.addEventListener('click',loadTaskFonts);window.addEventListener('focus',loadTaskFonts);document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadTaskFonts();});

let scheduleObjectUrl=null;
let scheduleHydrating=false;

async function loadSchedule(){
  state.schedule=await getSetting('schedulePhoto',null);
  renderSchedule();

  /*
    Si la metadata llego desde otro dispositivo pero el Blob aun no existe
    localmente, lo descargamos una sola vez y queda cacheado en IndexedDB
    para que el horario siga abriendo sin Internet despues.
  */
  if(
    state.schedule?.storagePath&&
    !state.schedule?.blob&&
    navigator.onLine&&
    window.KaoruTaskCloud?.currentUser?.()&&
    !scheduleHydrating
  ){
    await hydrateScheduleFromCloud();
  }
}

function renderSchedule(){
  if(scheduleObjectUrl){
    URL.revokeObjectURL(scheduleObjectUrl);
    scheduleObjectUrl=null;
  }

  const s=state.schedule;
  const hasBlob=!!s?.blob;

  els.scheduleEmpty.classList.toggle('hidden',hasBlob);
  els.scheduleViewer.classList.toggle('hidden',!hasBlob);

  if(hasBlob){
    scheduleObjectUrl=URL.createObjectURL(s.blob);
    els.scheduleImage.src=scheduleObjectUrl;
    els.scheduleZoom.value='100';
    els.scheduleZoomValue.textContent='100%';
    els.scheduleImage.style.width='100%';
  }
}

async function hydrateScheduleFromCloud(){
  if(
    scheduleHydrating||
    !state.schedule?.storagePath||
    state.schedule?.blob||
    !navigator.onLine||
    !window.KaoruTaskCloud?.downloadTaskFile
  )return false;

  scheduleHydrating=true;
  try{
    const blob=await window.KaoruTaskCloud.downloadTaskFile(
      state.schedule.storagePath
    );

    state.schedule={
      ...state.schedule,
      blob,
      type:state.schedule.type||blob.type||'application/octet-stream',
      size:Number(state.schedule.size||blob.size||0),
      cachedAt:now()
    };

    await setSetting('schedulePhoto',state.schedule);
    renderSchedule();
    return true;
  }catch(err){
    console.warn('No se pudo descargar el horario desde Kaoru Cloud',err);
    return false;
  }finally{
    scheduleHydrating=false;
  }
}

async function syncScheduleToCloud(){
  const schedule=state.schedule;

  if(
    !schedule?.blob||
    schedule?.storagePath||
    !navigator.onLine||
    !window.KaoruTaskCloud?.currentUser?.()||
    !window.KaoruTaskCloud?.uploadScheduleFile
  ){
    return{uploaded:0,pending:schedule?.blob&&!schedule?.storagePath?1:0};
  }

  try{
    const cloudFile=await window.KaoruTaskCloud.uploadScheduleFile({
      ...schedule,
      size:Number(schedule.size||schedule.blob.size||0)
    });

    const previousPath=schedule.previousStoragePath||null;

    state.schedule={
      ...schedule,
      id:'schedulePhoto',
      storagePath:cloudFile.path,
      size:cloudFile.size,
      type:schedule.type||cloudFile.mime||'application/octet-stream',
      cloudStoredAt:now()
    };

    delete state.schedule.previousStoragePath;

    await setSetting('schedulePhoto',state.schedule);

    window.KaoruTaskCloud.queueUpsert?.(
      'schedule',
      {
        id:'schedulePhoto',
        name:state.schedule.name||'horario',
        type:state.schedule.type||'application/octet-stream',
        size:Number(state.schedule.size||0),
        storagePath:state.schedule.storagePath,
        updatedAt:Number(state.schedule.updatedAt)||now(),
        cloudStoredAt:state.schedule.cloudStoredAt
      }
    );

    if(previousPath&&previousPath!==state.schedule.storagePath){
      window.KaoruTaskCloud.queueStorageDelete?.(previousPath);
    }

    renderSchedule();
    return{uploaded:1,pending:0};
  }catch(err){
    console.warn('No se pudo subir el horario todavía',err);
    return{uploaded:0,pending:1};
  }
}

async function saveScheduleFile(file){
  if(!file)return;

  const previousPath=state.schedule?.storagePath||null;

  state.schedule={
    id:'schedulePhoto',
    blob:file,
    name:file.name,
    type:file.type||'application/octet-stream',
    size:file.size,
    updatedAt:now(),
    previousStoragePath:previousPath
  };

  await setSetting('schedulePhoto',state.schedule);
  renderSchedule();

  syncScheduleToCloud()
    .then(()=>window.KaoruTaskCloud?.flush?.())
    .catch(err=>console.warn('Kaoru horario sync',err));
}

els.scheduleBtn.addEventListener('click',async()=>{
  await loadSchedule();
  showModal('scheduleModal');
});

els.scheduleInput.addEventListener('change',()=>{
  const f=els.scheduleInput.files?.[0];
  saveScheduleFile(f);
  els.scheduleInput.value='';
});

els.scheduleReplaceInput.addEventListener('change',()=>{
  const f=els.scheduleReplaceInput.files?.[0];
  saveScheduleFile(f);
  els.scheduleReplaceInput.value='';
});

els.scheduleZoom.addEventListener('input',()=>{
  const v=Number(els.scheduleZoom.value);
  els.scheduleZoomValue.textContent=`${v}%`;
  els.scheduleImage.style.width=`${v}%`;
});

els.deleteScheduleBtn.addEventListener('click',async()=>{
  if(!confirm('¿Eliminar la foto del horario de todos tus dispositivos?'))return;

  const previous=state.schedule;
  state.schedule=null;

  await dbDelete(SETTINGS_STORE,'schedulePhoto');

  if(previous?.storagePath){
    window.KaoruTaskCloud?.queueStorageDelete?.(previous.storagePath);
  }

  window.KaoruTaskCloud?.queueDelete?.(
    'schedule',
    'schedulePhoto',
    now()
  );

  renderSchedule();
});

function notificationPermissionText(){if(!('Notification'in window))return'Este navegador no ofrece notificaciones web.';if(Notification.permission==='granted')return'Avisos permitidos. Kaoru puede recordarte tareas mientras esté abierto.';if(Notification.permission==='denied')return'Los avisos están bloqueados en el navegador. Debes habilitarlos desde los permisos del sitio.';return'Todavía no has dado permiso para mostrar avisos.';}
function syncNotificationUI(){els.notificationStatus.textContent=notificationPermissionText();els.summaryIntervalSelect.value=String(state.notificationConfig.intervalHours||3);document.querySelectorAll('[data-threshold]').forEach(cb=>cb.checked=(state.notificationConfig.thresholds||[]).includes(Number(cb.dataset.threshold)));els.requestNotificationBtn.textContent=state.notificationConfig.enabled&&('Notification'in window)&&Notification.permission==='granted'?'🔔 Notificaciones activadas':'🔔 Activar notificaciones';}
async function saveNotificationConfig(){
  await setSetting('notificationConfig',state.notificationConfig);
  syncNotificationUI();
  window.KaoruTaskPush?.syncPreferences?.(state.notificationConfig)
    .catch(err=>console.warn('Kaoru Push preferences',err));
}
async function ensureServiceWorker(){if(!('serviceWorker'in navigator))return null;try{await navigator.serviceWorker.register('../../reader-sw.js?cache=34');return await navigator.serviceWorker.ready;}catch(err){console.warn('No se pudo registrar el service worker',err);return null;}}
async function showSystemNotification(title,body,tag,data={}){
  if(!('Notification'in window)||Notification.permission!=='granted')return;const options={body,tag,icon:'../../logo.png',badge:'../../logo.png',data:{...data,url:new URL('../../#tasks',location.href).href}};const reg=await ensureServiceWorker();try{if(reg?.showNotification){await reg.showNotification(title,options);return;}const n=new Notification(title,options);n.onclick=()=>{window.focus();};}catch(err){console.warn('No se pudo mostrar notificación',err);}
}
async function testSystemNotification(){
  if(!('Notification'in window)){
    alert('Este navegador no permite notificaciones web.');
    return;
  }
  if(Notification.permission!=='granted'){
    alert('Primero pulsa Activar notificaciones y permite los avisos del sitio.');
    return;
  }
  await showSystemNotification(
    'Prueba de Kaoru',
    'Las notificaciones del sistema estan funcionando.',
    `task-notification-test-${Date.now()}`
  );
}
async function requestNotifications(){
  if(!('Notification'in window)){
    alert('Este navegador no permite notificaciones web.');
    return;
  }
  const permission=await Notification.requestPermission();
  state.notificationConfig.enabled=permission==='granted';
  state.notificationConfig.lastSummaryAt=now();
  await saveNotificationConfig();

  if(permission==='granted'){
    try{
      await window.KaoruTaskPush?.subscribe?.();
      await window.KaoruTaskPush?.syncPreferences?.(state.notificationConfig);
    }catch(err){
      console.warn('Kaoru Web Push',err);
      if(els.notificationStatus){
        els.notificationStatus.textContent=
          'Avisos locales activos, pero el segundo plano no pudo activarse: '+(err?.message||err);
      }
    }
    await showSystemNotification(
      'Task Studio listo',
      'Los recordatorios estan activados.',
      'task-studio-enabled'
    );
  }
}
els.requestNotificationBtn.addEventListener('click',requestNotifications);els.testNotificationBtn?.addEventListener('click',testSystemNotification);els.notificationBtn.addEventListener('click',()=>{openSettings(false);setTimeout(()=>document.querySelector('.notification-settings')?.scrollIntoView({behavior:'smooth',block:'start'}),80);});els.summaryIntervalSelect.addEventListener('change',async()=>{state.notificationConfig.intervalHours=Number(els.summaryIntervalSelect.value)||3;await saveNotificationConfig();});document.querySelectorAll('[data-threshold]').forEach(cb=>cb.addEventListener('change',async()=>{state.notificationConfig.thresholds=[...document.querySelectorAll('[data-threshold]:checked')].map(x=>Number(x.dataset.threshold)).sort((a,b)=>b-a);await saveNotificationConfig();}));
function readNotificationLog(){try{return JSON.parse(localStorage.getItem('kaoru-task-notification-log')||'{}')||{};}catch(_){return{};}}
function writeNotificationLog(log){try{localStorage.setItem('kaoru-task-notification-log',JSON.stringify(log));}catch(_){}}
async function checkNotifications(){
  if(!state.notificationConfig.enabled||!('Notification'in window)||Notification.permission!=='granted')return;const pending=state.tasks.filter(t=>!t.completed);if(!pending.length)return;const log=readNotificationLog(),current=now();
  const interval=(state.notificationConfig.intervalHours||3)*3600000;if(current-(state.notificationConfig.lastSummaryAt||0)>=interval){const sorted=[...pending].sort((a,b)=>(parseDue(a.dueAt)||Infinity)-(parseDue(b.dueAt)||Infinity));const next=sorted[0];await showSystemNotification(`Tienes ${pending.length} tarea${pending.length===1?'':'s'} pendiente${pending.length===1?'':'s'}`,next?`Próxima: ${next.title} · ${relativeDue(next)}`:'Revisa Task Studio.','task-summary');state.notificationConfig.lastSummaryAt=current;await setSetting('notificationConfig',state.notificationConfig);}
  for(const task of pending){const due=dueDeadline(task.dueAt);if(!due)continue;const hours=(due-current)/3600000;if(hours<0){const key=`${task.id}:${task.dueAt}:overdue`;if(!log[key]){await showSystemNotification('Tarea atrasada',`${task.title} ya pasó de plazo.`,`task-${task.id}-overdue`,{taskId:task.id});log[key]=current;}continue;}for(const threshold of(state.notificationConfig.thresholds||[])){if(hours<=threshold){const key=`${task.id}:${task.dueAt}:${threshold}`;if(!log[key]){const ctx=taskContext(task);await showSystemNotification(`Entrega en menos de ${threshold} h`,`${task.title} · ${ctx.courseName}`,`task-${task.id}-${threshold}`,{taskId:task.id});log[key]=current;}break;}}}
  writeNotificationLog(log);
}

/* KAORU_NOTIFICATION_WAKE_CHECK_V1 */
window.addEventListener('focus',()=>checkNotifications().catch(()=>{}));
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden)checkNotifications().catch(()=>{});
});
els.mobileCourseBtn.addEventListener('click',()=>openSettings(false));els.closeCoursesBtn.addEventListener('click',closeMobileCourses);
function closeMobileCourses(){els.courseSidebar?.classList.remove('mobile-open');}
document.querySelector('.course-filter[data-course="all"]')?.addEventListener('click',()=>selectCourseFilter('all'));els.completedFilterBtn.addEventListener('click',()=>selectCourseFilter('completed'));els.pendingViewBtn.addEventListener('click',()=>selectCourseFilter('all'));els.historyViewBtn.addEventListener('click',()=>selectCourseFilter('completed'));
document.querySelectorAll('.type-chip').forEach(btn=>btn.addEventListener('click',()=>{state.kindFilter=btn.dataset.kind;state.quickFilter='all';document.querySelectorAll('.type-chip').forEach(b=>b.classList.toggle('active',b===btn));renderTaskList();}));document.querySelectorAll('.summary-card').forEach(btn=>btn.addEventListener('click',()=>{state.quickFilter=btn.dataset.quick||'all';state.courseFilter=state.courseFilter==='completed'?'all':state.courseFilter;renderTaskList();}));els.taskSearch.addEventListener('input',()=>{state.search=els.taskSearch.value;renderTaskList();});



function setCloudUi(info={}){
  const user=info.user||window.KaoruTaskCloud?.currentUser?.()||null;
  const stateName=info.state||'local';
  const queue=Number(info.queue||0);
  const message=info.message||'';

  els.cloudSignedOut.classList.toggle('hidden',!!user);
  els.cloudSignedIn.classList.toggle('hidden',!user);
  els.cloudStateCard.dataset.state=stateName;
  els.cloudQueueCount.textContent=String(queue);

  if(user){
    els.cloudUserEmail.textContent=user.email||'Cuenta Kaoru';
    els.cloudBtnText.textContent=
      stateName==='syncing'?'Sincronizando':
      stateName==='offline'?'Sin conexión':
      queue>0?`${queue} pendiente${queue===1?'':'s'}`:
      'Sincronizado';
    els.cloudSyncText.textContent=message||els.cloudBtnText.textContent;
  }else{
    els.cloudBtnText.textContent='Cuenta';
    els.cloudUserEmail.textContent='—';
    els.cloudSyncText.textContent='Solo local';
  }

  els.cloudDot.dataset.state=stateName;

  const labels={
    synced:'Sincronizado',
    syncing:'Sincronizando…',
    pending:'Cambios pendientes',
    offline:'Sin conexión',
    error:'Problema de sincronización',
    local:'Solo local'
  };
  els.cloudStateText.textContent=labels[stateName]||'Kaoru Cloud';
  els.cloudStateDetail.textContent=message||(
    user
      ?'La sincronización automática está activa.'
      :'Inicia sesión para sincronizar automáticamente.'
  );
}
async function refreshTaskStateFromDb(){
  state.courses=await dbGetAll(COURSE_STORE);
  state.tasks=await dbGetAll(TASK_STORE);
  if(state.selectedTaskId&&!state.tasks.some(t=>t.id===state.selectedTaskId)){
    state.selectedTaskId=null;
  }
  renderCourseSettings();
  renderTaskList();
  renderDetail();
  await loadSchedule();
}

async function cloudListLocal(type){
  if(type==='course')return dbGetAll(COURSE_STORE);
  if(type==='task')return dbGetAll(TASK_STORE);
  if(type==='schedule'){
    const schedule=await getSetting('schedulePhoto',null);
    return schedule?[{id:'schedulePhoto',...schedule}]:[];
  }
  return[];
}

async function cloudGetLocal(type,id){
  if(type==='course')return dbGet(COURSE_STORE,id);
  if(type==='task')return dbGet(TASK_STORE,id);
  if(type==='schedule'){
    const schedule=await getSetting('schedulePhoto',null);
    return schedule?{id:'schedulePhoto',...schedule}:null;
  }
  return null;
}

async function cloudPutLocal(type,value){
  if(type==='course')return dbPut(COURSE_STORE,value);
  if(type==='task')return dbPut(TASK_STORE,value);

  if(type==='schedule'){
    const current=await getSetting('schedulePhoto',null);
    const keepBlob=
      current?.blob&&
      current?.storagePath&&
      current.storagePath===value?.storagePath
        ?current.blob
        :null;

    const next={
      ...value,
      id:'schedulePhoto',
      ...(keepBlob?{blob:keepBlob}:{})
    };

    await setSetting('schedulePhoto',next);
    state.schedule=next;
    renderSchedule();
    return next;
  }

  return null;
}

async function cloudDeleteLocal(type,id){
  if(type==='course')return dbDelete(COURSE_STORE,id);
  if(type==='task')return dbDelete(TASK_STORE,id);

  if(type==='schedule'){
    await dbDelete(SETTINGS_STORE,'schedulePhoto');
    state.schedule=null;
    renderSchedule();
  }
}
async function initTaskCloud(){
  if(!window.KaoruTaskCloud){
    setCloudUi({
      state:'offline',
      message:'Kaoru Cloud no pudo cargar. Tus datos locales siguen disponibles.'
    });
    return;
  }

  try{
    await window.KaoruTaskCloud.init({
      listLocal:cloudListLocal,
      getLocal:cloudGetLocal,
      putLocal:cloudPutLocal,
      deleteLocal:cloudDeleteLocal,
      refresh:refreshTaskStateFromDb,
      syncFiles:syncTaskFilesToCloud,
      syncSchedule:syncScheduleToCloud,
      onStatus:setCloudUi
    });

    setCloudUi({
      state:window.KaoruTaskCloud.currentUser?.()?'synced':'local',
      user:window.KaoruTaskCloud.currentUser?.()||null,
      message:window.KaoruTaskCloud.currentUser?.()
        ?'Sincronización automática activa.'
        :'Inicia sesión para sincronizar automáticamente.'
    });
  }catch(err){
    /*
      Task Studio es local-first. Una caida de Supabase, un token
      temporalmente invalido o cualquier error de red NO debe impedir
      abrir tus tareas.
    */
    console.error('Kaoru Cloud no pudo iniciar; continuando en local.',err);
    setCloudUi({
      state:navigator.onLine?'error':'offline',
      user:window.KaoruTaskCloud.currentUser?.()||null,
      message:navigator.onLine
        ?'Cloud no pudo iniciar. Task Studio sigue disponible localmente.'
        :'Sin conexión. Task Studio sigue disponible localmente.'
    });
  }
}

els.cloudBtn.addEventListener('click',()=>{
  els.cloudAuthMessage.textContent='';
  setCloudUi({
    state:window.KaoruTaskCloud?.currentUser?.()?'synced':'local',
    user:window.KaoruTaskCloud?.currentUser?.()||null
  });
  showModal('cloudModal');
});

els.cloudAuthForm.addEventListener('submit',async e=>{
  e.preventDefault();
  const email=els.cloudEmailInput.value.trim();
  const password=els.cloudPasswordInput.value;
  if(!email||!password)return;
  els.cloudAuthMessage.textContent='Iniciando sesión…';
  try{
    await window.KaoruTaskCloud.signIn(email,password);
    els.cloudPasswordInput.value='';
    els.cloudAuthMessage.textContent='';
    setCloudUi({state:'syncing',user:window.KaoruTaskCloud.currentUser?.(),message:'Migrando y sincronizando tus datos locales…'});
  }catch(err){
    els.cloudAuthMessage.textContent=err?.message||'No se pudo iniciar sesión.';
  }
});

els.cloudCreateBtn.addEventListener('click',async()=>{
  const email=els.cloudEmailInput.value.trim();
  const password=els.cloudPasswordInput.value;
  if(!email||!password){
    els.cloudAuthMessage.textContent='Escribe tu correo y una contraseña de al menos 6 caracteres.';
    return;
  }
  els.cloudAuthMessage.textContent='Creando cuenta…';
  try{
    const result=await window.KaoruTaskCloud.signUp(email,password);
    els.cloudPasswordInput.value='';
    if(result?.session){
      els.cloudAuthMessage.textContent='';
      setCloudUi({state:'syncing',user:window.KaoruTaskCloud.currentUser?.(),message:'Cuenta creada. Migrando tus datos locales…'});
    }else{
      els.cloudAuthMessage.textContent='Cuenta creada. Revisa tu correo para confirmar la dirección y luego inicia sesión.';
    }
  }catch(err){
    els.cloudAuthMessage.textContent=err?.message||'No se pudo crear la cuenta.';
  }
});

els.cloudSignOutBtn.addEventListener('click',async()=>{
  if(!confirm('¿Cerrar sesión de Kaoru Cloud en este dispositivo? Tus datos locales seguirán aquí.'))return;
  try{
    await window.KaoruTaskCloud.signOut();
    setCloudUi({state:'local',message:'Sesión cerrada. Tus datos locales siguen disponibles.'});
  }catch(err){
    els.cloudStateDetail.textContent=err?.message||'No se pudo cerrar la sesión.';
  }
});
function goTaskHome(){
  if(EMBEDDED){
    window.parent.postMessage({type:'kaoru:navigate',studio:'home'},'*');
    return;
  }
  window.location.href='../../#home';
}
els.mobileHomeBtn?.addEventListener('click',goTaskHome);
function installNavigationShortcuts(){document.addEventListener('keydown',e=>{if(!e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;const map={'1':'silhouette','2':'text','3':'image','4':'light','5':'3d','6':'combiner','7':'gallery','8':'reader','9':'tasks'};const target=map[e.key];if(!target)return;e.preventDefault();if(EMBEDDED)window.parent.postMessage({type:'kaoru:navigate',studio:target},'*');else window.location.href=`../../#${target}`;});}

async function init(){
  try{
    state.courses=await dbGetAll(COURSE_STORE);state.tasks=await dbGetAll(TASK_STORE);state.notificationConfig={...state.notificationConfig,...(await getSetting('notificationConfig',{}))};await migrateLegacyNoteImages();await loadSchedule();await loadTaskFonts();renderCourseSettings();renderTaskList();renderDetail();syncNotificationUI();installNavigationShortcuts();await initTaskCloud();
    await window.KaoruTaskPush?.restore?.(state.notificationConfig).catch(err=>console.warn('Kaoru Push restore',err));
    if(EMBEDDED)window.parent.postMessage({type:'kaoru:studio-ready',studio:'tasks',theme:document.documentElement.dataset.theme||'day'},'*');
    ensureServiceWorker();checkNotifications();setInterval(checkNotifications,15000);
  }catch(err){console.error(err);alert('Task Studio no pudo iniciar correctamente. Revisa la consola para más detalles.');}
}

init();
}());

/* KAORU_TASK_NOTES_EXPANDED_V1 */
(function setupExpandedTaskNotes(){
  const button=document.getElementById('expandNotesBtn');
  const section=document.querySelector('.notes-section');
  if(!button||!section)return;

  function setExpanded(expanded){
    const next=Boolean(expanded);
    document.body.classList.toggle('notes-expanded',next);
    button.setAttribute('aria-pressed',String(next));
    button.setAttribute('title',next?'Cerrar vista ampliada':'Ampliar notas');
    button.textContent=next?'Salir':'Ampliar';
  }

  button.addEventListener('click',()=>{
    setExpanded(!document.body.classList.contains('notes-expanded'));
  });

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&document.body.classList.contains('notes-expanded')){
      event.preventDefault();
      event.stopPropagation();
      setExpanded(false);
      button.focus();
    }
  },true);
}());
