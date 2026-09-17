import {
  CButton,
  CContainer,
  CHeader,
  CHeaderBrand,
  CHeaderNav,
  CNavItem,
} from '@coreui/react'
import { Moon, Sun } from 'lucide-react'

type HeaderProps = {
  darkMode: boolean
  onThemeToggle: () => void
}

export default function Header({ darkMode, onThemeToggle }: HeaderProps) {
  // The header stays intentionally small: branding and the theme control only.
  return (
    <CHeader>
      <CContainer fluid className="justify-content-between">
        <CHeaderBrand href="#">QAForge</CHeaderBrand>
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