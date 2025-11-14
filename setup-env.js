#!/usr/bin/env node

/**
 * StudIQ Environment Setup Script
 * 
 * This script helps you set up the required environment variables
 * for the StudIQ application to work properly.
 */

import fs from 'fs';
import path from 'path';

console.log('🚀 StudIQ Environment Setup');
console.log('============================\n');

const envLocalPath = path.join(__dirname, '.env.local');
const envTemplatePath = path.join(__dirname, '.env.local.template');

// Check if .env.local already exists
if (fs.existsSync(envLocalPath)) {
  console.log('✅ .env.local file already exists');
  
  // Check if required variables are set
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  const requiredVars = [
    'NEXT_PUBLIC_PRIVY_APP_ID',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY'
  ];
  
  const missingVars = [];
  requiredVars.forEach(varName => {
    const regex = new RegExp(`^${varName}=(?!your_|$)`, 'm');
    if (!regex.test(envContent)) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    console.log('⚠️  Some required environment variables are missing or not configured:');
    missingVars.forEach(varName => {
      console.log(`   - ${varName}`);
    });
    console.log('\n📝 Please edit your .env.local file and set these variables.');
    console.log('💡 You can find the template values in .env.local.template');
  } else {
    console.log('✅ All required environment variables appear to be configured');
  }
} else {
  console.log('📄 Creating .env.local file from template...');
  
  if (fs.existsSync(envTemplatePath)) {
    fs.copyFileSync(envTemplatePath, envLocalPath);
    console.log('✅ .env.local file created successfully');
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Edit the .env.local file');
    console.log('2. Replace all "your_*_here" values with your actual credentials');
    console.log('3. Pay special attention to SUPABASE_SERVICE_ROLE_KEY - this is critical for user creation');
  } else {
    console.log('❌ Template file not found. Creating basic .env.local...');
    
    const basicEnv = `# StudIQ Environment Configuration
# Fill in your actual values

# Required: Privy Configuration
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
PRIVY_APP_SECRET=your_privy_app_secret_here

# Required: Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Required: OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Optional
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NODE_ENV=development
`;
    
    fs.writeFileSync(envLocalPath, basicEnv);
    console.log('✅ Basic .env.local file created');
  }
}

console.log('\n🔧 CONFIGURATION GUIDE:');
console.log('=======================');
console.log('1. Privy (Authentication):');
console.log('   - Go to https://dashboard.privy.io/');
console.log('   - Get your App ID and App Secret');
console.log('');
console.log('2. Supabase (Database):');
console.log('   - Go to your Supabase project settings');
console.log('   - Copy the Project URL and anon key');
console.log('   - ⚠️  CRITICAL: Get the service_role key (this is required for user creation)');
console.log('');
console.log('3. OpenAI (AI Features):');
console.log('   - Go to https://platform.openai.com/api-keys');
console.log('   - Create a new API key');
console.log('');
console.log('🚨 IMPORTANT: Without SUPABASE_SERVICE_ROLE_KEY, new users will NOT be saved to the database!');
console.log('');
console.log('📋 After configuration:');
console.log('1. Restart your development server: npm run dev');
console.log('2. Test user creation to verify everything works');
console.log('3. Check the Supabase dashboard to confirm users are being created');