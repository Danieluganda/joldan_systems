/**
 * Route Validation Utility
 * Tests accessibility of all routes and menu items
 * Can be run from browser console
 */

import ROUTES from '../routes';

class RouteValidator {
  constructor() {
    this.results = {
      total: 0,
      accessible: 0,
      inaccessible: 0,
      notFound: 0,
      routes: []
    };
  }

  /**
   * Validate a single route
   */
  async validateRoute(route) {
    const result = {
      path: route.path,
      name: route.name,
      status: 'pending',
      component: route.component?.name || 'Unknown',
      error: null,
      requiredPermission: route.requiredPermission || 'none',
      isPublic: route.isPublic || false
    };

    try {
      // Check if component exists
      if (!route.component) {
        result.status = 'error';
        result.error = 'Component not defined';
        return result;
      }

      // Check if component is a valid React component
      if (typeof route.component !== 'function') {
        result.status = 'error';
        result.error = 'Component is not a valid React component';
        return result;
      }

      // Try to instantiate the component
      try {
        const instance = route.component({});
        if (instance && (instance.$$typeof || instance.type)) {
          result.status = 'accessible';
        } else {
          result.status = 'warning';
          result.error = 'Component did not render properly';
        }
      } catch (e) {
        result.status = 'error';
        result.error = e.message;
      }
    } catch (error) {
      result.status = 'error';
      result.error = error.message;
    }

    return result;
  }

  /**
   * Validate all routes
   */
  async validateAllRoutes() {
    console.log('🧪 Starting Route Validation...\n');
    this.results.total = ROUTES.length;

    for (const route of ROUTES) {
      const result = await this.validateRoute(route);
      this.results.routes.push(result);

      if (result.status === 'accessible') {
        this.results.accessible++;
        console.log(`✅ ${result.path.padEnd(30)} - ${result.name}`);
      } else if (result.status === 'warning') {
        this.results.inaccessible++;
        console.log(`⚠️  ${result.path.padEnd(30)} - ${result.name} (${result.error})`);
      } else {
        this.results.notFound++;
        console.log(`❌ ${result.path.padEnd(30)} - ${result.name} (${result.error})`);
      }
    }

    this.printSummary();
    return this.results;
  }

  /**
   * Validate menu structure
   */
  validateMenuStructure() {
    console.log('\n🔍 Menu Structure Validation...\n');

    const menuPaths = [
      '/',
      '/dashboard',
      '/procurement-setup',
      '/planning',
      '/templates',
      '/rfqs',
      '/rfq/new',
      '/clarifications',
      '/submissions',
      '/evaluations',
      '/approvals',
      '/awards',
      '/contracts',
      '/audit'
    ];

    const results = {
      defined: [],
      missing: []
    };

    menuPaths.forEach(path => {
      const route = ROUTES.find(r => 
        r.path === path || 
        r.path.startsWith(path + '/') || 
        path === r.path
      );

      if (route) {
        results.defined.push({
          path,
          route: route.name,
          component: route.component?.name
        });
        console.log(`✅ ${path.padEnd(30)} -> ${route.name}`);
      } else {
        results.missing.push(path);
        console.log(`❌ ${path.padEnd(30)} NOT FOUND IN ROUTES`);
      }
    });

    console.log(`\n📊 Summary: ${results.defined.length} defined, ${results.missing.length} missing`);
    return results;
  }

  /**
   * Check for broken import references
   */
  checkImports() {
    console.log('\n📦 Component Import Check...\n');

    const componentCheck = {
      valid: [],
      invalid: []
    };

    ROUTES.forEach(route => {
      if (!route.component) {
        componentCheck.invalid.push({
          path: route.path,
          name: route.name,
          error: 'Component is undefined'
        });
        console.log(`❌ ${route.path} - Component undefined`);
      } else if (typeof route.component !== 'function') {
        componentCheck.invalid.push({
          path: route.path,
          name: route.name,
          error: `Component is ${typeof route.component}, not a function`
        });
        console.log(`❌ ${route.path} - Invalid component type`);
      } else {
        componentCheck.valid.push({
          path: route.path,
          name: route.name,
          component: route.component.name
        });
        console.log(`✅ ${route.path} - ${route.component.name}`);
      }
    });

    console.log(`\n✅ Valid: ${componentCheck.valid.length} | ❌ Invalid: ${componentCheck.invalid.length}`);
    return componentCheck;
  }

  /**
   * Check for permission mismatches
   */
  checkPermissions() {
    console.log('\n🔐 Permission Check...\n');

    const permissionCheck = {
      withPermissions: [],
      withoutPermissions: [],
      public: []
    };

    ROUTES.forEach(route => {
      if (route.isPublic) {
        permissionCheck.public.push(route.path);
        console.log(`🔓 ${route.path.padEnd(30)} - PUBLIC`);
      } else if (route.requiredPermission) {
        permissionCheck.withPermissions.push({
          path: route.path,
          permission: route.requiredPermission
        });
        console.log(`🔐 ${route.path.padEnd(30)} - Requires: ${route.requiredPermission}`);
      } else {
        permissionCheck.withoutPermissions.push(route.path);
        console.log(`⚠️  ${route.path.padEnd(30)} - No permission required`);
      }
    });

    console.log(`\n📊 Summary: ${permissionCheck.public.length} public, ${permissionCheck.withPermissions.length} protected, ${permissionCheck.withoutPermissions.length} unprotected`);
    return permissionCheck;
  }

  /**
   * Print summary report
   */
  printSummary() {
    console.log('\n' + '='.repeat(70));
    console.log('📊 ROUTE VALIDATION SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total Routes:    ${this.results.total}`);
    console.log(`✅ Accessible:   ${this.results.accessible}`);
    console.log(`⚠️  Warning:      ${this.results.inaccessible}`);
    console.log(`❌ Not Found:    ${this.results.notFound}`);
    console.log('='.repeat(70) + '\n');

    if (this.results.notFound > 0) {
      console.log('❌ BROKEN ROUTES:\n');
      this.results.routes
        .filter(r => r.status === 'error')
        .forEach(r => {
          console.log(`  • ${r.path} - ${r.name}`);
          console.log(`    Error: ${r.error}\n`);
        });
    }

    if (this.results.inaccessible > 0) {
      console.log('⚠️  WARNINGS:\n');
      this.results.routes
        .filter(r => r.status === 'warning')
        .forEach(r => {
          console.log(`  • ${r.path} - ${r.name}`);
          console.log(`    Issue: ${r.error}\n`);
        });
    }
  }

  /**
   * Export results as JSON
   */
  exportResults() {
    return {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.total,
        accessible: this.results.accessible,
        inaccessible: this.results.inaccessible,
        notFound: this.results.notFound
      },
      details: this.results.routes
    };
  }

  /**
   * Download results as file
   */
  downloadResults() {
    const data = this.exportResults();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `route-validation-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('📥 Results downloaded!');
  }
}

// Create singleton instance
const routeValidator = new RouteValidator();

// Export and make available globally
window.routeValidator = routeValidator;

export default routeValidator;
