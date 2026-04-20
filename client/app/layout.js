import Script from 'next/script';
import './globals.css';
import { ThemeProvider } from './context/ThemeContext';

export const metadata = {
  title: 'Trello Clone — Project Management',
  description:
    'A Kanban-style project management tool built with Next.js and Express. Create boards, lists, and cards with drag-and-drop support.',
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png' }],
    apple: [{ url: '/icon.png', type: 'image/png' }],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem('trello-theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`}
        </Script>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
