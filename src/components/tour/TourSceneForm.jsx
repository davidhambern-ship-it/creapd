import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import SceneContentTab from './SceneContentTab';
import SceneVisualTab from './SceneVisualTab';
import SceneMotionTab from './SceneMotionTab';
import SceneAudioTab from './SceneAudioTab';
import AISceneTools from './AISceneTools';

export default function TourSceneForm({ scene, onChange }) {
  return (
    <Tabs defaultValue="content" className="w-full">
      <TabsList className="grid w-full grid-cols-5 h-8">
        <TabsTrigger value="content" className="text-[10px]">Content</TabsTrigger>
        <TabsTrigger value="visual" className="text-[10px]">Visual</TabsTrigger>
        <TabsTrigger value="motion" className="text-[10px]">Motion</TabsTrigger>
        <TabsTrigger value="audio" className="text-[10px]">Audio</TabsTrigger>
        <TabsTrigger value="ai" className="text-[10px]">AI</TabsTrigger>
      </TabsList>
      <TabsContent value="content" className="mt-3"><SceneContentTab scene={scene} onChange={onChange} /></TabsContent>
      <TabsContent value="visual" className="mt-3"><SceneVisualTab scene={scene} onChange={onChange} /></TabsContent>
      <TabsContent value="motion" className="mt-3"><SceneMotionTab scene={scene} onChange={onChange} /></TabsContent>
      <TabsContent value="audio" className="mt-3"><SceneAudioTab scene={scene} onChange={onChange} /></TabsContent>
      <TabsContent value="ai" className="mt-3"><AISceneTools scene={scene} onChange={onChange} /></TabsContent>
    </Tabs>
  );
}