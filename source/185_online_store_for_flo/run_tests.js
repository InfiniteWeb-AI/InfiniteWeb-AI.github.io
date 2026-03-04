
// Test runner script
// Setup localStorage mock for Node.js environment
// Require node-localstorage (must be installed via npm install)
const { LocalStorage } = require('node-localstorage');
global.localStorage = new LocalStorage('./test-storage');

// Clear any previous test data
localStorage.clear();

const BusinessLogic = require('./business_logic.js');
const TestRunner = require('./test_flows.js');

console.log('Running TDD-generated tests...');
console.log('================================\n');

const logic = new BusinessLogic();
const runner = new TestRunner(logic);
const results = runner.runAllTests();

console.log('\n================================');
console.log(`Total: ${results.length}`);
console.log(`Passed: ${results.filter(r => r.success).length}`);
console.log(`Failed: ${results.filter(r => !r.success).length}`);

// Clean up localStorage after tests
localStorage.clear();

if (results.every(r => r.success)) {
    console.log('\n✅ All tests passed!');
    process.exit(0);
} else {
    console.log('\n❌ Some tests failed');
    process.exit(1);
}
