import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request) {
  try {
    const { videoId, progressSeconds } = await request.json();
    const userId = 1; // Hardcoded to our dummy user

    const queryText = `
      INSERT INTO userprogress (user_id, video_id, progress_seconds, last_watched_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id, video_id)
      DO UPDATE SET progress_seconds = EXCLUDED.progress_seconds, last_watched_at = NOW();
    `;

    await db.query(queryText, [userId, videoId, progressSeconds]);
    return NextResponse.json({ message: 'Progress saved.' }, { status: 200 });
  } catch (error) {
    console.error("API Error saving progress:", error);
    return NextResponse.json({ message: 'Failed to save progress.' }, { status: 500 });
  }
}