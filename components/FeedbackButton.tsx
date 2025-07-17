'use client';

import { useState, useEffect, useRef } from 'react';

export default function FeedbackButton() {
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleTooltip = () => {
    setIsTooltipVisible(!isTooltipVisible);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        buttonRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsTooltipVisible(false);
      }
    };

    if (isTooltipVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTooltipVisible]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative">
        {/* Tooltip */}
        {isTooltipVisible && (
          <div 
            ref={tooltipRef}
            className="absolute bottom-full right-0 mb-2 w-80 bg-white border border-gray-300 rounded-lg shadow-lg p-4 text-sm"
          >
            <div className="text-gray-800">
              This is an early version of the site. I&apos;ll be grateful for your{' '}
              <a 
                href="https://docs.google.com/forms/d/e/1FAIpQLSeKuxVXe6GZc2QosoW3jgCSBx5DQZqzR4ktOd2ri5azrH6bwA/viewform?usp=header"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline font-medium"
              >
                feedback
              </a>{' '}
              and{' '}
              <a 
                href="https://forms.gle/F3oX3ws9gxsrMkzn6"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline font-medium"
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
          ref={buttonRef}
          onClick={toggleTooltip}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-110"
          aria-label="Feedback"
        >
          <span className="text-xl">📝</span>
        </button>
      </div>
    </div>
  );
}