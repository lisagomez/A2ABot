'use client'

import type { PreviewTurn } from '../types'

export function ConversationPreview({ turns }: { turns: PreviewTurn[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-[#e7ebf0] p-3">
      <div className="mb-2 flex items-center gap-2 px-1">
        <span className="text-sm">✈️</span>
        <span className="text-xs font-medium text-gray-500">Vista previa · Telegram</span>
      </div>
      <div className="space-y-1.5">
        {turns.map((t, i) => (
          <div key={i} className={`flex ${t.from === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] whitespace-pre-line rounded-2xl px-3 py-2 text-xs leading-relaxed shadow-sm ${
                t.from === 'user'
                  ? 'rounded-br-sm bg-[#cde6c5] text-gray-800'
                  : 'rounded-bl-sm bg-white text-gray-800'
              }`}
            >
              {t.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
