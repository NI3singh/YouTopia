'use client';

import { useEffect } from 'react';

export default function Modal({ isOpen, onClose, title, children, confirmText = "OK", onConfirm, showCancel = false }) {
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-slate-800 rounded-2xl shadow-2xl border border-slate-700/50 w-full max-w-md m-4 p-6 text-white animate-fade-in"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <h2 className="text-2xl font-bold mb-4 text-cyan-400">{title}</h2>
        <div className="text-slate-300 mb-6">
          {children}
        </div>
        <div className="flex justify-end space-x-4">
          {showCancel && (
            <button 
              onClick={onClose} 
              className="bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold py-2 px-5 rounded-lg transition-colors"
            >
              Cancel
            </button>
          )}
          <button 
            onClick={handleConfirm}
            className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-5 rounded-lg transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}