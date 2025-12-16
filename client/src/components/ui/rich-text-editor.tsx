
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import {Table} from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { Button } from '@/components/ui/button'
import { 
  Bold, 
  Italic, 
  Heading1, 
  Heading2, 
  Heading3, 
  Quote, 
  Table as TableIcon,
  List,
  ListOrdered
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  className?: string
}

const RichTextEditor = ({ content, onChange, placeholder, className }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[120px] p-3',
      },
    },
  })

  if (!editor) {
    return null
  }

  const ToolbarButton = ({ 
    onClick, 
    isActive = false, 
    children, 
    disabled = false 
  }: { 
    onClick: () => void
    isActive?: boolean
    children: React.ReactNode
    disabled?: boolean
  }) => (
    <Button
      type="button"
      variant={isActive ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn("h-8 w-8 p-0", isActive && "bg-gray-200")}
    >
      {children}
    </Button>
  )

  return (
    <div className={cn("border border-input rounded-md", className)}>
      <div className="border-b border-input p-2 flex flex-wrap gap-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive('heading', { level: 1 })}
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive('heading', { level: 2 })}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive('heading', { level: 3 })}
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive('blockquote')}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
        >
          <TableIcon className="h-4 w-4" />
        </ToolbarButton>
      </div>
      
      <EditorContent 
        editor={editor} 
        className="min-h-[120px]"
        placeholder={placeholder}
      />
      
      <style dangerouslySetInnerHTML={{
        __html: `
          .ProseMirror {
            outline: none;
          }
          .ProseMirror table {
            border-collapse: collapse;
            table-layout: fixed;
            width: 100%;
            margin: 0;
            overflow: hidden;
          }
          .ProseMirror td, .ProseMirror th {
            min-width: 1em;
            border: 2px solid #ced4da;
            padding: 3px 5px;
            vertical-align: top;
            box-sizing: border-box;
            position: relative;
          }
          .ProseMirror th {
            font-weight: bold;
            text-align: left;
            background-color: #f1f3f4;
          }
          .ProseMirror blockquote {
            padding-left: 1rem;
            border-left: 2px solid #e5e7eb;
            margin-left: 0;
            margin-right: 0;
            font-style: italic;
          }
        `
      }} />
    </div>
  )
}

export { RichTextEditor }
