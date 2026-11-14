const GOOGLE_CLIENT_ID = '30659702491-q08msrph71cfl4aesafh50fmap7ef3fv.apps.googleusercontent.com';

function generateUUID() {
    let uuid = localStorage.getItem('machineUUID');
    if (!uuid) {
        uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        localStorage.setItem('machineUUID', uuid);
    }
    return uuid;
}

function displayUUID() {
    const uuid = generateUUID();
    document.getElementById('uuid').textContent = uuid;
}

let projects = [];
let isAdmin = false;

function isSafeUrl(url) {
    return /^https?:\/\//i.test(url);
}

let editingId = null;
let draggedId = null;

function makeButton(className, label, onClick, title) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = className;
    btn.textContent = label;
    if (title) btn.title = title;
    btn.addEventListener('click', onClick);
    return btn;
}

function buildEditForm(project) {
    const form = document.createElement('form');
    form.className = 'edit-form';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.required = true;
    nameInput.value = project.name;
    nameInput.placeholder = 'Project Name';

    const urlInput = document.createElement('input');
    urlInput.type = 'url';
    urlInput.required = true;
    urlInput.value = project.url;
    urlInput.placeholder = 'Project URL';

    const actions = document.createElement('div');
    actions.className = 'card-actions';
    const save = document.createElement('button');
    save.type = 'submit';
    save.className = 'card-btn primary';
    save.textContent = 'Save';
    actions.append(save, makeButton('card-btn', 'Cancel', () => { editingId = null; renderProjects(); }));

    form.append(nameInput, urlInput, actions);
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        save.disabled = true;
        const ok = await updateProject(project.id, nameInput.value, urlInput.value);
        save.disabled = false;
        if (ok) { editingId = null; await loadProjects(); }
    });
    setTimeout(() => nameInput.focus(), 0);
    return form;
}

function buildProjectCard(project, index) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.id = project.id;

    const iframe = document.createElement('iframe');
    iframe.className = 'project-preview';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    if (isSafeUrl(project.url)) iframe.src = project.url;
    card.appendChild(iframe);

    const info = document.createElement('div');
    info.className = 'project-info';

    if (isAdmin && editingId === project.id) {
        info.appendChild(buildEditForm(project));
        card.appendChild(info);
        return card;
    }

    const h3 = document.createElement('h3');
    h3.textContent = project.name;
    info.appendChild(h3);

    const link = document.createElement('a');
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = project.url;
    if (isSafeUrl(project.url)) link.href = project.url;
    info.appendChild(link);

    if (isAdmin) {
        const actions = document.createElement('div');
        actions.className = 'card-actions';

        const handle = document.createElement('span');
        handle.className = 'drag-handle';
        handle.textContent = '⠿';
        handle.title = 'Drag to reorder';
        handle.addEventListener('mousedown', () => { card.draggable = true; });
        handle.addEventListener('touchstart', () => { card.draggable = true; }, { passive: true });

        const left = makeButton('card-btn icon', '◀', () => moveProject(index, -1), 'Move earlier');
        const right = makeButton('card-btn icon', '▶', () => moveProject(index, 1), 'Move later');
        left.disabled = index === 0;
        right.disabled = index === projects.length - 1;

        actions.append(
            handle, left, right,
            makeButton('card-btn', 'Edit', () => { editingId = project.id; renderProjects(); }),
            makeButton('card-btn delete-btn', 'Delete', () => deleteProject(project.id)),
        );
        info.appendChild(actions);
        attachDragHandlers(card, project.id);
    }

    card.appendChild(info);
    return card;
}

function attachDragHandlers(card, id) {
    card.addEventListener('dragstart', (e) => {
        draggedId = id;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(id));
        document.body.classList.add('dragging');
        requestAnimationFrame(() => card.classList.add('is-dragged'));
    });
    card.addEventListener('dragend', () => {
        card.draggable = false;
        card.classList.remove('is-dragged');
        document.body.classList.remove('dragging');
        document.querySelectorAll('.drop-target').forEach((el) => el.classList.remove('drop-target'));
        draggedId = null;
    });
    card.addEventListener('dragover', (e) => {
        if (draggedId === null || draggedId === id) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        card.classList.add('drop-target');
    });
    card.addEventListener('dragleave', () => card.classList.remove('drop-target'));
    card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drop-target');
        if (draggedId === null || draggedId === id) return;
        const from = projects.findIndex((p) => p.id === draggedId);
        const to = projects.findIndex((p) => p.id === id);
        const [moved] = projects.splice(from, 1);
        projects.splice(to, 0, moved);
        renderProjects();
        saveOrder();
    });
}

function moveProject(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= projects.length) return;
    [projects[index], projects[target]] = [projects[target], projects[index]];
    renderProjects();
    saveOrder();
}

async function saveOrder() {
    const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: projects.map((p) => p.id) }),
    });
    if (!res.ok) {
        alert('Could not save the new order.');
        await loadProjects();
    }
}

async function updateProject(id, name, url) {
    const res = await fetch(`/api/projects?id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url }),
    });
    if (!res.ok) alert('Could not save the project.');
    return res.ok;
}

function renderProjects() {
    const container = document.getElementById('projectsContainer');
    container.innerHTML = '';
    projects.forEach((project, i) => container.appendChild(buildProjectCard(project, i)));
}

async function loadProjects() {
    const res = await fetch('/api/projects');
    projects = await res.json();
    renderProjects();
}

async function deleteProject(id) {
    await fetch(`/api/projects?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    await loadProjects();
}

function updateAdminUI() {
    const addCard = document.getElementById('addCard');
    const signedInAs = document.getElementById('signedInAs');
    const signOutBtn = document.getElementById('signOutBtn');
    const signInBtn = document.getElementById('g_id_signin');

    addCard.style.display = isAdmin ? '' : 'none';
    signOutBtn.style.display = isAdmin ? '' : 'none';
    signInBtn.style.display = isAdmin ? 'none' : '';
    signedInAs.textContent = isAdmin ? `Signed in as ${adminName || adminEmail}` : '';
}

let adminEmail = '';
let adminName = '';

async function refreshSession() {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    isAdmin = !!data.isAdmin;
    adminEmail = data.email || '';
    adminName = data.name || '';
    updateAdminUI();
    renderProjects();
}

async function handleGoogleCredential(response) {
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error === 'not authorized'
            ? 'This Google account is not authorized to manage this site.'
            : 'Sign-in failed.');
        return;
    }

    await refreshSession();
}

async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' });
    await refreshSession();
}

let googleLoaded = false;
let domReady = false;

function initGoogleSignIn() {
    if (!googleLoaded || !domReady) return;

    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleCredential,
    });
    google.accounts.id.renderButton(
        document.getElementById('g_id_signin'),
        { theme: 'outline', size: 'small' }
    );
}

// Google's client library calls this global once it has finished loading,
// regardless of whether the <script> tag used async/defer — avoids a race
// where DOMContentLoaded fires before the library is ready.
window.onGoogleLibraryLoad = () => {
    googleLoaded = true;
    initGoogleSignIn();
};

document.getElementById('projectForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('projectName').value;
    const url = document.getElementById('projectUrl').value;

    const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url }),
    });

    if (res.ok) {
        document.getElementById('projectName').value = '';
        document.getElementById('projectUrl').value = '';
        await loadProjects();
    } else {
        alert('Could not add project.');
    }
});

document.getElementById('signOutBtn').addEventListener('click', signOut);

document.addEventListener('DOMContentLoaded', async () => {
    displayUUID();
    domReady = true;
    initGoogleSignIn();
    await refreshSession();
    await loadProjects();
});
