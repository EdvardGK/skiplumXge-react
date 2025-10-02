/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      borderRadius: {
        'lg': 'var(--radius)',
        'md': 'calc(var(--radius) - 2px)',
        'sm': 'calc(var(--radius) - 4px)',
      },
      colors: {
        /* === SEMANTIC COLOR SYSTEM === */

        // Base surfaces
        background: {
          DEFAULT: 'var(--background)',
          elevated: 'var(--background-elevated)',
          subtle: 'var(--background-subtle)',
        },
        foreground: 'var(--foreground)',

        // Cards & containers
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
          border: 'var(--card-border)',
          hover: 'var(--card-hover)',
        },

        // Glass morphism
        glass: {
          bg: 'var(--glass-bg)',
          border: 'var(--glass-border)',
        },

        // Popovers & modals
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        modal: {
          overlay: 'var(--modal-overlay)',
        },

        // Primary brand colors
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          foreground: 'var(--primary-foreground)',
          muted: 'var(--primary-muted)',
        },

        // Secondary colors
        secondary: {
          DEFAULT: 'var(--secondary)',
          hover: 'var(--secondary-hover)',
          foreground: 'var(--secondary-foreground)',
        },

        // Accent colors
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          foreground: 'var(--accent-foreground)',
          muted: 'var(--accent-muted)',
        },

        // Success/Error/Warning
        success: {
          DEFAULT: 'var(--success)',
          foreground: 'var(--success-foreground)',
          muted: 'var(--success-muted)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          hover: 'var(--destructive-hover)',
          foreground: 'var(--destructive-foreground)',
          muted: 'var(--destructive-muted)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          foreground: 'var(--warning-foreground)',
          muted: 'var(--warning-muted)',
        },

        // Text hierarchy
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          muted: 'var(--text-muted)',
          disabled: 'var(--text-disabled)',
        },

        // Borders & dividers
        border: {
          DEFAULT: 'var(--border)',
          subtle: 'var(--border-subtle)',
          strong: 'var(--border-strong)',
        },
        divider: 'var(--divider)',

        // Inputs & forms
        input: {
          DEFAULT: 'var(--input)',
          border: 'var(--input-border)',
          'border-hover': 'var(--input-border-hover)',
          'border-focus': 'var(--input-border-focus)',
          foreground: 'var(--input-foreground)',
          placeholder: 'var(--input-placeholder)',
          disabled: 'var(--input-disabled)',
        },

        // Buttons
        button: {
          primary: {
            bg: 'var(--button-primary-bg)',
            hover: 'var(--button-primary-hover)',
            active: 'var(--button-primary-active)',
            text: 'var(--button-primary-text)',
          },
          secondary: {
            bg: 'var(--button-secondary-bg)',
            hover: 'var(--button-secondary-hover)',
            active: 'var(--button-secondary-active)',
            text: 'var(--button-secondary-text)',
          },
          ghost: {
            hover: 'var(--button-ghost-hover)',
            active: 'var(--button-ghost-active)',
          },
          outline: {
            border: 'var(--button-outline-border)',
            'hover-bg': 'var(--button-outline-hover-bg)',
          },
        },

        // Focus & selection
        ring: {
          DEFAULT: 'var(--ring)',
          offset: 'var(--ring-offset)',
        },
        selection: {
          bg: 'var(--selection-bg)',
          text: 'var(--selection-text)',
        },

        // Muted states
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },

        // Charts & data visualization
        chart: {
          '1': 'var(--chart-1)',
          '2': 'var(--chart-2)',
          '3': 'var(--chart-3)',
          '4': 'var(--chart-4)',
          '5': 'var(--chart-5)',
          '6': 'var(--chart-6)',
          grid: 'var(--chart-grid)',
          axis: 'var(--chart-axis)',
          label: 'var(--chart-label)',
        },

        // 3D visualization & polygons
        polygon: {
          fill: 'var(--polygon-fill)',
          stroke: 'var(--polygon-stroke)',
          'hover-fill': 'var(--polygon-hover-fill)',
          'selected-fill': 'var(--polygon-selected-fill)',
          'selected-stroke': 'var(--polygon-selected-stroke)',
        },
        mesh: {
          ambient: 'var(--mesh-ambient)',
          directional: 'var(--mesh-directional)',
        },

        // Map components
        map: {
          base: 'var(--map-base)',
          water: 'var(--map-water)',
          land: 'var(--map-land)',
          border: 'var(--map-border)',
          label: 'var(--map-label)',
          marker: 'var(--map-marker)',
          'marker-hover': 'var(--map-marker-hover)',
        },

        // Sidebar
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: 'var(--sidebar-foreground)',
          primary: 'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent: 'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)',
        },

        // Northern Lights / Aurora theme
        aurora: {
          green: 'var(--aurora-green)',
          cyan: 'var(--aurora-cyan)',
          purple: 'var(--aurora-purple)',
          pink: 'var(--aurora-pink)',
          yellow: 'var(--aurora-yellow)',
          red: 'var(--aurora-red)',
          blue: 'var(--aurora-blue)',
          'glow-green': 'var(--aurora-glow-green)',
          'glow-cyan': 'var(--aurora-glow-cyan)',
          'glow-purple': 'var(--aurora-glow-purple)',
        },

        // Overlays
        overlay: {
          light: 'var(--overlay-light)',
          dark: 'var(--overlay-dark)',
        },
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
        'gradient-accent': 'var(--gradient-accent)',
        'gradient-aurora': 'var(--gradient-aurora)',
        'gradient-energy': 'var(--gradient-energy)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        'glow': 'var(--shadow-glow)',
      },
      backdropBlur: {
        'glass': 'var(--glass-backdrop)',
        'overlay': 'var(--overlay-blur)',
      },
    },
  },
  plugins: [],
}