# Presale Reporting System Documentation

## Overview

We've built a comprehensive presale reporting system for the BellAI admin dashboard with advanced analytics, vesting tracking, user insights, and export capabilities.

## 🎯 Features Implemented

### 1. **Enhanced Backend API Queries**

All queries are in `app/convex/admin.ts`:

#### `getDetailedPresaleReport`
- **Purpose**: Comprehensive purchase analytics with filtering
- **Parameters**:
  - `dateRange`: today | week | month | all | custom
  - `startDate` / `endDate`: Custom date range support
  - `status`: all | pending | confirmed | converted | cancelled
- **Returns**:
  - Summary statistics (total orders, revenue, nodes, unique buyers, conversion rates)
  - Detailed order list with user info and vesting progress
  - Time series data for trending charts

#### `getVestingScheduleReport`
- **Purpose**: Track all vesting schedules and unlock timelines
- **Returns**:
  - Overall vesting summary (locked, unlocked, claimed amounts)
  - Vesting timeline by date
  - Per-user vesting details with next unlock predictions
  - Vesting progress percentages

#### `getPresaleUserAnalytics`
- **Purpose**: Deep user behavior and segmentation analytics
- **Returns**:
  - Top 20 buyers by spend
  - Purchase size distribution (1-10, 11-25, 26-50, 51-100, 100+ nodes)
  - Buyer rank distribution
  - Average orders per buyer metrics

#### `getPresaleAuditLog`
- **Purpose**: Complete audit trail of all presale system actions
- **Parameters**: `limit` (default: 100)
- **Returns**: Chronological log of all admin actions and system events

---

### 2. **Comprehensive UI Component**

`app/components/PresaleReportsPanel.tsx` - A multi-tab reporting dashboard

#### **Tab 1: Purchase Details**
📊 **Features**:
- Real-time KPI cards:
  - Total Orders & Unique Buyers
  - Total Revenue & Avg Order Value
  - Nodes Sold & Avg Nodes/Order
  - Conversion Rate
  
- **Time Series Chart**: Orders and Revenue trends over time (dual Y-axis)
- **Searchable Table**: Filter by user name, email, or order ID
- **Order Details**: Each row shows:
  - User info (name, email, rank)
  - Purchase quantity & amount
  - Order status with color-coded badges
  - Vesting progress bar with percentage
  - Purchase date

#### **Tab 2: Vesting Schedule**
🔒 **Features**:
- **Summary Cards**:
  - Total Vesting Amount
  - Locked (with percentage)
  - Unlocked (with percentage)
  - Claimed (with percentage)

- **Timeline Chart**: Stacked bar chart showing locked/unlocked/claimed by date
- **User Vesting Table**: Per-user breakdown showing:
  - Total purchased
  - Locked / Unlocked / Claimed amounts
  - Next unlock date & amount
  - User details

#### **Tab 3: User Analytics**
📈 **Features**:
- **Top 20 Buyers Leaderboard**:
  - Ranked with medal icons (🥇🥈🥉)
  - Total spent, nodes purchased
  - Order count and average order value
  - User rank display

- **Distribution Charts**:
  - **Purchase Size Distribution**: Bar chart (1-10, 11-25, etc.)
  - **Rank Distribution**: Pie chart showing buyer ranks

- **Summary Metrics**:
  - Total unique buyers
  - Total orders
  - Average orders per buyer

#### **Tab 4: Audit Log**
📝 **Features**:
- Complete system action history
- Timestamp, action type, and details
- JSON formatted details for transparency
- Tracks:
  - Presale toggle (active/paused)
  - Staking opens
  - Order conversions
  - Admin actions

---

### 3. **Advanced Features**

#### 🔍 **Filtering & Search**
- Date range filters: Today, Week, Month, All Time, Custom
- Order status filters: All, Pending, Confirmed, Converted, Cancelled
- Live search across user names, emails, and order IDs
- Custom date range picker for precise analysis

#### 📥 **Export Capabilities**
Two export formats available:

**CSV Export**:
- Columns: Order ID, User Name, User Email, User Rank, Quantity, Total Amount, Status, Purchase Date, Converted Date, Payment TX, Vesting Unlocked %
- File naming: `presale-report-YYYY-MM-DD.csv`
- Perfect for Excel/Google Sheets analysis

**JSON Export**:
- Complete structured data export
- Includes: Export metadata, filters applied, summary stats, all order details
- File naming: `presale-report-YYYY-MM-DD.json`
- Perfect for data archival and external integrations

#### 📊 **Interactive Charts**
All charts built with Recharts library:
- Area charts (time series, dual Y-axis)
- Bar charts (vesting timeline, distributions)
- Pie charts (rank distribution)
- Responsive design
- Custom color schemes (purple, emerald, blue theme)
- Hover tooltips with detailed info

#### 🎨 **UI/UX Enhancements**
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Mode Theme**: Slate-900/800 color scheme
- **Status Badges**: Color-coded with icons
  - Pending (yellow + alert icon)
  - Confirmed (green + check icon)
  - Converted (blue + activity icon)
  - Cancelled (red + X icon)
- **Progress Bars**: Visual vesting progress indicators
- **Hover Effects**: Interactive table rows and buttons
- **Loading States**: Graceful data loading

---

## 📋 Suggested Additional Reporting Functions

Based on industry best practices, here are recommended additions:

### 1. **Financial Reports**
- Revenue forecasting based on vesting schedules
- Cash flow projections
- Refund/cancellation tracking
- Payment method breakdown

### 2. **Conversion Funnel Analytics**
- Cart abandonment rates
- Drop-off points in purchase flow
- Time-to-conversion metrics
- Retry purchase tracking

### 3. **User Cohort Analysis**
- First-time vs repeat buyers
- Buyer lifetime value (LTV)
- Churn prediction
- Retention rates by cohort

### 4. **Geographic Analytics**
- Sales by country/region (using IP data)
- Time zone purchase patterns
- Regional performance comparisons

### 5. **Marketing Attribution**
- Referral source tracking
- Campaign performance
- Promotional code usage
- Affiliate link attribution

### 6. **Risk & Compliance**
- Suspicious transaction alerts
- Duplicate purchase detection
- Velocity checks
- KYC/AML reporting

### 7. **Operational Metrics**
- Average processing time
- Failed transaction analysis
- Customer support ticket correlation
- System uptime impact on sales

### 8. **Predictive Analytics**
- Sales forecasting (ML-based)
- Demand prediction
- Optimal pricing recommendations
- Inventory planning

### 9. **Email/Notification Tracking**
- Email open rates
- Click-through rates
- Reminder effectiveness
- Notification preferences

### 10. **Comparative Reports**
- Year-over-year comparisons
- Month-over-month growth
- Benchmark against targets
- Performance vs competitors

---

## 🚀 How to Use

1. **Access Reports**: Go to Admin Dashboard → "Presale Reports" in sidebar
2. **Filter Data**: Use date range and status filters at the top
3. **Explore Tabs**: Switch between Purchase, Vesting, Analytics, and Audit tabs
4. **Search**: Use the search bar to find specific users or orders
5. **Export Data**: Click "Export CSV" or "Export JSON" buttons
6. **Analyze Charts**: Hover over charts for detailed tooltips

---

## 🔧 Technical Implementation

### Database Queries Optimized
- Indexed by `purchaseDate`, `status`, `userId`
- Efficient data aggregation
- Minimal database round-trips

### Performance Considerations
- Pagination support (ready to add)
- Query result caching (via Convex)
- Lazy loading for large datasets
- Optimized chart rendering

### Security
- Admin-only access
- Audit logging for all actions
- Secure data export

---

## 📈 Key Metrics Dashboard

The system tracks and displays:

| Metric | Description | Location |
|--------|-------------|----------|
| Total Orders | Count of all orders in selected range | Purchase Tab |
| Total Revenue | Sum of confirmed/converted orders | Purchase Tab |
| Conversion Rate | % of orders confirmed/converted | Purchase Tab |
| Unique Buyers | Count of distinct users | Purchase Tab |
| Avg Order Value | Revenue ÷ Orders | Purchase Tab |
| Vesting Progress | % of tokens unlocked | Vesting Tab |
| Top Buyers | Leaderboard by spend | Analytics Tab |
| Purchase Distribution | Segmentation by size | Analytics Tab |
| Rank Distribution | Buyers by rank | Analytics Tab |

---

## 🎓 Best Practices

1. **Regular Exports**: Export data weekly for backup
2. **Monitor Vesting**: Track upcoming unlocks to prepare for claims
3. **Review Audit Log**: Check for unusual patterns
4. **Analyze Cohorts**: Compare different time periods
5. **Track Top Buyers**: Engage with high-value users
6. **Use Custom Dates**: For quarterly/annual reports

---

## 🐛 Troubleshooting

### No Data Showing
- Check if presale is initialized
- Verify date range includes orders
- Check status filter isn't too restrictive

### Export Not Working
- Ensure browser allows downloads
- Check if data is loaded
- Try different export format

### Charts Not Rendering
- Refresh the page
- Check browser console for errors
- Ensure Recharts library is loaded

---

## 📞 Future Enhancements

Planned features:
- Real-time updates via WebSocket
- Advanced filtering (multi-select, ranges)
- Saved report templates
- Scheduled automated exports
- Email report delivery
- Dashboard customization
- Mobile app version

---

## Summary

This presale reporting system provides comprehensive insights into your presale operations with professional-grade analytics, tracking, and export capabilities. All data is accurate, real-time, and actionable for informed decision-making.

**Status**: ✅ Complete and Production-Ready
**Last Updated**: November 27, 2025
**Version**: 1.0.0


