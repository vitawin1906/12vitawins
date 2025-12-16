export type MatrixPosition = 'left' | 'right';

export interface MatrixPlacement {
  id: string;
  userId: string;
  position: MatrixPosition;
  level: number;
  leftLegVolume: string;
  rightLegVolume: string;
  leftLegCount: number;
  rightLegCount: number;
  parentId: string | null;
  sponsorId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface MatrixNode {
  userId: string;
  position: MatrixPosition;
  level: number;
  volume?: string;
  children?: MatrixNode[];
  parentId?: string | null;
}

export interface MatrixChild {
  userId: string;
  position: MatrixPosition;
  level: number;
}

export interface LegBalance {
  left: number;
  right: number;
  total: number;
  difference: number;
  balancePercent: number;
  strongerLeg: 'left' | 'right' | 'balanced';
}
