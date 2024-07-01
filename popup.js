// popup.js
document.addEventListener('DOMContentLoaded', function() {
  const fieldsContainer = document.getElementById('fieldsContainer');
  const addFieldBtn = document.getElementById('addFieldBtn');
  const sendBtn = document.getElementById('sendBtn');
  const infoBtn = document.getElementById('info-btn');

  loadFields(); // Load fields from storage

  addFieldBtn.addEventListener('click', addNewField);
  sendBtn.addEventListener('click', sendData);
  infoBtn.addEventListener('click', openInfoPage);

  chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'openPopup') {
      const { fields } = request;
      fieldsContainer.innerHTML = ''; // Clear previous fields
      Object.keys(fields).forEach(key => addFieldElement(key, fields[key]));
    }
  });

  function loadFields() {
    chrome.storage.sync.get('fields', function(data) {
      const fields = data.fields || {};
      fieldsContainer.innerHTML = ''; // Clear previous fields
      Object.keys(fields).forEach(key => addFieldElement(key, fields[key]));
    });
  }

  function addNewField() {
    const key = prompt('Enter a new key:');
    if (key && !fieldsContainer.querySelector(`[data-key="${key}"]`)) {
      addFieldElement(key, '');
      saveFields();
    } else {
      alert('Please enter a valid and unique key.');
    }
  }

  function addFieldElement(key, value) {
    const fieldContainer = document.createElement('div');
    fieldContainer.classList.add('field-container');
    fieldContainer.setAttribute('data-key', key);

    const keyElement = document.createElement('span');
    keyElement.textContent = key;

    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.placeholder = 'Value';
    valueInput.value = value;
    valueInput.addEventListener('input', saveFields);
    valueInput.addEventListener('keydown', function(event) {
      if (event.key === 'Enter' && valueInput.value.trim()) {
        sendData();
      }
    });

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      fieldContainer.remove();
      saveFields();
      loadFields(); // Reload fields to keep in sync
    });

    fieldContainer.appendChild(keyElement);
    fieldContainer.appendChild(valueInput);
    fieldContainer.appendChild(removeBtn);
    fieldsContainer.appendChild(fieldContainer);
  }

  function saveFields() {
    const fields = {};
    const fieldContainers = fieldsContainer.querySelectorAll('.field-container');
    for (const fieldContainer of fieldContainers) {
      const key = fieldContainer.getAttribute('data-key');
      const valueInput = fieldContainer.querySelector('input');
      const value = valueInput.value;
      fields[key] = value;
    }
    chrome.storage.sync.set({ 'fields': fields });
  }

  async function sendData() {
    const { webhookUrl } = await chrome.storage.sync.get('webhookUrl');

    if (!webhookUrl) {
      alert('Please set a webhook URL in the extension options first.');
      chrome.runtime.openOptionsPage();
      return;
    }

    try {
      new URL(webhookUrl);
    } catch (_) {
      alert('Invalid webhook URL. Please check and update the URL in the extension options.');
      chrome.runtime.openOptionsPage();
      return;
    }

    const { fields } = await chrome.storage.sync.get('fields');

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(fields)
      });

      console.log('Success:', response);
      alert('Data sent successfully!');
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again.');
    }
  }

  function openInfoPage() {
    chrome.tabs.create({ url: chrome.runtime.getURL('info.html') });
  }
});