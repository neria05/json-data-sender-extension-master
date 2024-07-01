let profiles = [];
let lastState = {
  selectedProfileIndex: 0,
  fieldValues: {}
};

document.addEventListener('DOMContentLoaded', function() {
  const profileSelect = document.getElementById('profileSelect');
  const fieldsContainer = document.getElementById('fieldsContainer');
  const addFieldBtn = document.getElementById('addFieldBtn');
  const sendBtn = document.getElementById('sendBtn');
  const settingsBtn = document.getElementById('settings-btn');
  const addFieldDialog = document.getElementById('addFieldDialog');
  const saveNewFieldBtn = document.getElementById('saveNewFieldBtn');
  const cancelNewFieldBtn = document.getElementById('cancelNewFieldBtn');

  loadProfiles();
  loadLastState();
  setupEventListeners();

  function setupEventListeners() {
    if (profileSelect) profileSelect.addEventListener('change', loadSelectedProfile);
    if (addFieldBtn) addFieldBtn.addEventListener('click', showAddFieldDialog);
    if (sendBtn) sendBtn.addEventListener('click', sendData);
    if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
    if (saveNewFieldBtn) saveNewFieldBtn.addEventListener('click', saveNewField);
    if (cancelNewFieldBtn) cancelNewFieldBtn.addEventListener('click', hideAddFieldDialog);
    document.addEventListener('keydown', handleKeyPress);
    if (addFieldDialog) {
      addFieldDialog.addEventListener('keydown', handleDialogKeyPress);
    }
  }

  function handleKeyPress(event) {
    if (event.key === 'Enter' && !addFieldDialog.style.display) {
      sendData();
    }
  }

  function handleDialogKeyPress(event) {
    if (event.key === 'Enter') {
      saveNewField();
    } else if (event.key === 'Escape') {
      hideAddFieldDialog();
    }
  }

  function loadProfiles() {
    chrome.storage.sync.get('hookProfiles', function(data) {
      if (chrome.runtime.lastError) {
        console.error('Error loading profiles:', chrome.runtime.lastError);
        return;
      }
      profiles = data.hookProfiles || [];
      updateProfileSelect();
      loadSelectedProfile();
    });
  }

  function loadLastState() {
    chrome.storage.sync.get('lastState', function(data) {
      if (data.lastState) {
        lastState = data.lastState;
        profileSelect.selectedIndex = lastState.selectedProfileIndex;
        loadSelectedProfile();
      }
    });
  }

  function saveLastState() {
    lastState.selectedProfileIndex = profileSelect.selectedIndex;
    lastState.fieldValues = {};
    document.querySelectorAll('.field-container').forEach(container => {
      const key = container.querySelector('.field-key').textContent.slice(0, -1);
      const value = container.querySelector('.field-value').value;
      lastState.fieldValues[key] = value;
    });
    chrome.storage.sync.set({ lastState: lastState });
  }

  function updateProfileSelect() {
    profileSelect.innerHTML = '';
    profiles.forEach((profile, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = profile.name;
      profileSelect.appendChild(option);
    });
    profileSelect.selectedIndex = lastState.selectedProfileIndex;
  }

  function loadSelectedProfile() {
    const selectedIndex = profileSelect.selectedIndex;
    if (selectedIndex >= 0 && selectedIndex < profiles.length) {
      const profile = profiles[selectedIndex];
      fieldsContainer.innerHTML = '';
      if (profile.fields) {
        profile.fields.forEach(field => {
          const savedValue = lastState.fieldValues[field.key] || field.value;
          addFieldElement(field.key, savedValue);
        });
      }
    }
  }

  function showAddFieldDialog() {
    if (addFieldDialog) {
      addFieldDialog.style.display = 'block';
    } else {
      console.error('Add field dialog not found');
    }
  }

  function hideAddFieldDialog() {
    if (addFieldDialog) {
      addFieldDialog.style.display = 'none';
    } else {
      console.error('Add field dialog not found');
    }
  }

  function saveNewField() {
    const newFieldKey = document.getElementById('newFieldKey');
    const newFieldValue = document.getElementById('newFieldValue');
    
    if (!newFieldKey || !newFieldValue) {
      console.error('New field inputs not found');
      return;
    }

    const key = newFieldKey.value.trim();
    const value = newFieldValue.value.trim();

    if (key) {
      addFieldElement(key, value);
      hideAddFieldDialog();
      
      // Clear input fields
      newFieldKey.value = '';
      newFieldValue.value = '';

      // Save to current profile
      const selectedIndex = profileSelect.selectedIndex;
      if (selectedIndex >= 0 && selectedIndex < profiles.length) {
        if (!profiles[selectedIndex].fields) {
          profiles[selectedIndex].fields = [];
        }
        profiles[selectedIndex].fields.push({ key, value });
        chrome.storage.sync.set({ hookProfiles: profiles }, function() {
          if (chrome.runtime.lastError) {
            console.error('Error saving profiles:', chrome.runtime.lastError);
          } else {
            console.log('Profile updated successfully');
          }
        });
      }
      saveLastState();
    } else {
      showNotification('Please enter a key for the new field.', 'error');
    }
  }

  function addFieldElement(key, value) {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'field-container';
    fieldDiv.innerHTML = `
      <span class="field-key">${key}:</span>
      <input type="text" class="field-value" value="${value}" placeholder="Enter value">
    `;
    fieldsContainer.appendChild(fieldDiv);
  }

  function openSettings() {
    chrome.tabs.create({url: 'settings.html'}, function(tab) {
      if (chrome.runtime.lastError) {
        showNotification('Error opening settings: ' + chrome.runtime.lastError.message, 'error');
      }
    });
  }

  function showNotification(message, type) {
    console.log('Showing notification:', message, type);
    const notificationElement = document.getElementById('notification');
    if (!notificationElement) {
      console.error('Notification element not found');
      return;
    }
    notificationElement.textContent = message;
    notificationElement.className = `notification ${type}`;
    notificationElement.style.display = 'block';
    setTimeout(() => {
      notificationElement.style.display = 'none';
    }, 3000);
  }

  function sendData() {
    const selectedIndex = profileSelect.selectedIndex;
    if (selectedIndex < 0 || selectedIndex >= profiles.length) {
      showNotification('No profile selected. Please select a profile.', 'error');
      return;
    }
    
    const profile = profiles[selectedIndex];
  
    if (!profile.webhookUrl) {
      showNotification('Webhook URL is empty. Please add a valid URL in the settings.', 'error');
      return;
    }
  
    if (!isValidUrl(profile.webhookUrl)) {
      showNotification('Invalid webhook URL. Please check the URL in the settings.', 'error');
      return;
    }
  
    const fieldsData = {};
    document.querySelectorAll('.field-container').forEach(container => {
      const key = container.querySelector('.field-key').textContent.slice(0, -1);
      const value = container.querySelector('.field-value').value.trim();
      if (key) {
        fieldsData[key] = processDynamicValue(value);
      }
    });
  
    if (Object.keys(fieldsData).length === 0) {
      showNotification('No fields to send. Please add some fields.', 'error');
      return;
    }
  
    fetch(profile.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(fieldsData),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.text();
    })
    .then(data => {
      showNotification('Data sent successfully!', 'success');
      console.log('Success:', data);
      // הצגת התגובה מהוובהוק
      const responseElement = document.getElementById('webhookResponse');
      if (responseElement) {
        responseElement.textContent = data;
        responseElement.style.display = 'block';
      }
    })
    .catch((error) => {
      showNotification('Error sending data: ' + error.message, 'error');
      console.error('Error:', error);
    });
  
    // Save the current field values
    profile.fields = Array.from(document.querySelectorAll('.field-container')).map(container => ({
      key: container.querySelector('.field-key').textContent.slice(0, -1),
      value: container.querySelector('.field-value').value.trim()
    }));
    chrome.storage.sync.set({ hookProfiles: profiles }, function() {
      if (chrome.runtime.lastError) {
        console.error('Error saving profiles:', chrome.runtime.lastError);
      } else {
        console.log('Profile updated successfully');
      }
    });
    saveLastState();
  }

  function isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;  
    }
  }

  function processDynamicValue(value) {
    if (value.startsWith('{{') && value.endsWith('}}')) {
      const dynamicValue = value.slice(2, -2).trim();
      switch (dynamicValue.toLowerCase()) {
        case 'timestamp':
          return new Date().toISOString();
        case 'random':
          return Math.random().toString(36).substring(2, 15);
        default:
          return value;
      }
    }
    return value;
  }
});