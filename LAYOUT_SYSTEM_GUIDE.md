# Global Layout System Guide

## Overview
This document defines the standard layout system used globally across the Procurement Discipline Application. All pages should follow this structure to ensure consistency, maintainability, and professional appearance.

## Layout Architecture

### 1. **Application Container** (App.jsx)
```
┌─────────────────────────────────────────┐
│         Navbar (75px - Fixed)           │
├──────────────────┬──────────────────────┤
│                  │                      │
│   Sidebar        │   Main Content       │
│   (250px)        │   (page-wrapper)     │
│                  │                      │
└──────────────────┴──────────────────────┘
                   │
              Footer (sticky)
```

### 2. **Navbar** (Navbar.jsx)
- **Height**: 75px (fixed position)
- **Features**: Logo, menu toggle, user profile
- **Z-index**: Top layer
- **Styling**: Dark background with white text

### 3. **Sidebar** (Sidebar.jsx)
- **Width**: 250px (collapsible to ~60px)
- **Features**: Menu items with icons, submenu support, quick access
- **Styling**: Dark gradient (#1e293b → #2d3f53) with blue accents (#64b5f6)
- **Scrollable**: Custom scrollbar styling

### 4. **Main Content Area**
The main content uses a standardized layout structure:

```html
<div class="page-wrapper">
  <div class="page-container">
    <div class="page-header">
      <!-- Title, description, action buttons -->
    </div>
    <div class="page-content">
      <!-- Page-specific content -->
    </div>
  </div>
</div>
```

### 5. **Footer** (Footer.jsx)
- **Position**: Sticky to bottom
- **Height**: Auto
- **Features**: Copyright, links, support info

## Component Usage

### StandardLayout Component
The **StandardLayout** component is the recommended way to build new pages. It handles the standard structure automatically.

**Import:**
```javascript
import StandardLayout from './components/layout/StandardLayout';
```

**Basic Usage:**
```jsx
export default function MyPage() {
  return (
    <StandardLayout
      title="📊 Page Title"
      description="Brief description of this page"
      headerActions={[
        { label: '+ New Item', variant: 'primary', onClick: handleNew },
        { label: 'Export', variant: 'secondary', onClick: handleExport }
      ]}
    >
      {/* Your page content here */}
    </StandardLayout>
  );
}
```

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | ReactNode | Required | Page content |
| `title` | string | '' | Page title (can include emoji) |
| `description` | string | '' | Page description text |
| `headerActions` | Array | [] | Action buttons for header |
| `className` | string | '' | Additional CSS classes |
| `hideHeader` | boolean | false | Hide the header section |
| `customHeaderContent` | ReactNode | null | Custom header instead of default |

**Header Actions Format:**
```javascript
{
  label: 'Button Text',        // Required
  variant: 'primary',          // 'primary', 'secondary', 'info', 'warning', 'danger'
  onClick: handleClick,        // Click handler
  href: '/path'               // Optional: Use link instead of button
}
```

### Manual Layout (Alternative)
If StandardLayout doesn't fit your needs, you can manually structure:

```jsx
export default function AdvancedPage() {
  return (
    <div className="page-wrapper">
      <div className="page-container">
        <div className="page-header">
          <h1>Custom Title</h1>
          <p>Custom description</p>
        </div>
        <div className="page-content">
          {/* Content here */}
        </div>
      </div>
    </div>
  );
}
```

## CSS Classes Reference

### Layout Classes
| Class | Purpose | Notes |
|-------|---------|-------|
| `.page-wrapper` | Main page container | Flex column, min-height calc(100vh - 75px) |
| `.page-container` | Content wrapper | Max-width 1400px, centered, padding 2rem |
| `.page-header` | Header section | White background, shadow, margin-bottom 0 |
| `.page-content` | Content area | Flex column, gap 1.5rem |

### Header Components
| Class | Purpose | Notes |
|-------|---------|-------|
| `.page-header h1` | Page title | 2rem font-size, #2c3e50 color |
| `.page-header p` | Description | 0.95rem, #7f8c8d color |
| `.header-actions` | Action buttons | Flex layout, gap 1rem |

### Content Components
| Class | Purpose | Notes |
|-------|---------|-------|
| `.controls-section` | Filters/search bar | White background, flex layout |
| `.search-input` | Search field | Full-width with focus state |
| `.filter-select` | Filter dropdown | Standard select styling |
| `.data-table` | Data tables | Professional styling with hover |
| `.stats-grid` | Statistics cards | Grid layout, 4 columns |
| `.dashboard-grid` | Dashboard sections | Grid layout, responsive |
| `.dashboard-card` | Individual card | White background, shadow |

### Button Classes
| Class | Variants | Purpose |
|-------|----------|---------|
| `.btn` | Base | All buttons use this |
| `.btn-primary` | Blue | Main action buttons |
| `.btn-secondary` | Gray | Secondary actions |
| `.btn-info` | Light blue | Information buttons |
| `.btn-warning` | Orange | Warning actions |
| `.btn-danger` | Red | Destructive actions |
| `.btn-small` | Size variant | Smaller button |

**Button Usage:**
```html
<button class="btn btn-primary">Primary</button>
<button class="btn btn-secondary">Secondary</button>
<button class="btn btn-small btn-info">Small Info</button>
```

## Responsive Breakpoints

The layout is responsive with CSS media queries:

**Tablet (max-width: 768px):**
- Sidebar collapses to icon-only (60px)
- Page padding reduced to 1.5rem
- Controls section stacks vertically
- Stats grid: 2 columns instead of 4

**Mobile (max-width: 480px):**
- Sidebar slides into overlay
- Page padding reduced to 1rem
- Full-width inputs and buttons
- Stats grid: 1 column
- Tables become scrollable

## Color Scheme

**Primary Colors:**
- Primary Blue: `#0066cc`, `#0052cc`
- Secondary: `#5dade2` (sidebar accent)
- Bright Blue: `#64b5f6` (hover states)

**Neutral Colors:**
- Dark Gray: `#2c3e50` (text)
- Light Gray: `#7f8c8d` (secondary text)
- Border Gray: `#ddd`
- Background: `#f5f7fa`

**Status Colors:**
- Success Green: `#2ecc71`
- Warning Orange: `#f39c12`
- Danger Red: `#e74c3c`
- Info Blue: `#3498db`

**Dark Theme (Sidebar):**
- Gradient: `#1e293b` → `#2d3f53`
- Text: `#e2e8f0`
- Secondary: `#cbd5e1`
- Accent: `#64b5f6`

## Spacing Standards

**Padding:**
- Page container: `2rem`
- Header/Card sections: `2rem` (header), `1.5rem` (cards)
- Elements: `1rem` (standard), `0.75rem` (compact)

**Gaps/Margins:**
- Section gap: `1.5rem`
- Item gap: `1rem`
- Compact items: `0.5rem`

**Border Radius:**
- Cards/buttons: `8px`
- Inputs: `6px`
- Small elements: `4px`

## Typography

**Heading 1 (Page Title):** 
- Size: 2rem
- Weight: 700
- Color: #2c3e50

**Heading 2 (Section Title):**
- Size: 1.25rem
- Weight: 600
- Color: #2c3e50

**Body Text:**
- Size: 0.95rem
- Weight: 400
- Color: #2c3e50
- Line-height: 1.5

**Secondary Text:**
- Size: 0.85rem
- Weight: 400
- Color: #7f8c8d

## Implementation Examples

### Example 1: Simple List Page
```jsx
import StandardLayout from './components/layout/StandardLayout';
import DataTable from './components/DataTable';

export default function ItemsPage() {
  const handleNew = () => { /* ... */ };
  const handleExport = () => { /* ... */ };

  return (
    <StandardLayout
      title="📋 Items"
      description="Manage your items"
      headerActions={[
        { label: '+ New Item', variant: 'primary', onClick: handleNew },
        { label: 'Export', variant: 'secondary', onClick: handleExport }
      ]}
    >
      <DataTable items={items} columns={columns} />
    </StandardLayout>
  );
}
```

### Example 2: Dashboard with Multiple Sections
```jsx
import StandardLayout from './components/layout/StandardLayout';

export default function Dashboard() {
  return (
    <StandardLayout
      title="📊 Dashboard"
      description="Overview of your system"
    >
      <div className="stats-grid">
        {/* Stats cards */}
      </div>
      <div className="dashboard-grid">
        <div className="dashboard-card">
          {/* Content */}
        </div>
      </div>
    </StandardLayout>
  );
}
```

### Example 3: Form Page
```jsx
import StandardLayout from './components/layout/StandardLayout';

export default function EditItemPage() {
  const handleSave = () => { /* ... */ };

  return (
    <StandardLayout
      title="✏️ Edit Item"
      description="Update item details"
      headerActions={[
        { label: 'Save', variant: 'primary', onClick: handleSave },
        { label: 'Cancel', variant: 'secondary', href: '/items' }
      ]}
    >
      <form className="form-container">
        {/* Form fields */}
      </form>
    </StandardLayout>
  );
}
```

## Best Practices

1. **Always use StandardLayout** for new pages
2. **Consistent Icon Usage**: Use emoji icons (📊, ✏️, 📋, etc.) in titles
3. **Clear Descriptions**: Provide helpful page descriptions
4. **Action Buttons**: Limit to 2-3 primary actions in header
5. **Color Consistency**: Use predefined color classes for buttons
6. **Responsive First**: Test on mobile, tablet, and desktop
7. **Permission Checks**: Use `usePermissions()` hook for access control
8. **Error Boundaries**: Wrap pages in error handling
9. **Loading States**: Show spinners during async operations
10. **Empty States**: Provide helpful messages when no data

## Migration Guide

**Converting Existing Pages to StandardLayout:**

1. Identify the page structure:
   ```jsx
   // OLD
   <div className="page-wrapper">
     <div className="page-container">
       <div className="page-header">
         <h1>Title</h1>
       </div>
       {/* content */}
     </div>
   </div>
   ```

2. Import StandardLayout:
   ```jsx
   import StandardLayout from './components/layout/StandardLayout';
   ```

3. Replace with StandardLayout:
   ```jsx
   <StandardLayout
     title="Title"
     description="..."
     headerActions={[...]}
   >
     {/* content */}
   </StandardLayout>
   ```

4. Test responsive layout on different screen sizes

## Troubleshooting

**Issue: Content extends beyond container**
- Solution: Use `.page-wrapper` and `.page-container` classes

**Issue: Navbar overlaps content**
- Solution: Ensure `margin-top: 75px` on `.page-wrapper`

**Issue: Sidebar overlaps content**
- Solution: Check `.app-container` has proper layout in App.jsx

**Issue: Footer not sticking to bottom**
- Solution: Verify `.page-wrapper` uses `flex-direction: column`

**Issue: Responsive layout breaking**
- Solution: Check media queries in pages.css for proper breakpoints

## Files Reference

| File | Purpose |
|------|---------|
| `/components/layout/StandardLayout.jsx` | Standard layout component |
| `/components/layout/Navbar.jsx` | Top navigation bar |
| `/components/layout/Sidebar.jsx` | Left sidebar navigation |
| `/components/layout/Footer.jsx` | Bottom footer |
| `/pages/pages.css` | Layout and page styles |
| `/App.css` | App-level styles |
| `/App.jsx` | Main app container |

## Future Enhancements

- [ ] Add layout templates for different page types (form, list, grid, kanban)
- [ ] Create component library with pre-styled sections
- [ ] Add animation transitions between pages
- [ ] Implement theme switcher (light/dark mode)
- [ ] Add RTL language support
- [ ] Create accessibility guidelines
