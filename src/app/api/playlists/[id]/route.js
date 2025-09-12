import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request, { params }) {
  const { id } = await params; // This is the playlist ID

  try {
    const playlistQuery = 'SELECT * FROM playlists WHERE id = $1';
    const playlistResult = await db.query(playlistQuery, [id]);

    if (playlistResult.rows.length === 0) {
      return NextResponse.json({ message: 'Playlist not found' }, { status: 404 });
    }

    const videosQuery = 'SELECT id, title, thumbnail_url, duration_iso FROM videos WHERE playlist_id = $1 ORDER BY created_at ASC';
    const videosResult = await db.query(videosQuery, [id]);

    const response = {
      playlist: playlistResult.rows[0],
      videos: videosResult.rows
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('API Error fetching playlist:', error);
    return NextResponse.json({ message: 'Failed to fetch playlist' }, { status: 500 });
  }
}
// DELETE: Remove a playlist and all its videos and progress

export async function DELETE(request, { params }) {
  const { id } = params;

  try {
    // Because of ON DELETE CASCADE in your DB schema,
    // all videos + progress tied to this playlist will also be deleted
    await db.query('DELETE FROM playlists WHERE id = $1', [id]);

    return NextResponse.json(
      { message: 'Playlist removed successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('API Error deleting playlist:', error);
    return NextResponse.json(
      { message: 'Failed to remove playlist' },
      { status: 500 }
    );
  }
}