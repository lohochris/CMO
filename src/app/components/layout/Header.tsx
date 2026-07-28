import React, { useState, useEffect } from 'react';
import { LogIn, UserPlus, LogOut, Heart, Wallet, FileEdit, Menu, X } from 'lucide-react';
import { Button } from '../ui/button';
import logoImage from '@/imports/CMO.png';
import { useApp } from '../../../contexts/AppContext';
import { Page } from '../../../types';
import { getInitials } from '../../../utils/helpers';

const mainNavLinks: Array<{ label: string; page: Page }> = [
  { label: 'Home', page: 'home' },
  { label: 'About', page: 'about' },
  { label: 'Services', page: 'services' },
];

const familyLinks = ['Wisdom', 'Honour', 'Integrity', 'Talent'] as const;

const UserAvatar = ({ user, size = 'sm' }: { user: any; size?: 'sm' | 'md' }) => {
  const [imgError, setImgError] = useState(false);
  const name = user?.full_name || user?.name || '';
  const initials = getInitials(name);
  const dimensionClass = size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';

  useEffect(() => {
    setImgError(false);
  }, [user?.profilePic]);

  if (user?.profilePic && !imgError) {
    return (
      <img
        src={user.profilePic}
        alt=""
        onError={() => setImgError(true)}
        className={`${dimensionClass} rounded-full border-2 border-[#ffd700] object-cover shrink-0`}
      />
    );
  }

  return (
    <div className={`${dimensionClass} rounded-full border-2 border-[#ffd700] bg-[#002520] text-[#ffd700] font-extrabold flex items-center justify-center tracking-wider select-none shrink-0 shadow-sm`}>
      {initials}
    </div>
  );
};

export const Header = () => {
  const { currentUser, setCurrentUser, setCurrentPage, currentPage, selectedFamily, setSelectedFamily } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  const getAdminTitle = (role: string): string => {
    switch (role.toLowerCase()) {
      case 'chairman':
      case 'cmo_chairman':
        return 'EXECUTIVE CHAIRMAN';
      case 'fin_sec':
        return 'FINANCIAL SECRETARY';
      case 'welfare':
        return 'WELFARE OFFICER';
      case 'treasurer':
        return 'TREASURER';
      case 'gen_sec':
        return 'GENERAL SECRETARY';
      case 'pro':
        return 'PUBLIC RELATIONS OFFICER';
      default:
        return 'EXECUTIVE';
    }
  };

  const displayName = currentUser?.role === 'member'
    ? (currentUser?.full_name || currentUser?.name || 'CMO Member').toUpperCase()
    : getAdminTitle(currentUser?.role || '');

  const displaySubtitle = currentUser?.role === 'member' ? 'member' : 'executive';

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentPage('home');
    setMenuOpen(false);
  };

  const handleSetPage = (page: Page) => {
    setCurrentPage(page);
    setMenuOpen(false);
  };

  return (
    <header className="w-full bg-[#001a16] border-b border-[#ffd700]/20 py-2.5 px-3 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            <img
              src={logoImage}
              alt="CMO Logo"
              className="w-8 h-8 sm:w-12 sm:h-12 rounded-full border-2 border-[#ffd700] object-cover shrink-0"
            />
            <div className="flex flex-col min-w-0">
              <h1 className="text-[11px] xs:text-[13px] sm:text-xl md:text-2xl font-black uppercase tracking-tight text-[#ffd700] whitespace-nowrap overflow-hidden text-ellipsis leading-tight">
                CATHOLIC MEN ORGANIZATION
              </h1>
              <p className="text-[9px] sm:text-xs text-emerald-100/90 font-medium leading-tight truncate">
                Holy Cross Catholic Church, Badawa: Kano Diocese
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {mainNavLinks.map((link) => (
              <button
                key={link.page}
                type="button"
                onClick={() => handleSetPage(link.page)}
                className={`text-sm font-medium transition ${
                  currentPage === link.page
                    ? 'text-[#ffd700] border-b-2 border-[#ffd700] pb-1'
                    : 'text-gray-300 hover:text-[#ffd700]'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {currentUser ? (
              <>
                <div
                  onClick={() => setCurrentPage('dashboard')}
                  className="flex items-center gap-3 rounded-full border border-[#ffd700] px-3 py-1.5 cursor-pointer hover:bg-[#ffd700]/10 transition"
                  title="Go to Dashboard"
                >
                  <UserAvatar user={currentUser} size="sm" />
                  <div className="min-w-0 max-w-[180px]">
                    <p className="text-sm font-semibold text-[#ffd700] truncate">{displayName}</p>
                    <p className="text-xs text-gray-400 truncate">{displaySubtitle}</p>
                  </div>
                </div>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className="border-[#ffd700] text-[#ffd700] hover:bg-[#ffd700] hover:text-[#001a16]"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => {
                    setCurrentPage('login');
                    setMenuOpen(false);
                  }}
                  variant="outline"
                  className="border-[#ffd700] text-[#ffd700] hover:bg-[#ffd700] hover:text-[#001a16]"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </Button>
                <Button
                  onClick={() => {
                    setCurrentPage('register');
                    setMenuOpen(false);
                  }}
                  className="bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register
                </Button>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="p-1.5 text-[#ffd700] border border-[#ffd700]/40 rounded-lg shrink-0 hover:bg-[#ffd700]/10 transition-colors md:hidden"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {menuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
          </button>
        </div>

        <div className={`overflow-hidden transition-all duration-300 md:hidden ${menuOpen ? 'max-h-[480px] mt-4' : 'max-h-0'}`}>
          <div className="space-y-4 pb-4">
            <div className="flex flex-col gap-2">
              {mainNavLinks.map((link) => (
                <button
                  key={link.page}
                  type="button"
                  onClick={() => handleSetPage(link.page)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                    currentPage === link.page ? 'bg-[#ffd700] text-[#001a16]' : 'text-gray-300 hover:text-[#ffd700] hover:bg-[#002520]'
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>

            {currentUser ? (
              <div className="space-y-3 rounded-xl border border-[#ffd700]/30 bg-[#001a16] p-4">
                <div
                  onClick={() => {
                    setCurrentPage('dashboard');
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-3 cursor-pointer hover:bg-[#ffd700]/5 p-1 rounded transition"
                  title="Go to Dashboard"
                >
                  <UserAvatar user={currentUser} size="md" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#ffd700]">{displayName}</p>
                    <p className="truncate text-xs text-gray-400">{displaySubtitle}</p>
                  </div>
                </div>
                <Button
                  onClick={handleLogout}
                  className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]"
                >
                  <LogOut className="w-4 h-4 mr-2 inline" />
                  Logout
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() => {
                    setCurrentPage('login');
                    setMenuOpen(false);
                  }}
                  variant="outline"
                  className="w-full border-[#ffd700] text-[#ffd700] hover:bg-[#ffd700] hover:text-[#001a16]"
                >
                  <LogIn className="w-4 h-4 mr-2" />
                  Login
                </Button>
                <Button
                  onClick={() => {
                    setCurrentPage('register');
                    setMenuOpen(false);
                  }}
                  className="w-full bg-[#ffd700] text-[#001a16] hover:bg-[#ffc700]"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Register
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};