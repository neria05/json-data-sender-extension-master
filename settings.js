let profiles = [];
let selectedProfileIndex = -1;

function loadProfiles() {
  chrome.storage.sync.get('hookProfiles', (data) => {
    if (data.hookProfiles) {
      profiles = data.hookProfiles;
      updateProfileSelector();
      renderProfiles();
    }
  });
}

function saveProfiles() {
  chrome.storage.sync.set({ hookProfiles: profiles }, () => {
    showNotification('Profiles saved successfully', 'success');
    // בדוק אם הפופאפ פתוח לפני שליחת ההודעה
    chrome.runtime.sendMessage({ action: 'profilesUpdated' }, (response) => {
      if (chrome.runtime.lastError) {
        // הפופאפ לא פתוח, אין צורך לעשות כלום
      }
    });
  });
}

function updateProfileSelector() {
  const selector = document.getElementById('profileSelector');
  selector.innerHTML = '';
  profiles.forEach((profile, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = profile.name;
    selector.appendChild(option);
  });
  selector.value = selectedProfileIndex;
}

function renderProfiles() {
  const container = document.getElementById('profiles');
  container.innerHTML = '';
  if (selectedProfileIndex >= 0 && selectedProfileIndex < profiles.length) {
    const profile = profiles[selectedProfileIndex];
    const profileElement = createProfileElement(profile, selectedProfileIndex);
    container.appendChild(profileElement);
  }
}

function createProfileElement(profile, index) {
  const profileDiv = document.createElement('div');
  profileDiv.className = 'profile-container';
  profileDiv.innerHTML = `
    <input type="text" class="profile-name" value="${profile.name}" placeholder="Profile Name">
    <input type="url" class="webhook-url" value="${profile.webhookUrl}" placeholder="Webhook URL">
    <div class="fields"></div>
    <button class="add-field-btn">Add Field</button>
  `;

  const fieldsContainer = profileDiv.querySelector('.fields');
  profile.fields.forEach((field, fieldIndex) => {
    const fieldElement = createFieldElement(field, fieldIndex);
    fieldsContainer.appendChild(fieldElement);
  });

  const addFieldBtn = profileDiv.querySelector('.add-field-btn');
  addFieldBtn.addEventListener('click', () => addField(index));

  profileDiv.querySelector('.profile-name').addEventListener('input', (e) => {
    profiles[index].name = e.target.value;
    updateProfileSelector();
    saveProfiles();
  });

  profileDiv.querySelector('.webhook-url').addEventListener('input', (e) => {
    profiles[index].webhookUrl = e.target.value;
    saveProfiles();
  });

  return profileDiv;
}

function createFieldElement(field, fieldIndex) {
  const fieldDiv = document.createElement('div');
  fieldDiv.className = 'field-container';
  fieldDiv.innerHTML = `
    <input type="text" class="field-key" value="${field.key}" placeholder="Key">
    <input type="text" class="field-value" value="${field.value}" placeholder="Value">
    <button class="remove-btn">Remove</button>
  `;

  fieldDiv.querySelector('.field-key').addEventListener('input', (e) => {
    profiles[selectedProfileIndex].fields[fieldIndex].key = e.target.value;
    saveProfiles();
  });

  fieldDiv.querySelector('.field-value').addEventListener('input', (e) => {
    profiles[selectedProfileIndex].fields[fieldIndex].value = e.target.value;
    saveProfiles();
  });

  fieldDiv.querySelector('.remove-btn').addEventListener('click', () => removeField(fieldIndex));

  return fieldDiv;
}

function addField(profileIndex) {
  profiles[profileIndex].fields.push({ key: '', value: '' });
  renderProfiles();
  saveProfiles();
}

function removeField(fieldIndex) {
  profiles[selectedProfileIndex].fields.splice(fieldIndex, 1);
  renderProfiles();
  saveProfiles();
}

function addProfile() {
  profiles.push({ name: 'New Profile', webhookUrl: '', fields: [] });
  selectedProfileIndex = profiles.length - 1;
  updateProfileSelector();
  renderProfiles();
  saveProfiles();
}

function deleteProfile() {
  if (selectedProfileIndex >= 0 && selectedProfileIndex < profiles.length) {
    profiles.splice(selectedProfileIndex, 1);
    selectedProfileIndex = profiles.length > 0 ? 0 : -1;
    updateProfileSelector();
    renderProfiles();
    saveProfiles();
  }
}

function exportProfiles() {
  const dataStr = JSON.stringify(profiles);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  const exportFileDefaultName = 'hook_profiles.json';

  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

function importProfiles() {
  const fileInput = document.getElementById('importFile');
  fileInput.click();

  fileInput.addEventListener('change', function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
      try {
        const importedProfiles = JSON.parse(e.target.result);
        if (Array.isArray(importedProfiles)) {
          profiles = importedProfiles;
          selectedProfileIndex = profiles.length > 0 ? 0 : -1;
          updateProfileSelector();
          renderProfiles();
          saveProfiles();
          showNotification('Profiles imported successfully', 'success');
        } else {
          throw new Error('Invalid file format');
        }
      } catch (error) {
        showNotification('Error importing profiles: ' + error.message, 'error');
      }
    };

    reader.readAsText(file);
  });
}

function clearCache() {
  chrome.storage.sync.clear(() => {
    profiles = [];
    selectedProfileIndex = -1;
    updateProfileSelector();
    renderProfiles();
    showNotification('Cache cleared successfully', 'info');
  });
}

function showNotification(message, type) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type} show`;
  setTimeout(() => {
    notification.className = 'notification';
  }, 3000);
}

document.getElementById('profileSelector').addEventListener('change', (e) => {
  selectedProfileIndex = parseInt(e.target.value);
  renderProfiles();
});

document.getElementById('addProfileBtn').addEventListener('click', addProfile);
document.getElementById('deleteProfileBtn').addEventListener('click', deleteProfile);
document.getElementById('exportBtn').addEventListener('click', exportProfiles);
document.getElementById('importBtn').addEventListener('click', importProfiles);
document.getElementById('clearCacheBtn').addEventListener('click', clearCache);

loadProfiles();