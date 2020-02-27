// =============================================================================
// Boost.js | Expression Parsing
// Based on http://jsep.from.so
// (c) Mathigon
// =============================================================================


import {Obj} from '@mathigon/core';


// -----------------------------------------------------------------------------
// Interfaces

enum NODE_TYPE {
  Array,
  BinaryOp,
  Call,
  Conditional,
  Identifier,
  Literal,
  Member,
  UnaryOp,
}

interface ArrayNode {
  type: NODE_TYPE.Array;
  elements: AnyNode[];
}

interface BinaryNode {
  type: NODE_TYPE.BinaryOp;
  operator: string;
  left: AnyNode;
  right: AnyNode;
}

interface CallNode {
  type: NODE_TYPE.Call;
  callee: AnyNode;
  args: AnyNode[];
}

interface ConditionalNode {
  type: NODE_TYPE.Conditional;
  test: AnyNode;
  consequent: AnyNode;
  alternate: AnyNode;
}

interface IdentifierNode {
  type: NODE_TYPE.Identifier;
  name: string;
}

interface LiteralNode {
  type: NODE_TYPE.Literal;
  value: any;
}

interface MemberNode {
  type: NODE_TYPE.Member;
  object: AnyNode,
  computed: boolean,
  property: AnyNode
}

interface UnaryNode {
  type: NODE_TYPE.UnaryOp;
  operator: string;
  argument: any;
}

type AnyNode = ArrayNode|BinaryNode|CallNode|ConditionalNode|IdentifierNode
               |LiteralNode|MemberNode|UnaryNode;


// -----------------------------------------------------------------------------
// Constants

const BINARY_OPS: Obj<(a: any, b: any) => any> = {
  '===': (a: any, b: any) => a === b,
  '!==': (a: any, b: any) => a !== b,
  '||': (a: any, b: any) => a || b,
  '&&': (a: any, b: any) => a && b,
  '==': (a: any, b: any) => a == b, // jshint ignore:line
  '!=': (a: any, b: any) => a != b, // jshint ignore:line
  '<=': (a: any, b: any) => a <= b,
  '>=': (a: any, b: any) => a >= b,
  '**': (a: any, b: any) => a ** b,
  '<': (a: any, b: any) => a < b,
  '>': (a: any, b: any) => a > b,
  '+': (a: any, b: any) => a + b,
  '-': (a: any, b: any) => a - b,
  '*': (a: any, b: any) => a * b,
  '/': (a: any, b: any) => a / b,
  '%': (a: any, b: any) => a % b
};

const UNARY_OPS: Obj<(a: any) => any> = {
  '-': (a: any) => -a,
  '+': (a: any) => +a,
  '!': (a: any) => !a
};

// Binary operations with their precedence
const BINARY_PRECEDENCE: Obj<number> = {
  '||': 1, '&&': 2,
  '==': 3, '!=': 3, '===': 3, '!==': 3,
  '<': 4, '>': 4, '<=': 4, '>=': 4,
  '+': 5, '-': 5,
  '*': 6, '/': 6, '%': 6,
  '**': 7  // TODO Exponentiation should be right-to-left.
};

const LITERALS: Obj<any> = {
  'true': true,
  'false': false,
  'undefined': undefined
};

const SPACE = /\s/;
const DIGIT = /[0-9]/;
const IDENTIFIER_START = /[a-zA-Z$_]/;  // Variables cannot start with a number.
const IDENTIFIER_PART = /[a-zA-Z0-9$_]/;


// -----------------------------------------------------------------------------
// Expression Parser

export function parseSyntaxTree(expr: string) {
  const length = expr.length;
  let index = 0;  // Current cursor position

  function throwError(message: string): never {
    throw new Error(`${message} at character ${index} of "${expr}"`);
  }

  function gobbleSpaces() {
    while (SPACE.test(expr[index])) index += 1;
  }

  // Gobble a simple numeric literals (e.g. `12`, `3.4`, `.5`).
  function gobbleNumericLiteral(): LiteralNode {
    let number = '';

    while (DIGIT.test(expr[index])) number += expr[index++];
    if (expr[index] === '.') {
      number += expr[index++];
      while (DIGIT.test(expr[index])) number += expr[index++];
    }

    const char = expr[index];
    if (char && IDENTIFIER_START.test(char)) {
      const name = number + expr[index];
      throwError(`Variable names cannot start with a number (${name})`);
    } else if (char === '.') {
      throwError('Unexpected period');
    }

    return {type: NODE_TYPE.Literal, value: parseFloat(number)};
  }

  // Gobble a string literal, staring with single or double quotes.
  function gobbleStringLiteral(): LiteralNode {
    const quote = expr[index];
    index += 1;

    let closed = false;
    let string = '';

    while (index < length) {
      let char = expr[index++];
      if (char === quote) {
        closed = true;
        break;
      }
      string += char;
    }

    if (!closed) throwError(`Unclosed quote after "${string}"`);
    return {type: NODE_TYPE.Literal, value: string};
  }

  // Gobbles identifiers and literals (e.g. `foo`, `_value`, `$x1`, `true`).
  function gobbleIdentifier(): LiteralNode|IdentifierNode {
    let name = expr[index];
    if (!IDENTIFIER_START.test(expr[index])) throwError('Unexpected ' + name);
    index += 1;

    while (index < length) {
      if (IDENTIFIER_PART.test(expr[index])) {
        name += expr[index++];
      } else {
        break;
      }
    }

    if (name in LITERALS) {
      return {type: NODE_TYPE.Literal, value: LITERALS[name]};
    } else {
      return {type: NODE_TYPE.Identifier, name};
    }
  }

  // Gobbles a list of arguments within a function call or array literal. It
  // assumes that the opening character has already been gobbled (e.g.
  // `foo(bar, baz)`, `my_func()`, or `[bar, baz]`).
  function gobbleArguments(termination: ')'|']'): AnyNode[] {
    const args: AnyNode[] = [];
    let closed = false;
    let lastArg: AnyNode|undefined = undefined;

    while (index < length) {
      if (expr[index] === termination) {
        if (lastArg) args.push(lastArg);
        closed = true;
        index += 1;
        break;
      } else if (expr[index] === ',') {
        args.push(lastArg || {type: NODE_TYPE.Literal, value: undefined});
        index += 1;
      } else {
        lastArg = gobbleExpression();
      }
    }

    if (!closed) throwError('Expected ' + termination);
    return args;
  }

  // Parse a non-literal variable name. It name may include properties (`foo`,
  // `bar.baz`, `foo['bar'].baz`) or function calls (`Math.acos(obj.angle)`).
  function gobbleVariable(): AnyNode {
    let node: AnyNode;

    if (expr[index] === '(') {
      index += 1;
      node = gobbleExpression()!;
      gobbleSpaces();
      if (expr[index] === ')') {
        index += 1;
        return node;
      } else {
        throwError('Unclosed (');
      }
    } else {
      node = gobbleIdentifier();
    }

    gobbleSpaces();

    while ('.[('.includes(expr[index])) {
      if (expr[index] === '.') {
        // Object property accessors.
        index++;
        gobbleSpaces();
        node = {
          type: NODE_TYPE.Member,
          object: node!,
          computed: false,
          property: gobbleIdentifier()
        };
      } else if (expr[index] === '[') {
        // Array index accessors.
        index++;
        node = {
          type: NODE_TYPE.Member,
          object: node!,
          computed: true,
          property: gobbleExpression()!
        };
        gobbleSpaces();
        if (expr[index] !== ']') throwError('Unclosed [');
        index++;
      } else if (expr[index] === '(') {
        // A function call is being made; gobble all the arguments
        index++;
        node = {
          type: NODE_TYPE.Call,
          args: gobbleArguments(')'),
          callee: node
        };
      }
      gobbleSpaces();
    }

    return node;
  }

  // Search for the operation portion of the string (e.g. `+`, `===`)
  function gobbleBinaryOp(): string|undefined {
    gobbleSpaces();
    for (const length of [3, 2, 1]) {  // Different possible operator lengths
      const substr = expr.substr(index, length);
      if (substr in BINARY_OPS) {
        index += length;
        return substr;
      }
    }
  }

  // Parse an individual part of a binary expression (e.g. `foo.bar(baz)`, `1`,
  // `"abc"` or `(a % 2)` because it is in parenthesis).
  // TODO Support expressions like `[a, b][c]` or `([a, b])[c]`.
  function gobbleToken(): AnyNode|UnaryNode {
    gobbleSpaces();
    let operator = expr[index];

    if (DIGIT.test(operator) || operator === '.') {
      return gobbleNumericLiteral();
    } else if (operator === '\'' || operator === '"') {
      // Single or double quotes
      return gobbleStringLiteral();
    } else if (operator === '[') {
      index += 1;
      return {type: NODE_TYPE.Array, elements: gobbleArguments(']')};
    } else if (operator in UNARY_OPS) {
      index += 1;
      return {type: NODE_TYPE.UnaryOp, operator, argument: gobbleToken()};
    } else if (IDENTIFIER_START.test(operator) || operator === '(') {
      // `foo`, `bar.baz`
      return gobbleVariable();
    }

    throwError('Expression parsing error');
  }

  // Parse individual expressions (e.g. `1`, `1+2`, `a+(b*2)-Math.sqrt(2)`)
  function gobbleBinaryExpression(): AnyNode {
    let left = gobbleToken();

    let biop = gobbleBinaryOp();
    if (!biop) return left;

    let right = gobbleToken();
    if (!right) throwError('Expected expression after ' + biop);

    // If there are multiple binary operators, we have to stack them in the
    // correct order using recursive descent.

    let node: AnyNode;
    let stack = [left, biop, right];

    while ((biop = gobbleBinaryOp())) {
      let prec = BINARY_PRECEDENCE[biop];
      let cur_biop = biop;

      while (stack.length > 2 && prec <=
             BINARY_PRECEDENCE[stack[stack.length - 2] as string]) {
        right = stack.pop() as AnyNode;
        biop = stack.pop() as string;
        left = stack.pop() as AnyNode;
        node = {type: NODE_TYPE.BinaryOp, operator: biop, left, right};
        stack.push(node);
      }

      node = gobbleToken();
      if (!node) throwError('Expected expression after ' + cur_biop);
      stack.push(cur_biop, node);
    }

    let i = stack.length - 1;
    node = stack[i] as AnyNode;
    while (i > 1) {
      node = {
        type: NODE_TYPE.BinaryOp, operator: stack[i - 1] as string,
        left: stack[i - 2] as AnyNode, right: node
      };
      i -= 2;
    }

    return node;
  }

  // Parse ternary expressions (e.g. `a ? b : c`).
  function gobbleExpression(): AnyNode|undefined {
    const test = gobbleBinaryExpression();
    gobbleSpaces();

    if (test && expr[index] === '?') {
      // Ternary expression: test ? consequent : alternate
      index += 1;
      const consequent = gobbleExpression();
      if (!consequent) throwError('Expected expression');
      gobbleSpaces();
      if (expr[index] === ':') {
        index++;
        let alternate = gobbleExpression();
        if (!alternate) throwError('Expected expression');
        return {type: NODE_TYPE.Conditional, test, consequent, alternate};
      } else {
        throwError('Expected :');
      }
    } else {
      return test;
    }
  }

  const node = gobbleExpression();
  if (index < expr.length) throwError(`Unexpected "${expr[index]}"`);
  return node;
}


// -----------------------------------------------------------------------------
// Evaluations

function evaluate(node: AnyNode, context: any): any {
  switch (node.type) {

    case NODE_TYPE.Array:
      return node.elements.map((n) => evaluate(n, context));

    case NODE_TYPE.BinaryOp:
      return BINARY_OPS[node.operator](evaluate(node.left, context),
          evaluate(node.right, context));

    case NODE_TYPE.Call:
      // Note: we evaluate arguments even if fn is undefined.
      const fn = evaluate(node.callee, context);
      const args = node.args.map((n) => evaluate(n, context));
      return (typeof fn === 'function') ? fn(...args) : undefined;

    case NODE_TYPE.Conditional:
      // Note: we evaluate all possible options of the unary operator.
      const consequent = evaluate(node.consequent, context);
      const alternate = evaluate(node.alternate, context);
      return evaluate(node.test, context) ? consequent : alternate;

    case NODE_TYPE.Identifier:
      return context[node.name];

    case NODE_TYPE.Literal:
      return node.value;

    case NODE_TYPE.Member:
      const object = evaluate(node.object, context);
      const property = node.computed ? evaluate(node.property, context) :
                       (node.property as IdentifierNode).name;
      return object ? object[property] : undefined;

    case NODE_TYPE.UnaryOp:
      return UNARY_OPS[node.operator](evaluate(node.argument, context));

    default:
      return undefined;
  }
}

/**
 * Compiles a JS expression into a function that can be evaluated with context.
 */
export function compile<T = any>(expr: string) {
  const node = parseSyntaxTree(expr);
  if (!node) return (context: any = {}) => undefined;
  return (context: any = {}): T|undefined => evaluate(node, context);
}


// -----------------------------------------------------------------------------
// Template Strings

const TEMPLATE = /\${([^}]+)}/g;

/**
 * Converts an expression string into an executable JS function. It will replace
 * all `${x}` type expressions and evaluate them based on a context.
 */
export function compileString(expr: string): (vars: any) => string {
  expr = expr.replace(/×/g, '*');

  // This array contains the alternating static and variable parts of the expr.
  // For example, the input expression `Here ${is} some ${text}` would give
  // parts = ['Here ', 'is', ' some ', 'text', ''].
  const parts = expr.split(TEMPLATE);
  const fns = parts.map((p, i) => (i % 2) ? compile(p) : undefined);

  return (context: any) => {
    return parts.map((p, i) => (i % 2) ? (fns[i]!(context) || '') : p).join('');
  };
}
