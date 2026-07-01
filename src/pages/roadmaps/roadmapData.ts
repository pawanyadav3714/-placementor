export interface Topic {
  id: string;
  title: string;
  estimatedTime: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  objectives: string[];
  summary: string;
  syntax: string;
  explanation: string;
  codeExample: string;
  expectedOutput: string;
  mistakes: string[];
  bestPractices: string[];
  extractions?: string[];
  tip?: string;
  quiz: {
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  };
  mdnLink: string;
  // DSA Specific fields
  whyExists?: string;
  whereUsed?: string;
  realWorldApps?: string[];
  operations?: { name: string; complexity: string; description: string }[];
  complexityTable?: { scenario: string; time: string; space: string }[];
  dryRun?: string;
  exampleProblems?: { title: string; link?: string }[];
  companyQuestions?: string[];
  interviewTips?: string[];
}

export interface Module {
  id: number;
  title: string;
  description: string;
  iconName: string;
  topics: Topic[];
}

export const roadmapModules: Module[] = [
  {
    id: 1,
    title: "Introduction to JavaScript",
    description: "Learn what JavaScript is, its rich history, how engines like V8 execute code, and the fundamental differences between browser and Node.js environments.",
    iconName: "Compass",
    topics: [
      {
        id: "what-is-javascript",
        title: "What is JavaScript?",
        estimatedTime: "10 mins",
        difficulty: "Beginner",
        objectives: [
          "Define what JavaScript is and its role in modern web development.",
          "Understand the core difference between HTML, CSS, and JavaScript.",
          "Write and execute your first lines of console code."
        ],
        summary: "JavaScript is a lightweight, interpreted, or just-in-time compiled programming language with first-class functions. It is best known as the scripting language for Web pages.",
        syntax: "// Standard inline comment\nconsole.log('Hello, MDN World!');",
        explanation: "JavaScript (JS) is a dynamic programming language that adds interactivity and complex features to websites. While HTML provides structure and CSS handles layout/styling, JavaScript gives web pages behavior—enabling responses to user interaction, data fetching, dynamic layout updates, and more. Modern JS engines execute code incredibly fast using Just-In-Time (JIT) compilation.",
        codeExample: "// Try modifying the greeting message below!\nconst message = \"Hello, MDN Student!\";\nconsole.log(message);\nconsole.log(\"JavaScript is officially running!\");",
        expectedOutput: "Hello, MDN Student!\nJavaScript is officially running!",
        mistakes: [
          "Confusing JavaScript with Java (they are completely different languages with different paradigms).",
          "Forgetting that JavaScript is case-sensitive (e.g., console.log is different from Console.Log)."
        ],
        bestPractices: [
          "Always use console.log() to debug and inspect values during development.",
          "Use descriptive variable and constant names for readability."
        ],
        quiz: {
          question: "Which of the following is the primary purpose of JavaScript in web browsers?",
          options: [
            "To define the semantic structure of a document",
            "To apply visual presentation styles and animations",
            "To add dynamic behavior and interactive scripting capabilities",
            "To manage relational server-side databases exclusively"
          ],
          correct: 2,
          explanation: "JavaScript is primarily used to add dynamic behavior and interactivity to web pages, complementing HTML (structure) and CSS (styles)."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/First_steps/What_is_JavaScript"
      },
      {
        id: "history-of-javascript",
        title: "History of JavaScript",
        estimatedTime: "10 mins",
        difficulty: "Beginner",
        objectives: [
          "Explain who created JavaScript and when.",
          "Understand the name changes and the origin of ECMAScript."
        ],
        summary: "JavaScript was created by Brendan Eich in 10 days in September 1995 while working at Netscape, originally named Mocha, then LiveScript, and finally JavaScript.",
        syntax: "// Evolution timeline\nconst birthYear = 1995;\nconsole.log('JS Born in:', birthYear);",
        explanation: "JavaScript was created to give web designers a lightweight scripting language. In 1997, Netscape submitted JavaScript to ECMA International for standardization, resulting in ECMAScript (the official standard specification behind JavaScript implementations).",
        codeExample: "const creator = \"Brendan Eich\";\nconst company = \"Netscape\";\nconst creationYear = 1995;\nconsole.log(`${creator} created JavaScript at ${company} in ${creationYear}.`);",
        expectedOutput: "Brendan Eich created JavaScript at Netscape in 1995.",
        mistakes: [
          "Assuming ECMAScript and JavaScript are separate, unrelated programming languages.",
          "Thinking JS was built slowly over years (the initial prototype was built in just 10 days!)."
        ],
        bestPractices: [
          "Refer to ECMAScript specifications (like ES6, ES2020) to understand modern browser feature support."
        ],
        quiz: {
          question: "Who is the original creator of the JavaScript language?",
          options: [
            "Brendan Eich",
            "Tim Berners-Lee",
            "James Gosling",
            "Guido van Rossum"
          ],
          correct: 0,
          explanation: "Brendan Eich designed Mocha/LiveScript (later JavaScript) in 10 days in September 1995 while at Netscape."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/About_JavaScript"
      },
      {
        id: "javascript-engine",
        title: "JavaScript Engine",
        estimatedTime: "15 mins",
        difficulty: "Intermediate",
        objectives: [
          "Understand how the engine parses and compiles code.",
          "Identify popular JS engines like Chrome's V8 and Safari's JavaScriptCore."
        ],
        summary: "A JavaScript engine is a program or interpreter that executes JavaScript code. Modern engines use Just-In-Time (JIT) compiling to transform source code into machine bytecode.",
        syntax: "// Virtual representation of compilation\nconst code = 'const x = 5;';\nconst bytecode = compile(code);\nrun(bytecode);",
        explanation: "JS engines parse source code into an Abstract Syntax Tree (AST), then compile that AST into bytecode. If a block of code runs frequently, the engine's JIT compiler optimizes it directly into machine assembly for native execution speeds.",
        codeExample: "const engineName = \"V8\";\nconst browser = \"Google Chrome / Node.js\";\nconsole.log(`The most famous JS engine is ${engineName}, powering ${browser}.`);",
        expectedOutput: "The most famous JS engine is V8, powering Google Chrome / Node.js.",
        mistakes: [
          "Believing JS is purely interpreted like 90s scripting languages. Modern engines use powerful hybrid compilers.",
          "Thinking all browsers share the same JS engine. (Safari uses JavaScriptCore, Firefox uses SpiderMonkey)."
        ],
        bestPractices: [
          "Write predictable code shapes (avoid changing object properties dynamically after instantiation) to allow engines to optimize hidden classes."
        ],
        quiz: {
          question: "Which JS engine powers Google Chrome and Node.js?",
          options: [
            "SpiderMonkey",
            "JavaScriptCore",
            "V8",
            "Chakra"
          ],
          correct: 2,
          explanation: "Google Chrome and Node.js are both powered by the open-source V8 engine, developed by Google."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Glossary/Engine/JavaScript"
      },
      {
        id: "ecmascript",
        title: "ECMAScript (ES)",
        estimatedTime: "10 mins",
        difficulty: "Beginner",
        objectives: [
          "Distinguish between JavaScript and ECMAScript.",
          "Recall the significance of ES6 (ES2015) in modern JS."
        ],
        summary: "ECMAScript is the standard specification for scripting languages, standardized by ECMA-262. JavaScript is the implementation of this standard.",
        syntax: "// Checking ES6+ features\nconst arrowFn = () => 'I am an ES6 arrow function!';\nconsole.log(arrowFn());",
        explanation: "ECMAScript acts as the blueprint. Every year, a new edition of ECMA-262 is released (ES2015/ES6, ES2016, etc.), adding language features like classes, promises, optional chaining, and more.",
        codeExample: "const version = \"ES6 / ES2015\";\nconst features = [\"let/const\", \"Arrow Functions\", \"Promises\", \"Classes\"];\nconsole.log(`Modern JS began with the release of ${version}, bringing features like:`, features.join(\", \"));",
        expectedOutput: "Modern JS began with the release of ES6 / ES2015, bringing features like: let/const, Arrow Functions, Promises, Classes",
        mistakes: [
          "Calling ECMAScript a separate programming language you can install."
        ],
        bestPractices: [
          "Use transpilers like Babel or modern builders (Vite, esbuild) to compile modern ECMAScript features for older browsers."
        ],
        quiz: {
          question: "What is the relationship between JavaScript and ECMAScript?",
          options: [
            "JavaScript is a dialect, whereas ECMAScript is an outdated standard.",
            "ECMAScript is the specification standard, and JavaScript is its primary implementation.",
            "They are completely distinct, competing programming languages.",
            "ECMAScript is the server-side version of standard browser JavaScript."
          ],
          correct: 1,
          explanation: "ECMAScript is the official specification standard (ECMA-262), and JavaScript is the language implementing it."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Language_overview"
      },
      {
        id: "browser-vs-node",
        title: "Browser vs Node.js",
        estimatedTime: "12 mins",
        difficulty: "Intermediate",
        objectives: [
          "Compare browser DOM environment with Node's OS environment.",
          "Contrast the global objects: window vs global."
        ],
        summary: "Browsers focus on user interaction (DOM, window, fetch). Node.js is a server-side runtime that provides OS access, file systems (fs), and network modules.",
        syntax: "// Browser uses: window.location\n// Node uses: global, process, require/import",
        explanation: "Both run JavaScript using V8, but their APIs differ. In the browser, you manipulate HTML via `document` and listen for clicks. In Node.js, you read files, start HTTP web servers, and manage system resources.",
        codeExample: "const environment = typeof window !== 'undefined' ? 'Browser' : 'Node.js';\nconsole.log(`Currently executing in: ${environment}`);\nif (environment === 'Node.js') {\n  console.log('You have native server powers!');\n} else {\n  console.log('You can access document and window!');\n}",
        expectedOutput: "Currently executing in: Node.js\nYou have native server powers!",
        mistakes: [
          "Trying to run document.querySelector() inside a Node.js server script (it will throw ReferenceError: document is not defined).",
          "Attempting to use Node's 'fs' filesystem library directly in standard client-side browser scripts."
        ],
        bestPractices: [
          "Write isomorphic/universal JS code when building fullstack apps to make sure it runs safely in both environments without crashing."
        ],
        quiz: {
          question: "Which global object exists natively in the web browser but NOT in standard Node.js?",
          options: [
            "process",
            "window",
            "global",
            "console"
          ],
          correct: 1,
          explanation: "The 'window' object represents the browser's window and DOM environment, which does not exist in the server-side Node.js environment."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Glossary/Browser"
      },
      {
        id: "how-javascript-works",
        title: "How JavaScript Works",
        estimatedTime: "15 mins",
        difficulty: "Intermediate",
        objectives: [
          "Explain what it means that JavaScript is single-threaded.",
          "Describe the Call Stack and the Call Queue."
        ],
        summary: "JavaScript is a single-threaded, non-blocking, asynchronous concurrent programming language. It executes code synchronously via the Call Stack, and offloads async tasks to the host environment.",
        syntax: "// Call Stack Execution flow\nfunction second() { console.log('Two'); }\nfunction first() { second(); }\nfirst();",
        explanation: "JavaScript has a single Call Stack. When an async function (like `setTimeout` or `fetch`) is called, the Web API (or Node environment) processes it in the background, then queues its callback. The Event Loop pushes the callback onto the stack when the stack is empty.",
        codeExample: "console.log('First (Sync)');\nsetTimeout(() => {\n  console.log('Third (Async Callback)');\n}, 0);\nconsole.log('Second (Sync)');",
        expectedOutput: "First (Sync)\nSecond (Sync)\nThird (Async Callback)",
        mistakes: [
          "Assuming setTimeout(..., 0) will execute the code immediately. It must wait for the Call Stack to be completely clear."
        ],
        bestPractices: [
          "Avoid blocking the Call Stack with heavy computational loops, as this freezes browser paint and user responsiveness."
        ],
        quiz: {
          question: "What is the primary role of the JavaScript Event Loop?",
          options: [
            "To speed up mathematical computations using multi-core processors",
            "To monitor the Call Stack and push callbacks from the Callback Queue onto the stack once it is empty",
            "To parse the Abstract Syntax Tree into bytecode",
            "To compile JavaScript code into native browser CSS rules"
          ],
          correct: 1,
          explanation: "The Event Loop continuously checks if the Call Stack is empty, and if so, takes the first callback from the queue and executes it."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop"
      }
    ]
  },
  {
    id: 2,
    title: "Variables and Data Types",
    description: "Understand variable scoping rules with var, let, and const, and master JS primitive types versus reference types.",
    iconName: "Variable",
    topics: [
      {
        id: "var-let-const",
        title: "var, let, and const",
        estimatedTime: "12 mins",
        difficulty: "Beginner",
        objectives: [
          "Understand block scope vs function scope.",
          "Identify how hoisting affects var, let, and const differently."
        ],
        summary: "var is function-scoped and hoisted with undefined. let and const are block-scoped and exist in the 'Temporal Dead Zone' until declared.",
        syntax: "let dynamicVar = 'val';\nconst constantVar = 'fixed';\nvar oldSchool = 'scope-loose';",
        explanation: "With ES6, let and const replaced var. block-scoped variables only exist within curly braces `{}`. const ensures variables cannot be reassigned (though objects assigned to const can still have their properties mutated!).",
        codeExample: "const studentName = \"Pawan\";\nlet score = 90;\nscore = 95; // perfectly valid\n\ntry {\n  studentName = \"New Name\"; // will fail\n} catch (err) {\n  console.log(\"Cannot reassign const:\", err.message);\n}\nconsole.log(`${studentName}'s score is ${score}`);",
        expectedOutput: "Cannot reassign const: Assignment to constant variable.\nPawan's score is 95",
        mistakes: [
          "Thinking const variables are fully immutable. Only the variable reference is immutable; object properties inside a const object can be changed.",
          "Using var in modern code, leading to subtle bugs due to hoisting and leaking of block bounds."
        ],
        bestPractices: [
          "Default to const. Only use let if you explicitly expect to reassign the variable.",
          "Never use var in modern JavaScript development."
        ],
        quiz: {
          question: "What scope rule applies to variables declared with 'let' and 'const'?",
          options: [
            "They are globally scoped only",
            "They are block-scoped",
            "They are function-scoped only",
            "They do not obey scoping rules"
          ],
          correct: 1,
          explanation: "Variables declared with let and const are strictly block-scoped, meaning they are bound to the closest surrounding curly braces {}."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Grammar_and_types#declaring_variables"
      },
      {
        id: "primitive-types",
        title: "Primitive Types",
        estimatedTime: "15 mins",
        difficulty: "Beginner",
        objectives: [
          "List the 7 primitive types in JavaScript.",
          "Explain the difference between undefined and null."
        ],
        summary: "JavaScript has 7 primitives: String, Number, BigInt, Boolean, Undefined, Null, and Symbol. Primitives are immutable and passed by value.",
        syntax: "const str = 'text';\nconst num = 42;\nconst bool = true;\nconst empty = null;\nlet undef;",
        explanation: "In JavaScript, primitive values are stored directly in the stack, representing a single value. Undefined means a variable has been declared but not assigned. Null is an intentional absence of value.",
        codeExample: "const valString = \"A\";\nconst valNum = 123;\nconst valBigInt = 9007199254740991n;\nconst valNull = null;\nlet valUndef;\n\nconsole.log(typeof valString);\nconsole.log(typeof valNum);\nconsole.log(typeof valBigInt);\nconsole.log(typeof valNull); // note the famous object bug!\nconsole.log(typeof valUndef);",
        expectedOutput: "string\nnumber\nbigint\nobject\nundefined",
        mistakes: [
          "Believing typeof null is 'null' (it historically returns 'object' in JS, a legacy bug).",
          "Attempting to mutate primitive values (e.g. changing a character in a string directly via str[0] = 'X')."
        ],
        bestPractices: [
          "Use null for intentional empty values, and reserve undefined for uninitialized variables."
        ],
        quiz: {
          question: "What does 'typeof null' return in JavaScript due to a legacy design quirk?",
          options: [
            "\"null\"",
            "\"undefined\"",
            "\"object\"",
            "\"string\""
          ],
          correct: 2,
          explanation: "In JavaScript, typeof null returns 'object'. This is a historical bug from the original implementation, preserved for backward compatibility."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Glossary/Primitive"
      }
    ]
  },
  {
    id: 3,
    title: "Operators",
    description: "Master arithmetic, logical, comparison operators, and modern operators like Nullish Coalescing and Optional Chaining.",
    iconName: "Zap",
    topics: [
      {
        id: "comparison-logical",
        title: "Comparison and Logical Operators",
        estimatedTime: "12 mins",
        difficulty: "Beginner",
        objectives: [
          "Explain the difference between double equals (==) and triple equals (===).",
          "Identify truthy and falsy values."
        ],
        summary: "Strict equality (===) checks both value and type, whereas loose equality (==) performs type coercion first. Logical operators && and || return actual values, not just booleans.",
        syntax: "const match = (5 === '5'); // false\nconst looseMatch = (5 == '5'); // true",
        explanation: "Double equals triggers implicit conversion (type coercion). Falsy values include: false, 0, -0, 0n, '', null, undefined, and NaN. Everything else is truthy, including empty arrays [] and empty objects {}.",
        codeExample: "console.log(\"Loose equal:\", 1 == '1');\nconsole.log(\"Strict equal:\", 1 === '1');\n\n// Short-circuit evaluations\nconst name = \"\" || \"Anonymous\";\nconsole.log(\"User:\", name);",
        expectedOutput: "Loose equal: true\nStrict equal: false\nUser: Anonymous",
        mistakes: [
          "Using Loose equality (==) which can lead to extremely weird coercion results (e.g., [] == false is true).",
          "Thinking && always returns a boolean. It returns the first falsy operand, or the last operand if all are truthy."
        ],
        bestPractices: [
          "Always use strict equality (=== and !==) to ensure type safety.",
          "Use triple equals to protect against unexpected type coercion bugs."
        ],
        quiz: {
          question: "Which expression yields true?",
          options: [
            "0 === false",
            "'' === false",
            "null == undefined",
            "[] === []"
          ],
          correct: 2,
          explanation: "Loose equality null == undefined evaluates to true because they both represent an empty/unassigned value under coercion rules."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Expressions_and_Operators#comparison_operators"
      },
      {
        id: "optional-nullish",
        title: "Nullish Coalescing & Optional Chaining",
        estimatedTime: "10 mins",
        difficulty: "Beginner",
        objectives: [
          "Explain how ?? is safer than || for default values.",
          "Use optional chaining (?.) to traverse nested objects safely."
        ],
        summary: "Nullish coalescing (??) returns the right-hand side ONLY when the left is null or undefined. Optional chaining (?.) safely short-circuits to undefined if a nested key is missing.",
        syntax: "const value = obj?.property?.nested;\nconst defaultValue = value ?? 'fallback';",
        explanation: "Historically, developers used `||` for default values, but that broke when the value was a valid falsy value like `0` or `''`. `??` only reacts to `null` or `undefined`. `?.` avoids throwing 'Cannot read properties of undefined' errors.",
        codeExample: "const user = {\n  profile: {\n    xp: 0\n  }\n};\n\n// Using OR || returns fallback for 0\nconsole.log(\"XP with ||:\", user.profile.xp || 100);\n// Using Nullish ?? preserves 0\nconsole.log(\"XP with ??:\", user.profile.xp ?? 100);\n\n// Optional Chaining\nconsole.log(\"Social Link:\", user.profile.social?.twitter);",
        expectedOutput: "XP with ||: 100\nXP with ??: 0\nSocial Link: undefined",
        mistakes: [
          "Using ?? when you want to fallback on empty strings. Use || if empty strings or zero should be overridden.",
          "Overusing optional chaining everywhere, hiding actual bugs where data structures should be guaranteed."
        ],
        bestPractices: [
          "Use ?? to assign default configuration parameters where 0 or false are active, valid options.",
          "Combine ?. and ?? together for super resilient default configurations."
        ],
        quiz: {
          question: "What does the Nullish Coalescing operator (??) consider as 'nullish'?",
          options: [
            "0 and false",
            "null and undefined only",
            "Empty strings and NaN",
            "Any falsy value"
          ],
          correct: 1,
          explanation: "The nullish coalescing operator ?? checks specifically for null or undefined. Other falsy values like 0, false, or empty string are preserved."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing"
      }
    ]
  },
  {
    id: 4,
    title: "Control Flow",
    description: "Learn conditions, loops, break, continue, and how to control code execution pathways.",
    iconName: "GitFork",
    topics: [
      {
        id: "if-else-switch",
        title: "If...Else & Switch",
        estimatedTime: "10 mins",
        difficulty: "Beginner",
        objectives: [
          "Understand conditional branching logic.",
          "Compare if...else chains with switch statements."
        ],
        summary: "Conditional statements are used to perform different actions based on different conditions.",
        syntax: "if (condition) { ... } else { ... }\nswitch(val) { case 1: ... }",
        explanation: "Conditional statements allow your code to make decisions. Use if/else for range checks or complex boolean logic. Use switch when you have many fixed values to compare against a single variable.",
        codeExample: "const score = 85;\nif (score >= 90) {\n  console.log(\"A Grade\");\n} else if (score >= 80) {\n  console.log(\"B Grade\");\n} else {\n  console.log(\"C Grade\");\n}",
        expectedOutput: "B Grade",
        mistakes: [
          "Using = instead of === in conditions.",
          "Forgetting 'break' in switch cases leading to fall-through."
        ],
        bestPractices: [
          "Use switch for cleaner code when matching multiple discrete values.",
          "Always include a 'default' case in switch statements."
        ],
        quiz: {
          question: "What happens if you omit the 'break' statement in a switch case?",
          options: [
            "It throws a syntax error",
            "Execution 'falls through' to the next case automatically",
            "The program terminates",
            "The switch statement restarts"
          ],
          correct: 1,
          explanation: "Without a break, execution continues to the next case regardless of whether the condition matches."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/if...else"
      },
      {
        id: "for-statement",
        title: "For Statement",
        estimatedTime: "12 mins",
        difficulty: "Beginner",
        objectives: [
          "Master the standard 3-part for loop.",
          "Understand the execution order of initialization, condition, and afterthought."
        ],
        summary: "The for statement creates a loop that consists of three optional expressions, enclosed in parentheses and separated by semicolons.",
        syntax: "for (initialization; condition; afterthought) {\n  statement\n}",
        explanation: "A for loop repeats until a specified condition evaluates to false. It's the most common loop for iterating a specific number of times.",
        extractions: [
          "Apply style changes to the selected element(s).",
          "Initializing expression is executed once before the loop starts.",
          "Condition is evaluated before every iteration. If true, statements execute.",
          "Afterthought (increment) is executed after the statements in the loop.",
          "Control returns to the condition check after each afterthought."
        ],
        codeExample: "for (let i = 0; i < 3; i++) {\n  console.log(\"Iteration:\", i);\n}",
        expectedOutput: "Iteration: 0\nIteration: 1\nIteration: 2",
        mistakes: [
          "Infinite loops due to incorrect condition or increment.",
          "Off-by-one errors (starting at 1 instead of 0 or using <= instead of <)."
        ],
        bestPractices: [
          "Declare the counter variable with 'let' to keep it scoped to the loop."
        ],
        tip: "All three parts of the for loop are optional. for(;;) creates an infinite loop — always ensure the condition can become false or use break.",
        quiz: {
          question: "When is the afterthought expression in a for loop executed?",
          options: [
            "Before the condition is checked",
            "After the loop body executes",
            "Only at the very end of the entire loop",
            "Before the loop body executes"
          ],
          correct: 1,
          explanation: "The afterthought is executed after the loop body but before the next condition check."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for"
      },
      {
        id: "while-statement",
        title: "While Statement",
        estimatedTime: "10 mins",
        difficulty: "Beginner",
        objectives: [
          "Implement loops with dynamic conditions.",
          "Understand entry-controlled loops."
        ],
        summary: "The while statement creates a loop that executes a specified statement as long as the test condition evaluates to true.",
        syntax: "while (condition) {\n  statement\n}",
        explanation: "A while loop is best when you don't know exactly how many times the loop should run, but you have a specific condition that must remain true for it to continue.",
        extractions: [
          "Executes statements as long as the specified condition evaluates to true.",
          "Condition test occurs BEFORE the statement in the loop is executed.",
          "If the condition returns false, the loop terminates immediately."
        ],
        codeExample: "let n = 0;\nwhile (n < 3) {\n  n++;\n  console.log(\"Value:\", n);\n}",
        expectedOutput: "Value: 1\nValue: 2\nValue: 3",
        mistakes: [
          "Forgetting to update the condition variable inside the loop, causing an infinite loop."
        ],
        bestPractices: [
          "Always ensure the condition will eventually become false."
        ],
        tip: "A while loop might never execute if the condition is false initially.",
        quiz: {
          question: "What happens if the while condition is false from the start?",
          options: [
            "The loop runs once",
            "The loop never runs",
            "It throws an error",
            "The program crashes"
          ],
          correct: 1,
          explanation: "Since the test happens before execution, the loop body will never execute if the initial condition is false."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/while"
      },
      {
        id: "do-while-statement",
        title: "Do...While Statement",
        estimatedTime: "10 mins",
        difficulty: "Beginner",
        objectives: [
          "Implement loops that must run at least once.",
          "Understand exit-controlled loops."
        ],
        summary: "The do...while statement creates a loop that executes a specified statement until the test condition evaluates to false.",
        syntax: "do {\n  statement\n} while (condition);",
        explanation: "Unlike the while loop, do...while checks the condition AFTER executing the body. This guarantees the code runs at least one time.",
        extractions: [
          "Statement is always executed once BEFORE the condition is checked.",
          "If the condition is true, the statement executes again.",
          "When the condition is false, execution stops and control passes to the next statement."
        ],
        codeExample: "let i = 0;\ndo {\n  i++;\n  console.log(\"Run:\", i);\n} while (i < 0);",
        expectedOutput: "Run: 1",
        mistakes: [
          "Using do...while when the code shouldn't run if the condition is initially false."
        ],
        bestPractices: [
          "Use do...while for scenarios like prompting user input where you need to ask at least once."
        ],
        quiz: {
          question: "How many times is the body of a do...while loop guaranteed to run?",
          options: [
            "Zero times",
            "At least once",
            "Exactly once",
            "Infinitely"
          ],
          correct: 1,
          explanation: "A do...while loop always executes the statement block once before evaluating the condition."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/do...while"
      },
      {
        id: "for-in-statement",
        title: "For...In Statement",
        estimatedTime: "12 mins",
        difficulty: "Intermediate",
        objectives: [
          "Iterate over object properties.",
          "Understand enumerable properties."
        ],
        summary: "The for...in statement iterates a specified variable over all the enumerable properties of an object.",
        syntax: "for (variable in object) {\n  statement\n}",
        explanation: "for...in is designed for objects. It iterates over the keys (property names) of an object, including inherited enumerable properties.",
        extractions: [
          "Iterates over all enumerable properties of an object.",
          "For each distinct property, JavaScript executes the specified statements.",
          "Commonly used to inspect object keys and values."
        ],
        codeExample: "const car = { make: \"Ford\", model: \"Mustang\" };\nfor (const key in car) {\n  console.log(`${key}: ${car[key]}`);\n}",
        expectedOutput: "make: Ford\nmodel: Mustang",
        mistakes: [
          "Using for...in for arrays (it iterates over indices as strings and can pick up unwanted properties)."
        ],
        bestPractices: [
          "Use hasOwnProperty() check inside the loop if you want to skip inherited properties."
        ],
        quiz: {
          question: "What does for...in iterate over when used on an object?",
          options: [
            "The values of the properties",
            "The property names (keys)",
            "The memory addresses",
            "The prototype methods only"
          ],
          correct: 1,
          explanation: "for...in iterates over the enumerable property names (keys) of an object."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...in"
      },
      {
        id: "for-of-statement",
        title: "For...Of Statement",
        estimatedTime: "12 mins",
        difficulty: "Intermediate",
        objectives: [
          "Iterate over iterable data structures like Arrays and Maps.",
          "Differentiate between for...in and for...of."
        ],
        summary: "The for...of statement creates a loop iterating over iterable objects, invoking a custom iteration hook with statements for the value of each distinct property.",
        syntax: "for (variable of iterable) {\n  statement\n}",
        explanation: "for...of is the modern way to iterate over values of an array, string, map, or set. It's more predictable than for...in for collections.",
        extractions: [
          "Iterates over iterable objects (Array, Map, Set, arguments).",
          "Invokes a custom iteration hook with statements for the value of each distinct property.",
          "Difference: for...in iterates over property names, for...of iterates over property values."
        ],
        codeExample: "const arr = [\"a\", \"b\", \"c\"];\nfor (const val of arr) {\n  console.log(\"Value:\", val);\n}",
        expectedOutput: "Value: a\nValue: b\nValue: c",
        mistakes: [
          "Trying to use for...of on a plain object (plain objects are not iterable)."
        ],
        bestPractices: [
          "Prefer for...of over for...in for array iteration."
        ],
        quiz: {
          question: "Which of the following is NOT naturally iterable with for...of?",
          options: [
            "Array",
            "String",
            "Plain Object",
            "Map"
          ],
          correct: 2,
          explanation: "Plain objects are not iterable by default. You must use Object.keys(), Object.values(), or Object.entries() to iterate them with for...of."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...of"
      },
      {
        id: "break-continue-labeled",
        title: "Break, Continue & Labeled",
        estimatedTime: "15 mins",
        difficulty: "Intermediate",
        objectives: [
          "Control loop execution with precision.",
          "Understand how labels work with break and continue."
        ],
        summary: "Use break to exit, continue to skip, and labels to target specific loops in nested structures.",
        syntax: "break;\ncontinue;\nlabel: statement",
        explanation: "These keywords provide granular control. Break stops the loop entirely. Continue skips one turn. Labels allow you to break/continue from an outer loop when inside a nested one.",
        extractions: [
          "break: terminates the innermost enclosing while, do-while, for, or switch statement.",
          "continue: restarts a loop; terminates current iteration and continues with the next.",
          "label: provides a statement with an identifier that lets you refer to it elsewhere.",
          "break/continue with label: terminates or restarts the specific labeled statement."
        ],
        codeExample: "outer: for (let i = 0; i < 2; i++) {\n  for (let j = 0; j < 2; j++) {\n    if (i === 1) break outer;\n    console.log(`i=${i}, j=${j}`);\n  }\n}",
        expectedOutput: "i=0, j=0\ni=0, j=1",
        mistakes: [
          "Overusing labels, which can make code harder to follow ('spaghetti code')."
        ],
        bestPractices: [
          "Use labels sparingly, only when deeply nested loops require explicit control flow."
        ],
        quiz: {
          question: "What does 'break with a label' allow you to do?",
          options: [
            "Break out of all loops in the program",
            "Break out of a specific outer loop from inside a nested loop",
            "Skip to the next label in the code",
            "Restart the labeled loop from the beginning"
          ],
          correct: 1,
          explanation: "Break with a label allows you to terminate a specific outer statement that is identified by that label."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/label"
      }
    ]
  },
  {
    id: 5,
    title: "Functions",
    description: "Master functions, arrow function grammar, lexical scope, closures, and higher-order execution.",
    iconName: "Code",
    topics: [
      {
        id: "closures",
        title: "Closures",
        estimatedTime: "15 mins",
        difficulty: "Advanced",
        objectives: [
          "Define what a closure is and how it captures references.",
          "Utilize closures to create private states or factory functions."
        ],
        summary: "A closure is the combination of a function bundled together (enclosed) with references to its surrounding state (the lexical environment).",
        syntax: "function outer() {\n  const x = 'captured';\n  return () => console.log(x);\n}",
        explanation: "Every time a function is created in JavaScript, a closure is formed. Inner functions always have access to the scope, variables, and parameters of their outer parent functions, even after the parent function has finished executing.",
        codeExample: "function createCounter() {\n  let count = 0; // Private state!\n  return {\n    increment() {\n      count++;\n      return count;\n    },\n    getCount() {\n      return count;\n    }\n  };\n}\n\nconst counter = createCounter();\nconsole.log(counter.increment());\nconsole.log(counter.increment());\nconsole.log(\"Current count:\", counter.getCount());",
        expectedOutput: "1\n2\nCurrent count: 2",
        mistakes: [
          "Thinking closures store copies of variables. They store references to the actual variables, meaning modifying the value affects all functions sharing that scope."
        ],
        bestPractices: [
          "Use closures to build clean data encapsulation, modular handlers, or memoization logic without polluting the global namespace."
        ],
        quiz: {
          question: "Which statement best describes a JavaScript closure?",
          options: [
            "A way to secure standard JSON communication keys",
            "A function that returns a promise immediately",
            "The combination of a function and its lexical environment, allowing access to outer variables",
            "The process of terminating asynchronous server connections automatically"
          ],
          correct: 2,
          explanation: "A closure preserves outer function scope variables, allowing inner functions to access them even after the outer function has completed execution."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Closures"
      }
    ]
  },
  {
    id: 6,
    title: "Arrays",
    description: "Master modern functional array methods like map, filter, and reduce to manipulate data collections smoothly.",
    iconName: "Layers",
    topics: [
      {
        id: "map-filter-reduce",
        title: "Map, Filter, and Reduce",
        estimatedTime: "15 mins",
        difficulty: "Intermediate",
        objectives: [
          "Differentiate when to use map, filter, or reduce.",
          "Chain functional methods together to perform multi-stage data processing."
        ],
        summary: "map returns a new array of mutated items. filter returns a filtered array. reduce collapses an array down to a single accumulated value.",
        syntax: "const doubles = arr.map(x => x * 2);\nconst evens = arr.filter(x => x % 2 === 0);\nconst sum = arr.reduce((acc, curr) => acc + curr, 0);",
        explanation: "These declarative array methods avoid manual variable mutations and standard loop templates. They do not alter the original array (pure functions).",
        codeExample: "const numbers = [1, 2, 3, 4, 5];\n\nconst odds = numbers.filter(n => n % 2 !== 0);\nconst squaredOdds = odds.map(n => n * n);\nconst totalSum = squaredOdds.reduce((acc, curr) => acc + curr, 0);\n\nconsole.log(\"Odds filtered:\", odds);\nconsole.log(\"Odds squared:\", squaredOdds);\nconsole.log(\"Accumulated Sum:\", totalSum);",
        expectedOutput: "Odds filtered: [1, 3, 5]\nOdds squared: [1, 9, 25]\nAccumulated Sum: 35",
        mistakes: [
          "Forgetting to supply a return value inside callback arrow functions containing brackets `{}` (e.g., numbers.map(x => { x * 2 }) returns undefined!).",
          "Forgetting the initial value parameter in reduce when working with arrays of complex objects."
        ],
        bestPractices: [
          "Always specify an initial accumulator value (like 0, [] or {}) as the second argument to reduce for type-safety and predictability."
        ],
        quiz: {
          question: "Which array method returns a brand-new array containing only elements that pass a boolean predicate test?",
          options: [
            "map",
            "filter",
            "reduce",
            "find"
          ],
          correct: 1,
          explanation: "The filter() method creates a shallow copy of a portion of a given array, filtered down to just the elements from the given array that pass the test implemented by the provided function."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map"
      }
    ]
  },
  {
    id: 7,
    title: "Objects",
    description: "Learn how objects hold key-value data, structural destructuring, and ES6 modern object operators.",
    iconName: "Folder",
    topics: [
      {
        id: "destructuring-spread",
        title: "Destructuring & Spread Operator",
        estimatedTime: "12 mins",
        difficulty: "Beginner",
        objectives: [
          "Extract properties from objects and elements from arrays effortlessly.",
          "Use spread (...) to clone or merge object datasets cleanly."
        ],
        summary: "Destructuring binds variables directly to nested attributes. The spread operator (...) unpacks items from iterables and keys from objects.",
        syntax: "const { name, age } = user;\nconst copiedObj = { ...originalObj, newKey: 'val' };",
        explanation: "Destructuring makes object unpacking extremely legible. Spread allows you to quickly clone objects without deep-reference mutation bugs.",
        codeExample: "const profile = { username: \"pawan37\", rank: \"Gold\", score: 450 };\n// Destructure with custom names\nconst { username: userName, rank } = profile;\n\nconst extraStats = { streak: 12, score: 500 };\nconst finalReport = { ...profile, ...extraStats }; // merges keys\n\nconsole.log(\"Extracted userName:\", userName);\nconsole.log(\"Merged finalReport score:\", finalReport.score);",
        expectedOutput: "Extracted userName: pawan37\nMerged finalReport score: 500",
        mistakes: [
          "Thinking that spread operator creates deep copies. Spread only performs a shallow copy of the top-level keys."
        ],
        bestPractices: [
          "Use array destructuring for clean multi-value extraction (like React's useState: const [state, setState] = ...)."
        ],
        quiz: {
          question: "What type of copy does the spread operator (...) perform when duplicating an object?",
          options: [
            "Deep copy (recursively duplicates all nested levels)",
            "Shallow copy (copies top-level references only)",
            "Direct memory swap",
            "Destructive deletion copy"
          ],
          correct: 1,
          explanation: "Spread (...) copies top-level properties. Any nested arrays or objects retain their reference pointers, meaning it is a shallow copy."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment"
      }
    ]
  },
  {
    id: 8,
    title: "DOM Manipulation",
    description: "Connect code to layouts. Learn query selectors, event attachment, and how to change HTML nodes.",
    iconName: "MousePointer",
    topics: [
      {
        id: "selectors-manipulation",
        title: "Query Selectors and DOM Tree",
        estimatedTime: "15 mins",
        difficulty: "Intermediate",
        objectives: [
          "Understand the DOM tree architecture.",
          "Utilize querySelector and querySelectorAll to find tags."
        ],
        summary: "The Document Object Model (DOM) represents HTML as a tree. querySelector returns the first match of a CSS selector. querySelectorAll returns a static NodeList of all matching elements.",
        syntax: "const button = document.querySelector('#submit-btn');\nbutton.textContent = 'Apply Now';",
        explanation: "Modern JavaScript relies heavily on `document.querySelector` over legacy selectors like `getElementById`. Once a node is retrieved, you can alter text, styles, classes, or append child nodes.",
        codeExample: "// Mimicking DOM operations safely\nconst mockDocument = {\n  querySelector(selector) {\n    return {\n      textContent: \"Submit\",\n      classList: {\n        add(name) { console.log(\"Added class:\", name); }\n      }\n    };\n  }\n};\n\nconst btn = mockDocument.querySelector(\"#save-btn\");\nconsole.log(\"Current text:\", btn.textContent);\nbtn.classList.add(\"bg-indigo-600\");",
        expectedOutput: "Current text: Submit\nAdded class: bg-indigo-600",
        mistakes: [
          "Forgetting to include the '.' or '#' prefixes in selectors (e.g. calling querySelector('my-class') instead of querySelector('.my-class')).",
          "Attempting to call array methods directly on a NodeList returned by querySelectorAll in very old browsers (modern environments support forEach on NodeList)."
        ],
        bestPractices: [
          "Cache DOM selections in constants if they need to be accessed multiple times, rather than querying the DOM tree on every click."
        ],
        quiz: {
          question: "Which method is the modern standard for selecting the first matching element using a standard CSS selector?",
          options: [
            "document.getElementByClassName()",
            "document.querySelector()",
            "document.getElementsByTagName()",
            "document.findNode()"
          ],
          correct: 1,
          explanation: "querySelector() is the modern flexible standard for matching elements using any CSS selector shape."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector"
      }
    ]
  },
  {
    id: 9,
    title: "Events",
    description: "Learn keyboard and mouse event dynamics, bubbling vs capturing, and the delegation pattern.",
    iconName: "Tv",
    topics: [
      {
        id: "bubbling-delegation",
        title: "Event Bubbling & Delegation",
        estimatedTime: "15 mins",
        difficulty: "Intermediate",
        objectives: [
          "Explain the difference between event bubbling and capturing.",
          "Utilize Event Delegation to listen on dozens of children using a single parent handler."
        ],
        summary: "Event bubbling propagates an event upwards from child to parents. Event delegation places a single event listener on a parent element to handle events on its descendants.",
        syntax: "parent.addEventListener('click', (e) => {\n  if (e.target.matches('.child')) {\n    console.log('Child clicked');\n  }\n});",
        explanation: "By listening to bubbles at a higher parent node, we avoid adding `addEventListener` to dozens of children. This reduces memory footprint and manages dynamically added elements automatically.",
        codeExample: "// Simulated Event Delegation\nfunction handleClickSim(event) {\n  const target = event.target;\n  if (target.matches(\".delete-btn\")) {\n    console.log(\"Deleted item ID:\", target.dataset.id);\n  } else {\n    console.log(\"Clicked somewhere else on the row\");\n  }\n}\n\nhandleClickSim({ \n  target: { \n    matches(sel) { return sel === \".delete-btn\"; }, \n    dataset: { id: 42 } \n  } \n});",
        expectedOutput: "Deleted item ID: 42",
        mistakes: [
          "Calling e.stopPropagation() too eagerly, which breaks analytic software tracking user clicks on the document body."
        ],
        bestPractices: [
          "Use event delegation on tables, lists, and grids to keep the listener count low and boost browser efficiency."
        ],
        quiz: {
          question: "What is Event Delegation in browser JavaScript?",
          options: [
            "Forwarding events to a server-side WebSocket",
            "Attaching a single event listener to a parent to capture bubbling events from children dynamically",
            "Dividing heavy click computations among web worker threads",
            "The process of stopping browser styling from affecting input fields"
          ],
          correct: 1,
          explanation: "Event Delegation works because of bubbling. We attach one listener on the parent, which catches events occurring on dynamic children."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#event_bubbling"
      }
    ]
  },
  {
    id: 10,
    title: "Asynchronous JavaScript",
    description: "Master Promises, async/await syntax, parallel execution, and fetch API operations.",
    iconName: "TrendingUp",
    topics: [
      {
        id: "promises-async-await",
        title: "Promises & Async/Await",
        estimatedTime: "15 mins",
        difficulty: "Advanced",
        objectives: [
          "Understand the 3 states of a Promise: Pending, Fulfilled, and Rejected.",
          "Write clean asynchronous flow templates using async and await, avoiding callback hell."
        ],
        summary: "A Promise is a proxy for a value not necessarily known when the promise is created. async/await provides a synchronous syntax layer over native promises.",
        syntax: "async function getData() {\n  try {\n    const response = await fetch(url);\n    const data = await response.json();\n    return data;\n  } catch (err) {\n    console.error(err);\n  }\n}",
        explanation: "Promises revolutionized asynchronous programming. `await` blocks execution line-by-line within an `async` function until a promise is settled, making asynchronous code read like standard synchronous instructions.",
        codeExample: "const mockFetchData = () => new Promise((resolve) => {\n  setTimeout(() => resolve({ id: 101, title: \"Master JS\" }), 100);\n});\n\nasync function loadAppStats() {\n  console.log(\"Loading stats...\");\n  const stats = await mockFetchData();\n  console.log(\"Loaded successfully! Book:\", stats.title);\n}\n\nloadAppStats();",
        expectedOutput: "Loading stats...\nLoaded successfully! Book: Master JS",
        mistakes: [
          "Forgetting the await keyword before a Promise-returning function, which assigns a Pending Promise instead of the completed value to the variable.",
          "Forgetting to wrap async/await in a try-catch block, leading to silent unhandled promise rejections."
        ],
        bestPractices: [
          "Use Promise.all() to trigger multiple independent async calls in parallel instead of awaiting them in sequential order."
        ],
        quiz: {
          question: "Which promise state represents that the asynchronous operation completed successfully?",
          options: [
            "Pending",
            "Fulfilled",
            "Rejected",
            "Settled"
          ],
          correct: 1,
          explanation: "A Promise is 'Fulfilled' when the operation completes successfully, resolving the promise to a final value."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise"
      }
    ]
  },
  {
    id: 11,
    title: "Modules",
    description: "Learn ES Modules syntax using import and export statements to construct large clean applications.",
    iconName: "Grid",
    topics: [
      {
        id: "import-export",
        title: "Import & Export Syntax",
        estimatedTime: "10 mins",
        difficulty: "Beginner",
        objectives: [
          "Differentiate between default and named exports.",
          "Identify how ES Modules load asynchronously compared to CommonJS."
        ],
        summary: "ES Modules (ESM) are the official standard. Named exports require explicit names; default exports can be imported under any name.",
        syntax: "// math.js\nexport const add = (a, b) => a + b;\nexport default MathHelper;\n\n// main.js\nimport MathHelper, { add } from './math.js';",
        explanation: "ES Modules promote code reusability. ESM files run in strict mode automatically and allow static tree-shaking (removing unused code at build-time).",
        codeExample: "const mathModule = {\n  add: (a, b) => a + b,\n  subtract: (a, b) => a - b\n};\n\nconst { add, subtract } = mathModule;\nconsole.log(\"Sum:\", add(20, 22));\nconsole.log(\"Sub:\", subtract(100, 50));",
        expectedOutput: "Sum: 42\nSub: 50",
        mistakes: [
          "Mixing up import/export default with standard named curly brackets.",
          "Omitting the '.js' file extension in standard browser/native ESM environments (bundlers usually skip this requirement, but standard specifications mandate it)."
        ],
        bestPractices: [
          "Use named exports for utilities to make refactoring and finding definitions across standard repositories effortless."
        ],
        quiz: {
          question: "How do default exports differ from named exports?",
          options: [
            "Default exports can be imported under any name without curly braces, and there can only be one per file.",
            "Named exports are compiled on the server, whereas default exports run on the client.",
            "Default exports are completely private and cannot be loaded by external files.",
            "Default exports are written in uppercase exclusively."
          ],
          correct: 0,
          explanation: "A default export allows you to import it using any name and without curly braces. There can only be one default export per module."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules"
      }
    ]
  },
  {
    id: 12,
    title: "Error Handling",
    description: "Learn try, catch, finally, and custom throw errors to protect code structures from crashing.",
    iconName: "Shield",
    topics: [
      {
        id: "try-catch",
        title: "Try, Catch, and Finally",
        estimatedTime: "10 mins",
        difficulty: "Beginner",
        objectives: [
          "Intercept operational errors gracefully using try-catch blocks.",
          "Write cleanup steps in the finally block that run regardless of success."
        ],
        summary: "The try-catch-finally statement marks a block of statements to try, and specifies a response should an error be thrown.",
        syntax: "try {\n  riskyOperation();\n} catch (error) {\n  console.error(error.message);\n} finally {\n  cleanup();\n}",
        explanation: "Uncaught exceptions crash JavaScript thread execution. Wrapping hazardous operations (like JSON parsing or fetch calls) prevents app-wide crashes, and the optional `finally` block runs always.",
        codeExample: "function parseData(jsonStr) {\n  try {\n    console.log(\"Attempting parse...\");\n    const data = JSON.parse(jsonStr);\n    console.log(\"Parsed:\", data.name);\n  } catch (err) {\n    console.log(\"Error caught:\", err.name);\n  } finally {\n    console.log(\"Task parsed completely!\");\n  }\n}\n\nparseData(\"{ bad json }\");",
        expectedOutput: "Attempting parse...\nError caught: SyntaxError\nTask parsed completely!",
        mistakes: [
          "Using try-catch around synchronous code thinking it will catch asynchronous errors (e.g. standard try-catch around a setTimeout won't catch errors inside the callback unless async/await is correctly formatted)."
        ],
        bestPractices: [
          "Always log or report errors in the catch block rather than keeping the block empty (swallowing exceptions)."
        ],
        quiz: {
          question: "When is the 'finally' block executed in a try-catch-finally structure?",
          options: [
            "Only when an error occurs during execution",
            "Only when the try block completes successfully with no errors",
            "Always, regardless of whether an error was thrown or caught",
            "Never, unless explicitly triggered by an external return call"
          ],
          correct: 2,
          explanation: "The finally block is guaranteed to execute after the try and catch blocks finish, regardless of the success or error status."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/try...catch"
      }
    ]
  },
  {
    id: 13,
    title: "Modern JavaScript (ES6+)",
    description: "Master modern ECMAScript features including template literals, destructuring, spread, and array operators.",
    iconName: "Cpu",
    topics: [
      {
        id: "template-literals",
        title: "Template Literals & Modern Syntax",
        estimatedTime: "10 mins",
        difficulty: "Beginner",
        objectives: [
          "Write dynamic multi-line strings without concatenation.",
          "Utilize string interpolation with dollar brackets."
        ],
        summary: "Template literals are string literals allowing embedded expressions. They are enclosed by backticks (`) instead of double or single quotes.",
        syntax: "const greeting = `Hello ${user}, current time is ${new Date()}`;",
        explanation: "Template literals introduced multi-line capabilities, expression interpolation, and tagged templates, turning manual string building into elegant templates.",
        codeExample: "const role = \"Engineer\";\nconst company = \"Google\";\nconst text = `Congratulations!\nAs a Senior ${role} at ${company},\nyour starting date is next Monday.`;\nconsole.log(text);",
        expectedOutput: "Congratulations!\nAs a Senior Engineer at Google,\nyour starting date is next Monday.",
        mistakes: [
          "Confusing backticks (`) with standard single quotes (') or double quotes (\"). Only backticks support template variables."
        ],
        bestPractices: [
          "Use template literals to construct clean HTML templates directly inside your component or client-side layout."
        ],
        quiz: {
          question: "What character is used to enclose a JavaScript template literal string?",
          options: [
            "Single quote (')",
            "Double quote (\")",
            "Backtick (`)",
            "Forward slash (/)"
          ],
          correct: 2,
          explanation: "Template literals must be enclosed by backticks (`) to enable expression evaluation and multi-line formatting."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals"
      }
    ]
  },
  {
    id: 14,
    title: "Object-Oriented JavaScript",
    description: "Learn ES6 classes, syntax structures, constructors, inheritance, and clean OOP practices.",
    iconName: "GitMerge",
    topics: [
      {
        id: "classes-inheritance",
        title: "Classes & Inheritance",
        estimatedTime: "15 mins",
        difficulty: "Intermediate",
        objectives: [
          "Construct classes with fields, methods, and constructors.",
          "Apply inheritance via the 'extends' keyword and call parent code via 'super()'."
        ],
        summary: "ES6 Classes provide a clear syntactic sugar over prototype-based OOP. Inheritance enables children classes to reuse and customize parent fields and methods.",
        syntax: "class Admin extends User {\n  constructor(name) {\n    super(name);\n    this.role = 'Admin';\n  }\n}",
        explanation: "Classes group similar data variables and functions together under one clear blueprint. The constructor is called on instantiation, and subclasses invoke super() to bootstrap their parents.",
        codeExample: "class Student {\n  constructor(name, xp) {\n    this.name = name;\n    this.xp = xp;\n  }\n  greet() {\n    return `I am ${this.name} with ${this.xp} XP!`;\n  }\n}\n\nclass TopStudent extends Student {\n  greet() {\n    return `${super.greet()} I am a leaderboard winner!`;\n  }\n}\n\nconst pawan = new TopStudent(\"Pawan\", 820);\nconsole.log(pawan.greet());",
        expectedOutput: "I am Pawan with 820 XP! I am a leaderboard winner!",
        mistakes: [
          "Attempting to reference 'this' in a subclass constructor before calling super(), which triggers a ReferenceError."
        ],
        bestPractices: [
          "Use classes for structured state components, network clients, or utility containers where encapsulation is requested."
        ],
        quiz: {
          question: "Which keyword is used inside a child class constructor to call and trigger the constructor of its parent class?",
          options: [
            "parent()",
            "this()",
            "super()",
            "constructor()"
          ],
          correct: 2,
          explanation: "In a derived class, super() must be called in the constructor before referencing 'this' or exiting, to run the parent's logic."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes"
      }
    ]
  },
  {
    id: 15,
    title: "Advanced JavaScript",
    description: "Unravel advanced execution mechanics: Hoisting, callstack, event loop, memory management, and prototype chains.",
    iconName: "Activity",
    topics: [
      {
        id: "hoisting-context",
        title: "Hoisting & Execution Context",
        estimatedTime: "15 mins",
        difficulty: "Advanced",
        objectives: [
          "Describe how JavaScript compiles variables and functions into memory scope.",
          "Identify how let/const differ from var regarding temporal dead zone hoisting."
        ],
        summary: "Hoisting is the engine's behavior of moving variable and function declarations to the top of their containing scope before code execution.",
        syntax: "console.log(x); // undefined (var hoisted)\nvar x = 5;",
        explanation: "When JS code runs, the compiler runs a first scan to register declarations in memory (Creation Phase), and then executes line-by-line (Execution Phase). Function declarations are fully hoisted; var is hoisted as undefined; let/const are registered but inaccessible.",
        codeExample: "console.log(\"Hoist function:\", greetUser());\n\nfunction greetUser() {\n  return \"Hi from the hoisted function!\";\n}\n\ntry {\n  console.log(notDeclaredYet);\n  let notDeclaredYet = \"test\";\n} catch (err) {\n  console.log(\"Let hoist failure:\", err.message);\n}",
        expectedOutput: "Hoist function: Hi from the hoisted function!\nLet hoist failure: Cannot access 'notDeclaredYet' before initialization",
        mistakes: [
          "Confusing hoisting of function declarations (fully hoisted) with function expressions (not hoisted because they are treated as variables)."
        ],
        bestPractices: [
          "Always declare variables at the top of their blocks and write code top-down to bypass hoisting surprises completely."
        ],
        quiz: {
          question: "What is the Temporal Dead Zone (TDZ) in JavaScript?",
          options: [
            "The period where variables are garbage collected",
            "The state between entering scope and variable declaration, where let/const throw ReferenceError on access",
            "The time a browser tab stays inactive before freezing",
            "The interval when an asynchronous callback waits in the Call Queue"
          ],
          correct: 1,
          explanation: "The Temporal Dead Zone covers let/const variable registration until the actual line of declaration is evaluated. Accessing them here throws an initialization error."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Glossary/Hoisting"
      }
    ]
  }
];

export const nodeModules: Module[] = [
  {
    id: 101,
    title: "Node.js Core & Runtime Fundamentals",
    description: "Master Node's architecture: the Google V8 engine, the libuv thread pool, asynchronous single-threaded Event Loop, global processes, and low-level File System API.",
    iconName: "Cpu",
    topics: [
      {
        id: "v8-libuv-event-loop",
        title: "V8 Engine, Libuv, and Event Loop",
        estimatedTime: "15 mins",
        difficulty: "Advanced",
        objectives: [
          "Explain how Node.js achieves non-blocking asynchronous I/O with a single main thread.",
          "Identify the roles of the V8 JavaScript engine and the libuv C++ library.",
          "Describe the key phases of the Event Loop (timers, pending, poll, check, close)."
        ],
        summary: "Node.js is a runtime that wraps Google's V8 engine and the libuv library to execute JavaScript server-side, using an event-driven, non-blocking I/O model.",
        syntax: "// Visualizing Event Loop microtask queue priority\nprocess.nextTick(() => console.log('nextTick runs first!'));\nPromise.resolve().then(() => console.log('Promise resolved!'));",
        explanation: "While JavaScript is single-threaded, Node.js offloads heavy system operations (like networking, file manipulation, cryptography) to libuv, a C++ library that manages a system-level thread pool (default 4 threads). The Event Loop acts as a coordinator, picking up completed async tasks and placing their callbacks in the execution stack when the main thread is idle.",
        codeExample: "console.log('1. Start program');\n\nsetTimeout(() => {\n  console.log('4. Timer callback (MacroTask)');\n}, 0);\n\nPromise.resolve().then(() => {\n  console.log('3. Promise callback (MicroTask)');\n});\n\nprocess.nextTick(() => {\n  console.log('2. NextTick callback (Immediate MicroTask)');\n});\n\nconsole.log('5. End program');",
        expectedOutput: "1. Start program\n5. End program\n2. NextTick callback (Immediate MicroTask)\n3. Promise callback (MicroTask)\n4. Timer callback (MacroTask)",
        mistakes: [
          "Assuming Node.js executes all Javascript code multithreaded (only standard asynchronous I/O and worker threads run concurrently).",
          "Writing blocking synchronous loops in the main thread, which completely starves the Event Loop."
        ],
        bestPractices: [
          "Avoid using sync methods like fs.readFileSync() inside production request handlers.",
          "Understand that process.nextTick() executes immediately after the current operation, before promises and timers."
        ],
        quiz: {
          question: "Which component of Node.js is responsible for handling the system-level thread pool, file system, and event loop orchestration?",
          options: [
            "The Chrome V8 Engine",
            "The libuv C++ library",
            "The npm package registry",
            "The Express routing framework"
          ],
          correct: 1,
          explanation: "libuv is the multi-platform support library written in C++ that provides asynchronous I/O support, the thread pool, and the entire Event Loop mechanism in Node.js."
        },
        mdnLink: "https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/"
      }
    ]
  },
  {
    id: 102,
    title: "Streams, Buffers & Events",
    description: "Manipulate raw binary data efficiently. Learn Buffers, Readable/Writable streams, memory management, backpressure control, and the core EventEmitter class.",
    iconName: "Terminal",
    topics: [
      {
        id: "buffers-and-binary",
        title: "Working with Buffers and Binary Data",
        estimatedTime: "12 mins",
        difficulty: "Intermediate",
        objectives: [
          "Understand how Node.js represents raw memory outside the V8 heap using Buffers.",
          "Convert between binary data, hexadecimals, and typical string encodings.",
          "Allocate safe vs unsafe raw buffer segments."
        ],
        summary: "A Buffer is a fixed-size chunk of raw memory allocated outside V8's heap, specifically designed to handle streams of binary data directly.",
        syntax: "// Create a buffer from an existing string\nconst buf = Buffer.from('Hello', 'utf-8');\nconsole.log(buf.toString('hex')); // 48656c6c6f",
        explanation: "Before ES6 TypedArrays, Node.js introduced the Buffer class to read and write raw binary byte-streams. Since JavaScript strings are immutable and encoded as UTF-16, converting them to disk-friendly binary requires temporary Buffers to represent the exact bytes transferred over network sockets or file streams.",
        codeExample: "// Allocate a clean memory segment of 10 bytes\nconst cleanBuf = Buffer.alloc(10);\ncleanBuf.write(\"NodeJS\", 0, \"utf-8\");\nconsole.log(\"Raw Buffer:\", cleanBuf);\nconsole.log(\"Readable String:\", cleanBuf.toString(\"utf-8\"));\nconsole.log(\"Byte Length:\", cleanBuf.length);",
        expectedOutput: "Raw Buffer: <Buffer 4e 6f 64 65 4a 53 00 00 00 00>\nReadable String: NodeJS\nByte Length: 10",
        mistakes: [
          "Using Buffer.allocUnsafe() without filling or cleaning it, which can accidentally expose sensitive system memory remnants to users.",
          "Forgetting that Buffer lengths are measured in raw bytes, not character lengths."
        ],
        bestPractices: [
          "Always use Buffer.alloc() for safe, zero-filled buffers, unless ultra-high performance demands allocUnsafe.",
          "Specify explicit encodings (e.g. 'utf-8') when converting buffers to strings to prevent decoding issues."
        ],
        quiz: {
          question: "Why should a developer prefer Buffer.alloc() over Buffer.allocUnsafe() in most standard scenarios?",
          options: [
            "Buffer.allocUnsafe() is slower due to V8 compiler limitations",
            "Buffer.alloc() initializes the buffer with zero-filled bytes, preventing security issues with stale data",
            "Buffer.alloc() can grow dynamically in size during runtime",
            "Buffer.allocUnsafe() does not support utf-8 standard string encoding"
          ],
          correct: 1,
          explanation: "Buffer.allocUnsafe() is faster because it bypasses clearing the memory. However, it leaves old system memory in the buffer, which can lead to data leaks if not overwritten immediately."
        },
        mdnLink: "https://nodejs.org/api/buffer.html"
      }
    ]
  },
  {
    id: 103,
    title: "HTTP & Express.js Server Development",
    description: "Architect standard back-end servers. Build routing networks, create and chain robust custom middlewares, decode payloads, and manage standard REST endpoints.",
    iconName: "Globe",
    topics: [
      {
        id: "express-architecture",
        title: "Express.js Architecture & Routing",
        estimatedTime: "15 mins",
        difficulty: "Intermediate",
        objectives: [
          "Understand the core Request-Response pipeline in Express.js.",
          "Configure modular sub-routers using express.Router.",
          "Parse URL queries, path params, and JSON payloads properly."
        ],
        summary: "Express is a minimal, flexible Node.js web application framework that provides a robust set of features for web and mobile applications.",
        syntax: "const express = require('express');\nconst app = express();\napp.use(express.json()); // JSON parser",
        explanation: "Express.js operates fundamentally as a pipeline of handler functions. When an HTTP request arrives, Express routes it sequentially through active middlewares and routes. Each middleware can inspect, modify, or terminate the connection by sending a response, or pass control along using the callback next().",
        codeExample: "const mockRequest = { method: 'GET', url: '/user/42' };\nconsole.log(\"Express route matched:\", mockRequest.url);\n\nconst paramId = mockRequest.url.split('/').pop();\nconsole.log(`Parsed path parameter ':id' ->`, paramId);",
        expectedOutput: "Express route matched: /user/42\nParsed path parameter ':id' -> 42",
        mistakes: [
          "Forgetting to call next() inside custom middlewares, which causes requests to hang indefinitely.",
          "Failing to call express.json() middleware, leading to req.body returning undefined."
        ],
        bestPractices: [
          "Always handle async router exceptions using try-catch blocks or Express v5 automatic promise forwarding.",
          "Use express.Router() to split different resources (e.g. users, products, auth) into standalone files."
        ],
        quiz: {
          question: "What is the primary role of the 'next' callback parameter inside Express.js middleware functions?",
          options: [
            "To send the final JSON payload back to the client interface",
            "To bypass standard routing rules and redirect to a specific URL",
            "To yield control and trigger the next sequential middleware or route handler in the execution chain",
            "To terminate the current process thread immediately"
          ],
          correct: 2,
          explanation: "Calling next() tells Express to move to the next middleware or route handler in the queue. If omitted, the request remains suspended."
        },
        mdnLink: "https://expressjs.com/"
      }
    ]
  },
  {
    id: 104,
    title: "Security & Authentication",
    description: "Secure node applications from malicious exploits. Implement secure JWT sessions, CORS restriction rules, Helmet headers, rate-limiting, and escape query parameters.",
    iconName: "Database",
    topics: [
      {
        id: "jwt-cookie-auth",
        title: "JWT and Cookie Authentication",
        estimatedTime: "15 mins",
        difficulty: "Advanced",
        objectives: [
          "Differentiate between cookie-session state and JSON Web Tokens (JWT).",
          "Sign, verify, and parse JWT keys securely with expiration intervals.",
          "Configure HttpOnly, Secure, and SameSite cookie headers to prevent XSS/CSRF."
        ],
        summary: "JSON Web Tokens (JWT) are a compact, URL-safe means of representing claims to be transferred between two parties, used heavily for stateless API authentication.",
        syntax: "// Simple signing syntax\n// jwt.sign({ userId: 123 }, secretKey, { expiresIn: '1h' });",
        explanation: "Authentication validates candidate logins and grants credentialed access. In stateless token auth, the server returns a signed JWT containing token claims (such as userID). Subsequent requests supply this token. For security, storing JWTs in cookies configured with 'HttpOnly' (inaccessible via JavaScript) protects them from Cross-Site Scripting (XSS).",
        codeExample: "// Simulating signing and verification of a token payload\nconst payload = { userId: 42, role: \"admin\" };\nconst mockSign = (p) => btoa(JSON.stringify(p)) + \".MOCK_SIGNATURE\";\n\nconst token = mockSign(payload);\nconsole.log(\"Generated JWT Token:\", token);\n\nconst mockVerify = (t) => {\n  const parts = t.split(\".\");\n  return JSON.parse(atob(parts[0]));\n};\n\nconsole.log(\"Verified Decoded Claims:\", mockVerify(token));",
        expectedOutput: "Generated JWT Token: eyidXNlcklkIjo0Miwicm9sZSI6ImFkbWluIn0=.MOCK_SIGNATURE\nVerified Decoded Claims: { userId: 42, role: 'admin' }",
        mistakes: [
          "Storing sensitive user passwords or server API keys directly inside JWT payloads (they are encoded, NOT encrypted, so anyone can decode them).",
          "Using insecure public client-side storage like localStorage for sensitive tokens, making them vulnerable to rogue scripts."
        ],
        bestPractices: [
          "Use short expiration times for access tokens, combined with secure database-backed refresh tokens.",
          "Always set the HttpOnly, Secure, and SameSite=Strict cookie properties when sending tokens."
        ],
        quiz: {
          question: "Which cookie attribute is critical to protect session tokens from malicious scripts and Cross-Site Scripting (XSS) attacks?",
          options: [
            "SameSite=Lax",
            "Secure",
            "HttpOnly",
            "Max-Age"
          ],
          correct: 2,
          explanation: "The HttpOnly flag ensures that the cookie cannot be accessed via document.cookie by client-side JavaScript, fully protecting it from standard XSS credential theft."
        },
        mdnLink: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Cookies"
      }
    ]
  },
  {
    id: 105,
    title: "Advanced Scaling & Performance Testing",
    description: "Scale servers to handle heavy loads. Utilize the Cluster module, offload heavy CPU cycles to Worker Threads, profile memory leaks, and write Jest API suites.",
    iconName: "Cloud",
    topics: [
      {
        id: "cluster-workers",
        title: "Cluster Module & Multithreading",
        estimatedTime: "15 mins",
        difficulty: "Advanced",
        objectives: [
          "Leverage multicore systems by spawning concurrent child processes using the Cluster module.",
          "Isolate CPU-intensive tasks using Worker Threads.",
          "Understand the architectural difference between process-level clustering and thread-level workers."
        ],
        summary: "The Cluster module runs multiple instances of a Node.js server sharing a port, while Worker Threads execute parallel CPU-bound tasks inside the same process.",
        syntax: "const cluster = require('cluster');\n// Spawning a worker thread\n// const { Worker } = require('worker_threads');",
        explanation: "By default, Node.js runs on a single thread. To utilize a 16-core CPU fully, developers use process clustering to fork multiple independent processes that share port 3000, orchestrated by a master manager using a round-robin load balancer. For isolated heavy algorithms (like video rendering or password hashing), Worker Threads are used because they share the same memory space, bypassing process communication overhead.",
        codeExample: "const cpuCount = 2; // Simulating cluster check\nconsole.log(`Detected CPU cores: ${cpuCount}`);\n\nfor (let i = 0; i < cpuCount; i++) {\n  console.log(`Forking worker process [PID: ${Math.floor(1000 + Math.random() * 9000)}]...`);\n}\nconsole.log(\"Cluster successfully initialized on port 3000!\");",
        expectedOutput: "Detected CPU cores: 2\nForking worker process [PID: 4721]...\nForking worker process [PID: 9104]...\nCluster successfully initialized on port 3000!",
        mistakes: [
          "Conflating clustering (runs multiple servers) with workers (runs sub-tasks), leading to poor scalability design.",
          "Spinning up hundreds of Worker Threads concurrently (which creates immense thread context-switching overhead; thread pools must be sized carefully to match hardware core count)."
        ],
        bestPractices: [
          "Size your cluster workers to match the exact number of physical/logical CPU cores.",
          "Use Worker Threads for heavy computational math, but use asynchronous non-blocking callbacks for network-heavy work."
        ],
        quiz: {
          question: "When should a developer prefer Worker Threads over process-level Clustering?",
          options: [
            "When serving standard REST APIs to double database connections",
            "When executing intense CPU-bound calculation tasks that require sharing data memory directly",
            "To deploy the server across different physical server machines",
            "When managing standard Static File serving paths"
          ],
          correct: 1,
          explanation: "Worker Threads execute parallel CPU-heavy workloads in the same process memory space, allowing fast data communication without the expense of separate process boundaries."
        },
        mdnLink: "https://nodejs.org/api/worker_threads.html"
      }
    ]
  }
];

