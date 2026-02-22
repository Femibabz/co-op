import React from 'react';
import ApplyPage from './src/app/apply/page';

console.log('Testing ApplyPage imports...');
try {
    // We can't easily render the component in Node, but we can check if it initializes
    console.log('ApplyPage component:', typeof ApplyPage);
    console.log('Test successful (imports work)');
} catch (err) {
    console.error('Test failed (import error):', err);
    process.exit(1);
}
