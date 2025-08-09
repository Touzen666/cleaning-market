async function testHTTPEndpoint() {
    try {
        const reportId = 'e6441539-e007-4ee9-96f9-39e6409768ae';

        console.log('🔍 Testing HTTP endpoint for report ID:', reportId);

        // Test endpointu getHistoricalById przez HTTP
        const response = await fetch(`http://localhost:3000/api/trpc/monthlyReports.getHistoricalById?input=${encodeURIComponent(JSON.stringify({ reportId }))}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log('📡 Response status:', response.status);
        console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()) as Record<string, string>);

        if (response.ok) {
            const data = await response.json() as unknown;
            console.log('✅ HTTP endpoint response:', JSON.stringify(data, null, 2));
        } else {
            const errorText = await response.text();
            console.log('❌ HTTP endpoint error:', errorText);
        }

    } catch (error) {
        console.error('❌ Error testing HTTP endpoint:', error);
    }
}

void testHTTPEndpoint();
