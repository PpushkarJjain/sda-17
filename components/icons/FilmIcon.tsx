import React from 'react';

export const FilmIcon: React.FC<{ className?: string }> = ({ className = "h-5 w-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <rect width="18" height="18" x="3" y="3" rx="2"/>
        <path d="M7 3v18"/>
        <path d="M17 3v18"/>
        <path d="M3 7h4"/>
        <path d="M3 12h4"/>
        <path d="M3 17h4"/>
        <path d="M17 7h4"/>
        <path d="M17 12h4"/>
        <path d="M17 17h4"/>
    </svg>
);