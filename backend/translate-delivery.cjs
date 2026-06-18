const fs = require('fs');
const path = require('path');

const deliveryAdminPath = 'C:\\Users\\USER\\Desktop\\Meeramoot-Electiontric-Item-reparing-management-system-\\backend\\src\\controllers\\delivery-admin-controller.ts';

let content = fs.readFileSync(deliveryAdminPath, 'utf8');

// Simple translation of deliveryAgentId to riderName
content = content.replace(/deliveryAgentId/g, 'riderName');
content = content.replace(/riderProfile/g, 'riderName');

fs.writeFileSync(deliveryAdminPath, content, 'utf8');

const deliveryControllerPath = 'C:\\Users\\USER\\Desktop\\Meeramoot-Electiontric-Item-reparing-management-system-\\backend\\src\\controllers\\delivery-controller.ts';
let content2 = fs.readFileSync(deliveryControllerPath, 'utf8');
content2 = content2.replace(/deliveryAgentId/g, 'riderName');
content2 = content2.replace(/riderProfile/g, 'riderName');
fs.writeFileSync(deliveryControllerPath, content2, 'utf8');

console.log('Translated delivery queries.');
