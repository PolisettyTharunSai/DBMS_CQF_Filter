import React from 'react';

interface LoadingOverlayProps {
  message: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-white">
      <div className="bg-white text-slate-900 p-8 rounded-xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-lg font-medium animate-pulse">{message}</p>
      </div>
    </div>
  );
};