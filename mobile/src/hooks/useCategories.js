import { useState, useEffect, useCallback } from 'react';
import { categoriesAPI } from '../services/api';

export const useCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const response = await categoriesAPI.list();
      setCategories(response.data);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const createCategory = async (categoryData) => {
    try {
      const response = await categoriesAPI.create(categoryData);
      setCategories((prev) => [...prev, response.data]);
      return response.data;
    } catch (err) {
      console.error("Failed to create category", err);
      throw err;
    }
  };

  const updateCategory = async (id, categoryData) => {
    try {
      const response = await categoriesAPI.update(id, categoryData);
      setCategories((prev) => prev.map((c) => (c.id === id ? response.data : c)));
      return response.data;
    } catch (err) {
      console.error("Failed to update category", err);
      throw err;
    }
  };

  const deleteCategory = async (id) => {
    try {
      await categoriesAPI.delete(id);
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error("Failed to delete category", err);
      throw err;
    }
  };

  const restoreDefaultCategories = async () => {
    try {
      const response = await categoriesAPI.restoreDefaults();
      setCategories(response.data);
      return response.data;
    } catch (err) {
      console.error("Failed to restore default categories", err);
      throw err;
    }
  };

  return {
    categories,
    loading,
    error,
    refetch: fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    restoreDefaultCategories,
  };
};