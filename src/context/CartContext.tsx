```tsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// ==========================================================
// TIPOS
// ==========================================================

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
}

// ==========================================================
// CONTEXTO
// ==========================================================

const CartContext = createContext<CartContextType | undefined>(
  undefined,
);

// ==========================================================
// PROVIDER
// ==========================================================

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);

  // ========================================================
  // AGREGAR PRODUCTO
  // ========================================================

  const addToCart = useCallback((item: CartItem) => {
    if (!item.id || item.quantity <= 0) {
      return;
    }

    setCart((previousCart) => {
      const existingItem = previousCart.find(
        (cartItem) => cartItem.id === item.id,
      );

      if (existingItem) {
        return previousCart.map((cartItem) =>
          cartItem.id === item.id
            ? {
                ...cartItem,
                quantity:
                  cartItem.quantity + item.quantity,
              }
            : cartItem,
        );
      }

      return [...previousCart, { ...item }];
    });
  }, []);

  // ========================================================
  // ELIMINAR PRODUCTO
  // ========================================================

  const removeFromCart = useCallback((id: string) => {
    if (!id) {
      return;
    }

    setCart((previousCart) =>
      previousCart.filter(
        (item) => item.id !== id,
      ),
    );
  }, []);

  // ========================================================
  // VACIAR CARRITO
  // ========================================================

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  // ========================================================
  // VALOR DEL CONTEXTO
  // ========================================================

  const value = useMemo<CartContextType>(
    () => ({
      cart,
      addToCart,
      removeFromCart,
      clearCart,
    }),
    [
      cart,
      addToCart,
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

// ==========================================================
// HOOK
// ==========================================================

export function useCart(): CartContextType {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart debe ser usado dentro de un CartProvider",
    );
  }

  return context;
}
```
