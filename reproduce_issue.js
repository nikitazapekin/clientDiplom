const buildTestCodeOld = (userCode, input, lang, funcName) => {
  if (!funcName) return userCode;

  let parsedInput;
  try {
    parsedInput = JSON.parse(input);
  } catch {
    parsedInput = input;
  }

  // OLD LOGIC: Spread if array
  const args = Array.isArray(parsedInput) ? parsedInput : [parsedInput];

  if (lang === "javascript") {
    const argsStr = args.map((arg) => JSON.stringify(arg)).join(", ");
    return `${userCode}\nconsole.log(JSON.stringify(${funcName}(${argsStr})));`;
  }
  return userCode;
};

const buildTestCodeNew = (userCode, input, lang, funcName) => {
  if (!funcName) return userCode;

  let parsedInput;
  try {
    parsedInput = JSON.parse(input);
  } catch {
    parsedInput = input;
  }

  // NEW LOGIC: Always wrap to prevent spread
  const args = [parsedInput];

  if (lang === "javascript") {
    const argsStr = args.map((arg) => JSON.stringify(arg)).join(", ");
    return `${userCode}\nconsole.log(JSON.stringify(${funcName}(${argsStr})));`;
  }
  return userCode;
};

const userCode = "function yourFunction(n) { return n.sort((a,b)=>a-b) }";
const funcName = "yourFunction";
const input = "[3,2,1]";

console.log("--- OLD LOGIC ---");
const oldCode = buildTestCodeOld(userCode, input, "javascript", funcName);
console.log(oldCode);
// Expected: yourFunction(3, 2, 1) -> Crash

console.log("\n--- NEW LOGIC ---");
const newCode = buildTestCodeNew(userCode, input, "javascript", funcName);
console.log(newCode);
// Expected: yourFunction([3, 2, 1]) -> Success
