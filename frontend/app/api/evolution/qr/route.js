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
    let creationError = null;

    // Step 1: Try to create the Evolution instance
    try {
      console.log('⚙️ Creating Evolution instance...');
      await createEvolutionInstance(instanceName);
      instanceCreated = true;
      console.log('✅ Evolution instance created successfully');
    } catch (err) {
      creationError = err.message;
      console.warn('⚠️ Instance creation failed:', err.message);
      
      // If instance already exists, that's okay
      if (err.message.includes('already exists') || 
          err.message.includes('duplicate') ||
          err.message.includes('Instance already exists')) {
        console.log('ℹ️ Instance already exists, continuing...');
        instanceCreated = true;
      }
    }

    // Step 2: Fetch the QR code (with single retry if needed)
    console.log('📷 Fetching QR code from Evolution API...');
    let qrData = null;

    try {
      qrData = await getQRCode(instanceName);
      console.log('✅ QR data fetched successfully');
    } catch (qrErr) {
      console.error('❌ First QR fetch attempt failed:', qrErr.message);
      
      // If we haven't created the instance yet, try creating it now
      if (!instanceCreated) {
        console.log('🔁 Attempting to create instance before retry...');
        try {
          await createEvolutionInstance(instanceName);
          console.log('⏳ Waiting 3 seconds for persistence...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (createErr) {
          console.warn('⚠️ Retry creation failed:', createErr.message);
        }
      } else {
        // Instance exists, just wait a bit
        console.log('⏳ Waiting 2 seconds before retry...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Retry QR fetch once
      try {
        console.log('🔁 Retrying QR code fetch...');
        qrData = await getQRCode(instanceName);
        console.log('✅ QR data fetched successfully on retry');
      } catch (retryErr) {
        console.error('❌ QR fetch retry also failed:', retryErr.message);
        
        // Return detailed error
        return NextResponse.json({
          error: 'Failed to fetch QR code',
          details: {
            creationError,
            qrError: retryErr.message,
            instanceName,
            message: 'Instance may be created but QR code unavailable. Check Evolution API logs.'
          }
        }, { status: 500 });
      }
    }

    console.log('🧩 Raw QR data received:', JSON.stringify(qrData).slice(0, 100));

    // Step 3: Normalize QR code format
    let qrCodeBase64 = null;
    if (qrData?.qrcode) {
      if (qrData.qrcode.startsWith('data:image')) {
        qrCodeBase64 = qrData.qrcode;
        console.log('✅ QR code already base64 image');
      } else if (/^[A-Za-z0-9+/=]+$/.test(qrData.qrcode)) {
        qrCodeBase64 = `data:image/png;base64,${qrData.qrcode}`;
        console.log('✅ QR code converted to base64 image');
      } else {
        console.warn('⚠️ Unrecognized QR code format, using raw value');
        qrCodeBase64 = qrData.qrcode;
      }
    } else {
      console.warn('⚠️ No QR code in response:', qrData);
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
      qrCode: qrCodeBase64,
      pairingCode: qrData?.pairingCode || null,
      count: qrData?.count || null,
    });

  } catch (error) {
    console.error('❌ Fatal QR route error:', error);
    console.error('Stack trace:', error.stack);
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate QR code',
        details: error.stack
      },
      { status: 500 }
    );
  }
}