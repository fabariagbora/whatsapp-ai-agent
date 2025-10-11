import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { checkConnectionStatus } from '@/lib/evolution';

export async function POST(request) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID required' },
        { status: 400 }
      );
    }

    // Get account with instance name
    const { data: account, error } = await supabaseAdmin
      .from('accounts')
      .select('evolution_instance')
      .eq('id', accountId)
      .single();

    if (error || !account || !account.evolution_instance) {
      return NextResponse.json(
        { connected: false, message: 'No instance found' },
        { status: 200 }
      );
    }

    // Check connection status
    const status = await checkConnectionStatus(account.evolution_instance);

    const isConnected = status.state === 'open' || status.instance?.state === 'open';

    // Update database if connected
    if (isConnected && !account.whatsapp_connected) {
      await supabaseAdmin
        .from('accounts')
        .update({
          whatsapp_connected: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', accountId);
    }

    return NextResponse.json({
      connected: isConnected,
      state: status.state || status.instance?.state,
      instanceName: account.evolution_instance
    });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { connected: false, error: error.message },
      { status: 200 }
    );
  }
}