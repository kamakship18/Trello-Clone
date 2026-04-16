'use client';

import { useState, useCallback, useEffect } from 'react';
import { BoardProvider } from './context/BoardContext';
import Header from './components/Header/Header';
import Board from './components/Board/Board';
import BoardsHome from './components/BoardsHome/BoardsHome';

export default function Home() {
  const [activeBoardId, setActiveBoardId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [boardMenuOpen, setBoardMenuOpen] = useState(false);
  const [homeSearch, setHomeSearch] = useState('');

  const handleSelectBoard = useCallback((boardId) => {
    setActiveBoardId(boardId);
    setHomeSearch('');
  }, []);

  const handleGoHome = useCallback(() => {
    setActiveBoardId(null);
  }, []);

  useEffect(() => {
    setBoardMenuOpen(false);
  }, [activeBoardId]);

  return (
    <BoardProvider>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header
          onGoHome={handleGoHome}
          onCreateBoard={() => setShowCreateModal(true)}
          activeBoardId={activeBoardId}
          boardMenuOpen={boardMenuOpen}
          onOpenBoardMenu={() => setBoardMenuOpen(true)}
          homeSearchQuery={homeSearch}
          onHomeSearchChange={setHomeSearch}
        />

        {activeBoardId ? (
          <Board
            boardId={activeBoardId}
            showCreateModal={showCreateModal}
            onCloseCreateModal={() => setShowCreateModal(false)}
            onSelectBoard={handleSelectBoard}
            boardMenuOpen={boardMenuOpen}
            onCloseBoardMenu={() => setBoardMenuOpen(false)}
            onOpenBoardMenu={() => setBoardMenuOpen(true)}
          />
        ) : (
          <BoardsHome
            onSelectBoard={handleSelectBoard}
            showCreateModal={showCreateModal}
            onCloseCreateModal={() => setShowCreateModal(false)}
            filterQuery={homeSearch}
          />
        )}
      </div>
    </BoardProvider>
  );
}
