import type { ComponentType } from 'react';
import type { SamplePickerProps } from '../components/SamplePicker';

/** Load the sample art and picker only when the user opens the sample library. */
export async function loadSamplePicker(): Promise<ComponentType<SamplePickerProps>> {
  const module = await import('../components/SamplePicker');
  return module.SamplePicker;
}
