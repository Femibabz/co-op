# Admin Access Security Tracking

## Overview

This security feature tracks **device and location information** for all admin logins to help detect unauthorized access and password sharing.

## Features

### 1. **Comprehensive Session Tracking**
Every time an admin (or any user) logs in, the system automatically captures:

- **Device Information:**
  - Device type (Desktop, Mobile, Tablet)
  - Operating System (Windows, macOS, Linux, iOS, Android)
  - Browser (Chrome, Firefox, Safari, Edge, Opera)
  - Screen resolution

- **Location Information:**
  - IP Address
  - City and Country
  - Region/State
  - Timezone
  - Internet Service Provider (ISP)

### 2. **Automatic Suspicious Activity Detection**

The system automatically flags sessions as suspicious when it detects:
- Login from a **different country** than previous sessions
- Login from a **different device type** (e.g., switching from desktop to mobile)
- Login from a **different operating system**
- Login from a **different browser**

When suspicious activity is detected, the session is visually highlighted with:
- Orange background in the session list
- Alert box showing specific reasons for suspicion
- Clear list of what changed

### 3. **Access Logs Dashboard**

Located at: **Admin Portal → Access Logs**

The dashboard provides:

**Summary Cards:**
- Total Sessions count
- Active Sessions (currently logged in)
- Suspicious Activity count

**Filter Options:**
- **Admin Only** - View only admin login sessions
- **Suspicious Only** - View only flagged sessions
- **All Sessions** - View all user sessions

**Detailed Session Table** showing:
- Login/Logout timestamps
- User email and role
- Device details (type, browser, OS, screen resolution)
- Location (city, country, region, timezone)
- IP address
- Session status (Active/Ended)
- Suspicious activity alerts

## How to Use

### For Admins

1. **View Access Logs:**
   - Login as admin (admin@coopkonnect.com / admin123)
   - Click on "Access Logs" in the navigation
   - Review all login sessions

2. **Monitor for Suspicious Activity:**
   - Check the "Suspicious Activity" card for alerts
   - Click "Suspicious Only" filter to see flagged sessions
   - Review the orange-highlighted sessions
   - Read the specific reasons listed in the alert boxes

3. **Investigate Unusual Access:**
   - Compare IP addresses and locations
   - Check if device/browser changes align with known admin behavior
   - Take action if unauthorized access is suspected

### For Society Administrators

**Best Practices:**
- Regularly review access logs (at least weekly)
- Investigate any suspicious activity immediately
- Change passwords if unauthorized access is detected
- Do not share admin passwords
- If you must temporarily share access, monitor the access logs closely

**Red Flags to Watch For:**
- Logins from unknown countries
- Multiple simultaneous active sessions from different locations
- Logins at unusual times
- Sudden changes in device/browser patterns

## Technical Implementation

### Data Storage
- All session data is stored in browser localStorage
- Data persists across browser sessions
- Each session has a unique ID

### Privacy & Security
- IP geolocation uses free public APIs (ipapi.co)
- No personal data is collected beyond login information
- Device fingerprinting is basic (browser user agent parsing)
- All data is stored client-side

### Session Lifecycle
1. **Login:** Session created with full device/location details
2. **Active:** Session marked as active while user is logged in
3. **Logout:** Session marked as ended with logout timestamp
4. **Analysis:** Each new login is compared with previous sessions for suspicious patterns

## API Endpoints Used

- **ipapi.co** - Primary IP geolocation service
- Fallback available if primary service fails
- Works without API keys for moderate usage

## Future Enhancements

Potential improvements:
- Email notifications for suspicious logins
- Two-factor authentication (2FA)
- Session timeout after inactivity
- Force logout of suspicious sessions
- Export access logs to CSV/PDF
- Integration with backend database for multi-device access
- Real-time session monitoring dashboard
- Geographic map visualization of logins

## Troubleshooting

**Sessions not appearing:**
- Ensure you're logged in as admin
- Check browser console for errors
- Clear localStorage and login again

**Location not showing:**
- IP geolocation API might be rate-limited
- Check internet connection
- Wait a few moments and refresh

**"Unknown" device information:**
- Occurs when user agent string is non-standard
- Still tracks IP and other available data

## Testing

To test the feature:

1. Login as admin from current device
2. Note the session details in Access Logs
3. Try logging in from:
   - Different browser on same device
   - Mobile device
   - Different network/location (if possible)
4. Observe suspicious activity flags

**Demo Credentials:**
- Admin: admin@coopkonnect.com / admin123
- Member: john.doe@email.com / member123

---

**Note:** This is a client-side implementation suitable for the MVP stage. For production use with real sensitive data, consider implementing server-side session tracking with enhanced security measures.
