// publicationFormatters.js
// Format for 4 outlets

module.exports = {
  formatForOutlet1(notice) {
    // Format logic for Outlet 1
    return { ...notice, outlet: 'Outlet1' };
  },
  formatForOutlet2(notice) {
    // Format logic for Outlet 2
    return { ...notice, outlet: 'Outlet2' };
  },
  formatForOutlet3(notice) {
    // Format logic for Outlet 3
    return { ...notice, outlet: 'Outlet3' };
  },
  formatForOutlet4(notice) {
    // Format logic for Outlet 4
    return { ...notice, outlet: 'Outlet4' };
  }
};
