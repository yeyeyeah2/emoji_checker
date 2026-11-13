import type { CSSProperties } from 'react';
import type { EmojiType } from '../api/types';
import { EMOJI_OPTIONS } from '../lib/emoji';

interface EmojiPickerProps {
  value: EmojiType | null;
  onChange: (type: EmojiType) => void;
  disabled?: boolean;
}

export function EmojiPicker({ value, onChange, disabled = false }: EmojiPickerProps) {
  return (
    <div className="emoji-grid" role="radiogroup" aria-label="此刻的情绪">
      {EMOJI_OPTIONS.map((option) => {
        const selected = value === option.type;
        return (
          <button
            key={option.type}
            type="button"
            role="radio"
            aria-checked={selected}
            className={`emoji-option${selected ? ' is-selected' : ''}`}
            style={
              {
                '--emoji-color': option.color,
                '--emoji-soft': option.soft,
              } as CSSProperties
            }
            onClick={() => onChange(option.type)}
            disabled={disabled}
          >
            <span className="emoji-option-glyph" aria-hidden="true">
              {option.emoji}
            </span>
            <span className="emoji-option-label">{option.label}</span>
            <span className="emoji-option-desc">{option.description}</span>
            {selected && (
              <span className="emoji-check" aria-hidden="true">
                ✓
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
