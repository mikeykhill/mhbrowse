const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');
const tenantPicker = document.getElementById('tenant-picker');
const portalBtns = document.querySelectorAll('.portal-btn');
const addPaneBtn = document.getElementById('add-pane-btn');

// Modal Elements
const manageTenantsBtn = document.getElementById('manage-tenants-btn');
const tenantModal = document.getElementById('tenant-modal');
const modalTenantList = document.getElementById('modal-tenant-list');
const newTenantName = document.getElementById('new-tenant-name');
const newTenantEmail = document.getElementById('new-tenant-email');
const newTenantId = document.getElementById('new-tenant-id');
const addTenantBtn = document.getElementById('add-tenant-btn');
const closeModalBtn = document.getElementById('close-modal-btn');

// --- GOLDEN LAYOUT SETUP ---
const config = {
  settings: {
    hasHeaders: true,
    constrainDragToContainer: true,
    reorderEnabled: true,
    selectionEnabled: false,
    popoutWholeStack: false,
    blockedPopoutsThrowError: true,
    closePopoutsOnUnload: true,
    showPopoutIcon: false,
    showMaximiseIcon: true,
    showCloseIcon: true
  },
  content: [{
    type: 'row',
    content: []
  }]
};

const layout = new GoldenLayout(config, $('#workspace'));

layout.registerComponent('m365Pane', function(container, state) {
  const partition = state.partition || '';
  const email = state.email || '';
  const url = state.url || 'https://admin.microsoft.com';
  
  // Create DOM
  const paneEl = document.createElement('div');
  paneEl.className = 'm365-pane-container';
  
  const toolbar = document.createElement('div');
  toolbar.className = 'pane-toolbar';
  
  const backBtn = document.createElement('button');
  backBtn.className = 'pane-nav-btn';
  backBtn.title = 'Back';
  backBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>';
  
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'pane-nav-btn';
  refreshBtn.title = 'Refresh';
  refreshBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>';
  
  const addressBar = document.createElement('input');
  addressBar.className = 'pane-address-bar';
  addressBar.type = 'text';
  addressBar.value = url;
  
  toolbar.appendChild(backBtn);
  toolbar.appendChild(refreshBtn);
  toolbar.appendChild(addressBar);
  
  const webview = document.createElement('webview');
  webview.src = url;
  if (partition) {
    webview.setAttribute('partition', partition);
  }
  
  paneEl.appendChild(toolbar);
  paneEl.appendChild(webview);
  
  container.getElement().append(paneEl);
  
  // Event Listeners
  backBtn.addEventListener('click', () => webview.goBack());
  refreshBtn.addEventListener('click', () => webview.reload());
  
  addressBar.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      let navUrl = addressBar.value;
      if (!navUrl) return;
      if (!navUrl.startsWith('http://') && !navUrl.startsWith('https://')) {
        navUrl = 'https://' + navUrl;
      }
      webview.src = navUrl;
    }
  });
  
  container.on('open', () => {
    webview.addEventListener('did-navigate', (e) => {
      addressBar.value = e.url;
    });
    webview.addEventListener('did-navigate-in-page', (e) => {
      addressBar.value = e.url;
    });
    
    webview.addEventListener('did-stop-loading', () => {
      const currentUrl = webview.getURL();
      if (currentUrl.includes('login.microsoftonline.com') && email) {
        webview.executeJavaScript(`
          (function() {
            const emailInput = document.querySelector('input[type="email"]');
            if (emailInput && !emailInput.value) {
              emailInput.value = '${email}';
              emailInput.dispatchEvent(new Event('input', { bubbles: true }));
              emailInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
          })();
        `);
      }
    });
  });
});

layout.init();

// Keep Golden Layout synced with container resize (e.g., sidebar toggle)
const resizeObserver = new ResizeObserver(() => {
  layout.updateSize();
});
resizeObserver.observe(document.getElementById('workspace'));

// Webview Drag Trap for Golden Layout
layout.on('itemDragStart', () => {
  document.querySelectorAll('webview').forEach(wv => {
    wv.style.pointerEvents = 'none';
  });
});

layout.on('itemDragStop', () => {
  document.querySelectorAll('webview').forEach(wv => {
    wv.style.pointerEvents = 'auto';
  });
});

// Add Pane Action
function addWorkspacePane(state = {}) {
  const newItemConfig = {
    type: 'component',
    componentName: 'm365Pane',
    title: state.title || 'New Pane',
    componentState: state
  };
  
  if (layout.root && layout.root.contentItems && layout.root.contentItems.length > 0) {
    layout.root.contentItems[0].addChild(newItemConfig);
  } else {
    // If layout is completely empty or just initialized
    layout.root.addChild({
      type: 'row',
      content: [newItemConfig]
    });
  }
}

addPaneBtn.addEventListener('click', () => {
  addWorkspacePane({ title: 'Workspace', url: 'https://admin.microsoft.com' });
});

portalBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const url = btn.getAttribute('data-url');
    if (url) {
      addWorkspacePane({ title: btn.textContent, url: url });
    }
  });
});

// Add an initial pane on load
$(window).on('load', () => {
  setTimeout(() => {
    if (layout.root.contentItems[0].contentItems.length === 0) {
      addWorkspacePane({ title: 'M365 Admin', url: 'https://admin.microsoft.com' });
    }
  }, 100);
});

// Handle window resize
$(window).resize(() => {
  layout.updateSize();
});

// --- TENANT MANAGEMENT LOGIC ---

function getTenants() {
  const stored = localStorage.getItem('m365_tenants');
  if (stored) {
    return JSON.parse(stored);
  } else {
    const defaultTenants = [
      { name: 'Contoso IT', email: 'admin@contoso.onmicrosoft.com', id: 'contoso' },
      { name: 'Fabrikam Ltd', email: 'globaladmin@fabrikam.com', id: 'fabrikam' }
    ];
    localStorage.setItem('m365_tenants', JSON.stringify(defaultTenants));
    return defaultTenants;
  }
}

function saveTenants(tenants) {
  localStorage.setItem('m365_tenants', JSON.stringify(tenants));
}

function renderTenantDropdown() {
  const tenants = getTenants();
  tenantPicker.innerHTML = '<option value="">Select a Client...</option>';
  tenants.forEach(t => {
    const option = document.createElement('option');
    option.textContent = `${t.name} (${t.email})`;
    option.value = JSON.stringify({ partition: `persist:${t.id}`, email: t.email });
    tenantPicker.appendChild(option);
  });
}

function renderModalList() {
  const tenants = getTenants();
  modalTenantList.innerHTML = '';
  tenants.forEach((t, index) => {
    const li = document.createElement('li');
    li.className = 'tenant-list-item';
    li.innerHTML = `
      <div class="tenant-info">
        <span class="tenant-name">${t.name}</span>
        <span class="tenant-email">${t.email}</span>
      </div>
      <button class="delete-btn" data-index="${index}">Delete</button>
    `;
    modalTenantList.appendChild(li);
  });

  // Attach delete listeners
  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-index'));
      const currentTenants = getTenants();
      currentTenants.splice(idx, 1);
      saveTenants(currentTenants);
      renderModalList();
      renderTenantDropdown();
    });
  });
}

// Modal Toggle
manageTenantsBtn.addEventListener('click', () => {
  renderModalList();
  tenantModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => {
  tenantModal.classList.add('hidden');
});

// Add New Tenant
addTenantBtn.addEventListener('click', () => {
  const name = newTenantName.value.trim();
  const email = newTenantEmail.value.trim();
  const id = newTenantId.value.trim().replace(/\s+/g, ''); // Ensure no spaces

  if (name && email && id) {
    const currentTenants = getTenants();
    currentTenants.push({ name, email, id });
    saveTenants(currentTenants);
    
    newTenantName.value = '';
    newTenantEmail.value = '';
    newTenantId.value = '';
    
    renderModalList();
    renderTenantDropdown();
  } else {
    alert('Please fill in all fields.');
  }
});

// Initialization
renderTenantDropdown();

// Tenant Picker Logic
tenantPicker.addEventListener('change', () => {
  const selectedOption = tenantPicker.options[tenantPicker.selectedIndex];
  if (!selectedOption.value) return;

  let tenantData;
  try {
    tenantData = JSON.parse(selectedOption.value);
  } catch (e) {
    console.error('Failed to parse tenant data', e);
    return;
  }

  const partition = tenantData.partition;
  const email = tenantData.email;
  const name = tenantPicker.options[tenantPicker.selectedIndex].text.split(' (')[0];

  if (!partition) return;

  addWorkspacePane({
    title: name,
    partition: partition,
    email: email,
    url: 'https://admin.microsoft.com'
  });
  
  // Reset picker
  tenantPicker.selectedIndex = 0;
});

// Sidebar Toggle Logic
sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

// --- AUTO-UPDATER UI LOGIC ---
const updateText = document.getElementById('update-text');
const statusDot = document.querySelector('.status-dot');
const restartUpdateBtn = document.getElementById('restart-update-btn');

if (window.api && window.api.onUpdateStatus) {
  window.api.onUpdateStatus((data) => {
    updateText.textContent = data.message;
    statusDot.className = 'status-dot'; // Reset classes
    
    if (data.status === 'up-to-date') {
      statusDot.classList.add('green');
    } else if (data.status === 'checking' || data.status === 'available' || data.status === 'update-downloaded') {
      statusDot.classList.add('yellow');
      
      if (data.status === 'update-downloaded') {
        restartUpdateBtn.style.display = 'block';
      }
    } else if (data.status === 'error') {
      statusDot.classList.add('red');
    }
  });

  restartUpdateBtn.addEventListener('click', () => {
    window.api.restartApp();
  });
}