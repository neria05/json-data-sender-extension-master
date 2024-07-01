// options.js
document.addEventListener('DOMContentLoaded', function() {
  const webhookUrlInput = document.getElementById('webhookUrl');
  const saveWebhookBtn = document.getElementById('saveWebhookBtn');

  chrome.storage.sync.get('webhookUrl', function(data) {
    webhookUrlInput.value = data.webhookUrl || '';
  });

  saveWebhookBtn.addEventListener('click', saveWebhookUrl);

  function saveWebhookUrl() {
    const webhookUrl = webhookUrlInput.value.trim();
    if (webhookUrl) {
      chrome.storage.sync.set({ 'webhookUrl': webhookUrl }, function() {
        alert('Webhook URL saved successfully!');
      });
    } else {
      alert('Please enter a valid webhook URL.');
    }
  }
});