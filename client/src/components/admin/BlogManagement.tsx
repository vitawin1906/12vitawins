
import { useState, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, Eye, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { BlogPostForm } from './BlogPostForm';
import {
  useGetAllPostsQuery,
  useDeletePostMutation,
  usePublishPostMutation,
  useUnpublishPostMutation,
  BlogPost as ApiBlogPost,
} from '@/store/api/domains';

const BlogManagement = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ApiBlogPost | null>(null);

  // RTK Query hooks
  const { data: posts = [], isLoading, isError, refetch } = useGetAllPostsQuery();
  const [deletePost] = useDeletePostMutation();
  const [publishPost] = usePublishPostMutation();
  const [unpublishPost] = useUnpublishPostMutation();

  // Фильтрация постов
  const filteredPosts = useMemo(() => {
    return posts.filter(post =>
      post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.excerpt?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [posts, searchTerm]);

  const handleDelete = async (postId: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту статью?')) return;

    try {
      await deletePost(postId).unwrap();
      toast({
        title: "Статья удалена",
        description: "Статья успешно удалена"
      });
    } catch (error: any) {
      toast({
        title: "Ошибка удаления",
        description: error?.data?.message || "Не удалось удалить статью",
        variant: "destructive"
      });
    }
  };

    const handleTogglePublish = async (post: ApiBlogPost) => {
        try {
            // Проверяем текущий status (не isPublished)
            if (post.status === 'published') {
                // Снять с публикации - изменить status на 'draft'
                await unpublishPost(post.id).unwrap();
                toast({
                    title: 'Статья снята с публикации',
                    description: 'Статья больше не отображается на сайте'
                });
            } else {
                // Публиковать - изменить status на 'published'
                // Проверяем что есть categorySlug
                if (!post.categorySlug) {
                    toast({
                        title: 'Не выбрана категория',
                        description: 'Для публикации нужно указать категорию статьи',
                        variant: 'destructive',
                    });
                    return;
                }

                await publishPost(post.id).unwrap();
                toast({
                    title: 'Статья опубликована',
                    description: 'Статья отображается на сайте'
                });
            }
        } catch (error: any) {
            toast({
                title: 'Ошибка',
                description: error?.data?.message || 'Не удалось изменить статус публикации',
                variant: 'destructive',
            });
        }
    };

  const handleEdit = (post: ApiBlogPost) => {
    setEditingPost(post);
    setIsDialogOpen(true);
  };

  const publishedCount = posts.filter(p => p.status === 'published').length;
  const draftCount = posts.filter(p => p.status === 'draft').length;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-red-600">Ошибка загрузки статей блога</p>
        <Button onClick={() => refetch()} variant="outline">
          Попробовать снова
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Управление блогом</h2>
          <p className="text-gray-600">Создавайте и редактируйте статьи блога</p>
        </div>
        <Button onClick={() => { setEditingPost(null); setIsDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Создать статью
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Всего статей</p>
                <p className="text-2xl font-bold">{posts.length}</p>
              </div>
              <Eye className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Опубликовано</p>
                <p className="text-2xl font-bold">{publishedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Черновики</p>
                <p className="text-2xl font-bold">{draftCount}</p>
              </div>
              <XCircle className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Статьи блога</CardTitle>
          <CardDescription>Управление статьями и публикациями</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Поиск статей..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid gap-4">
              {filteredPosts.map((post) => (
                <Card key={post.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex space-x-4 flex-grow">
                        {post.heroMediaId && (
                          <img
                            src={post.heroMediaId}
                            alt={post.title}
                            className="w-20 h-20 object-cover rounded"
                          />
                        )}
                        <div className="flex-grow">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-gray-900">{post.title}</h3>
                            <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                              {post.status === 'published' ? 'Опубликовано' : 'Черновик'}
                            </Badge>
                          </div>
                          <p className="text-gray-600 text-sm mb-2">
                            {post.excerpt || post.content?.substring(0, 150) + '...'}
                          </p>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{post.author || 'Админ'}</span>
                            <span>{new Date(post.publishDate || post.createdAt!).toLocaleDateString('ru-RU')}</span>
                            {post.readTime && <span>📖 {post.readTime} мин</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2">
                        <Button
                          variant={post.status === 'published' ? "outline" : "default"}
                          size="sm"
                          onClick={() => handleTogglePublish(post)}
                        >
                          {post.status === 'published' ? (
                            <>
                              <XCircle className="h-4 w-4 mr-1" />
                              Снять с публикации
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Опубликовать
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(post)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Редактировать
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(post.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Удалить
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Диалог создания/редактирования */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPost ? 'Редактировать статью' : 'Создать новую статью'}
            </DialogTitle>
            <DialogDescription>
              {editingPost
                ? 'Внесите изменения в статью и сохраните'
                : 'Заполните форму для создания новой статьи блога'}
            </DialogDescription>
          </DialogHeader>
          <BlogPostForm
            post={editingPost}
            onSuccess={() => {
              setIsDialogOpen(false);
              setEditingPost(null);
            }}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingPost(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export { BlogManagement };
