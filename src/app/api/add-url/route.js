import { NextResponse } from 'next/server';
import db from '@/lib/db';
import axios from 'axios';
import getYouTubeId from 'get-youtube-id';
import queryString from 'query-string';

export async function POST(request) {
  try {
    const { url } = await request.json();
    const isPlaylist = url.includes('playlist?list=');
    const apiKey = process.env.YOUTUBE_API_KEY;

    if (isPlaylist) {
      // --- PLAYLIST LOGIC ---
      const parsedUrl = queryString.parseUrl(url);
      const playlistId = parsedUrl.query.list;

      // 1. Get Playlist Details
      const playlistDetailsUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${apiKey}`;
      const playlistResponse = await axios.get(playlistDetailsUrl);
      const playlistData = playlistResponse.data.items[0].snippet;

      // 2. Save Playlist to our DB and get its new ID
      const playlistQuery = `
        INSERT INTO playlists (youtube_playlist_id, title, thumbnail_url, channel_title)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (youtube_playlist_id) DO NOTHING
        RETURNING id;
      `;
      const playlistValues = [playlistId, playlistData.title, playlistData.thumbnails.high.url, playlistData.channelTitle];
      const dbResponse = await db.query(playlistQuery, playlistValues);

      // If the query returned no rows, it means the playlist already existed.
      if (dbResponse.rows.length === 0) {
        return NextResponse.json({ message: `Playlist "${playlistData.title}" is already in your library.` }, { status: 409 }); // 409 Conflict is the correct status code for a duplicate.
      }
      
      // If we get here, the playlist was new, so we can safely get its ID.
      const newPlaylistId = dbResponse.rows[0].id;

      // 3. Get all Video IDs from the Playlist
      const playlistItemsUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlistId}&key=${apiKey}&maxResults=50`;
      const itemsResponse = await axios.get(playlistItemsUrl);
      const videoIds = itemsResponse.data.items.map(item => item.contentDetails.videoId).join(',');
      
      // 4. Get Details for all Videos in a Batch
      const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds}&key=${apiKey}`;
      const videosResponse = await axios.get(videoDetailsUrl);

      // 5. Save all Videos to our DB, linking them to the Playlist ID
      for (const videoData of videosResponse.data.items) {
        const videoQuery = `
          INSERT INTO videos (youtube_id, title, thumbnail_url, duration_iso, channel_title, playlist_id)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (youtube_id) DO NOTHING;
        `;
        const videoValues = [
          videoData.id,
          videoData.snippet.title,
          videoData.snippet.thumbnails.high.url,
          videoData.contentDetails.duration,
          videoData.snippet.channelTitle,
          newPlaylistId // Link to the playlist we just created
        ];
        await db.query(videoQuery, videoValues);
      }

      return NextResponse.json({ message: `Playlist "${playlistData.title}" added successfully!` }, { status: 200 });

    } else {
      // --- SINGLE VIDEO LOGIC ---
      const videoId = getYouTubeId(url);
      if (!videoId) {
        return NextResponse.json({ message: 'Invalid YouTube URL' }, { status: 400 });
      }
      const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`;
      const response = await axios.get(apiUrl);
      const videoData = response.data.items[0];

      if (!videoData) {
        return NextResponse.json({ message: 'Video not found on YouTube.' }, { status: 404 });
      }

      const { title } = videoData.snippet;
      const thumbnail = videoData.snippet.thumbnails.high.url;
      const duration = videoData.contentDetails.duration;
      const channelTitle = videoData.snippet.channelTitle;

      const queryText = `
        INSERT INTO videos (youtube_id, title, thumbnail_url, duration_iso, channel_title)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (youtube_id) DO NOTHING RETURNING *;
      `;
      const values = [videoId, title, thumbnail, duration, channelTitle];
      const dbVideoResponse = await db.query(queryText, values);

      if (dbVideoResponse.rowCount === 0) {
        return NextResponse.json({ message: `Video "${title}" is already in your library.` }, { status: 409 });
      }
      return NextResponse.json({ message: 'Video added successfully!' }, { status: 200 });
    }
  } catch (error) {
    console.error('API Error in add-url:', error.response ? error.response.data : error.message);
    return NextResponse.json({ message: 'An error occurred while adding the URL.' }, { status: 500 });
  }
}
