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
    <div className="cpe-inspector">
      <div className="cpe-inspector-header flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="cpe-inspector-title truncate">{title}</h3>
          {badge && <span className="cpe-inspector-badge">{badge}</span>}
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
    <AccordionItem value={value} className="cpe-group border-b border-white/[0.04]">
      <AccordionTrigger className="cpe-group-trigger hover:no-underline py-2.5">
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
      <Label className="cpe-field-label">{label}</Label>
      {children}
    </div>
  );
}

export function ColorField({ value, onChange }) {
  return (
    <div className="flex gap-1.5 items-center">
      <div className="cpe-color-swatch">
        <input type="color" value={value || '#ffffff'} onChange={(e) => onChange(e.target.value)}
          className="cpe-color-input" />
      </div>
      <Input value={value || '#ffffff'} onChange={(e) => onChange(e.target.value)}
        className="cpe-color-hex flex-1 h-8" />
    </div>
  );
}

export function SelectField({ value, onChange, options, styleFont = false }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="cpe-select"
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
        <Label className="cpe-field-label">{label}</Label>
        <span className="cpe-slider-value">{value}</span>
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
        <button key={o.value} className={`cpe-mini-btn flex-1 ${value === o.value ? 'active' : ''}`}
          onClick={() => onChange(o.value)}>
          {o.icon ? <o.icon className="w-3 h-3" /> : o.label}
        </button>
      ))}
    </div>
  );
}

export function IconBtn({ children, className = '', ...props }) {
  return <button className={`cpe-icon-btn w-7 h-7 ${className}`} {...props}>{children}</button>;
}

export function NumField({ label, value, onChange, min, max, step }) {
  return (
    <Field label={label}>
      <Input type="number" value={value || 0} min={min} max={max} step={step}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="cpe-input h-8" />
    </Field>
  );
}