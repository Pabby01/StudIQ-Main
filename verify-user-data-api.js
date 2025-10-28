// Script to verify user data is saved by calling the API endpoints
// This doesn't require direct database access

const testPrivyUserId = 'did:privy:cmh7aw3mp01wmkw0c5txedthl';
const testWalletAddress = '7xKXtg2CW34dJq9usX6ewnA8sZMFVU6m5p9MNv4jezL';
const mockPrivyToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZGlkOnByaXZ5OmNtaDdhdzNtcDAxd21rdzBjNXR4ZWR0aGwifQ.mock_signature';

async function verifyUserData() {
  console.log('🔍 Verifying user data through API endpoints...');
  console.log('Test User ID:', testPrivyUserId);
  console.log('Test Wallet Address:', testWalletAddress);
  console.log('');

  const baseUrl = 'http://localhost:3000/api';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${mockPrivyToken}`,
    'X-User-ID': testPrivyUserId,
  };

  try {
    // Check if profile exists
    console.log('📋 Checking user profile...');
    const profileResponse = await fetch(`${baseUrl}/user/profile?user_id=${encodeURIComponent(testPrivyUserId)}`, {
      method: 'GET',
      headers: headers
    });

    console.log('Profile Response Status:', profileResponse.status);
    const profileText = await profileResponse.text();
    console.log('Profile Response Body:', profileText);
    
    if (profileResponse.status === 200) {
      try {
        const profileData = JSON.parse(profileText);
        console.log('✅ Profile Data Retrieved:');
        console.log('  - Full Response:', JSON.stringify(profileData, null, 2));
      } catch (e) {
        console.log('Response was not valid JSON:', profileText);
      }
    } else {
      console.log('❌ Profile retrieval failed:', profileResponse.status, profileResponse.statusText);
    }
    console.log('');

    // Check if stats exist
    console.log('📊 Checking user stats...');
    const statsResponse = await fetch(`${baseUrl}/user/stats?user_id=${encodeURIComponent(testPrivyUserId)}`, {
      method: 'GET',
      headers: headers
    });

    console.log('Stats Response Status:', statsResponse.status);
    const statsText = await statsResponse.text();
    console.log('Stats Response Body:', statsText);
    
    if (statsResponse.status === 200) {
      try {
        const statsData = JSON.parse(statsText);
        console.log('✅ Stats Data Retrieved:');
        console.log('  - Full Response:', JSON.stringify(statsData, null, 2));
      } catch (e) {
        console.log('Response was not valid JSON:', statsText);
      }
    } else {
      console.log('❌ Stats retrieval failed:', statsResponse.status, statsResponse.statusText);
    }
    console.log('');

    // Check if preferences exist
    console.log('⚙️  Checking user preferences...');
    const preferencesResponse = await fetch(`${baseUrl}/user/preferences?user_id=${encodeURIComponent(testPrivyUserId)}`, {
      method: 'GET',
      headers: headers
    });

    console.log('Preferences Response Status:', preferencesResponse.status);
    const preferencesText = await preferencesResponse.text();
    console.log('Preferences Response Body:', preferencesText);
    
    if (preferencesResponse.status === 200) {
      try {
        const preferencesData = JSON.parse(preferencesText);
        console.log('✅ Preferences Data Retrieved:');
        console.log('  - Full Response:', JSON.stringify(preferencesData, null, 2));
      } catch (e) {
        console.log('Response was not valid JSON:', preferencesText);
      }
    } else {
      console.log('❌ Preferences retrieval failed:', preferencesResponse.status, preferencesResponse.statusText);
    }
    console.log('');

    // Summary
    const profileSuccess = profileResponse.status === 200;
    const statsSuccess = statsResponse.status === 200;
    const preferencesSuccess = preferencesResponse.status === 200;

    console.log('📈 Data Verification Summary:');
    console.log('  - Profile:', profileSuccess ? '✅ Retrieved' : '❌ Not Found');
    console.log('  - Stats:', statsSuccess ? '✅ Retrieved' : '❌ Not Found');
    console.log('  - Preferences:', preferencesSuccess ? '✅ Retrieved' : '❌ Not Found');
    
    if (profileSuccess && statsSuccess && preferencesSuccess) {
      console.log('');
      console.log('🎉 SUCCESS: All user data is accessible through the API!');
      console.log('This confirms that the data was properly saved during our test.');
    } else {
      console.log('');
      console.log('⚠️  Some user data could not be retrieved through the API');
    }

  } catch (error) {
    console.error('❌ Error verifying user data:', error.message);
    console.log('Make sure the development server is running (npm run dev)');
  }
}

// Run the verification
verifyUserData();