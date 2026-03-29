"use client"

import { useEffect, useState } from "react"
import { ShoppingBag, Package, Clock, MapPin, CreditCard, ChevronDown, ChevronUp, Loader2, ReceiptText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  image?: string
}

interface DeliveryAddress {
  name: string
  address: string
  city: string
  state: string
  pincode: string
  phone: string
}

interface Order {
  id: string
  order_number: string
  items: OrderItem[]
  subtotal: number
  tax: number
  shipping_cost: number
  total_amount: number
  payment_method: string
  payment_status: string
  order_status: string
  delivery_address: DeliveryAddress
  created_at: string
}

const statusColor: Record<string, string> = {
  Confirmed: "bg-green-500",
  Shipped: "bg-blue-500",
  Delivered: "bg-emerald-600",
  Cancelled: "bg-red-500",
  Processing: "bg-yellow-500",
}

const paymentStatusColor: Record<string, string> = {
  Paid: "bg-green-500",
  Pending: "bg-orange-400",
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/orders")
      .then(r => r.json())
      .then(data => setOrders(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const toggle = (id: string) => setExpandedId(prev => (prev === id ? null : id))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Orders</h1>
        <p className="text-muted-foreground">View all your medical shop orders and their status</p>
      </div>

      {orders.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <div className="rounded-full bg-muted p-4 mb-4">
            <ReceiptText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium">No orders yet</h3>
          <p className="text-muted-foreground mt-2 max-w-md">
            You haven't placed any orders yet. Browse the medical shop to find skin care products.
          </p>
          <Button className="mt-4" onClick={() => (window.location.href = "/dashboard/shop")}>
            <ShoppingBag className="mr-2 h-4 w-4" /> Browse Medical Shop
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isExpanded = expandedId === order.id
            const items: OrderItem[] = typeof order.items === "string" ? JSON.parse(order.items) : order.items
            const address: DeliveryAddress = typeof order.delivery_address === "string"
              ? JSON.parse(order.delivery_address)
              : order.delivery_address

            return (
              <Card key={order.id} className="overflow-hidden hover:shadow-md transition-shadow">
                {/* Header row */}
                <CardHeader className="pb-0">
                  <div className="flex flex-wrap gap-3 items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold">{order.order_number}</CardTitle>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          {new Date(order.created_at).toLocaleDateString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })} (IST)
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={statusColor[order.order_status] || "bg-gray-500"}>
                        {order.order_status}
                      </Badge>
                      <Badge className={paymentStatusColor[order.payment_status] || "bg-gray-400"}>
                        {order.payment_status}
                      </Badge>
                      <span className="font-bold text-lg">₹{Number(order.total_amount).toFixed(2)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggle(order.id)}
                        className="ml-1"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        {isExpanded ? "Hide" : "View Details"}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {/* Summary line */}
                <CardContent className="pt-3 pb-4">
                  <p className="text-sm text-muted-foreground">
                    {items?.length ?? 0} item(s) · {order.payment_method} · Subtotal ₹{Number(order.subtotal).toFixed(2)}
                  </p>

                  {/* Expanded detail panel */}
                  {isExpanded && (
                    <div className="mt-4 space-y-4 border-t pt-4">
                      {/* Items */}
                      <div>
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                          <ShoppingBag className="h-4 w-4" /> Order Items
                        </h4>
                        <div className="divide-y rounded-lg border overflow-hidden">
                          {items?.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-muted/20">
                              <div>
                                <p className="font-medium text-sm">{item.name}</p>
                                <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                              </div>
                              <p className="font-semibold text-sm">₹{(item.price * item.quantity).toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Price breakdown */}
                      <div className="rounded-lg border p-3 space-y-1.5 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                          <span>Subtotal</span><span>₹{Number(order.subtotal).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Tax (GST 18%)</span><span>₹{Number(order.tax).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                          <span>Shipping</span><span>₹{Number(order.shipping_cost).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold border-t pt-2 mt-1">
                          <span>Total</span><span>₹{Number(order.total_amount).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Delivery + Payment */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {address && (
                          <div className="rounded-lg border p-3 text-sm space-y-1">
                            <h4 className="font-semibold flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" /> Delivery Address
                            </h4>
                            <p className="font-medium">{address.name}</p>
                            <p className="text-muted-foreground">{address.address}</p>
                            <p className="text-muted-foreground">{address.city}, {address.state} - {address.pincode}</p>
                            <p className="text-muted-foreground">{address.phone}</p>
                          </div>
                        )}
                        <div className="rounded-lg border p-3 text-sm space-y-1">
                          <h4 className="font-semibold flex items-center gap-1">
                            <CreditCard className="h-3.5 w-3.5" /> Payment Info
                          </h4>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Method</span>
                            <span className="font-medium">{order.payment_method}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Status</span>
                            <Badge className={`text-xs ${paymentStatusColor[order.payment_status] || "bg-gray-400"}`}>
                              {order.payment_status}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Order Status</span>
                            <Badge className={`text-xs ${statusColor[order.order_status] || "bg-gray-500"}`}>
                              {order.order_status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
