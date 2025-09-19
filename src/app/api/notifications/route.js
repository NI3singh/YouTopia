import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request) {
  const userId = 1; // Hardcoded to our dummy user for now

  try {
    const { rows } = await db.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 15', // Fetch latest 15
      [userId]
    );
    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error('API Error fetching notifications:', error);
    return NextResponse.json({ message: 'Failed to fetch notifications' }, { status: 500 });
  }
}