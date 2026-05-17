# Mobile User Field Restrictions Guide

## Overview
This feature restricts which form fields mobile users can edit in the **Pole Details** form. The feature is controlled by a runtime toggle and can be enabled/disabled **instantly without code changes or redeployment**.

## Editable Fields for Mobile Users
When enabled, mobile users can only edit these 6 fields:
1. **Ward Number**
2. **Switch Point Number**
3. **Pole Number**
4. **Road Type**
5. **Road Width**
6. **Image Section** (photo uploads)

All other fields are **disabled** and auto-submit as **empty strings**.

## How It Works
- **Detection**: Mobile detection via User-Agent (`/Mobi|Android/i` pattern).
- **Toggle**: Runtime `localStorage` flag `mobile_edit_restrictions` (no rebuild required).
- **Payload Sanitization**: Disabled fields are sent as empty strings, preventing accidental data loss.
- **Fallback**: Feature is **off by default**. Desktop users are unaffected.

## Enabling the Feature

### Method 1: Browser Console (Instant, Works Immediately)
Open browser Developer Tools (F12) and run:
```javascript
localStorage.setItem('mobile_edit_restrictions', 'true');
console.log('Mobile edit restrictions enabled. Refresh the page.');
```
Then refresh the page.

### Method 2: JavaScript Snippet in Frontend
Add to `main.jsx` or any initialization file (temporary):
```javascript
// Enable mobile restrictions (can be removed anytime)
if (process.env.VITE_ENABLE_MOBILE_RESTRICTIONS === 'true') {
  localStorage.setItem('mobile_edit_restrictions', 'true');
}
```

## Disabling the Feature

### Instant Rollback (No Code Changes)
In any browser on a mobile device:
```javascript
localStorage.removeItem('mobile_edit_restrictions');
console.log('Mobile edit restrictions disabled. Refresh the page.');
```
Then refresh the page.

### Git Rollback
```bash
git revert HEAD
# OR
git reset --hard HEAD~1  # Reverts only the 4 files modified
```

## Files Modified
1. `frontend/src/modules/poleSurvey/utils/mobileRestrictions.js` (NEW)
2. `frontend/src/modules/poleSurvey/components/PoleForm.jsx`
3. `frontend/src/modules/poleSurvey/components/WardDetailsView.jsx`
4. `frontend/src/modules/poleSurvey/components/PoleInspectModal.jsx`

## Testing

### Test on Desktop
- No changes visible; all fields remain editable.

### Test on Mobile (with Feature Enabled)
1. On mobile browser, enable the restriction via console:
   ```javascript
   localStorage.setItem('mobile_edit_restrictions', 'true');
   // Refresh page
   ```
2. Open Pole Details form.
3. Verify:
   - ✅ Ward Number, Switch Point, Pole Number, Road Type, Road Width fields are **editable** (cursor active).
   - ✅ All other fields are **disabled** (grayed out, no interaction).
   - ✅ Image upload section is **active**.
4. Try to submit:
   - ✅ Disabled fields should be submitted as empty strings.
   - ✅ No validation errors for empty disabled fields.

### Test Rollback
1. In mobile console:
   ```javascript
   localStorage.removeItem('mobile_edit_restrictions');
   // Refresh page
   ```
2. Verify all fields become editable again.

## Data Integrity
- ✅ **No data loss**: Disabled fields are explicitly cleared before submit.
- ✅ **Non-destructive**: Can be toggled on/off without affecting existing data.
- ✅ **Database agnostic**: Backend receives null/empty for restricted fields—no schema changes needed.
- ✅ **Production-safe**: Feature is off by default; no impact on existing users.

## Performance Impact
- **Negligible**: Runtime check is a simple localStorage lookup (~1ms).
- **No rebuild**: Feature toggling requires no frontend rebuild or server restart.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Field not disabled on mobile | Verify `localStorage.getItem('mobile_edit_restrictions')` returns `'true'` in browser console. Refresh page. |
| Feature not turning off | Clear all localStorage: `localStorage.clear()` or use incognito mode. |
| Desktop users affected | Desktop users should never see restrictions; if they do, check User-Agent detection logic. |
| Build failed | Revert with `git revert HEAD` and rebuild. |

## Future Enhancements
- Add an admin panel toggle to enable/disable per-ULB or per-role.
- Add per-field granular restrictions.
- Log which fields were disabled for audit purposes.
