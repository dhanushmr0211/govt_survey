export function isMobileEditRestricted() {
  return false;
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
