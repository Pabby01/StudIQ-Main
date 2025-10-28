import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('  NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('  SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test user data
const testUserId = 'did:privy:test-new-user-' + Date.now();
const testWalletAddress = '7xKXtg2CW34dJq9usX6ewnA8sZMFVU6m5p9MNv4jezL'; // Valid Solana wallet address

console.log('🧪 Testing new user creation flow...');
console.log('Test User ID:', testUserId);
console.log('Test Wallet Address:', testWalletAddress);
console.log('');

async function testUserCreation() {
  try {
    console.log('📝 Step 1: Testing direct profile creation...');
    
    // Test direct profile creation (simulating what UserProfileManager.upsertProfile does)
    const profileData = {
      user_id: testUserId,
      wallet_address: testWalletAddress,
      display_name: 'Test User',
      email: 'test@example.com',
      phone: null,
      avatar_url: null
    };

    const { data: profileResult, error: profileError } = await supabase
      .from('user_profiles')
      .upsert(profileData, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (profileError) {
      console.error('❌ Profile creation failed:', profileError);
      return;
    }

    console.log('✅ Profile created successfully:', profileResult.id);

    console.log('📊 Step 2: Testing stats creation...');
    
    // Test stats creation
    const statsData = {
      user_id: testUserId,
      total_points: 0,
      total_cashback: 0,
      level: 1,
      completed_lessons: 0,
      portfolio_value: 0,
      streak_days: 0,
      last_activity: new Date().toISOString()
    };

    const { data: statsResult, error: statsError } = await supabase
      .from('user_stats')
      .upsert(statsData, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (statsError) {
      console.error('❌ Stats creation failed:', statsError);
      return;
    }

    console.log('✅ Stats created successfully:', statsResult.id);

    console.log('⚙️ Step 3: Testing preferences creation...');
    
    // Test preferences creation
    const preferencesData = {
      user_id: testUserId,
      theme: 'light',
      notifications_enabled: true,
      language: 'en'
    };

    const { data: preferencesResult, error: preferencesError } = await supabase
      .from('user_preferences')
      .upsert(preferencesData, { 
        onConflict: 'user_id',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (preferencesError) {
      console.error('❌ Preferences creation failed:', preferencesError);
      return;
    }

    console.log('✅ Preferences created successfully:', preferencesResult.id);

    console.log('');
    console.log('🔍 Step 4: Verifying data persistence...');
    
    // Wait a moment and then verify the data is still there
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: verifyProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    const { data: verifyStats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    const { data: verifyPreferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    console.log('📈 Verification Results:');
    console.log('  - Profile:', verifyProfile ? '✅ Persisted' : '❌ Missing');
    console.log('  - Stats:', verifyStats ? '✅ Persisted' : '❌ Missing');
    console.log('  - Preferences:', verifyPreferences ? '✅ Persisted' : '❌ Missing');

    if (verifyProfile && verifyStats && verifyPreferences) {
      console.log('');
      console.log('🎉 Direct database operations work correctly!');
      console.log('');
      console.log('🔍 Now testing API endpoints...');
      
      // Test the API endpoints
      await testAPIEndpoints();
    } else {
      console.log('');
      console.log('⚠️ Direct database operations failed - this indicates a database/RLS issue');
    }

  } catch (error) {
    console.error('❌ Error during user creation test:', error.message);
  }
}

async function testAPIEndpoints() {
  try {
    const newTestUserId = 'did:privy:test-api-user-' + Date.now();
    const newTestWalletAddress = '7xKXtg2CW34dJq9usX6ewnA8sZMFVU6m5p9MNv4jezL'; // Valid Solana wallet address
    
    console.log('🌐 Testing /api/user/initialize endpoint...');
    
    // Test the initialize endpoint
    const initResponse = await fetch('http://localhost:3001/api/user/initialize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: newTestUserId,
        wallet_address: newTestWalletAddress,
        display_name: 'API Test User',
        email: 'apitest@example.com',
        phone: null
      })
    });

    console.log('Initialize API Response Status:', initResponse.status);
    
    if (initResponse.ok) {
      const initResult = await initResponse.json();
      console.log('✅ Initialize API succeeded');
      console.log('  - Has Profile:', !!initResult.profile);
      console.log('  - Has Stats:', !!initResult.stats);
      console.log('  - Has Preferences:', !!initResult.preferences);
    } else {
      const errorText = await initResponse.text();
      console.log('❌ Initialize API failed:', errorText);
    }

    console.log('');
    console.log('🌐 Testing /api/user/profile endpoint...');
    
    // Test the profile endpoint
    const profileResponse = await fetch('http://localhost:3001/api/user/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: 'did:privy:test-profile-user-' + Date.now(),
        wallet_address: '7xKXtg2CW34dJq9usX6ewnA8sZMFVU6m5p9MNv4jezL', // Valid Solana wallet address
        display_name: 'Profile Test User',
        email: 'profiletest@example.com'
      })
    });

    console.log('Profile API Response Status:', profileResponse.status);
    
    if (profileResponse.ok) {
      const profileResult = await profileResponse.json();
      console.log('✅ Profile API succeeded');
      console.log('  - Profile ID:', profileResult.profile?.id);
    } else {
      const errorText = await profileResponse.text();
      console.log('❌ Profile API failed:', errorText);
    }

  } catch (error) {
    console.error('❌ Error testing API endpoints:', error.message);
  }
}

// Run the test
testUserCreation();