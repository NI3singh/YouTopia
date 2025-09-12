'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import YouTube from 'react-youtube';
import Image from 'next/image';
import Loader from '@/components/Loader';


export default function WatchPage() {
  const { id: videoId } = useParams();
  const [video, setVideo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playlist, setPlaylist] = useState(null);
  
  const playerRef = useRef(null);
  const intervalRef = useRef(null);

    useEffect(() => { 
        setVideo(null);
        setPlaylist(null);
        setIsLoading(true);
        if (videoId) {
            const fetchVideoDetails = async () => {
                try {
                    const response = await fetch(`/api/videos/${videoId}`);
                    const data = await response.json();
                    setVideo(data);

                    // If the video has a playlist_id, fetch the full playlist
                    if (data.playlist_id) {
                        fetchPlaylist(data.playlist_id);
                    }
                } catch (error) { 
                    console.error('Failed to fetch video details:', error); 
                } finally {
                    setIsLoading(false);
                }
            };

            const fetchPlaylist = async (playlistId) => {
                try {
                    const response = await fetch(`/api/playlists/${playlistId}`);
                    const data = await response.json();
                    setPlaylist(data);
                } catch (error) { 
                    console.error('Failed to fetch playlist:', error); 
                }
            };

            fetchVideoDetails();
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [videoId]);

    const onReady = async (event) => {
        playerRef.current = event.target;
        setDuration(event.target.getDuration());
        try {
        const response = await fetch(`/api/progress/${videoId}`);
        const data = await response.json();
        const savedTime = data.progress_seconds;
        if (savedTime > 0) {
            setTimeout(() => {
            if (playerRef.current) playerRef.current.seekTo(savedTime, true);
            }, 1000);
        }
        } catch (error) {
        console.error('Failed to fetch progress:', error);
        }
    };
  
    // const onStateChange = (event) => {
    //     if (event.data === YouTube.PlayerState.PLAYING) {
    //     intervalRef.current = setInterval(() => {
    //         if (playerRef.current) {
    //         const time = playerRef.current.getCurrentTime();
    //         setCurrentTime(time);
    //         saveProgress(Math.floor(time));
    //         }
    //     }, 5000);
    //     } else {
    //     if (intervalRef.current) clearInterval(intervalRef.current);
    //     }
    // };

    // Replace your old onStateChange with this one

    const onStateChange = (event) => {
        // When the video starts playing
        if (event.data === YouTube.PlayerState.PLAYING) {
            // Fix for Bug 1: Reliably get the duration
            setDuration(playerRef.current.getDuration());
            // Start the 5-second save interval
            intervalRef.current = setInterval(() => {
                if (playerRef.current) {
                    const time = playerRef.current.getCurrentTime();
                    setCurrentTime(time);
                    saveProgress(Math.floor(time));
                }
            }, 5000);
        } 
        // NEW - Fix for Bug 2: When the video ends
        else if (event.data === YouTube.PlayerState.ENDED) {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            const totalDuration = playerRef.current.getDuration();
            // Save the final, complete duration
            saveProgress(Math.floor(totalDuration));
            // Update the UI to show 100%
            setCurrentTime(totalDuration);
        }
        // If the video is paused, buffering, etc.
        else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        }
    };

    const saveProgress = async (progressSeconds) => {
        try {
        await fetch(`/api/progress`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId, progressSeconds }),
        });
        console.log(`Progress saved at ${progressSeconds} seconds.`);
        } catch (error) {
        console.error('Failed to save progress:', error);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getProgressPercentage = () => {
        return duration > 0 ? (currentTime / duration) * 100 : 0;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <Loader />
            </div>
        );
    }

    if (!video) {
        return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
            <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <p className="text-slate-300 text-lg mb-2">Video not found</p>
            <Link href="/" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                Return to library
            </Link>
            </div>
        </div>
        );
    }

    const playerOptions = {
        height: '100%',
        width: '100%',
        playerVars: {
        autoplay: 1,
        modestbranding: 1,
        rel: 0,
        },
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Animated background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/3 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/3 rounded-full blur-3xl animate-pulse delay-1000"></div>
            </div>

            {/* Header */}
            <header className="relative bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
                <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center space-x-3 text-cyan-400 hover:text-cyan-300 transition-colors group">
                            <svg className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                    </svg>
                                </div>
                                <span className="font-semibold">Back to Library</span>
                            </div>
                        </Link>
                        
                        {/* Progress indicator in header */}
                        <div className="hidden md:flex items-center space-x-4 text-sm text-slate-400">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span>Now playing</span>
                            </div>
                            {duration > 0 && (
                                <div className="flex items-center space-x-2">
                                    <span>{formatTime(currentTime)}</span>
                                    <div className="w-24 h-1 bg-slate-700 rounded-full overflow-hidden">
                                        <div 
                                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
                                        style={{ width: `${getProgressPercentage()}%` }}
                                        ></div>
                                    </div>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </nav>
            </header>
            <main className="relative container mx-auto p-4 sm:p-6 lg:p-8">
                <div className="flex flex-col lg:flex-row gap-8">

                    {/* Column 1: Main Content (Player, Info, etc.) */}
                    <div className="lg:flex-grow">
                    <div className="max-w-6xl mx-auto">
                        {/* Video Player */}
                        <div className="mb-8">
                        <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl shadow-cyan-500/10 border border-slate-700/30">
                            <div style={{ paddingTop: '56.25%', position: 'relative' }}>
                            <div className="absolute inset-0">
                                <YouTube 
                                videoId={video.youtube_id} 
                                opts={playerOptions} 
                                onReady={onReady}
                                onStateChange={onStateChange}
                                className="w-full h-full"
                                />
                            </div>
                            </div>
                        </div>
                        </div>

                        {/* Video Information */}
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-slate-700/50 shadow-xl">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                            <div className="flex-grow">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
                                {video.title}
                            </h1>

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 text-slate-300" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                    </svg>
                                    </div>
                                    <div>
                                    <p className="text-slate-200 font-semibold text-lg">{video.channel_title}</p>
                                    <p className="text-slate-500 text-sm">YouTube Channel</p>
                                    </div>
                                </div>
                                </div>

                                {/* Mobile progress indicator */}
                                <div className="md:hidden">
                                {duration > 0 && (
                                    <div className="bg-slate-700/50 rounded-lg p-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm text-slate-400">Progress</span>
                                        <span className="text-sm text-slate-300">{Math.round(getProgressPercentage())}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-600 rounded-full overflow-hidden">
                                        <div 
                                        className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300"
                                        style={{ width: `${getProgressPercentage()}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                                        <span>{formatTime(currentTime)}</span>
                                        <span>{formatTime(duration)}</span>
                                    </div>
                                    </div>
                                )}
                                </div>
                            </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 lg:flex-col lg:w-48">
                            <button 
                                onClick={() => {
                                if (playerRef.current) {
                                    playerRef.current.seekTo(0, true);
                                }
                                }}
                                className="bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 px-4 py-3 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 border border-slate-600/50 hover:border-slate-500/50"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                                </svg>
                                <span>Restart</span>
                            </button>
                            
                            <button 
                                onClick={() => {
                                if (navigator.share && video) {
                                    navigator.share({
                                    title: video.title,
                                    url: window.location.href
                                    });
                                }
                                }}
                                className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 px-4 py-3 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 border border-cyan-500/30 hover:border-cyan-400/50"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                </svg>
                                <span>Share</span>
                            </button>
                            </div>
                        </div>
                        </div>

                        {/* Additional Information Card */}
                        <div className="mt-6 bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/30">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center">
                            <svg className="w-5 h-5 text-cyan-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Video Details
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-slate-400">Duration</p>
                                <p className="text-slate-200 font-medium">{duration > 0 ? formatTime(duration) : 'Loading...'}</p>
                            </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-slate-400">Progress</p>
                                <p className="text-slate-200 font-medium">{Math.round(getProgressPercentage())}% complete</p>
                            </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center">
                                <svg className="w-4 h-4 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                </svg>
                            </div>
                            <div>
                                <p className="text-slate-400">Source</p>
                                <p className="text-slate-200 font-medium">YouTube</p>
                            </div>
                            </div>
                        </div>
                        </div>
                    </div>
                    </div>

                    {/* Column 2: Playlist Sidebar */}
                    {playlist && (
                    <aside className="lg:w-96 lg:flex-shrink-0">
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50">
                        <h2 className="text-xl font-bold mb-2 text-slate-100 line-clamp-2">{playlist.playlist.title}</h2>
                        <p className="text-sm text-slate-400 mb-4">
                            {playlist.videos.findIndex(v => v.id == videoId) + 1} / {playlist.videos.length} Videos
                        </p>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                            {playlist.videos.map((playlistVideo, index) => (
                            <Link href={`/watch/${playlistVideo.id}`} key={playlistVideo.id} className="block group">
                                <div className={`flex items-start gap-4 p-3 rounded-xl transition-colors duration-200 ${playlistVideo.id == videoId ? 'bg-cyan-500/20' : 'hover:bg-slate-700/50'}`}>
                                <span className="text-sm text-slate-400 pt-1 font-mono">{index + 1}</span>
                                <div className="relative w-28 h-16 flex-shrink-0 rounded-md overflow-hidden">
                                    <Image src={playlistVideo.thumbnail_url} alt={playlistVideo.title} fill sizes="112px" className="object-cover"/>
                                    {playlistVideo.id == videoId && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <div className="w-8 h-8 bg-cyan-500/80 rounded-full flex items-center justify-center">
                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path>
                                        </svg>
                                        </div>
                                    </div>
                                    )}
                                </div>
                                <div className="flex-grow">
                                    <h3 className={`text-sm font-semibold line-clamp-2 leading-tight ${playlistVideo.id == videoId ? 'text-cyan-300' : 'text-slate-200 group-hover:text-white'}`}>
                                    {playlistVideo.title}
                                    </h3>
                                    {/* <p className="text-xs text-slate-400 mt-1">{formatDurationFromISO(playlistVideo.duration_iso)}</p> */}
                                </div>
                                </div>
                            </Link>
                            ))}
                        </div>
                        </div>
                    </aside>
                    )}

                </div>
            </main>

        </div>
    );
}