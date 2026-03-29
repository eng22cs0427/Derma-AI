"use client"

import { useEffect, useState } from "react"
import { useMedicalHistory, HistoryItem } from "@/contexts/MedicalHistoryContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Microscope, Pill, Clock, Activity, FileText } from "lucide-react"
import { Badge } from "@/components/ui/badge"

function HistoryIcon({ type }: { type: string }) {
  switch (type) {
    case "Appointment":
      return <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><Calendar className="h-5 w-5" /></div>;
    case "Medicine":
      return <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-600"><Pill className="h-5 w-5" /></div>;
    case "Analysis":
      return <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><Microscope className="h-5 w-5" /></div>;
    default:
      return <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600"><Activity className="h-5 w-5" /></div>;
  }
}

function HistoryBadge({ type }: { type: string }) {
  switch (type) {
    case "Appointment":
      return <Badge className="bg-blue-500">Appointment</Badge>
    case "Medicine":
      return <Badge className="bg-green-500">Medicine Ordered</Badge>
    case "Analysis":
      return <Badge className="bg-purple-500">AI Analysis</Badge>
    default:
      return <Badge variant="outline">{type}</Badge>
  }
}

export default function MedicalHistoryPage() {
  const { history, isLoading, refreshHistory } = useMedicalHistory()
  const [mounted, setMounted] = useState(false)

  // Wait until mounted on client to prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex h-[400px] w-full items-center justify-center">
        <Activity className="h-8 w-8 animate-pulse text-muted-foreground" />
      </div>
    )
  }

  // Ensure unique elements and handle loading state
  const validHistory = Array.isArray(history) ? history.filter(item => item && item.id) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Medical History</h1>
        <p className="text-muted-foreground">
          View your past appointments, skin analyses, and medicine orders.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">
          <Activity className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : validHistory.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <div className="rounded-full bg-muted p-4 mb-4">
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-medium">No history found</h3>
          <p className="text-muted-foreground mt-2 max-w-[500px]">
            You haven't had any appointments, analyses, or orders yet. 
            Once you use DermaAI's features, your history will automatically appear here.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {validHistory.map((item: HistoryItem) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row">
                <div className="flex items-start gap-4 p-6 sm:w-1/4 bg-muted/30 border-b sm:border-b-0 sm:border-r">
                  <HistoryIcon type={item.type} />
                  <div>
                    <HistoryBadge type={item.type} />
                    <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <time dateTime={item.date}>
                        {new Date(item.date).toLocaleDateString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })} (IST)
                      </time>
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 p-6">
                  <h4 className="text-lg font-semibold mb-2">{item.data}</h4>
                  
                  {item.details && (
                    <div className="text-sm text-muted-foreground">
                      {typeof item.details === 'string' ? (
                        <p>{item.details}</p>
                      ) : (
                        <div className="space-y-1">
                          {Object.entries(item.details).map(([key, value]) => {
                            if (key === 'source' || key === 'type') return null;
                            const formatKey = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
                            const displayValue = (() => {
                              if (key === 'items' && Array.isArray(value)) {
                                return value.map((i: any) => `${i.name || 'Clinical Product'} (Qty: ${i.quantity || 1})`).join(', ');
                              }
                              if (key === 'deliveryAddress' && value && typeof value === 'object') {
                                const addr = value as any;
                                return `${addr.address || ''}, ${addr.city || ''}`;
                              }
                              if (typeof value === 'object') return JSON.stringify(value);
                              return String(value);
                            })();

                            if (key === 'imageUrl' && typeof value === 'string') {
                              return (
                                <div key={key} className="mt-4 mb-2">
                                  <span className="font-medium text-foreground block mb-2">Analyzed Image:</span>
                                  <div className="relative h-32 w-32 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                                    <img src={value} alt="Skin Analysis" className="object-cover w-full h-full" />
                                  </div>
                                </div>
                              )
                            }

                            return (
                              <div key={key} className="flex gap-2">
                                <span className="font-medium text-foreground capitalize">{formatKey}:</span>
                                <span>{displayValue}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
