// Test what the proxy server is actually returning
const testRawResponse = async () => {
  console.log('🔍 Testing raw response from proxy server...\n');

  try {
    // Test building endpoint
    console.log('Fetching from: http://localhost:3007/api/buildings/3436/285/57\n');

    const response = await fetch('http://localhost:3007/api/buildings/3436/285/57');
    const contentType = response.headers.get('content-type');
    const rawText = await response.text();

    console.log('Response Status:', response.status);
    console.log('Content-Type:', contentType);
    console.log('Response (first 500 chars):\n', rawText.substring(0, 500));

    // Try to parse as JSON if possible
    if (contentType && contentType.includes('application/json')) {
      try {
        const jsonData = JSON.parse(rawText);
        console.log('\n✅ Valid JSON response');
        console.log('Buildings found:', jsonData.buildings?.length || 0);
      } catch (e) {
        console.log('\n❌ Content-Type says JSON but parsing failed');
      }
    } else if (rawText.startsWith('<?xml')) {
      console.log('\n⚠️  Server is returning XML instead of JSON!');
      console.log('The proxy server should convert XML to JSON');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

testRawResponse();