import { useRouter } from 'next/navigation';
import { ROUTES, RoutePath } from '../types/routes';

export const useNavigation = () => {
  const router = useRouter();

  const navigate = (path: RoutePath) => {
    router.push(path);
  };

  const navigateToSale = (id: string) => {
    router.push(`/sales/${id}`);
  };

  const navigateToCustomer = (id: string) => {
    router.push(`/customers/${id}`);
  };

  const navigateToProduct = (id: string) => {
    router.push(`/products/${id}`);
  };

  const navigateToOrder = (id: string) => {
    router.push(`/orders/${id}`);
  };

  const goBack = () => {
    router.back();
  };

  return {
    navigate,
    navigateToSale,
    navigateToCustomer,
    navigateToProduct,
    navigateToOrder,
    goBack,
    routes: ROUTES,
  };
};