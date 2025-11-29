# Admin Dashboard Documentation

## Overview
The AnchorChain Admin Dashboard provides comprehensive management and reporting capabilities for the entire V-Rank and staking system.

**Access:** `/admin`  
**Default Passcode:** `admin123` (change in production!)

---

## Features

### 1. Dashboard Tab
Real-time overview of system performance and key metrics.

#### Key Metrics Cards
- **Total Users**: Total registered users and users with active stakes
- **Active Stakes**: Number of active stakes and total active volume
- **Total Volume**: Cumulative team volume across all users
- **Pending Withdrawals**: Count and total amount pending approval

#### Charts & Visualizations
- **Rank Distribution** (Pie Chart): Shows user distribution across V0-V9 ranks
- **Commission Breakdown** (Bar Chart): Breakdown of commissions by type:
  - Direct (L1): 15% commissions
  - Indirect (L2): 10% commissions
  - V-Rank Bonus: Rank-based commissions
  - Binary: Future binary tree commissions
- **Staking by Cycle** (Bar Chart): Volume distribution across staking periods

---

### 2. Reports Tab
Detailed analytics and performance tracking.

#### Revenue Trends
- **30-day revenue chart** showing:
  - Daily yield distributions
  - Commission payouts
  - Total daily revenue
- Area chart visualization with gradient fill

#### User Growth
- **30-day user growth chart** showing:
  - New user registrations per day
  - Cumulative total users
- Line chart with dual metrics

#### Top Performers
Three leaderboards showing:
1. **Top by Volume**: Users with highest team volume
2. **Top by Earnings**: Users with highest wallet balance
3. **Top by Referrals**: Users with most direct referrals

Each shows:
- Rank position (gold/silver/bronze for top 3)
- User name and current V-Rank
- Metric value

#### Recent Activities
- Real-time transaction feed
- Shows last 20 transactions
- Displays:
  - User name
  - Transaction description
  - Amount (color-coded: green for income, red for expenses)
  - Timestamp

---

### 3. V-Ranks Tab
Complete V-Rank management system.

#### Features
- **Create New Rank**: Add custom V-Ranks beyond V9
- **Edit Existing Rank**: Modify rank requirements and commission rates
- **Delete Rank**: Remove unused ranks

#### Rank Configuration Fields
1. **Rank Name**: e.g., V10, V11, etc.
2. **Min Team Volume**: Minimum accumulative stake volume required
3. **Min Direct Referrals**: Minimum number of direct referrals
4. **Required Rank**: Previous rank required for structure (e.g., V1 for V2)
5. **Required Count**: Number of directs needed at required rank (usually 2)
6. **Commission Rate**: V-Rank bonus percentage (0-100%)

#### Rank Table View
Displays all ranks with:
- Rank name
- Minimum volume
- Minimum directs
- Structure requirement (e.g., "2 × V1")
- Commission rate
- Edit and Delete actions

#### Important Notes
- Editing a rank triggers automatic recalculation for all users
- Deleting a rank may cause users to downgrade
- Rank names cannot be changed after creation
- Structure requirements cascade (V3 requires V2, which requires V1)

---

### 4. Staking Cycles Tab
Manage staking periods and daily rates.

#### Features
- **Create New Cycle**: Add new staking duration options
- **Edit Existing Cycle**: Modify daily rates
- **Delete Cycle**: Remove unused cycles

#### Cycle Configuration Fields
1. **Duration (Days)**: Staking period length (e.g., 7, 30, 90, 360)
2. **Daily Rate (%)**: Daily yield percentage (e.g., 0.45%, 0.60%, 0.75%)

#### Cycle Card View
Each cycle displays:
- Duration in days
- Daily rate percentage
- Total return (days × daily rate)
- Edit and Delete buttons

#### Calculation Example
**90-day cycle @ 0.75% daily:**
- Daily Rate: 0.75%
- Total Return: 90 × 0.75% = 67.5%
- $1,000 stake returns: $1,675 total ($675 profit)

#### Important Notes
- Existing stakes are not affected by rate changes
- New stakes use the updated rates
- Cycles are sorted by duration automatically
- Cannot delete cycles with active stakes

---

### 5. Users Tab
User management and monitoring.

#### Features
- **Search Users**: Filter by name or email
- **View User Details**: See complete user information
- **User Metrics**: Track performance indicators

#### User Table Columns
1. **User**: Name
2. **Email**: Contact email
3. **Rank**: Current V-Rank (color-coded badge)
4. **Team Volume**: Total downline stake volume
5. **Directs**: Number of direct referrals
6. **Balance**: Current wallet balance

#### Search Functionality
- Real-time filtering
- Searches both name and email
- Case-insensitive

---

### 6. Withdrawals Tab
Manage pending withdrawal requests.

#### Features
- **Approve Withdrawals**: Process approved withdrawals
- **Reject Withdrawals**: Deny withdrawal requests
- **View Details**: See complete withdrawal information

#### Withdrawal Table Columns
1. **User**: Name and email
2. **Amount**: Withdrawal amount in USD
3. **Address**: Crypto wallet address
4. **Date**: Request date
5. **Actions**: Approve/Reject buttons

#### Approval Process
1. Admin reviews withdrawal request
2. Clicks **Approve** button
3. Confirms action in dialog
4. System:
   - Updates withdrawal status to "approved"
   - Records transaction hash
   - Sends notification to user (if configured)

#### Rejection Process
1. Admin reviews withdrawal request
2. Clicks **Reject** button
3. Confirms action in dialog
4. System:
   - Updates withdrawal status to "rejected"
   - Refunds amount to user wallet
   - Sends notification to user (if configured)

---

### 7. System Tab
System maintenance and operations.

#### Features

##### Recalculate All Ranks
- **Purpose**: Recalculate ranks for all users based on current requirements
- **Use Case**: After changing rank rules or fixing data issues
- **Process**:
  1. Fetches all users
  2. Checks each user against current rank requirements
  3. Updates ranks as needed
  4. Propagates changes up referral tree
- **Duration**: Depends on user count (typically 1-5 seconds per 100 users)

##### System Information
Displays:
- **Version**: Current system version
- **Database**: Connection status
- **Cron Jobs**: Status of automated tasks

---

## Data Export

### Export All Data
Click the **Export Data** button in the header to download complete system data as JSON.

#### Exported Data Includes
1. **Users**: All user records with:
   - ID, name, email
   - Rank, team volume, direct referrals
   - Wallet balance, referral code
   - Creation date

2. **Stakes**: All stake records with:
   - ID, user ID
   - Amount, cycle days, daily rate
   - Status, start date, end date

3. **Transactions**: All transaction records with:
   - ID, user ID
   - Amount, type, description
   - Timestamp

4. **Withdrawals**: All withdrawal records with:
   - ID, user ID
   - Amount, address, status
   - Request date

#### File Format
```json
{
  "users": [...],
  "stakes": [...],
  "transactions": [...],
  "withdrawals": [...]
}
```

#### Use Cases
- **Backup**: Regular data backups
- **Analysis**: External data analysis
- **Migration**: Moving to another system
- **Auditing**: Compliance and auditing

---

## Security

### Access Control
- **Password Protection**: Passcode required for access
- **Session Management**: Auto-logout on inactivity (implement in production)
- **Role-Based Access**: Future enhancement for multiple admin levels

### Best Practices
1. **Change Default Passcode**: Update from `admin123` immediately
2. **Use HTTPS**: Always access admin panel over secure connection
3. **Monitor Access**: Log all admin actions
4. **Regular Backups**: Export data regularly
5. **Audit Trail**: Review recent activities frequently

---

## Common Tasks

### Creating a New V-Rank

1. Navigate to **V-Ranks** tab
2. Click **Create New Rank**
3. Fill in the form:
   ```
   Rank Name: V10
   Min Team Volume: 100000000
   Min Direct Referrals: 5
   Required Rank: V9
   Required Count: 2
   Commission Rate: 65
   ```
4. Click **Create Rank**
5. System automatically recalculates user ranks

### Updating a Staking Cycle

1. Navigate to **Staking Cycles** tab
2. Find the cycle to update
3. Click the **Edit** button
4. Modify the daily rate:
   ```
   Duration: 30 (cannot change)
   Daily Rate: 0.65 (updated from 0.60)
   ```
5. Click **Update Cycle**
6. New stakes will use the updated rate

### Approving Withdrawals

1. Navigate to **Withdrawals** tab
2. Review pending withdrawal details
3. Verify:
   - User has sufficient balance
   - Wallet address is valid
   - Amount is within limits
4. Click **Approve** (checkmark icon)
5. Confirm in dialog
6. Process external transaction
7. Update with transaction hash (if needed)

### Monitoring System Health

1. Navigate to **Dashboard** tab
2. Check key metrics:
   - User growth trend
   - Active stakes count
   - Pending withdrawals
3. Navigate to **Reports** tab
4. Review:
   - Revenue trends (should be stable/growing)
   - User growth (should be positive)
   - Top performers (check for anomalies)
5. Check **Recent Activities** for unusual patterns

---

## Troubleshooting

### Issue: Ranks Not Updating
**Solution:**
1. Go to **System** tab
2. Click **Recalculate All Ranks**
3. Wait for completion
4. Check user ranks in **Users** tab

### Issue: Incorrect Team Volume
**Solution:**
1. Check for expired stakes not properly processed
2. Verify cron job is running (System tab)
3. Contact developer for manual volume recalculation

### Issue: Charts Not Loading
**Solution:**
1. Refresh the page
2. Check browser console for errors
3. Verify Convex connection status
4. Check if data queries are returning results

### Issue: Cannot Delete Rank/Cycle
**Solution:**
1. Check if users currently have that rank
2. Check if active stakes use that cycle
3. Downgrade users or wait for stakes to complete
4. Try deletion again

---

## Performance Optimization

### For Large User Bases (10,000+ users)

1. **Pagination**: Implement pagination in Users tab
2. **Lazy Loading**: Load charts on demand
3. **Caching**: Cache frequently accessed data
4. **Background Jobs**: Move rank recalculation to background
5. **Database Indexing**: Ensure proper indexes on queries

### Recommended Monitoring

- **Response Times**: Dashboard should load < 2 seconds
- **Query Performance**: Individual queries < 500ms
- **Rank Recalculation**: < 5 seconds per 100 users
- **Export Time**: < 10 seconds for full export

---

## API Reference

### Admin Queries (Convex)

```typescript
// System Overview
api.admin.getSystemOverview()

// Rank Distribution
api.admin.getRankDistribution()

// Staking Analytics
api.admin.getStakingAnalytics()

// Revenue Trends
api.admin.getRevenueTrends({ days: 30 })

// Top Performers
api.admin.getTopPerformers({ limit: 10 })

// Recent Activities
api.admin.getRecentActivities({ limit: 20 })

// Commission Breakdown
api.admin.getCommissionBreakdown()

// User Growth
api.admin.getUserGrowth({ days: 30 })

// Export All Data
api.admin.exportAllData()
```

### Admin Mutations (Convex)

```typescript
// V-Rank Management
api.adminMutations.createVRank({
  rank: "V10",
  minTeamVolume: 100000000,
  minDirectReferrals: 5,
  requiredRankDirects: { count: 2, rank: "V9" },
  commissionRate: 65
})

api.adminMutations.updateVRank({ ...same params })
api.adminMutations.deleteVRank({ rank: "V10" })

// Staking Cycle Management
api.adminMutations.createStakingCycle({
  days: 180,
  dailyRate: 0.85
})

api.adminMutations.updateStakingCycle({ ...same params })
api.adminMutations.deleteStakingCycle({ days: 180 })

// System Operations
api.adminMutations.recalculateAllRanks()
api.adminMutations.resetAllTeamVolumes()
```

---

## Future Enhancements

### Planned Features
1. **Multi-Admin Support**: Role-based access control
2. **Activity Logs**: Complete audit trail
3. **Email Notifications**: Automated alerts
4. **Advanced Analytics**: Predictive analytics and trends
5. **Bulk Operations**: Bulk user management
6. **Custom Reports**: Report builder
7. **Real-Time Dashboard**: WebSocket updates
8. **Mobile App**: Admin mobile application

### Requested Features
- CSV export option
- Advanced user filtering
- Automated withdrawal processing
- Rank change notifications
- Performance benchmarks
- A/B testing for rates

---

## Support

### Getting Help
- **Documentation**: This file and VRANK_SYSTEM.md
- **Test Scenarios**: VRANK_TEST_SCENARIOS.md
- **Quick Reference**: VRANK_QUICK_REFERENCE.md

### Reporting Issues
When reporting issues, include:
1. Current tab/section
2. Action being performed
3. Expected vs actual result
4. Browser console errors
5. Screenshot if applicable

---

## Changelog

### Version 1.0.0 (2025-11-19)
- ✅ Initial admin dashboard release
- ✅ Dashboard with real-time metrics
- ✅ Comprehensive reports and analytics
- ✅ V-Rank CRUD operations
- ✅ Staking Cycle CRUD operations
- ✅ User management
- ✅ Withdrawal approvals
- ✅ System operations
- ✅ Data export functionality

---

## Summary

The Admin Dashboard provides complete control over the AnchorChain V-Rank system with:

✅ **Real-Time Monitoring**: Live metrics and analytics  
✅ **Full Management**: Create, edit, delete ranks and cycles  
✅ **User Oversight**: Complete user management  
✅ **Financial Control**: Withdrawal approvals  
✅ **System Maintenance**: Bulk operations and recalculations  
✅ **Data Export**: Complete system backup  

The dashboard is designed to be intuitive, powerful, and scalable for managing a growing user base.
