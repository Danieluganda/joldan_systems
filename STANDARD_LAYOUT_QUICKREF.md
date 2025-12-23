# StandardLayout Quick Reference

## What is StandardLayout?

StandardLayout is a reusable React component that provides a consistent page structure for all pages in the Procurement Discipline Application. It automatically handles:

- Page wrapper with proper spacing
- Page header with title and description
- Action buttons in the header
- Content area with responsive styling
- Integration with navbar, sidebar, and footer

## Quick Start

### Basic Usage
```jsx
import StandardLayout from './components/layout/StandardLayout';

export default function MyPage() {
  return (
    <StandardLayout
      title="📊 Page Title"
      description="Page description"
    >
      {/* Your content here */}
    </StandardLayout>
  );
}
```

### With Action Buttons
```jsx
import StandardLayout from './components/layout/StandardLayout';

export default function MyPage() {
  return (
    <StandardLayout
      title="📋 Items"
      description="Manage your items"
      headerActions={[
        { label: '+ New', variant: 'primary', onClick: () => {} },
        { label: 'Export', variant: 'secondary', onClick: () => {} }
      ]}
    >
      {/* Your content here */}
    </StandardLayout>
  );
}
```

## Props Reference

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `children` | ReactNode | Yes | - | Page content |
| `title` | string | No | '' | Page title (can include emoji) |
| `description` | string | No | '' | Subtitle/description |
| `headerActions` | Array | No | [] | Action buttons |
| `className` | string | No | '' | Extra CSS classes |
| `hideHeader` | boolean | No | false | Hide header section |
| `customHeaderContent` | ReactNode | No | null | Custom header |

## Header Actions Format

```javascript
[
  {
    label: 'Button Text',        // Required: Display text
    variant: 'primary',          // Optional: 'primary' (blue), 'secondary' (gray), 'info', 'warning', 'danger'
    onClick: handleClick,        // Optional: Click handler function
    href: '/path'               // Optional: Make it a link instead of button
  }
]
```

## Button Variants

| Variant | Color | Use Case |
|---------|-------|----------|
| `primary` | Blue | Main actions |
| `secondary` | Gray | Secondary/alternative actions |
| `info` | Light Blue | Information/help |
| `warning` | Orange | Warning actions |
| `danger` | Red | Destructive actions |

## Examples

### Dashboard Page
```jsx
import StandardLayout from './components/layout/StandardLayout';

export default function Dashboard() {
  return (
    <StandardLayout
      title="📊 Dashboard"
      description="Overview of your procurement system"
    >
      <div className="stats-grid">
        {/* Stats cards */}
      </div>
      <div className="dashboard-grid">
        {/* Dashboard cards */}
      </div>
    </StandardLayout>
  );
}
```

### List Page with Create Action
```jsx
import StandardLayout from './components/layout/StandardLayout';
import { useNavigate } from 'react-router-dom';

export default function ItemsPage() {
  const navigate = useNavigate();

  return (
    <StandardLayout
      title="📋 Items"
      description="All items in the system"
      headerActions={[
        { 
          label: '+ New Item', 
          variant: 'primary', 
          onClick: () => navigate('/items/new') 
        }
      ]}
    >
      <table className="data-table">
        {/* Table content */}
      </table>
    </StandardLayout>
  );
}
```

### Form Page with Save/Cancel
```jsx
import StandardLayout from './components/layout/StandardLayout';
import { useNavigate } from 'react-router-dom';

export default function EditItemPage() {
  const navigate = useNavigate();

  const handleSave = () => {
    // Save logic
  };

  return (
    <StandardLayout
      title="✏️ Edit Item"
      description="Update item information"
      headerActions={[
        { label: 'Save', variant: 'primary', onClick: handleSave },
        { label: 'Cancel', variant: 'secondary', href: '/items' }
      ]}
    >
      <form>
        {/* Form fields */}
      </form>
    </StandardLayout>
  );
}
```

### Search/Filter with Multiple Actions
```jsx
import StandardLayout from './components/layout/StandardLayout';

export default function SearchPage() {
  return (
    <StandardLayout
      title="🔍 Search Results"
      description="Find procurement items"
      headerActions={[
        { label: '+ New Search', variant: 'primary', onClick: () => {} },
        { label: 'Save Search', variant: 'secondary', onClick: () => {} },
        { label: 'Export', variant: 'info', onClick: () => {} }
      ]}
    >
      <div className="controls-section">
        <input type="text" placeholder="Search..." className="search-input" />
        <select className="filter-select">
          <option>All Categories</option>
        </select>
      </div>
      
      <div className="data-table">
        {/* Results */}
      </div>
    </StandardLayout>
  );
}
```

### Empty State Handling
```jsx
import StandardLayout from './components/layout/StandardLayout';

export default function EmptyPage() {
  const [items, setItems] = useState([]);

  return (
    <StandardLayout
      title="📦 Procurements"
      description="Manage procurement requests"
      headerActions={[
        { label: '+ New Procurement', variant: 'primary', onClick: () => {} }
      ]}
    >
      {items.length === 0 ? (
        <div className="empty-state">
          <p>No procurements yet</p>
          <button className="btn btn-primary">Create your first one</button>
        </div>
      ) : (
        <div className="data-table">
          {/* Table content */}
        </div>
      )}
    </StandardLayout>
  );
}
```

## CSS Classes Used Internally

StandardLayout uses these CSS classes (already defined in pages.css):

```css
.page-wrapper              /* Main container */
.page-container            /* Content area */
.page-header               /* Header section */
.page-header h1            /* Title */
.page-header p             /* Description */
.header-actions            /* Action buttons container */
.page-content              /* Content area */
```

You don't need to manually apply these - StandardLayout handles it!

## Content Structure Inside StandardLayout

Everything you put in `children` goes inside the `.page-content` div:

```
StandardLayout
├── .page-wrapper
│   └── .page-container
│       ├── .page-header
│       │   ├── h1 (title)
│       │   ├── p (description)
│       │   └── .header-actions (buttons)
│       └── .page-content
│           └── {children}  ← Your content goes here
```

## Migration from Old Pages

### Before (manual structure):
```jsx
<div className="page-wrapper">
  <div className="page-container">
    <div className="page-header">
      <h1>Title</h1>
      <p>Description</p>
    </div>
    <div className="page-content">
      {/* content */}
    </div>
  </div>
</div>
```

### After (with StandardLayout):
```jsx
<StandardLayout title="Title" description="Description">
  {/* content */}
</StandardLayout>
```

## Styling Content Inside StandardLayout

Your content automatically gets proper spacing. Use these classes:

```jsx
<StandardLayout title="Items">
  {/* Simple content - auto spaced */}
  <p>Hello world</p>

  {/* Multiple sections - auto gapped */}
  <div className="stats-grid">
    {/* 4-column grid */}
  </div>

  {/* Data table */}
  <div className="table-container">
    <table className="data-table">
      {/* Table content */}
    </table>
  </div>

  {/* Controls section */}
  <div className="controls-section">
    <input className="search-input" />
    <select className="filter-select" />
  </div>
</StandardLayout>
```

## Responsive Behavior

StandardLayout is fully responsive:

- **Desktop**: Full width, proper spacing
- **Tablet (max-width: 768px)**: Adjusted padding, stacked controls
- **Mobile (max-width: 480px)**: Compact spacing, single column

No additional work needed - it's automatic!

## Common Patterns

### Pattern 1: List with Search
```jsx
<StandardLayout
  title="📋 Items"
  headerActions={[
    { label: '+ New', variant: 'primary', onClick: handleNew }
  ]}
>
  <div className="controls-section">
    <input placeholder="Search..." className="search-input" />
  </div>
  <table className="data-table">
    {/* Items */}
  </table>
</StandardLayout>
```

### Pattern 2: Dashboard with Cards
```jsx
<StandardLayout title="📊 Dashboard">
  <div className="stats-grid">
    {/* Stats */}
  </div>
  <div className="dashboard-grid">
    {/* Cards */}
  </div>
</StandardLayout>
```

### Pattern 3: Form Page
```jsx
<StandardLayout
  title="✏️ Edit"
  headerActions={[
    { label: 'Save', variant: 'primary', onClick: save },
    { label: 'Cancel', href: '/back' }
  ]}
>
  <form>{/* Fields */}</form>
</StandardLayout>
```

### Pattern 4: Detail View with Actions
```jsx
<StandardLayout
  title="📌 Details"
  headerActions={[
    { label: 'Edit', variant: 'info', onClick: edit },
    { label: 'Delete', variant: 'danger', onClick: delete }
  ]}
>
  <div className="detail-card">
    {/* Details */}
  </div>
</StandardLayout>
```

## Troubleshooting

**Issue: Content looks cramped**
- Solution: Content already has proper spacing from `.page-content` gap

**Issue: Header buttons overflow**
- Solution: They automatically stack on mobile via flexbox

**Issue: Title is too long**
- Solution: Use shorter titles or descriptions on mobile

**Issue: Custom header layout**
- Solution: Use `customHeaderContent` prop:
```jsx
<StandardLayout
  customHeaderContent={<div>Your custom header</div>}
>
  {/* content */}
</StandardLayout>
```

## File Locations

| File | Purpose |
|------|---------|
| `/components/layout/StandardLayout.jsx` | Component definition |
| `/pages/pages.css` | Styling |
| `LAYOUT_SYSTEM_GUIDE.md` | Comprehensive guide |
| `STANDARD_LAYOUT_QUICKREF.md` | This file |

## Next Steps

1. Use StandardLayout for all new pages
2. Gradually migrate existing pages to use it
3. Refer to this guide for common patterns
4. Check LAYOUT_SYSTEM_GUIDE.md for detailed information

---

**Pro Tip**: Always include an emoji in your title! 📊 Dashboard, 📋 Items, ✏️ Edit, 📄 Documents, etc.
