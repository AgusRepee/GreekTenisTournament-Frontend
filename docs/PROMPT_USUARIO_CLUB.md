# Plantilla para cargar resultados (club)

Texto que pueden copiar socios o administradores en **WhatsApp**, **mail** o **formulario**. Quien carga en el sistema transcribe esto al JSON descrito en **`RESULTADOS_AUTOMATION.md`**.

---

## Formato de una línea (recomendado)

```
Liga [N] · Grupo [letra] · Fecha [número]: [Jugador A] vs [Jugador B] — [marcador]
```

**Ejemplo**

```
Liga 4 · Grupo A · Fecha 2: Chantada M. vs Beitia J. — 6-4 6-2
```

---

## Marcadores válidos (ejemplos)

- Dos sets: `6-4 6-3`
- Tres sets con tie-break de set: `7-6(5) 6-4`
- Tercer set en match tie-break: `6-4 4-6 10-7`

---

## Casos especiales

- **Walkover (WO):** indicar explícitamente quién ganó por WO (el encargado lo registra con el estado correcto en el sistema).
- **Retiro (RET):** ejemplo de marcador con retiro: primer set cerrado y retiro — coordinar con el club el texto exacto que usarán (el motor acepta variantes `RET` documentadas en `TENNIS_ENGINE_SPEC.md`).

---

## Evitar

- Sets imposibles sin tie-break: `6-5` (como set final cerrado).
- Separadores raros en el marcador si el club no los acordó (usar espacios o comas como en los ejemplos del spec).
- Apodos distintos al nombre del fixture (debe coincidir con la lista del grupo).

---

## Objetivo

Con datos consistentes, el motor puede calcular tablas y estadísticas al cargarse en el JSON del torneo.
