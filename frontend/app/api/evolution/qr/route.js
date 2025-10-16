import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createEvolutionInstance, getQRCode, setWebhook } from '@/lib/evolution';

export async function POST(request) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID required' },
        { status: 400 }
      );
    }

    console.log('🔄 Generating QR code for account:', accountId);

    // Get account details
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

    // Generate unique instance name
    const instanceName = `conversa_${accountId.slice(0, 8)}`;

    console.log('📱 Creating Evolution instance:', instanceName);

    // Create Evolution instance
    try {
      await createEvolutionInstance(instanceName);
      console.log('✅ Evolution instance created successfully');
    } catch (err) {
      console.warn('⚠️ Instance might already exist or failed:', err.message);
    }

    console.log('🔍 Fetching QR code from Evolution API...');

    // Get QR code
    const qrData = await getQRCode(instanceName);

    console.log('🧩 Raw QR data response:', qrData);

    // Handle both base64 and non-base64 formats
    let qrCodeBase64 = null;

    if (qrData?.qrcode) {
      if (qrData.qrcode.startsWith('data:image')) {
        // Already a base64 image
        qrCodeBase64 = qrData.qrcode;
        console.log('✅ QR code already in base64 format.');
      } else if (/^[A-Za-z0-9+/=]+$/.test(qrData.qrcode)) {
        // Looks like a base64 string without prefix
        qrCodeBase64 = `data:image/png;base64,${qrData.qrcode}`;
        console.log('✅ QR code converted to base64 format.');
      } else {
        console.warn('⚠️ QR code may be ASCII text or corrupted:', qrData.qrcode.slice(0, 50));
      }
    }

    if (!qrCodeBase64) {
      console.warn('⚠️ No valid base64 QR found, attempting to proceed anyway...');
    }

    console.log('✅ QR code generation complete.');

    // Set webhook URL
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook`;
    try {
      await setWebhook(instanceName, webhookUrl);
      console.log('✅ Webhook configured successfully:', webhookUrl);
    } catch (err) {
      console.warn('⚠️ Webhook setup failed:', err.message);
    }

    // Update account with instance name
    await supabaseAdmin
      .from('accounts')
      .update({
        evolution_instance: instanceName,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId);

    console.log('✅ Account updated with Evolution instance:', instanceName);

    return NextResponse.json({
      success: true,
      instanceName,
      qrCode: qrCodeBase64 || qrData.qrcode || null
    });

  } catch (error) {
    console.error('❌ QR generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}
