import { createContext, useContext, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';

type BreadcrumbItem = {
  title: string;
  pathname: string;
  search?: string;
};

const NavigationContext = createContext<{
  breadcrumbs: BreadcrumbItem[];
  title: string;
  setBreadcrumbs: (breadcrumbs: BreadcrumbItem[]) => void;
  setTitle: (title: string) => void;
}>({
  breadcrumbs: [],
  title: '',
  setBreadcrumbs: () => {},
  setTitle: () => {},
});

export const NavigationContextProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [title, setTitle] = useState<string>('');

  return (
    <>
      <Helmet>
        <title>{title ? `${title} • Music Atlas` : 'Music Atlas'}</title>
      </Helmet>
      <NavigationContext.Provider
        value={{ breadcrumbs, title, setBreadcrumbs, setTitle }}
      >
        {children}
      </NavigationContext.Provider>
    </>
  );
};

export const useNavigationContext = () => {
  return useContext(NavigationContext);
};

export const useNavigationBreadcrumbs = (breadcrumbs: BreadcrumbItem[]) => {
  const { setBreadcrumbs } = useNavigationContext();
  const breadcrumbsString = breadcrumbs.map((b) => b.pathname).join(',');

  useEffect(() => {
    setBreadcrumbs(breadcrumbs);

    return () => {
      setBreadcrumbs([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [breadcrumbsString, setBreadcrumbs]);
};

export const useNavigationTitle = (title: string) => {
  const { setTitle } = useNavigationContext();
  useEffect(() => {
    setTitle(title);

    return () => {
      setTitle('');
    };
  }, [title, setTitle]);
};
