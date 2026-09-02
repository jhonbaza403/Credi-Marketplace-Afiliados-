"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string | null;
  slug?: string | null;
  currency?: string | null;
}

export interface CartContextType {
  items: CartItem[];
  cart: CartItem[];
  subtotal: number;
  addToCart: (item: CartItem) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = useCallback((item: CartItem) => {
    if (!item.id || item.quantity <= 0 || !Number.isFinite(item.price)) return;

    setItems((current) => {
      const existing = current.find((entry) => entry.id === item.id);
      if (!existing) return [...current, { ...item }];

      return current.map((entry) =>
        entry.id === item.id
          ? { ...entry, quantity: entry.quantity + item.quantity }
          : entry,
      );
    });
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (!id) return;
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setItems((current) => current.filter((item) => item.id !== id));
      return;
    }

    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, quantity: Math.floor(quantity) } : item,
      ),
    );
  }, []);

  const removeItem = useCallback((id: string) => {
    if (!id) return;
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const subtotal = useMemo(
    () => items.reduce((total, item) => total + item.price * item.quantity, 0),
    [items],
  );

  const value = useMemo<CartContextType>(
    () => ({
      items,
      cart: items,
      subtotal,
      addToCart,
      updateQuantity,
      removeItem,
      removeFromCart: removeItem,
      clearCart,
    }),
    [items, subtotal, addToCart, updateQuantity, removeItem, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart debe ser usado dentro de un CartProvider");
  }
  return context;
}
