const { SlashCommandBuilder } = require('discord.js');
const { success, error } = require('../../utils/responseBuilder');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('math')
    .setDescription('Evaluate a math expression')
    .addStringOption(option => 
      option.setName('expression')
        .setDescription('The math expression to evaluate')
        .setRequired(true)),
    
  async execute(interaction) {
    const expression = interaction.options.getString('expression');
    
    // Check if expression is empty
    if (!expression.trim()) {
      return interaction.reply({ 
        embeds: [error('Empty Expression', 'Please provide a math expression to evaluate.')],
        ephemeral: true
      });
    }
    
    try {
      // Evaluate the expression safely
      const result = evaluateMathExpression(expression);
      
      await interaction.reply({ 
        embeds: [
          success(
            '🧮 Math Result',
            `Expression: \`${expression}\`\nResult: \`${result}\``
          )
        ]
      });
    } catch (err) {
      await interaction.reply({ 
        embeds: [error('Invalid Expression', `Could not evaluate the expression: ${err.message}`)],
        ephemeral: true
      });
    }
  }
};

// Safe math expression evaluator
function evaluateMathExpression(expression) {
  // Remove any characters that aren't numbers, operators, or common math symbols
  const sanitizedExpression = expression.replace(/[^\d+\-*/().^%e\s]/gi, '');
  
  // Check for potential code injection
  if (sanitizedExpression !== expression.replace(/\s/g, '').replace(/[a-zA-Z]/g, '')) {
    throw new Error('Expression contains invalid characters');
  }
  
  // Define allowed operations
  const mathFunctions = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '/': (a, b) => {
      if (b === 0) throw new Error('Division by zero');
      return a / b;
    },
    '^': (a, b) => Math.pow(a, b),
    '%': (a, b) => {
      if (b === 0) throw new Error('Modulo by zero');
      return a % b;
    }
  };
  
  // Tokenize the expression
  const tokens = tokenize(sanitizedExpression);
  
  // Parse and evaluate the expression
  return evaluateTokens(tokens, mathFunctions);
}

// Simple tokenizer for math expressions
function tokenize(expression) {
  const tokens = [];
  let i = 0;
  
  while (i < expression.length) {
    const char = expression[i];
    
    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }
    
    // Numbers
    if (/\d/.test(char)) {
      let num = '';
      while (i < expression.length && (/\d/.test(expression[i]) || expression[i] === '.')) {
        num += expression[i++];
      }
      tokens.push({ type: 'number', value: parseFloat(num) });
      continue;
    }
    
    // Operators
    if (/[+\-*/^%]/.test(char)) {
      tokens.push({ type: 'operator', value: char });
      i++;
      continue;
    }
    
    // Parentheses
    if (char === '(' || char === ')') {
      tokens.push({ type: 'paren', value: char });
      i++;
      continue;
    }
    
    // Unknown character
    throw new Error(`Unexpected character: ${char}`);
  }
  
  return tokens;
}

// Simple parser/evaluator for math expressions
function evaluateTokens(tokens, mathFunctions) {
  // Handle parentheses by recursion
  const parseParentheses = () => {
    if (tokens.length === 0) {
      throw new Error('Unexpected end of expression');
    }
    
    if (tokens[0].type === 'paren' && tokens[0].value === '(') {
      tokens.shift(); // Remove opening paren
      const result = parseExpression();
      
      if (tokens.length === 0 || tokens[0].type !== 'paren' || tokens[0].value !== ')') {
        throw new Error('Missing closing parenthesis');
      }
      
      tokens.shift(); // Remove closing paren
      return result;
    } else if (tokens[0].type === 'number') {
      return tokens.shift().value;
    } else {
      throw new Error('Unexpected token');
    }
  };
  
  // Parse multiplication and division
  const parseTerm = () => {
    let left = parseParentheses();
    
    while (tokens.length > 0 && tokens[0].type === 'operator' && (tokens[0].value === '*' || tokens[0].value === '/' || tokens[0].value === '%')) {
      const op = tokens.shift().value;
      const right = parseParentheses();
      left = mathFunctions[op](left, right);
    }
    
    return left;
  };
  
  // Parse addition and subtraction
  const parseExpression = () => {
    let left = parseTerm();
    
    while (tokens.length > 0 && tokens[0].type === 'operator' && (tokens[0].value === '+' || tokens[0].value === '-')) {
      const op = tokens.shift().value;
      const right = parseTerm();
      left = mathFunctions[op](left, right);
    }
    
    return left;
  };
  
  return parseExpression();
}
