
import React from 'react';
import { LogoIcon } from './icons/LogoIcon';

const Header: React.FC = () => {
  return (
    <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center gap-3">
            <LogoIcon />
            <h1 className="text-xl md:text-2xl font-bold text-rose-900">
                Saree Draping <span className="text-rose-600">AI</span>
            </h1>
        </div>
      </div>
    </header>
  );
};

export default Header;
   