export function isMobileEditRestricted() {
  try {
    const toggle = localStorage.getItem('mobile_edit_restrictions');
    const isUA = /Mobi|Android/i.test(navigator.userAgent || '');
    return toggle === 'true' && isUA;
  } catch {
    return false;
  }
}

export function isMobileUser() {
  try {
    return /Mobi|Android/i.test(navigator.userAgent || '');
  } catch {
    return false;
  }
}
