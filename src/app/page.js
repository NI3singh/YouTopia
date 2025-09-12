'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Modal from '@/components/Modal';
import Loader from '@/components/Loader';
import { useLoading } from '@/context/LoadingContext';

// Helper function to parse ISO 8601 duration
function parseISODuration(isoDuration) {
  if (!isoDuration) return 0;
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = isoDuration.match(regex);
  const hours = matches[1] ? parseInt(matches[1], 10) : 0;
  const minutes = matches[2] ? parseInt(matches[2], 10) : 0;
  const seconds = matches[3] ? parseInt(matches[3], 10) : 0;
  return (hours * 3600) + (minutes * 60) + seconds;
}

// Helper function to format duration
function formatDuration(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export default function HomePage() {
  const [url, setUrl] = useState('');
  const [videos, setVideos] = useState([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isConfirmation: false });
  const { showLoader, hideLoader } = useLoading();
  const [searchTerm, setSearchTerm] = useState('');


  const showModal = (title, message, onConfirmCallback = null) => {
    setModal({
      isOpen: true,
      title,
      message,
      onConfirm: onConfirmCallback,
      isConfirmation: !!onConfirmCallback, // If there's a callback, it's a confirmation dialog
    });
  };

  const closeModal = () => {
    setModal({ isOpen: false, title: '', message: '', onConfirm: null, isConfirmation: false });
  };

  const fetchVideos = async (currentSearchTerm) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/videos?search=${encodeURIComponent(currentSearchTerm)}`);
      const data = await response.json();
      setVideos(data);
    } catch (error) {
      console.error('Failed to fetch videos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchVideos(searchTerm);
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!url) return;
    
    showLoader(); // Show the loader before the request starts
    try {
      const response = await fetch('/api/add-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url }),
      });
      const responseText = await response.text();
      
      if (response.ok) {
        try {
          const data = JSON.parse(responseText);
          showModal('Success', data.message);
          setUrl('');
          fetchVideos(searchTerm);
        } catch (e) {
          showModal('Error', 'Received an invalid or empty response from the server.');
        }
      } else {
        showModal('Error', `Server error: ${responseText}`);
      }
    } catch (error) {
      showModal('Error', 'Failed to connect to the backend.');
    } finally {
      hideLoader(); // ALWAYS hide the loader when the process is finished
    }
  };

  const handleItemSelect = (item) => {
    setSelectedItems((prevSelected) => {
      const isSelected = prevSelected.find(
        (selected) => selected.id === item.id && selected.type === item.type
      );
      if (isSelected) {
        return prevSelected.filter(
          (selected) => !(selected.id === item.id && selected.type === item.type)
        );
      } else {
        return [...prevSelected, { id: item.id, type: item.type }];
      }
    });
  };
  const handleLinkClick = (e) => {
    if (isSelectMode) {
      e.preventDefault();
    }
  };

  const handleDelete = async (event, itemToDelete) => {
    event.preventDefault();
    event.stopPropagation();
    const itemType = itemToDelete.type;

    showModal(
      `Remove ${itemType}`,
      `Are you sure you want to remove "${itemToDelete.title}"? This action cannot be undone.`,
      async () => { // This function runs when the user confirms
        showLoader(); // Show loader before the delete request
        try {
          const response = await fetch(`/api/${itemType}s/${itemToDelete.id}`, {
            method: "DELETE",
          });
          const data = await response.json();
          if (response.ok) {
            showModal("Success", data.message);
            fetchVideos(searchTerm);
          } else {
            showModal("Error", data.message);
          }
        } catch (error) {
          showModal("Error", `Failed to delete ${itemType}: ${error.message}`);
        } finally {
          hideLoader(); // ALWAYS hide the loader
        }
      }
    );
  };
  const handleBatchDelete = async () => {
    const confirmMessage = `Are you sure you want to remove ${selectedItems.length} item(s)? This action cannot be undone.`;
    
    showModal(
      'Confirm Deletion',
      confirmMessage,
      async () => { // This function runs when the user confirms
        showLoader(); // Show loader before the batch delete request
        try {
          const response = await fetch('/api/library/batch-delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: selectedItems }),
          });
          const data = await response.json();
          if (response.ok) {
            showModal('Success', data.message);
            fetchVideos(searchTerm);
            setIsSelectMode(false);
            setSelectedItems([]);
          } else {
            showModal('Error', data.message);
          }
        } catch (error) {
          showModal('Error', 'Failed to connect to the server for batch deletion.');
        } finally {
          hideLoader(); // ALWAYS hide the loader
        }
      }
    );
  };
  const [isLoading, setIsLoading] = useState(true);
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Header */}
      <header className="relative bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="flex items-center">
              <Image
                src="/Youtopia_Logo.png"
                alt="Youtopia Logo"
                width={200}
                height={80}
                priority
                className="transition-opacity hover:opacity-80" // Optional: adds a nice hover effect
              />
            </Link>
            <div className="hidden sm:flex items-center space-x-2 text-sm text-slate-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Your personal library</span>
            </div>
          </div>
        </nav>
      </header>

      <main className="relative container mx-auto p-4 sm:p-6 lg:p-8">
        {/* Add Video Section */}
        <div className="max-w-3xl mx-auto mb-16">
          <div className="text-center mb-8">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Build Your Video
              <span className="block bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Collection
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Add YouTube videos to your personal library and never lose track of your progress again. 
            </p>
          </div>
          
          <div className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-slate-700/50 hover:border-cyan-500/30 transition-all duration-300">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
              <div className="flex-grow relative group">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  // placeholder="Paste a YouTube video URL here..."
                  placeholder="Paste a YouTube video and Playlist URL here..."
                  className="w-full p-4 bg-slate-700/50 backdrop-blur-sm rounded-xl border-2 border-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all duration-300 text-white placeholder-slate-400"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/10 to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
              <button
                type="submit"
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 transform hover:scale-105 whitespace-nowrap"
              >
                <span className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Add Video</span>
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* Video Library */}
        <div>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl sm:text-4xl font-bold text-white flex items-center">
              <div className="w-1 h-10 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full mr-4"></div>
              Your Library
              {!isLoading && (
                <span className="ml-4 text-lg text-slate-400 font-normal">
                  ({videos.length} item{videos.length !== 1 ? 's' : ''})
                </span>
              )}
            </h2>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search library..."
                  className="w-full sm:w-64 p-2 pl-10 bg-slate-700/50 rounded-lg border-2 border-slate-600 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </div>
              </div>
              <button 
                type="button" // It's good practice to add type="button"
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-2 px-5 rounded-lg transition-colors whitespace-nowrap"
              >
                Search
              </button>
              </div>
              {/* New Select/Cancel Button */}
              <button 
                onClick={() => {
                  setIsSelectMode(!isSelectMode);
                  setSelectedItems([]);
                }}
                title={isSelectMode ? 'Cancel Selection' : 'Select Items'}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold p-2.5 rounded-lg transition-colors"
              >
                {isSelectMode ? (
                  <span className="px-2">Cancel</span>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                )}
              </button>
          </div>
          {isLoading ? (
            <Loader />
          ) : videos.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4zM9 6h6v11H9V6z"/>
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-slate-300 mb-2">Your library is empty</h3>
              <p className="text-slate-500 mb-6">Add your first YouTube video to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
              {videos.map((item, index) => {
                let percentage = 0;
                let totalSeconds = 0;

                // Only calculate progress and duration for items that are videos
                if (item.type === 'video') {
                  totalSeconds = parseISODuration(item.duration_iso);
                  const progressSeconds = item.progress_seconds || 0;
                  percentage = totalSeconds > 0 ? (progressSeconds / totalSeconds) * 100 : 0;
                }
                return (
                  <Link href={`/watch/${item.type === 'playlist' ? item.first_video_id : item.id}`} key={`${item.type}-${item.id}`} onClick={handleLinkClick} className="group">
                    <div 
                      onClick={() => isSelectMode && handleItemSelect(item)}
                      className={`bg-slate-800/60 backdrop-blur-sm rounded-2xl overflow-hidden shadow-xl 
                                  hover:shadow-2xl hover:shadow-cyan-500/10 h-full flex flex-col transition-all 
                                  duration-500 hover:scale-105 hover:-translate-y-2 border border-slate-700/50 
                                  hover:border-cyan-400/30
                                  ${isSelectMode ? 'cursor-pointer' : ''} 
                                  ${selectedItems.some(s => s.id === item.id && s.type === item.type) ? 'ring-2 ring-cyan-400' : ''}`}
                      style={{
                        animationDelay: `${index * 100}ms`
                      }}
                    >
                      <div className="relative w-full overflow-hidden" style={{ paddingTop: '56.25%' }}>
                        <Image
                          src={item.thumbnail_url}
                          alt={item.title}
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <button
                          onClick={(e) => handleDelete(e, item)}
                          aria-label={`Remove ${item.type}`}
                          className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center 
                                    bg-black/50 hover:bg-red-500/80 rounded-full transition-all duration-300 
                                    opacity-0 group-hover:opacity-100 hover:scale-110"
                          title={`Remove ${item.type}`}>
                          <svg
                            className="w-5 h-5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                        {/* Add this code block for the playlist badge */}
                        {item.type === 'playlist' && (
                          <div className="absolute top-3 left-3 bg-cyan-500/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full flex items-center space-x-1.5 z-10">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M7 3h10a1 1 0 011 1v12a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM2 5h2v12H2a1 1 0 01-1-1V6a1 1 0 011-1zm2-2h2v2H4V3zm0 14h2v2H4v-2z"></path></svg>
                            <span>Playlist</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        
                        {/* Duration badge */}
                        {totalSeconds > 0 && (
                          <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md font-medium">
                            {formatDuration(totalSeconds)}
                          </div>
                        )}
                        
                        {/* Play icon overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M8 5v14l11-7z"/>
                            </svg>
                          </div>
                        </div>
                      </div>
                      
                      <div className="p-5 flex flex-col flex-grow">
                        <h3 className="font-bold text-lg text-slate-100 group-hover:text-cyan-400 transition-colors line-clamp-2 flex-grow leading-tight mb-3">
                          {item.title}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-slate-400 mb-4">
                          <div className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                            </svg>
                          </div>
                          <span className="truncate">{item.channel_title}</span>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="relative">
                        <div className="w-full bg-slate-700/50 h-2">
                          <div 
                            className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 transition-all duration-300 rounded-full" 
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                        {percentage > 0 && (
                          <div className="absolute -top-8 left-0 right-0 text-xs text-slate-400 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            {Math.round(percentage)}% watched
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
        {/* ✅ Floating Action Bar */}
        {selectedItems.length > 0 && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-xl shadow-2xl p-4 flex items-center space-x-6">
              <p className="text-slate-300 font-medium">
                <span className="text-white font-bold">{selectedItems.length}</span>{' '}
                item{selectedItems.length > 1 ? 's' : ''} selected
              </p>
              <button 
                onClick={handleBatchDelete}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </main>
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        onConfirm={modal.onConfirm}
        showCancel={modal.isConfirmation}
        confirmText={modal.isConfirmation ? "Confirm" : "OK"}
      >
        <p>{modal.message}</p>
      </Modal>
    </div>
  );
}