export interface DreamEntry {
  id: string;
  name: string;
  timestamp: number;
  description?: string;
  isFavorite?: boolean;
  tags?: string[];
  icon?: string;
  iconColor?: string;
  displayOrder?: number;
  userId?: string;
}
