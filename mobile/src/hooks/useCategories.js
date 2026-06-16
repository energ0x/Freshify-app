/**
 * @file useCategories.js
 * @description Custom React hook providing access to product category state and actions.
 * Encapsulates fetch calls to initialize categories on component mount, and aggregates CRUD operations
 * from the central category store for simplified component usage.
 */

import { useEffect } from 'react';
import useCategoryStore from '../store/categoryStore';

/**
 * useCategories hook.
 * Triggers category fetch operations upon mounting and exposes category data alongside state manipulators.
 * 
 * @returns {object} Category state properties and actions.
 * @returns {Array<object>} returns.categories - Array of active category objects.
 * @returns {boolean} returns.loading - Loading state flag indicating category operation in progress.
 * @returns {string|null} returns.error - String message of any error encountered.
 * @returns {Function} returns.refetch - Function to trigger manually reloading categories from store.
 * @returns {Function} returns.createCategory - Function to add a new category.
 * @returns {Function} returns.updateCategory - Function to modify an existing category.
 * @returns {Function} returns.deleteCategory - Function to remove a category.
 * @returns {Function} returns.restoreDefaultCategories - Function to wipe local category custom overrides and re-inject defaults.
 */
export const useCategories = () => {
  // Retrieve the global Zustand store instance for category management.
  const store = useCategoryStore();

  // Fetch categories immediately when the consuming component mounts.
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