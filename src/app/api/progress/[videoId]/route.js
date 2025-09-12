import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request, { params }) {
  const { videoId } = await params;
  const userId = 1; // Hardcoded to our dummy user for now

  try {
    const { rows } = await db.query(
      'SELECT progress_seconds FROM userprogress WHERE user_id = $1 AND video_id = $2',
      [userId, videoId]
    );

    const progress = rows.length > 0 ? rows[0].progress_seconds : 0;
    return NextResponse.json({ progress_seconds: progress }, { status: 200 });
  } catch (error) {
    console.error('API Error getting progress:', error);
    return NextResponse.json({ message: 'Failed to get progress.' }, { status: 500 });
  }
}