import { useEffect } from 'react';
import useCategoryStore from '../store/categoryStore';

export const useCategories = () => {
  const { 
    categories, 
    isLoading, 
    error, 
    fetchCategories, 
    createCategory, 
    updateCategory, 
    deleteCategory, 
    restoreDefaultCategories 
  } = useCategoryStore();

  useEffect(() => {
    // Завантажуємо категорії при першому використанні хука, якщо їх ще немає
    if (categories.length === 0) {
      fetchCategories();
    }
  }, [fetchCategories, categories.length]);

  return {
    categories,
    loading: isLoading,
    error,
    refetch: fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    restoreDefaultCategories,
  };
};