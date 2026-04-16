'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { searchCards } from '../../api';
import { useBoard } from '../../context/BoardContext';
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
          <div className="header-logo-icon header-logo-icon--blue">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="10" height="22" rx="2" ry="2" />
              <rect x="13" y="1" width="10" height="14" rx="2" ry="2" />
            </svg>
          </div>
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
        {isHome && (
          <>
            <button type="button" className="header-icon-btn header-icon-btn--dark" aria-label="Notifications">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>
            <button type="button" className="header-icon-btn header-icon-btn--dark" aria-label="Information">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </button>
          </>
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
