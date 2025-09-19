import { NextResponse } from 'next/server';
import db from '@/lib/db';
import axios from 'axios';

export async function POST(request) {
  // 1. SECURITY CHECK: Ensure the request is coming from Vercel's Cron service
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  try {
    console.log('Starting playlist sync job...');
    // 2. GET ALL PLAYLISTS FROM OUR DATABASE
    const { rows: playlists } = await db.query('SELECT id, youtube_playlist_id, title FROM playlists');
    let newVideosFound = 0;

    // 3. LOOP THROUGH EACH PLAYLIST
    for (const playlist of playlists) {
      // Get the current list of video IDs from the YouTube API
      const playlistItemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlist.youtube_playlist_id}&key=${apiKey}&maxResults=50`;
      const itemsResponse = await axios.get(playlistItemsUrl);
      const youtubeVideoIds = new Set(itemsResponse.data.items.map(item => item.contentDetails.videoId));

      // Get the list of video IDs we ALREADY have for this playlist
      const { rows: existingVideos } = await db.query('SELECT youtube_id FROM videos WHERE playlist_id = $1', [playlist.id]);
      const existingVideoIds = new Set(existingVideos.map(v => v.youtube_id));

      // 4. FIND THE DIFFERENCE (the new videos)
      const newVideoIds = [...youtubeVideoIds].filter(id => !existingVideoIds.has(id));

      if (newVideoIds.length > 0) {
        console.log(`Found ${newVideoIds.length} new videos for playlist "${playlist.title}"`);
        newVideosFound += newVideoIds.length;

        // 5. GET DETAILS FOR THE NEW VIDEOS
        const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${newVideoIds.join(',')}&key=${apiKey}`;
        const videosResponse = await axios.get(videoDetailsUrl);

        // 6. SAVE NEW VIDEOS AND CREATE NOTIFICATIONS
        for (const videoData of videosResponse.data.items) {
          // Insert the new video into the 'videos' table
          const videoQuery = `INSERT INTO videos (youtube_id, title, thumbnail_url, duration_iso, channel_title, playlist_id) VALUES ($1, $2, $3, $4, $5, $6);`;
          await db.query(videoQuery, [
            videoData.id,
            videoData.snippet.title,
            videoData.snippet.thumbnails.high.url,
            videoData.contentDetails.duration,
            videoData.snippet.channelTitle,
            playlist.id
          ]);

          // Create a notification for the user
          const notificationMessage = `New video "${videoData.snippet.title}" was added to your "${playlist.title}" playlist.`;
          await db.query('INSERT INTO notifications (user_id, message) VALUES ($1, $2)', [1, notificationMessage]); // Hardcoded user_id=1
        }
      }
    }

    console.log(`Sync job finished. Found ${newVideosFound} total new videos.`);
    return NextResponse.json({ message: `Sync completed. ${newVideosFound} new videos added.` }, { status: 200 });

  } catch (error) {
    console.error('Cron job failed:', error.message);
    return NextResponse.json({ message: 'Cron job failed.' }, { status: 500 });
  }
}