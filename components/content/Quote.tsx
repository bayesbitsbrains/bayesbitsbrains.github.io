import React from 'react';

interface QuoteProps {
  children: React.ReactNode;
}

export const Quote: React.FC<QuoteProps> = ({ children }) => {
  return (
    <div className="my-4 text-center">
      <span className="inline-block px-2 sm:px-4 py-2 border-2 border-gray-400 rounded-lg bg-gray-50 dark:bg-gray-800 italic">
        {children}
      </span>
    </div>
  );
};

export default Quote;