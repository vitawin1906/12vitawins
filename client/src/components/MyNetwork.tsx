import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Network,
    Users,
    ChevronRight,
    ChevronDown,
    User,
    Eye,
    Search,
    MoreHorizontal
} from 'lucide-react';
import { useGetMyNetworkTreeQuery, useGetMyNetworkQuery } from '@/store/api/domains';
import type { MLMNetworkNode } from '@/store/api/domains/mlmApi';

const hasUserId = (node: any): node is MLMNetworkNode & { user: { id: string } } =>
    !!node?.user?.id && typeof node.user.id === 'string';

const safeChildren = (node: MLMNetworkNode): MLMNetworkNode[] =>
    Array.isArray(node.children) ? node.children.filter(hasUserId) : [];

const NetworkNodeComponent: React.FC<{
    node: MLMNetworkNode;
    isExpanded: boolean;
    onToggle: (nodeId: string) => void;
    onSelectNode: (node: MLMNetworkNode) => void;
}> = ({ node, isExpanded, onToggle, onSelectNode }) => {
    // ✅ страховка: если бек дал кривую ноду — просто не рендерим её
    if (!hasUserId(node)) return null;

    const user = node.user;
    const children = safeChildren(node);
    const hasChildren = children.length > 0;

    return (
        <div className="mb-2">
            <div
                className={`flex items-center p-3 rounded-lg border transition-all hover:bg-gray-50 cursor-pointer ${
                    node.depth === 0 ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                }`}
                style={{ marginLeft: `${node.depth * 24}px` }}
                onClick={() => onSelectNode(node)}
            >
                {hasChildren ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 mr-2"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggle(user.id);
                        }}
                    >
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </Button>
                ) : (
                    <div className="w-8" />
                )}

                <div className="flex items-center space-x-3 flex-1">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
                        {(user.firstName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <div className="font-medium text-sm">
                            {user.firstName || 'Без имени'} {user.lastName || ''}
                        </div>
                        <div className="text-xs text-gray-500">
                            {node.depth === 0 ? 'Вы' : `Уровень ${node.depth}`}
                            {user.email && ` • ${user.email}`}
                        </div>
                    </div>

                    {user.mlmStatus && (
                        <Badge
                            className={
                                user.mlmStatus === 'partner_pro'
                                    ? 'bg-purple-100 text-purple-800'
                                    : user.mlmStatus === 'partner'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-gray-100 text-gray-800'
                            }
                        >
                            {user.mlmStatus === 'partner_pro' ? 'PRO' :
                             user.mlmStatus === 'partner' ? 'Партнёр' :
                             'Покупатель'}
                        </Badge>
                    )}

                    {user.rank && (
                        <Badge variant="outline" className="text-xs">
                            {user.rank}
                        </Badge>
                    )}

                    {hasChildren && (
                        <Badge variant="secondary" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {children.length}
                        </Badge>
                    )}
                </div>
            </div>

            {isExpanded && hasChildren && (
                <div className="mt-2">
                    {children.map((child) => (
                        <NetworkNodeComponent
                            key={child.user.id}
                            node={child}
                            isExpanded={false}
                            onToggle={onToggle}
                            onSelectNode={onSelectNode}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

const MyNetwork: React.FC = () => {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
    const [selectedNode, setSelectedNode] = useState<MLMNetworkNode | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [maxDepth, setMaxDepth] = useState(16);
    const [showAllFirstLevel, setShowAllFirstLevel] = useState(false);

    const { data: networkTree, isLoading: isTreeLoading, error } = useGetMyNetworkTreeQuery();
    const { data: networkList = [], isLoading: isListLoading } = useGetMyNetworkQuery();

    const isLoading = isTreeLoading || isListLoading;

    const toggleNode = (nodeId: string) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(nodeId)) newExpanded.delete(nodeId);
        else newExpanded.add(nodeId);
        setExpandedNodes(newExpanded);
    };

    const filterNodes = (node: MLMNetworkNode): MLMNetworkNode | null => {
        if (!hasUserId(node)) return null;
        if (node.depth > maxDepth) return null;

        if (!searchTerm) {
            // всё равно фильтруем детей на валидные
            return { ...node, children: safeChildren(node).map((c) => filterNodes(c)).filter(Boolean) as MLMNetworkNode[] };
        }

        const user = node.user;
        const q = searchTerm.toLowerCase();
        const matchesSearch =
            (user.firstName || '').toLowerCase().includes(q) ||
            (user.lastName || '').toLowerCase().includes(q) ||
            (user.email || '').toLowerCase().includes(q) ||
            (user.telegramId || '').toString().includes(searchTerm);

        const filteredChildren = safeChildren(node)
            .map((child) => filterNodes(child))
            .filter(Boolean) as MLMNetworkNode[];

        if (matchesSearch || filteredChildren.length > 0) {
            return { ...node, children: filteredChildren };
        }

        return null;
    };

    const limitFirstLevelChildren = (node: MLMNetworkNode): MLMNetworkNode => {
        if (!hasUserId(node)) return node;

        if (node.depth === 0 && Array.isArray(node.children) && node.children.length > 10 && !showAllFirstLevel) {
            return {
                ...node,
                children: node.children.slice(0, 10),
            };
        }
        return node;
    };

    const renderNetworkTree = (node: MLMNetworkNode, path = 'root'): React.ReactNode => {
        const filteredNode = filterNodes(node);
        if (!filteredNode) return null;

        const limitedNode = limitFirstLevelChildren(filteredNode);
        if (!hasUserId(limitedNode)) {
            console.warn('Invalid MLM node skipped:', path, limitedNode);
            return null;
        }

        const isExpanded = expandedNodes.has(limitedNode.user.id);
        const children = safeChildren(limitedNode);

        return (
            <div key={`${limitedNode.user.id}-${limitedNode.depth}`}>
                <NetworkNodeComponent
                    node={limitedNode}
                    isExpanded={isExpanded}
                    onToggle={toggleNode}
                    onSelectNode={setSelectedNode}
                />

                {isExpanded && children.length > 0 && (
                    <div>
                        {children.map((child, i) => renderNetworkTree(child, `${path}.${limitedNode.user.id}.${i}`))}
                    </div>
                )}

                {limitedNode.depth === 0 &&
                    Array.isArray(node.children) &&
                    node.children.length > 10 &&
                    !showAllFirstLevel && (
                        <div style={{ marginLeft: `${(limitedNode.depth + 1) * 24}px` }} className="mt-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowAllFirstLevel(true)}
                                className="text-xs"
                            >
                                <MoreHorizontal className="h-4 w-4 mr-1" />
                                Показать еще {node.children.length - 10} участников
                            </Button>
                        </div>
                    )}
            </div>
        );
    };

    const totalReferrals = networkList.length;
    const directReferrals = (networkTree && hasUserId(networkTree) ? safeChildren(networkTree).length : 0);
    const activeReferrals = networkList.filter((u) => u.mlmStatus === 'active').length;

    const rootIsValid = useMemo(() => (networkTree ? hasUserId(networkTree) : false), [networkTree]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Network className="h-5 w-5" />
                            <span>Моя сеть</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Network className="h-5 w-5" />
                        <span>Моя сеть</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-gray-500">Ошибка при загрузке данных сети</div>
                </CardContent>
            </Card>
        );
    }

    // ✅ если бек отдал «дерево» без user.id — показываем понятное сообщение вместо краша
    if (networkTree && !rootIsValid) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                        <Network className="h-5 w-5" />
                        <span>Моя сеть</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center text-gray-500">
                        Данные сети пришли в некорректном формате. Проверь backend: network tree возвращает узлы без user.id.
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Поиск и фильтры */}
            <Card>
                <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Поиск по имени или email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Select value={maxDepth.toString()} onValueChange={(value) => setMaxDepth(parseInt(value, 10))}>
                                <SelectTrigger className="w-40">
                                    <SelectValue placeholder="Глубина" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">Только прямые (ур.1)</SelectItem>
                                    <SelectItem value="2">До 2 уровня</SelectItem>
                                    <SelectItem value="3">До 3 уровня</SelectItem>
                                    <SelectItem value="5">До 5 уровня</SelectItem>
                                    <SelectItem value="8">До 8 уровня</SelectItem>
                                    <SelectItem value="10">До 10 уровня</SelectItem>
                                    <SelectItem value="16">Все 16 уровней</SelectItem>
                                </SelectContent>
                            </Select>
                            {searchTerm && (
                                <Button variant="outline" size="sm" onClick={() => setSearchTerm('')}>
                                    Очистить
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Статистика сети */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <Users className="h-5 w-5 text-blue-500" />
                            <div>
                                <div className="text-sm font-medium">Всего рефералов</div>
                                <div className="text-2xl font-bold">{totalReferrals}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <User className="h-5 w-5 text-green-500" />
                            <div>
                                <div className="text-sm font-medium">Прямые рефералы</div>
                                <div className="text-2xl font-bold">{directReferrals}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <Network className="h-5 w-5 text-purple-500" />
                            <div>
                                <div className="text-sm font-medium">Активные</div>
                                <div className="text-2xl font-bold">{activeReferrals}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Дерево сети */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Network className="h-5 w-5" />
                            <span>Структура сети</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-96">
                            {networkTree ? (
                                <div className="space-y-2">{renderNetworkTree(networkTree)}</div>
                            ) : (
                                <div className="text-center text-gray-500 py-8">
                                    <Network className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                    <p>Ваша сеть пуста</p>
                                    <p className="text-sm">Приглашайте новых участников для развития структуры</p>
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>

                {/* Детали выбранного пользователя */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                            <Eye className="h-5 w-5" />
                            <span>Детали участника</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {selectedNode && hasUserId(selectedNode) ? (
                            <div className="space-y-4">
                                <div className="text-center">
                                    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-semibold mx-auto mb-3">
                                        {(selectedNode.user.firstName || 'U').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="font-semibold text-lg">
                                        {selectedNode.user.firstName || 'Без имени'} {selectedNode.user.lastName || ''}
                                    </div>
                                    <div className="text-sm text-gray-500">{selectedNode.user.email}</div>
                                    {selectedNode.user.mlmStatus && (
                                        <Badge
                                            className={`mt-2 ${
                                                selectedNode.user.mlmStatus === 'active'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'
                                            }`}
                                        >
                                            {selectedNode.user.mlmStatus === 'active' ? 'Активен' : 'Неактивен'}
                                        </Badge>
                                    )}
                                </div>

                                <div className="space-y-3 border-t pt-4">
                                    {selectedNode.user.rank && (
                                        <div>
                                            <div className="text-sm font-medium text-gray-600">Ранг</div>
                                            <div className="font-semibold">{selectedNode.user.rank}</div>
                                        </div>
                                    )}

                                    {selectedNode.user.telegramId && (
                                        <div>
                                            <div className="text-sm font-medium text-gray-600">Telegram ID</div>
                                            <div className="font-mono text-sm">{selectedNode.user.telegramId}</div>
                                        </div>
                                    )}

                                    {selectedNode.user.createdAt && (
                                        <div>
                                            <div className="text-sm font-medium text-gray-600">Дата регистрации</div>
                                            <div className="text-sm">
                                                {new Date(selectedNode.user.createdAt as any).toLocaleDateString('ru-RU', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {Array.isArray(selectedNode.children) && selectedNode.children.length > 0 && (
                                        <div>
                                            <div className="text-sm font-medium text-gray-600">Прямые рефералы</div>
                                            <div className="font-semibold">{selectedNode.children.filter(hasUserId).length} участников</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 py-8">
                                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                Выберите участника для просмотра деталей
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default MyNetwork;
