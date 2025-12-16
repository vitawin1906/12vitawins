// client/src/components/admin/CategoryManagement.tsx
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useForm } from 'react-hook-form';
import { Plus, Edit, Trash, FolderOpen, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    useGetAdminCategoriesQuery,
    useCreateCategoryMutation,
    useUpdateCategoryMutation,
    useDeleteCategoryMutation,
    Category,
} from '@/store/api/domains';


const CategoryManagement = () => {
    const { toast } = useToast();

    // RTK Query
    const { data: categories = [], isLoading, isError, refetch } = useGetAdminCategoriesQuery();
    const [createCategory] = useCreateCategoryMutation();
    const [updateCategory] = useUpdateCategoryMutation();
    const [deleteCategory] = useDeleteCategoryMutation();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

    /* ---------- НОРМАЛИЗАТОР КАТЕГОРИИ ---------- */
    const normCat = (c: Category): Category => ({
        ...c,
        description: c.description ?? '',
        slug: c.slug ?? '',
        productCount: (c as any).productCount ?? 0,
    });

    /* ---------- НОРМАЛИЗОВАННЫЙ СПИСОК ---------- */
    const normalized = useMemo(() => categories.map(normCat), [categories]);

    const form = useForm({
        defaultValues: { name: '', description: '', slug: '' }
    });

    const generateSlug = (name: string) =>
        name
            .toLowerCase()
            .replace(/[а-я]/g, (char) => {
                const map: Record<string, string> = {
                    'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'yo','ж':'zh','з':'z','и':'i','й':'y',
                    'к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f',
                    'х':'h','ц':'ts','ч':'ch','ш':'sh','щ':'sch','ъ':'','ы':'y','ь':'','э':'e','ю':'yu','я':'ya'
                };
                return map[char] || char;
            })
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

    const onSubmit = async (data: any) => {
        const base = {
            name: data.name,
            description: data.description,
        };

        try {
            if (editingCategory) {
                await updateCategory({
                    id: editingCategory.id,
                    body: base,
                }).unwrap();
                toast({ title: 'Категория обновлена', description: 'Информация обновлена' });
            } else {
                await createCategory({
                    ...base,
                    slug: data.slug || generateSlug(data.name)
                }).unwrap();
                toast({ title: 'Категория добавлена', description: 'Создана новая категория' });
            }

            setIsDialogOpen(false);
            setEditingCategory(null);
            form.reset();

        } catch (error: any) {
            toast({ title: 'Ошибка', description: error?.data?.message || 'Ошибка сохранения', variant: 'destructive' });
        }
    };

    const handleEdit = (category: Category) => {
        const c = normCat(category);
        setEditingCategory(c);

        form.reset({
            name: c.name,
            description: c.description || '',
            slug: c.slug
        });

        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        try {
            await deleteCategory(id).unwrap();
            toast({ title: 'Категория удалена' });
        } catch (error: any) {
            toast({
                title: 'Ошибка',
                description: error?.data?.message || 'Удаление не удалось',
                variant: 'destructive'
            });
        }
    };

    const toggleStatus = async (category: Category) => {
        const nextStatus: 'active' | 'inactive' | 'archived' =
            category.status === 'active' ? 'inactive' : 'active';

        try {
            await updateCategory({
                id: category.id,
                body: { ...category, status: nextStatus }
            }).unwrap();

            toast({
                title: nextStatus === 'active' ? 'Активирована' : 'Деактивирована',
                description: `Категория ${category.name} обновлена`
            });

        } catch (error: any) {
            toast({ title: 'Ошибка', description: 'Не удалось сменить статус', variant: 'destructive' });
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <p className="text-red-600">Ошибка загрузки категорий</p>
                <Button onClick={() => refetch()} variant="outline">Попробовать снова</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">Управление категориями</h2>
                    <p className="text-gray-600">Создавайте и управляйте категориями товаров</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={() => { setEditingCategory(null); form.reset(); }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Добавить категорию
                        </Button>
                    </DialogTrigger>

                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {editingCategory ? 'Редактировать категорию' : 'Добавить категорию'}
                            </DialogTitle>
                            <DialogDescription>
                                Заполните данные категории
                            </DialogDescription>
                        </DialogHeader>

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Название</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Название категории" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Описание</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="Описание категории" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="slug"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Slug</FormLabel>
                                            <FormControl>
                                                <Input placeholder="URL slug" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="flex justify-end space-x-2">
                                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Отмена</Button>
                                    <Button type="submit">{editingCategory ? 'Обновить' : 'Добавить'}</Button>
                                </div>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Таблица */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Список категорий</CardTitle>
                        <CardDescription>Всего: {normalized.length}</CardDescription>
                    </CardHeader>

                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Название</TableHead>
                                    <TableHead>Товары</TableHead>
                                    <TableHead>Статус</TableHead>
                                    <TableHead>Действия</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {normalized.map((category) => (
                                    <TableRow key={category.id}>
                                        <TableCell>
                                            <div className="flex items-center space-x-3">
                                                <FolderOpen className="h-4 w-4 text-gray-400" />
                                                <div>
                                                    <div className="font-medium">{category.name}</div>
                                                    <div className="text-sm text-gray-500">{category.description || '—'}</div>
                                                    <div className="text-xs text-gray-400">/{category.slug}</div>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            <Badge variant="outline">{(category as any).productCount ?? 0}</Badge>
                                        </TableCell>

                                        <TableCell>
                                            <Button size="sm" variant="ghost" onClick={() => toggleStatus(category)}>
                                                <Badge variant={category.status === 'active' ? 'default' : 'secondary'}>
                                                    {category.status === 'active' ? 'Активная' : 'Неактивная'}
                                                </Badge>
                                            </Button>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex space-x-2">
                                                <Button size="sm" variant="outline" onClick={() => handleEdit(category)}>
                                                    <Edit className="h-3 w-3" />
                                                </Button>

                                                <Button size="sm" variant="outline" onClick={() => handleDelete(category.id)}>
                                                    <Trash className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Статистика */}
                <Card>
                    <CardHeader>
                        <CardTitle>Статистика категорий</CardTitle>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Активные</span>
                                <span className="font-medium">
                                    {categories.filter(c => c.status === 'active').length}
                                </span>
                            </div>

                            <div className="flex justify-between text-sm">
                                <span>Неактивные</span>
                                <span className="font-medium">
                                    {categories.filter(c => c.status === 'inactive').length}
                                </span>
                            </div>

                            <div className="flex justify-between text-sm">
                                <span>Всего</span>
                                <span className="font-medium">{categories.length}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export { CategoryManagement };
