import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from '@/components/ui/accordion';

export function pj(str, fallback) {
  try { return JSON.parse(str || 'null') ?? fallback; } catch { return fallback; }
}

export function InspectorShell({ title, badge, children, actions, defaultValues = [] }) {
  return (
    <div className="w-72 flex-shrink-0 bg-card border-l border-border overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border sticky top-0 bg-card z-10">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-sm font-heading font-semibold truncate">{title}</h3>
          {badge && <span className="text-[10px] text-muted-foreground font-mono">{badge}</span>}
        </div>
        {actions && <div className="flex gap-0.5">{actions}</div>}
      </div>
      <Accordion type="multiple" defaultValue={defaultValues} className="px-3">
        {children}
      </Accordion>
    </div>
  );
}

export function Group({ value, title, children }) {
  return (
    <AccordionItem value={value} className="border-b border-border/50">
      <AccordionTrigger className="text-xs font-heading font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline py-2.5">
        {title}
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-2.5 pb-3">{children}</div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function ColorField({ value, onChange }) {
  return (
    <div className="flex gap-1.5">
      <Input type="color" value={value || '#ffffff'} onChange={(e) => onChange(e.target.value)}
        className="w-9 h-8 p-1 border-border" />
      <Input value={value || '#ffffff'} onChange={(e) => onChange(e.target.value)}
        className="flex-1 text-xs font-mono h-8" />
    </div>
  );
}

export function SelectField({ value, onChange, options, styleFont = false }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full text-xs bg-background border border-border rounded-md px-2 py-1.5 h-8"
      style={styleFont ? { fontFamily: value } : undefined}>
      {options.map(o => (
        <option key={o} value={o} style={styleFont ? { fontFamily: o } : undefined}>
          {o.replace(/_/g, ' ')}
        </option>
      ))}
    </select>
  );
}

export function SliderField({ label, value, min = 0, max = 100, step = 1, onChange }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-[11px] text-muted-foreground">{label}</Label>
        <span className="text-[10px] font-mono text-muted-foreground">{value}</span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step}
        onValueChange={(v) => onChange(v[0])} className="h-4" />
    </div>
  );
}

export function ToggleGroup({ value, options, onChange }) {
  return (
    <div className="flex gap-1">
      {options.map(o => (
        <Button key={o.value} variant={value === o.value ? 'default' : 'outline'} size="sm"
          className="flex-1 h-7 text-[10px] px-1"
          onClick={() => onChange(o.value)}>
          {o.icon ? <o.icon className="w-3 h-3" /> : o.label}
        </Button>
      ))}
    </div>
  );
}

export function IconBtn({ children, className = '', ...props }) {
  return <Button variant="ghost" size="icon" className={`w-7 h-7 ${className}`} {...props}>{children}</Button>;
}

export function NumField({ label, value, onChange, min, max, step }) {
  return (
    <Field label={label}>
      <Input type="number" value={value || 0} min={min} max={max} step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="h-8 text-xs" />
    </Field>
  );
}