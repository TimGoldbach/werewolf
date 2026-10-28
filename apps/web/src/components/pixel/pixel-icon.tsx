import * as React from 'react'

/**
 * Renders a character grid as a pixel-art SVG. Each cell = 1 pixel;
 * characters without a palette entry (e.g. '.') stay transparent.
 */
export interface PixelGrid {
  grid: string[]
  palette: Record<string, string>
}

export interface PixelIconProps extends Omit<React.SVGProps<SVGSVGElement>, 'children'> {
  grid: string[]
  palette: Record<string, string>
  size?: number
}

export function PixelIcon({ grid, palette, size = 20, className, ...rest }: PixelIconProps) {
  const height = grid.length
  const width = grid.reduce((m, row) => Math.max(m, row.length), 0)
  const rects: React.ReactNode[] = []

  grid.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const fill = palette[row[x]!]
      if (!fill) continue
      rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />)
    }
  })

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={size}
      height={size}
      shapeRendering="crispEdges"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {rects}
    </svg>
  )
}
