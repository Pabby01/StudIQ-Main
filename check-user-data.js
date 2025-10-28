const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key for full access
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Required:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY');
  console.log('');
  console.log('Available environment variables:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
  console.log('- SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Test user data from our previous test
const testPrivyUserId = 'did:privy:cmh7aw3mp01wmkw0c5txedthl';
const testWalletAddress = '7xKXtg2CW34dJq9usX6ewnA8sZMFVU6m5p9MNv4jezL';

async function checkUserData() {
  console.log('🔍 Checking user data in Supabase database...');
  console.log('Test User ID:', testPrivyUserId);
  console.log('Test Wallet Address:', testWalletAddress);
  console.log('');

  try {
    // Check user_profiles table
    console.log('📋 Checking user_profiles table...');
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', testPrivyUserId)
      .single();

    if (profileError) {
      console.log('❌ Profile Error:', profileError.message);
    } else if (profileData) {
      console.log('✅ Profile Found:');
      console.log('  - User ID:', profileData.user_id);
      console.log('  - Display Name:', profileData.display_name);
      console.log('  - Wallet Address:', profileData.wallet_address);
      console.log('  - Email:', profileData.email);
      console.log('  - Created At:', profileData.created_at);
      console.log('  - Updated At:', profileData.updated_at);
    } else {
      console.log('⚠️  No profile found for this user');
    }
    console.log('');

    // Check user_stats table
    console.log('📊 Checking user_stats table...');
    const { data: statsData, error: statsError } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', testPrivyUserId)
      .single();

    if (statsError) {
      console.log('❌ Stats Error:', statsError.message);
    } else if (statsData) {
      console.log('✅ Stats Found:');
      console.log('  - User ID:', statsData.user_id);
      console.log('  - Total Points:', statsData.total_points);
      console.log('  - Total Cashback:', statsData.total_cashback);
      console.log('  - Level:', statsData.level);
      console.log('  - Completed Lessons:', statsData.completed_lessons);
      console.log('  - Portfolio Value:', statsData.portfolio_value);
      console.log('  - Streak Days:', statsData.streak_days);
      console.log('  - Last Activity:', statsData.last_activity);
      console.log('  - Created At:', statsData.created_at);
      console.log('  - Updated At:', statsData.updated_at);
    } else {
      console.log('⚠️  No stats found for this user');
    }
    console.log('');

    // Check user_preferences table
    console.log('⚙️  Checking user_preferences table...');
    const { data: preferencesData, error: preferencesError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', testPrivyUserId)
      .single();

    if (preferencesError) {
      console.log('❌ Preferences Error:', preferencesError.message);
    } else if (preferencesData) {
      console.log('✅ Preferences Found:');
      console.log('  - User ID:', preferencesData.user_id);
      console.log('  - Notifications Enabled:', preferencesData.notifications_enabled);
      console.log('  - Email Notifications:', preferencesData.email_notifications);
      console.log('  - Push Notifications:', preferencesData.push_notifications);
      console.log('  - Theme:', preferencesData.theme);
      console.log('  - Language:', preferencesData.language);
      console.log('  - Timezone:', preferencesData.timezone);
      console.log('  - Privacy Settings:', JSON.stringify(preferencesData.privacy_settings));
      console.log('  - Created At:', preferencesData.created_at);
      console.log('  - Updated At:', preferencesData.updated_at);
    } else {
      console.log('⚠️  No preferences found for this user');
    }
    console.log('');

    // Summary
    const hasProfile = !!profileData;
    const hasStats = !!statsData;
    const hasPreferences = !!preferencesData;

    console.log('📈 Summary:');
    console.log('  - Profile:', hasProfile ? '✅ Saved' : '❌ Missing');
    console.log('  - Stats:', hasStats ? '✅ Saved' : '❌ Missing');
    console.log('  - Preferences:', hasPreferences ? '✅ Saved' : '❌ Missing');
    
    if (hasProfile && hasStats && hasPreferences) {
      console.log('');
      console.log('🎉 All user data is properly saved in Supabase!');
    } else {
      console.log('');
      console.log('⚠️  Some user data is missing from the database');
    }

  } catch (error) {
    console.error('❌ Error checking user data:', error.message);
  }
}

// Run the check
checkUserData();