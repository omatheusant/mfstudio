import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
})

/** Formats a number as "R$ 120,00". */
export function formatCurrency(value: number) {
  return currencyFormatter.format(value)
}

/**
 * Capitalizes only the first letter — unlike the CSS `capitalize` class,
 * which title-cases every word and mangles `toLocaleDateString` output
 * like "quarta-feira, 18 de novembro" into "Quarta-Feira, 18 De Novembro".
 */
export function capitalizeFirst(value: string) {
  return value.length > 0 ? value[0].toUpperCase() + value.slice(1) : value
}

/** Turns "MF Studio" into "mf-studio". Mirrors the DB check constraint on organizations.slug. */
export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
