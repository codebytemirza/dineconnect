'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Restaurant } from '@/lib/queries';

export interface AuthUser {
  id: string;
  username: string;
  role: 'superadmin' | 'restaurant';
  restaurantId: string | null;
  name: string;
}

interface RestaurantContextType {
  restaurants: Restaurant[];
  currentRestaurant: Restaurant | null;
  currentRestaurantId: string;
  loading: boolean;
  user: AuthUser | null;
  userLoading: boolean;
  setCurrentRestaurantId: (id: string) => void;
  refreshRestaurants: () => Promise<void>;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
  createRestaurant: (data: {
    name: string;
    phone?: string;
    address?: string;
    currency?: string;
  }) => Promise<Restaurant | null>;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

async function readJsonResponse<T>(response: Response, requestName: string): Promise<T> {
  const responseText = await response.text();
  if (!responseText) {
    throw new Error(`${requestName} returned an empty response (${response.status}).`);
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    throw new Error(`${requestName} returned an invalid response (${response.status}).`);
  }
}

export function RestaurantProvider({ children }: { children: ReactNode }) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [currentRestaurantId, setCurrentRestaurantIdState] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [userLoading, setUserLoading] = useState<boolean>(true);

  async function fetchUser() {
    try {
      setUserLoading(true);
      const res = await fetch('/api/auth/session');
      const json = await readJsonResponse<{
        success?: boolean;
        authenticated?: boolean;
        user?: AuthUser;
      }>(res, 'Session request');
      if (json.success && json.authenticated && json.user) {
        setUser(json.user);
        if (json.user.restaurantId) {
          setCurrentRestaurantIdState(json.user.restaurantId);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to check auth session:', err);
      setUser(null);
    } finally {
      setUserLoading(false);
    }
  }

  async function fetchRestaurants() {
    try {
      const res = await fetch('/api/restaurants');
      const json = await readJsonResponse<{ success?: boolean; data?: Restaurant[]; error?: string }>(res, 'Restaurant list request');
      if (!res.ok) throw new Error(json.error || `Restaurant list request failed (${res.status}).`);
      if (json.success && Array.isArray(json.data)) {
        setRestaurants(json.data);

        // If user is restaurant role, lock to their restaurant
        if (user && user.role === 'restaurant' && user.restaurantId) {
          setCurrentRestaurantIdState(user.restaurantId);
          return;
        }

        // Otherwise determine active restaurant ID
        const savedId = typeof window !== 'undefined' ? localStorage.getItem('dineconnect_active_restaurant') : null;
        if (savedId && json.data.some((r: Restaurant) => r.id === savedId)) {
          setCurrentRestaurantIdState(savedId);
        } else if (json.data.length > 0) {
          const firstId = json.data[0].id;
          setCurrentRestaurantIdState(firstId);
          if (typeof window !== 'undefined') {
            localStorage.setItem('dineconnect_active_restaurant', firstId);
          }
        } else {
          setCurrentRestaurantIdState('');
        }
      }
    } catch (err) {
      console.error('Failed to load restaurants:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUser();
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (user && user.role === 'restaurant' && user.restaurantId) {
      setCurrentRestaurantIdState(user.restaurantId);
    }
  }, [user]);

  function setCurrentRestaurantId(id: string) {
    if (user && user.role === 'restaurant' && user.restaurantId) {
      // Restaurant users cannot switch away from their assigned restaurant
      return;
    }
    setCurrentRestaurantIdState(id);
    if (typeof window !== 'undefined') {
      localStorage.setItem('dineconnect_active_restaurant', id);
    }
  }

  async function logout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    setUser(null);
    window.location.href = '/login';
  }

  async function createRestaurant(data: {
    name: string;
    phone?: string;
    address?: string;
    currency?: string;
  }): Promise<Restaurant | null> {
    try {
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const created = json.data as Restaurant;
        setRestaurants((prev) => [...prev, created]);
        setCurrentRestaurantId(created.id);
        return created;
      }
      return null;
    } catch (err) {
      console.error('Failed to create restaurant:', err);
      return null;
    }
  }

  const currentRestaurant =
    restaurants.find((r) => r.id === currentRestaurantId) ||
    restaurants[0] ||
    null;

  return (
    <RestaurantContext.Provider
      value={{
        restaurants,
        currentRestaurant,
        currentRestaurantId: currentRestaurant?.id || currentRestaurantId,
        loading,
        user,
        userLoading,
        setCurrentRestaurantId,
        refreshRestaurants: fetchRestaurants,
        refreshUser: fetchUser,
        logout,
        createRestaurant,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
}
