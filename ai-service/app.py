from flask import Flask, request, jsonify
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound

app = Flask(__name__)

@app.route('/api/get-transcript', methods=['POST'])
def get_transcript():
    data = request.get_json()
    video_id = data.get('videoId')

    if not video_id:
        return jsonify({"error": "videoId is required"}), 400

    try:
        # Try direct transcript fetch (works for auto-generated captions)
        transcript = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
        transcript_text = " ".join([item['text'] for item in transcript])
        return jsonify({"transcript": transcript_text})

    except (TranscriptsDisabled, NoTranscriptFound):
        try:
            # Fallback: try listing transcripts and fetch manually
            transcript_list_obj = YouTubeTranscriptApi.list_transcripts(video_id)
            transcript = transcript_list_obj.find_transcript(['en']).fetch()
            transcript_text = " ".join([item['text'] for item in transcript])
            return jsonify({"transcript": transcript_text})

        except (TranscriptsDisabled, NoTranscriptFound):
            error_message = "No transcript found for this video. The creator may have disabled or not provided captions."
            print(f"Transcript not found for videoId {video_id}: {error_message}")
            return jsonify({"error": error_message}), 404

    except Exception as e:
        print(f"An unexpected error occurred for videoId {video_id}: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)
