const API_BASE_URL = "/api";

// --- INITIALIZATION ---
let goals = JSON.parse(localStorage.getItem('consisto_data')) || [];
let archivedGoals = JSON.parse(localStorage.getItem('consisto_archive')) || [];
let todos = JSON.parse(localStorage.getItem('consisto_todos')) || [];
let standaloneNotes = JSON.parse(localStorage.getItem('consisto_standalone_notes')) || [];
let currentGoalId = null;
let currentNoteId = null;

// --- 1. SESSION & OFFLINE BOOT ---
window.onload = () => {
    // Persistent Login Check
    const session = localStorage.getItem('consisto_session');
    if (session) {
        showPage('page-dashboard');
    } else {
        showPage('page-home');
    }

    sanitizeHistory();
    checkAllCycles();
    renderDashboard();
    renderArchive();
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').then(reg => {
            console.log('Consisto Service Worker registered.');
        }).catch(err => {
            console.log('Service Worker registration failed:', err);
        });
    });
}

// --- 2. THE SANITIZATION & ID ENGINE ---
function generateCycleId(freq, date) {
    const d = new Date(date);
    if (freq === 'daily') return `Daily-${d.getFullYear()}-${d.getMonth() + 1}`;
    if (freq === 'weekly') {
        const start = new Date(d.setDate(d.getDate() - d.getDay() + 1));
        return `Weekly-${start.toLocaleDateString().replace(/\//g, '-')}`;
    }
    if (freq === 'monthly') return `Monthly-${d.getFullYear()}`;
    if (freq === 'yearly') return `Decade-${Math.floor(d.getFullYear() / 10) * 10}`;
    return `Cycle-${freq}-${d.getFullYear()}`;
}

function sanitizeHistory() {
    let changed = false;
    goals.forEach(goal => {
        if (!goal.cycles) goal.cycles = [];
        const latestId = generateCycleId(goal.freq, new Date());
        const originalCount = goal.cycles.length;
        goal.cycles = goal.cycles.filter(c => c.id === latestId);
        if (goal.cycles.length !== originalCount) changed = true;
    });
    if (changed) {
        localStorage.setItem('consisto_data', JSON.stringify(goals));
        syncDataWithCloud();
    }
}

// --- 3. AUTH, SESSION & NAVIGATION ---
async function handleAuth() {
    const userField = document.getElementById('username');
    const passField = document.getElementById('passcode');
    const username = userField?.value.trim();
    const passcode = passField?.value;
    
    if (!username || !passcode) return alert("Enter both Username and Passcode.");

    try {
        const res = await fetch(`${API_BASE_URL}/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, passcode })
        });

        if (!res.ok) throw new Error((await res.json()).detail || "Auth failed.");
        const result = await res.json();
        
        localStorage.setItem('consisto_session', result.username);
        goals = result.data.goals || [];
        archivedGoals = result.data.archived_goals || [];
        todos = result.data.todos || [];
        standaloneNotes = result.data.standalone_notes || [];

        // Seed current session's cache state
        localStorage.setItem('consisto_data', JSON.stringify(goals));
        localStorage.setItem('consisto_archive', JSON.stringify(archivedGoals));
        localStorage.setItem('consisto_todos', JSON.stringify(todos));
        localStorage.setItem('consisto_standalone_notes', JSON.stringify(standaloneNotes));

        showPage('page-dashboard');
    } catch (err) {
        alert(err.message);
    }
}

function handleLogout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem('consisto_session');
        showPage('page-home');
    }
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');

    // Toggle Logout button visibility based on page
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.style.display = (pageId !== 'page-home' && pageId !== 'page-login') ? 'inline-block' : 'none';
    }

    if (pageId === 'page-dashboard') {
        sanitizeHistory();
        checkAllCycles();
        renderDashboard();
        renderArchive();
    }
    if (pageId === 'page-notes') renderNotesList();
    if (pageId === 'page-todo') renderTodoList();
}

// --- 4. THEME & DARK MODE ---
function toggleDarkMode() {
    const body = document.body;
    const currentMode = body.getAttribute('data-mode') || 'light';
    const nextMode = currentMode === 'light' ? 'dark' : 'light';
    body.setAttribute('data-mode', nextMode);
}

function toggleTheme() {
    const body = document.body;
    const next = body.getAttribute('data-theme') === 'blue' ? 'pink' : 'blue';
    body.setAttribute('data-theme', next);
    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) themeBtn.innerText = next === 'blue' ? '🌙 Dark Rose' : '🌌 Deep Space';
}

// --- 5. HABIT ENGINE (CUSTOM FREQ & PERCENTAGE) ---
function toggleCustomFreqInput(selectId, containerId) {
    const val = document.getElementById(selectId).value;
    document.getElementById(containerId).style.display = val === 'custom' ? 'block' : 'none';
}

function checkAllCycles() {
    const now = new Date();
    let updated = false;
    goals.forEach(goal => {
        if (!goal.cycles) goal.cycles = [];
        const latestId = generateCycleId(goal.freq, now);
        if (!goal.cycles.some(c => c.id === latestId)) {
            goal.cycles.unshift({ id: latestId, checks: {} });
            updated = true;
        }
    });
    if (updated) {
        localStorage.setItem('consisto_data', JSON.stringify(goals));
        syncDataWithCloud();
    }
}

function addGoal() {
    const title = document.getElementById('goalTitle').value.trim();
    const freq = document.getElementById('goalFreq').value;
    let customDays = null;

    if (freq === 'custom') {
        customDays = parseInt(document.getElementById('customDays').value);
        if (!customDays || customDays < 1) {
            alert("Please enter a valid number of days.");
            return;
        }
    }

    if (!title) return;
    goals.push({ id: Date.now(), title, freq, customDays, cycles: [] });
    checkAllCycles();
    closeModal('task-modal');
    renderDashboard();
    syncDataWithCloud();
}

function renderDashboard() {
    const container = document.getElementById('goals-container');
    container.innerHTML = '';
    document.getElementById('active-count').innerText = goals.length;
    
    goals.forEach(goal => {
        const div = document.createElement('div');
        div.className = 'goal-card';
        div.innerHTML = `
            <div onclick="viewGoal(${goal.id})" style="cursor:pointer; flex-grow:1;">
                <strong style="font-size:1.2rem;">${goal.title}</strong>
                <small style="display:block; opacity:0.6;">${goal.freq.toUpperCase()}${goal.customDays ? ' ('+goal.customDays+' Days)' : ''}</small>
            </div>
            <button class="delete-task-btn" onclick="deleteGoal(${goal.id}, event)">Delete</button>
        `;
        container.appendChild(div);
    });
}

function updateProgress(goal) {
    const cycle = goal.cycles[0];
    if (!cycle) return;
    
    const labels = generateLabels(goal.freq, cycle.id, goal.customDays);
    const total = labels.length;
    const checked = Object.values(cycle.checks).filter(v => v === true).length;
    const percent = total > 0 ? Math.round((checked / total) * 100) : 0;
    
    const fill = document.getElementById('detail-progress-fill');
    const text = document.getElementById('detail-percentage');
    if (fill) fill.style.width = percent + '%';
    if (text) text.innerText = `${percent}% Completed`;
}

function viewGoal(id) {
    currentGoalId = id;
    const goal = goals.find(g => g.id === id);
    document.getElementById('detail-title').innerText = goal.title;
    
    updateProgress(goal); // Calculate %

    const container = document.getElementById('multi-cycle-container');
    container.innerHTML = '';

    goal.cycles.forEach(cycle => {
        const cycleBox = document.createElement('div');
        cycleBox.className = 'cycle-box';
        cycleBox.innerHTML = `<div class="cycle-header" style="font-weight:900; margin-bottom:15px; color:var(--primary);">${cycle.id}</div>`;
        
        const grid = document.createElement('div');
        grid.className = 'checkbox-grid';

        if (goal.freq === 'daily') {
            const headers = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            headers.forEach(d => {
                const h = document.createElement('div'); h.className = 'calendar-header-row'; h.innerText = d; 
                h.style = "font-size:0.7rem; font-weight:900; text-align:center; opacity:0.5;";
                grid.appendChild(h);
            });
            const parts = cycle.id.split('-');
            const firstDay = new Date(parts[1], parts[2]-1, 1).getDay();
            const padding = firstDay === 0 ? 6 : firstDay - 1;
            for (let i = 0; i < padding; i++) grid.appendChild(document.createElement('div'));
        }

        const labels = generateLabels(goal.freq, cycle.id, goal.customDays);
        labels.forEach((label, index) => {
            const item = document.createElement('div');
            item.className = 'check-item';
            if (isToday(goal.freq, label)) item.style.border = "2px solid var(--primary)";

            item.innerHTML = `
                <input type="checkbox" ${cycle.checks[index] ? 'checked' : ''} onchange="toggleCycleCheck('${cycle.id}', ${index})">
                <span style="font-weight:bold;">${label}</span>
            `;
            grid.appendChild(item);
        });
        cycleBox.appendChild(grid);
        container.appendChild(cycleBox);
    });
    showPage('page-detail');
}

function toggleCycleCheck(cycleId, index) {
    const goal = goals.find(g => g.id === currentGoalId);
    const cycle = goal.cycles.find(c => c.id === cycleId);
    cycle.checks[index] = !cycle.checks[index];
    localStorage.setItem('consisto_data', JSON.stringify(goals));
    updateProgress(goal);
    syncDataWithCloud();
}

// --- 6. ARCHIVE, TO-DO & NOTES (PERSISTED) ---
function renderArchive() {
    const container = document.getElementById('archive-container');
    if (!container) return;
    container.innerHTML = archivedGoals.length ? '' : '<p style="opacity:0.5; text-align:center;">No history yet.</p>';
    archivedGoals.forEach((g, index) => {
        const div = document.createElement('div');
        div.className = 'goal-card';
        div.style.opacity = '0.8';
        div.innerHTML = `
            <div style="flex-grow:1;">
                <strong>${g.title}</strong><br>
                <small>Completed: ${g.archivedAt}</small>
            </div>
            <button class="delete-task-btn" onclick="deleteArchiveItem(${index})">Delete</button>
        `;
        container.appendChild(div);
    });
}

function deleteArchiveItem(index) {
    if (confirm("Delete this archive entry?")) {
        archivedGoals.splice(index, 1);
        localStorage.setItem('consisto_archive', JSON.stringify(archivedGoals));
        renderArchive();
        syncDataWithCloud();
    }
}

function clearFullArchive() {
    if (confirm("Permanently delete ALL archive history?")) {
        archivedGoals = [];
        localStorage.setItem('consisto_archive', JSON.stringify(archivedGoals));
        renderArchive();
        syncDataWithCloud();
    }
}

function deleteGoal(id, e) {
    e.stopPropagation();
    if(confirm("Delete objective?")) {
        goals = goals.filter(g => g.id !== id);
        localStorage.setItem('consisto_data', JSON.stringify(goals));
        renderDashboard();
        syncDataWithCloud();
    }
}

function archiveCurrentGoal() {
    const idx = goals.findIndex(g => g.id === currentGoalId);
    const goal = goals.splice(idx, 1)[0];
    archivedGoals.unshift({ ...goal, archivedAt: new Date().toLocaleDateString() });
    localStorage.setItem('consisto_data', JSON.stringify(goals));
    localStorage.setItem('consisto_archive', JSON.stringify(archivedGoals));
    showPage('page-dashboard');
    syncDataWithCloud();
}

function openEditModal() {
    const goal = goals.find(g => g.id === currentGoalId);
    document.getElementById('editGoalTitle').value = goal.title;
    document.getElementById('editGoalFreq').value = goal.freq;
    if(goal.freq === 'custom') {
        document.getElementById('editCustomDaysContainer').style.display = 'block';
        document.getElementById('editCustomDays').value = goal.customDays;
    }
    openModal('edit-modal');
}

function saveGoalEdit() {
    const goal = goals.find(g => g.id === currentGoalId);
    goal.title = document.getElementById('editGoalTitle').value;
    const newFreq = document.getElementById('editGoalFreq').value;
    
    if (newFreq === 'custom') {
        goal.customDays = parseInt(document.getElementById('editCustomDays').value);
    } else {
        goal.customDays = null;
    }
    
    goal.freq = newFreq;
    goal.cycles = []; // Reset cycles to update grid
    localStorage.setItem('consisto_data', JSON.stringify(goals));
    closeModal('edit-modal');
    showPage('page-dashboard');
    syncDataWithCloud();
}

function addTodo() {
    const input = document.getElementById('todoInput');
    if (!input.value.trim()) return;
    todos.push({ id: Date.now(), text: input.value, completed: false });
    input.value = '';
    localStorage.setItem('consisto_todos', JSON.stringify(todos));
    renderTodoList();
    syncDataWithCloud();
}

function renderTodoList() {
    const container = document.getElementById('todo-list-container');
    if (!container) return;
    container.innerHTML = '';
    todos.forEach(todo => {
        const div = document.createElement('div');
        div.className = 'goal-card';
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <input type="checkbox" style="width:20px; height:20px;" ${todo.completed ? 'checked' : ''} onchange="toggleTodo(${todo.id})">
                <span style="${todo.completed ? 'text-decoration:line-through; opacity:0.5;' : ''}">${todo.text}</span>
            </div>
            <button class="delete-task-btn" onclick="deleteTodo(${todo.id})">Delete</button>
        `;
        container.appendChild(div);
    });
}

function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    todo.completed = !todo.completed;
    localStorage.setItem('consisto_todos', JSON.stringify(todos));
    renderTodoList();
    syncDataWithCloud();
}

function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    localStorage.setItem('consisto_todos', JSON.stringify(todos));
    renderTodoList();
    syncDataWithCloud();
}

function createNewNote() {
    const title = document.getElementById('newNoteTitle').value.trim();
    if (!title) return;
    standaloneNotes.unshift({ id: Date.now(), title, content: "", date: new Date().toLocaleDateString() });
    localStorage.setItem('consisto_standalone_notes', JSON.stringify(standaloneNotes));
    closeModal('new-note-modal');
    document.getElementById('newNoteTitle').value = "";
    renderNotesList();
    syncDataWithCloud();
}

function renderNotesList() {
    const container = document.getElementById('notes-list-container');
    if(!container) return;
    container.innerHTML = '';
    standaloneNotes.forEach(note => {
        const div = document.createElement('div');
        div.className = 'goal-card';
        div.innerHTML = `
            <div onclick="openNote(${note.id})" style="cursor:pointer;">
                <h3 style="margin:0; color:var(--primary);">${note.title}</h3>
                <small style="opacity:0.6;">${note.date}</small>
            </div>
            <button onclick="deleteNote(${note.id})" class="delete-task-btn" style="margin-top:10px;">Delete</button>
        `;
        container.appendChild(div);
    });
}

function openNote(id) {
    const note = standaloneNotes.find(n => n.id === id);
    currentNoteId = id;
    document.getElementById('viewNoteTitle').value = note.title;
    document.getElementById('viewNoteContent').value = note.content;
    showPage('page-note-view');
}

function saveNoteChanges() {
    const note = standaloneNotes.find(n => n.id === currentNoteId);
    note.title = document.getElementById('viewNoteTitle').value;
    note.content = document.getElementById('viewNoteContent').value;
    localStorage.setItem('consisto_standalone_notes', JSON.stringify(standaloneNotes));
    alert("Note Saved!");
    syncDataWithCloud();
}

function deleteNote(id) {
    standaloneNotes = standaloneNotes.filter(n => n.id !== id);
    localStorage.setItem('consisto_standalone_notes', JSON.stringify(standaloneNotes));
    renderNotesList();
    syncDataWithCloud();
}

// --- 7. UTILITIES ---
function generateLabels(freq, cycleId, customDays) {
    if (freq === 'custom' && customDays) {
        return Array.from({ length: customDays }, (_, i) => i + 1);
    }
    if (freq === 'daily') {
        const parts = cycleId.split('-');
        const daysInMonth = new Date(parts[1], parts[2], 0).getDate();
        return Array.from({ length: daysInMonth }, (_, i) => i + 1);
    }
    if (freq === 'weekly') return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    if (freq === 'monthly') return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const startYear = parseInt(cycleId.split('-')[1]);
    return Array.from({ length: 10 }, (_, i) => startYear + i);
}

function isToday(freq, label) {
    const now = new Date();
    if (freq === 'daily') return label == now.getDate();
    if (freq === 'weekly') return label === ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][now.getDay()].substring(0,3);
    if (freq === 'monthly') return label === ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][now.getMonth()];
    if (freq === 'yearly') return label == now.getFullYear();
    return false;
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// --- SMART INSTALL LOGIC ---
let deferredPrompt;
const installBtn = document.getElementById('installAppBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) installBtn.style.display = 'inline-block';
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
        installBtn.style.display = 'none';
    });
}

window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.style.display = 'none';
});

// --- CLOUD STORAGE SYNC LOGIC ---
async function syncDataWithCloud() {
    const currentUsername = localStorage.getItem('consisto_session');
    if (!currentUsername) return;

    try {
        await fetch(`${API_BASE_URL}/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: currentUsername,
                goals: goals,
                archived_goals: archivedGoals,
                todos: todos,
                standalone_notes: standaloneNotes
            })
        });
        console.log("Cloud database synchronized successfully.");
    } catch (error) {
        console.error("Cloud sync failed:", error);
    }
}
//