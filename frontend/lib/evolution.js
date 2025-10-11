const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

export async function createEvolutionInstance(instanceName) {
  const response = await fetch(`${EVOLUTION_BASE_URL}/instance/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY
    },
    body: JSON.stringify({
      instanceName: instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS'
    })
  });

  if (!response.ok) {
    throw new Error('Failed to create Evolution instance');
  }

  return await response.json();
}

export async function getQRCode(instanceName) {
  const response = await fetch(`${EVOLUTION_BASE_URL}/instance/connect/${instanceName}`, {
    headers: {
      'apikey': EVOLUTION_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error('Failed to get QR code');
  }

  return await response.json();
}

export async function checkConnectionStatus(instanceName) {
  const response = await fetch(`${EVOLUTION_BASE_URL}/instance/connectionState/${instanceName}`, {
    headers: {
      'apikey': EVOLUTION_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error('Failed to check connection status');
  }

  return await response.json();
}

export async function setWebhook(instanceName, webhookUrl) {
  const response = await fetch(`${EVOLUTION_BASE_URL}/webhook/set/${instanceName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY
    },
    body: JSON.stringify({
      url: webhookUrl,
      webhook_by_events: false,
      webhook_base64: false,
      events: [
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'CONNECTION_UPDATE'
      ]
    })
  });

  if (!response.ok) {
    throw new Error('Failed to set webhook');
  }

  return await response.json();
}

export async function sendTextMessage(instanceName, to, text) {
  // Clean phone number
  const cleanNumber = to.replace('@s.whatsapp.net', '').replace(/\D/g, '');
  
  const response = await fetch(`${EVOLUTION_BASE_URL}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY
    },
    body: JSON.stringify({
      number: cleanNumber,
      text: text
    })
  });

  if (!response.ok) {
    throw new Error('Failed to send message');
  }

  return await response.json();
}