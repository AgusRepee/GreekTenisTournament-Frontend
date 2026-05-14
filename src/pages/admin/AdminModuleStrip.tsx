import { primaryNavFromPath } from './adminNavPaths';
import { primaryNavLabel } from './adminPanelTypes';

type Props = {
  pathname: string;
};

export function AdminModuleStrip({ pathname }: Props) {
  const id = primaryNavFromPath(pathname);
  return (
    <header className="app-glass-panel app-glass-panel--bar sticky top-0 z-20 shrink-0 border-b border-gray-200/85 dark:border-gray-700/75">
      <div className="container-admin flex min-h-[2.25rem] items-center py-2 md:min-h-[2.5rem] md:py-2.5">
        <h1 className="truncate text-sm font-bold tracking-tight text-[#111318] dark:text-white md:text-base">
          {primaryNavLabel(id)}
        </h1>
      </div>
    </header>
  );
}
