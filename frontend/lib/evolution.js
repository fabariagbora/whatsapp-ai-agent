const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

/**
 * Create a new Evolution instance
 * Includes webhook (required since v2.3.5+) and verifies creation
 * IMPORTANT: Includes delays to ensure database persistence before webhook events fire
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
      webhook: webhookUrl,
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

  // ⏳ CRITICAL: Wait for Prisma database to persist the instance
  // This prevents P2025 errors when webhook events try to update before persistence
  console.log('⏳ Waiting for database persistence...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 🔍 Verify the instance was actually created in the Evolution DB
  try {
    console.log('🔍 Verifying instance in database...');
    const verifyRes = await fetch(`${EVOLUTION_BASE_URL}/instance/${instanceName}`, {
      headers: { 'apikey': EVOLUTION_API_KEY }
    });

    if (!verifyRes.ok) {
      const verifyText = await verifyRes.text();
      console.warn('⚠️ Instance verification failed:', verifyText);
      
      // Additional wait if verification fails
      console.log('⏳ Additional wait for database sync...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      const verifyData = await verifyRes.json();
      console.log('✅ Instance verified in Evolution DB:', verifyData);
    }
  } catch (verifyErr) {
    console.error('⚠️ Could not verify instance existence:', verifyErr.message);
    // Don't throw, just log - instance might still work
  }

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
  console.log('✅ QR code fetched successfully');
  
  return {
    qrcode: data.base64 || data.code || data.qrcode,
    pairingCode: data.pairingCode,
    count: data.count
  };
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
 * Note: Webhook is usually set during instance creation, so this is rarely needed
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

/**
 * Delete an Evolution instance
 */
export async function deleteEvolutionInstance(instanceName) {
  console.log('🗑️ Deleting Evolution instance:', instanceName);

  const response = await fetch(`${EVOLUTION_BASE_URL}/instance/delete/${instanceName}`, {
    method: 'DELETE',
    headers: {
      'apikey': EVOLUTION_API_KEY
    }
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('❌ Failed to delete Evolution instance:', text);
    throw new Error('Failed to delete Evolution instance');
  }

  const data = await response.json();
  console.log('✅ Evolution instance deleted successfully:', data);
  return data;
}

/**
 * Logout from an Evolution instance (disconnect WhatsApp)
 */
export async function logoutInstance(instanceName) {
  console.log('👋 Logging out Evolution instance:', instanceName);

  const response = await fetch(`${EVOLUTION_BASE_URL}/instance/logout/${instanceName}`, {
    method: 'DELETE',
    headers: {
      'apikey': EVOLUTION_API_KEY
    }
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('❌ Failed to logout instance:', text);
    throw new Error('Failed to logout instance');
  }

  const data = await response.json();
  console.log('✅ Instance logged out successfully:', data);
  return data;
}

/**
 * Restart an Evolution instance
 */
export async function restartInstance(instanceName) {
  console.log('🔄 Restarting Evolution instance:', instanceName);

  const response = await fetch(`${EVOLUTION_BASE_URL}/instance/restart/${instanceName}`, {
    method: 'PUT',
    headers: {
      'apikey': EVOLUTION_API_KEY
    }
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('❌ Failed to restart instance:', text);
    throw new Error('Failed to restart instance');
  }

  const data = await response.json();
  console.log('✅ Instance restarted successfully:', data);
  
  // Wait for restart to complete
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return data;
}