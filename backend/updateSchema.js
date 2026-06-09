const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// 1. Fix NudgeLog Relation
schema = schema.replace(/goalId\s+String\?\s+@map\("goal_id"\)\s+@db\.Uuid\n/g, '');
schema = schema.replace(/goal\s+Goal\?\s+@relation\(fields:\s*\[goalId\],\s*references:\s*\[id\]\)\n/g, '');

// 2. Increase Decimal Precision in ActivityLog
schema = schema.replace(/completionFraction\s+Decimal\s+@default\(0\)\s+@map\("completion_fraction"\)\s+@db\.Decimal\(5,\s*4\)/g, 'completionFraction Decimal   @default(0) @map("completion_fraction") @db.Decimal(8, 6)');

// 3. Add onDelete: SetNull for optional User relations
const setNullRelations = [
  'winner', 'resolver', 'remover', 'gifter', 'template', 'conditionGoal'
];

// Helper to replace relation
function updateRelation(modelPart, relationName, newRule) {
  const regex = new RegExp(`(${relationName}\\s+[A-Za-z]+\\??\\s+@relation\\([^)]+)(?!,\\s*onDelete)`);
  return modelPart.replace(regex, `$1, onDelete: ${newRule}`);
}

// Global Regex approach:
// For all `@relation(fields: [...], references: [id])` without onDelete, we add onDelete: Cascade
// unless it's an optional relation (marked with ? on the model, or in setNullRelations).
// Actually, Prisma schema regex is tricky. Let's do it by lines.

let lines = schema.split('\n');
for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // Find relation lines
  if (line.includes('@relation(') && !line.includes('onDelete:')) {
    // Check if it's an array relation (no fields/references inside the current model)
    // E.g. `ownedCircles Circle[] @relation("CircleOwner")`
    // These don't get onDelete clauses on the array side, only the scalar side.
    if (!line.includes('fields:')) continue;

    let newRule = 'Cascade';
    
    // Check if the relation field itself is optional (contains '?')
    const words = line.trim().split(/\s+/);
    const fieldType = words[1]; // e.g. User? or GoalInstance
    
    if (fieldType.endsWith('?') || setNullRelations.some(name => line.includes(` ${name} `))) {
      newRule = 'SetNull';
    }
    
    // Insert onDelete
    // Find the closing parenthesis of @relation(...)
    const relationEndIdx = line.lastIndexOf(')');
    if (relationEndIdx !== -1) {
      lines[i] = line.slice(0, relationEndIdx) + `, onDelete: ${newRule}` + line.slice(relationEndIdx);
    }
  }
}

schema = lines.join('\n');

fs.writeFileSync(schemaPath, schema);
console.log('Schema updated successfully.');
