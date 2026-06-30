/* ═══════════════════════════════════════════════════════════
   ASCEND OS — ascend-script.js
   Full LocalStorage Database + All Features
   No backend needed — everything persists locally
═══════════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════
   DATABASE LAYER — LocalStorage wrapper
══════════════════════════════════════════════ */

const DB_KEY = 'ascendOS_db_v1';

const DEFAULT_DB = {
  users: [],            // {id, fname, lname, username, email, age, pass, createdAt}
  currentUserId: null,
  profile: {
    photo: null, fname: 'Samir', lname: '', username: 'samir', email: '',
    age: 20, weight: 70, goal: 'Become a great developer and stay healthy'
  },
  settings: {
    theme: 'dark', accent: '#6366f1', fontSize: 15, sidebarCollapsed: false,
    autoSave: true
  },
  goalsTargets: { calories: 2200, protein: 150, carbs: 250, fat: 70, water: 8, sleep: 7 },
  xp: 200, level: 1, coins: 0, streak: 0, bestStreak: 0, lastActiveDate: null,
  badges: [],            // earned badge ids
  tasks: [],             // {id, title, priority, category, deadline, repeat, notes, subtasks:[], status, createdAt, date}
  habits: [],            // {id, name, icon, color, target, logs:{date:count}}
  notes: [],             // {id, title, tag, content, createdAt}
  events: [],            // {id, title, date, time, type, notes}
  subjects: [],          // {id, name, total, attended, color}
  assignments: [],       // {id, title, subject, deadline, notes, done}
  internshipTasks: [],   // {id, title, deadline, priority, done}
  certificates: [],      // {id, name, issuer, date, url}
  roadmapProgress: {},   // {topicId: true/false}
  projects: [],          // {id, name, desc, github, demo, status, pct, stack}
  goalsList: [],         // {id, title, desc, deadline, category, progress}
  health: {},            // {date: {weight, height, bmi, water, waterGoal, sleep, protein, calories, measurements}}
  workouts: {},          // {date: {done:bool, exercises:[]}}
  meals: {},             // {date: {breakfast:[], lunch:[], dinner:[], snack:[]}}
  studyLog: {},          // {date: {subjectName: minutes}}
  dailyScores: {},        // {date: pct}
  notifications: []
};

function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) { saveDB(DEFAULT_DB); return JSON.parse(JSON.stringify(DEFAULT_DB)); }
    const parsed = JSON.parse(raw);
    // Merge with defaults to handle new fields after updates
    return Object.assign(JSON.parse(JSON.stringify(DEFAULT_DB)), parsed);
  } catch (e) {
    console.error('DB load error', e);
    return JSON.parse(JSON.stringify(DEFAULT_DB));
  }
}

function saveDB(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch (e) {
    console.error('DB save error', e);
    showToast('⚠ Storage full or unavailable. Some data may not save.', 'error');
  }
}

let DB = loadDB();

function persist() { saveDB(DB); }

/* ══════════════════════════════════════════════
   DATE HELPERS
══════════════════════════════════════════════ */

function todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function dateStr(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dateStr(d);
}
function formatDateHuman(dStr) {
  if (!dStr) return '';
  const d = new Date(dStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
}
function uid() { return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2,8); }

/* ══════════════════════════════════════════════
   TOAST / UI HELPERS
══════════════════════════════════════════════ */

function showToast(msg, type='info') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.style.borderLeftColor =
    type==='error' ? '#ef4444' : type==='success' ? '#10b981' : 'var(--accent)';
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>toast.classList.remove('show'), 3200);
}

function markInvalid(el, msg) {
  if (!el) { showToast('⚠ ' + msg, 'error'); return; }
  el.style.borderColor = '#ef4444';
  el.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.18)';
  el.focus();
  showToast('⚠ ' + msg, 'error');
  el.addEventListener('input', ()=>{ el.style.borderColor=''; el.style.boxShadow=''; }, {once:true});
}

function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

let confirmCallback = null;
function showConfirm(title, msg, onConfirm) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('confirmDialog').classList.remove('hidden');
  confirmCallback = onConfirm;
  document.getElementById('confirmOkBtn').onclick = () => {
    if (confirmCallback) confirmCallback();
    closeConfirm();
  };
}
function closeConfirm() { document.getElementById('confirmDialog').classList.add('hidden'); }

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// Close modal on backdrop click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.add('hidden');
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m=>m.classList.add('hidden'));
    closeConfirm();
  }
});

function toggleEye(inputId, btn) {
  const input = document.getElementById(inputId);
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  btn.innerHTML = isPass ? '<i class="fa fa-eye-slash"></i>' : '<i class="fa fa-eye"></i>';
}

/* ══════════════════════════════════════════════
   AUTH — Canvas particles background
══════════════════════════════════════════════ */

function initAuthCanvas() {
  const canvas = document.getElementById('authCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  function resize() { canvas.width = innerWidth; canvas.height = innerHeight; }
  resize(); window.addEventListener('resize', resize);

  const particles = Array.from({length:60}, () => ({
    x: Math.random()*innerWidth, y: Math.random()*innerHeight,
    vx: (Math.random()-0.5)*0.3, vy: (Math.random()-0.5)*0.3,
    r: Math.random()*2+0.5
  }));

  function loop() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if (p.x<0||p.x>canvas.width) p.vx*=-1;
      if (p.y<0||p.y>canvas.height) p.vy*=-1;
      ctx.fillStyle = 'rgba(99,102,241,0.4)';
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    });
    // connecting lines
    for (let i=0;i<particles.length;i++) {
      for (let j=i+1;j<particles.length;j++) {
        const dx=particles[i].x-particles[j].x, dy=particles[i].y-particles[j].y;
        const dist=Math.sqrt(dx*dx+dy*dy);
        if (dist<120) {
          ctx.strokeStyle = `rgba(99,102,241,${0.12*(1-dist/120)})`;
          ctx.lineWidth=1;
          ctx.beginPath(); ctx.moveTo(particles[i].x,particles[i].y); ctx.lineTo(particles[j].x,particles[j].y); ctx.stroke();
        }
      }
    }
    requestAnimationFrame(loop);
  }
  loop();
}

function showAuth(cardId) {
  ['loginCard','registerCard','forgotCard'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });
  document.getElementById(cardId).classList.remove('hidden');
}

/* ══════════════════════════════════════════════
   PASSWORD STRENGTH
══════════════════════════════════════════════ */

function checkStrength(val) {
  const fill = document.getElementById('strengthFill');
  const text = document.getElementById('strengthText');
  if (!fill) return;
  let score = 0;
  if (val.length>=8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const levels = [
    {pct:'20%',color:'#ef4444',label:'Weak'},
    {pct:'40%',color:'#f97316',label:'Fair'},
    {pct:'65%',color:'#fbbf24',label:'Good'},
    {pct:'85%',color:'#84cc16',label:'Strong'},
    {pct:'100%',color:'#10b981',label:'Very Strong'}
  ];
  const lvl = levels[Math.min(score,4)];
  fill.style.width = val.length===0 ? '0%' : lvl.pct;
  fill.style.background = lvl.color;
  text.textContent = val.length===0 ? '' : lvl.label;
  text.style.color = lvl.color;
}

/* ══════════════════════════════════════════════
   REGISTER
══════════════════════════════════════════════ */

function doRegister() {
  const fname = document.getElementById('regFname');
  const lname = document.getElementById('regLname');
  const user  = document.getElementById('regUser');
  const email = document.getElementById('regEmail');
  const age   = document.getElementById('regAge');
  const pass  = document.getElementById('regPass');
  const passC = document.getElementById('regPassConf');

  [fname,lname,user,email,age,pass,passC].forEach(el=>{el.style.borderColor='';el.style.boxShadow='';});

  if (!fname.value.trim() || fname.value.trim().length<2) { markInvalid(fname,'Enter first name (min 2 chars)'); return; }
  if (!lname.value.trim() || lname.value.trim().length<2) { markInvalid(lname,'Enter last name (min 2 chars)'); return; }
  if (!user.value.trim() || user.value.trim().length<3) { markInvalid(user,'Username must be at least 3 characters'); return; }
  if (!/^[a-zA-Z0-9_]+$/.test(user.value.trim())) { markInvalid(user,'Username can only contain letters, numbers, underscore'); return; }
  if (DB.users.find(u=>u.username.toLowerCase()===user.value.trim().toLowerCase())) { markInvalid(user,'Username already taken'); return; }
  if (!email.value.trim() || !isValidEmail(email.value.trim())) { markInvalid(email,'Enter a valid email'); return; }
  if (DB.users.find(u=>u.email.toLowerCase()===email.value.trim().toLowerCase())) { markInvalid(email,'Email already registered'); return; }
  if (!age.value || age.value<10 || age.value>100) { markInvalid(age,'Enter a valid age (10-100)'); return; }
  if (!pass.value || pass.value.length<6) { markInvalid(pass,'Password must be at least 6 characters'); return; }
  if (pass.value !== passC.value) { markInvalid(passC,'Passwords do not match'); return; }

  const btn = document.querySelector('#registerCard .btn-auth');
  btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Creating Account...';

  setTimeout(() => {
    const newUser = {
      id: uid(), fname: fname.value.trim(), lname: lname.value.trim(),
      username: user.value.trim(), email: email.value.trim().toLowerCase(),
      age: parseInt(age.value), pass: pass.value, createdAt: Date.now()
    };
    DB.users.push(newUser);
    persist();
    btn.disabled = false; btn.innerHTML = '<i class="fa fa-user-plus"></i> Create Account';
    showToast('🎉 Account created! Please sign in.', 'success');
    showAuth('loginCard');
    document.getElementById('loginUser').value = newUser.username;
    [fname,lname,user,email,age,pass,passC].forEach(el=>el.value='');
  }, 1000);
}

/* ══════════════════════════════════════════════
   LOGIN
══════════════════════════════════════════════ */

function doLogin() {
  const userEl = document.getElementById('loginUser');
  const passEl = document.getElementById('loginPass');
  [userEl,passEl].forEach(el=>{el.style.borderColor='';el.style.boxShadow='';});

  if (!userEl.value.trim()) { markInvalid(userEl,'Enter username or email'); return; }
  if (!passEl.value) { markInvalid(passEl,'Enter your password'); return; }

  const val = userEl.value.trim().toLowerCase();
  const found = DB.users.find(u => (u.username.toLowerCase()===val || u.email.toLowerCase()===val) && u.pass===passEl.value);

  if (!found) {
    markInvalid(passEl, 'Invalid username/email or password');
    return;
  }

  const btn = document.querySelector('#loginCard .btn-auth');
  btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Signing In...';

  setTimeout(() => {
    DB.currentUserId = found.id;
    DB.profile.fname = found.fname;
    DB.profile.lname = found.lname;
    DB.profile.username = found.username;
    DB.profile.email = found.email;
    DB.profile.age = found.age;
    persist();
    btn.disabled = false; btn.innerHTML = '<i class="fa fa-sign-in-alt"></i> Sign In';
    showToast(`Welcome back, ${found.fname}! 👋`, 'success');
    enterApp();
  }, 800);
}

function doForgot() {
  const emailEl = document.getElementById('forgotEmail');
  emailEl.style.borderColor=''; emailEl.style.boxShadow='';
  if (!emailEl.value.trim() || !isValidEmail(emailEl.value.trim())) { markInvalid(emailEl,'Enter a valid email'); return; }
  const found = DB.users.find(u=>u.email.toLowerCase()===emailEl.value.trim().toLowerCase());
  const btn = document.querySelector('#forgotCard .btn-auth');
  btn.disabled = true; btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Sending...';
  setTimeout(() => {
    btn.disabled = false; btn.innerHTML = '<i class="fa fa-paper-plane"></i> Send Reset Link';
    if (found) {
      showToast(`📧 Reset instructions sent! (Demo: your password is "${found.pass}")`, 'success');
    } else {
      showToast('⚠ No account found with this email', 'error');
    }
    emailEl.value = '';
  }, 1000);
}

function doLogout() {
  showConfirm('Logout?', 'You will need to sign in again to access your data.', () => {
    DB.currentUserId = null;
    persist();
    document.getElementById('appWrapper').classList.add('hidden');
    document.getElementById('authWrapper').classList.remove('hidden');
    showAuth('loginCard');
    showToast('Logged out successfully', 'success');
  });
}

/* ══════════════════════════════════════════════
   APP ENTRY
══════════════════════════════════════════════ */

function enterApp() {
  document.getElementById('authWrapper').classList.add('hidden');
  document.getElementById('appWrapper').classList.remove('hidden');
  initializeApp();
}

function initializeApp() {
  applyTheme();
  applyAccent();
  applyFontSize();
  updateProfileUI();
  checkStreak();
  renderRoadmapDefaults();
  renderBadgesDefault();
  navigateTo('dashboard', document.querySelector('.nav-item[data-page="dashboard"]'));
  renderAll();
  setInterval(autoSaveLoop, 30000);
  initVideoBg();
}

function autoSaveLoop() {
  if (DB.settings.autoSave) { persist(); }
}

function renderAll() {
  renderDashboard();
  renderHomePage();
  renderTasks();
  renderHabits();
  renderHealth();
  renderWorkout();
  renderDiet();
  renderStudy();
  renderInternship();
  renderProjects();
  renderRoadmap();
  renderNotes();
  renderCalendar();
  renderAnalytics();
  renderGoals();
  renderAchievements();
  renderAiCoach();
  renderSettings();
}

/* ══════════════════════════════════════════════
   NAVIGATION
══════════════════════════════════════════════ */

const pageTitles = {
  dashboard:'Dashboard', home:'Home', tasks:'Tasks', habits:'Habits',
  calendar:'Calendar', notes:'Notes', health:'Health', workout:'Workout',
  diet:'Diet', study:'Study', internship:'Internship', projects:'Projects',
  roadmap:'Roadmap', analytics:'Analytics', goals:'Goals',
  achievements:'Achievements', aicoach:'AI Coach', settings:'Settings'
};

function navigateTo(page, el) {
  document.querySelectorAll('.page').forEach(p=>p.classList.add('hidden'));
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  const target = document.getElementById('page-'+page);
  if (target) { target.classList.remove('hidden'); target.classList.add('active'); }

  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  if (el) el.classList.add('active');
  else { const navEl = document.querySelector(`.nav-item[data-page="${page}"]`); if(navEl) navEl.classList.add('active'); }

  document.getElementById('topbarBreadcrumb').textContent = pageTitles[page] || page;
  window.scrollTo({top:0,behavior:'smooth'});

  // Close mobile sidebar
  document.getElementById('sidebar').classList.remove('mobile-open');
  const overlay = document.querySelector('.sidebar-overlay');
  if (overlay) overlay.classList.remove('show');

  // Re-render specific page data
  const renderMap = {
    dashboard: renderDashboard, home: renderHomePage, tasks: renderTasks,
    habits: renderHabits, health: renderHealth, workout: renderWorkout,
    diet: renderDiet, study: renderStudy, internship: renderInternship,
    projects: renderProjects, roadmap: renderRoadmap, notes: renderNotes,
    calendar: renderCalendar, analytics: renderAnalytics, goals: renderGoals,
    achievements: renderAchievements, aicoach: renderAiCoach, settings: renderSettings
  };
  if (renderMap[page]) renderMap[page]();
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main = document.getElementById('mainContent');
  sidebar.classList.toggle('collapsed');
  main.classList.toggle('collapsed');
  DB.settings.sidebarCollapsed = sidebar.classList.contains('collapsed');
  persist();
}

function toggleSidebarMobile() {
  let overlay = document.querySelector('.sidebar-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.onclick = () => { document.getElementById('sidebar').classList.remove('mobile-open'); overlay.classList.remove('show'); };
    document.body.appendChild(overlay);
  }
  document.getElementById('sidebar').classList.toggle('mobile-open');
  overlay.classList.toggle('show');
}

function toggleNotifPanel() {
  document.getElementById('notifPanel').classList.toggle('hidden');
}
document.addEventListener('click', e => {
  const panel = document.getElementById('notifPanel');
  if (panel && !panel.classList.contains('hidden')) {
    if (!panel.contains(e.target) && !e.target.closest('.notif-btn')) panel.classList.add('hidden');
  }
});

function clearNotifs() {
  DB.notifications = [];
  persist();
  document.getElementById('notifList').innerHTML = '<div class="notif-empty">No notifications</div>';
  document.getElementById('notifDot').classList.remove('show');
}

/* ══════════════════════════════════════════════
   THEME / SETTINGS
══════════════════════════════════════════════ */

function toggleTheme() {
  const newTheme = DB.settings.theme === 'dark' ? 'light' : 'dark';
  setTheme(newTheme);
}
function setTheme(theme) {
  DB.settings.theme = theme;
  persist();
  applyTheme();
}
function applyTheme() {
  document.documentElement.setAttribute('data-theme', DB.settings.theme);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.innerHTML = DB.settings.theme==='dark' ? '<i class="fa fa-moon"></i>' : '<i class="fa fa-sun"></i>';
  ['dark','light'].forEach(t => {
    const b = document.getElementById('themeBtn-'+t);
    if (b) b.classList.toggle('active', DB.settings.theme===t);
  });
}

function setAccent(color, el) {
  DB.settings.accent = color;
  persist();
  applyAccent();
  document.querySelectorAll('.accent-swatch').forEach(s=>s.classList.remove('active'));
  if (el) el.classList.add('active');
}
function applyAccent() {
  document.documentElement.style.setProperty('--accent', DB.settings.accent);
  // derive hover/glow/soft shades
  document.documentElement.style.setProperty('--accent-hover', shadeColor(DB.settings.accent,-12));
  document.documentElement.style.setProperty('--accent-glow', hexToRgba(DB.settings.accent,0.25));
  document.documentElement.style.setProperty('--accent-soft', hexToRgba(DB.settings.accent,0.12));
}
function shadeColor(hex, percent) {
  let R = parseInt(hex.substring(1,3),16), G = parseInt(hex.substring(3,5),16), B = parseInt(hex.substring(5,7),16);
  R = Math.max(0,Math.min(255,R+percent)); G = Math.max(0,Math.min(255,G+percent)); B = Math.max(0,Math.min(255,B+percent));
  return '#'+(R.toString(16).padStart(2,'0'))+(G.toString(16).padStart(2,'0'))+(B.toString(16).padStart(2,'0'));
}
function hexToRgba(hex, a) {
  const R = parseInt(hex.substring(1,3),16), G = parseInt(hex.substring(3,5),16), B = parseInt(hex.substring(5,7),16);
  return `rgba(${R},${G},${B},${a})`;
}

function setFontSize(size) {
  DB.settings.fontSize = parseInt(size);
  persist();
  applyFontSize();
}
function applyFontSize() {
  document.documentElement.style.fontSize = DB.settings.fontSize + 'px';
}

function toggleAutoSave(checked) {
  DB.settings.autoSave = checked;
  persist();
  showToast(checked ? '✅ Auto-save enabled' : '⏸ Auto-save disabled', 'info');
}


/* ══════════════════════════════════════════════
   XP / LEVEL / STREAK / GAMIFICATION
══════════════════════════════════════════════ */

function xpForLevel(level) { return level * 1000; }

function addXP(amount, reason) {
  DB.xp += amount;
  DB.coins += Math.floor(amount / 5);
  let leveledUp = false;
  while (DB.xp >= xpForLevel(DB.level)) {
    DB.xp -= xpForLevel(DB.level);
    DB.level++;
    leveledUp = true;
  }
  persist();
  if (leveledUp) {
    showToast(`🎉 LEVEL UP! You're now Level ${DB.level}!`, 'success');
    checkBadges();
  }
  updateSidebarXP();
  return leveledUp;
}

function updateSidebarXP() {
  const need = xpForLevel(DB.level);
  const pct = Math.min(100, (DB.xp/need)*100);
  const fill = document.getElementById('sidebarXpFill');
  if (fill) fill.style.width = pct + '%';
  const xpText = document.getElementById('sidebarXp');
  if (xpText) xpText.textContent = DB.xp;
  const lvlText = document.getElementById('sidebarLevel');
  if (lvlText) lvlText.textContent = 'Level ' + DB.level;
  document.querySelectorAll('.sidebar-xp-text').forEach(el => {
    if (el.children.length===0) el.innerHTML = `<span id="sidebarXp">${DB.xp}</span> / ${need} XP`;
  });
}

function checkStreak() {
  const today = todayStr();
  const yesterday = daysAgo(1);
  if (DB.lastActiveDate === today) {
    // already counted today
  } else if (DB.lastActiveDate === yesterday) {
    DB.streak++;
    DB.lastActiveDate = today;
  } else if (DB.lastActiveDate === null) {
    DB.streak = 1;
    DB.lastActiveDate = today;
  } else {
    DB.streak = 1;
    DB.lastActiveDate = today;
  }
  if (DB.streak > DB.bestStreak) DB.bestStreak = DB.streak;
  persist();
}

const ALL_BADGES = [
  {id:'first_task', name:'First Step', desc:'Complete your first task', icon:'🎯', check: ()=>DB.tasks.some(t=>t.status==='done')},
  {id:'task_10', name:'Task Master', desc:'Complete 10 tasks', icon:'✅', check: ()=>DB.tasks.filter(t=>t.status==='done').length>=10},
  {id:'task_50', name:'Productivity King', desc:'Complete 50 tasks', icon:'👑', check: ()=>DB.tasks.filter(t=>t.status==='done').length>=50},
  {id:'streak_7', name:'Week Warrior', desc:'7 day streak', icon:'🔥', check: ()=>DB.streak>=7},
  {id:'streak_30', name:'Unstoppable', desc:'30 day streak', icon:'⚡', check: ()=>DB.streak>=30},
  {id:'habit_7', name:'Habit Builder', desc:'Complete a habit 7 days', icon:'🏗️', check: ()=>DB.habits.some(h=>Object.keys(h.logs||{}).length>=7)},
  {id:'level_5', name:'Rising Star', desc:'Reach level 5', icon:'⭐', check: ()=>DB.level>=5},
  {id:'level_10', name:'Ascended', desc:'Reach level 10', icon:'🚀', check: ()=>DB.level>=10},
  {id:'project_1', name:'Builder', desc:'Create your first project', icon:'🔨', check: ()=>DB.projects.length>=1},
  {id:'project_5', name:'Portfolio Pro', desc:'Create 5 projects', icon:'💼', check: ()=>DB.projects.length>=5},
  {id:'goal_1', name:'Goal Setter', desc:'Set your first goal', icon:'🎪', check: ()=>DB.goalsList.length>=1},
  {id:'note_10', name:'Note Taker', desc:'Write 10 notes', icon:'📝', check: ()=>DB.notes.length>=10},
  {id:'cert_1', name:'Certified', desc:'Add your first certificate', icon:'📜', check: ()=>DB.certificates.length>=1},
  {id:'perfect_day', name:'Perfect Day', desc:'100% daily score', icon:'💯', check: ()=>Object.values(DB.dailyScores||{}).some(s=>s>=100)},
  {id:'early_bird', name:'Early Bird', desc:'Login before 8 AM', icon:'🐦', check: ()=>new Date().getHours()<8},
];

function checkBadges() {
  let newBadges = [];
  ALL_BADGES.forEach(b => {
    if (!DB.badges.includes(b.id) && b.check()) {
      DB.badges.push(b.id);
      newBadges.push(b);
    }
  });
  if (newBadges.length) {
    persist();
    newBadges.forEach(b => showToast(`🏆 Badge Unlocked: ${b.name}!`, 'success'));
  }
}

function renderBadgesDefault() { checkBadges(); }

/* ══════════════════════════════════════════════
   DAILY SCORE CALCULATION
══════════════════════════════════════════════ */

function calcDailyScore(dateKey) {
  dateKey = dateKey || todayStr();
  let total = 0, weight = 0;

  // Tasks (weight 40%)
  const dayTasks = DB.tasks.filter(t => t.date === dateKey);
  if (dayTasks.length > 0) {
    const done = dayTasks.filter(t=>t.status==='done').length;
    total += (done/dayTasks.length) * 40;
  }
  weight += 40;

  // Habits (weight 35%)
  const habitsToday = DB.habits.length;
  if (habitsToday > 0) {
    let habitScore = 0;
    DB.habits.forEach(h => {
      const count = (h.logs && h.logs[dateKey]) || 0;
      habitScore += Math.min(1, count / (h.target||1));
    });
    total += (habitScore/habitsToday) * 35;
  }
  weight += 35;

  // Health: water + sleep (weight 15%)
  const health = DB.health[dateKey];
  if (health) {
    let hScore = 0, hCount = 0;
    if (health.water !== undefined) { hScore += Math.min(1, health.water/(health.waterGoal||8)); hCount++; }
    if (health.sleep !== undefined) { hScore += Math.min(1, health.sleep/7); hCount++; }
    if (hCount>0) total += (hScore/hCount) * 15;
  }
  weight += 15;

  // Workout (weight 10%)
  if (DB.workouts[dateKey] && DB.workouts[dateKey].done) total += 10;
  weight += 10;

  const pct = weight>0 ? Math.round((total/weight)*100) : 0;
  DB.dailyScores[dateKey] = pct;
  return pct;
}

function calcWeeklyScore() {
  let sum=0, count=0;
  for (let i=0;i<7;i++) {
    const d = daysAgo(i);
    const score = DB.dailyScores[d] !== undefined ? DB.dailyScores[d] : calcDailyScore(d);
    sum += score; count++;
  }
  return Math.round(sum/count);
}
function calcMonthlyScore() {
  let sum=0, count=0;
  for (let i=0;i<30;i++) {
    const d = daysAgo(i);
    const score = DB.dailyScores[d] !== undefined ? DB.dailyScores[d] : calcDailyScore(d);
    sum += score; count++;
  }
  return Math.round(sum/count);
}

/* ══════════════════════════════════════════════
   TASKS — Full CRUD + Drag/Drop + Pomodoro
══════════════════════════════════════════════ */

let editingTaskId = null;
let currentTaskFilter = 'all';
let currentTaskSearch = '';
let subtaskTemp = [];

function openTaskModal(taskId) {
  editingTaskId = taskId || null;
  subtaskTemp = [];
  document.getElementById('taskTitle').value = '';
  document.getElementById('taskPriority').value = 'medium';
  document.getElementById('taskCategory').value = 'Study';
  document.getElementById('taskDeadline').value = '';
  document.getElementById('taskRepeat').value = 'none';
  document.getElementById('taskNotes').value = '';
  document.getElementById('taskModalTitle').textContent = 'Add Task';

  if (taskId) {
    const t = DB.tasks.find(x=>x.id===taskId);
    if (t) {
      document.getElementById('taskTitle').value = t.title;
      document.getElementById('taskPriority').value = t.priority;
      document.getElementById('taskCategory').value = t.category;
      document.getElementById('taskDeadline').value = t.deadline||'';
      document.getElementById('taskRepeat').value = t.repeat||'none';
      document.getElementById('taskNotes').value = t.notes||'';
      document.getElementById('taskModalTitle').textContent = 'Edit Task';
      subtaskTemp = JSON.parse(JSON.stringify(t.subtasks||[]));
    }
  }
  renderSubtasksList();
  openModal('taskModal');
}

function addSubtask() {
  subtaskTemp.push({id:uid(), title:'', done:false});
  renderSubtasksList();
}
function renderSubtasksList() {
  const wrap = document.getElementById('subtasksList');
  wrap.innerHTML = subtaskTemp.map((s,i) => `
    <div class="subtask-input-row">
      <input type="checkbox" ${s.done?'checked':''} onchange="subtaskTemp[${i}].done=this.checked"/>
      <input type="text" value="${escapeHtml(s.title)}" placeholder="Subtask..." oninput="subtaskTemp[${i}].title=this.value"/>
      <button onclick="removeSubtask(${i})"><i class="fa fa-times"></i></button>
    </div>`).join('');
}
function removeSubtask(i) { subtaskTemp.splice(i,1); renderSubtasksList(); }

function saveTask() {
  const title = document.getElementById('taskTitle');
  if (!title.value.trim()) { markInvalid(title, 'Task title is required'); return; }

  const data = {
    title: title.value.trim(),
    priority: document.getElementById('taskPriority').value,
    category: document.getElementById('taskCategory').value,
    deadline: document.getElementById('taskDeadline').value,
    repeat: document.getElementById('taskRepeat').value,
    notes: document.getElementById('taskNotes').value.trim(),
    subtasks: subtaskTemp.filter(s=>s.title.trim())
  };

  if (editingTaskId) {
    const t = DB.tasks.find(x=>x.id===editingTaskId);
    Object.assign(t, data);
    showToast('✅ Task updated!', 'success');
  } else {
    DB.tasks.push({
      id: uid(), ...data, status:'pending', createdAt: Date.now(), date: todayStr()
    });
    addXP(5, 'task_created');
    showToast('✅ Task added!', 'success');
  }
  persist();
  closeModal('taskModal');
  renderTasks();
  renderDashboard();
}

function deleteTask(id) {
  showConfirm('Delete Task?', 'This task will be permanently removed.', () => {
    DB.tasks = DB.tasks.filter(t=>t.id!==id);
    persist();
    renderTasks();
    renderDashboard();
    showToast('Task deleted', 'info');
  });
}

function setTaskStatus(id, status) {
  const t = DB.tasks.find(x=>x.id===id);
  if (!t) return;
  const wasDone = t.status === 'done';
  t.status = status;
  if (status==='done' && !wasDone) { addXP(10,'task_done'); checkBadges(); }
  persist();
  calcDailyScore();
  renderTasks();
  renderDashboard();
}

function toggleSubtaskInTask(taskId, subId) {
  const t = DB.tasks.find(x=>x.id===taskId);
  if (!t) return;
  const s = t.subtasks.find(x=>x.id===subId);
  if (s) s.done = !s.done;
  persist();
  renderTasks();
}

function filterTasks(filter, btn) {
  currentTaskFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTasks();
}
function searchTasks(val) { currentTaskSearch = val.toLowerCase(); renderTasks(); }

function getFilteredTasks() {
  let list = DB.tasks.slice();
  const today = todayStr();
  if (currentTaskFilter==='today') list = list.filter(t=>t.date===today || t.deadline===today);
  if (currentTaskFilter==='pending') list = list.filter(t=>t.status==='pending');
  if (currentTaskFilter==='done') list = list.filter(t=>t.status==='done');
  if (['high','medium','low'].includes(currentTaskFilter)) list = list.filter(t=>t.priority===currentTaskFilter);
  if (currentTaskSearch) list = list.filter(t=>t.title.toLowerCase().includes(currentTaskSearch));
  return list;
}

function renderTasks() {
  const list = getFilteredTasks();
  const pending = list.filter(t=>t.status==='pending');
  const done = list.filter(t=>t.status==='done');
  const skipped = list.filter(t=>t.status==='skipped');

  document.getElementById('pendingCount').textContent = pending.length;
  document.getElementById('doneCount').textContent = done.length;
  document.getElementById('skippedCount').textContent = skipped.length;

  document.getElementById('taskListPending').innerHTML = pending.map(renderTaskCard).join('') || '<div class="empty-state" style="padding:20px"><i class="fa fa-check"></i><p>No pending tasks</p></div>';
  document.getElementById('taskListDone').innerHTML = done.map(renderTaskCard).join('') || '<div class="empty-state" style="padding:20px"><i class="fa fa-check-circle"></i><p>Nothing done yet</p></div>';
  document.getElementById('taskListSkipped').innerHTML = skipped.map(renderTaskCard).join('') || '<div class="empty-state" style="padding:20px"><i class="fa fa-forward"></i><p>No skipped tasks</p></div>';

  // Progress
  const allToday = DB.tasks.filter(t=>t.date===todayStr());
  const doneToday = allToday.filter(t=>t.status==='done').length;
  const pct = allToday.length ? Math.round((doneToday/allToday.length)*100) : 0;
  document.getElementById('taskProgressText').textContent = `${doneToday} / ${allToday.length} completed`;
  document.getElementById('taskProgressFill').style.width = pct+'%';
  document.getElementById('taskProgressPct').textContent = pct+'%';

  // Sidebar badge
  const badge = document.getElementById('taskBadge');
  if (badge) badge.textContent = DB.tasks.filter(t=>t.status==='pending').length;

  attachDragEvents();
}

function renderTaskCard(t) {
  const subDone = (t.subtasks||[]).filter(s=>s.done).length;
  const subTotal = (t.subtasks||[]).length;
  return `
    <div class="task-card" draggable="true" data-id="${t.id}" ondragstart="dragStart(event)">
      <div class="task-actions">
        <button class="task-action-btn" onclick="openTaskModal('${t.id}')"><i class="fa fa-edit"></i></button>
        <button class="task-action-btn del" onclick="deleteTask('${t.id}')"><i class="fa fa-trash"></i></button>
      </div>
      <div class="task-card-title">
        <input type="checkbox" ${t.status==='done'?'checked':''} onchange="setTaskStatus('${t.id}', this.checked?'done':'pending')" style="width:auto;accent-color:var(--accent)"/>
        <span style="${t.status==='done'?'text-decoration:line-through;opacity:.6':''}">${escapeHtml(t.title)}</span>
      </div>
      <div class="task-card-meta">
        <span class="task-priority ${t.priority}">${t.priority==='high'?'🔴':t.priority==='medium'?'🟡':'🟢'} ${t.priority}</span>
        <span class="task-category">${escapeHtml(t.category)}</span>
        ${t.deadline ? `<span class="task-deadline"><i class="fa fa-calendar"></i> ${t.deadline}</span>` : ''}
        ${subTotal>0 ? `<span class="task-category">${subDone}/${subTotal} subtasks</span>` : ''}
      </div>
      ${t.notes ? `<div style="font-size:12px;color:var(--text-muted);margin-top:6px">${escapeHtml(t.notes)}</div>` : ''}
      ${subTotal>0 ? `<div class="subtask-list">${t.subtasks.map(s=>`
        <div class="subtask-item ${s.done?'done':''}">
          <input type="checkbox" ${s.done?'checked':''} onchange="toggleSubtaskInTask('${t.id}','${s.id}')"/>
          <span>${escapeHtml(s.title)}</span>
        </div>`).join('')}</div>` : ''}
      ${t.status!=='skipped' && t.status!=='done' ? `<button class="task-action-btn" style="margin-top:8px" onclick="setTaskStatus('${t.id}','skipped')" title="Skip"><i class="fa fa-forward"></i></button>` : ''}
    </div>`;
}

// Drag and drop
let draggedTaskId = null;
function dragStart(e) { draggedTaskId = e.target.closest('.task-card').dataset.id; e.target.classList.add('dragging'); }
function allowDrop(e) { e.preventDefault(); }
function dropTask(e, status) {
  e.preventDefault();
  if (draggedTaskId) setTaskStatus(draggedTaskId, status);
  document.querySelectorAll('.task-card').forEach(c=>c.classList.remove('dragging'));
  draggedTaskId = null;
}
function attachDragEvents() {
  document.querySelectorAll('.task-card').forEach(card => {
    card.addEventListener('dragend', ()=>card.classList.remove('dragging'));
  });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ══════════════════════════════════════════════
   POMODORO TIMER
══════════════════════════════════════════════ */

let pomoMinutes = 25;
let pomoSeconds = 0;
let pomoTotalSeconds = 25*60;
let pomoRemaining = 25*60;
let pomoInterval = null;
let pomoRunning = false;
let pomoSessionCount = 1;

function setPomoMode(mins, btn) {
  document.querySelectorAll('.pomo-mode').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const customWrap = document.getElementById('pomoCustomWrap');
  if (mins === 'custom') {
    customWrap.classList.remove('hidden');
    return;
  }
  customWrap.classList.add('hidden');
  pomoMinutes = mins;
  resetPomo();
}
function applyCustomPomo() {
  const val = parseInt(document.getElementById('pomoCustomMin').value);
  if (!val || val<1 || val>240) { showToast('⚠ Enter valid minutes (1-240)','error'); return; }
  pomoMinutes = val;
  resetPomo();
  showToast(`⏱ Timer set to ${val} minutes`,'success');
}

function togglePomo() {
  if (pomoRunning) {
    clearInterval(pomoInterval);
    pomoRunning = false;
    document.getElementById('pomoPlayIcon').className = 'fa fa-play';
  } else {
    pomoRunning = true;
    document.getElementById('pomoPlayIcon').className = 'fa fa-pause';
    pomoInterval = setInterval(tickPomo, 1000);
  }
}
function tickPomo() {
  pomoRemaining--;
  if (pomoRemaining <= 0) {
    clearInterval(pomoInterval);
    pomoRunning = false;
    document.getElementById('pomoPlayIcon').className = 'fa fa-play';
    showToast('🎉 Pomodoro session complete! Take a break.', 'success');
    addXP(15, 'pomodoro');
    pomoSessionCount = pomoSessionCount>=4 ? 1 : pomoSessionCount+1;
    document.getElementById('pomoSession').textContent = pomoSessionCount;
    resetPomo();
    return;
  }
  updatePomoDisplay();
}
function resetPomo() {
  clearInterval(pomoInterval);
  pomoRunning = false;
  document.getElementById('pomoPlayIcon').className = 'fa fa-play';
  pomoTotalSeconds = pomoMinutes*60;
  pomoRemaining = pomoTotalSeconds;
  updatePomoDisplay();
}
function updatePomoDisplay() {
  const m = Math.floor(pomoRemaining/60);
  const s = pomoRemaining%60;
  document.getElementById('pomoTime').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  const circumference = 2*Math.PI*52;
  const progress = 1-(pomoRemaining/pomoTotalSeconds);
  document.getElementById('pomoCircle').style.strokeDasharray = `${circumference*progress} ${circumference}`;
}


/* ══════════════════════════════════════════════
   HABITS
══════════════════════════════════════════════ */

function openHabitModal() {
  document.getElementById('habitName').value = '';
  document.getElementById('habitIcon').value = '💪';
  document.getElementById('habitColor').value = '#6366f1';
  document.getElementById('habitTarget').value = 1;
  openModal('habitModal');
}

function saveHabit() {
  const name = document.getElementById('habitName');
  if (!name.value.trim()) { markInvalid(name,'Habit name is required'); return; }
  DB.habits.push({
    id: uid(), name: name.value.trim(),
    icon: document.getElementById('habitIcon').value,
    color: document.getElementById('habitColor').value,
    target: parseInt(document.getElementById('habitTarget').value)||1,
    logs: {}
  });
  persist();
  closeModal('habitModal');
  renderHabits();
  renderDashboard();
  showToast('✅ Habit added!', 'success');
  addXP(5,'habit_created');
}

function deleteHabit(id) {
  showConfirm('Delete Habit?','This will remove all tracking history for this habit.', () => {
    DB.habits = DB.habits.filter(h=>h.id!==id);
    persist();
    renderHabits();
    renderDashboard();
    showToast('Habit deleted','info');
  });
}

function logHabit(id) {
  const h = DB.habits.find(x=>x.id===id);
  if (!h) return;
  const today = todayStr();
  h.logs = h.logs || {};
  const current = h.logs[today] || 0;
  if (current < h.target) {
    h.logs[today] = current + 1;
    if (h.logs[today] >= h.target) { addXP(8,'habit_done'); checkBadges(); }
  } else {
    h.logs[today] = 0; // toggle off if already complete
  }
  persist();
  calcDailyScore();
  renderHabits();
  renderDashboard();
}

function getHabitStreak(h) {
  let streak = 0;
  let i = 0;
  while (true) {
    const d = daysAgo(i);
    const count = (h.logs && h.logs[d]) || 0;
    if (count >= h.target) { streak++; i++; } else break;
  }
  return streak;
}

function renderHabits() {
  const grid = document.getElementById('habitsGrid');
  if (!grid) return;
  document.getElementById('habitTodayDate').textContent = formatDateHuman(todayStr());

  if (DB.habits.length===0) {
    grid.innerHTML = '<div class="empty-state"><i class="fa fa-fire"></i><p>No habits yet — add your first habit!</p></div>';
    document.getElementById('habitOverallPct').textContent = '0% Complete';
  } else {
    const today = todayStr();
    let totalPct = 0;
    grid.innerHTML = DB.habits.map(h => {
      const count = (h.logs && h.logs[today]) || 0;
      const pct = Math.min(100, (count/h.target)*100);
      totalPct += pct;
      const streak = getHabitStreak(h);
      const isDone = count >= h.target;
      return `
        <div class="habit-card ${isDone?'done':''}">
          <div class="habit-card-top">
            <span class="habit-emoji">${h.icon}</span>
            <div style="flex:1">
              <div class="habit-name">${escapeHtml(h.name)}</div>
              <div class="habit-streak"><i class="fa fa-fire"></i> ${streak} day streak</div>
            </div>
          </div>
          <div class="habit-progress-bar"><div class="habit-progress-fill" style="width:${pct}%;background:${h.color}"></div></div>
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">${count} / ${h.target} ${h.target>1?'times':'time'} today</div>
          <div class="habit-actions">
            <button class="habit-check-btn ${isDone?'done':''}" onclick="logHabit('${h.id}')">
              <i class="fa ${isDone?'fa-check-circle':'fa-circle'}"></i> ${isDone?'Done':'Mark Done'}
            </button>
            <button class="habit-del-btn" onclick="deleteHabit('${h.id}')"><i class="fa fa-trash"></i></button>
          </div>
        </div>`;
    }).join('');
    document.getElementById('habitOverallPct').textContent = Math.round(totalPct/DB.habits.length)+'% Complete';
  }

  renderHabitHeatmap();
}

function renderHabitHeatmap() {
  const wrap = document.getElementById('habitHeatmap');
  if (!wrap) return;
  let html = '';
  for (let i=29;i>=0;i--) {
    const d = daysAgo(i);
    let totalCount=0, totalTarget=0;
    DB.habits.forEach(h => { totalCount += (h.logs&&h.logs[d])||0; totalTarget += h.target; });
    const pct = totalTarget>0 ? totalCount/totalTarget : 0;
    let level = 'l0';
    if (pct>=1) level='l4'; else if (pct>=0.66) level='l3'; else if (pct>=0.33) level='l2'; else if (pct>0) level='l1';
    html += `<div class="heatmap-cell ${level}" title="${d}: ${Math.round(pct*100)}%"></div>`;
  }
  wrap.innerHTML = html;
}

/* ══════════════════════════════════════════════
   HEALTH
══════════════════════════════════════════════ */

function getTodayHealth() {
  const today = todayStr();
  if (!DB.health[today]) DB.health[today] = {};
  return DB.health[today];
}

function calcBMI() {
  const weight = parseFloat(document.getElementById('healthWeight').value);
  const height = parseFloat(document.getElementById('healthHeight').value);
  if (!weight || !height) { showToast('⚠ Enter both weight and height','error'); return; }
  const h = getTodayHealth();
  h.weight = weight; h.height = height;
  const bmi = weight / Math.pow(height/100, 2);
  h.bmi = bmi.toFixed(1);
  let label = 'Normal', color='var(--green)';
  if (bmi<18.5) { label='Underweight'; color='var(--blue)'; }
  else if (bmi>=25 && bmi<30) { label='Overweight'; color='var(--yellow)'; }
  else if (bmi>=30) { label='Obese'; color='var(--red)'; }
  document.getElementById('bmiNum').textContent = bmi.toFixed(1);
  document.getElementById('bmiNum').style.color = color;
  document.getElementById('bmiLabel').textContent = label;
  persist();
  renderWeightChart();
  showToast('✅ BMI calculated and saved', 'success');
}

function addWater() {
  const h = getTodayHealth();
  h.water = (h.water||0)+1;
  h.waterGoal = DB.goalsTargets.water;
  persist();
  renderHealth();
  calcDailyScore();
  if (h.water >= h.waterGoal) { addXP(5,'water_goal'); }
}
function removeWater() {
  const h = getTodayHealth();
  h.water = Math.max(0,(h.water||0)-1);
  persist();
  renderHealth();
}
function setWaterGoal(val) {
  DB.goalsTargets.water = parseInt(val)||8;
  const h = getTodayHealth();
  h.waterGoal = DB.goalsTargets.water;
  persist();
  renderHealth();
}

function calcSleep() {
  const bed = document.getElementById('sleepBed').value;
  const wake = document.getElementById('sleepWake').value;
  if (!bed || !wake) { showToast('⚠ Enter both bedtime and wake time','error'); return; }
  let [bh,bm] = bed.split(':').map(Number);
  let [wh,wm] = wake.split(':').map(Number);
  let bedMin = bh*60+bm, wakeMin = wh*60+wm;
  let diff = wakeMin - bedMin;
  if (diff<0) diff += 24*60;
  const hours = (diff/60).toFixed(1);
  const h = getTodayHealth();
  h.sleep = parseFloat(hours);
  document.getElementById('sleepResult').textContent = `Hours: ${hours}h`;
  persist();
  renderSleepChart();
  calcDailyScore();
  showToast(`✅ Logged ${hours}h sleep`, 'success');
}

function saveNutrition() {
  const protein = parseFloat(document.getElementById('healthProtein').value)||0;
  const calories = parseFloat(document.getElementById('healthCalories').value)||0;
  const h = getTodayHealth();
  h.protein = protein; h.calories = calories;
  persist();
  renderHealth();
  showToast('✅ Nutrition saved', 'success');
}

function saveMeasurements() {
  const h = getTodayHealth();
  h.measurements = {
    chest: document.getElementById('mChest').value,
    waist: document.getElementById('mWaist').value,
    hips: document.getElementById('mHips').value,
    arms: document.getElementById('mArms').value
  };
  persist();
  showToast('✅ Measurements saved', 'success');
}

function saveHealthData() {
  calcBMI();
  showToast('✅ Today\'s health data saved!', 'success');
  addXP(5,'health_logged');
}

function renderHealth() {
  const h = getTodayHealth();
  if (h.weight) document.getElementById('healthWeight').value = h.weight;
  if (h.height) document.getElementById('healthHeight').value = h.height;
  if (h.bmi) {
    document.getElementById('bmiNum').textContent = h.bmi;
    let label='Normal'; const bmi=parseFloat(h.bmi);
    if (bmi<18.5) label='Underweight'; else if (bmi>=25&&bmi<30) label='Overweight'; else if (bmi>=30) label='Obese';
    document.getElementById('bmiLabel').textContent = label;
  }
  if (h.protein) document.getElementById('healthProtein').value = h.protein;
  if (h.calories) document.getElementById('healthCalories').value = h.calories;
  if (h.sleep) document.getElementById('sleepResult').textContent = `Hours: ${h.sleep}h`;

  // Water glasses
  const goal = h.waterGoal || DB.goalsTargets.water;
  const count = h.water || 0;
  document.getElementById('waterCount').textContent = count;
  document.getElementById('waterGoal').textContent = goal;
  const glassesWrap = document.getElementById('waterGlasses');
  glassesWrap.innerHTML = Array.from({length:goal},(_, i) => `
    <div class="water-glass ${i<count?'filled':''}" onclick="setWaterDirect(${i+1})">
      <div class="fill"></div>
    </div>`).join('');

  // Nutrition bars
  const protPct = Math.min(100, ((h.protein||0)/DB.goalsTargets.protein)*100);
  const calPct  = Math.min(100, ((h.calories||0)/DB.goalsTargets.calories)*100);
  document.getElementById('proteinFill').style.width = protPct+'%';
  document.getElementById('proteinPct').textContent = Math.round(protPct)+'%';
  document.getElementById('caloriesFill').style.width = calPct+'%';
  document.getElementById('caloriesPct').textContent = Math.round(calPct)+'%';

  if (h.measurements) {
    document.getElementById('mChest').value = h.measurements.chest||'';
    document.getElementById('mWaist').value = h.measurements.waist||'';
    document.getElementById('mHips').value = h.measurements.hips||'';
    document.getElementById('mArms').value = h.measurements.arms||'';
  }

  renderWeightChart();
  renderSleepChart();
}

function setWaterDirect(num) {
  const h = getTodayHealth();
  h.water = num;
  h.waterGoal = DB.goalsTargets.water;
  persist();
  renderHealth();
  calcDailyScore();
}

/* ══════════════════════════════════════════════
   WORKOUT
══════════════════════════════════════════════ */

function getTodayWorkout() {
  const today = todayStr();
  if (!DB.workouts[today]) DB.workouts[today] = {done:false, exercises:[]};
  return DB.workouts[today];
}

function toggleWorkoutDone() {
  const w = getTodayWorkout();
  w.done = !w.done;
  if (w.done) { addXP(15,'workout_done'); checkBadges(); }
  persist();
  calcDailyScore();
  renderWorkout();
  renderDashboard();
}

function openWorkoutModal() {
  document.getElementById('exerciseName').value='';
  document.getElementById('exerciseSets').value=3;
  document.getElementById('exerciseReps').value=10;
  document.getElementById('exerciseWeight').value='';
  document.getElementById('exerciseDuration').value='';
  document.getElementById('exerciseNotes').value='';
  openModal('workoutModal');
}

function saveExercise() {
  const name = document.getElementById('exerciseName');
  if (!name.value.trim()) { markInvalid(name,'Exercise name is required'); return; }
  const w = getTodayWorkout();
  w.exercises.push({
    id: uid(), name: name.value.trim(),
    sets: document.getElementById('exerciseSets').value,
    reps: document.getElementById('exerciseReps').value,
    weight: document.getElementById('exerciseWeight').value,
    duration: document.getElementById('exerciseDuration').value,
    notes: document.getElementById('exerciseNotes').value
  });
  persist();
  closeModal('workoutModal');
  renderWorkout();
  showToast('✅ Exercise logged!', 'success');
  addXP(5,'exercise_logged');
}

function deleteExercise(id) {
  const w = getTodayWorkout();
  w.exercises = w.exercises.filter(e=>e.id!==id);
  persist();
  renderWorkout();
}

const ROUTINES = {
  push: [{name:'Bench Press',sets:4,reps:8},{name:'Overhead Press',sets:3,reps:10},{name:'Tricep Dips',sets:3,reps:12}],
  pull: [{name:'Pull Ups',sets:4,reps:8},{name:'Barbell Row',sets:3,reps:10},{name:'Bicep Curls',sets:3,reps:12}],
  legs: [{name:'Squats',sets:4,reps:8},{name:'Lunges',sets:3,reps:12},{name:'Calf Raises',sets:3,reps:15}],
  cardio: [{name:'Running',sets:1,reps:1,duration:30},{name:'Jump Rope',sets:3,reps:50},{name:'Cycling',sets:1,reps:1,duration:20}]
};
function loadRoutine(type) {
  const w = getTodayWorkout();
  ROUTINES[type].forEach(ex => {
    w.exercises.push({id:uid(), name:ex.name, sets:ex.sets, reps:ex.reps, weight:'', duration:ex.duration||'', notes:''});
  });
  persist();
  renderWorkout();
  showToast(`✅ ${type} day routine loaded!`, 'success');
}

function renderWorkout() {
  const w = getTodayWorkout();
  document.getElementById('workoutStatusTitle').textContent = w.done ? '✅ Workout completed today!' : 'No workout logged today';
  document.getElementById('workoutStatusSub').textContent = w.done ? `${w.exercises.length} exercises done` : 'Start your session!';
  document.getElementById('workoutToggleBtn').textContent = w.done ? 'Mark as Not Done' : 'Mark as Done';

  const list = document.getElementById('exerciseList');
  if (w.exercises.length===0) {
    list.innerHTML = '<div class="empty-state"><i class="fa fa-dumbbell"></i><p>No exercises logged today</p></div>';
  } else {
    list.innerHTML = w.exercises.map(e => `
      <div class="exercise-item">
        <div class="exercise-item-name">${escapeHtml(e.name)}</div>
        <div class="exercise-item-detail">${e.sets} sets × ${e.reps} reps ${e.weight?`@ ${e.weight}kg`:''} ${e.duration?`(${e.duration} min)`:''}</div>
        <button class="exercise-del" onclick="deleteExercise('${e.id}')"><i class="fa fa-trash"></i></button>
      </div>`).join('');
  }

  renderWorkoutChart();
}


/* ══════════════════════════════════════════════
   DIET
══════════════════════════════════════════════ */

function getTodayMeals() {
  const today = todayStr();
  if (!DB.meals[today]) DB.meals[today] = {breakfast:[],lunch:[],dinner:[],snack:[]};
  return DB.meals[today];
}

let currentMealType = 'breakfast';
function openMealModal(type) {
  currentMealType = type || 'breakfast';
  document.getElementById('mealType').value = currentMealType;
  document.getElementById('mealItemName').value='';
  document.getElementById('mealCalories').value='';
  document.getElementById('mealProtein').value='';
  document.getElementById('mealCarbs').value='';
  document.getElementById('mealFat').value='';
  openModal('mealModal');
}

function saveMealItem() {
  const name = document.getElementById('mealItemName');
  if (!name.value.trim()) { markInvalid(name,'Food item name is required'); return; }
  const type = document.getElementById('mealType').value;
  const meals = getTodayMeals();
  meals[type].push({
    id: uid(), name: name.value.trim(),
    calories: parseFloat(document.getElementById('mealCalories').value)||0,
    protein: parseFloat(document.getElementById('mealProtein').value)||0,
    carbs: parseFloat(document.getElementById('mealCarbs').value)||0,
    fat: parseFloat(document.getElementById('mealFat').value)||0
  });
  persist();
  closeModal('mealModal');
  renderDiet();
  showToast('✅ Item added!', 'success');
}

function deleteMealItem(type, id) {
  const meals = getTodayMeals();
  meals[type] = meals[type].filter(m=>m.id!==id);
  persist();
  renderDiet();
}

function renderDiet() {
  const meals = getTodayMeals();
  let totalCal=0, totalProt=0, totalCarb=0, totalFat=0;

  ['breakfast','lunch','dinner','snack'].forEach(type => {
    const items = meals[type] || [];
    let cal=0;
    items.forEach(i => { cal+=i.calories; totalCal+=i.calories; totalProt+=i.protein; totalCarb+=i.carbs; totalFat+=i.fat; });
    document.getElementById('cal'+capitalize(type)).textContent = Math.round(cal)+' kcal';
    document.getElementById('items'+capitalize(type)).innerHTML = items.length ? items.map(i=>`
      <div class="meal-item">
        <span class="meal-item-name">${escapeHtml(i.name)}</span>
        <span class="meal-item-cal">${i.calories} kcal</span>
        <button class="meal-item-del" onclick="deleteMealItem('${type}','${i.id}')"><i class="fa fa-times"></i></button>
      </div>`).join('') : '';
  });

  document.getElementById('totalCalories').textContent = Math.round(totalCal);
  document.getElementById('totalProtein').textContent = Math.round(totalProt)+'g';
  document.getElementById('totalCarbs').textContent = Math.round(totalCarb)+'g';
  document.getElementById('totalFat').textContent = Math.round(totalFat)+'g';
  document.getElementById('calGoal').textContent = DB.goalsTargets.calories;
  document.getElementById('protGoal').textContent = DB.goalsTargets.protein;
  document.getElementById('carbGoal').textContent = DB.goalsTargets.carbs;
  document.getElementById('fatGoal').textContent = DB.goalsTargets.fat;

  const calPct = Math.min(1, totalCal/DB.goalsTargets.calories);
  const circumference = 2*Math.PI*24;
  document.getElementById('calCircle').style.strokeDasharray = `${circumference*calPct} ${circumference}`;

  // sync to health for daily score
  const h = getTodayHealth();
  h.calories = totalCal; h.protein = totalProt;
}
function capitalize(s) { return s.charAt(0).toUpperCase()+s.slice(1); }

/* ══════════════════════════════════════════════
   STUDY PLANNER
══════════════════════════════════════════════ */

function openSubjectModal() {
  document.getElementById('subjectName').value='';
  document.getElementById('subjectTotal').value=60;
  document.getElementById('subjectAttended').value=0;
  document.getElementById('subjectColor').value='#6366f1';
  openModal('subjectModal');
}
function saveSubject() {
  const name = document.getElementById('subjectName');
  if (!name.value.trim()) { markInvalid(name,'Subject name is required'); return; }
  DB.subjects.push({
    id: uid(), name: name.value.trim(),
    total: parseInt(document.getElementById('subjectTotal').value)||60,
    attended: parseInt(document.getElementById('subjectAttended').value)||0,
    color: document.getElementById('subjectColor').value
  });
  persist();
  closeModal('subjectModal');
  renderStudy();
  showToast('✅ Subject added!', 'success');
}
function deleteSubject(id) {
  showConfirm('Delete Subject?','This will remove the subject and its attendance data.', () => {
    DB.subjects = DB.subjects.filter(s=>s.id!==id);
    persist();
    renderStudy();
    showToast('Subject deleted','info');
  });
}
function markAttendance(id, present) {
  const s = DB.subjects.find(x=>x.id===id);
  if (!s) return;
  s.total++;
  if (present) s.attended++;
  persist();
  renderStudy();
}

function openAssignmentModal() {
  document.getElementById('assignTitle').value='';
  document.getElementById('assignSubject').value='';
  document.getElementById('assignDeadline').value='';
  document.getElementById('assignNotes').value='';
  openModal('assignmentModal');
}
function saveAssignment() {
  const title = document.getElementById('assignTitle');
  const deadline = document.getElementById('assignDeadline');
  if (!title.value.trim()) { markInvalid(title,'Assignment title is required'); return; }
  if (!deadline.value) { markInvalid(deadline,'Deadline is required'); return; }
  DB.assignments.push({
    id: uid(), title: title.value.trim(),
    subject: document.getElementById('assignSubject').value.trim(),
    deadline: deadline.value,
    notes: document.getElementById('assignNotes').value.trim(),
    done: false
  });
  persist();
  closeModal('assignmentModal');
  renderStudy();
  showToast('✅ Assignment added!', 'success');
}
function toggleAssignment(id) {
  const a = DB.assignments.find(x=>x.id===id);
  if (a) { a.done = !a.done; if(a.done) addXP(10,'assignment_done'); }
  persist();
  renderStudy();
}
function deleteAssignment(id) {
  DB.assignments = DB.assignments.filter(a=>a.id!==id);
  persist();
  renderStudy();
}

let studyTimerInterval = null;
let studyTimerSeconds = 0;
let studyActiveSubject = null;

function startStudySession() {
  const subj = document.getElementById('studySubjectSelect').value;
  if (!subj) { showToast('⚠ Select a subject first','error'); return; }
  studyActiveSubject = subj;
  studyTimerSeconds = 0;
  clearInterval(studyTimerInterval);
  studyTimerInterval = setInterval(() => {
    studyTimerSeconds++;
    const h = Math.floor(studyTimerSeconds/3600);
    const m = Math.floor((studyTimerSeconds%3600)/60);
    const s = studyTimerSeconds%60;
    document.getElementById('studyTimerDisplay').textContent =
      `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }, 1000);
  showToast(`📚 Study session started for ${subj}`, 'success');
}
function stopStudySession() {
  if (!studyActiveSubject) { showToast('No active session','info'); return; }
  clearInterval(studyTimerInterval);
  const minutes = Math.round(studyTimerSeconds/60);
  if (minutes > 0) {
    const today = todayStr();
    if (!DB.studyLog[today]) DB.studyLog[today] = {};
    DB.studyLog[today][studyActiveSubject] = (DB.studyLog[today][studyActiveSubject]||0) + minutes;
    persist();
    addXP(Math.min(30,minutes), 'study_session');
    showToast(`✅ Logged ${minutes} min of ${studyActiveSubject}`, 'success');
  }
  studyTimerSeconds = 0;
  studyActiveSubject = null;
  document.getElementById('studyTimerDisplay').textContent = '00:00:00';
  renderStudy();
}

function renderStudy() {
  // Stats
  const today = todayStr();
  const todayLog = DB.studyLog[today] || {};
  const totalMin = Object.values(todayLog).reduce((a,b)=>a+b,0);
  document.getElementById('studyHoursToday').textContent = (totalMin/60).toFixed(1)+'h';
  document.getElementById('studySubjects').textContent = DB.subjects.length;
  document.getElementById('studyAssignments').textContent = DB.assignments.filter(a=>!a.done).length;
  const totalAtt = DB.subjects.reduce((a,s)=>a+s.attended,0);
  const totalCls = DB.subjects.reduce((a,s)=>a+s.total,0);
  document.getElementById('studyAttendance').textContent = totalCls? Math.round((totalAtt/totalCls)*100)+'%' : '0%';

  // Subjects list
  const subjList = document.getElementById('subjectsList');
  if (DB.subjects.length===0) {
    subjList.innerHTML = '<div class="empty-state"><i class="fa fa-book"></i><p>Add your subjects to get started</p></div>';
  } else {
    subjList.innerHTML = DB.subjects.map(s => {
      const pct = s.total ? Math.round((s.attended/s.total)*100) : 0;
      return `
      <div class="subject-item" style="border-left-color:${s.color}">
        <div class="subject-top">
          <span class="subject-name">${escapeHtml(s.name)}</span>
          <span class="subject-attendance">${s.attended}/${s.total} (${pct}%)</span>
          <button class="task-action-btn" onclick="markAttendance('${s.id}',true)" title="Mark Present"><i class="fa fa-check"></i></button>
          <button class="task-action-btn" onclick="markAttendance('${s.id}',false)" title="Mark Absent"><i class="fa fa-times"></i></button>
          <button class="task-action-btn del" onclick="deleteSubject('${s.id}')"><i class="fa fa-trash"></i></button>
        </div>
        <div class="subject-bar"><div class="subject-bar-fill" style="width:${pct}%;background:${s.color}"></div></div>
      </div>`;
    }).join('');
  }

  // Subject select dropdown
  const select = document.getElementById('studySubjectSelect');
  select.innerHTML = '<option value="">Select Subject</option>' +
    DB.subjects.map(s=>`<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('');

  // Assignments
  const assignList = document.getElementById('assignmentList');
  if (DB.assignments.length===0) {
    assignList.innerHTML = '<div class="empty-state"><i class="fa fa-file-alt"></i><p>No assignments yet</p></div>';
  } else {
    const sorted = DB.assignments.slice().sort((a,b)=>new Date(a.deadline)-new Date(b.deadline));
    assignList.innerHTML = sorted.map(a => `
      <div class="assignment-item">
        <input type="checkbox" ${a.done?'checked':''} onchange="toggleAssignment('${a.id}')"/>
        <div class="assignment-info">
          <div class="assignment-title" style="${a.done?'text-decoration:line-through;opacity:.6':''}">${escapeHtml(a.title)}</div>
          <div class="assignment-meta">${escapeHtml(a.subject||'General')} ${a.notes?' — '+escapeHtml(a.notes):''}</div>
        </div>
        <span class="assignment-deadline">${a.deadline}</span>
        <button class="assignment-del" onclick="deleteAssignment('${a.id}')"><i class="fa fa-trash"></i></button>
      </div>`).join('');
  }
}

/* ══════════════════════════════════════════════
   INTERNSHIP — AtomProd
══════════════════════════════════════════════ */

function openInternshipTaskModal() {
  document.getElementById('internTaskTitle').value='';
  document.getElementById('internTaskDeadline').value='';
  document.getElementById('internTaskPriority').value='medium';
  openModal('internshipTaskModal');
}
function saveInternTask() {
  const title = document.getElementById('internTaskTitle');
  if (!title.value.trim()) { markInvalid(title,'Task description is required'); return; }
  DB.internshipTasks.push({
    id: uid(), title: title.value.trim(),
    deadline: document.getElementById('internTaskDeadline').value,
    priority: document.getElementById('internTaskPriority').value,
    done: false
  });
  persist();
  closeModal('internshipTaskModal');
  renderInternship();
  showToast('✅ Internship task added!', 'success');
}
function toggleInternTask(id) {
  const t = DB.internshipTasks.find(x=>x.id===id);
  if (t) { t.done=!t.done; if(t.done){addXP(10,'intern_task');checkBadges();} }
  persist();
  renderInternship();
}
function deleteInternTask(id) {
  DB.internshipTasks = DB.internshipTasks.filter(t=>t.id!==id);
  persist();
  renderInternship();
}

function openCertModal() {
  document.getElementById('certName').value='';
  document.getElementById('certIssuer').value='';
  document.getElementById('certDate').value='';
  document.getElementById('certUrl').value='';
  openModal('certModal');
}
function saveCert() {
  const name = document.getElementById('certName');
  if (!name.value.trim()) { markInvalid(name,'Certificate name is required'); return; }
  DB.certificates.push({
    id: uid(), name: name.value.trim(),
    issuer: document.getElementById('certIssuer').value.trim(),
    date: document.getElementById('certDate').value,
    url: document.getElementById('certUrl').value.trim()
  });
  persist();
  closeModal('certModal');
  renderInternship();
  checkBadges();
  showToast('🎉 Certificate added!', 'success');
}
function deleteCert(id) {
  DB.certificates = DB.certificates.filter(c=>c.id!==id);
  persist();
  renderInternship();
}

const INTERN_ROADMAP = [
  {id:'r1', title:'HTML & CSS Fundamentals'},
  {id:'r2', title:'JavaScript ES6+'},
  {id:'r3', title:'React Basics'},
  {id:'r4', title:'State Management'},
  {id:'r5', title:'API Integration'},
  {id:'r6', title:'Git & GitHub Workflow'},
  {id:'r7', title:'Responsive Design'},
  {id:'r8', title:'Testing Basics'}
];

function toggleInternRoadmap(id) {
  DB.roadmapProgress[id] = !DB.roadmapProgress[id];
  persist();
  renderInternship();
}

function renderInternship() {
  const done = DB.internshipTasks.filter(t=>t.done).length;
  const pending = DB.internshipTasks.filter(t=>!t.done).length;
  const pct = DB.internshipTasks.length ? Math.round((done/DB.internshipTasks.length)*100) : 0;
  document.getElementById('internDone').textContent = done;
  document.getElementById('internPending').textContent = pending;
  document.getElementById('internPct').textContent = pct+'%';
  document.getElementById('internProgressFill').style.width = pct+'%';

  const list = document.getElementById('internshipTaskList');
  if (DB.internshipTasks.length===0) {
    list.innerHTML = '<div class="empty-state"><i class="fa fa-briefcase"></i><p>Add your internship tasks</p></div>';
  } else {
    list.innerHTML = DB.internshipTasks.map(t => `
      <div class="intern-task-item">
        <input type="checkbox" ${t.done?'checked':''} onchange="toggleInternTask('${t.id}')"/>
        <div class="intern-task-info">
          <div class="intern-task-title" style="${t.done?'text-decoration:line-through;opacity:.6':''}">${escapeHtml(t.title)}</div>
          <div class="intern-task-meta">${t.priority} priority ${t.deadline?' • Due '+t.deadline:''}</div>
        </div>
        <button class="intern-task-del" onclick="deleteInternTask('${t.id}')"><i class="fa fa-trash"></i></button>
      </div>`).join('');
  }

  const roadmapList = document.getElementById('internRoadmapList');
  roadmapList.innerHTML = INTERN_ROADMAP.map(r => `
    <div class="roadmap-item ${DB.roadmapProgress[r.id]?'done':''}">
      <input type="checkbox" ${DB.roadmapProgress[r.id]?'checked':''} onchange="toggleInternRoadmap('${r.id}')"/>
      <span>${r.title}</span>
    </div>`).join('');

  const certGrid = document.getElementById('certGrid');
  if (DB.certificates.length===0) {
    certGrid.innerHTML = '<div class="empty-state"><i class="fa fa-certificate"></i><p>Add your certificates</p></div>';
  } else {
    certGrid.innerHTML = DB.certificates.map(c => `
      <div class="cert-card">
        <i class="fa fa-certificate"></i>
        <div class="cert-name">${escapeHtml(c.name)}</div>
        <div class="cert-issuer">${escapeHtml(c.issuer||'—')} ${c.date?' • '+c.date:''}</div>
        ${c.url?`<a href="${escapeHtml(c.url)}" target="_blank" style="font-size:11px;color:var(--accent)">View Certificate</a>`:''}
        <br/><button class="task-action-btn del" style="margin-top:8px" onclick="deleteCert('${c.id}')"><i class="fa fa-trash"></i></button>
      </div>`).join('');
  }
}


/* ══════════════════════════════════════════════
   PROJECTS
══════════════════════════════════════════════ */

let editingProjectId = null;
function openProjectModal(id) {
  editingProjectId = id || null;
  document.getElementById('projectName').value='';
  document.getElementById('projectDesc').value='';
  document.getElementById('projectGithub').value='';
  document.getElementById('projectDemo').value='';
  document.getElementById('projectStatus').value='planning';
  document.getElementById('projectPct').value=0;
  document.getElementById('projectStack').value='';

  if (id) {
    const p = DB.projects.find(x=>x.id===id);
    if (p) {
      document.getElementById('projectName').value = p.name;
      document.getElementById('projectDesc').value = p.desc;
      document.getElementById('projectGithub').value = p.github;
      document.getElementById('projectDemo').value = p.demo;
      document.getElementById('projectStatus').value = p.status;
      document.getElementById('projectPct').value = p.pct;
      document.getElementById('projectStack').value = p.stack;
    }
  }
  openModal('projectModal');
}

function saveProject() {
  const name = document.getElementById('projectName');
  if (!name.value.trim()) { markInvalid(name,'Project name is required'); return; }
  const data = {
    name: name.value.trim(),
    desc: document.getElementById('projectDesc').value.trim(),
    github: document.getElementById('projectGithub').value.trim(),
    demo: document.getElementById('projectDemo').value.trim(),
    status: document.getElementById('projectStatus').value,
    pct: parseInt(document.getElementById('projectPct').value)||0,
    stack: document.getElementById('projectStack').value.trim()
  };
  if (editingProjectId) {
    Object.assign(DB.projects.find(p=>p.id===editingProjectId), data);
    showToast('✅ Project updated!', 'success');
  } else {
    DB.projects.push({id:uid(), ...data, createdAt:Date.now()});
    addXP(20,'project_created');
    checkBadges();
    showToast('🚀 Project added!', 'success');
  }
  persist();
  closeModal('projectModal');
  renderProjects();
}

function deleteProject(id) {
  showConfirm('Delete Project?','This project will be permanently removed.', () => {
    DB.projects = DB.projects.filter(p=>p.id!==id);
    persist();
    renderProjects();
    showToast('Project deleted','info');
  });
}

function renderProjects() {
  const grid = document.getElementById('projectsGrid');
  if (DB.projects.length===0) {
    grid.innerHTML = '<div class="empty-state"><i class="fa fa-code"></i><p>Add your first project!</p></div>';
    return;
  }
  grid.innerHTML = DB.projects.map(p => `
    <div class="project-card">
      <button class="project-del-btn" onclick="deleteProject('${p.id}')"><i class="fa fa-trash"></i></button>
      <div class="project-card-title">${escapeHtml(p.name)}</div>
      <div class="project-card-desc">${escapeHtml(p.desc||'No description')}</div>
      ${p.stack ? `<div class="project-card-stack">${p.stack.split(',').map(t=>`<span class="tech-tag">${escapeHtml(t.trim())}</span>`).join('')}</div>` : ''}
      <div class="project-card-links">
        ${p.github ? `<a class="project-link" href="${escapeHtml(p.github)}" target="_blank"><i class="fab fa-github"></i> GitHub</a>` : ''}
        ${p.demo ? `<a class="project-link" href="${escapeHtml(p.demo)}" target="_blank"><i class="fa fa-external-link-alt"></i> Live Demo</a>` : ''}
      </div>
      <div class="project-card-footer">
        <span class="project-status ${p.status}">${({planning:'🧠 Planning',inprogress:'⚙️ In Progress',done:'✅ Completed',paused:'⏸️ Paused'})[p.status]}</span>
        <span class="project-pct">${p.pct}%</span>
      </div>
      <div class="project-pct-bar"><div class="project-pct-fill" style="width:${p.pct}%"></div></div>
      <button class="btn-secondary small" style="margin-top:12px;width:100%;justify-content:center" onclick="openProjectModal('${p.id}')"><i class="fa fa-edit"></i> Edit</button>
    </div>`).join('');
}

/* ══════════════════════════════════════════════
   LEARNING ROADMAP
══════════════════════════════════════════════ */

const ROADMAP_DATA = {
  HTML: ['Semantic HTML','Forms & Validation','Tables','Accessibility (a11y)','SEO Basics','Meta Tags'],
  CSS: ['Flexbox','Grid','Animations','Responsive Design','CSS Variables','Sass/Scss','Tailwind CSS'],
  JS: ['ES6+ Syntax','DOM Manipulation','Async/Await','Promises','Fetch API','Closures','Event Loop','Array Methods'],
  React: ['Components & Props','Hooks (useState/useEffect)','Context API','React Router','State Management','Custom Hooks','Performance Optimization'],
  Backend: ['Node.js Basics','Express.js','REST APIs','Databases (SQL/NoSQL)','Authentication (JWT)','MongoDB','Deployment']
};

function renderRoadmapDefaults() {
  // ensure roadmap progress keys exist (no-op, lazy init in toggle)
}

function toggleRoadmapTopic(phase, topic) {
  const key = phase+'_'+topic;
  DB.roadmapProgress[key] = !DB.roadmapProgress[key];
  persist();
  renderRoadmap();
}

function renderRoadmap() {
  Object.keys(ROADMAP_DATA).forEach(phase => {
    const topics = ROADMAP_DATA[phase];
    const containerId = 'roadmap'+phase;
    const container = document.getElementById(containerId);
    if (!container) return;
    let doneCount = 0;
    container.innerHTML = topics.map(t => {
      const key = phase+'_'+t;
      const done = !!DB.roadmapProgress[key];
      if (done) doneCount++;
      return `
        <div class="roadmap-topic ${done?'done':''}" onclick="toggleRoadmapTopic('${phase}','${t.replace(/'/g,"\\'")}')">
          <input type="checkbox" ${done?'checked':''} onclick="event.stopPropagation();toggleRoadmapTopic('${phase}','${t.replace(/'/g,"\\'")}')"/>
          <span style="${done?'text-decoration:line-through':''}">${t}</span>
        </div>`;
    }).join('');
    const pct = Math.round((doneCount/topics.length)*100);
    const progEl = document.getElementById(phase.toLowerCase()+'Progress');
    const pctEl = document.getElementById(phase.toLowerCase()+'Pct');
    if (progEl) progEl.style.width = pct+'%';
    if (pctEl) pctEl.textContent = pct+'%';
    if (pct===100 && !DB._roadmapCompleteNotified) checkBadges();
  });
}

/* ══════════════════════════════════════════════
   NOTES
══════════════════════════════════════════════ */

let activeNoteId = null;
let noteSearchQuery = '';

function openNoteModal(id) {
  activeNoteId = id || null;
  document.getElementById('noteTitle').value='';
  document.getElementById('noteTag').value='General';
  document.getElementById('noteContent').innerHTML='';
  document.getElementById('noteModalTitle').textContent = id?'Edit Note':'New Note';
  if (id) {
    const n = DB.notes.find(x=>x.id===id);
    if (n) {
      document.getElementById('noteTitle').value = n.title;
      document.getElementById('noteTag').value = n.tag;
      document.getElementById('noteContent').innerHTML = n.content;
    }
  }
  openModal('noteModal');
}

function formatNote(cmd) { document.execCommand(cmd, false, null); document.getElementById('noteContent').focus(); }
function insertCode() {
  document.execCommand('insertHTML', false, '<code style="background:var(--glass);padding:2px 6px;border-radius:4px;font-family:JetBrains Mono,monospace">code</code>');
}
function insertBullet() { document.execCommand('insertUnorderedList', false, null); }

function saveNote() {
  const title = document.getElementById('noteTitle');
  if (!title.value.trim()) { markInvalid(title,'Note title is required'); return; }
  const data = {
    title: title.value.trim(),
    tag: document.getElementById('noteTag').value,
    content: document.getElementById('noteContent').innerHTML
  };
  if (activeNoteId) {
    Object.assign(DB.notes.find(n=>n.id===activeNoteId), data);
    showToast('✅ Note updated!', 'success');
  } else {
    const newNote = {id:uid(), ...data, createdAt:Date.now()};
    DB.notes.push(newNote);
    activeNoteId = newNote.id;
    addXP(5,'note_created');
    checkBadges();
    showToast('✅ Note saved!', 'success');
  }
  persist();
  closeModal('noteModal');
  renderNotes();
  selectNote(activeNoteId);
}

function deleteNote(id) {
  showConfirm('Delete Note?','This note will be permanently removed.', () => {
    DB.notes = DB.notes.filter(n=>n.id!==id);
    if (activeNoteId===id) activeNoteId=null;
    persist();
    renderNotes();
    showToast('Note deleted','info');
  });
}

function searchNotes(val) { noteSearchQuery = val.toLowerCase(); renderNotes(); }

function selectNote(id) {
  activeNoteId = id;
  renderNotes();
  const n = DB.notes.find(x=>x.id===id);
  const panel = document.getElementById('noteEditorPanel');
  if (!n) {
    panel.innerHTML = '<div class="note-editor-placeholder"><i class="fa fa-sticky-note"></i><p>Select a note or create a new one</p></div>';
    return;
  }
  panel.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span class="note-list-item-tag">${n.tag}</span>
      <div style="display:flex;gap:8px">
        <button class="task-action-btn" onclick="openNoteModal('${n.id}')"><i class="fa fa-edit"></i></button>
        <button class="task-action-btn del" onclick="deleteNote('${n.id}')"><i class="fa fa-trash"></i></button>
      </div>
    </div>
    <div class="note-editor-content-title">${escapeHtml(n.title)}</div>
    <div class="note-editor-body">${n.content}</div>`;
}

function renderNotes() {
  const list = document.getElementById('notesList');
  let notes = DB.notes.slice().sort((a,b)=>b.createdAt-a.createdAt);
  if (noteSearchQuery) notes = notes.filter(n=>n.title.toLowerCase().includes(noteSearchQuery) || n.content.toLowerCase().includes(noteSearchQuery));

  if (notes.length===0) {
    list.innerHTML = '<div class="empty-state"><i class="fa fa-sticky-note"></i><p>No notes yet</p></div>';
    return;
  }
  list.innerHTML = notes.map(n => {
    const preview = n.content.replace(/<[^>]*>/g,'').slice(0,60);
    return `
      <div class="note-list-item ${activeNoteId===n.id?'active':''}" onclick="selectNote('${n.id}')">
        <div class="note-list-item-title">${escapeHtml(n.title)}</div>
        <div class="note-list-item-preview">${escapeHtml(preview)}</div>
        <span class="note-list-item-tag">${n.tag}</span>
      </div>`;
  }).join('');
}

/* ══════════════════════════════════════════════
   CALENDAR
══════════════════════════════════════════════ */

let calCurrentDate = new Date();
let calSelectedDate = todayStr();

function openEventModal() {
  document.getElementById('eventTitle').value='';
  document.getElementById('eventDate').value = calSelectedDate;
  document.getElementById('eventTime').value='';
  document.getElementById('eventType').value='event';
  document.getElementById('eventNotes').value='';
  openModal('eventModal');
}

function saveEvent() {
  const title = document.getElementById('eventTitle');
  const date = document.getElementById('eventDate');
  if (!title.value.trim()) { markInvalid(title,'Event title is required'); return; }
  if (!date.value) { markInvalid(date,'Event date is required'); return; }
  DB.events.push({
    id: uid(), title: title.value.trim(), date: date.value,
    time: document.getElementById('eventTime').value,
    type: document.getElementById('eventType').value,
    notes: document.getElementById('eventNotes').value.trim()
  });
  persist();
  closeModal('eventModal');
  renderCalendar();
  showToast('✅ Event added!', 'success');
}

function deleteEvent(id) {
  DB.events = DB.events.filter(e=>e.id!==id);
  persist();
  renderCalendar();
}

function prevMonth() { calCurrentDate.setMonth(calCurrentDate.getMonth()-1); renderCalendar(); }
function nextMonth() { calCurrentDate.setMonth(calCurrentDate.getMonth()+1); renderCalendar(); }

function selectCalDay(dateStr) {
  calSelectedDate = dateStr;
  renderCalendar();
}

function renderCalendar() {
  const year = calCurrentDate.getFullYear();
  const month = calCurrentDate.getMonth();
  document.getElementById('calMonthYear').textContent =
    calCurrentDate.toLocaleDateString('en-US', {month:'long', year:'numeric'});

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  let html = '';
  // Previous month padding
  for (let i=firstDay-1;i>=0;i--) {
    html += `<div class="cal-day other-month">${daysInPrevMonth-i}</div>`;
  }
  // Current month days
  for (let d=1; d<=daysInMonth; d++) {
    const dStr = year+'-'+String(month+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const isToday = dStr === todayStr();
    const isSelected = dStr === calSelectedDate;
    const dayEvents = DB.events.filter(e=>e.date===dStr);
    let dotsHtml = '';
    if (dayEvents.length) {
      const types = [...new Set(dayEvents.map(e=>e.type))];
      dotsHtml = types.slice(0,1).map(t=>`<span class="event-dot ${t==='deadline'?'deadline':t==='exam'?'exam':''}"></span>`).join('');
    }
    html += `<div class="cal-day ${isToday?'today':''} ${isSelected?'selected':''}" onclick="selectCalDay('${dStr}')">${d}${dotsHtml}</div>`;
  }
  // Next month padding to complete grid
  const totalCells = firstDay + daysInMonth;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let d=1; d<=remaining; d++) html += `<div class="cal-day other-month">${d}</div>`;

  document.getElementById('calendarGrid').innerHTML = html;

  // Selected date events
  document.getElementById('calSelectedDate').textContent = formatDateHuman(calSelectedDate);
  const dayEvents = DB.events.filter(e=>e.date===calSelectedDate);
  const eventsList = document.getElementById('calEventsList');
  if (dayEvents.length===0) {
    eventsList.innerHTML = '<div class="empty-state"><i class="fa fa-calendar"></i><p>No events on this date</p></div>';
  } else {
    const typeColors = {event:'var(--accent)', deadline:'var(--red)', exam:'var(--orange)', reminder:'var(--yellow)'};
    const typeEmoji = {event:'📅', deadline:'⚠️', exam:'📝', reminder:'🔔'};
    eventsList.innerHTML = dayEvents.map(e => `
      <div class="cal-event-item">
        <div class="cal-event-type" style="background:${typeColors[e.type]}"></div>
        <div class="cal-event-info">
          <div class="cal-event-title">${typeEmoji[e.type]} ${escapeHtml(e.title)}</div>
          <div class="cal-event-time">${e.time||'All day'} ${e.notes?' — '+escapeHtml(e.notes):''}</div>
        </div>
        <button class="cal-event-del" onclick="deleteEvent('${e.id}')"><i class="fa fa-trash"></i></button>
      </div>`).join('');
  }
}


/* ══════════════════════════════════════════════
   GOALS
══════════════════════════════════════════════ */

let editingGoalId = null;
function openGoalModal(id) {
  editingGoalId = id || null;
  document.getElementById('goalTitle').value='';
  document.getElementById('goalDesc').value='';
  document.getElementById('goalDeadline').value='';
  document.getElementById('goalCategory').value='Career';
  document.getElementById('goalProgress').value=0;
  if (id) {
    const g = DB.goalsList.find(x=>x.id===id);
    if (g) {
      document.getElementById('goalTitle').value = g.title;
      document.getElementById('goalDesc').value = g.desc;
      document.getElementById('goalDeadline').value = g.deadline;
      document.getElementById('goalCategory').value = g.category;
      document.getElementById('goalProgress').value = g.progress;
    }
  }
  openModal('goalModal');
}
function saveGoal() {
  const title = document.getElementById('goalTitle');
  if (!title.value.trim()) { markInvalid(title,'Goal title is required'); return; }
  const data = {
    title: title.value.trim(),
    desc: document.getElementById('goalDesc').value.trim(),
    deadline: document.getElementById('goalDeadline').value,
    category: document.getElementById('goalCategory').value,
    progress: parseInt(document.getElementById('goalProgress').value)||0
  };
  if (editingGoalId) {
    Object.assign(DB.goalsList.find(g=>g.id===editingGoalId), data);
    showToast('✅ Goal updated!', 'success');
  } else {
    DB.goalsList.push({id:uid(), ...data, createdAt:Date.now()});
    addXP(10,'goal_created');
    checkBadges();
    showToast('🎯 Goal set!', 'success');
  }
  persist();
  closeModal('goalModal');
  renderGoals();
}
function deleteGoal(id) {
  showConfirm('Delete Goal?','This goal will be permanently removed.', () => {
    DB.goalsList = DB.goalsList.filter(g=>g.id!==id);
    persist();
    renderGoals();
    showToast('Goal deleted','info');
  });
}
function renderGoals() {
  const grid = document.getElementById('goalsGrid');
  if (DB.goalsList.length===0) {
    grid.innerHTML = '<div class="empty-state"><i class="fa fa-bullseye"></i><p>Set your first goal!</p></div>';
    return;
  }
  grid.innerHTML = DB.goalsList.map(g => `
    <div class="goal-card">
      <div class="goal-card-header">
        <span class="goal-card-title">${escapeHtml(g.title)}</span>
        <span class="goal-category">${g.category}</span>
      </div>
      <p class="goal-desc">${escapeHtml(g.desc||'No description')}</p>
      ${g.deadline ? `<div class="goal-deadline"><i class="fa fa-calendar"></i> Due ${g.deadline}</div>` : ''}
      <div class="goal-progress-row">
        <div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${g.progress}%"></div></div>
        <span class="goal-pct">${g.progress}%</span>
      </div>
      <div class="goal-actions">
        <button class="goal-edit-btn" onclick="openGoalModal('${g.id}')"><i class="fa fa-edit"></i> Edit</button>
        <button class="goal-del-btn" onclick="deleteGoal('${g.id}')"><i class="fa fa-trash"></i></button>
      </div>
    </div>`).join('');
}

/* ══════════════════════════════════════════════
   ACHIEVEMENTS
══════════════════════════════════════════════ */

function renderAchievements() {
  const need = xpForLevel(DB.level);
  document.getElementById('achieveLevelBadge').textContent = DB.level;
  document.getElementById('achieveLevelTitle').textContent = `Level ${DB.level} — ${getLevelTitle(DB.level)}`;
  document.getElementById('achieveXp').textContent = DB.xp;
  document.getElementById('achieveNextXp').textContent = need;
  document.getElementById('achieveXpFill').style.width = Math.min(100,(DB.xp/need)*100)+'%';
  document.getElementById('achieveCoins').textContent = DB.coins;
  document.getElementById('achieveStreak').textContent = DB.streak;
  document.getElementById('achieveBestStreak').textContent = DB.bestStreak;

  const badgesGrid = document.getElementById('badgesGrid');
  badgesGrid.innerHTML = ALL_BADGES.map(b => {
    const earned = DB.badges.includes(b.id);
    return `
      <div class="badge-item ${earned?'earned':'locked'}">
        <span class="badge-icon">${b.icon}</span>
        <div class="badge-name">${b.name}</div>
        <div class="badge-desc">${b.desc}</div>
      </div>`;
  }).join('');

  // Contribution graph - last 12 weeks
  const contrib = document.getElementById('contribGraph');
  let html = '';
  for (let i=83;i>=0;i--) {
    const d = daysAgo(i);
    const score = DB.dailyScores[d] !== undefined ? DB.dailyScores[d] : 0;
    let level = 'l0';
    if (score>=80) level='l4'; else if (score>=60) level='l3'; else if (score>=30) level='l2'; else if (score>0) level='l1';
    html += `<div class="contrib-cell ${level}" title="${d}: ${score}%"></div>`;
  }
  contrib.innerHTML = html;
}

function getLevelTitle(level) {
  if (level<3) return 'Beginner';
  if (level<6) return 'Rising';
  if (level<10) return 'Achiever';
  if (level<15) return 'Expert';
  if (level<20) return 'Master';
  return 'Legend';
}

/* ══════════════════════════════════════════════
   AI COACH
══════════════════════════════════════════════ */

const MOTIVATIONAL_QUOTES = [
  {text:"Push yourself, because no one else is going to do it for you.", author:"Unknown"},
  {text:"Success is the sum of small efforts repeated day in and day out.", author:"Robert Collier"},
  {text:"The future depends on what you do today.", author:"Mahatma Gandhi"},
  {text:"Discipline is choosing between what you want now and what you want most.", author:"Abraham Lincoln"},
  {text:"Don't watch the clock; do what it does. Keep going.", author:"Sam Levenson"},
  {text:"The only way to do great work is to love what you do.", author:"Steve Jobs"},
  {text:"You don't have to be great to start, but you have to start to be great.", author:"Zig Ziglar"},
  {text:"Hard work beats talent when talent doesn't work hard.", author:"Tim Notke"},
  {text:"Small daily improvements lead to staggering long-term results.", author:"Unknown"},
  {text:"Your only limit is your mind.", author:"Unknown"},
];

function getDailyQuote() {
  const idx = new Date().getDate() % MOTIVATIONAL_QUOTES.length;
  return MOTIVATIONAL_QUOTES[idx];
}

function generateAiTips() {
  const tips = [];
  const today = todayStr();
  const todayTasks = DB.tasks.filter(t=>t.date===today);
  const pendingCount = todayTasks.filter(t=>t.status==='pending').length;
  const w = DB.workouts[today];
  const h = DB.health[today];

  if (pendingCount > 5) {
    tips.push({icon:'fa-exclamation-circle', title:'Task Overload', text:`You have ${pendingCount} pending tasks today. Try prioritizing the top 3 first.`});
  } else if (pendingCount === 0 && todayTasks.length > 0) {
    tips.push({icon:'fa-trophy', title:'All Clear!', text:'You\'ve completed all your tasks today. Amazing work!'});
  } else {
    tips.push({icon:'fa-lightbulb', title:'Stay Focused', text:'Try using the Pomodoro timer to boost your productivity today.'});
  }

  if (!w || !w.done) {
    tips.push({icon:'fa-dumbbell', title:'Move Your Body', text:'You haven\'t worked out today. Even 15 minutes makes a difference!'});
  } else {
    tips.push({icon:'fa-fire', title:'Great Job!', text:'You crushed your workout today. Keep this momentum going!'});
  }

  if (!h || !h.water || h.water < DB.goalsTargets.water) {
    tips.push({icon:'fa-tint', title:'Hydration Check', text:`Drink more water! You're at ${h?h.water||0:0}/${DB.goalsTargets.water} glasses today.`});
  }

  if (DB.streak >= 7) {
    tips.push({icon:'fa-fire', title:'Streak Master', text:`Incredible! You're on a ${DB.streak}-day streak. Don't break the chain!`});
  } else if (DB.streak === 0) {
    tips.push({icon:'fa-seedling', title:'Fresh Start', text:'Start your streak today by completing at least one task or habit.'});
  }

  const habitCount = DB.habits.length;
  const habitsDone = DB.habits.filter(hb => (hb.logs&&hb.logs[today]||0) >= hb.target).length;
  if (habitCount > 0 && habitsDone < habitCount) {
    tips.push({icon:'fa-list-check', title:'Habits Pending', text:`You've completed ${habitsDone}/${habitCount} habits today. Finish strong!`});
  }

  if (DB.subjects.length > 0) {
    const totalAtt = DB.subjects.reduce((a,s)=>a+s.attended,0);
    const totalCls = DB.subjects.reduce((a,s)=>a+s.total,0);
    const attPct = totalCls ? Math.round((totalAtt/totalCls)*100) : 0;
    if (attPct < 75) {
      tips.push({icon:'fa-graduation-cap', title:'Attendance Alert', text:`Your attendance is ${attPct}%. Try to attend more classes to stay above 75%.`});
    }
  }

  return tips.slice(0,6);
}

function refreshTip() {
  const tips = generateAiTips();
  const tip = tips[Math.floor(Math.random()*tips.length)];
  document.getElementById('dashTip').textContent = tip ? tip.text : 'Keep up the great work!';
}

function refreshAllTips() { renderAiCoach(); showToast('🔄 Tips refreshed!','info'); }

function renderAiCoach() {
  const tips = generateAiTips();
  const grid = document.getElementById('aiTipsGrid');
  if (grid) {
    grid.innerHTML = tips.map(t => `
      <div class="ai-tip-card">
        <div class="ai-tip-card-header"><i class="fa ${t.icon}"></i><span>${t.title}</span></div>
        <p>${t.text}</p>
      </div>`).join('');
  }
  renderAiStatsChart();
}

function quickPrompt(text) {
  document.getElementById('aiChatInput').value = text;
  sendAiMessage();
}

function sendAiMessage() {
  const input = document.getElementById('aiChatInput');
  const msg = input.value.trim();
  if (!msg) return;

  const messagesWrap = document.getElementById('aiChatMessages');
  messagesWrap.innerHTML += `
    <div class="ai-msg user">
      <div class="ai-msg-avatar"><i class="fa fa-user"></i></div>
      <div class="ai-msg-text">${escapeHtml(msg)}</div>
    </div>`;
  input.value = '';
  messagesWrap.scrollTop = messagesWrap.scrollHeight;

  setTimeout(() => {
    const response = generateAiResponse(msg);
    messagesWrap.innerHTML += `
      <div class="ai-msg bot">
        <div class="ai-msg-avatar"><i class="fa fa-robot"></i></div>
        <div class="ai-msg-text">${response}</div>
      </div>`;
    messagesWrap.scrollTop = messagesWrap.scrollHeight;
  }, 600);
}

function generateAiResponse(msg) {
  const m = msg.toLowerCase();
  const today = todayStr();

  if (m.includes('focus') || m.includes('today')) {
    const tasks = DB.tasks.filter(t=>t.date===today && t.status==='pending');
    if (tasks.length===0) return "You're all caught up! Consider working on a project or learning something new today. 🎯";
    const top = tasks.sort((a,b)=>({high:0,medium:1,low:2})[a.priority]-({high:0,medium:1,low:2})[b.priority])[0];
    return `Focus on "<strong>${escapeHtml(top.title)}</strong>" first — it's your highest priority task today!`;
  }
  if (m.includes('progress') || m.includes('week')) {
    const weekly = calcWeeklyScore();
    return `Your weekly score is <strong>${weekly}%</strong>. ${weekly>=70?'You\'re doing great! 🔥':'Let\'s push a bit harder this week! 💪'}`;
  }
  if (m.includes('workout') || m.includes('exercise') || m.includes('gym')) {
    return "Try compound movements like squats, deadlifts, and bench press — they build strength fastest. Always warm up for 5-10 mins first! 💪";
  }
  if (m.includes('motivat')) {
    const q = MOTIVATIONAL_QUOTES[Math.floor(Math.random()*MOTIVATIONAL_QUOTES.length)];
    return `"${q.text}" — <em>${q.author}</em><br/>You've got this, ${DB.profile.fname}! 🚀`;
  }
  if (m.includes('study') || m.includes('learn')) {
    return "Try the Pomodoro technique: 25 min focused study, 5 min break. Repeat 4 times then take a longer break. It works wonders!";
  }
  if (m.includes('sleep')) {
    const h = DB.health[today];
    return h && h.sleep ? `You slept ${h.sleep}h last night. ${h.sleep>=7?'Great rest! 😴':'Try to get at least 7 hours for better recovery.'}` : "Log your sleep in the Health tab so I can give you better advice!";
  }
  if (m.includes('diet') || m.includes('eat') || m.includes('food')) {
    return "Focus on protein-rich foods, plenty of veggies, and stay hydrated. Track your meals in the Diet tab for better insights!";
  }
  if (m.includes('streak')) {
    return `Your current streak is <strong>${DB.streak} days</strong>! ${DB.streak>0?'Keep it going — don\'t break the chain!':'Start today by completing a task or habit.'}`;
  }
  if (m.includes('level') || m.includes('xp')) {
    return `You're <strong>Level ${DB.level}</strong> with ${DB.xp} XP. Complete tasks, habits, and workouts to earn more XP and level up!`;
  }
  if (m.includes('hi') || m.includes('hello') || m.includes('hey')) {
    return `Hey ${DB.profile.fname}! 👋 How can I help you grow today?`;
  }
  return "I'm here to help with your fitness, study, and productivity goals! Try asking about your progress, today's focus, or motivation. 💡";
}


/* ══════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════ */

function getGreeting() {
  const h = new Date().getHours();
  if (h<12) return 'Good Morning';
  if (h<17) return 'Good Afternoon';
  if (h<21) return 'Good Evening';
  return 'Good Night';
}
function getGreetingEmoji() {
  const h = new Date().getHours();
  if (h<12) return '🌅';
  if (h<17) return '☀️';
  if (h<21) return '🌇';
  return '🌙';
}

function renderDashboard() {
  const greeting = `${getGreeting()}, ${DB.profile.fname}! ${getGreetingEmoji()}`;
  const greetEl = document.getElementById('dashGreeting');
  if (greetEl) greetEl.textContent = greeting;
  const dateEl = document.getElementById('dashDate');
  if (dateEl) dateEl.textContent = formatDateHuman(todayStr());
  const streakEl = document.getElementById('streakCount');
  if (streakEl) streakEl.textContent = DB.streak;

  // Scores
  const daily = calcDailyScore();
  const weekly = calcWeeklyScore();
  const monthly = calcMonthlyScore();
  setScoreCircle('dailyCircle','dailyScore', daily);
  setScoreCircle('weeklyCircle','weeklyScore', weekly);
  setScoreCircle('monthlyCircle','monthlyScore', monthly);

  const todayTasks = DB.tasks.filter(t=>t.date===todayStr());
  const doneToday = todayTasks.filter(t=>t.status==='done').length;
  const detailEl = document.getElementById('dailyDetail');
  if (detailEl) detailEl.textContent = `${doneToday}/${todayTasks.length} tasks`;

  // XP card
  const need = xpForLevel(DB.level);
  const xpPct = Math.min(100,(DB.xp/need)*100);
  setScoreCircleRaw('xpCircle', xpPct);
  const xpScoreEl = document.getElementById('xpScore');
  if (xpScoreEl) xpScoreEl.textContent = 'Lv.'+DB.level;
  const xpDetailEl = document.getElementById('xpDetail');
  if (xpDetailEl) xpDetailEl.textContent = `${DB.xp} / ${need} XP`;

  // Quick stats
  const habitsDone = DB.habits.filter(h => (h.logs&&h.logs[todayStr()]||0) >= h.target).length;
  const h = DB.health[todayStr()] || {};
  const w = DB.workouts[todayStr()] || {};
  setText('qsTasksDone', doneToday);
  setText('qsHabits', habitsDone);
  setText('qsWater', h.water||0);
  setText('qsSleep', (h.sleep||0)+'h');
  const todayStudy = Object.values(DB.studyLog[todayStr()]||{}).reduce((a,b)=>a+b,0);
  setText('qsCoding', (todayStudy/60).toFixed(1)+'h');
  setText('qsWorkout', w.done?'Yes':'No');

  // Today's tasks list
  const taskListEl = document.getElementById('dashTodayTasks');
  if (taskListEl) {
    if (todayTasks.length===0) {
      taskListEl.innerHTML = '<div class="empty-state"><i class="fa fa-check-circle"></i><p>No tasks yet — add from Tasks page!</p></div>';
    } else {
      taskListEl.innerHTML = todayTasks.slice(0,6).map(t => `
        <div class="dash-task-item ${t.status==='done'?'done':''}">
          <input type="checkbox" ${t.status==='done'?'checked':''} onchange="setTaskStatus('${t.id}', this.checked?'done':'pending')"/>
          <span>${escapeHtml(t.title)}</span>
        </div>`).join('');
    }
  }

  // Quote
  const q = getDailyQuote();
  setText('dashQuote', '"'+q.text+'"');
  setText('dashQuoteAuthor', '— '+q.author);

  // AI Tip
  const tips = generateAiTips();
  if (tips.length) setText('dashTip', tips[0].text);

  // Habits quick grid
  const habitGrid = document.getElementById('dashHabitsGrid');
  if (habitGrid) {
    if (DB.habits.length===0) {
      habitGrid.innerHTML = '<div class="empty-state" style="padding:16px"><i class="fa fa-fire"></i><p>No habits yet</p></div>';
    } else {
      habitGrid.innerHTML = DB.habits.map(hb => {
        const count = (hb.logs&&hb.logs[todayStr()])||0;
        const done = count>=hb.target;
        return `<div class="habit-quick-item ${done?'done':''}" onclick="logHabit('${hb.id}')">${hb.icon} ${escapeHtml(hb.name)}</div>`;
      }).join('');
    }
  }

  renderWeeklyChart();
}

function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }

function setScoreCircle(circleId, scoreId, pct) {
  setScoreCircleRaw(circleId, pct);
  setText(scoreId, pct+'%');
}
function setScoreCircleRaw(circleId, pct) {
  const circle = document.getElementById(circleId);
  if (!circle) return;
  const circumference = 2*Math.PI*34;
  circle.style.strokeDasharray = `${circumference*(pct/100)} ${circumference}`;
}

/* ══════════════════════════════════════════════
   HOME PAGE
══════════════════════════════════════════════ */

function renderHomePage() {
  setText('homeGreeting', `${getGreeting()}, ${DB.profile.fname}! ${getGreetingEmoji()}`);
  setText('homeGoal', DB.profile.goal || 'Set your daily goal in Settings');
  setText('homeStreak', DB.streak);
  setText('homeXP', DB.xp);
  setText('homeTasksDone', DB.tasks.filter(t=>t.status==='done').length);
  setText('homeBadges', DB.badges.length);
  const q = MOTIVATIONAL_QUOTES[Math.floor(Math.random()*MOTIVATIONAL_QUOTES.length)];
  setText('homeQuoteBig', '"'+q.text+'"');
}

function initVideoBg() {
  const video = document.getElementById('homeVideo');
  if (!video) return;
  video.muted = true;
  video.play().catch(()=>{});
}

/* ══════════════════════════════════════════════
   CHARTS — Chart.js
══════════════════════════════════════════════ */

let chartInstances = {};
function destroyChart(id) { if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; } }

function getChartColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    accent: style.getPropertyValue('--accent').trim() || '#6366f1',
    text: style.getPropertyValue('--text-soft').trim() || '#9898b0',
    grid: style.getPropertyValue('--glass-border').trim() || 'rgba(255,255,255,0.08)'
  };
}

function last7Days() { return Array.from({length:7},(_, i)=>daysAgo(6-i)); }
function last7DaysLabels() { return last7Days().map(d => new Date(d+'T00:00:00').toLocaleDateString('en-US',{weekday:'short'})); }

function renderWeeklyChart() {
  const ctx = document.getElementById('weeklyChart');
  if (!ctx || typeof Chart==='undefined') return;
  destroyChart('weeklyChart');
  const colors = getChartColors();
  const days = last7Days();
  const data = days.map(d => DB.dailyScores[d] !== undefined ? DB.dailyScores[d] : calcDailyScore(d));
  chartInstances['weeklyChart'] = new Chart(ctx, {
    type:'bar',
    data: { labels: last7DaysLabels(), datasets:[{ label:'Daily Score %', data, backgroundColor: colors.accent+'cc', borderRadius:6 }] },
    options: { responsive:true, plugins:{legend:{display:false}}, scales:{
      y:{beginAtZero:true,max:100,grid:{color:colors.grid},ticks:{color:colors.text}},
      x:{grid:{display:false},ticks:{color:colors.text}}
    }}
  });
}

function renderWeightChart() {
  const ctx = document.getElementById('weightChart');
  if (!ctx || typeof Chart==='undefined') return;
  destroyChart('weightChart');
  const colors = getChartColors();
  const days = last7Days();
  const data = days.map(d => (DB.health[d] && DB.health[d].weight) || null);
  chartInstances['weightChart'] = new Chart(ctx, {
    type:'line',
    data:{ labels:last7DaysLabels(), datasets:[{label:'Weight (kg)',data,borderColor:colors.accent,backgroundColor:colors.accent+'22',tension:0.4,fill:true,spanGaps:true}]},
    options:{responsive:true,plugins:{legend:{display:false}},scales:{
      y:{grid:{color:colors.grid},ticks:{color:colors.text}}, x:{grid:{display:false},ticks:{color:colors.text}}
    }}
  });
}

function renderSleepChart() {
  const ctx = document.getElementById('sleepChart');
  if (!ctx || typeof Chart==='undefined') return;
  destroyChart('sleepChart');
  const colors = getChartColors();
  const days = last7Days();
  const data = days.map(d => (DB.health[d] && DB.health[d].sleep) || 0);
  chartInstances['sleepChart'] = new Chart(ctx, {
    type:'bar',
    data:{ labels:last7DaysLabels(), datasets:[{label:'Sleep (h)',data,backgroundColor:'#a78bfacc',borderRadius:6}]},
    options:{responsive:true,plugins:{legend:{display:false}},scales:{
      y:{beginAtZero:true,grid:{color:colors.grid},ticks:{color:colors.text}}, x:{grid:{display:false},ticks:{color:colors.text}}
    }}
  });
}

function renderWorkoutChart() {
  const ctx = document.getElementById('workoutChart');
  if (!ctx || typeof Chart==='undefined') return;
  destroyChart('workoutChart');
  const colors = getChartColors();
  const days = last7Days();
  const data = days.map(d => (DB.workouts[d] && DB.workouts[d].done) ? 1 : 0);
  chartInstances['workoutChart'] = new Chart(ctx, {
    type:'bar',
    data:{ labels:last7DaysLabels(), datasets:[{label:'Workout Done',data,backgroundColor:'#fbbf24cc',borderRadius:6}]},
    options:{responsive:true,plugins:{legend:{display:false}},scales:{
      y:{beginAtZero:true,max:1,ticks:{stepSize:1,color:colors.text},grid:{color:colors.grid}}, x:{grid:{display:false},ticks:{color:colors.text}}
    }}
  });
}

function renderAiStatsChart() {
  const ctx = document.getElementById('aiStatsChart');
  if (!ctx || typeof Chart==='undefined') return;
  destroyChart('aiStatsChart');
  const colors = getChartColors();
  const days = last7Days();
  const data = days.map(d => DB.dailyScores[d] !== undefined ? DB.dailyScores[d] : calcDailyScore(d));
  chartInstances['aiStatsChart'] = new Chart(ctx, {
    type:'line',
    data:{ labels:last7DaysLabels(), datasets:[{label:'Performance %',data,borderColor:colors.accent,backgroundColor:colors.accent+'22',tension:0.4,fill:true}]},
    options:{responsive:true,plugins:{legend:{display:false}},scales:{
      y:{beginAtZero:true,max:100,grid:{color:colors.grid},ticks:{color:colors.text}}, x:{grid:{display:false},ticks:{color:colors.text}}
    }}
  });
}

function renderAnalytics() {
  setText('anaTotalTasks', DB.tasks.filter(t=>t.status==='done').length);
  let habitTotal=0; DB.habits.forEach(h=>{ habitTotal += Object.values(h.logs||{}).filter(c=>c>=h.target).length; });
  setText('anaTotalHabits', habitTotal);
  let studyMin=0; Object.values(DB.studyLog).forEach(day=>{ Object.values(day).forEach(m=>studyMin+=m); });
  setText('anaStudyHours', (studyMin/60).toFixed(1)+'h');
  setText('anaWorkoutDays', Object.values(DB.workouts).filter(w=>w.done).length);

  const colors = getChartColors();
  const days = last7Days();
  const labels = last7DaysLabels();

  // Task completion chart
  destroyChart('anaTaskChart');
  const taskData = days.map(d => DB.tasks.filter(t=>t.date===d && t.status==='done').length);
  const c1 = document.getElementById('anaTaskChart');
  if (c1 && typeof Chart!=='undefined') chartInstances['anaTaskChart'] = new Chart(c1, {
    type:'bar', data:{labels,datasets:[{label:'Tasks Done',data:taskData,backgroundColor:colors.accent+'cc',borderRadius:6}]},
    options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:colors.grid},ticks:{color:colors.text}},x:{grid:{display:false},ticks:{color:colors.text}}}}
  });

  // Habit performance
  destroyChart('anaHabitChart');
  const c2 = document.getElementById('anaHabitChart');
  if (c2 && typeof Chart!=='undefined') chartInstances['anaHabitChart'] = new Chart(c2, {
    type:'doughnut',
    data:{ labels: DB.habits.map(h=>h.name), datasets:[{
      data: DB.habits.map(h => Object.values(h.logs||{}).filter(c=>c>=h.target).length || 0.01),
      backgroundColor:['#6366f1','#a78bfa','#f97316','#10b981','#fbbf24','#ef4444','#38bdf8','#f472b6']
    }]},
    options:{responsive:true,plugins:{legend:{position:'bottom',labels:{color:colors.text,boxWidth:10,font:{size:10}}}}}
  });

  // Study vs coding
  destroyChart('anaStudyChart');
  const studyData = days.map(d => Object.values(DB.studyLog[d]||{}).reduce((a,b)=>a+b,0)/60);
  const c3 = document.getElementById('anaStudyChart');
  if (c3 && typeof Chart!=='undefined') chartInstances['anaStudyChart'] = new Chart(c3, {
    type:'line', data:{labels,datasets:[{label:'Hours',data:studyData,borderColor:'#10b981',backgroundColor:'#10b98122',tension:0.4,fill:true}]},
    options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,grid:{color:colors.grid},ticks:{color:colors.text}},x:{grid:{display:false},ticks:{color:colors.text}}}}
  });

  // Health overview
  destroyChart('anaHealthChart');
  const waterData = days.map(d => (DB.health[d]&&DB.health[d].water)||0);
  const sleepData = days.map(d => (DB.health[d]&&DB.health[d].sleep)||0);
  const c4 = document.getElementById('anaHealthChart');
  if (c4 && typeof Chart!=='undefined') chartInstances['anaHealthChart'] = new Chart(c4, {
    type:'bar', data:{labels,datasets:[
      {label:'Water (glasses)',data:waterData,backgroundColor:'#38bdf8cc',borderRadius:6},
      {label:'Sleep (h)',data:sleepData,backgroundColor:'#a78bfacc',borderRadius:6}
    ]},
    options:{responsive:true,plugins:{legend:{labels:{color:colors.text}}},scales:{y:{beginAtZero:true,grid:{color:colors.grid},ticks:{color:colors.text}},x:{grid:{display:false},ticks:{color:colors.text}}}}
  });

  // Monthly progress
  destroyChart('anaMonthChart');
  const monthDays = Array.from({length:30},(_, i)=>daysAgo(29-i));
  const monthData = monthDays.map(d => DB.dailyScores[d] !== undefined ? DB.dailyScores[d] : 0);
  const monthLabels = monthDays.map(d => new Date(d+'T00:00:00').getDate());
  const c5 = document.getElementById('anaMonthChart');
  if (c5 && typeof Chart!=='undefined') chartInstances['anaMonthChart'] = new Chart(c5, {
    type:'line', data:{labels:monthLabels,datasets:[{label:'Score %',data:monthData,borderColor:colors.accent,backgroundColor:colors.accent+'15',tension:0.3,fill:true,pointRadius:2}]},
    options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,max:100,grid:{color:colors.grid},ticks:{color:colors.text}},x:{grid:{display:false},ticks:{color:colors.text}}}}
  });

  // Score breakdown pie
  destroyChart('anaPieChart');
  const doneT = DB.tasks.filter(t=>t.status==='done').length;
  const pendT = DB.tasks.filter(t=>t.status==='pending').length;
  const skipT = DB.tasks.filter(t=>t.status==='skipped').length;
  const c6 = document.getElementById('anaPieChart');
  if (c6 && typeof Chart!=='undefined') chartInstances['anaPieChart'] = new Chart(c6, {
    type:'pie', data:{labels:['Done','Pending','Skipped'],datasets:[{data:[doneT||0.01,pendT||0.01,skipT||0.01],backgroundColor:['#10b981','#fbbf24','#ef4444']}]},
    options:{responsive:true,plugins:{legend:{position:'bottom',labels:{color:colors.text}}}}
  });
}


/* ══════════════════════════════════════════════
   SETTINGS / PROFILE
══════════════════════════════════════════════ */

function updateProfileUI() {
  const initials = (DB.profile.fname||'U').charAt(0).toUpperCase();
  ['sidebarAvatar','topbarAvatar','profilePhoto'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (DB.profile.photo) el.innerHTML = `<img src="${DB.profile.photo}" alt="avatar"/>`;
    else el.textContent = initials;
  });
  setText('sidebarName', DB.profile.fname);
  setText('topbarUsername', DB.profile.fname);
}

function uploadPhoto(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2*1024*1024) { showToast('⚠ Image must be under 2MB','error'); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    DB.profile.photo = ev.target.result;
    persist();
    updateProfileUI();
    showToast('✅ Photo updated!', 'success');
  };
  reader.readAsDataURL(file);
}

function saveProfile() {
  const fname = document.getElementById('settingFname');
  const email = document.getElementById('settingEmail');
  if (!fname.value.trim()) { markInvalid(fname,'First name is required'); return; }
  if (email.value.trim() && !isValidEmail(email.value.trim())) { markInvalid(email,'Enter a valid email'); return; }

  DB.profile.fname = fname.value.trim();
  DB.profile.lname = document.getElementById('settingLname').value.trim();
  DB.profile.username = document.getElementById('settingUser').value.trim();
  DB.profile.email = email.value.trim();
  DB.profile.age = parseInt(document.getElementById('settingAge').value)||DB.profile.age;
  DB.profile.weight = parseFloat(document.getElementById('settingWeight').value)||DB.profile.weight;
  DB.profile.goal = document.getElementById('settingGoal').value.trim();

  // Sync with user record
  const u = DB.users.find(x=>x.id===DB.currentUserId);
  if (u) { u.fname=DB.profile.fname; u.lname=DB.profile.lname; u.email=DB.profile.email||u.email; }

  persist();
  updateProfileUI();
  renderDashboard();
  renderHomePage();
  showToast('✅ Profile saved!', 'success');
}

function saveGoals() {
  DB.goalsTargets.calories = parseInt(document.getElementById('goalCalories').value)||2200;
  DB.goalsTargets.protein  = parseInt(document.getElementById('goalProtein').value)||150;
  DB.goalsTargets.carbs    = parseInt(document.getElementById('goalCarbs').value)||250;
  DB.goalsTargets.fat      = parseInt(document.getElementById('goalFat').value)||70;
  DB.goalsTargets.water    = parseInt(document.getElementById('goalWater').value)||8;
  DB.goalsTargets.sleep    = parseFloat(document.getElementById('goalSleep').value)||7;
  persist();
  renderDiet();
  renderHealth();
  showToast('✅ Goals updated!', 'success');
}

function changePassword() {
  const curr = document.getElementById('currPass');
  const newP = document.getElementById('newPass');
  const conf = document.getElementById('confPass');
  [curr,newP,conf].forEach(el=>{el.style.borderColor='';el.style.boxShadow='';});

  const u = DB.users.find(x=>x.id===DB.currentUserId);
  if (!u) { showToast('⚠ User not found','error'); return; }
  if (!curr.value) { markInvalid(curr,'Enter current password'); return; }
  if (curr.value !== u.pass) { markInvalid(curr,'Current password is incorrect'); return; }
  if (!newP.value || newP.value.length<6) { markInvalid(newP,'New password must be at least 6 characters'); return; }
  if (newP.value !== conf.value) { markInvalid(conf,'Passwords do not match'); return; }

  u.pass = newP.value;
  persist();
  [curr,newP,conf].forEach(el=>el.value='');
  showToast('✅ Password changed successfully!', 'success');
}

function renderSettings() {
  document.getElementById('settingFname').value = DB.profile.fname||'';
  document.getElementById('settingLname').value = DB.profile.lname||'';
  document.getElementById('settingUser').value = DB.profile.username||'';
  document.getElementById('settingEmail').value = DB.profile.email||'';
  document.getElementById('settingAge').value = DB.profile.age||'';
  document.getElementById('settingWeight').value = DB.profile.weight||'';
  document.getElementById('settingGoal').value = DB.profile.goal||'';

  document.getElementById('goalCalories').value = DB.goalsTargets.calories;
  document.getElementById('goalProtein').value = DB.goalsTargets.protein;
  document.getElementById('goalCarbs').value = DB.goalsTargets.carbs;
  document.getElementById('goalFat').value = DB.goalsTargets.fat;
  document.getElementById('goalWater').value = DB.goalsTargets.water;
  document.getElementById('goalSleep').value = DB.goalsTargets.sleep;

  document.getElementById('autoSaveToggle').checked = DB.settings.autoSave;
  document.getElementById('fontSizeSelect').value = DB.settings.fontSize;

  // Accent active state
  document.querySelectorAll('.accent-swatch').forEach(s => {
    s.classList.toggle('active', s.dataset.color===DB.settings.accent);
  });
}

/* ══════════════════════════════════════════════
   DATA EXPORT / IMPORT / CLEAR
══════════════════════════════════════════════ */

function exportData(format) {
  if (format === 'json') {
    const blob = new Blob([JSON.stringify(DB,null,2)], {type:'application/json'});
    downloadBlob(blob, `ascend-os-backup-${todayStr()}.json`);
    showToast('✅ JSON exported!', 'success');
  } else if (format === 'csv') {
    let csv = 'Type,Title,Status,Date,Category\n';
    DB.tasks.forEach(t => csv += `Task,"${t.title}",${t.status},${t.date},${t.category}\n`);
    DB.habits.forEach(h => csv += `Habit,"${h.name}",-,-,Habit\n`);
    DB.projects.forEach(p => csv += `Project,"${p.name}",${p.status},-,${p.pct}%\n`);
    DB.goalsList.forEach(g => csv += `Goal,"${g.title}",${g.progress}%,${g.deadline},${g.category}\n`);
    const blob = new Blob([csv], {type:'text/csv'});
    downloadBlob(blob, `ascend-os-data-${todayStr()}.csv`);
    showToast('✅ CSV exported!', 'success');
  } else if (format === 'pdf') {
    exportReport('pdf');
  }
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportReport(format) {
  // Simple printable HTML report -> browser print to PDF
  const daily = calcDailyScore(), weekly = calcWeeklyScore(), monthly = calcMonthlyScore();
  const win = window.open('', '_blank');
  win.document.write(`
    <html><head><title>Ascend OS Report</title>
    <style>
      body{font-family:Arial,sans-serif;padding:40px;color:#1a1a2e;}
      h1{color:#6366f1} h2{border-bottom:2px solid #6366f1;padding-bottom:8px;margin-top:30px}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{padding:8px 12px;border:1px solid #ddd;text-align:left;font-size:13px}
      th{background:#6366f1;color:#fff}
      .stat{display:inline-block;margin:10px 20px 10px 0;padding:14px 20px;background:#f0f0f8;border-radius:8px}
      .stat b{font-size:24px;display:block;color:#6366f1}
    </style></head><body>
    <h1>🚀 Ascend OS — Progress Report</h1>
    <p>Generated for <strong>${DB.profile.fname} ${DB.profile.lname}</strong> on ${formatDateHuman(todayStr())}</p>
    <div class="stat"><b>${daily}%</b>Daily Score</div>
    <div class="stat"><b>${weekly}%</b>Weekly Score</div>
    <div class="stat"><b>${monthly}%</b>Monthly Score</div>
    <div class="stat"><b>Lv.${DB.level}</b>Current Level</div>
    <div class="stat"><b>${DB.streak}</b>Day Streak</div>
    <h2>Tasks Summary</h2>
    <table><tr><th>Title</th><th>Status</th><th>Priority</th><th>Category</th><th>Date</th></tr>
    ${DB.tasks.map(t=>`<tr><td>${t.title}</td><td>${t.status}</td><td>${t.priority}</td><td>${t.category}</td><td>${t.date}</td></tr>`).join('')}
    </table>
    <h2>Habits</h2>
    <table><tr><th>Habit</th><th>Target</th><th>Total Days Completed</th></tr>
    ${DB.habits.map(h=>`<tr><td>${h.name}</td><td>${h.target}</td><td>${Object.values(h.logs||{}).filter(c=>c>=h.target).length}</td></tr>`).join('')}
    </table>
    <h2>Projects</h2>
    <table><tr><th>Name</th><th>Status</th><th>Completion</th></tr>
    ${DB.projects.map(p=>`<tr><td>${p.name}</td><td>${p.status}</td><td>${p.pct}%</td></tr>`).join('')}
    </table>
    <h2>Goals</h2>
    <table><tr><th>Goal</th><th>Category</th><th>Progress</th><th>Deadline</th></tr>
    ${DB.goalsList.map(g=>`<tr><td>${g.title}</td><td>${g.category}</td><td>${g.progress}%</td><td>${g.deadline}</td></tr>`).join('')}
    </table>
    <script>window.print();</script>
    </body></html>`);
  win.document.close();
}

function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const imported = JSON.parse(ev.target.result);
      showConfirm('Import Data?', 'This will replace ALL your current data with the imported file. This cannot be undone.', () => {
        DB = Object.assign(JSON.parse(JSON.stringify(DEFAULT_DB)), imported);
        persist();
        showToast('✅ Data imported successfully! Reloading...', 'success');
        setTimeout(()=>location.reload(), 1200);
      });
    } catch (err) {
      showToast('⚠ Invalid JSON file', 'error');
    }
  };
  reader.readAsText(file);
}

function confirmClearData() {
  showConfirm('Clear All Data?', 'This will permanently delete ALL your tasks, habits, notes, and progress. This cannot be undone!', () => {
    const keepUsers = DB.users;
    const keepCurrentUser = DB.currentUserId;
    DB = JSON.parse(JSON.stringify(DEFAULT_DB));
    DB.users = keepUsers;
    DB.currentUserId = keepCurrentUser;
    persist();
    showToast('🗑 All data cleared. Reloading...', 'info');
    setTimeout(()=>location.reload(), 1200);
  });
}

/* ══════════════════════════════════════════════
   INIT ON PAGE LOAD
══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initAuthCanvas();
  applyTheme();
  applyAccent();
  applyFontSize();

  // Auto-login if session exists
  if (DB.currentUserId) {
    const u = DB.users.find(x=>x.id===DB.currentUserId);
    if (u) {
      DB.profile.fname = u.fname; DB.profile.lname = u.lname;
      DB.profile.username = u.username; DB.profile.email = u.email; DB.profile.age = u.age;
      enterApp();
    }
  }

  // Pomodoro initial display
  updatePomoDisplay();

  // Apply collapsed sidebar state
  if (DB.settings.sidebarCollapsed) {
    document.getElementById('sidebar')?.classList.add('collapsed');
    document.getElementById('mainContent')?.classList.add('collapsed');
  }

  // Warn before leaving with unsaved auto-save off
  window.addEventListener('beforeunload', () => { persist(); });
});