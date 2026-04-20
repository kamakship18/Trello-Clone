'use client';

import Image from 'next/image';
import { useState, useRef, useEffect, useCallback } from 'react';
import { searchCards } from '../../api';
import { useBoard } from '../../context/BoardContext';
import { useTheme } from '../../context/ThemeContext';
import trelloLogo from '../../logo.png';
import './Header.css';

export default function Header({
  onGoHome,
  onCreateBoard,
  activeBoardId,
  boardMenuOpen,
  onOpenBoardMenu,
  homeSearchQuery = '',
  onHomeSearchChange,
}) {
  const { board } = useBoard();
  const { theme, toggleTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  const handleSearch = useCallback(async (query) => {
    if (!query.trim() || !board) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    try {
      const res = await searchCards(board.id, query);
      setSearchResults(res.data);
      setShowResults(true);
    } catch (err) {
      console.error('Search failed:', err);
    }
  }, [board]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => handleSearch(value), 300);
  };

  const handleResultClick = (card) => {
    setShowResults(false);
    setSearchQuery('');
    // Dispatch a custom event that Board component listens to
    window.dispatchEvent(new CustomEvent('openCardDetail', { detail: card }));
  };

  // Close search results on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isHome = !activeBoardId;

  return (
    <header
      className={`header ${isHome ? 'header--home' : 'header--board'}`}
      id="main-header"
    >
      <div className="header-left">
        {isHome && (
          <button type="button" className="header-app-launcher" aria-label="App launcher" title="App launcher">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <circle cx="5" cy="5" r="2" />
              <circle cx="12" cy="5" r="2" />
              <circle cx="19" cy="5" r="2" />
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
              <circle cx="5" cy="19" r="2" />
              <circle cx="12" cy="19" r="2" />
              <circle cx="19" cy="19" r="2" />
            </svg>
          </button>
        )}
        <div className="header-logo" onClick={onGoHome} style={{ cursor: 'pointer' }}>
          <Image
            src={trelloLogo}
            alt=""
            width={24}
            height={24}
            className="header-logo-image"
            priority
          />
          Trello
        </div>

        {/* Boards nav button — only show when viewing a board */}
        {activeBoardId && (
          <button type="button" className="header-btn" onClick={onGoHome} id="header-boards-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            <span>Boards</span>
          </button>
        )}
      </div>

      <div className="header-center">
        {/* Home: search workspaces / boards */}
        {isHome && (
          <div className="header-search header-search--home">
            <input
              id="header-home-search-input"
              type="search"
              className="header-search-input"
              placeholder="Search"
              value={homeSearchQuery}
              onChange={(e) => onHomeSearchChange?.(e.target.value)}
              autoComplete="off"
            />
            <svg className="header-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        )}
        {/* Board view: search cards */}
        {!isHome && activeBoardId && board && (
          <div className="header-search header-search--home" ref={searchRef}>
            <input
              id="header-search-input"
              type="text"
              className="header-search-input"
              placeholder="Search"
              value={searchQuery}
              onChange={handleInputChange}
              onFocus={() => searchQuery && setShowResults(true)}
            />
            <svg className="header-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>

            {showResults && (
              <div className="search-results">
                {searchResults.length > 0 ? (
                  searchResults.map((card) => (
                    <div
                      key={card.id}
                      className="search-result-item"
                      onClick={() => handleResultClick(card)}
                    >
                      <span>{card.title}</span>
                      <span className="search-result-list-name">in {card.list_title}</span>
                    </div>
                  ))
                ) : (
                  <div className="search-no-results">No cards found</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="header-right">
        <button
          type="button"
          className={`header-theme-neo ${theme === 'dark' ? 'header-theme-neo--dark' : ''}`}
          onClick={toggleTheme}
          role="switch"
          aria-checked={theme === 'dark'}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          <span className="header-theme-neo-track">
            <span className="header-theme-neo-ghost header-theme-neo-ghost--sun" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </span>
            <span className="header-theme-neo-ghost header-theme-neo-ghost--moon" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </span>
            <span className="header-theme-neo-thumb" aria-hidden>
              {theme === 'light' ? (
                <svg
                  className="header-theme-neo-thumb-icon header-theme-neo-thumb-icon--sun"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <circle cx="12" cy="12" r="4" fill="#f59e0b" stroke="#ea8600" strokeWidth="1.25" />
                  <path
                    d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8l1.8-1.8M18 6l1.8-1.8"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg
                  className="header-theme-neo-thumb-icon header-theme-neo-thumb-icon--moon"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                    fill="#1e3a5f"
                    stroke="#172554"
                    strokeWidth="1"
                  />
                  <circle cx="17.5" cy="6.5" r="0.9" fill="#c7d2fe" />
                  <circle cx="19.2" cy="9.2" r="0.65" fill="#a5b4fc" />
                </svg>
              )}
            </span>
          </span>
        </button>
        <button
          type="button"
          className="header-create-btn header-create-btn--solid"
          id="header-create-btn"
          onClick={onCreateBoard}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Create</span>
        </button>
        {activeBoardId && (
          <button type="button" className="header-icon-btn header-icon-btn--dark" aria-label="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
        )}
        <button
          type="button"
          className="header-avatar"
          id="header-avatar"
          onClick={() => activeBoardId && onOpenBoardMenu?.()}
          aria-label={activeBoardId ? 'Open board menu' : 'Account'}
          aria-haspopup={activeBoardId ? 'dialog' : undefined}
          aria-expanded={activeBoardId ? !!boardMenuOpen : false}
        >
          KP
        </button>
      </div>
    </header>
  );
}
