import {
  CButton,
  CContainer,
  CHeader,
  CHeaderBrand,
  CHeaderNav,
  CNavItem,
} from '@coreui/react'
import { Menu, Moon, Sun, X } from 'lucide-react'
import BrandMark from './BrandMark'

type HeaderProps = {
  darkMode: boolean
  menuOpen: boolean
  onMenuToggle: () => void
  onThemeToggle: () => void
}

export default function Header({
  darkMode,
  menuOpen,
  onMenuToggle,
  onThemeToggle,
}: HeaderProps) {
  return (
    <CHeader>
      <CContainer fluid className="justify-content-between">
        <div className="header-brand-group">
          <CButton
            aria-controls="app-navigation"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            className="mobile-nav-toggle"
            color="light"
            onClick={onMenuToggle}
            type="button"
            variant="ghost"
          >
            {menuOpen ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
          </CButton>
          <CHeaderBrand className="qaforge-header-brand" href="#">
            <BrandMark />
          </CHeaderBrand>
        </div>
        <CHeaderNav>
          <CNavItem>
            <CButton
              className="theme-toggle"
              color="light"
              variant="ghost"
              onClick={onThemeToggle}
              aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {darkMode ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
            </CButton>
          </CNavItem>
        </CHeaderNav>
      </CContainer>
    </CHeader>
  )
}