/* ═══════════════════════════════════════════════════════
   IdeaLink – Blind-Match Project Approval System
   Frontend Application
   ═══════════════════════════════════════════════════════ */

const API_BASE = 'http://localhost:5038/api';
let currentUser = null;

// ═══════════ Helpers ═══════════
function getHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
    };
}

function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function statusClass(status) {
    return (status || '').toLowerCase().replace(/\s+/g, '-');
}

// ═══════════ Toast Notifications ═══════════
function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `<i class="fas ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

// ═══════════ Confirm Modal ═══════════
function confirmDialog(title, message, onConfirm, confirmLabel = 'Confirm', type = 'danger') {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-box">
            <h3><i class="fas fa-exclamation-triangle" style="color:var(--${type === 'danger' ? 'danger' : 'warning'})"></i> ${title}</h3>
            <p>${message}</p>
            <div class="modal-actions">
                <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn-${type}" id="modal-confirm-btn">${confirmLabel}</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector('#modal-confirm-btn').onclick = () => { overlay.remove(); onConfirm(); };
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

// ═══════════ Router ═══════════
function renderRoute() {
    const app = document.getElementById('app');
    app.innerHTML = '';

    // Build navbar
    app.innerHTML = `
        <nav class="glass navbar">
            <div class="nav-brand">
                <div class="logo-icon"><i class="fas fa-link"></i></div>
                <h1>IdeaLink</h1>
            </div>
            <div class="nav-user">
                ${currentUser ? `
                    <div class="nav-user-info">
                        <div class="user-avatar">${getInitials(currentUser.name)}</div>
                        <div>
                            <div class="user-name">${currentUser.name}</div>
                            <div class="user-role">${currentUser.role}</div>
                        </div>
                    </div>
                    <button class="btn-logout" onclick="logout()"><i class="fas fa-sign-out-alt"></i> Logout</button>
                ` : ''}
            </div>
        </nav>
        <div id="main-content" class="dashboard-container"></div>
    `;

    const main = document.getElementById('main-content');

    if (!currentUser) { renderLogin(main); return; }

    switch (currentUser.role) {
        case 'Student': renderStudentDashboard(main); break;
        case 'Supervisor': renderSupervisorDashboard(main); break;
        case 'Admin': renderAdminDashboard(main); break;
        case 'SysAdmin': renderSysAdminDashboard(main); break;
        default: toast('Unknown role', 'error'); logout();
    }
}

function init() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) currentUser = JSON.parse(storedUser);
    renderRoute();
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    currentUser = null;
    renderRoute();
}

/* ═══════════════════════════════════════════════════════
   AUTH VIEWS
   ═══════════════════════════════════════════════════════ */

function renderLogin(container) {
    container.innerHTML = `
        <div class="auth-wrapper">
            <div class="glass auth-card" id="login-box">
                <h2>Welcome to <span>IdeaLink</span></h2>
                <p class="auth-subtitle">Sign in to your account to continue</p>
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" id="login-email" placeholder="you@university.edu" />
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="login-password" placeholder="••••••••" />
                </div>
                <p id="login-err" class="text-error hidden"></p>
                <button class="btn-primary" onclick="handleLogin()"><i class="fas fa-sign-in-alt"></i> Sign In</button>
                <div class="auth-switch">Don't have an account? <span onclick="toggleAuth('register')">Create one</span></div>
            </div>

            <div class="glass auth-card hidden" id="register-box">
                <h2>Join <span>IdeaLink</span></h2>
                <p class="auth-subtitle">Create your account to get started</p>
                <div class="form-group">
                    <label>Full Name</label>
                    <input type="text" id="reg-name" placeholder="John Doe" />
                </div>
                <div class="form-group">
                    <label>Email Address</label>
                    <input type="email" id="reg-email" placeholder="john@university.edu" />
                </div>
                <div class="form-group">
                    <label>Password</label>
                    <input type="password" id="reg-password" placeholder="••••••••" />
                </div>
                <div class="form-group">
                    <label>Role</label>
                    <select id="reg-role">
                        <option value="Student">Student – Submit Project Proposals</option>
                        <option value="Supervisor">Supervisor – Review & Match Projects</option>
                    </select>
                </div>
                <p id="reg-err" class="text-error hidden"></p>
                <button class="btn-primary" onclick="handleRegister()"><i class="fas fa-user-plus"></i> Create Account</button>
                <div class="auth-switch">Already have an account? <span onclick="toggleAuth('login')">Sign in</span></div>
            </div>
        </div>
    `;
}

function toggleAuth(to) {
    document.getElementById('login-box').classList.toggle('hidden', to === 'register');
    document.getElementById('register-box').classList.toggle('hidden', to === 'login');
}

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const pwd = document.getElementById('login-password').value;
    const err = document.getElementById('login-err');

    if (!email || !pwd) { err.textContent = 'Please fill in all fields.'; err.classList.remove('hidden'); return; }

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password: pwd })
        });

        if (!res.ok) throw new Error('Invalid email or password');
        const data = await res.json();

        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        currentUser = data.user;
        toast(`Welcome back, ${currentUser.name}!`, 'success');
        renderRoute();
    } catch (e) {
        err.textContent = e.message;
        err.classList.remove('hidden');
    }
}

async function handleRegister() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const role = document.getElementById('reg-role').value;
    const err = document.getElementById('reg-err');

    if (!name || !email || !password) { err.textContent = 'Please fill in all fields.'; err.classList.remove('hidden'); return; }

    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role })
        });

        if (!res.ok) { const d = await res.text(); throw new Error(d || 'Registration failed'); }
        toast('Account created! Please sign in.', 'success');
        toggleAuth('login');
    } catch (e) {
        err.textContent = e.message;
        err.classList.remove('hidden');
    }
}

/* ═══════════════════════════════════════════════════════
   STUDENT DASHBOARD
   ═══════════════════════════════════════════════════════ */

async function renderStudentDashboard(container) {
    container.innerHTML = `
        <div class="page-header">
            <h2><i class="fas fa-graduation-cap"></i> Student Dashboard</h2>
            <p>Submit and manage your research project proposals</p>
        </div>

        <div class="stats-row" id="student-stats"></div>

        <div class="glass panel">
            <div class="panel-header">
                <div class="panel-title"><i class="fas fa-plus-circle"></i> Submit New Proposal</div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Project Title</label>
                    <input type="text" id="p-title" placeholder="e.g. AI-Driven Sentiment Analysis" />
                </div>
                <div class="form-group">
                    <label>Research Area</label>
                    <input type="text" id="p-area" placeholder="e.g. Artificial Intelligence" />
                </div>
            </div>
            <div class="form-row mt-2">
                <div class="form-group">
                    <label>Tech Stack</label>
                    <input type="text" id="p-tech" placeholder="e.g. Python, TensorFlow, React" />
                </div>
            </div>
            <div class="form-group mt-2">
                <label>Abstract</label>
                <textarea id="p-abstract" placeholder="Briefly describe your project idea, objectives, and scope..." rows="3"></textarea>
            </div>
            <button class="btn-primary mt-4" onclick="submitProject()"><i class="fas fa-paper-plane"></i> Submit Proposal</button>
        </div>

        <div class="section">
            <div class="section-header">
                <div class="section-title"><i class="fas fa-folder-open"></i> My Submissions</div>
            </div>
            <div id="student-projects" class="cards-grid"><div class="loading">Loading projects...</div></div>
        </div>

        <div class="section">
            <div class="section-header">
                <div class="section-title"><i class="fas fa-handshake"></i> My Matches – Identity Reveal</div>
            </div>
            <div id="student-matches" class="cards-grid"><div class="loading">Loading matches...</div></div>
        </div>
    `;
    loadStudentData();
}

async function loadStudentData() {
    try {
        // Load projects
        const projRes = await fetch(`${API_BASE}/student/my-projects`, { headers: getHeaders() });
        const projects = await projRes.json();

        const projContainer = document.getElementById('student-projects');
        if (projects.length === 0) {
            projContainer.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>No proposals submitted yet. Create your first one above!</p></div>';
        } else {
            projContainer.innerHTML = projects.map(p => `
                <div class="glass card">
                    <div class="card-title">${esc(p.title)}</div>
                    <div class="card-text">${esc(p.abstract)}</div>
                    <div class="card-meta">
                        <span class="tag tag-tech"><i class="fas fa-code"></i> ${esc(p.techStack)}</span>
                        <span class="tag tag-area"><i class="fas fa-flask"></i> ${esc(p.researchArea)}</span>
                    </div>
                    <span class="status ${statusClass(p.status)}">${p.status}</span>
                    ${p.status === 'Pending' ? `
                        <div class="card-actions">
                            <button class="btn-secondary btn-sm" onclick="editProjectPrompt(${p.id}, '${esc(p.title)}', '${esc(p.abstract)}', '${esc(p.techStack)}', '${esc(p.researchArea)}')"><i class="fas fa-edit"></i> Edit</button>
                            <button class="btn-danger btn-sm" onclick="withdrawProject(${p.id})"><i class="fas fa-times"></i> Withdraw</button>
                        </div>
                    ` : ''}
                </div>
            `).join('');
        }

        // Stats
        const pending = projects.filter(p => p.status === 'Pending').length;
        const matched = projects.filter(p => p.status === 'Matched').length;
        const review = projects.filter(p => p.status === 'Under Review').length;
        document.getElementById('student-stats').innerHTML = `
            <div class="glass stat-card"><div class="stat-icon purple"><i class="fas fa-file-alt"></i></div><div class="stat-info"><div class="stat-number">${projects.length}</div><div class="stat-label">Total Proposals</div></div></div>
            <div class="glass stat-card"><div class="stat-icon orange"><i class="fas fa-clock"></i></div><div class="stat-info"><div class="stat-number">${pending}</div><div class="stat-label">Pending</div></div></div>
            <div class="glass stat-card"><div class="stat-icon blue"><i class="fas fa-eye"></i></div><div class="stat-info"><div class="stat-number">${review}</div><div class="stat-label">Under Review</div></div></div>
            <div class="glass stat-card"><div class="stat-icon green"><i class="fas fa-check-circle"></i></div><div class="stat-info"><div class="stat-number">${matched}</div><div class="stat-label">Matched</div></div></div>
        `;

        // Load matches (reveal)
        const matchRes = await fetch(`${API_BASE}/student/my-matches`, { headers: getHeaders() });
        const matches = await matchRes.json();
        const matchContainer = document.getElementById('student-matches');

        if (matches.length === 0) {
            matchContainer.innerHTML = '<div class="empty-state"><i class="fas fa-user-secret"></i><p>No matches yet. Once a supervisor confirms interest, their identity will be revealed here.</p></div>';
        } else {
            matchContainer.innerHTML = matches.map(m => `
                <div class="glass card" style="border-color: rgba(16,185,129,0.3);">
                    <div class="card-title">${esc(m.projectTitle)}</div>
                    <span class="tag tag-area"><i class="fas fa-flask"></i> ${esc(m.projectArea)}</span>
                    <div class="reveal-box">
                        <div class="reveal-label"><i class="fas fa-unlock-alt"></i> Supervisor Revealed</div>
                        <div class="reveal-name">${esc(m.supervisorName)}</div>
                        <div class="reveal-email"><a href="mailto:${esc(m.supervisorEmail)}">${esc(m.supervisorEmail)}</a></div>
                        ${m.supervisorExpertise ? `<div style="margin-top:4px;"><span class="tag tag-tech" style="font-size:0.7rem"><i class="fas fa-brain"></i> ${esc(m.supervisorExpertise)}</span></div>` : ''}
                    </div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">Matched on ${formatDate(m.matchedAt)}</div>
                </div>
            `).join('');
        }
    } catch (e) {
        console.error(e);
        toast('Failed to load student data. Is the backend running?', 'error');
    }
}

async function submitProject() {
    const title = document.getElementById('p-title').value;
    const abstract = document.getElementById('p-abstract').value;
    const techStack = document.getElementById('p-tech').value;
    const researchArea = document.getElementById('p-area').value;

    if (!title || !abstract || !techStack || !researchArea) { toast('Please fill in all fields.', 'warning'); return; }

    try {
        const res = await fetch(`${API_BASE}/student/create-project`, {
            method: 'POST', headers: getHeaders(),
            body: JSON.stringify({ title, abstract, techStack, researchArea })
        });
        if (!res.ok) throw new Error('Failed to submit');
        toast('Proposal submitted successfully!', 'success');
        renderStudentDashboard(document.getElementById('main-content'));
    } catch (e) { toast(e.message, 'error'); }
}

function editProjectPrompt(id, title, abstract, tech, area) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-box" style="max-width:520px">
            <h3><i class="fas fa-edit" style="color:var(--accent-secondary)"></i> Edit Proposal</h3>
            <div class="form-group mb-4">
                <label>Title</label>
                <input type="text" id="edit-title" value="${title}" />
            </div>
            <div class="form-group mb-4">
                <label>Abstract</label>
                <textarea id="edit-abstract" rows="3">${abstract}</textarea>
            </div>
            <div class="form-group mb-4">
                <label>Tech Stack</label>
                <input type="text" id="edit-tech" value="${tech}" />
            </div>
            <div class="form-group mb-4">
                <label>Research Area</label>
                <input type="text" id="edit-area" value="${area}" />
            </div>
            <div class="modal-actions">
                <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
                <button class="btn-primary" onclick="saveEditProject(${id})"><i class="fas fa-save"></i> Save Changes</button>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
}

async function saveEditProject(id) {
    const payload = {
        title: document.getElementById('edit-title').value,
        abstract: document.getElementById('edit-abstract').value,
        techStack: document.getElementById('edit-tech').value,
        researchArea: document.getElementById('edit-area').value
    };
    try {
        const res = await fetch(`${API_BASE}/student/edit-project/${id}`, {
            method: 'PUT', headers: getHeaders(), body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Edit failed');
        document.querySelector('.modal-overlay').remove();
        toast('Proposal updated!', 'success');
        loadStudentData();
    } catch (e) { toast(e.message, 'error'); }
}

function withdrawProject(id) {
    confirmDialog('Withdraw Proposal', 'Are you sure you want to withdraw this proposal? This action cannot be undone.', async () => {
        try {
            const res = await fetch(`${API_BASE}/student/withdraw/${id}`, { method: 'DELETE', headers: getHeaders() });
            if (!res.ok) throw new Error('Withdraw failed');
            toast('Proposal withdrawn.', 'success');
            loadStudentData();
        } catch (e) { toast(e.message, 'error'); }
    }, 'Withdraw', 'danger');
}

/* ═══════════════════════════════════════════════════════
   SUPERVISOR DASHBOARD
   ═══════════════════════════════════════════════════════ */

async function renderSupervisorDashboard(container) {
    container.innerHTML = `
        <div class="page-header">
            <h2><i class="fas fa-chalkboard-teacher"></i> Supervisor Dashboard</h2>
            <p>Review anonymous proposals and manage your expertise areas</p>
        </div>

        <div class="stats-row" id="supervisor-stats"></div>

        <div class="glass panel" style="margin-bottom: 24px;">
            <div class="panel-header">
                <div class="panel-title"><i class="fas fa-brain"></i> My Expertise Areas</div>
            </div>
            <div id="expertise-display" class="expertise-tags mb-4"></div>
            <div class="form-row mt-2">
                <div class="form-group">
                    <label>Update Expertise (comma-separated)</label>
                    <input type="text" id="expertise-input" placeholder="e.g. Machine Learning, Cloud Computing, Cybersecurity" />
                </div>
                <button class="btn-primary" onclick="updateExpertise()"><i class="fas fa-save"></i> Save</button>
            </div>
        </div>

        <div class="section">
            <div class="section-header">
                <div class="section-title"><i class="fas fa-user-secret"></i> Blind Review Feed</div>
            </div>
            <div class="filter-bar">
                <label><i class="fas fa-filter"></i> Filter by Area:</label>
                <select id="area-filter" onchange="loadBlindFeed()">
                    <option value="">All Research Areas</option>
                </select>
            </div>
            <div id="blind-feed" class="cards-grid"><div class="loading">Loading anonymous proposals...</div></div>
        </div>

        <div class="section">
            <div class="section-header">
                <div class="section-title"><i class="fas fa-handshake"></i> My Interests & Matches</div>
            </div>
            <div id="my-matches" class="cards-grid"><div class="loading">Loading...</div></div>
        </div>
    `;
    loadSupervisorData();
}

async function loadSupervisorData() {
    try {
        // Load expertise
        const expRes = await fetch(`${API_BASE}/supervisor/expertise`, { headers: getHeaders() });
        if (expRes.ok) {
            const expData = await expRes.json();
            const areas = (expData.expertise || '').split(',').map(e => e.trim()).filter(Boolean);
            document.getElementById('expertise-display').innerHTML = areas.length
                ? areas.map(a => `<span class="expertise-tag">${esc(a)}</span>`).join('')
                : '<span class="text-muted" style="font-size:0.85rem">No expertise set yet. Add your areas above.</span>';
            document.getElementById('expertise-input').value = expData.expertise || '';

            // Populate filter with expertise
            const filterSelect = document.getElementById('area-filter');
            areas.forEach(a => {
                const opt = document.createElement('option');
                opt.value = a;
                opt.textContent = a;
                filterSelect.appendChild(opt);
            });
        }

        await loadBlindFeed();
        await loadSupervisorMatches();
    } catch (e) {
        console.error(e);
        toast('Failed to load supervisor data.', 'error');
    }
}

async function loadBlindFeed() {
    const area = document.getElementById('area-filter')?.value || '';
    const url = area ? `${API_BASE}/supervisor/projects?area=${encodeURIComponent(area)}` : `${API_BASE}/supervisor/projects`;

    try {
        const res = await fetch(url, { headers: getHeaders() });
        const projects = await res.json();
        const container = document.getElementById('blind-feed');

        if (projects.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>No pending proposals found' + (area ? ' for this area' : '') + '.</p></div>';
        } else {
            container.innerHTML = projects.map(p => `
                <div class="glass card">
                    <div class="card-title">${esc(p.title)}</div>
                    <div class="card-text">${esc(p.abstract)}</div>
                    <div class="card-meta">
                        <span class="tag tag-tech"><i class="fas fa-code"></i> ${esc(p.techStack)}</span>
                        <span class="tag tag-area"><i class="fas fa-flask"></i> ${esc(p.researchArea)}</span>
                    </div>
                    <div style="font-size:0.7rem; color:var(--text-muted);">Submitted ${formatDate(p.createdAt)}</div>
                    <div class="card-actions">
                        <button class="btn-primary btn-sm" onclick="expressInterest(${p.id})"><i class="fas fa-hand-point-up"></i> Express Interest</button>
                    </div>
                </div>
            `).join('');
        }

        // Stats
        const matchRes = await fetch(`${API_BASE}/supervisor/my-matches`, { headers: getHeaders() });
        const matches = await matchRes.json();
        const confirmed = matches.filter(m => m.isConfirmed).length;
        const reviewing = matches.filter(m => !m.isConfirmed).length;

        document.getElementById('supervisor-stats').innerHTML = `
            <div class="glass stat-card"><div class="stat-icon purple"><i class="fas fa-list"></i></div><div class="stat-info"><div class="stat-number">${projects.length}</div><div class="stat-label">Available Projects</div></div></div>
            <div class="glass stat-card"><div class="stat-icon blue"><i class="fas fa-eye"></i></div><div class="stat-info"><div class="stat-number">${reviewing}</div><div class="stat-label">Under Review</div></div></div>
            <div class="glass stat-card"><div class="stat-icon green"><i class="fas fa-check-double"></i></div><div class="stat-info"><div class="stat-number">${confirmed}</div><div class="stat-label">Confirmed Matches</div></div></div>
        `;
    } catch (e) { console.error(e); }
}

async function loadSupervisorMatches() {
    try {
        const res = await fetch(`${API_BASE}/supervisor/my-matches`, { headers: getHeaders() });
        const matches = await res.json();
        const container = document.getElementById('my-matches');

        if (matches.length === 0) {
            container.innerHTML = '<div class="empty-state"><i class="fas fa-handshake"></i><p>No interests expressed yet. Browse proposals above to get started.</p></div>';
        } else {
            container.innerHTML = matches.map(m => `
                <div class="glass card" style="border-color: ${m.isConfirmed ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}">
                    <div class="card-title">${esc(m.projectTitle)}</div>
                    <div class="card-text">${esc(m.projectAbstract)}</div>
                    <div class="card-meta">
                        <span class="tag tag-area"><i class="fas fa-flask"></i> ${esc(m.projectArea)}</span>
                        <span class="tag tag-tech"><i class="fas fa-code"></i> ${esc(m.projectTechStack)}</span>
                    </div>
                    ${m.isConfirmed ? `
                        <span class="status matched">Matched</span>
                        <div class="reveal-box">
                            <div class="reveal-label"><i class="fas fa-unlock-alt"></i> Student Revealed</div>
                            <div class="reveal-name">${esc(m.studentName)}</div>
                            <div class="reveal-email"><a href="mailto:${esc(m.studentEmail)}">${esc(m.studentEmail)}</a></div>
                        </div>
                    ` : `
                        <span class="status under-review">Under Review</span>
                        <div class="card-actions">
                            <button class="btn-success btn-sm" onclick="confirmMatchSupervisor(${m.id})"><i class="fas fa-check"></i> Confirm Match</button>
                            <button class="btn-danger btn-sm" onclick="cancelInterest(${m.id})"><i class="fas fa-times"></i> Cancel</button>
                        </div>
                    `}
                </div>
            `).join('');
        }
    } catch (e) { console.error(e); }
}

async function updateExpertise() {
    const expertise = document.getElementById('expertise-input').value;
    try {
        const res = await fetch(`${API_BASE}/supervisor/expertise`, {
            method: 'PUT', headers: getHeaders(), body: JSON.stringify({ expertise })
        });
        if (!res.ok) throw new Error('Failed to update');
        toast('Expertise updated!', 'success');
        loadSupervisorData();
    } catch (e) { toast(e.message, 'error'); }
}

function expressInterest(pid) {
    confirmDialog('Express Interest', 'Expressing interest will put this project under review. You can confirm or cancel later.', async () => {
        try {
            const res = await fetch(`${API_BASE}/supervisor/interest/${pid}`, { method: 'POST', headers: getHeaders() });
            if (!res.ok) { const d = await res.text(); throw new Error(d); }
            toast('Interest expressed! Project is now under review.', 'success');
            loadBlindFeed();
            loadSupervisorMatches();
        } catch (e) { toast(e.message, 'error'); }
    }, 'Express Interest', 'warning');
}

function confirmMatchSupervisor(matchId) {
    confirmDialog('Confirm Match', 'Confirming this match will reveal the student\'s identity to you and your identity to them. This creates a formal supervision pairing.', async () => {
        try {
            const res = await fetch(`${API_BASE}/supervisor/confirm/${matchId}`, { method: 'POST', headers: getHeaders() });
            if (!res.ok) throw new Error('Confirm failed');
            const data = await res.json();
            toast(`Match confirmed! Student: ${data.studentInfo.name}`, 'success');
            loadBlindFeed();
            loadSupervisorMatches();
        } catch (e) { toast(e.message, 'error'); }
    }, 'Confirm Match', 'success');
}

function cancelInterest(matchId) {
    confirmDialog('Cancel Interest', 'This will cancel your interest and the project will become available again.', async () => {
        try {
            const res = await fetch(`${API_BASE}/supervisor/cancel-interest/${matchId}`, { method: 'DELETE', headers: getHeaders() });
            if (!res.ok) throw new Error('Cancel failed');
            toast('Interest cancelled.', 'info');
            loadBlindFeed();
            loadSupervisorMatches();
        } catch (e) { toast(e.message, 'error'); }
    }, 'Cancel', 'danger');
}

/* ═══════════════════════════════════════════════════════
   ADMIN (MODULE LEADER) DASHBOARD
   ═══════════════════════════════════════════════════════ */

async function renderAdminDashboard(container) {
    container.innerHTML = `
        <div class="page-header">
            <h2><i class="fas fa-shield-alt"></i> Module Leader Dashboard</h2>
            <p>Manage research areas and oversee all project allocations</p>
        </div>

        <div class="stats-row" id="admin-stats"></div>

        <div class="glass panel">
            <div class="panel-header">
                <div class="panel-title"><i class="fas fa-tags"></i> Research Area Management</div>
            </div>
            <div class="form-row mb-4">
                <div class="form-group">
                    <label>New Research Area</label>
                    <input type="text" id="new-area-name" placeholder="e.g. Quantum Computing" />
                </div>
                <button class="btn-primary" onclick="addResearchArea()"><i class="fas fa-plus"></i> Add Area</button>
            </div>
            <div id="research-areas-list" class="expertise-tags"></div>
        </div>

        <div class="section">
            <div class="section-header">
                <div class="section-title"><i class="fas fa-handshake"></i> All Matches</div>
            </div>
            <div class="glass panel" style="padding:0; overflow-x:auto;">
                <table class="data-table">
                    <thead>
                        <tr><th>Project</th><th>Area</th><th>Student</th><th>Supervisor</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody id="admin-matches-body">
                        <tr><td colspan="6"><div class="loading">Loading matches...</div></td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="section">
            <div class="section-header">
                <div class="section-title"><i class="fas fa-project-diagram"></i> All Projects</div>
            </div>
            <div class="glass panel" style="padding:0; overflow-x:auto;">
                <table class="data-table">
                    <thead>
                        <tr><th>Title</th><th>Area</th><th>Tech Stack</th><th>Student</th><th>Status</th><th>Created</th></tr>
                    </thead>
                    <tbody id="admin-projects-body">
                        <tr><td colspan="6"><div class="loading">Loading projects...</div></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    loadAdminData();
}

async function loadAdminData() {
    try {
        // Research areas
        const areasRes = await fetch(`${API_BASE}/admin/research-areas`, { headers: getHeaders() });
        const areas = await areasRes.json();
        document.getElementById('research-areas-list').innerHTML = areas.length
            ? areas.map(a => `
                <span class="expertise-tag" style="display:inline-flex;align-items:center;gap:8px;">
                    ${esc(a.name)}
                    <button class="btn-icon danger btn-sm" style="width:20px;height:20px;font-size:0.6rem;" onclick="deleteResearchArea(${a.id})"><i class="fas fa-times"></i></button>
                </span>
            `).join('')
            : '<span class="text-muted" style="font-size:0.85rem">No research areas defined yet.</span>';

        // Matches
        const matchRes = await fetch(`${API_BASE}/admin/matches`, { headers: getHeaders() });
        const matches = await matchRes.json();

        // Supervisors (for reassignment)
        const supRes = await fetch(`${API_BASE}/admin/supervisors`, { headers: getHeaders() });
        const supervisors = await supRes.json();

        document.getElementById('admin-matches-body').innerHTML = matches.length
            ? matches.map(m => `
                <tr>
                    <td><strong>${esc(m.projectTitle)}</strong></td>
                    <td><span class="tag tag-area" style="font-size:0.7rem">${esc(m.projectArea)}</span></td>
                    <td>${esc(m.studentName)}<br/><span class="text-muted" style="font-size:0.75rem">${esc(m.studentEmail)}</span></td>
                    <td>${esc(m.supervisorName)}<br/><span class="text-muted" style="font-size:0.75rem">${esc(m.supervisorEmail)}</span></td>
                    <td><span class="status ${m.isConfirmed ? 'matched' : 'under-review'}">${m.isConfirmed ? 'Matched' : 'Under Review'}</span></td>
                    <td style="display:flex;gap:4px;">
                        <button class="btn-danger btn-sm" onclick="breakMatch(${m.id})"><i class="fas fa-unlink"></i></button>
                        <select style="padding:4px 8px;border-radius:6px;border:1px solid var(--glass-border);background:rgba(0,0,0,0.3);color:var(--text-primary);font-size:0.75rem;font-family:inherit;" onchange="reassignMatch(${m.id}, this.value)">
                            <option value="">Reassign...</option>
                            ${supervisors.filter(s => s.id !== m.supervisorId).map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}
                        </select>
                    </td>
                </tr>
            `).join('')
            : '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-link"></i><p>No matches in the system.</p></div></td></tr>';

        // Projects
        const projRes = await fetch(`${API_BASE}/admin/projects`, { headers: getHeaders() });
        const projects = await projRes.json();

        document.getElementById('admin-projects-body').innerHTML = projects.length
            ? projects.map(p => `
                <tr>
                    <td><strong>${esc(p.title)}</strong></td>
                    <td><span class="tag tag-area" style="font-size:0.7rem">${esc(p.researchArea)}</span></td>
                    <td><span class="tag tag-tech" style="font-size:0.7rem">${esc(p.techStack)}</span></td>
                    <td>${esc(p.studentName)}</td>
                    <td><span class="status ${statusClass(p.status)}">${p.status}</span></td>
                    <td style="font-size:0.75rem;color:var(--text-muted)">${formatDate(p.createdAt)}</td>
                </tr>
            `).join('')
            : '<tr><td colspan="6"><div class="empty-state"><i class="fas fa-folder-open"></i><p>No projects in the system.</p></div></td></tr>';

        // Stats
        const totalMatches = matches.length;
        const confirmedMatches = matches.filter(m => m.isConfirmed).length;
        const totalProjects = projects.length;
        document.getElementById('admin-stats').innerHTML = `
            <div class="glass stat-card"><div class="stat-icon purple"><i class="fas fa-project-diagram"></i></div><div class="stat-info"><div class="stat-number">${totalProjects}</div><div class="stat-label">Total Projects</div></div></div>
            <div class="glass stat-card"><div class="stat-icon blue"><i class="fas fa-handshake"></i></div><div class="stat-info"><div class="stat-number">${totalMatches}</div><div class="stat-label">Total Matches</div></div></div>
            <div class="glass stat-card"><div class="stat-icon green"><i class="fas fa-check-double"></i></div><div class="stat-info"><div class="stat-number">${confirmedMatches}</div><div class="stat-label">Confirmed</div></div></div>
            <div class="glass stat-card"><div class="stat-icon orange"><i class="fas fa-tags"></i></div><div class="stat-info"><div class="stat-number">${areas.length}</div><div class="stat-label">Research Areas</div></div></div>
        `;
    } catch (e) {
        console.error(e);
        toast('Failed to load admin data.', 'error');
    }
}

async function addResearchArea() {
    const name = document.getElementById('new-area-name').value.trim();
    if (!name) { toast('Enter a research area name.', 'warning'); return; }
    try {
        const res = await fetch(`${API_BASE}/admin/research-areas`, {
            method: 'POST', headers: getHeaders(), body: JSON.stringify({ name })
        });
        if (!res.ok) { const d = await res.text(); throw new Error(d); }
        document.getElementById('new-area-name').value = '';
        toast('Research area added!', 'success');
        loadAdminData();
    } catch (e) { toast(e.message, 'error'); }
}

function deleteResearchArea(id) {
    confirmDialog('Delete Research Area', 'Remove this research area from the system?', async () => {
        try {
            await fetch(`${API_BASE}/admin/research-areas/${id}`, { method: 'DELETE', headers: getHeaders() });
            toast('Research area deleted.', 'success');
            loadAdminData();
        } catch (e) { toast(e.message, 'error'); }
    });
}

function breakMatch(matchId) {
    confirmDialog('Break Match', 'This will remove the match and return the project to Pending status. Proceed?', async () => {
        try {
            const res = await fetch(`${API_BASE}/admin/matches/${matchId}`, { method: 'DELETE', headers: getHeaders() });
            if (!res.ok) throw new Error('Failed');
            toast('Match removed.', 'success');
            loadAdminData();
        } catch (e) { toast(e.message, 'error'); }
    });
}

async function reassignMatch(matchId, newSupervisorId) {
    if (!newSupervisorId) return;
    try {
        const res = await fetch(`${API_BASE}/admin/reassign/${matchId}?newSupervisorId=${newSupervisorId}`, {
            method: 'PUT', headers: getHeaders()
        });
        if (!res.ok) throw new Error('Reassign failed');
        toast('Project reassigned to new supervisor.', 'success');
        loadAdminData();
    } catch (e) { toast(e.message, 'error'); }
}

/* ═══════════════════════════════════════════════════════
   SYSADMIN DASHBOARD
   ═══════════════════════════════════════════════════════ */

async function renderSysAdminDashboard(container) {
    container.innerHTML = `
        <div class="page-header">
            <h2><i class="fas fa-server"></i> System Administration</h2>
            <p>Manage users, accounts, and database infrastructure</p>
        </div>

        <div class="stats-row" id="sysadmin-stats"></div>

        <div style="display:grid; grid-template-columns: 380px 1fr; gap: 24px; align-items: flex-start;">
            <div>
                <div class="glass panel">
                    <div class="panel-header">
                        <div class="panel-title"><i class="fas fa-user-plus"></i> Create Account</div>
                    </div>
                    <div class="form-group mb-4">
                        <label>Full Name</label>
                        <input type="text" id="create-name" placeholder="Jane Smith" />
                    </div>
                    <div class="form-group mb-4">
                        <label>Email Address</label>
                        <input type="email" id="create-email" placeholder="jane@university.edu" />
                    </div>
                    <div class="form-group mb-4">
                        <label>Password</label>
                        <input type="password" id="create-password" placeholder="••••••••" />
                    </div>
                    <div class="form-group mb-4">
                        <label>Role</label>
                        <select id="create-role">
                            <option value="Student">Student</option>
                            <option value="Supervisor">Supervisor</option>
                            <option value="Admin">Module Leader (Admin)</option>
                            <option value="SysAdmin">System Administrator</option>
                        </select>
                    </div>
                    <button class="btn-primary" onclick="createUser()" style="width:100%"><i class="fas fa-user-plus"></i> Create Account</button>
                </div>

                <div class="glass panel">
                    <div class="panel-header">
                        <div class="panel-title"><i class="fas fa-database"></i> Database Maintenance</div>
                    </div>
                    <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:16px;">Run Entity Framework Core migrations to update the database schema.</p>
                    <button class="btn-warning" onclick="triggerMigration()" style="width:100%"><i class="fas fa-sync-alt"></i> Run Migration</button>
                </div>
            </div>

            <div class="glass panel" style="padding:0; overflow-x:auto;">
                <div style="padding:20px 20px 0;">
                    <div class="panel-title" style="margin-bottom:16px;"><i class="fas fa-users-cog"></i> User Registry</div>
                </div>
                <table class="data-table">
                    <thead>
                        <tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr>
                    </thead>
                    <tbody id="users-table-body">
                        <tr><td colspan="5"><div class="loading">Loading users...</div></td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    loadSysAdminData();
}

async function loadSysAdminData() {
    try {
        const res = await fetch(`${API_BASE}/sysadmin/users`, { headers: getHeaders() });
        const users = await res.json();

        document.getElementById('users-table-body').innerHTML = users.map(u => `
            <tr>
                <td style="font-weight:600;">#${u.id}</td>
                <td>${esc(u.name)}</td>
                <td style="color:var(--text-secondary)">${esc(u.email)}</td>
                <td><span class="role-badge ${u.role.toLowerCase()}">${u.role}</span></td>
                <td>
                    ${u.id !== currentUser.id
                        ? `<button class="btn-danger btn-sm" onclick="deleteUser(${u.id}, '${esc(u.name)}')"><i class="fas fa-trash-alt"></i> Delete</button>`
                        : '<span class="text-muted" style="font-size:0.75rem">Current User</span>'}
                </td>
            </tr>
        `).join('');

        // Stats
        const students = users.filter(u => u.role === 'Student').length;
        const supervisors = users.filter(u => u.role === 'Supervisor').length;
        const admins = users.filter(u => u.role === 'Admin').length;
        document.getElementById('sysadmin-stats').innerHTML = `
            <div class="glass stat-card"><div class="stat-icon purple"><i class="fas fa-users"></i></div><div class="stat-info"><div class="stat-number">${users.length}</div><div class="stat-label">Total Users</div></div></div>
            <div class="glass stat-card"><div class="stat-icon blue"><i class="fas fa-graduation-cap"></i></div><div class="stat-info"><div class="stat-number">${students}</div><div class="stat-label">Students</div></div></div>
            <div class="glass stat-card"><div class="stat-icon green"><i class="fas fa-chalkboard-teacher"></i></div><div class="stat-info"><div class="stat-number">${supervisors}</div><div class="stat-label">Supervisors</div></div></div>
            <div class="glass stat-card"><div class="stat-icon orange"><i class="fas fa-user-shield"></i></div><div class="stat-info"><div class="stat-number">${admins}</div><div class="stat-label">Admins</div></div></div>
        `;
    } catch (e) {
        document.getElementById('users-table-body').innerHTML = '<tr><td colspan="5"><div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Failed to connect to backend.</p></div></td></tr>';
    }
}

async function createUser() {
    const name = document.getElementById('create-name').value;
    const email = document.getElementById('create-email').value;
    const password = document.getElementById('create-password').value;
    const role = document.getElementById('create-role').value;

    if (!name || !email || !password) { toast('Please fill in all fields.', 'warning'); return; }

    try {
        const res = await fetch(`${API_BASE}/sysadmin/users`, {
            method: 'POST', headers: getHeaders(),
            body: JSON.stringify({ name, email, password, role })
        });
        if (!res.ok) { const d = await res.text(); throw new Error(d); }
        toast('Account created successfully!', 'success');
        document.getElementById('create-name').value = '';
        document.getElementById('create-email').value = '';
        document.getElementById('create-password').value = '';
        loadSysAdminData();
    } catch (e) { toast(e.message, 'error'); }
}

function deleteUser(uid, name) {
    confirmDialog('Delete User', `Are you sure you want to permanently delete <strong>${name}</strong>? All their related data will be removed.`, async () => {
        try {
            const res = await fetch(`${API_BASE}/sysadmin/users/${uid}`, { method: 'DELETE', headers: getHeaders() });
            if (!res.ok) throw new Error('Delete failed');
            toast('User deleted.', 'success');
            loadSysAdminData();
        } catch (e) { toast(e.message, 'error'); }
    });
}

async function triggerMigration() {
    try {
        toast('Running database migration...', 'info');
        const res = await fetch(`${API_BASE}/sysadmin/migrate`, { method: 'POST', headers: getHeaders() });
        const data = await res.json();
        if (res.ok) toast(data.message, 'success');
        else toast(data.message || 'Migration failed', 'error');
    } catch (e) { toast('Migration failed: ' + e.message, 'error'); }
}

// ═══════════ XSS Protection Helper ═══════════
function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ═══════════ Boot ═══════════
window.onload = init;
