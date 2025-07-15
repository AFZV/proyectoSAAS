// app/reportes/(components)/ReporteCard/ReporteCard.tsx
"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, FileText } from "lucide-react";
import { ReporteCardProps } from "./ReporteCard.types";

export function ReporteCard({ data, onSelect }: ReporteCardProps) {
  const { id, title, description, icon: Icon, color, options } = data;

  return (
    <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02] border-0 shadow-md h-full flex flex-col">
      <CardHeader className={`${color} text-white rounded-t-lg flex-shrink-0`}>
        <CardTitle className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold truncate">{title}</h3>
            <p className="text-sm opacity-90 font-normal line-clamp-2">
              {description}
            </p>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-4 sm:p-6 flex-1 flex flex-col">
        <div className="space-y-2 sm:space-y-3 flex-1">
          {options.map((option) => (
            <Button
              key={option.id}
              variant="ghost"
              className="w-full justify-between h-auto p-3 sm:p-4 hover:bg-gray-50 border border-gray-100 hover:border-gray-200 text-left"
              onClick={() => onSelect(id, option.id)}
            >
              <div className="text-left flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate text-sm sm:text-base">
                  {option.label}
                </div>
                {option.description && (
                  <div className="text-xs sm:text-sm text-gray-500 mt-1 line-clamp-2">
                    {option.description}
                  </div>
                )}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
            </Button>
          ))}
        </div>

        {/* Eliminamos el footer de formatos para evitar problemas de espacio */}
      </CardContent>
    </Card>
  );
}
