'use client';

import * as React from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Table as TableIcon,
  Video as VideoIcon,
  FileCheck,
  Frame,
  Undo2,
  Redo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { normalizeGoogleFormUrl } from './iframe-embed';

interface ToolbarProps {
  editor: Editor | null;
}

type ModalKind = 'link' | 'image' | 'youtube' | 'gform' | 'iframe' | null;

/**
 * Toolbar cho Tiptap editor — bao gom format, list, heading, link, image,
 * youtube, table, google form, iframe, undo/redo.
 */
export function EditorToolbar({ editor }: ToolbarProps) {
  const [modal, setModal] = React.useState<ModalKind>(null);
  const [url, setUrl] = React.useState('');
  const [urlError, setUrlError] = React.useState<string | null>(null);

  if (!editor) return null;

  const openModal = (kind: Exclude<ModalKind, null>) => {
    setUrl('');
    setUrlError(null);
    setModal(kind);
  };

  const closeModal = () => {
    setModal(null);
    setUrl('');
    setUrlError(null);
  };

  const handleSubmitModal = () => {
    const trimmed = url.trim();
    if (!trimmed) {
      setUrlError('Vui long nhap URL');
      return;
    }

    try {
      // eslint-disable-next-line no-new
      new URL(trimmed);
    } catch {
      setUrlError('URL khong hop le');
      return;
    }

    switch (modal) {
      case 'link':
        editor
          .chain()
          .focus()
          .extendMarkRange('link')
          .setLink({ href: trimmed })
          .run();
        break;
      case 'image':
        editor.chain().focus().setImage({ src: trimmed }).run();
        break;
      case 'youtube':
        editor
          .chain()
          .focus()
          .setYoutubeVideo({ src: trimmed, width: 640, height: 360 })
          .run();
        break;
      case 'gform': {
        const normalized = normalizeGoogleFormUrl(trimmed);
        if (!normalized) {
          setUrlError('URL phai la Google Forms (docs.google.com/forms/...)');
          return;
        }
        editor
          .chain()
          .focus()
          .addEmbedIframe({ src: normalized, height: 800, title: 'Google Form' })
          .run();
        break;
      }
      case 'iframe':
        editor
          .chain()
          .focus()
          .addEmbedIframe({ src: trimmed, height: 500 })
          .run();
        break;
    }
    closeModal();
  };

  const btnCls = (active: boolean) =>
    cn(
      'h-8 w-8 p-0 rounded hover:bg-gray-100',
      active && 'bg-blue-100 text-blue-700',
    );

  return (
    <>
      <div className="flex flex-wrap items-center gap-1 p-2 border border-gray-200 border-b-0 rounded-t-lg bg-gray-50">
        {/* Undo / Redo */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btnCls(false)}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Hoan tac"
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btnCls(false)}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Lam lai"
        >
          <Redo2 className="h-4 w-4" />
        </Button>

        <span className="mx-1 h-5 w-px bg-gray-300" />

        {/* Formatting */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btnCls(editor.isActive('bold'))}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="In dam"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btnCls(editor.isActive('italic'))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="In nghieng"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btnCls(editor.isActive('strike'))}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Gach ngang"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btnCls(editor.isActive('code'))}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title="Ma"
        >
          <Code className="h-4 w-4" />
        </Button>

        <span className="mx-1 h-5 w-px bg-gray-300" />

        {/* Headings */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btnCls(editor.isActive('heading', { level: 1 }))}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          title="Tieu de 1"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btnCls(editor.isActive('heading', { level: 2 }))}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          title="Tieu de 2"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btnCls(editor.isActive('heading', { level: 3 }))}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          title="Tieu de 3"
        >
          <Heading3 className="h-4 w-4" />
        </Button>

        <span className="mx-1 h-5 w-px bg-gray-300" />

        {/* Lists */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btnCls(editor.isActive('bulletList'))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Danh sach"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btnCls(editor.isActive('orderedList'))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Danh sach co thu tu"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btnCls(editor.isActive('blockquote'))}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Trich dan"
        >
          <Quote className="h-4 w-4" />
        </Button>

        <span className="mx-1 h-5 w-px bg-gray-300" />

        {/* Align */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btnCls(editor.isActive({ textAlign: 'left' }))}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Can trai"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btnCls(editor.isActive({ textAlign: 'center' }))}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Can giua"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btnCls(editor.isActive({ textAlign: 'right' }))}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Can phai"
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <span className="mx-1 h-5 w-px bg-gray-300" />

        {/* Link / Image / Table */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btnCls(editor.isActive('link'))}
          onClick={() => openModal('link')}
          title="Lien ket"
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btnCls(false)}
          onClick={() => openModal('image')}
          title="Hinh anh"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btnCls(false)}
          onClick={() =>
            editor
              .chain()
              .focus()
              .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
              .run()
          }
          title="Bang"
        >
          <TableIcon className="h-4 w-4" />
        </Button>

        <span className="mx-1 h-5 w-px bg-gray-300" />

        {/* Youtube / Google Form / Iframe */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btnCls(false)}
          onClick={() => openModal('youtube')}
          title="Video YouTube"
        >
          <VideoIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btnCls(false)}
          onClick={() => openModal('gform')}
          title="Google Form"
        >
          <FileCheck className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={btnCls(false)}
          onClick={() => openModal('iframe')}
          title="Iframe tuy chinh"
        >
          <Frame className="h-4 w-4" />
        </Button>
      </div>

      {/* Modal nhap URL */}
      <Dialog open={modal !== null} onOpenChange={(o) => !o && closeModal()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {modal === 'link' && 'Chen lien ket'}
              {modal === 'image' && 'Chen hinh anh'}
              {modal === 'youtube' && 'Chen video YouTube'}
              {modal === 'gform' && 'Chen Google Form'}
              {modal === 'iframe' && 'Chen iframe'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="tiptap-url">URL</Label>
            <Input
              id="tiptap-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                modal === 'gform'
                  ? 'https://docs.google.com/forms/d/e/XXX/viewform'
                  : modal === 'youtube'
                    ? 'https://www.youtube.com/watch?v=...'
                    : 'https://...'
              }
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmitModal();
                }
              }}
            />
            {urlError && (
              <p className="text-xs text-red-500">{urlError}</p>
            )}
            {modal === 'iframe' && (
              <p className="text-xs text-gray-500">
                Chi cho phep domain an toan: docs.google.com, youtube.com,
                vimeo.com, codepen.io...
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Huy
            </Button>
            <Button onClick={handleSubmitModal}>Chen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
