import React from 'react';
import PresentationInspector from './inspector/PresentationInspector';
import SlideInspector from './inspector/SlideInspector';
import TextInspector from './inspector/TextInspector';
import ImageInspector from './inspector/ImageInspector';
import ShapeInspector from './inspector/ShapeInspector';
import MultiSelectInspector from './inspector/MultiSelectInspector';
import GenericElementInspector from './inspector/GenericElementInspector';

const TEXT_TYPES = ['text', 'lower_third', 'caption'];

export default function PropertiesPanel({
  presentation, slide, selectedId, selectedElement, selectedElements,
  zoom, onUpdatePresentation, onUpdateSlide, onUpdateElement, onDeleteElement,
  onRegenerateElement, onDuplicateElement, onBringForward, onSendBackward,
  onDuplicateSlide, onDeleteSlide, onMoveSlideForward, onMoveSlideBackward,
  onCopy, onCut, onPaste, onAlign, onDistribute, onZoom,
}) {
  // ── Multiple selection (§17) ──
  if (selectedElements && selectedElements.length > 1) {
    return (
      <MultiSelectInspector
        count={selectedElements.length}
        onAlign={onAlign} onDistribute={onDistribute}
        onDuplicate={() => selectedElements.forEach(el => onDuplicateElement(el.id))}
        onDelete={() => selectedElements.forEach(el => onDeleteElement(el.id))}
      />
    );
  }

  // ── Single element selected ──
  if (selectedElement) {
    const props = {
      element: selectedElement, onUpdate: onUpdateElement, onDelete: onDeleteElement,
      onBringForward, onSendBackward,
    };

    if (TEXT_TYPES.includes(selectedElement.type)) {
      return <TextInspector {...props} onRegenerate={onRegenerateElement}
        onDuplicate={onDuplicateElement} onCopy={onCopy} onCut={onCut} onPaste={onPaste} />;
    }
    if (selectedElement.type === 'image') {
      return <ImageInspector {...props} slide={slide} presentation={presentation} onRegenerate={onRegenerateElement} />;
    }
    if (selectedElement.type === 'shape') {
      return <ShapeInspector {...props} />;
    }
    return <GenericElementInspector {...props} onRegenerate={onRegenerateElement} label={selectedElement.type} />;
  }

  // ── Slide selected (clicking on canvas background) ──
  if (slide && (selectedId === '__slide__' || selectedId === null || selectedId === undefined || selectedId === '__title__' || selectedId === '__body__')) {
    return (
      <SlideInspector slide={slide} selectedId={selectedId} onUpdate={onUpdateSlide}
        onDuplicate={onDuplicateSlide} onDelete={onDeleteSlide}
        onMoveForward={onMoveSlideForward} onMoveBackward={onMoveSlideBackward} />
    );
  }

  // ── Nothing selected — presentation-level controls (§4) ──
  return <PresentationInspector presentation={presentation} onUpdate={onUpdatePresentation} zoom={zoom} onZoom={onZoom} />;
}