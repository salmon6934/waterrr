'use client';

import './globals.css';
import { Space_Mono } from 'next/font/google';
import { useEffect } from 'react';
import PageTransition from '../components/PageTransition';
import NavBar from '../components/NavBar';
import { loadTheme } from '../lib/storage';

const spaceMono = Space_Mono({
  weight: ['400', '700'],
  subsets: ['latin'],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const theme = loadTheme();
    if (theme.mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return (
    <html lang="en" className={spaceMono.className}>
      <head>
        <title>Water Reminder</title>
        <meta name="description" content="Track your daily water intake and stay hydrated" />
      </head>
      <body className="max-w-[390px] mx-auto bg-background text-foreground">
        <PageTransition>{children}</PageTransition>
        <NavBar />
      </body>
    </html>
  );
}
