
'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navigation = [
  { label: 'Inicio', href: '/' },
  { label: 'Ofertas de trabajo', href: '/ofertas-trabajo' },
  { label: 'Vacantes', href: '/vacantes' },
  { label: 'Mis postulaciones', href: '/postulaciones' },
  { label: 'Perfil', href: '/perfil/experiencia-laboral' },
];

function NavigationLinks({ pathname }: { pathname?: string | null }) {
  return navigation.map((item) => {
    const active =
      pathname != null &&
      (item.href === '/'
        ? pathname === '/'
        : pathname === item.href ||
          pathname.startsWith(`${item.href}/`) ||
          (item.href === '/perfil/experiencia-laboral' &&
            (pathname.startsWith('/profile/experience') ||
              pathname.startsWith('/skills') ||
              pathname.startsWith('/perfil/formacion'))));

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={`border-b-2 px-3 py-3 text-sm transition-colors sm:px-4 ${
          active
            ? 'border-[#ed9635] font-bold text-[#17384b]'
            : 'border-transparent text-gray-600 hover:text-[#17384b]'
        }`}
      >
        {item.label}
      </Link>
    );
  });
}

function ActiveNavigationLinks() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return <NavigationLinks pathname={mounted ? pathname : null} />;
}

export default function PortalHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#e7e0d4] bg-white">
      <div className="mx-auto flex min-h-[76px] max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Link href="/vacantes" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#17384b] text-sm font-bold tracking-wide text-white">
            U
          </div>

          <div>
            <p className="text-sm font-bold leading-tight text-[#17384b] sm:text-base">
              UMSSPIRA
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Vinculación Laboral
            </p>
          </div>
        </Link>

        <nav
          aria-label="Navegación principal"
          className="flex flex-wrap items-center gap-1 sm:gap-2"
        >
          <Suspense fallback={<NavigationLinks />}>
            <ActiveNavigationLinks />
          </Suspense>
        </nav>

        <div className="hidden items-center gap-3 border-l border-gray-200 pl-4 md:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8edf0] text-sm font-bold text-[#17384b]">
            E
          </div>
          <div>
            <p className="text-sm font-semibold text-[#263747]">
              Portal de egresados
            </p>
            <p className="text-xs text-gray-500">
              UMSS · Sistemas
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
