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
}

export interface CartContextType {
  items: CartItem[];
  cart: CartItem[];

  subtotal: number;
  totalItems: number;

  addToCart: (item: CartItem) => void;
  updateQuantity: (id: string, quantity: number) => void;

  removeItem: (id: string) => void;
  removeFromCart: (id: string) => void;

  clearCart: () => void;
}

export const CartContext =
  createContext<CartContextType | undefined>(undefined);

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = useCallback((item: CartItem) => {
    if (
      !item.id ||
      !item.name.trim() ||
      !Number.isFinite(item.price) ||
      item.price < 0 ||
      !Number.isInteger(item.quantity) ||
      item.quantity <= 0
    ) {
      return;
    }

    setItems((currentItems) => {
      const existingItem = currentItems.find(
        (currentItem) => currentItem.id === item.id,
      );

      if (!existingItem) {
        return [
          ...currentItems,
          {
            ...item,
            quantity: Math.max(1, item.quantity),
          },
        ];
      }

      return currentItems.map((currentItem) => {
        if (currentItem.id !== item.id) {
          return currentItem;
        }

        return {
          ...currentItem,
          quantity:
            currentItem.quantity +
            Math.max(1, item.quantity),
        };
      });
    });
  }, []);

  const updateQuantity = useCallback(
    (id: string, quantity: number) => {
      if (!id) {
        return;
      }

      if (
        !Number.isInteger(quantity) ||
        quantity <= 0
      ) {
        setItems((currentItems) =>
          currentItems.filter(
            (item) => item.id !== id,
          ),
        );

        return;
      }

      setItems((currentItems) =>
        currentItems.map((item) =>
          item.id === id
            ? {
                ...item,
                quantity,
              }
            : item,
        ),
      );
    },
    [],
  );

  const removeItem = useCallback((id: string) => {
    if (!id) {
      return;
    }

    setItems((currentItems) =>
      currentItems.filter(
        (item) => item.id !== id,
      ),
    );
  }, []);

  const removeFromCart = useCallback(
    (id: string) => {
      removeItem(id);
    },
    [removeItem],
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total +
          item.price * item.quantity,
        0,
      ),
    [items],
  );

  const totalItems = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total + item.quantity,
        0,
      ),
    [items],
  );

  const value = useMemo<CartContextType>(
    () => ({
      items,
      cart: items,
      subtotal,
      totalItems,
      addToCart,
      updateQuantity,
      removeItem,
      removeFromCart,
      clearCart,
    }),
    [
      items,
      subtotal,
      totalItems,
      addToCart,
      updateQuantity,
      removeItem,
      removeFromCart,
      clearCart,
    ],
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart debe utilizarse dentro de CartProvider",
    );
  }

  return context;
}
```
