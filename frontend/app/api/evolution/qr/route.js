import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createEvolutionInstance, getQRCode, setWebhook } from '@/lib/evolution';

/**
 * POST /api/evolution/qr
 * Creates or verifies an Evolution instance and returns its QR code.
 */
export async function POST(request) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      console.error('❌ Missing accountId in request body.');
      return NextResponse.json(
        { error: 'Account ID required' },
        { status: 400 }
      );
    }

    console.log('🔄 Generating QR code for account:', accountId);

    // Fetch the account from Supabase
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();

    if (accountError || !account) {
      console.error('❌ Account not found:', accountError);
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Use or generate a stable instance name
    const instanceName = account.evolution_instance || `conversa_${accountId.slice(0, 8)}`;
    console.log('📱 Using Evolution instance name:', instanceName);

    let instanceCreated = false;

    // Step 1: Try to create the Evolution instance (safe retry)
    try {
      console.log('⚙️ Attempting to create Evolution instance...');
      const createRes = await createEvolutionInstance(instanceName);
      instanceCreated = true;
      console.log('✅ Evolution instance created:', createRes?.instance || instanceName);
    } catch (err) {
      console.warn('⚠️ Instance creation failed or already exists:', err.message);
    }

    // Step 2: Fetch the QR code
    console.log('📷 Fetching QR code from Evolution API...');
    let qrData = null;
    try {
      qrData = await getQRCode(instanceName);
      console.log('✅ QR data fetched successfully');
    } catch (qrErr) {
      console.error('❌ Error fetching QR code:', qrErr.message);

      // Retry creation once if it might not exist yet
      if (!instanceCreated) {
        console.log('🔁 Retrying instance creation after failed QR fetch...');
        await createEvolutionInstance(instanceName);
        qrData = await getQRCode(instanceName);
        console.log('✅ QR data fetched successfully after retry');
      } else {
        throw qrErr;
      }
    }

    console.log('🧩 Raw QR data:', qrData);

    // Step 3: Normalize QR code format
    let qrCodeBase64 = null;
    if (qrData?.qrcode) {
      if (qrData.qrcode.startsWith('data:image')) {
        qrCodeBase64 = qrData.qrcode; // Already formatted
        console.log('✅ QR code already base64 image.');
      } else if (/^[A-Za-z0-9+/=]+$/.test(qrData.qrcode)) {
        qrCodeBase64 = `data:image/png;base64,${qrData.qrcode}`;
        console.log('✅ QR code converted to base64 image.');
      } else {
        console.warn('⚠️ Unrecognized QR code format:', qrData.qrcode.slice(0, 40));
      }
    }

    // Step 4: Set webhook URL
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook`;
    try {
      console.log('🌐 Setting webhook:', webhookUrl);
      await setWebhook(instanceName, webhookUrl);
      console.log('✅ Webhook successfully set.');
    } catch (webhookErr) {
      console.warn('⚠️ Webhook setup failed:', webhookErr.message);
    }

    // Step 5: Update Supabase account record
    const updateFields = {
      evolution_instance: instanceName,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabaseAdmin
      .from('accounts')
      .update(updateFields)
      .eq('id', accountId);

    if (updateError) {
      console.error('❌ Failed to update account with instance name:', updateError);
    } else {
      console.log('✅ Supabase account updated with instance name:', instanceName);
    }

    // Step 6: Return response
    return NextResponse.json({
      success: true,
      instanceName,
      qrCode: qrCodeBase64 || qrData?.qrcode || null,
      pairingCode: qrData?.pairingCode || null,
    });

  } catch (error) {
    console.error('❌ Fatal QR route error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
