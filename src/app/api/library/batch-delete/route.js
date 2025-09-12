// File: src/app/api/library/batch-delete/route.js

import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request) {
  try {
    const { items } = await request.json(); // Expects { items: [{ id, type }, ...] }
    const userId = 1; // TODO: Replace with actual user session/authentication

    if (!items || items.length === 0) {
      return NextResponse.json(
        { message: 'No items selected for deletion.' },
        { status: 400 }
      );
    }

    const client = await db.getClient(); // Create a dedicated client for transaction

    try {
      // Start transaction
      await client.query('BEGIN');

      for (const item of items) {
        if (item.type === 'video') {
          await client.query(
            'DELETE FROM userprogress WHERE video_id = $1 AND user_id = $2',
            [item.id, userId]
          );
          await client.query(
            'DELETE FROM videos WHERE id = $1',
            [item.id]
          );
        } else if (item.type === 'playlist') {
          await client.query(
            'DELETE FROM playlists WHERE id = $1',
            [item.id]
          );
        } else {
          throw new Error(`Unsupported item type: ${item.type}`);
        }
      }

      // Commit if all queries succeed
      await client.query('COMMIT');

      return NextResponse.json(
        { message: `${items.length} item(s) removed successfully.` },
        { status: 200 }
      );
    } catch (error) {
      // Rollback on any failure
      await client.query('ROLLBACK');
      console.error('Batch delete failed:', error);
      return NextResponse.json(
        { message: 'Failed to remove items.' },
        { status: 500 }
      );
    } finally {
      client.release(); // Always release the client
    }
  } catch (parseError) {
    console.error('Invalid request body:', parseError);
    return NextResponse.json(
      { message: 'Invalid request payload.' },
      { status: 400 }
    );
  }
}
