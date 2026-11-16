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
    btn.className = `glass-btn ${className}`;
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
    save.className = 'glass-btn card-btn primary';
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

// ---- Reorder dialog: a compact, sortable list of all projects ----
let reorderDraft = [];

function hostOf(url) {
    try { return new URL(url).host + new URL(url).pathname.replace(/\/$/, ''); } catch { return url; }
}

function renderReorderList() {
    const list = document.getElementById('reorderList');
    list.innerHTML = '';
    reorderDraft.forEach((project, i) => {
        const li = document.createElement('li');
        li.className = 'reorder-item';
        li.dataset.id = project.id;

        const handle = document.createElement('span');
        handle.className = 'reorder-handle';
        handle.textContent = '⠿';
        handle.setAttribute('aria-hidden', 'true');
        handle.addEventListener('pointerdown', (e) => startRowDrag(e, li));

        const num = document.createElement('span');
        num.className = 'reorder-num';
        num.textContent = i + 1;

        const text = document.createElement('div');
        text.className = 'reorder-text';
        const name = document.createElement('strong');
        name.textContent = project.name;
        const host = document.createElement('small');
        host.textContent = hostOf(project.url);
        text.append(name, host);

        const up = makeButton('card-btn icon', '↑', () => moveDraft(i, -1), `Move ${project.name} up`);
        const down = makeButton('card-btn icon', '↓', () => moveDraft(i, 1), `Move ${project.name} down`);
        up.disabled = i === 0;
        down.disabled = i === reorderDraft.length - 1;

        li.append(handle, num, text, up, down);
        list.appendChild(li);
    });
}

function moveDraft(index, delta) {
    const target = index + delta;
    if (target < 0 || target >= reorderDraft.length) return;
    [reorderDraft[index], reorderDraft[target]] = [reorderDraft[target], reorderDraft[index]];
    const list = document.getElementById('reorderList');
    const scroll = list.scrollTop;
    renderReorderList();
    list.scrollTop = scroll;
    document.querySelector(`#reorderList [data-id="${reorderDraft[target].id}"]`)
        ?.querySelectorAll('button')[delta < 0 ? 0 : 1]?.focus();
}

// Pointer-based drag (works with mouse, touch and pen, unlike HTML5 DnD on iOS).
// Listeners live on window: moving the row in the DOM drops any pointer
// capture on the handle, so element-level listeners would stop after one step.
function startRowDrag(e, li) {
    e.preventDefault();
    const list = li.parentElement;
    const pointerId = e.pointerId;
    li.classList.add('is-dragging');
    let lastY = e.clientY;
    let scrollTimer = null;

    const reposition = () => {
        const siblings = [...list.children].filter((el) => el !== li);
        const before = siblings.find((el) => {
            const r = el.getBoundingClientRect();
            return lastY < r.top + r.height / 2;
        });
        if (before) {
            if (li.nextElementSibling !== before) list.insertBefore(li, before);
        } else if (list.lastElementChild !== li) {
            list.appendChild(li);
        }
    };

    // Keep scrolling while the pointer is held near the list's edges.
    const autoScroll = () => {
        const lr = list.getBoundingClientRect();
        const edge = 40;
        let dy = 0;
        if (lastY < lr.top + edge) dy = -Math.ceil((lr.top + edge - lastY) / 4);
        else if (lastY > lr.bottom - edge) dy = Math.ceil((lastY - (lr.bottom - edge)) / 4);
        if (dy) {
            list.scrollTop += dy;
            reposition();
        }
        scrollTimer = requestAnimationFrame(autoScroll);
    };
    scrollTimer = requestAnimationFrame(autoScroll);

    const onMove = (ev) => {
        if (ev.pointerId !== pointerId) return;
        ev.preventDefault();
        lastY = ev.clientY;
        reposition();
    };
    const onUp = (ev) => {
        if (ev.pointerId !== pointerId) return;
        cancelAnimationFrame(scrollTimer);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        li.classList.remove('is-dragging');
        const byId = new Map(reorderDraft.map((p) => [String(p.id), p]));
        reorderDraft = [...list.children].map((el) => byId.get(el.dataset.id));
        const scroll = list.scrollTop;
        renderReorderList();
        list.scrollTop = scroll;
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
}

function openReorder() {
    reorderDraft = projects.slice();
    renderReorderList();
    document.getElementById('reorderDialog').showModal();
}

async function saveReorder() {
    const btn = document.getElementById('reorderSave');
    btn.disabled = true;
    projects = reorderDraft.slice();
    renderProjects();
    await saveOrder();
    btn.disabled = false;
    document.getElementById('reorderDialog').close();
}

document.getElementById('reorderBtn').addEventListener('click', openReorder);
document.getElementById('reorderCancel').addEventListener('click', () => document.getElementById('reorderDialog').close());
document.getElementById('reorderSave').addEventListener('click', saveReorder);
// Click on the backdrop closes the dialog.
document.getElementById('reorderDialog').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.close();
});

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
    document.getElementById('reorderBtn').style.display = isAdmin ? '' : 'none';
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

// Liquid-glass glint: feed the pointer position to whichever glass surface is
// under it, as --mx/--my, so the specular highlight follows the cursor.
document.addEventListener('pointermove', (e) => {
    const surface = e.target.closest?.('header, .add-card, .project-card, footer');
    if (!surface) return;
    const r = surface.getBoundingClientRect();
    surface.style.setProperty('--mx', `${e.clientX - r.left}px`);
    surface.style.setProperty('--my', `${e.clientY - r.top}px`);
}, { passive: true });

document.addEventListener('DOMContentLoaded', async () => {
    displayUUID();
    domReady = true;
    initGoogleSignIn();
    await refreshSession();
    await loadProjects();
});

// ---- Língua da secção de serviços (PT/EN) e rodapé legal ----
function setLang(lang) {
    document.documentElement.dataset.lang = lang;
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-set-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setLang === lang)));
    // Os sites com rotas por língua têm links próprios em inglês.
    document.querySelectorAll('a[data-en]').forEach((a) => {
        a.dataset.pt ??= a.getAttribute('href');
        a.setAttribute('href', lang === 'en' ? a.dataset.en : a.dataset.pt);
    });
    try { localStorage.setItem('lang', lang); } catch {}
}

async function loadLegal() {
    try {
        const r = await fetch('/api/legal');
        if (!r.ok) return;
        const l = await r.json();
        const parts = ['© 2026 4online', l.name, l.nif && `NIF ${l.nif}`, l.address].filter(Boolean);
        document.getElementById('legalLine').textContent = parts.join(' · ');
        if (l.email) document.getElementById('contactLink').href = `mailto:${l.email}`;
    } catch {}
}

document.addEventListener('DOMContentLoaded', () => {
    let saved = null;
    try { saved = localStorage.getItem('lang'); } catch {}
    const q = new URLSearchParams(location.search).get('lang');
    const browser = (navigator.language || 'pt').toLowerCase().startsWith('pt') ? 'pt' : 'en';
    setLang(q === 'en' || q === 'pt' ? q : saved === 'en' || saved === 'pt' ? saved : browser);
    document.querySelectorAll('[data-set-lang]').forEach((b) => b.addEventListener('click', () => setLang(b.dataset.setLang)));
    loadLegal();
});
