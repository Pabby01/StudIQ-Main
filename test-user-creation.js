// Test script to reproduce the user creation issue
const testUserCreation = async () => {
  console.log('🧪 Testing user creation flow...')
  
  // Simulate a new Privy user
  const testPrivyUserId = 'did:privy:cmh7aw3mp01wmkw0c5txedthl'
  const testWalletAddress = '7xKXtg2CW34dJq9usX6ewnA8sZMFVU6m5p9MNv4jezL'
  
  console.log('📋 Test data:')
  console.log('- Privy User ID:', testPrivyUserId)
  console.log('- Wallet Address:', testWalletAddress)
  
  try {
    // Test 1: Try to get profile (should return 404 for new user)
    console.log('\n🔍 Test 1: Getting profile for new user...')
    const profileResponse = await fetch(`http://localhost:3000/api/user/profile?user_id=${encodeURIComponent(testPrivyUserId)}`)
    console.log('Profile response status:', profileResponse.status)
    
    if (profileResponse.status === 404) {
      console.log('✅ Expected: Profile not found (new user)')
    } else {
      console.log('❌ Unexpected: Profile found or error')
    }
    
    // Test 2: Try to create profile (this should work with special auth handling)
    console.log('\n📝 Test 2: Creating profile for new user...')
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
        // Note: We're not including a Privy token, which might be the issue
      },
      body: JSON.stringify(profileData)
    })
    
    console.log('Create profile response status:', createResponse.status)
    
    if (createResponse.status === 201) {
      const result = await createResponse.json()
      console.log('✅ Profile created successfully:', result)
    } else {
      const error = await createResponse.text()
      console.log('❌ Profile creation failed:', error)
    }
    
    // Test 3: Try to get stats (should also return 404)
    console.log('\n📊 Test 3: Getting stats for new user...')
    const statsResponse = await fetch(`http://localhost:3000/api/user/stats?user_id=${encodeURIComponent(testPrivyUserId)}`)
    console.log('Stats response status:', statsResponse.status)
    
  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run the test
testUserCreation().then(() => {
  console.log('\n🎯 Test completed')
}).catch(error => {
  console.error('💥 Test error:', error)
})