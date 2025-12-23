/**
 * Menu Validator Utility
 * 
 * Validates that all sidebar menu items have corresponding routes in ROUTES configuration
 * Helps identify menu items that point to non-existent pages
 */

import ROUTES, { NAVIGATION_MENU } from '../routes';

class MenuValidator {
  /**
   * Get all menu item paths from navigation menu
   */
  getAllMenuPaths() {
    const paths = [];
    
    NAVIGATION_MENU.forEach(section => {
      if (section.items && Array.isArray(section.items)) {
        section.items.forEach(item => {
          if (item.path) {
            paths.push({
              path: item.path,
              name: item.name,
              section: section.section
            });
          }
        });
      }
    });
    
    return paths;
  }

  /**
   * Get all route paths from ROUTES configuration
   */
  getAllRoutePaths() {
    return ROUTES.map(route => ({
      path: route.path,
      name: route.name,
      component: !!route.component
    }));
  }

  /**
   * Check if a path exists in ROUTES
   */
  pathExistsInRoutes(path) {
    return ROUTES.some(route => route.path === path);
  }

  /**
   * Validate all menu items have corresponding routes
   */
  validateMenuItems() {
    const menuPaths = this.getAllMenuPaths();
    const routePaths = this.getAllRoutePaths();
    
    const results = {
      total: menuPaths.length,
      valid: [],
      missing: [],
      orphaned: []
    };

    // Check if menu items exist in routes
    menuPaths.forEach(menuItem => {
      const routeExists = routePaths.some(route => route.path === menuItem.path);
      
      if (routeExists) {
        results.valid.push(menuItem);
      } else {
        results.missing.push(menuItem);
      }
    });

    // Check for orphaned routes (in ROUTES but not in menu)
    routePaths.forEach(route => {
      const inMenu = menuPaths.some(item => item.path === route.path);
      
      if (!inMenu && !route.path.includes(':') && route.path !== '/login') {
        // Exclude parameterized routes and login from orphaned check
        results.orphaned.push(route);
      }
    });

    return results;
  }

  /**
   * Print validation summary to console
   */
  printSummary() {
    const results = this.validateMenuItems();
    
    console.group('📋 Menu Validation Report');
    console.log(`Total Menu Items: ${results.total}`);
    console.log(`Valid Routes: ${results.valid.length} ✅`);
    console.log(`Missing Routes: ${results.missing.length} ❌`);
    console.log(`Orphaned Routes: ${results.orphaned.length} ⚠️`);
    
    if (results.missing.length > 0) {
      console.group('❌ Missing Routes (Menu Items Without Routes):');
      results.missing.forEach(item => {
        console.log(`  • ${item.name} (${item.path}) in [${item.section}]`);
      });
      console.groupEnd();
    }

    if (results.orphaned.length > 0) {
      console.group('⚠️ Orphaned Routes (Routes Not in Menu):');
      results.orphaned.forEach(route => {
        console.log(`  • ${route.name} (${route.path})`);
      });
      console.groupEnd();
    }

    if (results.missing.length === 0 && results.orphaned.length === 0) {
      console.log('✅ All menu items have valid routes and all non-parameterized routes are in menu');
    }
    
    console.groupEnd();
    
    return results;
  }

  /**
   * Export validation results as JSON
   */
  exportResults() {
    return {
      timestamp: new Date().toISOString(),
      results: this.validateMenuItems(),
      menuPaths: this.getAllMenuPaths(),
      routePaths: this.getAllRoutePaths()
    };
  }

  /**
   * Download validation results to file
   */
  downloadResults() {
    const data = this.exportResults();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `menu-validation-${new Date().getTime()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Detailed comparison showing all menu items vs routes
   */
  detailedComparison() {
    const menuPaths = this.getAllMenuPaths();
    const routePaths = this.getAllRoutePaths();
    
    console.group('📊 Detailed Menu vs Routes Comparison');
    console.table(menuPaths.map(menu => {
      const route = routePaths.find(r => r.path === menu.path);
      return {
        'Path': menu.path,
        'Menu Name': menu.name,
        'Section': menu.section,
        'In Routes': route ? '✅' : '❌',
        'Route Name': route?.name || 'N/A',
        'Has Component': route?.component ? '✅' : '❌'
      };
    }));
    console.groupEnd();
  }
}

// Create singleton instance
const menuValidator = new MenuValidator();

// Make available globally in console
if (typeof window !== 'undefined') {
  window.menuValidator = menuValidator;
  console.log('✅ Menu Validator initialized - use: menuValidator.printSummary() or menuValidator.validateMenuItems()');
}

export default menuValidator;
