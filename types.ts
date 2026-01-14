
export interface AnimationState {
  status: 'idle' | 'analyzing' | 'generating' | 'completed' | 'error';
  imageUrl?: string;
  videoUrl?: string;
  description?: string;
  error?: string;
}

export interface PersonaDetails {
  objectName: string;
  personality: string;
  animationPrompt: string;
}
