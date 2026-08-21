/**
 * Íconos dibujados a mano, trazo uniforme de 1.5 sobre caja de 16. Son pocos y específicos:
 * traer una librería entera para seis glifos sería peso muerto, y un emoji no es un ícono.
 */

type IconProps = React.SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Marca de atención: el círculo que traza el controlador sobre una tira demorada. */
export function IconFlagged(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="5.75" />
      <path d="M8 5.25v3.1l1.9 1.4" />
    </Icon>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 3.25v9.5M3.25 8h9.5" />
    </Icon>
  );
}

export function IconClose(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </Icon>
  );
}

export function IconChevronLeft(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 3.5L5.5 8l4.5 4.5" />
    </Icon>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6 3.5L10.5 8 6 12.5" />
    </Icon>
  );
}

/** Enlace externo a la oferta publicada. */
export function IconExternal(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.5 3.5H3.5v9h9v-3" />
      <path d="M9.5 3.5h3v3M12.5 3.5L7.75 8.25" />
    </Icon>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="7.25" cy="7.25" r="3.75" />
      <path d="M10 10l2.5 2.5" />
    </Icon>
  );
}

/** Salir de la posición. */
export function IconSignOut(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 3.5h-6v9h6" />
      <path d="M7.5 8h6M11 5.5L13.5 8 11 10.5" />
    </Icon>
  );
}
