const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';

export async function callGroq(messages, temperature = 0.2, model = 'llama-3.1-8b-instant') {
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: temperature,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Groq API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  } catch (error) {
    console.error('Groq API error:', error);
    throw error;
  }
}

export async function generateAIResponse(
  businessName, 
  industry,
  allDocuments, // Array of all uploaded documents
  conversationHistory, 
  userMessage, 
  personality,
  customerName = null, // Existing customer name (from DB or WhatsApp)
  whatsappAlias = null // WhatsApp profile name (pushName)
) {
  const personalityPrompts = {
    nigerian: "You are a warm, friendly Nigerian sales assistant. Use Nigerian Pidgin naturally when appropriate. Use terms like 'boss', 'oga', 'abeg', 'sha', 'o'. Be conversational and helpful.",
    ghanaian: "You are a professional yet friendly Ghanaian sales assistant. Use Ghanaian English naturally.",
    kenyan: "You are a polite and efficient Kenyan sales assistant. Use Kenyan English naturally.",
    south_african: "You are a friendly and professional South African sales assistant.",
    american: "You are a professional and efficient American sales assistant.",
    british: "You are a polite and formal British sales assistant."
  };

  // Combine all documents - let AI figure out what's what
  const combinedKnowledge = allDocuments
    .map(doc => `=== ${doc.document_name} ===\n${doc.content}`)
    .join('\n\n');

  const systemPrompt = `${personalityPrompts[personality] || personalityPrompts.nigerian}

You are a helpful sales assistant for ${businessName} in the ${industry} industry.

BUSINESS KNOWLEDGE:
Below are all available documents about this business. Use this information to answer customer questions accurately.

${combinedKnowledge}

CONVERSATION RULES:
1. **Customer Name Handling (CRITICAL):**
   ${customerName 
     ? `- Customer's confirmed name is: ${customerName}. Use it naturally in conversation.`
     : whatsappAlias 
       ? `- WhatsApp shows this person as: "${whatsappAlias}". In your FIRST response, warmly ask: "Can I call you ${whatsappAlias}?" or "Is ${whatsappAlias} your name?" If they confirm or correct you, note their real name.`
       : `- This is the FIRST message and customer name is UNKNOWN. You MUST politely introduce yourself and ask for their name.`
   }
   - Example (Nigerian): "Hello! I'm your sales assistant for ${businessName}. I just joined this chat. Please, wetin be your name boss?"
   - Example (American): "Hi! I'm the sales assistant for ${businessName}. I just hopped on this chat. May I know your name?"

2. **Response Style:**
   - Keep responses under 3 sentences unless explaining something complex
   - Be warm and conversational
   - Use info from the documents when relevant
   - If you don't know something, say "Let me check with my manager and get back to you"

3. **Information Extraction:**
   - Pay attention to customer name, location, and what they're interested in
   - Note their sentiment accurately

4. **Sentiment Detection (Choose ONE):**
   - positive: Customer is happy, satisfied, praising, excited
   - negative: Customer is upset, complaining, frustrated, angry
   - neutral: Normal conversation, asking questions, informational
   - urgent: Customer needs immediate help, has a problem, sounds desperate, time-sensitive

Response format (JSON only, no extra text):
{
  "reply": "your response here",
  "confidence": 0.0-1.0,
  "sentiment": "positive|negative|neutral|urgent",
  "lead_data": {
    "customer_name": "extract if mentioned or confirmed, else null",
    "location": "extract if mentioned or null",
    "product_interest": "what they want or null"
  }
}`;

  // Build conversation history
  const messages = [
    { role: 'system', content: systemPrompt }
  ];

  // Add conversation history (last 10 messages)
  conversationHistory.forEach(msg => {
    messages.push({
      role: msg.role,
      content: msg.content
    });
  });

  // Add current user message
  messages.push({
    role: 'user',
    content: userMessage
  });

  const response = await callGroq(messages, 0.3);
  
  // Try to parse JSON response
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate sentiment
      const validSentiments = ['positive', 'negative', 'neutral', 'urgent'];
      if (!validSentiments.includes(parsed.sentiment)) {
        parsed.sentiment = 'neutral';
      }

      // Ensure confidence is between 0 and 1
      if (typeof parsed.confidence !== 'number') parsed.confidence = 0.5;
      if (parsed.confidence > 1) parsed.confidence = 1;
      if (parsed.confidence < 0) parsed.confidence = 0;

      // Ensure lead_data structure exists
      if (!parsed.lead_data) {
        parsed.lead_data = {
          customer_name: null,
          location: null,
          product_interest: null
        };
      }

      return parsed;
    }
  } catch (e) {
    console.warn('Failed to parse JSON response:', e.message);
  }

  // Fallback to raw response
  return {
    reply: response,
    confidence: 0.5,
    sentiment: 'neutral',
    lead_data: {
      customer_name: null,
      location: null,
      product_interest: null
    }
  };
}