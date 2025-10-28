// Test the complete user registration flow with Privy token simulation
const testCompleteFlow = async () => {
  console.log('🧪 Testing complete user registration flow...')
  
  // Simulate a new Privy user
  const testPrivyUserId = 'did:privy:cmh7aw3mp01wmkw0c5txedthl'
  const testWalletAddress = '7xKXtg2CW34dJq9usX6ewnA8sZMFVU6m5p9MNv4jezL'
  
  // Create a mock Privy token (this would normally come from Privy SDK)
  // For testing, we'll create a simple JWT-like token
  const mockPrivyToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6cHJpdnk6Y21oN2F3M21wMDF3bWt3MGM1dHhlZHRobCIsImlhdCI6MTYxNjIzOTAyMn0.test'
  
  console.log('📋 Test data:')
  console.log('- Privy User ID:', testPrivyUserId)
  console.log('- Wallet Address:', testWalletAddress)
  console.log('- Mock Privy Token:', mockPrivyToken.substring(0, 20) + '...')
  
  try {
    // Test 1: Create profile with Privy token (should work)
    console.log('\n📝 Test 1: Creating profile with Privy token...')
    const profileData = {
      user_id: testPrivyUserId,
      display_name: 'Test User',
      wallet_address: testWalletAddress,
      email: 'test@example.com'
    }
    
    const createResponse = await fetch('http://localhost:3000/api/user/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockPrivyToken}`,
        'x-privy-token': mockPrivyToken
      },
      body: JSON.stringify(profileData)
    })
    
    console.log('Create profile response status:', createResponse.status)
    
    if (createResponse.status === 201) {
      const result = await createResponse.json()
      console.log('✅ Profile created successfully')
    } else {
      const error = await createResponse.text()
      console.log('❌ Profile creation failed:', error)
    }
    
    // Test 2: Create stats with Privy token (should work)
    console.log('\n📊 Test 2: Creating stats with Privy token...')
    const statsData = {
      user_id: testPrivyUserId,
      total_points: 0,
      total_cashback: 0,
      level: 1,
      completed_lessons: 0,
      portfolio_value: 0,
      streak_days: 0,
      last_activity: new Date().toISOString()
    }
    
    const statsResponse = await fetch('http://localhost:3000/api/user/stats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockPrivyToken}`,
        'x-privy-token': mockPrivyToken
      },
      body: JSON.stringify(statsData)
    })
    
    console.log('Create stats response status:', statsResponse.status)
    
    if (statsResponse.status === 201) {
      const result = await statsResponse.json()
      console.log('✅ Stats created successfully')
    } else {
      const error = await statsResponse.text()
      console.log('❌ Stats creation failed:', error)
    }
    
    // Test 3: Create preferences with Privy token (should work)
    console.log('\n⚙️ Test 3: Creating preferences with Privy token...')
    const preferencesData = {
      user_id: testPrivyUserId,
      theme: 'light',
      notifications_enabled: true,
      language: 'en'
    }
    
    const prefsResponse = await fetch('http://localhost:3000/api/user/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockPrivyToken}`,
        'x-privy-token': mockPrivyToken
      },
      body: JSON.stringify(preferencesData)
    })
    
    console.log('Create preferences response status:', prefsResponse.status)
    
    if (prefsResponse.status === 201) {
      const result = await prefsResponse.json()
      console.log('✅ Preferences created successfully')
    } else {
      const error = await prefsResponse.text()
      console.log('❌ Preferences creation failed:', error)
    }
    
    // Test 4: Get profile with Privy token (should work now)
    console.log('\n🔍 Test 4: Getting profile with Privy token...')
    const getProfileResponse = await fetch(`http://localhost:3000/api/user/profile?user_id=${encodeURIComponent(testPrivyUserId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockPrivyToken}`,
        'x-privy-token': mockPrivyToken
      }
    })
    
    console.log('Get profile response status:', getProfileResponse.status)
    
    if (getProfileResponse.status === 200) {
      const result = await getProfileResponse.json()
      console.log('✅ Profile retrieved successfully')
    } else {
      const error = await getProfileResponse.text()
      console.log('❌ Profile retrieval failed:', error)
    }
    
    // Test 5: Get stats with Privy token (should work now)
    console.log('\n📈 Test 5: Getting stats with Privy token...')
    const getStatsResponse = await fetch(`http://localhost:3000/api/user/stats?user_id=${encodeURIComponent(testPrivyUserId)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockPrivyToken}`,
        'x-privy-token': mockPrivyToken
      }
    })
    
    console.log('Get stats response status:', getStatsResponse.status)
    
    if (getStatsResponse.status === 200) {
      const result = await getStatsResponse.json()
      console.log('✅ Stats retrieved successfully')
    } else {
      const error = await getStatsResponse.text()
      console.log('❌ Stats retrieval failed:', error)
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run the test
testCompleteFlow().then(() => {
  console.log('\n🎯 Complete flow test finished')
}).catch(error => {
  console.error('💥 Test error:', error)
})