'use client';

import { useState, useRef, useEffect } from 'react';
import './AddForm.css';

export default function AddForm({ placeholder, onSubmit, onCancel, buttonText, autoFocus, isCard }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
      setValue('');
      // Keep focus for adding more
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onCancel?.();
    }
  };

  return (
    <div className={`add-form ${isCard ? 'is-card' : ''}`}>
      <textarea
        ref={inputRef}
        className="add-form-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={isCard ? 2 : 1}
      />
      <div className="add-form-actions">
        <button
          className="add-form-submit"
          onClick={handleSubmit}
          disabled={!value.trim()}
          id="add-form-submit-btn"
        >
          {buttonText}
        </button>
        <button
          className="add-form-cancel"
          onClick={onCancel}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
