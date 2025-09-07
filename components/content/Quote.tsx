import React from 'react';

interface QuoteProps {
  children: React.ReactNode;
  className?: string;
}

export const Quote: React.FC<QuoteProps> = ({ children, className }) => {
  const textAlignment = className?.includes('text-left') ? 'text-left' : 'text-center';
  return (
    <div className="my-4 text-center">
      <span className={`inline-block px-1 sm:px-2 py-1 border-2 border-gray-400 rounded-lg bg-gray-50 italic ${textAlignment}`}>
        {children}
      </span>
    </div>
  );
};

export default Quote;