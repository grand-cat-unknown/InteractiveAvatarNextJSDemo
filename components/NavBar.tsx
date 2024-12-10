"use client";

import React from 'react';
import Image from 'next/image';

export default function NavBar() {
  return (
    <nav className="bg-gray-800 shadow-md p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Image
            src="/flowtribe-png-logo.png"
            alt="FlowTribe Logo"
            width={50}
            height={50}
          />
        </div>
      </div>
    </nav>
  );
}
