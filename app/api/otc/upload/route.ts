import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const drugId = (formData.get('drugId') as string) || 'general'

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image file provided.' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, error: 'File must be an image (PNG, JPG, WEBP, etc.).' }, { status: 400 })
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'Image size exceeds the 5MB limit.' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'jpg'
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${cleanExt}`
    const filePath = `drugs/${drugId}/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    let supabase: any
    if (serviceRoleKey && supabaseUrl) {
      supabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
    } else {
      supabase = await createServerClient()
    }

    const { error: uploadError } = await supabase.storage
      .from('otc_images')
      .upload(filePath, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      })

    if (uploadError) {
      console.error('Storage upload error in API route:', uploadError)
      return NextResponse.json({ 
        success: false, 
        error: `Storage upload error: ${uploadError.message}. Make sure SUPABASE_SERVICE_ROLE_KEY is set in Vercel environment variables.` 
      }, { status: 500 })
    }

    const { data: urlData } = supabase.storage
      .from('otc_images')
      .getPublicUrl(filePath)

    return NextResponse.json({ success: true, url: urlData.publicUrl })
  } catch (err: any) {
    console.error('API upload error:', err)
    return NextResponse.json({ success: false, error: err.message || 'Internal server error while uploading.' }, { status: 500 })
  }
}
