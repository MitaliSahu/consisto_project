// --- INITIALIZATION ---
let goals = JSON.parse(localStorage.getItem('consisto_data')) || [];
let archivedGoals = JSON.parse(localStorage.getItem('consisto_archive')) || [];
let todos = JSON.parse(localStorage.getItem('consisto_todos')) || [];
let standaloneNotes = JSON.parse(localStorage.getItem('consisto_standalone_notes')) || [];
let currentGoalId = null;
let currentNoteId = null;

// --- 1. THE SANITIZATION & ID ENGINE ---
// Standardizes IDs to keep only one block per cycle and prevent duplicates
function generateCycleId(freq, date) {
    const d = new Date(date);
    if (freq === 'daily') return `Daily-${d.getFullYear()}-${d.getMonth() + 1}`;
    if (freq === 'weekly') {
        const start = new Date(d.setDate(d.getDate() - d.getDay() + 1));
        return `Weekly-${start.toLocaleDateString().replace(/\//g, '-')}`;
    }
    if (freq === 'monthly') return `Monthly-${d.getFullYear()}`;
    if (freq === 'yearly') return `Decade-${Math.floor(d.getFullYear() / 10) * 10}`;
    return 'Cycle';
}

function sanitizeHistory() {
    let changed = false;
    goals.forEach(goal => {
        if (!goal.cycles) goal.cycles = [];
        const latestId = generateCycleId(goal.freq, new Date());
        
        // Keep only the cycle matching the current standardized ID
        const originalCount = goal.cycles.length;
        goal.cycles = goal.cycles.filter(c => c.id === latestId);
        
        if (goal.cycles.length !== originalCount) changed = true;
    });
    
    if (changed) {
        localStorage.setItem('consisto_data', JSON.stringify(goals));
    }
}

// --- 2. AUTH & NAVIGATION ---
function handleAuth() {
    const userField = document.getElementById('username');
    if (userField && userField.value.trim() !== "") {
        showPage('page-dashboard');
    } else {
        alert("Please enter a Username to access the dashboard.");
    }
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');

    if (pageId === 'page-dashboard') {
        sanitizeHistory(); 
        checkAllCycles(); 
        renderDashboard();
        renderArchive();
    }
    if (pageId === 'page-notes') renderNotesList();
    if (pageId === 'page-todo') renderTodoList();
}

// --- 3. HABIT TRACKING & DASHBOARD ---
function checkAllCycles() {
    const now = new Date();
    goals.forEach(goal => {
        if (!goal.cycles) goal.cycles = [];
        const latestId = generateCycleId(goal.freq, now);
        if (!goal.cycles.some(c => c.id === latestId)) {
            goal.cycles.unshift({ id: latestId, checks: {} });
        }
    });
    localStorage.setItem('consisto_data', JSON.stringify(goals));
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
                <small style="display:block; opacity:0.6;">${goal.freq.toUpperCase()}</small>
            </div>
            <button class="delete-task-btn" onclick="deleteGoal(${goal.id}, event)">Delete</button>
        `;
        container.appendChild(div);
    });
}

function viewGoal(id) {
    currentGoalId = id;
    const goal = goals.find(g => g.id === id);
    document.getElementById('detail-title').innerText = goal.title;
    const container = document.getElementById('multi-cycle-container');
    container.innerHTML = '';

    goal.cycles.forEach(cycle => {
        const cycleBox = document.createElement('div');
        cycleBox.className = 'cycle-box';
        cycleBox.innerHTML = `<div class="cycle-header">${cycle.id}</div>`;
        
        const grid = document.createElement('div');
        grid.className = 'checkbox-grid';

        if (goal.freq === 'daily') {
            const headers = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            headers.forEach(d => {
                const h = document.createElement('div'); h.className = 'calendar-header-row'; h.innerText = d; grid.appendChild(h);
            });
            const parts = cycle.id.split('-');
            const padding = new Date(parts[1], parts[2]-1, 1).getDay();
            const adjPadding = padding === 0 ? 6 : padding - 1;
            for (let i = 0; i < adjPadding; i++) grid.appendChild(document.createElement('div'));
        }

        const labels = generateLabels(goal.freq, cycle.id);
        labels.forEach((label, index) => {
            const item = document.createElement('div');
            item.className = 'check-item';
            if (isToday(goal.freq, label)) item.classList.add('highlight');
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

// --- 4. TO-DO LIST FEATURE ---
function addTodo() {
    const input = document.getElementById('todoInput');
    if (!input.value.trim()) return;
    todos.push({ id: Date.now(), text: input.value, completed: false });
    input.value = '';
    localStorage.setItem('consisto_todos', JSON.stringify(todos));
    renderTodoList();
}

function renderTodoList() {
    const container = document.getElementById('todo-list-container');
    if (!container) return;
    container.innerHTML = '';
    todos.forEach(todo => {
        const div = document.createElement('div');
        div.className = 'todo-item';
        div.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px;">
                <input type="checkbox" ${todo.completed ? 'checked' : ''} onchange="toggleTodo(${todo.id})">
                <span class="${todo.completed ? 'completed' : ''}">${todo.text}</span>
            </div>
            <button onclick="deleteTodo(${todo.id})" class="delete-task-btn">Delete</button>
        `;
        container.appendChild(div);
    });
}

function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    todo.completed = !todo.completed;
    localStorage.setItem('consisto_todos', JSON.stringify(todos));
    renderTodoList();
}

function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    localStorage.setItem('consisto_todos', JSON.stringify(todos));
    renderTodoList();
}

// --- 5. EDIT & ARCHIVE ---
function openEditModal() {
    const goal = goals.find(g => g.id === currentGoalId);
    document.getElementById('editGoalTitle').value = goal.title;
    document.getElementById('editGoalFreq').value = goal.freq;
    openModal('edit-modal');
}

function saveGoalEdit() {
    const goal = goals.find(g => g.id === currentGoalId);
    goal.title = document.getElementById('editGoalTitle').value;
    goal.freq = document.getElementById('editGoalFreq').value;
    goal.cycles = []; // Reset cycles to update frequency structure
    localStorage.setItem('consisto_data', JSON.stringify(goals));
    closeModal('edit-modal');
    showPage('page-dashboard');
}

function archiveCurrentGoal() {
    const idx = goals.findIndex(g => g.id === currentGoalId);
    const goal = goals.splice(idx, 1)[0];
    archivedGoals.push({ ...goal, archivedAt: new Date().toLocaleDateString() });
    localStorage.setItem('consisto_data', JSON.stringify(goals));
    localStorage.setItem('consisto_archive', JSON.stringify(archivedGoals));
    showPage('page-dashboard');
}

function renderArchive() {
    const container = document.getElementById('archive-container');
    if (!container) return;
    container.innerHTML = archivedGoals.length ? '' : '<p style="opacity:0.5;">No history yet.</p>';
    archivedGoals.forEach(g => {
        const div = document.createElement('div');
        div.className = 'goal-card';
        div.style.opacity = '0.7';
        div.innerHTML = `<strong>${g.title}</strong><br><small>Archived: ${g.archivedAt}</small>`;
        container.appendChild(div);
    });
}

// --- 6. STANDALONE NOTES ---
function createNewNote() {
    const title = document.getElementById('newNoteTitle').value.trim();
    if (!title) return;
    standaloneNotes.unshift({ id: Date.now(), title, content: "", date: new Date().toLocaleDateString() });
    localStorage.setItem('consisto_standalone_notes', JSON.stringify(standaloneNotes));
    closeModal('new-note-modal');
    document.getElementById('newNoteTitle').value = "";
    renderNotesList();
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
}

function deleteNote(id) {
    standaloneNotes = standaloneNotes.filter(n => n.id !== id);
    localStorage.setItem('consisto_standalone_notes', JSON.stringify(standaloneNotes));
    renderNotesList();
}

// --- 7. UTILITIES ---
function generateLabels(freq, cycleId) {
    if (freq === 'daily') return Array.from({ length: 31 }, (_, i) => i + 1);
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

function toggleCycleCheck(cycleId, index) {
    const goal = goals.find(g => g.id === currentGoalId);
    const cycle = goal.cycles.find(c => c.id === cycleId);
    cycle.checks[index] = !cycle.checks[index];
    localStorage.setItem('consisto_data', JSON.stringify(goals));
}

function addGoal() {
    const title = document.getElementById('goalTitle').value.trim();
    const freq = document.getElementById('goalFreq').value;
    if(!title) return;
    goals.push({ id: Date.now(), title, freq, cycles: [] });
    checkAllCycles();
    closeModal('task-modal');
    renderDashboard();
}

function deleteGoal(id, e) {
    e.stopPropagation();
    if(confirm("Delete objective?")) {
        goals = goals.filter(g => g.id !== id);
        localStorage.setItem('consisto_data', JSON.stringify(goals));
        renderDashboard();
    }
}

function toggleTheme() {
    const body = document.body;
    const next = body.getAttribute('data-theme') === 'blue' ? 'pink' : 'blue';
    body.setAttribute('data-theme', next);
    document.getElementById('themeBtn').innerText = next === 'blue' ? '🌙 Dark Rose' : '🌌 Deep Space';
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

window.onload = () => { sanitizeHistory(); checkAllCycles(); renderDashboard(); renderArchive(); };