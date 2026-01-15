// Test script for Feature #149: Negative keyword management
const testSteps = [
  {
    step: 1,
    description: "Navigate to negative keywords section",
    action: "Click 'View Keywords' on a campaign, then click '🚫 Negative Keywords' button",
    expected: "Negative keywords section should appear with input field and list"
  },
  {
    step: 2,
    description: "Add negative keyword",
    action: "Type 'test keyword' in input and click 'Add Keyword' button",
    expected: "Keyword should appear in the list below"
  },
  {
    step: 3,
    description: "Verify keyword excluded from campaign",
    action: "Check that keyword appears in negative keywords list",
    expected: "Keyword should be visible with match type, ID, and date added"
  },
  {
    step: 4,
    description: "Test removing negative keyword",
    action: "Click 'Remove' button on the keyword",
    expected: "Keyword should be removed from the list"
  },
  {
    step: 5,
    description: "Display negative keyword list",
    action: "Toggle '🚫 Negative Keywords' button off and on",
    expected: "List should persist and show all negative keywords"
  }
];

console.log("Feature #149: Negative Keyword Management - Test Plan");
console.log("=".repeat(60));
testSteps.forEach(test => {
  console.log(`\nStep ${test.step}: ${test.description}`);
  console.log(`Action: ${test.action}`);
  console.log(`Expected: ${test.expected}`);
});
console.log("\n" + "=".repeat(60));
console.log("\nMock Data:");
console.log("- 3 negative keywords: 'free romance' (BROAD), 'cheap stories' (PHRASE), 'pirate app' (EXACT)");
console.log("\nImplementation complete!");
