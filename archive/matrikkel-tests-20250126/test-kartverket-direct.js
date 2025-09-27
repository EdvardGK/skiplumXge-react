// Test Kartverket API directly
// Node 18+ has built-in fetch

const testKartverket = async () => {
  console.log('🔍 Testing Kartverket API directly...\n');

  const queries = [
    'strangata 39 vinstra',
    'oslo',
    'bergen',
    'trondheim'
  ];

  for (const query of queries) {
    console.log(`Testing: "${query}"`);

    try {
      const url = `https://ws.geonorge.no/adresser/v1/sok?sok=${encodeURIComponent(query)}&fuzzy=true&utkoordsys=4258&treffPerSide=10&asciiKompatibel=true`;
      console.log('URL:', url);

      const response = await fetch(url);
      console.log('Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Results:', data.adresser?.length || 0, 'addresses found');
        if (data.adresser?.[0]) {
          console.log('First result:', data.adresser[0].adressetekst);
        }
      } else {
        const text = await response.text();
        console.log('Error response:', text.substring(0, 200));
      }
    } catch (error) {
      console.log('Network error:', error.message);
    }

    console.log('---\n');
  }
};

testKartverket();