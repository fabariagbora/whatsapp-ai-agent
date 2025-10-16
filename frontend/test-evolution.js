async function testEvolution() {
  const EVOLUTION_BASE_URL = 'https://whatsapp-ai-agent.fly.dev';
  const EVOLUTION_API_KEY = 'YOUR-API-KEY-HERE'; // Get this from: fly secrets list

  console.log('🧪 Testing Evolution API...\n');

  // Test 1: Fetch instances
  try {
    const response = await fetch(`${EVOLUTION_BASE_URL}/instance/fetchInstances`, {
      headers: { 'apikey': EVOLUTION_API_KEY }
    });
    
    const data = await response.json();
    console.log('✅ Test 1: Fetch instances');
    console.log('Status:', response.status);
    console.log('Response:', data);
    console.log('');
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
  }

  // Test 2: Check API status
  try {
    const response = await fetch(`${EVOLUTION_BASE_URL}/`);
    const data = await response.json();
    console.log('✅ Test 2: API Status');
    console.log('Status:', response.status);
    console.log('Response:', data);
    console.log('');
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
  }
}

testEvolution();