import { useCallback } from 'react'
import { MUSIC_HISTORY, ALL_GENRES, CITIES } from '@/components/atlas/data'
import type { HistoricalEvent } from '@/components/atlas/types'

// City name aliases for common abbreviations
const CITY_ALIASES: Record<string, string> = {
  'la': 'Los Angeles',
  'nyc': 'New York City',
  'ny': 'New York City',
  'new york': 'New York City',
  'nola': 'New Orleans',
  'rio': 'Rio de Janeiro',
  'sf': 'San Francisco',
  'san fran': 'San Francisco',
  'frisco': 'San Francisco',
  'philly': 'Philadelphia',
  'dc': 'Washington D.C.',
  'slc': 'Salt Lake City',
  'kc': 'Kansas City',
  'vegas': 'Las Vegas',
  'detroit': 'Detroit',
  'memphis': 'Memphis',
  'nashville': 'Nashville',
  'chicago': 'Chicago',
  'seattle': 'Seattle',
  'atlanta': 'Atlanta',
  'london': 'London',
  'liverpool': 'Liverpool',
  'berlin': 'Berlin',
  'paris': 'Paris',
  'vienna': 'Vienna',
  'kingston': 'Kingston',
  'havana': 'Havana',
  'lagos': 'Lagos',
  'mumbai': 'Mumbai',
  'tokyo': 'Tokyo',
}

export interface ParsedQuery {
  year?: number
  decade?: number
  city?: { name: string; lat: number; lng: number }
  genres: string[]
}

export interface SearchResult {
  results: HistoricalEvent[]
  parsed: ParsedQuery
}

function parseDecadeOrYear(query: string): { year?: number; decade?: number } {
  // Full decade: "1960s"
  const fullDecade = query.match(/\b((?:19|20)\d0)s\b/i)
  if (fullDecade) {
    const decade = parseInt(fullDecade[1], 10)
    return { decade, year: decade + 5 }
  }

  // Short decade: "60s" or "90s"
  const shortDecade = query.match(/\b(\d0)s\b/i)
  if (shortDecade) {
    const num = parseInt(shortDecade[1], 10)
    const decade = num >= 0 && num <= 25 ? 2000 + num : 1900 + num
    return { decade, year: decade + 5 }
  }

  // Specific year: "1965" or "2010"
  const specificYear = query.match(/\b((?:19|20)\d{2})\b/)
  if (specificYear) {
    const year = parseInt(specificYear[1], 10)
    const decade = Math.floor(year / 10) * 10
    return { year, decade }
  }

  return {}
}

function parseCity(query: string): { name: string; lat: number; lng: number } | undefined {
  const lower = query.toLowerCase()

  // Check aliases first (handles "LA", "NYC", etc.)
  for (const [alias, cityName] of Object.entries(CITY_ALIASES)) {
    const pattern = alias.length <= 3
      ? new RegExp(`\\b${alias}\\b`, 'i')
      : new RegExp(alias, 'i')

    if (pattern.test(lower)) {
      const city = CITIES.find((c) => c.name === cityName)
      if (city) {
        const coords = city.coordinates as [number, number]
        return { name: city.name, lat: coords[0], lng: coords[1] }
      }
    }
  }

  // Check full city names from CITIES
  for (const city of CITIES) {
    if (lower.includes(city.name.toLowerCase())) {
      const coords = city.coordinates as [number, number]
      return { name: city.name, lat: coords[0], lng: coords[1] }
    }
  }

  // Also match against event locations
  for (const event of MUSIC_HISTORY) {
    if (lower.includes(event.location.city.toLowerCase())) {
      return { name: event.location.city, lat: event.location.lat, lng: event.location.lng }
    }
  }

  return undefined
}

function parseGenres(query: string): string[] {
  const lower = query.toLowerCase()
  const matched: string[] = []

  // Sort genres by length descending so multi-word genres match first
  const sorted = [...ALL_GENRES].sort((a, b) => b.length - a.length)

  for (const genre of sorted) {
    if (lower.includes(genre.toLowerCase())) {
      matched.push(genre)
    }
  }

  return matched
}

function filterEvents(parsed: ParsedQuery, query: string): HistoricalEvent[] {
  const hasCriteria = parsed.decade != null || parsed.city != null || parsed.genres.length > 0
  const lowerQuery = query.toLowerCase()

  if (!hasCriteria) {
    // No structured criteria — fall back to full-text search
    return MUSIC_HISTORY.filter((event) => {
      const searchable = [
        event.title,
        event.description,
        ...event.tags,
        ...event.genre,
        event.location.city,
        event.location.country,
      ].join(' ').toLowerCase()
      return lowerQuery.split(/\s+/).some((token) => token.length > 2 && searchable.includes(token))
    })
  }

  // Strict AND filter
  let results = MUSIC_HISTORY.filter((event) => {
    if (parsed.decade != null) {
      const eventDecade = Math.floor(event.year / 10) * 10
      if (eventDecade !== parsed.decade) return false
    }
    if (parsed.city != null) {
      if (event.location.city.toLowerCase() !== parsed.city.name.toLowerCase()) return false
    }
    if (parsed.genres.length > 0) {
      const eventGenresLower = event.genre.map((g) => g.toLowerCase())
      if (!parsed.genres.some((g) => eventGenresLower.includes(g.toLowerCase()))) return false
    }
    return true
  })

  // Fallback: relax to OR, rank by match count
  if (results.length === 0) {
    const scored = MUSIC_HISTORY.map((event) => {
      let score = 0
      const eventDecade = Math.floor(event.year / 10) * 10
      if (parsed.decade != null && eventDecade === parsed.decade) score += 2
      if (parsed.city != null && event.location.city.toLowerCase() === parsed.city.name.toLowerCase()) score += 3
      if (parsed.genres.length > 0) {
        const eventGenresLower = event.genre.map((g) => g.toLowerCase())
        if (parsed.genres.some((g) => eventGenresLower.includes(g.toLowerCase()))) score += 2
      }
      const tags = event.tags.join(' ').toLowerCase()
      lowerQuery.split(/\s+/).forEach((token) => {
        if (token.length > 2 && tags.includes(token)) score += 1
      })
      return { event, score }
    })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)

    results = scored.map(({ event }) => event)
  }

  return results
}

export function useMusicSearch() {
  const search = useCallback((query: string): SearchResult => {
    if (!query.trim()) {
      return { results: [], parsed: { genres: [] } }
    }

    const timeInfo = parseDecadeOrYear(query)
    const city = parseCity(query)
    const genres = parseGenres(query)

    const parsed: ParsedQuery = {
      ...timeInfo,
      city,
      genres,
    }

    const results = filterEvents(parsed, query)

    return { results, parsed }
  }, [])

  return search
}
