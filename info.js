// info.js
document.addEventListener('DOMContentLoaded', function() {
  const openOptionsBtn = document.getElementById('openOptionsBtn');
  const addFieldBtn = document.getElementById('addFieldBtn');
  const fieldsContainer = document.getElementById('fields-container');

  chrome.storage.sync.get('fields', function(data) {
    const fields = data.fields || {};
    displayFields(fields);
  });

  openOptionsBtn.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });

  addFieldBtn.addEventListener('click', addNewField);

  function displayFields(fields) {
    fieldsContainer.innerHTML = '';
    Object.keys(fields).forEach(key => addFieldElement(key, fields[key]));
  }

  function addFieldElement(key, value) {
    const fieldContainer = document.createElement('div');
    fieldContainer.classList.add('field-container');

    const keyElement = document.createElement('span');
    keyElement.textContent = key;

    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.value = value;
    valueInput.addEventListener('input', saveFields);

    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => {
      fieldContainer.remove();
      saveFields();
    });

    fieldContainer.appendChild(keyElement);
    fieldContainer.appendChild(valueInput);
    fieldContainer.appendChild(removeBtn);
    fieldsContainer.appendChild(fieldContainer);
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

  function saveFields() {
    const fields = {};
    const fieldContainers = fieldsContainer.querySelectorAll('.field-container');
    for (const fieldContainer of fieldContainers) {
      const key = fieldContainer.querySelector('span').textContent;
      const valueInput = fieldContainer.querySelector('input');
      const value = valueInput.value;
      fields[key] = value;
    }
    chrome.storage.sync.set({ 'fields': fields });
  }
});