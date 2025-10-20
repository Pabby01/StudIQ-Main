-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    wallet_address TEXT,
    avatar_url TEXT,
    bio TEXT,
    university TEXT,
    major TEXT,
    graduation_year INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_stats table
CREATE TABLE IF NOT EXISTS user_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT UNIQUE NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    total_cashback DECIMAL(10,2) DEFAULT 0.00,
    level INTEGER DEFAULT 1,
    completed_lessons INTEGER DEFAULT 0,
    portfolio_value DECIMAL(15,2) DEFAULT 0.00,
    streak_days INTEGER DEFAULT 0,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ai_chat_sessions table
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    subject TEXT,
    difficulty_level TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create ai_chat_messages table
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campus_store_products table
CREATE TABLE IF NOT EXISTS campus_store_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category TEXT NOT NULL,
    image_url TEXT,
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    is_active BOOLEAN DEFAULT true,
    university TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create marketplace_listings table
CREATE TABLE IF NOT EXISTS marketplace_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    category TEXT NOT NULL,
    condition TEXT NOT NULL,
    image_urls TEXT[] DEFAULT '{}',
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    is_sold BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('purchase', 'sale', 'cashback', 'points')),
    amount DECIMAL(15,2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    description TEXT NOT NULL,
    reference_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT UNIQUE NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN DEFAULT true,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    theme TEXT DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    language TEXT DEFAULT 'en',
    timezone TEXT DEFAULT 'UTC',
    privacy_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user_id ON ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session_id ON ai_chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_user_id ON ai_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_campus_store_products_category ON campus_store_products(category);
CREATE INDEX IF NOT EXISTS idx_campus_store_products_university ON campus_store_products(university);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_seller_id ON marketplace_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_listings_category ON marketplace_listings(category);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON user_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ai_chat_sessions_updated_at BEFORE UPDATE ON ai_chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campus_store_products_updated_at BEFORE UPDATE ON campus_store_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_marketplace_listings_updated_at BEFORE UPDATE ON marketplace_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" ON user_profiles FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Create RLS policies for user_stats
CREATE POLICY "Users can view their own stats" ON user_stats FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own stats" ON user_stats FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own stats" ON user_stats FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Create RLS policies for ai_chat_sessions
CREATE POLICY "Users can view their own chat sessions" ON ai_chat_sessions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can create their own chat sessions" ON ai_chat_sessions FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own chat sessions" ON ai_chat_sessions FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own chat sessions" ON ai_chat_sessions FOR DELETE USING (auth.uid()::text = user_id);

-- Create RLS policies for ai_chat_messages
CREATE POLICY "Users can view their own chat messages" ON ai_chat_messages FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can create their own chat messages" ON ai_chat_messages FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Create RLS policies for marketplace_listings
CREATE POLICY "Users can view active marketplace listings" ON marketplace_listings FOR SELECT USING (is_active = true);
CREATE POLICY "Users can view their own marketplace listings" ON marketplace_listings FOR SELECT USING (auth.uid()::text = seller_id);
CREATE POLICY "Users can create their own marketplace listings" ON marketplace_listings FOR INSERT WITH CHECK (auth.uid()::text = seller_id);
CREATE POLICY "Users can update their own marketplace listings" ON marketplace_listings FOR UPDATE USING (auth.uid()::text = seller_id);
CREATE POLICY "Users can delete their own marketplace listings" ON marketplace_listings FOR DELETE USING (auth.uid()::text = seller_id);

-- Create RLS policies for transactions
CREATE POLICY "Users can view their own transactions" ON transactions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can create their own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Create RLS policies for user_preferences
CREATE POLICY "Users can view their own preferences" ON user_preferences FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own preferences" ON user_preferences FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- Campus store products are publicly readable
CREATE POLICY "Campus store products are publicly readable" ON campus_store_products FOR SELECT USING (is_active = true);