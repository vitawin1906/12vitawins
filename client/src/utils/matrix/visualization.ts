import type { MatrixNode } from '@/types/matrix';

/**
 * Построить дерево из downline массива
 */
export function buildTreeFromDownline(
  downline: Array<{ userId: string; position: 'left' | 'right'; level: number; parentId: string | null }>,
  rootUserId: string
): MatrixNode | null {
  if (!downline.length) return null;

  const nodeMap = new Map<string, MatrixNode>();

  // Создать все узлы
  downline.forEach((item) => {
    nodeMap.set(item.userId, {
      userId: item.userId,
      position: item.position,
      level: item.level,
      children: [],
      parentId: item.parentId,
    });
  });

  // Связать parent-child
  downline.forEach((item) => {
    if (item.parentId && nodeMap.has(item.parentId)) {
      const parent = nodeMap.get(item.parentId)!;
      const child = nodeMap.get(item.userId)!;
      parent.children = parent.children || [];
      parent.children.push(child);
    }
  });

  return nodeMap.get(rootUserId) || null;
}

/**
 * Получить максимальную глубину дерева
 */
export function getTreeDepth(node: MatrixNode | null): number {
  if (!node || !node.children?.length) return 0;
  return 1 + Math.max(...node.children.map(getTreeDepth));
}

/**
 * Подсчитать общее количество узлов в дереве
 */
export function countNodes(node: MatrixNode | null): number {
  if (!node) return 0;
  if (!node.children?.length) return 1;
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
}

/**
 * Получить все узлы на определённом уровне
 */
export function getNodesAtLevel(node: MatrixNode | null, targetLevel: number): MatrixNode[] {
  if (!node) return [];
  if (node.level === targetLevel) return [node];
  if (!node.children?.length) return [];

  return node.children.flatMap(child => getNodesAtLevel(child, targetLevel));
}
