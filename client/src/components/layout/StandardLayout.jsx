/**
 * StandardLayout Component
 * 
 * Reusable layout wrapper for all pages in the application
 * Provides consistent page structure with:
 * - Page wrapper with proper spacing
 * - Page header with title, description, and action buttons
 * - Page content container with responsive styling
 * - Integration with navbar (75px offset) and footer
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Page content
 * @param {string} props.title - Page title (with optional emoji prefix)
 * @param {string} props.description - Page description text
 * @param {Array<Object>} props.headerActions - Action buttons for header
 *   @param {string} headerActions[].label - Button label
 *   @param {string} headerActions[].variant - Button variant: 'primary' | 'secondary' | 'info' | 'warning' | 'danger'
 *   @param {function} headerActions[].onClick - Click handler
 *   @param {string} headerActions[].href - (optional) Link href instead of onClick
 * @param {string} props.className - Additional CSS classes for page-container
 * @param {boolean} props.hideHeader - Hide header section (default: false)
 * @param {string} props.customHeaderContent - Custom header content (replaces default header)
 * 
 * @example
 * <StandardLayout
 *   title="📊 Dashboard"
 *   description="Welcome back! Overview of your activities"
 *   headerActions={[
 *     { label: '+ New Item', variant: 'primary', onClick: handleNew },
 *     { label: 'Schedule', variant: 'secondary', onClick: handleSchedule }
 *   ]}
 * >
 *   {/* Page content here */}
 * </StandardLayout>
 */
export default function StandardLayout({
  children,
  title = '',
  description = '',
  headerActions = [],
  className = '',
  hideHeader = false,
  customHeaderContent = null
}) {
  return (
    <div className="page-wrapper">
      <div className={`page-container ${className}`.trim()}>
        {/* Header Section */}
        {!hideHeader && (
          <div className="page-header">
            {customHeaderContent ? (
              customHeaderContent
            ) : (
              <>
                <div>
                  {title && <h1>{title}</h1>}
                  {description && <p>{description}</p>}
                </div>
                {headerActions.length > 0 && (
                  <div className="header-actions">
                    {headerActions.map((action, index) => (
                      <button
                        key={index}
                        className={`btn btn-${action.variant || 'primary'}`}
                        onClick={action.onClick}
                        {...(action.href && { as: 'a', href: action.href })}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Page Content */}
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}
