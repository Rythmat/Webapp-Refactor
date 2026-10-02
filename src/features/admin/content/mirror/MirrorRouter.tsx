import { type ReactNode, useMemo } from 'react';
import {
  createPath,
  type Navigator,
  Router,
  type To,
  UNSAFE_DataRouterContext,
  UNSAFE_DataRouterStateContext,
  UNSAFE_LocationContext,
  UNSAFE_RouteContext,
  useLocation,
  useNavigate,
  useNavigationType,
} from 'react-router-dom';
import { toAppLocation, toConsolePath } from './mirrorPaths';

/**
 * A router inside the console's router, so the app's own pages run inside
 * /console believing they are at their app paths.
 *
 * Console users cannot open the app — ProtectedPage sends them back to
 * /console — so the only way to show them the app exactly as students see it
 * is to mount the app's components here. Those components link absolutely
 * (`/songs/africa`, `/learn?tab=Theory`); this router shows them the app path
 * and turns every navigation they make back into a console one
 * (`/console/content/songs/africa`), so the admin never leaves /console.
 *
 * Four contexts are reset for the inner tree (react-router 6.30.3):
 *  - LocationContext → null, or <Router> refuses to render inside a router;
 *  - RouteContext → empty, so `useNavigate` takes the navigator path rather
 *    than the data router's `router.navigate` (which would bypass the
 *    rewriting), and inner <Routes> do not inherit the console's own match
 *    (which would strip `/console/content` and misread `/songs/africa`);
 *  - the two data-router contexts → null, so nothing inside reaches the
 *    console's data router directly. No app page uses a data-router-only hook.
 * All four are react-router internals: a v7 upgrade must revisit this file,
 * and MirrorRouter.test.tsx pins the behaviour it relies on.
 */
export const MirrorRouter = ({ children }: { children: ReactNode }) => {
  const outer = useLocation();
  const outerNavigate = useNavigate();
  const navigationType = useNavigationType();

  const navigator = useMemo<Navigator>(() => {
    const toConsole = (to: To) =>
      toConsolePath(typeof to === 'string' ? to : createPath(to));
    return {
      createHref: toConsole,
      push: (to, state) => outerNavigate(toConsole(to), { state }),
      replace: (to, state) =>
        outerNavigate(toConsole(to), { replace: true, state }),
      go: (delta) => outerNavigate(delta),
    };
  }, [outerNavigate]);

  return (
    <UNSAFE_DataRouterContext.Provider value={null}>
      <UNSAFE_DataRouterStateContext.Provider value={null}>
        <UNSAFE_LocationContext.Provider value={null as never}>
          <UNSAFE_RouteContext.Provider
            value={{ outlet: null, matches: [], isDataRoute: false }}
          >
            <Router
              location={toAppLocation(outer)}
              navigationType={navigationType}
              navigator={navigator}
            >
              {children}
            </Router>
          </UNSAFE_RouteContext.Provider>
        </UNSAFE_LocationContext.Provider>
      </UNSAFE_DataRouterStateContext.Provider>
    </UNSAFE_DataRouterContext.Provider>
  );
};
