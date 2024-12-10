"use client";

import React from 'react';
import Image from 'next/image';

export default function NavBar() {
  return (
    <nav className="bg-white shadow-md p-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Image
            src="/flowtribe-png-logo.png"
            alt="FlowTribe Logo"
            width={50}
            height={50}
          />
          <span className="ml-3 text-xl font-bold">FlowTribe</span>
        </div>
      </div>
    </nav>
  );
}
