import { useEffect, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChatMessage } from './ChatMessage'
import { TypingIndicator } from './TypingIndicator'

export function VirtualChatList({ messages, chatLoading }) {
  const parentRef  = useRef(null)
  const totalCount = messages.length + (chatLoading ? 1 : 0)

  const virtualizer = useVirtualizer({
    count:           totalCount,
    getScrollElement: () => parentRef.current,
    estimateSize:    () => 120,       // altura estimada por mensaje
    measureElement:  el => el?.getBoundingClientRect().height ?? 120,
    overscan:        5,
  })

  // Scroll al último mensaje cuando llegan nuevos
  useEffect(() => {
    if (totalCount > 0) {
      virtualizer.scrollToIndex(totalCount - 1, { behavior: 'smooth' })
    }
  }, [totalCount])

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-y-auto px-4 md:px-6 py-6 min-h-0"
    >
      <div
        style={{
          height:   virtualizer.getTotalSize(),
          width:    '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((vItem) => {
          const isTyping = chatLoading && vItem.index === messages.length
          return (
            <div
              key={vItem.key}
              data-index={vItem.index}
              ref={virtualizer.measureElement}
              style={{
                position:  'absolute',
                top:       0,
                left:      0,
                width:     '100%',
                transform: `translateY(${vItem.start}px)`,
                paddingBottom: '1.25rem',
              }}
            >
              {isTyping
                ? <TypingIndicator />
                : <ChatMessage message={messages[vItem.index]} />
              }
            </div>
          )
        })}
      </div>
    </div>
  )
}