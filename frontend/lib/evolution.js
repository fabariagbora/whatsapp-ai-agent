const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

/**
 * Create a new Evolution instance
 * Now includes a webhook field (required in Evolution API v2.3.5+)
 */
export async function createEvolutionInstance(instanceName) {
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook`;

  console.log('📦 Creating Evolution instance:', instanceName);
  console.log('🔗 Using webhook URL:', webhookUrl);

  const response = await fetch(`${EVOLUTION_BASE_URL}/instance/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': EVOLUTION_API_KEY
    },
    body: JSON.stringify({
      instanceName: instanceName,
      qrcode: true,
      integration: 'WHATSAPP-BAILEYS',
      webhook: webhookUrl, // ✅ Required field added
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
    const text = await response.text();
    console.error('❌ Failed to create Evolution instance:', text);
    throw new Error('Failed to create Evolution instance');
  }

  const data = await response.json();
  console.log('✅ Evolution instance created successfully:', data);
  return data;
}

/**
 * Get QR code for an instance
 */
export async function getQRCode(instanceName) {
  console.log('📷 Fetching QR code for instance:', instanceName);

  const response = await fetch(`${EVOLUTION_BASE_URL}/instance/connect/${instanceName}`, {
    headers: {
      'apikey': EVOLUTION_API_KEY
    }
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('❌ Failed to get QR code:', text);
    throw new Error('Failed to get QR code');
  }

  const data = await response.json();
  console.log('✅ QR code fetched successfully.');
  return data;
}

/**
 * Check connection status for an instance
 */
export async function checkConnectionStatus(instanceName) {
  console.log('🔎 Checking connection status for instance:', instanceName);

  const response = await fetch(`${EVOLUTION_BASE_URL}/instance/connectionState/${instanceName}`, {
    headers: {
      'apikey': EVOLUTION_API_KEY
    }
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('❌ Failed to check connection status:', text);
    throw new Error('Failed to check connection status');
  }

  const data = await response.json();
  console.log('✅ Connection status retrieved:', data);
  return data;
}

/**
 * Set webhook for an instance
 */
export async function setWebhook(instanceName, webhookUrl) {
  console.log('🌐 Setting webhook for instance:', instanceName);

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
    const text = await response.text();
    console.error('❌ Failed to set webhook:', text);
    throw new Error('Failed to set webhook');
  }

  const data = await response.json();
  console.log('✅ Webhook set successfully:', data);
  return data;
}

/**
 * Send a text message through a given Evolution instance
 */
export async function sendTextMessage(instanceName, to, text) {
  // Clean phone number
  const cleanNumber = to.replace('@s.whatsapp.net', '').replace(/\D/g, '');

  console.log(`💬 Sending message to ${cleanNumber} via ${instanceName}`);

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
    const text = await response.text();
    console.error('❌ Failed to send message:', text);
    throw new Error('Failed to send message');
  }

  const data = await response.json();
  console.log('✅ Message sent successfully:', data);
  return data;
}
