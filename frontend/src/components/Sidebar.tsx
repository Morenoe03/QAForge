import {
  CAvatar,
  CDropdown,
  CDropdownDivider,
  CDropdownItem,
  CDropdownMenu,
  CDropdownToggle,
  CSidebar,
  CSidebarBrand,
  CSidebarFooter,
  CSidebarHeader,
  CSidebarNav,
  CNavItem,
  CNavTitle,
} from '@coreui/react'

import CIcon from '@coreui/icons-react'
import {
  cilAccountLogout,
  cilCreditCard,
  cilOptions,
  cilSettings,
  cilUser,
} from '@coreui/icons'
import {
  Braces,
  Bug,
  CircleX,
  GitBranch,
  Layers,
  LayoutDashboard,
  ListChecks,
  PlayCircle,
} from 'lucide-react'
import BrandMark from './BrandMark'

export type AppPage =
  | 'Test Forge'
  | 'Test Suites'
  | 'Test Cases'
  | 'Test Runs'
  | 'Failures'
  | 'Defects'
  | 'API Tests'
  | 'Pipelines'

type SidebarProps = {
  activePage: AppPage
  mobileOpen: boolean
  onSelect: (page: AppPage) => void
}

export const Sidebar = ({ activePage, mobileOpen, onSelect }: SidebarProps) => {
  const navigateTo = (page: AppPage) => (event: React.MouseEvent) => {
    event.preventDefault()
    onSelect(page)
  }

  return (
    <CSidebar
      aria-label="Primary navigation"
      className={`border-end h-100 app-sidebar${mobileOpen ? ' mobile-open' : ''}`}
      id="app-navigation"
      visible
    >
      <CSidebarHeader className="position-relative">
        <CSidebarBrand>
          <BrandMark />
        </CSidebarBrand>
      </CSidebarHeader>
      <CSidebarNav variant="tree">
        <CNavTitle>Navigation</CNavTitle>
        <CNavItem href="#" active={activePage === 'Test Forge'} onClick={navigateTo('Test Forge')}>
          <LayoutDashboard aria-hidden="true" className="nav-icon" size={18} /> Test Forge
        </CNavItem>
        <CNavItem href="#" active={activePage === 'Test Suites'} onClick={navigateTo('Test Suites')}>
          <Layers aria-hidden="true" className="nav-icon" size={18} /> Test Suites
        </CNavItem>
        <CNavItem href="#" active={activePage === 'Test Cases'} onClick={navigateTo('Test Cases')}>
          <ListChecks aria-hidden="true" className="nav-icon" size={18} /> Test Cases
        </CNavItem>
        <CNavItem href="#" active={activePage === 'Test Runs'} onClick={navigateTo('Test Runs')}>
          <PlayCircle aria-hidden="true" className="nav-icon" size={18} /> Test Runs
        </CNavItem>
        <CNavItem href="#" active={activePage === 'Failures'} onClick={navigateTo('Failures')}>
          <CircleX aria-hidden="true" className="nav-icon" size={18} /> Failures
        </CNavItem>
        <CNavItem href="#" active={activePage === 'Defects'} onClick={navigateTo('Defects')}>
          <Bug aria-hidden="true" className="nav-icon" size={18} /> Defects
        </CNavItem>
        <CNavItem href="#" active={activePage === 'API Tests'} onClick={navigateTo('API Tests')}>
          <Braces aria-hidden="true" className="nav-icon" size={18} /> API Tests
        </CNavItem>
        <CNavItem href="#" active={activePage === 'Pipelines'} onClick={navigateTo('Pipelines')}>
          <GitBranch aria-hidden="true" className="nav-icon" size={18} /> Pipelines
        </CNavItem>
      </CSidebarNav>
      <CSidebarFooter>
        <CDropdown className="w-100" direction="dropup">
          <CDropdownToggle
            caret={false}
            className="w-100 d-flex gap-2 p-1 align-items-center"
            variant="ghost"
          >
            <CAvatar shape="rounded" size="md" src="/assets/img/avatars/7.jpg" />
            <div className="small text-start d-sidebar-narrow-none">
              <div className="fw-semibold">Emanuel Moreno</div>
              <div>emanuellmorreno@gmail.com</div>
            </div>
            <CIcon className="nav-icon ms-auto d-sidebar-narrow-none" icon={cilOptions} />
          </CDropdownToggle>
          <CDropdownMenu className="w-100">
            <div className="d-flex gap-2 px-2">
              <CAvatar shape="rounded" size="md" src="/assets/img/avatars/7.jpg" />
              <div className="small text-start">
                <div className="fw-semibold">Emanuel Moreno</div>
                <div>emanuellmorreno@gmail.com</div>
              </div>
            </div>

            <CDropdownDivider />
            <CDropdownItem href="#">
              <div className="d-flex align-items-center gap-2">
                <CIcon icon={cilUser} />
                Account
              </div>
            </CDropdownItem>
            <CDropdownItem href="#">
              <div className="d-flex align-items-center gap-2">
                <CIcon icon={cilCreditCard} />
                Billing
              </div>
            </CDropdownItem>
            <CDropdownItem href="#">
              <div className="d-flex align-items-center gap-2">
                <CIcon icon={cilSettings} />
                Settings
              </div>
            </CDropdownItem>
            <CDropdownDivider />
            <CDropdownItem href="#">
              <div className="d-flex align-items-center gap-2">
                <CIcon icon={cilAccountLogout} />
                Logout
              </div>
            </CDropdownItem>
          </CDropdownMenu>
        </CDropdown>
      </CSidebarFooter>
    </CSidebar>
  )
}