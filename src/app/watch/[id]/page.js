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
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVolumeControl, setShowVolumeControl] = useState(false);
  
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const progressUpdateRef = useRef(null);

    useEffect(() => { 
        setVideo(null);
        setPlaylist(null);
        setIsLoading(true);
        setIsPlaying(false);
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
            if (progressUpdateRef.current) clearInterval(progressUpdateRef.current);
        };
    }, [videoId]);

    const onReady = async (event) => {
        playerRef.current = event.target;
        const videoDuration = event.target.getDuration();
        setDuration(videoDuration);
        
        // Set initial volume
        event.target.setVolume(volume);
        
        try {
            const response = await fetch(`/api/progress/${videoId}`);
            const data = await response.json();
            const savedTime = data.progress_seconds;
            if (savedTime > 0 && savedTime < videoDuration - 10) { // Don't resume if near the end
                setTimeout(() => {
                    if (playerRef.current) {
                        playerRef.current.seekTo(savedTime, true);
                        setCurrentTime(savedTime);
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('Failed to fetch progress:', error);
        }
    };

    const onStateChange = (event) => {
        const state = event.data;
        
        if (state === YouTube.PlayerState.PLAYING) {
            setIsPlaying(true);
            // More accurate duration setting
            const videoDuration = playerRef.current.getDuration();
            if (videoDuration && duration !== videoDuration) {
                setDuration(videoDuration);
            }
            
            // More frequent progress updates for smoother UI
            progressUpdateRef.current = setInterval(() => {
                if (playerRef.current) {
                    const time = playerRef.current.getCurrentTime();
                    setCurrentTime(time);
                }
            }, 100); // Update every 100ms for smooth progress bar
            
            // Save progress every 5 seconds
            intervalRef.current = setInterval(() => {
                if (playerRef.current) {
                    const time = playerRef.current.getCurrentTime();
                    saveProgress(Math.floor(time));
                }
            }, 5000);
        } 
        else if (state === YouTube.PlayerState.PAUSED) {
            setIsPlaying(false);
            if (progressUpdateRef.current) clearInterval(progressUpdateRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
            
            // Save progress immediately when paused
            if (playerRef.current) {
                const time = playerRef.current.getCurrentTime();
                saveProgress(Math.floor(time));
            }
        }
        else if (state === YouTube.PlayerState.ENDED) {
            setIsPlaying(false);
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (progressUpdateRef.current) clearInterval(progressUpdateRef.current);
            
            const totalDuration = playerRef.current.getDuration();
            saveProgress(Math.floor(totalDuration));
            setCurrentTime(totalDuration);
        }
        else {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (progressUpdateRef.current) clearInterval(progressUpdateRef.current);
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
        return duration > 0 ? Math.min((currentTime / duration) * 100, 100) : 0;
    };

    const handleProgressBarClick = (e) => {
        if (!playerRef.current || !duration) return;
        
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = clickX / rect.width;
        const newTime = percentage * duration;
        
        playerRef.current.seekTo(newTime, true);
        setCurrentTime(newTime);
        saveProgress(Math.floor(newTime));
    };

    const togglePlayPause = () => {
        if (!playerRef.current) return;
        
        if (isPlaying) {
            playerRef.current.pauseVideo();
        } else {
            playerRef.current.playVideo();
        }
    };

    const skipTime = (seconds) => {
        if (!playerRef.current) return;
        
        const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
        playerRef.current.seekTo(newTime, true);
        setCurrentTime(newTime);
    };

    const handleVolumeChange = (newVolume) => {
        setVolume(newVolume);
        if (playerRef.current) {
            playerRef.current.setVolume(newVolume);
        }
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
            controls: 0, // Hide YouTube controls for custom controls
        },
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Enhanced animated background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/3 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/3 rounded-full blur-3xl animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/2 rounded-full blur-2xl animate-ping delay-500"></div>
                {/* Floating particles */}
                <div className="absolute top-10 left-10 w-2 h-2 bg-cyan-400/30 rounded-full animate-bounce delay-200"></div>
                <div className="absolute top-20 right-20 w-1 h-1 bg-purple-400/40 rounded-full animate-bounce delay-700"></div>
                <div className="absolute bottom-32 left-32 w-1.5 h-1.5 bg-blue-400/20 rounded-full animate-bounce delay-1000"></div>
            </div>

            {/* Header with enhanced progress bar */}
            <header className="relative bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
                <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Link href="/" className="flex items-center space-x-0 group text-cyan-400 transition-colors hover:text-cyan-300">
                            <svg className="w-6 h-6 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            <Image
                                src="/Youtopia_Logo.png"
                                alt="Youtopia Logo"
                                width={160}
                                height={60}
                                priority
                            />
                        </Link>
                        
                        {/* Enhanced progress indicator in header */}
                        <div className="hidden md:flex items-center space-x-4 text-sm text-slate-400">
                            <div className="flex items-center space-x-2">
                                <div className={`w-2 h-2 rounded-full transition-colors ${isPlaying ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></div>
                                <span>{isPlaying ? 'Playing' : 'Paused'}</span>
                            </div>
                            {duration > 0 && (
                                <div className="flex items-center space-x-3">
                                    <span className="font-mono">{formatTime(currentTime)}</span>
                                    <div className="relative w-32 h-2 bg-slate-700 rounded-full overflow-hidden cursor-pointer group" onClick={handleProgressBarClick}>
                                        <div 
                                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-100 rounded-full"
                                            style={{ width: `${getProgressPercentage()}%` }}
                                        >
                                            <div className="absolute right-0 top-1/2 w-3 h-3 bg-white rounded-full transform -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"></div>
                                        </div>
                                    </div>
                                    <span className="font-mono">{formatTime(duration)}</span>
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
                        {/* Enhanced Video Player */}
                        <div className="mb-8">
                            <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl shadow-cyan-500/10 border border-slate-700/30 group">
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
                                
                                {/* Custom video controls overlay */}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    {/* Progress bar */}
                                    <div className="mb-3">
                                        <div className="relative w-full h-1.5 bg-white/20 rounded-full cursor-pointer hover:h-2 transition-all" onClick={handleProgressBarClick}>
                                            <div 
                                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-100"
                                                style={{ width: `${getProgressPercentage()}%` }}
                                            >
                                                <div className="absolute right-0 top-1/2 w-3 h-3 bg-white rounded-full transform -translate-y-1/2 translate-x-1/2 opacity-0 hover:opacity-100 transition-opacity shadow-lg"></div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Control buttons */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <button onClick={togglePlayPause} className="text-white hover:text-cyan-400 transition-colors">
                                                {isPlaying ? (
                                                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                                                    </svg>
                                                ) : (
                                                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M8 5v14l11-7z"/>
                                                    </svg>
                                                )}
                                            </button>
                                            
                                            <button onClick={() => skipTime(-10)} className="text-white/80 hover:text-cyan-400 transition-colors">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.333 4z"/>
                                                </svg>
                                            </button>
                                            
                                            <button onClick={() => skipTime(10)} className="text-white/80 hover:text-cyan-400 transition-colors">
                                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z"/>
                                                </svg>
                                            </button>
                                            
                                            {/* Volume control */}
                                            <div className="relative" onMouseEnter={() => setShowVolumeControl(true)} onMouseLeave={() => setShowVolumeControl(false)}>
                                                <button className="text-white/80 hover:text-cyan-400 transition-colors">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M9 9v6l4 2V7L9 9z"/>
                                                    </svg>
                                                </button>
                                                
                                                {showVolumeControl && (
                                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-black/80 rounded-lg p-2">
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max="100"
                                                            value={volume}
                                                            onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                                                            className="w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center space-x-2 text-sm text-white/80">
                                            <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Video Information */}
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-slate-700/50 shadow-xl">
                        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                            <div className="flex-grow">
                            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
                                {video.title}
                            </h1>

                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-full flex items-center justify-center ring-2 ring-cyan-400/20">
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

                                {/* Enhanced Mobile progress indicator */}
                                <div className="md:hidden">
                                {duration > 0 && (
                                    <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/30">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="text-sm text-slate-400 flex items-center">
                                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            Progress
                                        </span>
                                        <span className="text-sm text-cyan-300 font-bold">{Math.round(getProgressPercentage())}%</span>
                                    </div>
                                    <div className="relative w-full h-3 bg-slate-600 rounded-full overflow-hidden cursor-pointer" onClick={handleProgressBarClick}>
                                        <div 
                                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 transition-all duration-100 rounded-full"
                                        style={{ width: `${getProgressPercentage()}%` }}
                                        >
                                            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-400 mt-2">
                                        <span className="font-mono">{formatTime(currentTime)}</span>
                                        <span className="font-mono">{formatTime(duration)}</span>
                                    </div>
                                    </div>
                                )}
                                </div>
                            </div>
                            </div>

                            {/* Enhanced Action buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 lg:flex-col lg:w-48">
                            <button 
                                onClick={() => {
                                if (playerRef.current) {
                                    playerRef.current.seekTo(0, true);
                                    setCurrentTime(0);
                                }
                                }}
                                className="bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 px-4 py-3 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 border border-slate-600/50 hover:border-slate-500/50 hover:shadow-lg hover:shadow-cyan-500/10 group"
                            >
                                <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 px-4 py-3 rounded-xl transition-all duration-300 flex items-center justify-center space-x-2 border border-cyan-500/30 hover:border-cyan-400/50 hover:shadow-lg hover:shadow-cyan-500/20 group"
                            >
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                                </svg>
                                <span>Share</span>
                            </button>
                            </div>
                        </div>
                        </div>

                        {/* Enhanced Video Details Card
                        <div className="mt-6 bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/30">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center">
                            <svg className="w-5 h-5 text-cyan-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Video Details
                        </h3> */}
                        {/* AI Assistant Card */}
                        <div className="mt-6 bg-slate-800/30 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/30">
                        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center">
                            <svg className="w-5 h-5 text-cyan-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            AI Assistant
                        </h3>
                        {/* AI Features Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                            <button className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-purple-300 p-4 rounded-xl transition-all duration-300 flex items-center space-x-3 border border-purple-500/30 hover:border-purple-400/50 group">
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="font-medium">AI Summarizer</span>
                            </button>
                            
                            <button className="bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-300 p-4 rounded-xl transition-all duration-300 flex items-center space-x-3 border border-emerald-500/30 hover:border-emerald-400/50 group">
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span className="font-medium">AI Note Taker</span>
                            </button>
                            
                            <button className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 hover:from-blue-500/30 hover:to-indigo-500/30 text-blue-300 p-4 rounded-xl transition-all duration-300 flex items-center space-x-3 border border-blue-500/30 hover:border-blue-400/50 group">
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span className="font-medium">Q&A Generator</span>
                            </button>
                            
                            <button className="bg-gradient-to-r from-orange-500/20 to-red-500/20 hover:from-orange-500/30 hover:to-red-500/30 text-orange-300 p-4 rounded-xl transition-all duration-300 flex items-center space-x-3 border border-orange-500/30 hover:border-orange-400/50 group">
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1l-1 14a2 2 0 01-2 2H6a2 2 0 01-2-2L3 6H2a1 1 0 110-2h4zM6 6l1 12h10l1-12H6z" />
                                </svg>
                                <span className="font-medium">Key Points</span>
                            </button>
                            
                            <button className="bg-gradient-to-r from-violet-500/20 to-purple-500/20 hover:from-violet-500/30 hover:to-purple-500/30 text-violet-300 p-4 rounded-xl transition-all duration-300 flex items-center space-x-3 border border-violet-500/30 hover:border-violet-400/50 group">
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                <span className="font-medium">Study Guide</span>
                            </button>
                            
                            <button className="bg-gradient-to-r from-rose-500/20 to-pink-500/20 hover:from-rose-500/30 hover:to-pink-500/30 text-rose-300 p-4 rounded-xl transition-all duration-300 flex items-center space-x-3 border border-rose-500/30 hover:border-rose-400/50 group">
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                <span className="font-medium">Quick Quiz</span>
                            </button>
                        </div>
                        </div>
                        {/* Video Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                        </div>
                    </div>
                    </div>

                    {/* Enhanced Playlist Sidebar */}
                    {playlist && (
                    <aside className="lg:w-96 lg:flex-shrink-0">
                        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50 sticky top-24">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-100 line-clamp-2 flex items-center">
                                <svg className="w-5 h-5 text-cyan-400 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                                {playlist.playlist.title}
                            </h2>
                        </div>
                        
                        <div className="flex items-center justify-between mb-4 p-3 bg-slate-700/30 rounded-lg">
                            <p className="text-sm text-slate-400">
                                Video {playlist.videos.findIndex(v => v.id == videoId) + 1} of {playlist.videos.length}
                            </p>
                            <div className="text-xs text-cyan-300 bg-cyan-500/20 px-2 py-1 rounded-full">
                                Playlist
                            </div>
                        </div>
                        
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {playlist.videos.map((playlistVideo, index) => (
                            <Link href={`/watch/${playlistVideo.id}`} key={playlistVideo.id} className="block group">
                                <div className={`flex items-start gap-4 p-3 rounded-xl transition-all duration-300 ${
                                    playlistVideo.id == videoId 
                                        ? 'bg-cyan-500/20 border border-cyan-500/30 shadow-lg shadow-cyan-500/10' 
                                        : 'hover:bg-slate-700/50 border border-transparent hover:border-slate-600/50'
                                }`}>
                                <span className={`text-sm pt-1 font-mono min-w-[2rem] ${
                                    playlistVideo.id == videoId ? 'text-cyan-300 font-bold' : 'text-slate-400'
                                }`}>{index + 1}</span>
                                
                                <div className="relative w-28 h-16 flex-shrink-0 rounded-md overflow-hidden">
                                    <Image 
                                        src={playlistVideo.thumbnail_url} 
                                        alt={playlistVideo.title} 
                                        fill 
                                        sizes="112px" 
                                        className="object-cover transition-transform group-hover:scale-105"
                                    />
                                    {playlistVideo.id == videoId && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                        <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full flex items-center justify-center animate-pulse">
                                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd"></path>
                                        </svg>
                                        </div>
                                    </div>
                                    )}
                                </div>
                                
                                <div className="flex-grow">
                                    <h3 className={`text-sm font-semibold line-clamp-2 leading-tight transition-colors ${
                                        playlistVideo.id == videoId 
                                            ? 'text-cyan-300' 
                                            : 'text-slate-200 group-hover:text-white'
                                    }`}>
                                    {playlistVideo.title}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        Click to play
                                    </p>
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

            {/* Custom CSS for scrollbar */}
            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(51, 65, 85, 0.3);
                    border-radius: 2px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(6, 182, 212, 0.5);
                    border-radius: 2px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(6, 182, 212, 0.7);
                }
                
                .slider::-webkit-slider-thumb {
                    appearance: none;
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: #06b6d4;
                    cursor: pointer;
                    border: 2px solid #fff;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                }
                
                .slider::-moz-range-thumb {
                    width: 12px;
                    height: 12px;
                    border-radius: 50%;
                    background: #06b6d4;
                    cursor: pointer;
                    border: 2px solid #fff;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                }
            `}</style>

        </div>
    );
}