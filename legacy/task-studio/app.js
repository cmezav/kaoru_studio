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
  requestNotificationBtn:$('requestNotificationBtn'),notificationStatus:$('notificationStatus'),summaryIntervalSelect:$('summaryIntervalSelect'),
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
function kindName(kind){return kind==='lab'?'Laboratorio':'Teoría';}
function taskContext(task){
  const course=courseById(task.courseId);
  if(course){
    const professor=task.kind==='lab'?(course.labProfessor||course.theoryProfessor):(course.theoryProfessor||'');
    return{course,courseName:course.name,color:course.color||'#7C3AED',professor:professor||'Sin profesor registrado',kind:task.kind};
  }
  return{course:null,courseName:task.courseNameSnapshot||'Curso eliminado',color:task.courseColorSnapshot||'#8B8490',professor:task.professorSnapshot||'Sin profesor registrado',kind:task.kind||'theory'};
}
function localDateTimeValue(value){
  if(!value)return'';const d=new Date(value);if(Number.isNaN(d.getTime()))return'';
  const pad=n=>String(n).padStart(2,'0');return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function parseDue(value){if(!value)return null;const d=new Date(value);return Number.isNaN(d.getTime())?null:d.getTime();}
function formatDue(value){
  if(!value)return'Sin fecha de entrega';const d=new Date(value);if(Number.isNaN(d.getTime()))return'Sin fecha de entrega';
  return new Intl.DateTimeFormat('es-PE',{weekday:'short',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(d);
}
function startOfToday(){const d=new Date();d.setHours(0,0,0,0);return d.getTime();}
function endOfToday(){return startOfToday()+dayMs-1;}
function dueClass(task){
  const due=parseDue(task.dueAt);if(!due||task.completed)return'';if(due<now())return'overdue';if(due<=endOfToday())return'today';if(due<=now()+3*dayMs)return'soon';return'';
}
function relativeDue(task){
  const due=parseDue(task.dueAt);if(!due)return'Sin plazo';if(task.completed)return`Completada ${task.completedAt?new Intl.DateTimeFormat('es-PE',{day:'2-digit',month:'short'}).format(new Date(task.completedAt)):''}`.trim();
  const diff=due-now();if(diff<0){const h=Math.ceil(Math.abs(diff)/3600000);return h<24?`Atrasada ${h} h`:`Atrasada ${Math.ceil(h/24)} d`;}
  if(due<=endOfToday())return'Hoy';const tomorrowEnd=endOfToday()+dayMs;if(due<=tomorrowEnd)return'Mañana';const days=Math.ceil(diff/dayMs);return`En ${days} días`;
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
  const overdue=pending.filter(t=>{const d=parseDue(t.dueAt);return d&&d<now();});
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
    card.innerHTML=`<button class="task-check" type="button" aria-label="${task.completed?'Marcar pendiente':'Completar tarea'}"></button><div class="task-card-top"><span class="task-course-name">${esc(ctx.courseName)}</span><span class="task-kind">${kindName(task.kind)}</span></div><strong class="task-card-title">${esc(task.title)}</strong><div class="task-card-bottom"><span class="task-professor">${esc(ctx.professor)}</span><span class="task-due ${dueClass(task)}">${esc(relativeDue(task))}</span></div>`;
    card.querySelector('.task-check').addEventListener('click',async e=>{e.stopPropagation();await toggleComplete(task.id);});card.addEventListener('click',()=>selectTask(task.id));els.taskList.appendChild(card);
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
  const ctx=taskContext(task);els.detailEmpty.classList.add('hidden');els.taskDetail.classList.remove('hidden');els.detailCourse.textContent=ctx.courseName;els.detailCourseDot.style.background=ctx.color;els.detailKind.textContent=kindName(task.kind);els.detailTitle.textContent=task.title;els.detailProfessor.textContent=ctx.professor;els.detailDue.textContent=`${task.completed?'Completada · ':'Entrega · '}${formatDue(task.dueAt)}`;els.detailDue.className='due-line '+dueClass(task);els.detailCompleteBtn.classList.toggle('done',!!task.completed);els.detailCompleteBtn.style.setProperty('--course-color',ctx.color);els.detailCompleteBtn.title=task.completed?'Volver a Pendientes':'Marcar como completada';els.detailCompleteBtn.setAttribute('aria-label',task.completed?'Volver a Pendientes':'Marcar como completada');els.restoreTaskBtn.classList.toggle('hidden',!task.completed);renderDocs(task);renderNoteThread(task);
}
els.detailCompleteBtn.addEventListener('click',()=>state.selectedTaskId&&toggleComplete(state.selectedTaskId));els.restoreTaskBtn.addEventListener('click',()=>state.selectedTaskId&&toggleComplete(state.selectedTaskId));

function populateTaskCourseSelect(selectedId){
  els.taskCourseSelect.innerHTML=state.courses.length?state.courses.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join(''):'<option value="">Primero agrega un curso</option>';
  if(selectedId&&state.courses.some(c=>c.id===selectedId))els.taskCourseSelect.value=selectedId;updateTaskKindOptions();
}
function updateTaskKindOptions(){
  const course=courseById(els.taskCourseSelect.value);const current=els.taskKindSelect.value;els.taskKindSelect.innerHTML='<option value="theory">Teoría</option>'+(course&&course.hasLab?'<option value="lab">Laboratorio</option>':'');els.taskKindSelect.value=(current==='lab'&&course&&course.hasLab)?'lab':'theory';updateTeacherPreview();
}
function updateTeacherPreview(){const course=courseById(els.taskCourseSelect.value);if(!course){els.taskTeacherPreview.textContent='—';return;}els.taskTeacherPreview.textContent=els.taskKindSelect.value==='lab'?(course.labProfessor||course.theoryProfessor||'Sin profesor registrado'):(course.theoryProfessor||'Sin profesor registrado');}
function openTaskModal(task=null){
  if(!state.courses.length){openSettings(true);return;}
  state.editingTaskId=task?task.id:null;
  els.taskModalTitle.textContent=task?'Editar tarea':'Nueva tarea';
  const preferredCourse=task?.courseId||((state.courseFilter!=='all'&&state.courseFilter!=='completed')?state.courseFilter:null);
  populateTaskCourseSelect(preferredCourse);
  els.taskTitleInput.value=task?.title||'';
  els.taskKindSelect.value=task?.kind||'theory';
  updateTaskKindOptions();
  if(task?.kind==='lab'&&courseById(els.taskCourseSelect.value)?.hasLab)els.taskKindSelect.value='lab';
  els.taskDueInput.value=localDateTimeValue(task?.dueAt||'');
  updateTeacherPreview();
  showModal('taskModal');
  setTimeout(()=>els.taskTitleInput.focus(),40);
}

els.newTaskBtn.addEventListener('click',()=>openTaskModal());els.editTaskBtn.addEventListener('click',()=>{const t=taskById(state.selectedTaskId);if(t)openTaskModal(t);});els.taskCourseSelect.addEventListener('change',updateTaskKindOptions);els.taskKindSelect.addEventListener('change',updateTeacherPreview);
els.taskForm.addEventListener('submit',async e=>{
  e.preventDefault();const title=els.taskTitleInput.value.trim(),course=courseById(els.taskCourseSelect.value);if(!title||!course)return;
  const kind=els.taskKindSelect.value==='lab'&&course.hasLab?'lab':'theory';const professor=kind==='lab'?(course.labProfessor||course.theoryProfessor):(course.theoryProfessor||'');const due=els.taskDueInput.value?new Date(els.taskDueInput.value).toISOString():null;
  let task=state.editingTaskId?taskById(state.editingTaskId):null;
  if(task){Object.assign(task,{title,courseId:course.id,courseNameSnapshot:course.name,courseColorSnapshot:course.color,professorSnapshot:professor||'',kind,dueAt:due,updatedAt:now()});}
  else{task={id:uid('task'),title,courseId:course.id,courseNameSnapshot:course.name,courseColorSnapshot:course.color,professorSnapshot:professor||'',kind,dueAt:due,completed:false,createdAt:now(),updatedAt:now(),notes:[],docs:[]};state.tasks.push(task);}
  await dbPut(TASK_STORE,task);hideModal('taskModal');state.selectedTaskId=task.id;renderTaskList();renderDetail();if(window.matchMedia('(max-width:900px)').matches)els.detailPane.classList.add('mobile-open');
});
els.deleteTaskBtn.addEventListener('click',async()=>{
  const task=taskById(state.selectedTaskId);if(!task)return;if(!confirm(`¿Eliminar la tarea “${task.title}”? Esta acción no se puede deshacer.`))return;
  for(const doc of(task.docs||[])){if(doc.type==='file'&&doc.fileId)await dbDelete(FILE_STORE,doc.fileId).catch(()=>{});}await dbDelete(TASK_STORE,task.id);state.tasks=state.tasks.filter(t=>t.id!==task.id);state.selectedTaskId=null;renderTaskList();renderDetail();closeMobileDetail();
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
  for(const t of related){const professor=t.kind==='lab'?(c.labProfessor||c.theoryProfessor):(c.theoryProfessor||'');t.courseNameSnapshot=c.name;t.courseColorSnapshot=c.color;t.professorSnapshot=professor||'';t.courseId=null;t.updatedAt=now();await dbPut(TASK_STORE,t);}await dbDelete(COURSE_STORE,id);state.courses=state.courses.filter(x=>x.id!==id);if(state.courseFilter===id)state.courseFilter='all';renderCourseSettings();renderTaskList();renderDetail();
}

function renderDocs(task){
  els.taskDocs.innerHTML='';const docs=task.docs||[];if(!docs.length){els.taskDocs.innerHTML='<span class="docs-empty">Sin documentos todavía. Agrega enlaces o archivos con ＋.</span>';return;}
  docs.forEach(doc=>{const chip=document.createElement('div');chip.className='doc-chip';const icon=document.createElement('span');icon.textContent=doc.type==='file'?'▧':'↗';let open;if(doc.type==='link'){open=document.createElement('a');open.href=doc.url;open.target='_blank';open.rel='noopener noreferrer';open.textContent=doc.label||doc.url;}else{open=document.createElement('button');open.type='button';open.className='doc-open';open.textContent=doc.name||'Archivo';open.addEventListener('click',()=>openStoredFile(doc.fileId));}const rm=document.createElement('button');rm.type='button';rm.className='doc-remove';rm.textContent='×';rm.title='Quitar';rm.addEventListener('click',()=>removeDoc(task.id,doc.id));chip.append(icon,open,rm);els.taskDocs.appendChild(chip);});
}
els.addLinkBtn.addEventListener('click',()=>{els.linkForm.classList.toggle('hidden');if(!els.linkForm.classList.contains('hidden'))els.linkLabel.focus();});els.cancelLinkBtn.addEventListener('click',()=>els.linkForm.classList.add('hidden'));
els.linkForm.addEventListener('submit',async e=>{
  e.preventDefault();const task=taskById(state.selectedTaskId);if(!task)return;let url=els.linkUrl.value.trim();try{const parsed=new URL(url);if(!/^https?:$/.test(parsed.protocol))throw new Error();url=parsed.href;}catch(_){alert('Ingresa un enlace válido que empiece con http:// o https://');return;}const label=els.linkLabel.value.trim()||url;task.docs=task.docs||[];task.docs.push({id:uid('doc'),type:'link',label,url,createdAt:now()});task.updatedAt=now();await dbPut(TASK_STORE,task);els.linkLabel.value='';els.linkUrl.value='';els.linkForm.classList.add('hidden');renderDocs(task);
});
els.addFileBtn.addEventListener('click',()=>els.taskFileInput.click());els.taskFileInput.addEventListener('change',async()=>{
  const task=taskById(state.selectedTaskId);if(!task||!els.taskFileInput.files?.length)return;task.docs=task.docs||[];
  for(const file of Array.from(els.taskFileInput.files)){const fileId=uid('file');await dbPut(FILE_STORE,{id:fileId,name:file.name,type:file.type||'application/octet-stream',size:file.size,blob:file,createdAt:now()});task.docs.push({id:uid('doc'),type:'file',fileId,name:file.name,mime:file.type||'',size:file.size,createdAt:now()});}
  task.updatedAt=now();await dbPut(TASK_STORE,task);els.taskFileInput.value='';renderDocs(task);
});
async function openStoredFile(fileId){const rec=await dbGet(FILE_STORE,fileId);if(!rec?.blob){alert('Este archivo pertenece a otro dispositivo o aún no se ha subido al Storage de Kaoru Cloud. Lo conectaremos en la siguiente fase.');return;}const url=URL.createObjectURL(rec.blob);window.open(url,'_blank','noopener');setTimeout(()=>URL.revokeObjectURL(url),60000);}
async function removeDoc(taskId,docId){const task=taskById(taskId);if(!task)return;const doc=(task.docs||[]).find(d=>d.id===docId);task.docs=(task.docs||[]).filter(d=>d.id!==docId);if(doc?.type==='file'&&doc.fileId)await dbDelete(FILE_STORE,doc.fileId).catch(()=>{});task.updatedAt=now();await dbPut(TASK_STORE,task);renderDocs(task);}

const noteSaveTimers=new Map();
function renderNoteThread(task){
  els.noteThread.innerHTML='';const notes=task.notes||[];if(!notes.length){els.noteThread.innerHTML='<div class="notes-empty">Tu hilo está vacío. Pulsa “＋ Nueva nota” para ir registrando avances, ideas o información.</div>';return;}
  notes.forEach(note=>{const card=document.createElement('article');card.className='note-card';card.dataset.bg=note.bg||'default';card.dataset.noteId=note.id;const head=document.createElement('div');head.className='note-headline';head.innerHTML=`<span class="note-time">${esc(noteDate(note.createdAt))}</span><span class="note-spacer"></span>`;const bg=document.createElement('select');bg.className='note-bg-select';[['default','Normal'],['lavender','Lavanda'],['rose','Rosa'],['blue','Azul'],['mint','Menta'],['sand','Crema']].forEach(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;if((note.bg||'default')===v)o.selected=true;bg.appendChild(o);});bg.addEventListener('change',async()=>{note.bg=bg.value;note.updatedAt=now();card.dataset.bg=note.bg;await dbPut(TASK_STORE,task);});const del=document.createElement('button');del.type='button';del.className='note-delete';del.textContent='×';del.title='Eliminar nota';del.addEventListener('click',()=>deleteNote(task.id,note.id));head.append(bg,del);const editor=document.createElement('div');editor.className='note-editor';editor.contentEditable='true';editor.dataset.noteId=note.id;editor.innerHTML=note.html||'';editor.addEventListener('focus',()=>{state.activeEditor=editor;saveSelection();});editor.addEventListener('keyup',saveSelection);editor.addEventListener('mouseup',saveSelection);editor.addEventListener('input',()=>scheduleNoteSave(task,note,editor));editor.addEventListener('blur',()=>saveNoteNow(task,note,editor));card.append(head,editor);els.noteThread.appendChild(card);});
}
els.addNoteBtn.addEventListener('click',async()=>{
  const task=taskById(state.selectedTaskId);if(!task)return;task.notes=task.notes||[];const note={id:uid('note'),html:'',bg:'default',createdAt:now(),updatedAt:now()};task.notes.push(note);task.updatedAt=now();await dbPut(TASK_STORE,task);renderNoteThread(task);setTimeout(()=>{const editor=els.noteThread.querySelector(`[data-note-id="${note.id}"].note-editor`);editor?.focus();editor?.scrollIntoView({behavior:'smooth',block:'center'});},30);
});
function scheduleNoteSave(task,note,editor){clearTimeout(noteSaveTimers.get(note.id));noteSaveTimers.set(note.id,setTimeout(()=>saveNoteNow(task,note,editor),320));}
async function saveNoteNow(task,note,editor){clearTimeout(noteSaveTimers.get(note.id));noteSaveTimers.delete(note.id);note.html=editor.innerHTML;note.updatedAt=now();task.updatedAt=now();await dbPut(TASK_STORE,task);}
async function deleteNote(taskId,noteId){const task=taskById(taskId);if(!task)return;if(!confirm('¿Eliminar esta nota del hilo?'))return;task.notes=(task.notes||[]).filter(n=>n.id!==noteId);task.updatedAt=now();await dbPut(TASK_STORE,task);renderNoteThread(task);}
function saveSelection(){const sel=window.getSelection();if(!sel||!sel.rangeCount||!state.activeEditor)return;const range=sel.getRangeAt(0);if(state.activeEditor.contains(range.commonAncestorContainer))state.savedRange=range.cloneRange();}
function restoreSelection(){if(!state.savedRange||!state.activeEditor)return false;const sel=window.getSelection();sel.removeAllRanges();sel.addRange(state.savedRange);state.activeEditor.focus();return true;}
function saveActiveEditor(){const task=taskById(state.selectedTaskId);if(!task||!state.activeEditor)return;const note=(task.notes||[]).find(n=>n.id===state.activeEditor.dataset.noteId);if(note)saveNoteNow(task,note,state.activeEditor);}
function execRich(cmd,value=null){if(!state.activeEditor)return;restoreSelection();document.execCommand(cmd,false,value);saveSelection();saveActiveEditor();}
els.richToolbar.querySelectorAll('button[data-cmd]').forEach(btn=>{btn.addEventListener('mousedown',e=>e.preventDefault());btn.addEventListener('click',()=>execRich(btn.dataset.cmd));});
els.blockFormat.addEventListener('change',()=>{execRich('formatBlock',`<${els.blockFormat.value}>`);});els.fontSizeSelect.addEventListener('change',()=>execRich('fontSize',els.fontSizeSelect.value));els.fontSelect.addEventListener('change',()=>{if(els.fontSelect.value)execRich('fontName',els.fontSelect.value);});els.textColorInput.addEventListener('input',()=>execRich('foreColor',els.textColorInput.value));els.highlightColorInput.addEventListener('input',()=>{if(!state.activeEditor)return;restoreSelection();try{document.execCommand('hiliteColor',false,els.highlightColorInput.value);}catch(_){document.execCommand('backColor',false,els.highlightColorInput.value);}saveSelection();saveActiveEditor();});
els.insertNoteImageBtn.addEventListener('mousedown',e=>e.preventDefault());els.insertNoteImageBtn.addEventListener('click',()=>{if(!state.activeEditor){alert('Primero toca dentro de una nota.');return;}saveSelection();els.noteImageInput.click();});els.noteImageInput.addEventListener('change',()=>{const file=els.noteImageInput.files?.[0];if(!file||!state.activeEditor)return;const reader=new FileReader();reader.onload=()=>{restoreSelection();document.execCommand('insertImage',false,reader.result);saveSelection();saveActiveEditor();};reader.readAsDataURL(file);els.noteImageInput.value='';});

document.addEventListener('selectionchange',()=>{const sel=window.getSelection();if(!sel||!sel.rangeCount)return;const node=sel.anchorNode;const editor=node&&(node.nodeType===1?node:node.parentElement)?.closest?.('.note-editor');if(editor){state.activeEditor=editor;saveSelection();}});

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
async function loadSchedule(){state.schedule=await getSetting('schedulePhoto',null);renderSchedule();}
function renderSchedule(){
  if(scheduleObjectUrl){URL.revokeObjectURL(scheduleObjectUrl);scheduleObjectUrl=null;}const s=state.schedule;els.scheduleEmpty.classList.toggle('hidden',!!s?.blob);els.scheduleViewer.classList.toggle('hidden',!s?.blob);if(s?.blob){scheduleObjectUrl=URL.createObjectURL(s.blob);els.scheduleImage.src=scheduleObjectUrl;els.scheduleZoom.value='100';els.scheduleZoomValue.textContent='100%';els.scheduleImage.style.width='100%';}
}
async function saveScheduleFile(file){if(!file)return;state.schedule={blob:file,name:file.name,type:file.type,updatedAt:now()};await setSetting('schedulePhoto',state.schedule);renderSchedule();}
els.scheduleBtn.addEventListener('click',()=>showModal('scheduleModal'));els.scheduleInput.addEventListener('change',()=>{const f=els.scheduleInput.files?.[0];saveScheduleFile(f);els.scheduleInput.value='';});els.scheduleReplaceInput.addEventListener('change',()=>{const f=els.scheduleReplaceInput.files?.[0];saveScheduleFile(f);els.scheduleReplaceInput.value='';});els.scheduleZoom.addEventListener('input',()=>{const v=Number(els.scheduleZoom.value);els.scheduleZoomValue.textContent=`${v}%`;els.scheduleImage.style.width=`${v}%`;});els.deleteScheduleBtn.addEventListener('click',async()=>{if(!confirm('¿Eliminar la foto del horario guardada en este navegador?'))return;state.schedule=null;await dbDelete(SETTINGS_STORE,'schedulePhoto');renderSchedule();});

function notificationPermissionText(){if(!('Notification'in window))return'Este navegador no ofrece notificaciones web.';if(Notification.permission==='granted')return'Avisos permitidos. Kaoru puede recordarte tareas mientras esté abierto.';if(Notification.permission==='denied')return'Los avisos están bloqueados en el navegador. Debes habilitarlos desde los permisos del sitio.';return'Todavía no has dado permiso para mostrar avisos.';}
function syncNotificationUI(){els.notificationStatus.textContent=notificationPermissionText();els.summaryIntervalSelect.value=String(state.notificationConfig.intervalHours||3);document.querySelectorAll('[data-threshold]').forEach(cb=>cb.checked=(state.notificationConfig.thresholds||[]).includes(Number(cb.dataset.threshold)));els.requestNotificationBtn.textContent=state.notificationConfig.enabled&&('Notification'in window)&&Notification.permission==='granted'?'🔔 Notificaciones activadas':'🔔 Activar notificaciones';}
async function saveNotificationConfig(){await setSetting('notificationConfig',state.notificationConfig);syncNotificationUI();}
async function ensureServiceWorker(){if(!('serviceWorker'in navigator))return null;try{await navigator.serviceWorker.register('../../reader-sw.js?cache=21');return await navigator.serviceWorker.ready;}catch(err){console.warn('No se pudo registrar el service worker',err);return null;}}
async function showSystemNotification(title,body,tag,data={}){
  if(!('Notification'in window)||Notification.permission!=='granted')return;const options={body,tag,icon:'../../logo.png',badge:'../../logo.png',data:{...data,url:'../../#tasks'}};const reg=await ensureServiceWorker();try{if(reg?.showNotification){await reg.showNotification(title,options);return;}const n=new Notification(title,options);n.onclick=()=>{window.focus();};}catch(err){console.warn('No se pudo mostrar notificación',err);}
}
async function requestNotifications(){
  if(!('Notification'in window)){alert('Este navegador no permite notificaciones web.');return;}const permission=await Notification.requestPermission();state.notificationConfig.enabled=permission==='granted';state.notificationConfig.lastSummaryAt=now();await saveNotificationConfig();if(permission==='granted')await showSystemNotification('Task Studio listo','Los recordatorios están activados. Te avisaré de tus tareas mientras Kaoru permanezca abierto.','task-studio-enabled');
}
els.requestNotificationBtn.addEventListener('click',requestNotifications);els.notificationBtn.addEventListener('click',()=>{openSettings(false);setTimeout(()=>document.querySelector('.notification-settings')?.scrollIntoView({behavior:'smooth',block:'start'}),80);});els.summaryIntervalSelect.addEventListener('change',async()=>{state.notificationConfig.intervalHours=Number(els.summaryIntervalSelect.value)||3;await saveNotificationConfig();});document.querySelectorAll('[data-threshold]').forEach(cb=>cb.addEventListener('change',async()=>{state.notificationConfig.thresholds=[...document.querySelectorAll('[data-threshold]:checked')].map(x=>Number(x.dataset.threshold)).sort((a,b)=>b-a);await saveNotificationConfig();}));
function readNotificationLog(){try{return JSON.parse(localStorage.getItem('kaoru-task-notification-log')||'{}')||{};}catch(_){return{};}}
function writeNotificationLog(log){try{localStorage.setItem('kaoru-task-notification-log',JSON.stringify(log));}catch(_){}}
async function checkNotifications(){
  if(!state.notificationConfig.enabled||!('Notification'in window)||Notification.permission!=='granted')return;const pending=state.tasks.filter(t=>!t.completed);if(!pending.length)return;const log=readNotificationLog(),current=now();
  const interval=(state.notificationConfig.intervalHours||3)*3600000;if(current-(state.notificationConfig.lastSummaryAt||0)>=interval){const sorted=[...pending].sort((a,b)=>(parseDue(a.dueAt)||Infinity)-(parseDue(b.dueAt)||Infinity));const next=sorted[0];await showSystemNotification(`Tienes ${pending.length} tarea${pending.length===1?'':'s'} pendiente${pending.length===1?'':'s'}`,next?`Próxima: ${next.title} · ${relativeDue(next)}`:'Revisa Task Studio.','task-summary');state.notificationConfig.lastSummaryAt=current;await setSetting('notificationConfig',state.notificationConfig);}
  for(const task of pending){const due=parseDue(task.dueAt);if(!due)continue;const hours=(due-current)/3600000;if(hours<0){const key=`${task.id}:${task.dueAt}:overdue`;if(!log[key]){await showSystemNotification('Tarea atrasada',`${task.title} ya pasó de plazo.`,`task-${task.id}-overdue`,{taskId:task.id});log[key]=current;}continue;}for(const threshold of(state.notificationConfig.thresholds||[])){if(hours<=threshold){const key=`${task.id}:${task.dueAt}:${threshold}`;if(!log[key]){const ctx=taskContext(task);await showSystemNotification(`Entrega en menos de ${threshold} h`,`${task.title} · ${ctx.courseName}`,`task-${task.id}-${threshold}`,{taskId:task.id});log[key]=current;}break;}}}
  writeNotificationLog(log);
}

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
      listLocal:async type=>dbGetAll(type==='course'?COURSE_STORE:TASK_STORE),
      getLocal:async(type,id)=>dbGet(type==='course'?COURSE_STORE:TASK_STORE,id),
      putLocal:async(type,value)=>dbPut(type==='course'?COURSE_STORE:TASK_STORE,value),
      deleteLocal:async(type,id)=>dbDelete(type==='course'?COURSE_STORE:TASK_STORE,id),
      refresh:refreshTaskStateFromDb,
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
    state.courses=await dbGetAll(COURSE_STORE);state.tasks=await dbGetAll(TASK_STORE);state.notificationConfig={...state.notificationConfig,...(await getSetting('notificationConfig',{}))};await loadSchedule();await loadTaskFonts();renderCourseSettings();renderTaskList();renderDetail();syncNotificationUI();installNavigationShortcuts();await initTaskCloud();
    if(EMBEDDED)window.parent.postMessage({type:'kaoru:studio-ready',studio:'tasks',theme:document.documentElement.dataset.theme||'day'},'*');
    ensureServiceWorker();checkNotifications();setInterval(checkNotifications,60000);
  }catch(err){console.error(err);alert('Task Studio no pudo iniciar correctamente. Revisa la consola para más detalles.');}
}

init();
}());