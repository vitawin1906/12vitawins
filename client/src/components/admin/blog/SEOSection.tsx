
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import React from "react";

interface SEOSectionProps {
  formData: {
    keywords: string;
    customUrl: string;
    readTime: number;
    status: 'published' | 'draft';
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onStatusChange: (status: 'published' | 'draft') => void;
}

const SEOSection = ({ formData, onChange, onStatusChange }: SEOSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>SEO и дополнительная информация</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div>
          <Label htmlFor="keywords">Ключевые слова (через запятую)</Label>
          <Input
            type="text"
            id="keywords"
            name="keywords"
            value={formData.keywords}
            onChange={onChange}
            placeholder="витамины, здоровье, иммунитет"
          />
        </div>
        <div>
          <Label htmlFor="customUrl">Кастомный URL</Label>
          <Input
            type="text"
            id="customUrl"
            name="customUrl"
            value={formData.customUrl}
            onChange={onChange}
            placeholder="vitamin-d3-benefits"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="readTime">Время чтения (минут)</Label>
            <Input
              type="number"
              id="readTime"
              name="readTime"
              value={formData.readTime}
              onChange={onChange}
              required
            />
          </div>
          <div>
            <Label htmlFor="status">Статус</Label>
            <Select value={formData.status} onValueChange={onStatusChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Выберите статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="published">Опубликовано</SelectItem>
                <SelectItem value="draft">Черновик</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SEOSection;
