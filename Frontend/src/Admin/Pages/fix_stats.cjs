const fs = require('fs');
const path = 'd:/Q Techx Projects/Webs/Saree_Web_Sites/frontend/src/Admin/Pages/Users.jsx';
let code = fs.readFileSync(path, 'utf-8');

// 1. Add computed stats before return
const statsBlock = `    // Computed Stats from real data
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.status === 'Active').length;
    const inactiveUsers = users.filter(u => u.status === 'Inactive').length;
    const adminUsers = users.filter(u => u.role === 'admin').length;
    const regularUsers = users.filter(u => u.role === 'user' || !u.role).length;
    const adminPct = totalUsers ? Math.round((adminUsers / totalUsers) * 100) : 0;
    const userPct = totalUsers ? Math.round((regularUsers / totalUsers) * 100) : 0;

    return (`;

code = code.replace('    return (', statsBlock);

// 2. Replace hardcoded card values with dynamic values
code = code
  .replace('>1,248<', '>{totalUsers.toLocaleString()}<')
  .replace('>1,102<', '>{activeUsers.toLocaleString()}<')
  .replace('>146<', '>{inactiveUsers.toLocaleString()}<')
  .replace('>542<', '>{adminUsers.toLocaleString()}<')
  .replace('>706<', '>{regularUsers.toLocaleString()}<')
  .replace('>43.4% of total<', '>{adminPct}% of total<')
  .replace('>56.6% of total<', '>{userPct}% of total<')
  .replace('>Male Customers<', '>Admin Users<')
  .replace('>Female Customers<', '>Regular Users<');

fs.writeFileSync(path, code, 'utf-8');
console.log('Done');
