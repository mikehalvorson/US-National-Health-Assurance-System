/* Shared types for the National Health Assurance model engine. */

export interface Triangular {
  low: number;
  mode: number;
  high: number;
}

export interface ParamDef extends Triangular {
  id: string;
  group?: string;
  unit?: string;
  label?: string;
  confidence?: 'high' | 'medium' | 'low';
  source?: string;
  url?: string;
  adjustable?: boolean;
  sliderMin?: number;
  sliderMax?: number;
}

// (You will extend this file with DetailRow/PathResult in Task 3; leave room.)
