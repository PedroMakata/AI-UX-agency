-- STEP 4: Run this
CREATE TABLE IF NOT EXISTS user_profiles (id UUID PRIMARY KEY, email TEXT, phone TEXT, avatar_url TEXT, avatar_preset INTEGER);

-- STEP 5: Run this
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- STEP 6: Run this
CREATE POLICY profiles_all ON user_profiles USING (true);
