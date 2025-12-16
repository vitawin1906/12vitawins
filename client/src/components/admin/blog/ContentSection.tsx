
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

interface ContentSectionProps {
  content: string;
  onContentChange: (content: string) => void;
  errors?: Record<string, string>;
}

const ContentSection = ({ content, onContentChange, errors = {} }: ContentSectionProps) => {
  const insertText = (textToInsert: string) => {
    onContentChange(content + '\n' + textToInsert + '\n');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Содержание статьи</CardTitle>
      </CardHeader>
      <CardContent>
        <Label htmlFor="content">Текст статьи (с поддержкой Markdown)</Label>
        <div className="flex flex-wrap gap-2 mb-3 p-2 bg-gray-50 rounded border">
          <button
            type="button"
            className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-100"
            onClick={() => insertText('# Заголовок H1')}
          >
            H1
          </button>
          <button
            type="button"
            className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-100"
            onClick={() => insertText('## Заголовок H2')}
          >
            H2
          </button>
          <button
            type="button"
            className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-100"
            onClick={() => insertText('### Заголовок H3')}
          >
            H3
          </button>
          <button
            type="button"
            className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-100"
            onClick={() => insertText('#### Заголовок H4')}
          >
            H4
          </button>
          <button
            type="button"
            className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-100"
            onClick={() => insertText('##### Заголовок H5')}
          >
            H5
          </button>
          <div className="border-l mx-2"></div>
          <button
            type="button"
            className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-100"
            onClick={() => insertText('- Элемент списка')}
          >
            • Список
          </button>
          <button
            type="button"
            className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-100"
            onClick={() => insertText('**Жирный текст**')}
          >
            B
          </button>
          <button
            type="button"
            className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-100"
            onClick={() => insertText('*Курсив*')}
          >
            I
          </button>
          <button
            type="button"
            className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-100"
            onClick={() => {
              const text = prompt("Введите текст ссылки:");
              const url = prompt("Введите URL:");
              if (text && url) {
                insertText(`[${text}](${url})`);
              }
            }}
          >
            🔗
          </button>
        </div>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          placeholder="Содержание статьи с поддержкой Markdown:
# Заголовок H1
## Заголовок H2
### Заголовок H3
**Жирный текст**
*Курсив*
- Элемент списка
[Текст ссылки](URL)"
          rows={15}
          className={`font-mono text-sm ${errors.content ? 'border-red-500' : ''}`}
        />
        {errors.content && <p className="text-red-500 text-sm mt-1">{errors.content}</p>}
        <div className="text-xs text-gray-500 mt-2">
          💡 Используйте кнопки выше или Markdown разметку: # H1, ## H2, ### H3, **жирный**, *курсив*, - списки
        </div>
      </CardContent>
    </Card>
  );
};

export default ContentSection;
