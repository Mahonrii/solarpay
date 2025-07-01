'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Sun, User, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-background p-6">
      <header className="absolute top-0 left-0 right-0 p-6 flex justify-center">
        <div className="flex items-center space-x-2 text-primary">
          <Sun className="h-8 w-8" />
          <span className="text-2xl font-bold">SolarPay Tracker</span>
        </div>
      </header>

      <main className="text-center max-w-3xl mt-16 sm:mt-0">
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-primary mb-6 tracking-tight">
          Welcome to Solar Master Pay Tracker
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground mb-10 leading-relaxed">
        Stay on top of your solar payments with ease. Instantly view your detailed account statement anytime.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-md mx-auto">
          <Button
            asChild
            size="lg"
            className="w-full text-lg py-7 rounded-xl shadow-lg hover:shadow-primary/30 transition-all duration-300 bg-primary hover:bg-primary/90 text-primary-foreground group"
          >
            <Link href="/statement">
              <User className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
              View My Statement
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full text-lg py-7 rounded-xl shadow-lg hover:shadow-accent/30 transition-all duration-300 border-primary text-primary hover:bg-primary/5 hover:text-primary group"
          >
            <Link href="/admin">
              <ShieldCheck className="mr-2 h-5 w-5 transition-transform group-hover:scale-110" />
              Admin Access
            </Link>
          </Button>
        </div>
      </main>

      <footer className="absolute bottom-6 text-muted-foreground text-sm">
        &copy; {new Date().getFullYear()} Solar Master. All rights reserved.
      </footer>
    </div>
  );
}
