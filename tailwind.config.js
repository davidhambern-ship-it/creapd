/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
  			popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
  			primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
  			secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
  			muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
  			accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
  			destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
        berna: {
          purple: 'hsl(270 80% 60%)',
          orange: 'hsl(25 95% 55%)',
          emerald: 'hsl(152 60% 45%)',
          navy: 'hsl(220 30% 12%)',
        },
        info: { DEFAULT: 'hsl(var(--info))', foreground: 'hsl(var(--info-foreground))' },
        success: { DEFAULT: 'hsl(var(--success))', foreground: 'hsl(var(--success-foreground))' },
        warning: { DEFAULT: 'hsl(var(--warning))', foreground: 'hsl(var(--warning-foreground))' },
        env: {
          library: 'hsl(var(--env-library))',
          research: 'hsl(var(--env-research))',
          study: 'hsl(var(--env-study))',
          message: 'hsl(var(--env-message))',
          production: 'hsl(var(--env-production))',
          mission: 'hsl(var(--env-mission))',
        }
  		},
  		fontFamily: {
  			heading: ['var(--font-heading)'],
  			body: ['var(--font-body)'],
  			display: ['var(--font-display)'],
  			mono: ['var(--font-mono)']
  		},
  		boxShadow: {
  			'elevation-1': 'var(--shadow-elevation-1)',
  			'elevation-2': 'var(--shadow-elevation-2)',
  			'elevation-3': 'var(--shadow-elevation-3)',
  			'elevation-4': 'var(--shadow-elevation-4)',
  			'elevation-5': 'var(--shadow-elevation-5)',
  			'glow-purple': 'var(--glow-purple)',
  			'glow-orange': 'var(--glow-orange)',
  			'glow-emerald': 'var(--glow-emerald)',
  			'glow-blue': 'var(--glow-blue)',
  			'glow-info': 'var(--glow-info)',
  		},
  		backdropBlur: {
  			xs: '2px',
  		},
  		transitionTimingFunction: {
  			producer: 'var(--ease-producer)',
  			cinematic: 'var(--ease-cinematic)',
  		},
  		transitionDuration: {
  			fast: 'var(--duration-fast)',
  			normal: 'var(--duration-normal)',
  			slow: 'var(--duration-slow)',
  			cinematic: 'var(--duration-cinematic)',
  		},
  		keyframes: {
  			'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
  			'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
  			'stagger-in': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
  			'breathe': { '0%, 100%': { transform: 'scale(1)', opacity: '1' }, '50%': { transform: 'scale(1.02)', opacity: '0.95' } },
  			'shimmer': { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
  			'success-glow': { '0%': { boxShadow: '0 0 0 0 hsl(152 60% 45% / 0.4)' }, '70%': { boxShadow: '0 0 0 12px hsl(152 60% 45% / 0)' }, '100%': { boxShadow: '0 0 0 0 hsl(152 60% 45% / 0)' } },
  			'light-sweep': { '0%': { transform: 'translateX(-100%)', opacity: '0' }, '50%': { opacity: '0.3' }, '100%': { transform: 'translateX(100%)', opacity: '0' } },
  			'ai-thinking': { '0%, 100%': { opacity: '0.3' }, '50%': { opacity: '1' } },
  			'node-pulse': { '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 hsl(210 80% 55% / 0.3)' }, '50%': { transform: 'scale(1.05)' }, '100%': { transform: 'scale(1)', boxShadow: '0 0 0 8px hsl(210 80% 55% / 0)' } },
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'stagger-in': 'stagger-in 0.4s var(--ease-producer) both',
  			'breathe': 'breathe 4s ease-in-out infinite',
  			'shimmer': 'shimmer 1.5s infinite',
  			'success-glow': 'success-glow 0.8s ease-out',
  			'light-sweep': 'light-sweep 0.6s var(--ease-producer)',
  			'ai-thinking': 'ai-thinking 1.4s ease-in-out infinite',
  			'node-pulse': 'node-pulse 2s ease-in-out infinite',
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}
