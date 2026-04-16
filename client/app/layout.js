import './globals.css';

export const metadata = {
  title: 'Trello Clone — Project Management',
  description: 'A Kanban-style project management tool built with Next.js and Express. Create boards, lists, and cards with drag-and-drop support.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
