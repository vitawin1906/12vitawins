
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ProductSelector from '@/components/blog/ProductSelector';

interface ProductSelectionSectionProps {
  selectedProducts: string[];
  onProductsChange: (productIds: string[]) => void;
}

const ProductSelectionSection = ({ selectedProducts, onProductsChange }: ProductSelectionSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Рекомендуемые товары</CardTitle>
      </CardHeader>
      <CardContent>
        <ProductSelector
          selectedProducts={selectedProducts}
          onProductsChange={onProductsChange}
        />
      </CardContent>
    </Card>
  );
};

export default ProductSelectionSection;
