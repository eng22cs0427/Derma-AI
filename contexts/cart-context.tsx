"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

export interface CartProduct {
  id: string
  name: string
  price: number
  quantity: number
  image?: string
  description?: string
}

interface CartContextType {
  cartItems: CartProduct[]
  cartCount: number
  cartTotal: number
  addItem: (product: Omit<CartProduct, "quantity">, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  isInCart: (productId: string) => boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cartItems, setCartItems] = useState<CartProduct[]>([])

  // Load cart from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dermasense-cart")
      if (saved) {
        setCartItems(JSON.parse(saved))
      }
    } catch (error) {
      console.error("Error loading cart:", error)
    }
  }, [])

  // Save to localStorage whenever cart changes
  useEffect(() => {
    try {
      localStorage.setItem("dermasense-cart", JSON.stringify(cartItems))
    } catch (error) {
      console.error("Error saving cart:", error)
    }
  }, [cartItems])

  const addItem = (product: Omit<CartProduct, "quantity">, quantity: number = 1) => {
    setCartItems(prev => {
      const existingItem = prev.find(item => item.id === product.id)
      
      if (existingItem) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }
      
      return [...prev, { ...product, quantity }]
    })
  }

  const removeItem = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== productId))
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId)
      return
    }
    
    setCartItems(prev =>
      prev.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    )
  }

  const clearCart = () => {
    setCartItems([])
  }

  const isInCart = (productId: string) => {
    return cartItems.some(item => item.id === productId)
  }

  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0)
  const cartTotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0)

  const value = {
    cartItems,
    cartCount,
    cartTotal,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    isInCart,
  }

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  )
}


