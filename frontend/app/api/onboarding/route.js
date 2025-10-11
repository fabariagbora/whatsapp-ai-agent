import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request) {
  try {
    const { businessName, email, industry, country, botPersonality } = await request.json();

    console.log('Creating account in Supabase:', { businessName, email });

    // Validate required fields
    if (!businessName || !email || !industry) {
      return NextResponse.json(
        { error: 'Missing required fields: businessName, email, industry' },
        { status: 400 }
      );
    }

    // Create account in Supabase
    const { data, error } = await supabaseAdmin  // ✅ Changed from 'supabase' to 'supabaseAdmin'
      .from('accounts')
      .insert({
        business_name: businessName,
        email: email,
        industry: industry,
        country: country || 'Nigeria',
        bot_personality: botPersonality || 'nigerian',
        bot_enabled: true,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      
      // Handle duplicate email
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Email already exists. Please use a different email.' },
          { status: 409 }
        );
      }
      
      throw error;
    }

    console.log('✅ Account created successfully:', data.id);

    return NextResponse.json({
      success: true,
      accountId: data.id,
      message: 'Account created successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create account' },
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();
    const { accountId, salesNumbers, onboardingCompleted } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing accountId' },
        { status: 400 }
      );
    }

    const updateData = {};

    // Step 3: Update sales numbers
    if (salesNumbers) {
      updateData.sales_notification_numbers = salesNumbers.filter(n => n.trim() !== '');
      console.log('Updating sales numbers:', updateData.sales_notification_numbers);
    }

    // Step 6: Mark onboarding complete
    if (onboardingCompleted) {
      updateData.onboarding_completed = true;
      updateData.onboarding_completed_at = new Date().toISOString();
      console.log('Marking onboarding as completed');
    }

    // Update account
    const { data, error } = await supabaseAdmin  // ✅ Changed from 'supabase' to 'supabaseAdmin'
      .from('accounts')
      .update(updateData)
      .eq('id', accountId)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }

    console.log('✅ Account updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Account updated successfully',
      data: data
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update account' },
      { status: 500 }
    );
  }
}