/**
 * High-Performance Authentication & User Management
 * Optimized for speed and security
 */

import { createClient } from './db';

const supabase = createClient();

export interface User {
  id: string;
  email: string;
  figma_user_id?: string;
  figma_handle?: string;
  trial_count: number;
  subscription_status: 'trial' | 'active' | 'expired';
  api_key_encrypted?: string;
  last_active_at: string;
  created_at: string;
  updated_at: string;
}

export interface UserContext {
  id: string;
  user_id: string;
  response_style: {
    length: 'brief' | 'detailed' | 'comprehensive';
    tone: 'casual' | 'professional' | 'encouraging' | 'critical';
    focus: string[];
    domain: string;
    language: string;
  };
  custom_prompts: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UsageStats {
  total_interactions: number;
  trial_remaining: number;
  total_cost_cents: number;
}

// Cache for user contexts to avoid repeated DB calls
const contextCache = new Map<string, { context: UserContext; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get user by ID with caching
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }

    return data as User;
  } catch (error) {
    console.error('Error in getUserById:', error);
    return null;
  }
}

/**
 * Get user by Figma user ID
 */
export async function getUserByFigmaId(figmaUserId: string): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('figma_user_id', figmaUserId)
      .single();

    if (error) {
      console.error('Error fetching user by Figma ID:', error);
      return null;
    }

    return data as User;
  } catch (error) {
    console.error('Error in getUserByFigmaId:', error);
    return null;
  }
}

/**
 * Create or update user
 */
export async function upsertUser(userData: Partial<User>): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        ...userData,
        last_active_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting user:', error);
      return null;
    }

    return data as User;
  } catch (error) {
    console.error('Error in upsertUser:', error);
    return null;
  }
}

/**
 * Get user context with high-performance caching
 */
export async function getUserContext(userId: string): Promise<UserContext | null> {
  try {
    // Check cache first
    const cached = contextCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.context;
    }

    // Fetch from database
    const { data, error } = await supabase
      .from('user_contexts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      console.error('Error fetching user context:', error);
      return null;
    }

    const context = data as UserContext;
    
    // Cache the result
    contextCache.set(userId, { context, timestamp: Date.now() });
    
    return context;
  } catch (error) {
    console.error('Error in getUserContext:', error);
    return null;
  }
}

/**
 * Update user context with cache invalidation
 */
export async function updateUserContext(
  userId: string, 
  contextData: Partial<UserContext>
): Promise<UserContext | null> {
  try {
    const { data, error } = await supabase
      .from('user_contexts')
      .upsert({
        user_id: userId,
        ...contextData,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error updating user context:', error);
      return null;
    }

    const context = data as UserContext;
    
    // Invalidate cache
    contextCache.delete(userId);
    
    return context;
  } catch (error) {
    console.error('Error in updateUserContext:', error);
    return null;
  }
}

/**
 * Track usage with performance optimization
 */
export async function trackUsage(
  userId: string,
  fileKey: string,
  interactionType: 'trial' | 'paid',
  apiKeyUsed: 'yours' | 'user',
  responseTimeMs?: number,
  tokensUsed?: number
): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .rpc('track_usage', {
        user_uuid: userId,
        file_key_param: fileKey,
        interaction_type_param: interactionType,
        api_key_used_param: apiKeyUsed,
        response_time_ms_param: responseTimeMs,
        tokens_used_param: tokensUsed
      });

    if (error) {
      console.error('Error tracking usage:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in trackUsage:', error);
    return null;
  }
}

/**
 * Get user dashboard data
 */
export async function getUserDashboard(userId: string): Promise<{
  user: User;
  context: UserContext | null;
  stats: UsageStats;
} | null> {
  try {
    const { data, error } = await supabase
      .from('user_dashboard')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user dashboard:', error);
      return null;
    }

    return {
      user: {
        id: data.id,
        email: data.email,
        figma_user_id: data.figma_user_id,
        figma_handle: data.figma_handle,
        trial_count: data.trial_count,
        subscription_status: data.subscription_status,
        api_key_encrypted: data.api_key_encrypted,
        last_active_at: data.last_active_at,
        created_at: data.created_at,
        updated_at: data.updated_at
      },
      context: data.response_style ? {
        id: '',
        user_id: data.id,
        response_style: data.response_style,
        custom_prompts: {},
        is_active: true,
        created_at: '',
        updated_at: ''
      } : null,
      stats: {
        total_interactions: data.total_interactions || 0,
        trial_remaining: data.trial_remaining || 10,
        total_cost_cents: data.total_cost_cents || 0
      }
    };
  } catch (error) {
    console.error('Error in getUserDashboard:', error);
    return null;
  }
}

/**
 * Check if user has trial remaining
 */
export async function hasTrialRemaining(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('trial_count')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking trial remaining:', error);
      return false;
    }

    return data.trial_count < 10;
  } catch (error) {
    console.error('Error in hasTrialRemaining:', error);
    return false;
  }
}

/**
 * Increment trial count
 */
export async function incrementTrialCount(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        trial_count: supabase.raw('trial_count + 1'),
        last_active_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error incrementing trial count:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in incrementTrialCount:', error);
    return false;
  }
}

/**
 * Clear context cache (for testing or manual cache invalidation)
 */
export function clearContextCache(): void {
  contextCache.clear();
}
