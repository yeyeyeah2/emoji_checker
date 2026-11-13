import type { ReactNode } from 'react';
import { EMOJI_OPTIONS } from '../lib/emoji';
import { Brand } from './Brand';

interface AuthShellProps {
  sideTitle: string;
  sideText: string;
  children: ReactNode;
}

export function AuthShell({ sideTitle, sideText, children }: AuthShellProps) {
  return (
    <div className="auth-shell">
      <aside className="auth-aside">
        <div className="auth-aside-top">
          <Brand />
        </div>

        <div className="auth-aside-copy">
          <p className="eyebrow">课堂情绪，被看见</p>
          <h1>{sideTitle}</h1>
          <p>{sideText}</p>
        </div>

        <div className="auth-emoji-cloud" aria-hidden="true">
          {EMOJI_OPTIONS.map((option, index) => (
            <span
              key={option.type}
              className={`floating-emoji floating-emoji-${index + 1}`}
              style={{ background: option.soft }}
            >
              {option.emoji}
            </span>
          ))}
        </div>

        <p className="auth-aside-foot">软件工程实践 · 综合设计性实验</p>
      </aside>

      <main className="auth-main">
        <div className="auth-card">{children}</div>
        <p className="auth-copyright">© {new Date().getFullYear()} Emoji Checker Team</p>
      </main>
    </div>
  );
}
