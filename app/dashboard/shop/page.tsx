"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Search, ShoppingCart, Grid3X3, List, Filter, Heart, ReceiptText } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ProductCard } from "@/components/shop/product-card"
import { ProductDetail } from "@/components/shop/product-detail"
import { medicalProducts, type MedicalProduct } from "@/components/shop/medical-products"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCart } from "@/contexts/cart-context"
import { useWishlist } from "@/components/shop/wishlist-context"
import { toast } from "sonner"

export default function ShopPage() {
  const router = useRouter()
  const [view, setView] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedProduct, setSelectedProduct] = useState<MedicalProduct | null>(null)
  const { cartItems = [], addItem } = useCart()
  const { addToWishlist, removeFromWishlist, isInWishlist, wishlistCount } = useWishlist()

  const categories = [
    { value: "all", label: "All Products" },
    { value: "tablets", label: "Tablets" },
    { value: "creams", label: "Creams" },
    { value: "supplements", label: "Supplements" },
    { value: "equipment", label: "Equipment" },
    { value: "lotions", label: "Lotions" },
  ]

  const filteredProducts = medicalProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleAddToCart = (product: MedicalProduct) => {
    addItem({ ...product, id: product.id.toString() })
    toast.success("Added to cart", {
      description: `${product.name} has been added to your cart.`,
    })
  }

  const handleAddToWishlist = (product: MedicalProduct) => {
    const productId = product.id.toString()
    
    if (isInWishlist(productId)) {
      removeFromWishlist(productId)
      toast.success("Removed from wishlist", {
        description: `${product.name} has been removed from your wishlist.`,
      })
    } else {
      addToWishlist({
        id: productId,
        name: product.name,
        price: product.price,
        image: product.image,
        description: product.description,
      })
      toast.success("Added to wishlist", {
        description: `${product.name} has been added to your wishlist.`,
      })
    }
  }

  const handleShare = (product: MedicalProduct) => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: product.description,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success("Link copied", {
        description: "Product link copied to clipboard.",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Medical Shop</h1>
          <p className="text-muted-foreground">Browse our selection of medical products and supplies</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/orders")} className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4" />
            <span className="hidden sm:inline">My Orders</span>
          </Button>
          <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/wishlist")} className="relative">
            <Heart className="h-4 w-4" />
            {wishlistCount > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500">
                {wishlistCount}
              </Badge>
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={() => router.push("/dashboard/cart")} className="relative">
            <ShoppingCart className="h-4 w-4" />
            {cartItems.length > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center">
                {cartItems.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button
            variant={view === "grid" ? "default" : "outline"}
            size="icon"
            onClick={() => setView("grid")}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "default" : "outline"}
            size="icon"
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Products Grid/List */}
      <div className="rounded-lg border bg-card p-6">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No products found matching your search.</p>
          </div>
        ) : (
          <div className={
            view === "grid"
              ? "grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "flex flex-col gap-4"
          }>
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                view={view}
                onAddToCart={handleAddToCart}
                onAddToWishlist={handleAddToWishlist}
                onShare={handleShare}
                onClick={() => setSelectedProduct(product)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <ProductDetail
          product={selectedProduct}
          open={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}
    </div>
  )
}
