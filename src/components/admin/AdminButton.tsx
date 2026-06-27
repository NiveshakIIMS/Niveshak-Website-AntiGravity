"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AdminButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
    children?: React.ReactNode;
    variant?: "primary" | "secondary" | "danger" | "success" | "warning" | "ghost";
    size?: "sm" | "md" | "lg";
    isLoading?: boolean;
    icon?: React.ReactNode;
    glow?: boolean;
}

export default function AdminButton({
    children,
    className,
    variant = "primary",
    size = "md",
    isLoading = false,
    icon,
    glow = false,
    disabled,
    ...props
}: AdminButtonProps) {
    const baseStyles = "relative inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 outline-none select-none cursor-pointer overflow-hidden whitespace-nowrap active:scale-95";
    
    const sizeStyles = {
        sm: "px-3.5 py-1.5 text-xs gap-1.5 rounded-lg",
        md: "px-5 py-2.5 text-sm gap-2 rounded-xl",
        lg: "px-6 py-3 text-base gap-2.5 rounded-2xl"
    };

    const variantStyles = {
        // High contrast indigo/blue/violet gradient with smooth interactive hover shimmer
        primary: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/10 hover:shadow-lg hover:shadow-blue-500/25 border border-transparent",
        // Clean glassmorphic style with subtle border and fill transitions
        secondary: "bg-muted/40 hover:bg-muted/70 text-foreground border border-border hover:border-muted-foreground/30",
        // Sleek crimson to rose gradient for deletion/critical actions
        danger: "bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-500/10 hover:shadow-lg hover:shadow-red-500/25 border border-transparent",
        // Vibrant emerald to teal gradient for saving/success paths
        success: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/10 hover:shadow-lg hover:shadow-emerald-500/25 border border-transparent",
        // Warm amber gradient for warning/attention-seeking actions
        warning: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/10 hover:shadow-lg hover:shadow-amber-500/25 border border-transparent",
        // Minimalist transparent button
        ghost: "bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground border border-transparent"
    };

    return (
        <motion.button
            whileHover={!disabled && !isLoading ? { scale: 1.02, y: -1 } : {}}
            whileTap={!disabled && !isLoading ? { scale: 0.98, y: 0 } : {}}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            disabled={disabled || isLoading}
            className={cn(
                baseStyles,
                sizeStyles[size],
                variantStyles[variant],
                (disabled || isLoading) && "opacity-50 cursor-not-allowed transform-none hover:transform-none pointer-events-none",
                className
            )}
            {...props}
        >
            {/* Gloss hover shimmer effect for gradient buttons */}
            {variant !== "ghost" && variant !== "secondary" && (
                <div className="absolute inset-0 w-[200%] h-full bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full hover:animate-[shimmer_1.5s_infinite] pointer-events-none" />
            )}
            
            {isLoading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
            {!isLoading && icon && <span className="shrink-0">{icon}</span>}
            <span className="relative z-10 flex items-center gap-1.5">{children}</span>
            
            {/* Glow backing */}
            {glow && !disabled && (
                <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 opacity-20 blur-md group-hover:opacity-40 transition-opacity" />
            )}
        </motion.button>
    );
}
