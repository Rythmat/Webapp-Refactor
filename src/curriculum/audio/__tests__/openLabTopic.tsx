import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { audioModule, type LabLesson as LabUnit } from '../catalog';
import { LabLesson } from '../lab/LabLesson';

/** Opens a module's unit at a URL, through its real page, once its topic has
 *  loaded. */
export async function openUnit(query = '', moduleId = 'sound-basics') {
  const module = audioModule(moduleId)!;
  const view = render(
    <MemoryRouter initialEntries={[`/x${query}`]}>
      <LabLesson module={module} lesson={module.lessons[0] as LabUnit} />
    </MemoryRouter>,
  );
  await waitFor(() => {
    if (!document.querySelector('[data-lesson-tabs] ~ *')) {
      throw new Error('The topic has not loaded yet');
    }
  });
  return view;
}
