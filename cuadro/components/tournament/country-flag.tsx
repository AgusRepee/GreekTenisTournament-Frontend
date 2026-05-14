"use client"

interface CountryFlagProps {
  countryCode: string
  className?: string
}

const flagEmojis: Record<string, string> = {
  ES: "🇪🇸",
  GB: "🇬🇧",
  RU: "🇷🇺",
  FR: "🇫🇷",
  DE: "🇩🇪",
  US: "🇺🇸",
  IT: "🇮🇹",
  AU: "🇦🇺",
  CA: "🇨🇦",
  AR: "🇦🇷",
  BR: "🇧🇷",
  JP: "🇯🇵",
  CN: "🇨🇳",
  KR: "🇰🇷",
  CH: "🇨🇭",
  AT: "🇦🇹",
  BE: "🇧🇪",
  NL: "🇳🇱",
  PL: "🇵🇱",
  CZ: "🇨🇿",
  GR: "🇬🇷",
  RS: "🇷🇸",
  HR: "🇭🇷",
  DK: "🇩🇰",
  NO: "🇳🇴",
  SE: "🇸🇪",
  FI: "🇫🇮",
  PT: "🇵🇹",
  CL: "🇨🇱",
  CO: "🇨🇴",
}

export function CountryFlag({ countryCode, className = "" }: CountryFlagProps) {
  const flag = flagEmojis[countryCode.toUpperCase()] || "🏳️"
  
  return (
    <span className={`text-sm ${className}`} role="img" aria-label={`${countryCode} flag`}>
      {flag}
    </span>
  )
}
