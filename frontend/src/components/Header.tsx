import {
  CButton,
  CCollapse,
  CContainer,
  CDropdown,
  CDropdownDivider,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CForm,
  CFormInput,
  CHeader,
  CHeaderBrand,
  CHeaderNav,
  CNavItem,
  CNavLink,
} from '@coreui/react'
import { Menu } from 'lucide-react'

type HeaderProps = {
  onMenuToggle: () => void
}

export default function Header({ onMenuToggle }: HeaderProps) {
  return (
    <>
      <CHeader>
        <CContainer fluid>
          <CHeaderBrand href="#">QAForge</CHeaderBrand>
          <CCollapse className="header-collapse" visible>
            <CHeaderNav>
              <CNavItem>
                <CNavLink href="#" active>
                  Home
                </CNavLink>
              </CNavItem>
              <CNavItem>
                <CNavLink href="#">Link</CNavLink>
              </CNavItem>
              <CDropdown variant="nav-item">
                <CDropdownToggle color="secondary">Dropdown button</CDropdownToggle>
                <CDropdownMenu>
                  <CDropdownItem href="#">Action</CDropdownItem>
                  <CDropdownItem href="#">Another action</CDropdownItem>
                  <CDropdownDivider />
                  <CDropdownItem href="#">Something else here</CDropdownItem>
                </CDropdownMenu>
              </CDropdown>
            </CHeaderNav>
            <CForm className="d-flex">
              <CFormInput className="me-2" type="search" placeholder="Search" />
              <CButton type="submit" color="success" variant="outline">
                Search
              </CButton>
            </CForm>
          </CCollapse>
        </CContainer>
      </CHeader>
      <CHeader className="sidebar-toolbar">
        <CContainer fluid>
          <CButton
            color="light"
            variant="ghost"
            onClick={onMenuToggle}
            aria-label="Toggle sidebar"
          >
            <Menu size={20} color="black" aria-hidden="true" />
          </CButton>
        </CContainer>
      </CHeader>
    </>
  )
}