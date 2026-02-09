-- Add PayPal subscription ID column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS paypal_subscription_id text;