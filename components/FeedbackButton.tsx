'use client';

import { useState } from 'react';

export default function FeedbackButton() {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  const toggleTooltip = () => {
    setIsTooltipVisible(!isTooltipVisible);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative">
        {/* Tooltip */}
        {isTooltipVisible && (
          <div 
            className="absolute bottom-full right-0 mb-2 w-80 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-gray-800">
              This is an early version of the site. I&apos;ll be grateful for your{' '}
              <a 
                href="https://docs.google.com/forms/d/e/1FAIpQLSeKuxVXe6GZc2QosoW3jgCSBx5DQZqzR4ktOd2ri5azrH6bwA/viewform?usp=header"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                feedback
              </a>{' '}
              and{' '}
              <a 
                href="https://forms.gle/F3oX3ws9gxsrMkzn6"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                bug reports
              </a>
              .
            </div>
            {/* Triangle pointer */}
            <div className="absolute top-full right-4 w-0 h-0 border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white"></div>
          </div>
        )}
        
        {/* Feedback Button */}
        <button
          onClick={toggleTooltip}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
          aria-label="Feedback"
        >
          <span className="text-xl">💭</span>
        </button>
      </div>
      
      {/* Overlay to close tooltip when clicking outside */}
      {isTooltipVisible && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsTooltipVisible(false)}
        />
      )}
    </div>
  );
}