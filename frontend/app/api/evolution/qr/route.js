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
    } catch (err) {
      // Instance might already exist, that's OK
      console.log('Instance might already exist:', err.message);
    }

    // Get QR code
    const qrData = await getQRCode(instanceName);

    console.log('✅ QR code generated');

    // Set webhook URL
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook`;
    try {
      await setWebhook(instanceName, webhookUrl);
      console.log('✅ Webhook configured:', webhookUrl);
    } catch (err) {
      console.warn('Webhook setup failed:', err.message);
    }

    // Update account with instance name
    await supabaseAdmin
      .from('accounts')
      .update({
        evolution_instance: instanceName,
        updated_at: new Date().toISOString()
      })
      .eq('id', accountId);

    return NextResponse.json({
      success: true,
      qrCode: qrData.qrcode?.base64 || qrData.qrcode,
      instanceName: instanceName
    });

  } catch (error) {
    console.error('❌ QR generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate QR code' },
      { status: 500 }
    );
  }
}