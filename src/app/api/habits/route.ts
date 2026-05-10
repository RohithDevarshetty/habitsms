import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const HABIT_LIMITS: Record<string, number> = {
  free: 1,
  starter: 3,
  pro: 50,
  team: 50,
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_status')
      .eq('id', user.id)
      .single()

    const tier = profile?.subscription_tier || 'free'
    const isActive = profile?.subscription_status === 'active'

    const effectiveTier = isActive ? tier : 'free'
    const limit = HABIT_LIMITS[effectiveTier] ?? 1
    const { count } = await supabase
      .from('habits')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_active', true)

    if ((count || 0) >= limit) {
      return NextResponse.json(
        { error: `Habit limit reached (${limit} for ${tier} plan)`, code: 'LIMIT_REACHED', limit },
        { status: 402 }
      )
    }

    const body = await request.json()
    const { name, description, response_type, response_unit, reminder_time, template_type } = body

    if (!name || !response_type || !reminder_time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: habit, error } = await supabase.from('habits').insert({
      user_id: user.id,
      name,
      description: description || null,
      response_type,
      response_unit: response_unit || null,
      reminder_time,
      template_type: template_type || 'custom',
      reminder_enabled: true,
      is_active: true,
    }).select().single()

    if (error) throw error

    return NextResponse.json({ habit }, { status: 201 })
  } catch (error) {
    console.error('[Habits API] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create habit' },
      { status: 500 }
    )
  }
}
