-- Grant premium (pro) access to specific user
UPDATE profiles
SET plan = 'pro'
WHERE email = 'patjbmail+agentpulses.com@gmail.com';
