"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// Chart context
const ChartContext = React.createContext<{
  config: ChartConfig
} | null>(null)

const useChart = () => {
  const context = React.useContext(ChartContext)
  if (!context) {
    throw new Error("useChart must be used within a ChartContainer")
  }
  return context
}

// Chart config type
export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode
    icon?: React.ComponentType<{ className?: string }>
    color?: string
  }
}

// Chart container
export interface ChartContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  config: ChartConfig
  children: React.ReactNode
  className?: string
}

const ChartContainer = React.forwardRef<HTMLDivElement, ChartContainerProps>(
  ({ config, className, children, ...props }, ref) => {
    return (
      <ChartContext.Provider value={{ config }}>
        <div
          ref={ref}
          className={cn("flex w-full min-w-0 flex-col space-y-2 overflow-hidden", className)}
          {...props}
        >
          {children}
        </div>
      </ChartContext.Provider>
    )
  }
)
ChartContainer.displayName = "ChartContainer"

// Chart legend
export interface ChartLegendProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
}

const ChartLegend = React.forwardRef<HTMLDivElement, ChartLegendProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-wrap gap-4", className)}
        {...props}
      >
        {children}
      </div>
    )
  }
)
ChartLegend.displayName = "ChartLegend"

// Chart legend content
export interface ChartLegendContentProps extends React.HTMLAttributes<HTMLDivElement> {
  hideIcon?: boolean
  hideLabel?: boolean
  hideValue?: boolean
  children?: React.ReactNode
  className?: string
}

const ChartLegendContent = React.forwardRef<
  HTMLDivElement,
  ChartLegendContentProps
>(({ hideIcon, hideLabel, hideValue, className, children, ...props }, ref) => {
  const { config } = useChart()

  if (children) {
    return (
      <div ref={ref} className={className} {...props}>
        {children}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      className={cn("flex flex-wrap gap-4", className)}
      {...props}
    >
      {Object.entries(config).map(([key, item]) => {
        if (key === "x" || key === "y") return null

        const Icon = item.icon

        return (
          <div key={key} className="flex items-center gap-1.5">
            {!hideIcon && Icon && <Icon className="h-3 w-3" />}
            {!hideLabel && (
              <span className="text-xs text-muted-foreground">
                {item.label}
              </span>
            )}
            {!hideValue && (
              <span className="text-xs font-medium">
                {key}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
})
ChartLegendContent.displayName = "ChartLegendContent"

// Chart tooltip
export interface ChartTooltipProps {
  children: React.ReactNode
}

const ChartTooltip = ({ children }: ChartTooltipProps) => {
  return <>{children}</>
}

// Chart tooltip content
export interface ChartTooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean
  payload?: Array<{
    dataKey?: string
    name?: string
    value?: number | string
    color?: string
  }>
  label?: string
  labelFormatter?: (label: string, payload: Array<unknown>) => React.ReactNode
  formatter?: (value: unknown, name: string, item: unknown, index: number) => React.ReactNode
  indicator?: "line" | "dot" | "dashed" | "none"
  className?: string
}

const ChartTooltipContent = React.forwardRef<
  HTMLDivElement,
  ChartTooltipContentProps
>(
  (
    {
      active,
      payload,
      label,
      labelFormatter,
      formatter,
      indicator = "dot",
      className,
      ...props
    },
    ref
  ) => {
    const { config } = useChart()

    if (!active || !payload?.length) return null

    const indicatorElement = {
      line: <div className="h-px w-8 bg-gray-300 dark:bg-gray-600" />,
      dot: <div className="h-2 w-2 rounded-full bg-current" />,
      dashed: <div className="h-px w-8 bg-gray-300 dark:bg-gray-600 bg-dashed" />,
      none: null,
    }[indicator]

    return (
      <div
        ref={ref}
        className={cn(
          "flex min-w-[160px] flex-col gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-md",
          className
        )}
        {...props}
      >
        {label && (
          <div className="grid gap-1.5">
            <div className="flex items-center gap-2.5">
              {indicatorElement}
              <span className="text-sm font-medium leading-none tracking-tight text-gray-900 dark:text-gray-100">
                {labelFormatter
                  ? labelFormatter(label, payload)
                  : label}
              </span>
            </div>
          </div>
        )}
        <div className="grid gap-1.5">
          {payload.map((item, index) => {
            const key = item.dataKey || item.name || `item-${index}`
            const configItem = config[key]
            const indicator = indicatorElement

            return (
              <div key={key} className="flex items-center gap-2.5">
                {indicator}
                <div
                  className="flex flex-1 items-center justify-between gap-2.5"
                  style={{
                    color: configItem?.color || item.color,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    {configItem?.icon && (
                      <configItem.icon className="h-3 w-3" />
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {configItem?.label || item.name}
                    </span>
                  </div>
                  {formatter ? (
                    formatter(item.value, item.name || '', item, index)
                  ) : (
                    <span className="text-xs font-medium tabular-nums text-gray-900 dark:text-gray-100">
                      {item.value}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }
)
ChartTooltipContent.displayName = "ChartTooltipContent"

export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  useChart,
}
