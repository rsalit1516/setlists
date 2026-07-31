'use client'

import { useState } from 'react'
import { useEditor, useEditorState, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  Highlighter,
  Heading2,
  List,
  ListOrdered,
  IndentIncrease,
  IndentDecrease,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { legacyTextToHtml } from '@/lib/rich-text'

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex min-h-9 min-w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40',
        active && 'bg-accent text-accent-foreground'
      )}
    >
      {children}
    </button>
  )
}

function useToolbarState(editor: Editor | null) {
  return useEditorState({
    editor,
    selector: (ctx) => ({
      bold: ctx.editor?.isActive('bold') ?? false,
      italic: ctx.editor?.isActive('italic') ?? false,
      highlight: ctx.editor?.isActive('highlight') ?? false,
      heading2: ctx.editor?.isActive('heading', { level: 2 }) ?? false,
      bulletList: ctx.editor?.isActive('bulletList') ?? false,
      orderedList: ctx.editor?.isActive('orderedList') ?? false,
      canSink: ctx.editor?.can().sinkListItem('listItem') ?? false,
      canLift: ctx.editor?.can().liftListItem('listItem') ?? false,
    }),
  })
}

export function LyricsEditor({
  id,
  name,
  defaultValue,
  placeholder = 'Paste or type lyrics/notes here…',
}: {
  id?: string
  name: string
  defaultValue: string
  placeholder?: string
}) {
  const initialContent = legacyTextToHtml(defaultValue)
  const [html, setHtml] = useState(initialContent)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2] } }),
      Highlight,
      Placeholder.configure({ placeholder }),
    ],
    content: initialContent,
    immediatelyRender: false,
    onUpdate: ({ editor }) => setHtml(editor.getHTML()),
    editorProps: {
      attributes: {
        ...(id && { id }),
        class: 'rich-text-content min-h-32 w-full px-2.5 py-2 text-sm outline-none',
      },
    },
  })

  const state = useToolbarState(editor)

  return (
    <div className="rounded-lg border border-input bg-transparent focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-input p-1">
        <ToolbarButton
          label="Bold"
          active={state?.bold}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={state?.italic}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Highlight"
          active={state?.highlight}
          onClick={() => editor?.chain().focus().toggleHighlight().run()}
        >
          <Highlighter className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Section heading"
          active={state?.heading2}
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          active={state?.bulletList}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={state?.orderedList}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Indent"
          disabled={!state?.canSink}
          onClick={() => editor?.chain().focus().sinkListItem('listItem').run()}
        >
          <IndentIncrease className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Outdent"
          disabled={!state?.canLift}
          onClick={() => editor?.chain().focus().liftListItem('listItem').run()}
        >
          <IndentDecrease className="size-4" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
      <input type="hidden" name={name} value={html} readOnly />
    </div>
  )
}
