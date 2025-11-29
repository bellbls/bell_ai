# Emergency Pause System

## Overview
The Emergency Pause System allows administrators to temporarily disable staking and withdrawal operations during emergencies or system maintenance. When paused, users are shown clear messages and the UI is locked to prevent any new operations.

## Features

### Admin Controls
**Location:** Admin Dashboard → Staking Cycles tab

The admin panel includes two control cards:
1. **Staking System Control**
   - Current status indicator (ACTIVE/PAUSED)
   - Pause/Resume button with confirmation modal
   - Description of current state effects

2. **Withdrawal System Control**
   - Current status indicator (ACTIVE/PAUSED)
   - Pause/Resume button with confirmation modal
   - Description of current state effects

### User Experience

#### When Staking is Paused
- 🔒 **Alert Banner:** Red notice at top of Staking tab explaining the pause
- 🔒 **Locked Staking Cards:** All staking pools show lock icon overlay
- 🔒 **Disabled Actions:** Cannot click to create new stakes
- ✅ **Existing Stakes:** Continue earning rewards normally
- 📬 **Notification:** All users receive system notification

#### When Withdrawals are Paused
- 🔒 **Alert Banner:** Red notice at top of Wallet tab explaining the pause
- 🔒 **Disabled Button:** Withdraw button shows lock icon and "(Paused)" text
- 🔒 **Greyed Out:** Button is visually disabled with grey background
- ✅ **Pending Withdrawals:** Continue being processed
- 📬 **Notification:** All users receive system notification

### System Notifications

When an admin toggles a pause state:
- **Pause Notification:**
  - Title: "🔒 [Feature] Paused"
  - Message: Clear explanation of the pause and what to expect
  
- **Resume Notification:**
  - Title: "✅ [Feature] Resumed"
  - Message: Confirmation that operations are back to normal

All users receive these notifications automatically.

## Technical Implementation

### Backend (Convex)

**Configuration Keys:**
- `staking_paused` (boolean) - Controls staking operations
- `withdrawals_paused` (boolean) - Controls withdrawal operations

**Mutations:**
```typescript
// Toggle staking pause state
api.configs.toggleStakingPause()

// Toggle withdrawals pause state
api.configs.toggleWithdrawalsPause()
```

**Queries:**
```typescript
// Get current pause states
api.configs.getSystemPauseStates()
// Returns: { stakingPaused: boolean, withdrawalsPaused: boolean }
```

**Notification Creation:**
- When toggled, system automatically creates notifications for all users
- Notifications are stored in the `notifications` table
- Users see them in the NotificationBell component

### Frontend

**Admin Panel:**
- `app/app/admin/page.tsx` - Control interface in Staking Cycles tab
- Confirmation modals before toggling
- Real-time status updates

**User Dashboard:**
- `app/app/page.tsx` - Locked UI elements and alert banners
- Staking View: Locked cards with overlay
- Wallet View: Disabled withdraw button
- Toast notifications for attempted actions

## Usage Guidelines

### When to Use Emergency Pause

**Staking Pause:**
- Critical bugs in staking calculation
- Maintenance on staking smart contracts
- Testing new staking features
- Emergency network issues

**Withdrawal Pause:**
- Wallet security concerns
- Payment gateway maintenance
- High volume fraud detection
- Emergency fund protection

### Best Practices

1. **Communicate Clearly:** Always include estimated resume time if known
2. **Monitor Pending:** Keep processing pending withdrawals during pause
3. **Quick Toggle:** Keep pause periods as short as possible
4. **Post-Pause Check:** Verify system functionality after resuming

## Database Schema

**Configs Table:**
```typescript
{
  key: "staking_paused" | "withdrawals_paused",
  value: boolean
}
```

**Notifications Table:**
```typescript
{
  userId: Id<"users">,
  type: "system",
  title: string,
  message: string,
  read: boolean,
  timestamp: number
}
```

## Testing

To test the emergency pause system:

1. **Admin Side:**
   - Navigate to Admin Dashboard → Staking Cycles
   - Click "Pause Staking" and confirm
   - Verify status changes to "PAUSED"
   - Click "Pause Withdrawals" and confirm
   - Verify status changes to "PAUSED"

2. **User Side:**
   - Navigate to user Staking tab
   - Verify red alert banner appears
   - Verify staking cards show lock overlay
   - Try clicking a stake card - should see error toast
   - Navigate to Wallet tab
   - Verify red alert banner appears
   - Verify Withdraw button is greyed out with lock icon
   - Check notifications bell for system message

3. **Resume:**
   - Return to admin panel
   - Click "Resume" buttons
   - Verify user UI returns to normal
   - Check users receive resume notifications

## Future Enhancements

- [ ] Schedule pause/resume for specific times
- [ ] Add reason field for pause (shown to users)
- [ ] Email notifications for pause events
- [ ] Pause history/audit log
- [ ] Individual user exemptions (VIP bypass)
- [ ] Auto-resume after specified duration
- [ ] Pause specific staking cycles (not all)
- [ ] Rate limiting instead of complete pause


