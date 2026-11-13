# Inventory Table UX/HCI Recommendations

## 🎯 Current Columns vs Recommended

### Current Table Columns:
1. Vaccine Type
2. Facility Clinic (Tagoloan ABTC)
3. Vaccine / Batch No. (with FIFO badges)
4. Stock Quantity
5. Expiration Date
6. Status
7. Actions

---

## 💡 Recommendation: **Option 2 (Enhanced)**

After analyzing your DOH stock card format and considering user workflow, here's my recommendation:

### Option 2: Balanced Information Density ⭐ RECOMMENDED

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ Vaccine Type    │ Batch No.   │ Received  │ Dispensed │ Balance │ Expiry  │ Actions│
│                 │ + FIFO      │ From      │ (Used)    │         │         │        │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ Anti-Rabies     │ ARV-2026-01 │ DOH       │    25     │  125    │ Dec 2026│ [...] │
│ Vaccine         │ 🟢 USE FIRST│ Regional  │  vials    │  vials  │ (89d)   │       │
│                 │             │           │           │         │ 🟠 Soon │       │
├─────────────────────────────────────────────────────────────────────────────────────┤
│ Equirab (RIG)   │ EQ-2026-003 │ Provincial│    10     │   35    │ Mar 2027│ [...] │
│ 1000IU          │ ⏳ FIFO #2  │ Stock     │  vials    │  vials  │ (180d)  │       │
│                 │             │           │           │         │ 🟢 Good │       │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Why This Works Best:**

✅ **Follows DOH Stock Card Logic** - Users see the same columns they use daily  
✅ **At-a-Glance Usage Tracking** - Quickly see how much was received vs used  
✅ **Running Balance** - Critical for inventory decisions  
✅ **FIFO Integration** - Priority badges still visible  
✅ **Information Hierarchy** - Most important data (balance, FIFO) stands out  

---

## 📊 Detailed Comparison of Options

### Option 1: Minimal (DOH-Only Columns)
```
Vaccine Type │ Batch No. │ Received From │ Dispensed │ Balance │ Expiry │ Actions
```

**Pros:**
- Clean, simple
- Matches DOH stock card exactly
- Easy to scan

**Cons:**
- ❌ No FIFO indicators visible
- ❌ Missing status (active/expired)
- ❌ Less context per row

**Use Case:** Only if you want exact DOH replica

---

### Option 2: Balanced (Recommended) ⭐
```
Vaccine Type │ Batch + FIFO │ Received From │ Dispensed │ Balance │ Expiry + Warning │ Actions
```

**Pros:**
- ✅ DOH columns present
- ✅ FIFO badges integrated
- ✅ Expiry warnings visible
- ✅ Shows usage patterns
- ✅ Good information density

**Cons:**
- Slightly wider table
- More data per row

**Use Case:** Daily operations by inventory staff ⭐ **BEST CHOICE**

---

### Option 3: Comprehensive (Maximum Info)
```
Facility │ Vaccine Type │ Batch + FIFO │ Received │ Dispensed │ Transferred │ Expired │ Balance │ Expiry │ Status │ Txns │ Actions
```

**Pros:**
- ✅ All possible information
- ✅ Includes transfers & expired tracking
- ✅ Transaction count visible

**Cons:**
- ❌ Information overload
- ❌ Requires wide screen
- ❌ Harder to scan quickly
- ❌ Too many columns

**Use Case:** Detailed audit reports only (not main table)

---

## 🎨 Recommended Implementation (Option 2)

### Column Structure:

| Column | Width | Content | Purpose |
|--------|-------|---------|---------|
| **1. Vaccine Type** | 20% | Name + ID | Primary identifier |
| **2. Batch No. + FIFO** | 15% | Batch + badge | FIFO priority |
| **3. Received From** | 12% | Source/supplier | Traceability |
| **4. Dispensed** | 10% | Used quantity | Usage tracking |
| **5. Balance** | 10% | Current stock | Critical info |
| **6. Expiration** | 15% | Date + warning | Safety |
| **7. Status** | 10% | Active/Expired | Quick filter |
| **8. Actions** | 8% | Buttons | Operations |

**Total:** 100% width, optimized for 1366px+ screens

---

## 💻 Visual Design Mockup

### Recommended Table Row:

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                           │
│  Anti-Rabies Vaccine (Verorab 0.5ml)                                                     │
│  ID: #1247                                                                                │
│                                                                                           │
│  ┌────────────┬──────────────┬────────────┬──────────┬─────────────┬─────────────┐      │
│  │ ARV-2026-  │ DOH Regional │    25      │   125    │  Dec 1, 2026│  [Actions]  │      │
│  │ 0823       │ Office       │   vials    │  vials   │   (89 days) │   [...]     │      │
│  │            │              │   used     │          │             │             │      │
│  │ 🟢 USE     │              │            │          │  🟠 EXPIRES │             │      │
│  │   FIRST    │              │            │          │     SOON    │             │      │
│  └────────────┴──────────────┴────────────┴──────────┴─────────────┴─────────────┘      │
│                                                                                           │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### Color Coding:
- **Green (#10b981)**: FIFO priority, good stock, active status
- **Orange (#f59e0b)**: Expiring soon (<30d), low stock (<10)
- **Red (#dc2626)**: Expired, depleted
- **Gray (#6b7280)**: Neutral info (received from, etc.)

---

## 📱 Responsive Behavior

### Desktop (>1200px):
Show all 8 columns in full width

### Tablet (768px - 1200px):
```
Stack vertically:
Row 1: Vaccine Type | Batch + FIFO | Balance | Actions
Row 2: Received From | Dispensed | Expiry + Status
```

### Mobile (<768px):
```
Card layout:
┌─────────────────────────────────────┐
│ Anti-Rabies Vaccine                  │
│ ARV-2026-0823  🟢 USE FIRST         │
│                                      │
│ Received: DOH Regional               │
│ Dispensed: 25 vials                  │
│ Balance: 125 vials                   │
│ Expiry: Dec 2026 🟠 Expires Soon    │
│                                      │
│ [Adjust] [History] [Delete]          │
└─────────────────────────────────────┘
```

---

## 🔄 Interactive Features

### 1. Quick Info Tooltip
Hover over any cell to see:
```
┌─────────────────────────────────────┐
│ Dispensed: 25 vials                  │
│ ─────────────────────────────────   │
│ • Used in treatments: 23             │
│ • Adjusted: 2                        │
│ • Last dispensed: Aug 20, 2026       │
│                                      │
│ Click to view transaction history   │
└─────────────────────────────────────┘
```

### 2. Expandable Row (Optional)
Click row to expand and show:
- Full transaction history (last 5)
- Related treatment records
- Expiry countdown
- Quick actions (adjust, view stock card)

### 3. Column Sorting
- Click column header to sort
- FIFO priority always appears first (pinned)
- Balance sorts by quantity
- Expiry sorts by date

### 4. Quick Filters
Above table:
```
[All] [🟢 FIFO Priority] [🟠 Expiring Soon] [🔴 Low Stock] [Active Only]
```

---

## 💾 Implementation Code

Here's the updated column structure:

```typescript
const columns: ColumnDef<InventoryItem>[] = [
  // 1. Vaccine Type
  {
    key: 'vaccine_type',
    header: 'Vaccine Type',
    render: item => (
      <Box>
        <Typography sx={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>
          {item.vaccine_type}
        </Typography>
        <Typography sx={{ fontSize: 11.5, color: '#9ca3af', mt: 0.25 }}>
          ID: #{item.inventory_id}
        </Typography>
      </Box>
    ),
  },
  
  // 2. Batch Number + FIFO
  {
    key: 'batch_number',
    header: 'Batch No. / FIFO',
    render: item => {
      const isFifo = item.is_fifo_priority && item.status === 'active';
      return (
        <Box>
          <Typography sx={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700 }}>
            {item.batch_number}
          </Typography>
          {isFifo && (
            <Chip label="🟢 USE FIRST" size="small" sx={{ 
              mt: 0.5, height: 20, fontSize: 10, fontWeight: 800,
              bgcolor: '#dcfce7', color: '#15803d'
            }} />
          )}
        </Box>
      );
    },
  },
  
  // 3. Received From (NEW)
  {
    key: 'received_from',
    header: 'Received From',
    render: item => (
      <Typography sx={{ fontSize: 13, color: '#6b7280' }}>
        {item.received_from || 'Initial Stock'}
      </Typography>
    ),
  },
  
  // 4. Dispensed (NEW)
  {
    key: 'dispensed',
    header: 'Dispensed',
    render: item => (
      <Box>
        <Typography sx={{ fontSize: 15, fontWeight: 600, color: '#dc2626' }}>
          {item.total_dispensed || 0}
        </Typography>
        <Typography sx={{ fontSize: 11, color: '#9ca3af' }}>vials used</Typography>
      </Box>
    ),
  },
  
  // 5. Balance (UPDATED from current_quantity)
  {
    key: 'balance',
    header: 'Balance',
    render: item => {
      const low = item.current_quantity > 0 && item.current_quantity <= 10;
      const zero = item.current_quantity === 0;
      return (
        <Box>
          <Typography sx={{
            fontSize: 16, fontWeight: 700,
            color: zero ? '#dc2626' : low ? '#f59e0b' : '#059669',
          }}>
            {item.current_quantity}
          </Typography>
          <Typography sx={{ fontSize: 11, color: '#6b7280' }}>
            vials
          </Typography>
        </Box>
      );
    },
  },
  
  // 6. Expiration Date + Warning
  {
    key: 'expiration',
    header: 'Expiration',
    render: item => {
      const days = daysUntil(item.expiration_date);
      return (
        <Box>
          <Typography sx={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
            {formatDate(item.expiration_date)}
          </Typography>
          <Typography sx={{
            fontSize: 11, fontWeight: 600,
            color: days < 0 ? '#dc2626' : days <= 30 ? '#f59e0b' : '#6b7280',
          }}>
            {days < 0 ? `🔴 Expired` : days <= 30 ? `🟠 ${days}d left` : `🟢 ${days}d`}
          </Typography>
        </Box>
      );
    },
  },
  
  // 7. Status
  {
    key: 'status',
    header: 'Status',
    render: item => {
      const statusConfig = {
        active: { label: 'Active', color: '#059669', bg: '#ecfdf5' },
        expired: { label: 'Expired', color: '#dc2626', bg: '#fee2e2' },
        depleted: { label: 'Depleted', color: '#6b7280', bg: '#f3f4f6' },
      };
      const s = statusConfig[item.status];
      return (
        <Chip label={s.label} size="small" sx={{
          bgcolor: s.bg, color: s.color, fontWeight: 600, fontSize: 11
        }} />
      );
    },
  },
  
  // 8. Actions
  {
    key: 'actions',
    header: 'Actions',
    render: item => (
      <Stack direction="row" spacing={0.5}>
        {/* Stock Card, Adjust, History, Delete buttons */}
      </Stack>
    ),
  },
];
```

---

## 📊 Data Requirements

### Backend Changes Needed:

```php
// VaccineInventoryController@index()
// Add these calculated fields to the response:

$inventory->getCollection()->transform(function ($item) {
    // Calculate total dispensed
    $item->total_dispensed = $item->transactions()
        ->where('transaction_type', 'used')
        ->sum('dispensed');
    
    // Get most recent received_from
    $lastReceived = $item->transactions()
        ->where('transaction_type', 'received')
        ->orderBy('transaction_date', 'desc')
        ->first();
    
    $item->received_from = $lastReceived->received_from ?? 'Initial Stock';
    
    return $item;
});
```

---

## 🎯 Final Recommendation

### ⭐ Implement Option 2 with these columns:

1. **Vaccine Type** (20%) - Name + ID
2. **Batch + FIFO** (15%) - Number + priority badge
3. **Received From** (12%) - Source/supplier
4. **Dispensed** (10%) - Total used
5. **Balance** (10%) - Current stock (highlighted)
6. **Expiration** (15%) - Date + warning
7. **Status** (10%) - Active/Expired chip
8. **Actions** (8%) - Button group

### Benefits:
✅ Matches DOH stock card workflow  
✅ Shows critical info at a glance  
✅ FIFO priority clearly visible  
✅ Balance emphasized (most important)  
✅ Not overwhelming (8 columns vs 11+)  
✅ Mobile-friendly (can stack)  
✅ Follows HCI principles (scan pattern F-shape)  

### User Feedback Expected:
- "I can see everything I need without clicking"
- "The FIFO badge tells me which batch to use"
- "Balance column helps me know when to reorder"
- "Expiry warnings prevent waste"

---

Would you like me to implement this recommended layout?

**Prepared:** August 23, 2026  
**Status:** Design Complete - Ready for Implementation
