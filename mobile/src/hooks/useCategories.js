import { useEffect } from 'react';
import useCategoryStore from '../store/categoryStore';

export const useCategories = () => {
  const store = useCategoryStore();

  useEffect(() => {
    store.fetchCategories();
  }, []);

  return {
    categories: store.categories,
    loading: store.loading,
    error: store.error,
    refetch: store.fetchCategories,
    createCategory: store.createCategory,
    updateCategory: store.updateCategory,
    deleteCategory: store.deleteCategory,
    restoreDefaultCategories: store.restoreDefaultCategories,
  };
};