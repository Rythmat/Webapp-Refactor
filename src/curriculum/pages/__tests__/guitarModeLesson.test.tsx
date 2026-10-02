// @vitest-environment jsdom
/**
 * The guitar Ionian (Major) lesson page: what it hands the lesson container
 * for a key and ?section=, and what it does on arrival. The container is a
 * recorder here; it's tested on its own (GenreLessonContainerV2.instruments).
 */

import { act, cleanup, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
  type NavigateFunction,
} from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LearnRoutes } from '@/constants/routes';
import type { GenreLessonContainerV2 } from '@/curriculum/pages/GenreLessonContainerV2';
import GuitarModeLesson from '@/curriculum/pages/GuitarModeLesson';
import { useInstrumentStore } from '@/features/learn/useInstrumentStore';

type ContainerProps = Parameters<typeof GenreLessonContainerV2>[0];

const container = vi.hoisted(() => ({
  props: [] as ContainerProps[],
  mounts: 0,
}));

vi.mock('@/curriculum/pages/GenreLessonContainerV2', () => ({
  GenreLessonContainerV2: (props: ContainerProps) => {
    container.props.push(props);
    useEffect(() => {
      container.mounts += 1;
    }, []);
    return <p>{`lesson, section ${props.initialSection}`}</p>;
  },
}));

const lastProps = () => container.props[container.props.length - 1];

let navigate: NavigateFunction = () => {};
function NavigateHandle() {
  navigate = useNavigate();
  return null;
}

const LocationProbe = () => {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{`${pathname}${search}`}</output>;
};

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <NavigateHandle />
      <Routes>
        <Route
          path={LearnRoutes.guitarLesson.definition}
          element={<GuitarModeLesson />}
        />
        <Route path="*" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  container.props = [];
  container.mounts = 0;
  useInstrumentStore.setState({ instrument: 'piano' });
});

afterEach(cleanup);

describe('GuitarModeLesson', () => {
  it("builds the key's guitar flow and names it Ionian (Major)", () => {
    renderAt('/learn/guitar/ionian/fsharp');
    const props = lastProps();
    expect(props.flow.params.defaultKey).toBe('F# Major (Ionian)');
    expect(props.flow.params.instrument).toBe('guitar');
    // The internal id is kept, so saved progress carries over.
    expect(props.genre).toBe('guitar-applied-theory-fundamentals');
    expect(props.level).toBe(1);
    expect(props.displayName).toBe('Guitar · Ionian (Major)');
    expect(props.overviewRoute).toBe('/learn/guitar/ionian');
    expect(props.rootCrumb).toEqual({
      label: 'Theory',
      route: '/learn?tab=Theory',
    });
  });

  it('brings the Practice Track back to this lesson and section', () => {
    renderAt('/learn/guitar/ionian/dflat');
    expect(lastProps().practiceReturnTo?.('B')).toBe(
      '/learn/guitar/ionian/dflat?section=B',
    );
  });

  it('opens the section the URL names', () => {
    renderAt('/learn/guitar/ionian/c?section=B');
    expect(lastProps().initialSection).toBe('B');
    expect(screen.getByText('lesson, section B')).toBeInTheDocument();
  });

  it.each([
    ['a section guitar has no chapter for', '?section=C'],
    ['a section that does not exist', '?section=Z'],
    ['no section', ''],
  ])('opens Melody for %s', (_label, query) => {
    renderAt(`/learn/guitar/ionian/c${query}`);
    expect(lastProps().initialSection).toBe('A');
  });

  it('starts over when the URL names another section', () => {
    renderAt('/learn/guitar/ionian/c?section=A');
    expect(container.mounts).toBe(1);
    act(() => navigate('/learn/guitar/ionian/c?section=D'));
    expect(container.mounts).toBe(2);
    expect(lastProps().initialSection).toBe('D');
  });

  it('makes guitar the Learn instrument', () => {
    renderAt('/learn/guitar/ionian/c');
    expect(useInstrumentStore.getState().instrument).toBe('guitar');
  });

  it('sends a mode with no guitar content back to Theory', () => {
    renderAt('/learn/guitar/dorian/c');
    expect(screen.getByTestId('location').textContent).toBe(
      '/learn?tab=Theory',
    );
    expect(container.props).toHaveLength(0);
    expect(useInstrumentStore.getState().instrument).toBe('piano');
  });
});
