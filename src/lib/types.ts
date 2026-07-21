// User profile
export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  signup_date: string;
  plan_type: 'free' | 'pro' | 'business';
  subscription_status: 'active' | 'inactive' | 'past_due' | 'cancelled';
  subscription_renewal_date?: string;
  razorpay_customer_id?: string;
  credits_remaining: number;
  created_at: string;
}

// Tool configuration
export interface Tool {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  system_instructions: string;
  input_type: 'short_text' | 'long_text' | 'image_upload';
  output_type: 'text' | 'code' | 'markdown';
  is_premium: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Generation history
export interface Generation {
  id: string;
  user_id: string;
  tool_id: string;
  input_data: string;
  output_data: string;
  created_at: string;
}

// Transaction / payment record
export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  plan: string;
  status: 'created' | 'captured' | 'failed' | 'refunded';
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  razorpay_subscription_id?: string;
  created_at: string;
}

// Plan definitions
export interface Plan {
  id: string;
  name: string;
  slug: string;
  price: number;
  currency: string;
  period: 'monthly' | 'yearly';
  credits_per_month: number;
  features: string[];
  is_popular?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    slug: 'free',
    price: 0,
    currency: 'INR',
    period: 'monthly',
    credits_per_month: 30,
    features: [
      '30 generations per month',
      'Access to free tools only',
      'Basic support',
      'Standard response speed',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    slug: 'pro',
    price: 499,
    currency: 'INR',
    period: 'monthly',
    credits_per_month: 300,
    is_popular: true,
    features: [
      '300 generations per month',
      'Access to all tools including premium',
      'Priority support',
      'Faster response speed',
      'Export results as PDF',
      'Generation history saved forever',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    slug: 'business',
    price: 1499,
    currency: 'INR',
    period: 'monthly',
    credits_per_month: 9999,
    features: [
      'Unlimited generations',
      'Access to all tools including premium',
      'Dedicated support',
      'Fastest response speed',
      'Export results as PDF',
      'Custom AI model fine-tuning',
      'Team accounts (up to 5)',
      'API access',
    ],
  },
];
