import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateAIResponse } from '@/lib/groq';
import { sendTextMessage } from '@/lib/evolution';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const event = await request.json();

    console.log('📥 Webhook received:', event.event, 'Instance:', event.instance);

    // Only process message.upsert events
    if (event.event !== 'messages.upsert') {
      return NextResponse.json({ ok: true });
    }

    // Check if message exists and is not from self
    if (!event?.data?.message || event.data.key?.fromMe) {
      console.log('⏭️  Skipping: No message or from self');
      return NextResponse.json({ ok: true });
    }

    // Extract message details
    const text = event.data.message.conversation || 
                 event.data.message.extendedTextMessage?.text || '';
    const from = event.data.key.remoteJid;
    
    // ✅ NEW: Try to get WhatsApp profile name (pushName)
    const pushName = event.data.pushName || 
                     event.data.key?.pushName || 
                     event.data.message?.pushName ||
                     null;

    // Skip group messages
    if (from.includes('@g.us')) {
      console.log('⏭️  Skipping group message');
      return NextResponse.json({ ok: true });
    }

    if (!text.trim()) {
      console.log('⏭️  Empty message');
      return NextResponse.json({ ok: true });
    }

    const instanceName = event.instance;
    const customerPhone = from.replace('@s.whatsapp.net', '');

    console.log('📱 Processing message from:', customerPhone);
    if (pushName) {
      console.log('👤 WhatsApp name:', pushName);
    }
    console.log('💬 Message:', text.substring(0, 100));

    // Find account by instance name
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .select('*')
      .eq('evolution_instance', instanceName)
      .single();

    if (accountError || !account) {
      console.error('❌ Account not found for instance:', instanceName);
      return NextResponse.json({ ok: true, error: 'Account not found' });
    }

    console.log('✅ Account found:', account.business_name);

    // Check if bot is enabled
    if (!account.bot_enabled) {
      console.log('🤖 Bot disabled for this account');
      return NextResponse.json({ ok: true, message: 'Bot disabled' });
    }

    // ✅ NEW: Find or create conversation with better tracking
    let conversation;
    let isFirstMessage = false;
    const { data: existingConv } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('account_id', account.id)
      .eq('customer_phone', customerPhone)
      .single();

    if (existingConv) {
      conversation = existingConv;
      // Update last message time
      await supabaseAdmin
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation.id);
      
      console.log('💬 Existing conversation:', conversation.id);
    } else {
      // ✅ NEW: Create new conversation - use pushName if available
      const { data: newConv, error: convError } = await supabaseAdmin
        .from('conversations')
        .insert({
          account_id: account.id,
          customer_phone: customerPhone,
          customer_name: pushName || null, // Use WhatsApp name as starting point
          status: 'active',
          sentiment: 'neutral',
          last_message_at: new Date().toISOString()
        })
        .select()
        .single();

      if (convError) {
        console.error('❌ Failed to create conversation:', convError);
        return NextResponse.json({ ok: true, error: 'Failed to create conversation' });
      }

      conversation = newConv;
      isFirstMessage = true;
      console.log('✨ New conversation created:', conversation.id);
      if (pushName) {
        console.log('📝 Initialized with WhatsApp name:', pushName);
      }
    }

    // Save customer message
    await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        account_id: account.id,
        sender: 'customer',
        message_text: text,
        created_at: new Date().toISOString()
      });

    console.log('💾 Customer message saved');

    // Get conversation history (last 10 messages)
    const { data: history } = await supabaseAdmin
      .from('messages')
      .select('sender, message_text')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const conversationHistory = (history || [])
      .reverse()
      .map(msg => ({
        role: msg.sender === 'customer' ? 'user' : 'assistant',
        content: msg.message_text
      }));

    console.log('📚 Loaded', conversationHistory.length, 'previous messages');

    // ✅ NEW: Get ALL business documents (not just FAQs)
    const { data: documents } = await supabaseAdmin
      .from('business_faqs')
      .select('document_name, content')
      .eq('account_id', account.id);

    const allDocuments = documents || [];

    if (allDocuments.length === 0) {
      console.warn('⚠️  No documents found for this account');
      allDocuments.push({
        document_name: 'Basic Info',
        content: `Business Name: ${account.business_name}\nIndustry: ${account.industry}\nCountry: ${account.country}`
      });
    } else {
      console.log('📄 Loaded', allDocuments.length, 'documents');
    }

    console.log('🤖 Generating AI response...');

    // ✅ NEW: Generate AI response with updated parameters
    let aiResponse;
    try {
      aiResponse = await generateAIResponse(
        account.business_name,
        account.industry,
        allDocuments, // Pass all documents
        conversationHistory,
        text,
        account.bot_personality,
        conversation.customer_name, // Pass confirmed name from DB
        isFirstMessage && !conversation.customer_name ? pushName : null // Pass WhatsApp alias only on first message if no confirmed name
      );
      
      console.log('✅ AI response generated');
      console.log('💬 Reply:', aiResponse.reply?.substring(0, 100));
      console.log('📊 Confidence:', aiResponse.confidence);
      console.log('😊 Sentiment:', aiResponse.sentiment);
      
      if (aiResponse.lead_data?.customer_name) {
        console.log('👤 Name extracted:', aiResponse.lead_data.customer_name);
      }
    } catch (aiError) {
      console.error('❌ AI generation failed:', aiError);
      aiResponse = {
        reply: "Thank you for your message! Let me get back to you shortly.",
        confidence: 0.3,
        sentiment: 'neutral',
        lead_data: {
          customer_name: null,
          location: null,
          product_interest: null
        }
      };
    }

    // Save AI message
    await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        account_id: account.id,
        sender: 'ai',
        message_text: aiResponse.reply,
        created_at: new Date().toISOString()
      });

    // Update conversation sentiment and confidence
    await supabaseAdmin
      .from('conversations')
      .update({
        sentiment: aiResponse.sentiment || 'neutral',
        ai_confidence_avg: aiResponse.confidence || 0.5
      })
      .eq('id', conversation.id);

    // ✅ NEW: Enhanced lead data handling
    if (aiResponse.lead_data && Object.keys(aiResponse.lead_data).filter(k => aiResponse.lead_data[k]).length > 0) {
      const leadData = aiResponse.lead_data;
      
      // Update conversation with customer name if extracted and not already confirmed
      if (leadData.customer_name && leadData.customer_name !== conversation.customer_name) {
        await supabaseAdmin
          .from('conversations')
          .update({ customer_name: leadData.customer_name })
          .eq('id', conversation.id);
        
        conversation.customer_name = leadData.customer_name;
        console.log('👤 Customer name confirmed:', leadData.customer_name);
      }
      
      // Check if lead already exists
      const { data: existingLead } = await supabaseAdmin
        .from('leads')
        .select('id')
        .eq('conversation_id', conversation.id)
        .single();

      if (existingLead) {
        // Update existing lead with new info
        const updateData = {};
        if (leadData.customer_name) updateData.customer_name = leadData.customer_name;
        if (leadData.location) updateData.location = leadData.location;
        if (leadData.product_interest) updateData.product_interest = leadData.product_interest;
        
        if (Object.keys(updateData).length > 0) {
          await supabaseAdmin
            .from('leads')
            .update(updateData)
            .eq('id', existingLead.id);
          
          console.log('📝 Lead updated:', Object.keys(updateData).join(', '));
        }
      } else {
        // Create new lead only if we have meaningful data
        if (leadData.customer_name || leadData.location || leadData.product_interest) {
          await supabaseAdmin
            .from('leads')
            .insert({
              account_id: account.id,
              conversation_id: conversation.id,
              customer_phone: customerPhone,
              customer_name: leadData.customer_name || conversation.customer_name,
              location: leadData.location,
              product_interest: leadData.product_interest,
              priority: 'medium',
              created_at: new Date().toISOString()
            });
          
          console.log('✨ New lead created');
        }
      }
    }

    // Send reply to customer via WhatsApp
    console.log('📤 Sending reply to customer...');
    try {
      await sendTextMessage(instanceName, from, aiResponse.reply);
      console.log('✅ Reply sent successfully');
    } catch (sendError) {
      console.error('❌ Failed to send reply:', sendError);
    }

    // ✅ IMPROVED: Check if confidence is low - send notification to sales team
    if (aiResponse.confidence < 0.6 && account.sales_notification_numbers?.length > 0) {
      console.log('⚠️  Low confidence detected, notifying sales team...');
      
      const notificationText = `🚨 LOW CONFIDENCE ALERT

Business: ${account.business_name}
Customer: ${conversation.customer_name || pushName || customerPhone}
Message: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"
AI Confidence: ${Math.round(aiResponse.confidence * 100)}%

Please check the dashboard and take over if needed.
Dashboard: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard`;

      // Send to all sales numbers
      for (const salesNumber of account.sales_notification_numbers) {
        try {
          const cleanSalesNumber = salesNumber.replace(/\D/g, '');
          await sendTextMessage(instanceName, `${cleanSalesNumber}@s.whatsapp.net`, notificationText);
          console.log('✅ Notification sent to:', salesNumber);
        } catch (notifyError) {
          console.error('❌ Failed to notify:', salesNumber, notifyError.message);
        }
      }
    }

    return NextResponse.json({ 
      ok: true, 
      processed: true,
      confidence: aiResponse.confidence,
      sentiment: aiResponse.sentiment 
    });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return NextResponse.json({ 
      ok: true, 
      error: error.message 
    });
  }
}

// Handle GET requests (for testing)
export async function GET() {
  return NextResponse.json({ 
    status: 'Conversa Webhook Active ✅',
    timestamp: new Date().toISOString(),
    message: 'Webhook is ready to receive WhatsApp messages'
  });
}