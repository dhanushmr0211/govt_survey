export function isMobileEditRestricted() {
  try {
    const toggle = localStorage.getItem('mobile_edit_restrictions');
    const userAgent = navigator.userAgent || '';
    const isUA = /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent);
    const isSmallTouchScreen = typeof window !== 'undefined'
      && window.innerWidth <= 768
      && navigator.maxTouchPoints > 0;
    if (!isUA && !isSmallTouchScreen) return false;
    if (toggle === 'false') return false;
    return true;
  } catch {
    return false;
  }
}

export function isMobileUser() {
  try {
    const userAgent = navigator.userAgent || '';
    return /Mobi|Android|iPhone|iPad|iPod/i.test(userAgent)
      || (typeof window !== 'undefined' && window.innerWidth <= 768 && navigator.maxTouchPoints > 0);
  } catch {
    return false;
  }
}
