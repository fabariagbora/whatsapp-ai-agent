import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createEvolutionInstance, getQRCode } from '@/lib/evolution';

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

    // Step 1: Try to create the Evolution instance with retry logic
    let retries = 0;
    const maxRetries = 3;

    while (!instanceCreated && retries < maxRetries) {
      try {
        console.log(`⚙️ Creating Evolution instance (attempt ${retries + 1}/${maxRetries})...`);
        await createEvolutionInstance(instanceName);
        
        // CRITICAL: Wait for instance to be persisted in Evolution's database
        console.log('⏳ Waiting for instance to persist in database...');
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
        
        instanceCreated = true;
        console.log('✅ Evolution instance created and persisted:', instanceName);
        break;
      } catch (err) {
        console.warn(`⚠️ Instance creation attempt ${retries + 1} failed:`, err.message);
        
        // If instance already exists, that's fine
        if (err.message.includes('already exists') || err.message.includes('duplicate')) {
          console.log('ℹ️ Instance already exists, continuing...');
          instanceCreated = true;
          break;
        }
        
        retries++;
        if (retries < maxRetries) {
          console.log(`🔁 Retrying in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!instanceCreated) {
      throw new Error('Failed to create or verify instance after multiple attempts');
    }

    // Step 2: Fetch the QR code with retry logic
    console.log('📷 Fetching QR code from Evolution API...');
    let qrData = null;
    let qrRetries = 0;
    const maxQrRetries = 5;

    while (!qrData && qrRetries < maxQrRetries) {
      try {
        qrData = await getQRCode(instanceName);
        console.log('✅ QR data fetched successfully');
      } catch (qrErr) {
        console.warn(`⚠️ QR fetch attempt ${qrRetries + 1} failed:`, qrErr.message);
        qrRetries++;
        
        if (qrRetries < maxQrRetries) {
          console.log(`🔁 Retrying QR fetch in 2 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          throw new Error('Failed to fetch QR code after multiple attempts');
        }
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

    // Step 4: Update Supabase account record
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

    // Step 5: Return response
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