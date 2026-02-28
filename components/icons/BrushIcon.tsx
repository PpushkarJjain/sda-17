import React from 'react';

export const BrushIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m9.06 11.9 8.07-8.069a2.85 2.85 0 1 1 4.038 4.04l-8.069 8.069a17.9 17.9 0 0 1-5.309 3.965L2.5 21.5l1.589-5.299a17.9 17.9 0 0 1 3.965-5.309z"/>
        <path d="M12 15c-3 3-6 3-9 2 0-3 1-6 4-9"/>
    </svg>
);