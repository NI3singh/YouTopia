import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request) {
  try {
    const { videoId } = await request.json();

    if (!videoId) {
      return NextResponse.json({ message: 'Video ID is required' }, { status: 400 });
    }

    // The Next.js server makes a request to the Python server on localhost
    const pythonApiUrl = 'http://localhost:5001/api/get-transcript';

    const response = await axios.post(pythonApiUrl, { videoId });

    // Forward the response from the Python service back to the client
    return NextResponse.json(response.data, { status: 200 });

  } catch (error) {
    // Handle errors, including if the Python service is down
    console.error('API Error fetching transcript:', error.message);
    const errorMessage = error.response ? error.response.data.error : 'Failed to connect to the AI service.';
    return NextResponse.json({ message: errorMessage }, { status: 500 });
  }
}