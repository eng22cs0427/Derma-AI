"use client"

import Image from "next/image"
import { Heart, Share, Star } from "lucide-react"
// import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { type MedicalProduct } from "./medical-products"
import { useWishlist } from "./wishlist-context"

interface ProductCardProps {
  product: MedicalProduct
  view: "grid" | "list"
  onAddToCart: (product: MedicalProduct) => void
  onAddToWishlist: (product: MedicalProduct) => void
  onShare: (product: MedicalProduct) => void
  onClick: () => void
}

export function ProductCard({ product, view, onAddToCart, onAddToWishlist, onShare, onClick }: ProductCardProps) {
  const { isInWishlist } = useWishlist()
  const inWishlist = isInWishlist(product.id.toString())

  return (
    <div className={cn(
      "group relative rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-emerald-200 flex flex-col",
      view === "list" && "sm:flex-row"
    )}>
      {/* Discount Badge */}
      {product.discount && (
        <Badge className="absolute top-2 left-2 z-10 bg-red-500 hover:bg-red-600 text-white">
          {product.discount}% OFF
        </Badge>
      )}

      {/* Prescription Badge */}
      {product.requiresPrescription && (
        <Badge variant="secondary" className="absolute top-2 right-2 z-10 bg-blue-500 text-white hover:bg-blue-600">
          Rx Required
        </Badge>
      )}

      {/* Image */}
      <div className={cn(
        "relative overflow-hidden rounded-t-lg sm:rounded-l-lg sm:rounded-tr-none cursor-pointer flex-shrink-0",
        view === "list" ? "w-full h-48 sm:w-48 sm:h-auto sm:aspect-square" : "aspect-square w-full"
      )} onClick={onClick}>
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover transition-transform group-hover:scale-105"
        />
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-3">
        {product.brand && (
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            {product.brand}
          </p>
        )}
        
        <h3 className="font-semibold line-clamp-2 text-sm cursor-pointer hover:text-emerald-600 transition-colors" onClick={onClick}>
          {product.name}
        </h3>
        
        <div className="flex items-center gap-1">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "w-3 h-3",
                  i < Math.floor(product.rating) 
                    ? "text-yellow-400 fill-yellow-400" 
                    : "text-gray-300"
                )}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">
            ({product.rating.toFixed(1)})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-emerald-700">₹{product.price.toFixed(2)}</span>
          {product.discount && (
            <span className="text-sm text-muted-foreground line-through">
              ₹{(product.price / (1 - product.discount / 100)).toFixed(2)}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap sm:flex-nowrap gap-2 pt-2">
          <Button 
            size="sm" 
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
            onClick={() => onAddToCart(product)}
            disabled={!product.inStock}
          >
            {product.inStock ? "Add to Cart" : "Out of Stock"}
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className={cn(
              "transition-colors",
              inWishlist 
                ? "border-red-300 bg-red-50 hover:bg-red-100" 
                : "border-red-200 hover:bg-red-50 hover:border-red-300"
            )}
            onClick={() => onAddToWishlist(product)}
            title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
          >
            <Heart className={cn(
              "h-4 w-4 transition-colors",
              inWishlist ? "text-red-500 fill-red-500" : "text-red-500"
            )} />
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            className="border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-colors"
            onClick={() => onShare(product)}
          >
            <Share className="h-4 w-4 text-blue-500" />
          </Button>
        </div>
      </div>
    </div>
  )
}

