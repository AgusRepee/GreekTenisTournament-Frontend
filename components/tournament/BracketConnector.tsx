import React from 'react';
import { getLeaguePublicTournamentTheme } from '../../src/lib/leagueColors';

interface BracketConnectorProps {
  className?: string;
  /** 2 = cuartos→semis (4 entradas, 2 salidas), 1 = semis→final (2 entradas, 1 salida) */
  variant?: 1 | 2;
  /** Clases del color de trazo (p. ej. `text-sky-500/55`); por defecto acento Liga 3. */
  strokeClassName?: string;
}

const STROKE_W = 1.35;

/**
 * Líneas con esquinas redondeadas (estilo cuadro profesional).
 * Cada rama: horizontal desde el partido → curva → vertical hacia el punto de unión → horizontal hacia la siguiente ronda.
 */
const DEFAULT_STROKE = getLeaguePublicTournamentTheme(3).connectorStroke;

export function BracketConnector({ className = '', variant = 2, strokeClassName }: BracketConnectorProps) {
  const stroke = strokeClassName ?? DEFAULT_STROKE;
  if (variant === 1) {
    // Semifinales → Final: dos entradas (centro bloque superior ~25%, inferior ~75%), salida al 50%
    const paths = [
      // Desde arriba (centro filas semi 1)
      'M 0 25 L 7 25 Q 11 25 11 29 L 11 46 Q 11 50 15 50 L 36 50',
      // Desde abajo (centro filas semi 2)
      'M 0 75 L 7 75 Q 11 75 11 71 L 11 54 Q 11 50 15 50',
    ];
    return (
      <div
        className={`hidden md:flex items-stretch shrink-0 self-stretch w-full min-w-[28px] max-w-[36px] ${className}`}
        aria-hidden
      >
        <svg className={`h-full min-h-[200px] w-full ${stroke}`} preserveAspectRatio="none" viewBox="0 0 36 100">
          {paths.map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE_W}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      </div>
    );
  }

  // Cuartos → Semis: pares en 12.5/37.5 → unión 25%; 62.5/87.5 → unión 75%
  const paths = [
    'M 0 12.5 L 7 12.5 Q 11 12.5 11 16.5 L 11 21 Q 11 25 15 25 L 36 25',
    'M 0 37.5 L 7 37.5 Q 11 37.5 11 33.5 L 11 29 Q 11 25 15 25',
    'M 0 62.5 L 7 62.5 Q 11 62.5 11 66.5 L 11 71 Q 11 75 15 75 L 36 75',
    'M 0 87.5 L 7 87.5 Q 11 87.5 11 83.5 L 11 79 Q 11 75 15 75',
  ];

  return (
    <div
      className={`hidden md:flex items-stretch shrink-0 self-stretch w-full min-w-[28px] max-w-[36px] ${className}`}
      aria-hidden
    >
      <svg className={`h-full min-h-[200px] w-full ${stroke}`} preserveAspectRatio="none" viewBox="0 0 36 100">
        {paths.map((d, i) => (
          <path
            key={i}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth={STROKE_W}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  );
}
