import { NextResponse } from 'next/server';
import db from '@/lib/db';

// In src/app/api/videos/route.js

export async function GET(request) {
  const userId = 1;
  // Get the search query from the URL, e.g., /api/videos?search=react
  const { searchParams } = new URL(request.url);
  const searchTerm = searchParams.get('search') || '';

  // The '%' are wildcards, so it matches any title containing the search term.
  // ILIKE is case-insensitive.
  const searchQuery = `%${searchTerm}%`;

  const queryText = `
    SELECT * FROM (
      SELECT
        id, title, thumbnail_url, channel_title, created_at, first_video_id,
        NULL AS duration_iso,
        NULL AS progress_seconds,
        'playlist' AS type
      FROM (
        SELECT
          p.id, p.title, p.thumbnail_url, p.channel_title, p.created_at,
          (SELECT v.id FROM videos v WHERE v.playlist_id = p.id ORDER BY v.created_at ASC LIMIT 1) AS first_video_id
        FROM playlists p
      ) AS playlists_with_first_video
      WHERE title ILIKE $2 -- Filter playlists by title

      UNION ALL

      SELECT
        v.id, v.title, v.thumbnail_url, v.channel_title, v.created_at, NULL AS first_video_id,
        v.duration_iso,
        up.progress_seconds,
        'video' AS type
      FROM videos v
      LEFT JOIN userprogress up ON v.id = up.video_id AND up.user_id = $1
      WHERE v.playlist_id IS NULL AND v.title ILIKE $2 -- Filter videos by title
    ) AS combined_results
    ORDER BY created_at DESC;
  `;

  try {
    const { rows } = await db.query(queryText, [userId, searchQuery]);
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ message: 'Failed to fetch library' }, { status: 500 });
  }
}