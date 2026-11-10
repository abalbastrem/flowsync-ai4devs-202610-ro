import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-1.5 text-sm font-medium',
    isActive ? 'bg-muted' : 'text-muted-foreground hover:text-foreground',
  )

/**
 * Navegación de las pantallas con sesión. Solo hay una lista de tareas, la
 * del equipo: no existe una vista «mis tareas».
 */
export function MainNav() {
  return (
    <header className="bg-background border-b">
      <nav
        aria-label="Principal"
        className="mx-auto flex max-w-2xl items-center gap-2 px-6 py-3"
      >
        <span className="mr-auto font-semibold">FlowSync</span>
        <NavLink to="/" end className={linkClass}>
          Tareas
        </NavLink>
        <NavLink to="/profile" className={linkClass}>
          Perfil
        </NavLink>
      </nav>
    </header>
  )
}
