import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Network,
    ChevronRight,
    ChevronDown,
    User, Users
} from 'lucide-react';
import { useGetAdminUserNetworkTreeQuery } from '@/store/api/domains';
import type { MLMNetworkNode, MLMUser } from '@/store/api/domains/mlmApi';

interface MLMNetworkVisualizationProps {
  userId: string;
  userName: string;
}

const NetworkNodeComponent: React.FC<{
  node: MLMNetworkNode;
  isExpanded: boolean;
  onToggle: () => void;
  expandedNodes: Set<string>;
  toggleNode: (nodeId: string) => void;
}> = ({ node, isExpanded, onToggle, expandedNodes, toggleNode }) => {
  const user = node.user;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="ml-4">
      <div className="flex items-center gap-2 py-2 hover:bg-gray-50 rounded px-2">
        {/* Кнопка разворачивания */}
        {hasChildren ? (
          <button
            onClick={onToggle}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-gray-600" />
            ) : (
              <ChevronRight className="h-4 w-4 text-gray-600" />
            )}
          </button>
        ) : (
          <div className="w-6" />
        )}

        {/* Аватар */}
        <div className="flex-shrink-0">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-semibold">
            {(user.firstName || 'U').charAt(0).toUpperCase()}
          </div>
        </div>

        {/* Информация о пользователе */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {user.firstName || 'Без имени'} {user.lastName || ''}
            </span>
            {user.mlmStatus && (
              <Badge
                variant="outline"
                className={`text-xs ${
                  user.mlmStatus === 'active'
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-gray-50 text-gray-700'
                }`}
              >
                {user.mlmStatus === 'active' ? 'Активен' : 'Неактивен'}
              </Badge>
            )}
          </div>
          <div className="text-xs text-gray-500">
            {user.email || user.telegramId || `ID: ${user.id}`}
          </div>
        </div>

        {/* Счетчик рефералов */}
        {hasChildren && (
          <Badge variant="secondary" className="ml-2">
            <Users className="h-3 w-3 mr-1" />
            {node.children!.length}
          </Badge>
        )}
      </div>

      {/* Дочерние узлы */}
      {isExpanded && hasChildren && (
        <div className="ml-4 border-l-2 border-gray-200 pl-2">
          {node.children!.map((childNode) => (
            <NetworkNodeComponent
              key={childNode.user.id}
              node={childNode}
              isExpanded={expandedNodes.has(childNode.user.id)}
              onToggle={() => toggleNode(childNode.user.id)}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const MLMNetworkVisualization: React.FC<MLMNetworkVisualizationProps> = ({ userId, userName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set([userId]));

  // Загружаем дерево сети только при открытии диалога
  const { data: networkTree, isLoading, error } = useGetAdminUserNetworkTreeQuery(userId, {
    skip: !isOpen,
  });

  const toggleNode = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const expandAll = () => {
    if (!networkTree) return;

    const allIds = new Set<string>();
    const traverse = (node: MLMNetworkNode) => {
      allIds.add(node.user.id);
      if (node.children) {
        node.children.forEach(traverse);
      }
    };
    traverse(networkTree);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set([userId]));
  };

  const countTotalUsers = (node: MLMNetworkNode): number => {
    if (!node.children || node.children.length === 0) return 1;
    return 1 + node.children.reduce((sum, child) => sum + countTotalUsers(child), 0);
  };

  const countDirectReferrals = (node: MLMNetworkNode): number => {
    return node.children ? node.children.length : 0;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Network className="h-4 w-4 mr-2" />
          Сеть
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Network className="h-5 w-5" />
            Сеть пользователя: {userName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 p-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-500 mb-2">Ошибка загрузки сети</div>
            <p className="text-sm text-gray-500">
              Не удалось загрузить структуру MLM сети
            </p>
          </div>
        ) : !networkTree ? (
          <div className="text-center py-8">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Данные сети отсутствуют</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Статистика */}
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {countTotalUsers(networkTree) - 1}
                    </div>
                    <div className="text-sm text-gray-600">Всего в сети</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {countDirectReferrals(networkTree)}
                    </div>
                    <div className="text-sm text-gray-600">Прямых рефералов</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Кнопки управления */}
            <div className="flex gap-2">
              <Button onClick={expandAll} variant="outline" size="sm">
                Развернуть все
              </Button>
              <Button onClick={collapseAll} variant="outline" size="sm">
                Свернуть все
              </Button>
            </div>

            {/* Дерево сети */}
            <ScrollArea className="h-[400px] border rounded-lg p-4">
              <NetworkNodeComponent
                node={networkTree}
                isExpanded={expandedNodes.has(networkTree.user.id)}
                onToggle={() => toggleNode(networkTree.user.id)}
                expandedNodes={expandedNodes}
                toggleNode={toggleNode}
              />
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MLMNetworkVisualization;
