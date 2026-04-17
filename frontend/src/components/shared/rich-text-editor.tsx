'use client';

import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import Youtube from '@tiptap/extension-youtube';
import TextAlign from '@tiptap/extension-text-align';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import { cn } from '@/lib/utils';
import { IframeEmbed } from './editor-extensions/iframe-embed';
import { EditorToolbar } from './editor-extensions/editor-toolbar';

interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * Rich text editor dung Tiptap.
 * - Ho tro Bold/Italic/Strike/Code/Heading/List/Blockquote
 * - Ho tro Link, Image, Youtube, Table, TextAlign
 * - Custom IframeEmbed cho Google Form va cac embed domain an toan
 */
export function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Nhap noi dung...',
  className,
  disabled = false,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // StarterKit da bao gom dropcursor, gapcursor, history...
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
          class: 'text-blue-600 underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-lg my-2',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      Youtube.configure({
        controls: true,
        nocookie: true,
        modestBranding: true,
        HTMLAttributes: {
          class: 'rounded-lg my-2',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse border border-gray-300 my-2 w-full',
        },
      }),
      TableRow,
      TableHeader.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 bg-gray-50 font-semibold p-2',
        },
      }),
      TableCell.configure({
        HTMLAttributes: {
          class: 'border border-gray-300 p-2',
        },
      }),
      IframeEmbed,
    ],
    content: value,
    editable: !disabled,
    onUpdate: ({ editor: e }) => {
      onChange?.(e.getHTML());
    },
    // Tiptap can option nay o Next.js SSR de tranh hydration mismatch
    immediatelyRender: false,
  });

  // Sync external value changes vao editor
  React.useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    if (value !== currentHtml) {
      editor.commands.setContent(value || '', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  // Sync disabled state
  React.useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  return (
    <div className={cn('rich-text-editor', className)}>
      <EditorToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className={cn(
          'prose prose-sm max-w-none border border-gray-300 rounded-b-lg bg-white p-3 min-h-[240px]',
          'focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent',
          disabled && 'opacity-60 cursor-not-allowed',
        )}
      />
    </div>
  );
}
