"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, X, Filter, Clock } from "lucide-react";

interface SearchBarProps {
  onSearch: (searchTerm: string) => void;
  placeholder?: string;
  resultCount?: number;
  isLoading?: boolean;
  suggestions?: string[];
  className?: string;
}

export function SearchBar({
  onSearch,
  placeholder = "Buscar productos...",
  resultCount,
  isLoading = false,
  suggestions = [],
  className = "",
}: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Cargar búsquedas recientes del localStorage al montar
  useEffect(() => {
    const saved = localStorage.getItem("catalog-recent-searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (error) {
        console.error("Error loading recent searches:", error);
      }
    }
  }, []);

  // Debounce para búsqueda automática
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      onSearch(searchTerm);
    }, 300); // 300ms de retraso

    return () => clearTimeout(timeoutId);
  }, [searchTerm, onSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSuggestions(value.length > 0);
  };

  const handleSearch = (term: string) => {
    if (term.trim()) {
      // Agregar a búsquedas recientes
      const newRecentSearches = [
        term,
        ...recentSearches.filter((item) => item !== term),
      ].slice(0, 5); // Máximo 5 búsquedas recientes

      setRecentSearches(newRecentSearches);
      localStorage.setItem(
        "catalog-recent-searches",
        JSON.stringify(newRecentSearches)
      );
    }

    setSearchTerm(term);
    setShowSuggestions(false);
    onSearch(term);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSearch(suggestion);
  };

  const clearSearch = () => {
    setSearchTerm("");
    setShowSuggestions(false);
    onSearch("");
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem("catalog-recent-searches");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch(searchTerm);
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Input principal */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() =>
            setShowSuggestions(
              searchTerm.length > 0 || recentSearches.length > 0
            )
          }
          className="pl-10 pr-20"
          disabled={isLoading}
        />

        {/* Indicador de carga y botón limpiar */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isLoading && (
            <div className="animate-spin h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full" />
          )}

          {searchTerm && !isLoading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="h-6 w-6 p-0 hover:bg-transparent"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Contador de resultados */}
      {searchTerm && resultCount !== undefined && (
        <div className="mt-2 flex items-center gap-2">
          <Filter className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {resultCount === 0
              ? "No se encontraron productos"
              : `${resultCount} producto${resultCount === 1 ? "" : "s"} encontrado${resultCount === 1 ? "" : "s"}`}
          </span>
          {searchTerm && (
            <Badge variant="secondary" className="text-xs">
              "{searchTerm}"
            </Badge>
          )}
        </div>
      )}

      {/* Dropdown de sugerencias */}
      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
          {/* Sugerencias automáticas */}
          {suggestions.length > 0 && (
            <div className="p-2">
              <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Search className="h-3 w-3" />
                Sugerencias
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-sm transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {/* Separador si hay ambos tipos */}
          {suggestions.length > 0 && recentSearches.length > 0 && (
            <div className="border-t" />
          )}

          {/* Búsquedas recientes */}
          {recentSearches.length > 0 && (
            <div className="p-2">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Búsquedas recientes
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearRecentSearches}
                  className="h-5 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Limpiar
                </Button>
              </div>
              {recentSearches.map((recent, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(recent)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-sm transition-colors flex items-center gap-2"
                >
                  <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  {recent}
                </button>
              ))}
            </div>
          )}

          {/* Mensaje si no hay sugerencias */}
          {suggestions.length === 0 &&
            recentSearches.length === 0 &&
            searchTerm && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Escribe para buscar productos
              </div>
            )}
        </div>
      )}

      {/* Overlay para cerrar sugerencias */}
      {showSuggestions && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowSuggestions(false)}
        />
      )}
    </div>
  );
}
