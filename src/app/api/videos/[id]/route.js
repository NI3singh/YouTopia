import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request, { params }) {
  const { id } = await params; // Get the ID from the URL


  try {
    const { rows } = await db.query('SELECT * FROM videos WHERE id = $1', [id]);

    if (rows.length === 0) {
      return NextResponse.json({ message: 'Video not found.' }, { status: 404 });
    }

    return NextResponse.json(rows[0], { status: 200 });
  } catch (error) {
    console.error('API Error fetching single video:', error);
    return NextResponse.json({ message: 'Failed to fetch video.' }, { status: 500 });
  }
}

// DELETE: Remove a video and its progress
export async function DELETE(request, { params }) {
  const { id } = params;
  const userId = 1; // For now, assume a single user

  try {
    // First, delete progress records for this video
    await db.query(
      'DELETE FROM userprogress WHERE video_id = $1 AND user_id = $2',
      [id, userId]
    );

    // Then, delete the video itself
    await db.query('DELETE FROM videos WHERE id = $1', [id]);

    return NextResponse.json(
      { message: 'Video removed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('API Error deleting video:', error);
    return NextResponse.json(
      { message: 'Failed to remove video' },
      { status: 500 }
    );
  }
}